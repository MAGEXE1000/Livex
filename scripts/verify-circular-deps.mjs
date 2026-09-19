#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING REPOSITORY-WIDE CIRCULAR DEPENDENCY DETECTOR ===');

const aliasMap = {
  '@workspace/livex-core': path.join(rootDir, 'packages/livex-core/src/index.ts'),
  '@workspace/ui-shared': path.join(rootDir, 'packages/ui-shared/src/index.ts'),
  '@workspace/ui-web': path.join(rootDir, 'packages/ui-web/src/index.ts'),
  '@workspace/ui-android': path.join(rootDir, 'packages/ui-android/src/index.ts'),
  '@/': path.join(rootDir, 'packages/ui-shared/src/'),
};

function walkDir(dir, filter, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        file !== 'node_modules' &&
        file !== 'dist' &&
        file !== '.git' &&
        file !== 'build' &&
        file !== 'tmp'
      ) {
        walkDir(fullPath, filter, callback);
      }
    } else if (filter(fullPath)) {
      callback(fullPath);
    }
  }
}

const sourceFiles = [];
walkDir(
  path.join(rootDir, 'packages'),
  (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts'),
  (f) => sourceFiles.push(f)
);
walkDir(
  path.join(rootDir, 'apps'),
  (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts'),
  (f) => sourceFiles.push(f)
);

function resolveImport(importPath, containingFile) {
  let resolved = null;

  if (importPath.startsWith('.')) {
    resolved = path.resolve(path.dirname(containingFile), importPath);
  } else if (importPath.startsWith('@workspace/')) {
    const pkgMatch = importPath.match(/^(@workspace\/[^/]+)(?:\/(.*))?$/);
    if (pkgMatch) {
      const pkgName = pkgMatch[1];
      const subPath = pkgMatch[2];
      if (aliasMap[pkgName]) {
        if (!subPath) {
          resolved = aliasMap[pkgName];
        } else {
          const pkgDir = path.dirname(aliasMap[pkgName]);
          resolved = path.resolve(pkgDir, subPath);
        }
      }
    }
  } else if (importPath.startsWith('@/')) {
    resolved = path.join(aliasMap['@/'], importPath.slice(2));
  }

  if (!resolved) return null;

  if (resolved.endsWith('.js')) {
    resolved = resolved.slice(0, -3);
  } else if (resolved.endsWith('.jsx')) {
    resolved = resolved.slice(0, -4);
  }

  const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    const candidate = resolved + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

const graph = new Map();

sourceFiles.forEach((file) => {
  const code = fs.readFileSync(file, 'utf-8');
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const deps = new Set();

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause && node.importClause.isTypeOnly) return;
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolveImport(node.moduleSpecifier.text, file);
        if (target && target !== file) deps.add(target);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) return;
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolveImport(node.moduleSpecifier.text, file);
        if (target && target !== file) deps.add(target);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  graph.set(file, Array.from(deps));
});

let index = 0;
const indices = new Map();
const lowlink = new Map();
const onStack = new Map();
const stack = [];
const sccs = [];

function strongConnect(node) {
  indices.set(node, index);
  lowlink.set(node, index);
  index++;
  stack.push(node);
  onStack.set(node, true);

  const neighbors = graph.get(node) || [];
  for (const w of neighbors) {
    if (!indices.has(w)) {
      strongConnect(w);
      lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(w)));
    } else if (onStack.get(w)) {
      lowlink.set(node, Math.min(lowlink.get(node), indices.get(w)));
    }
  }

  if (lowlink.get(node) === indices.get(node)) {
    const scc = [];
    let w;
    do {
      w = stack.pop();
      onStack.set(w, false);
      scc.push(w);
    } while (w !== node);

    if (scc.length > 1) {
      sccs.push(scc);
    }
  }
}

sourceFiles.forEach((file) => {
  if (!indices.has(file)) {
    strongConnect(file);
  }
});

console.log(`Scanned ${sourceFiles.length} source files for circular dependencies.`);

if (sccs.length > 0) {
  console.error(`❌ CIRCULAR DEPENDENCY CHECK FAILED WITH ${sccs.length} CYCLE(S).`);
  sccs.forEach((scc, i) => {
    console.error(`\nCycle Group #${i + 1}:`);
    scc.forEach((p) => console.error(`   -> ${path.relative(rootDir, p)}`));
  });
  process.exit(1);
} else {
  console.log('✓ NO CIRCULAR DEPENDENCIES DETECTED.\n=== CIRCULAR DEPENDENCY CHECK PASSED CLEANLY ===\n');
  process.exit(0);
}
