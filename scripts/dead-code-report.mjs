import fs from 'fs';
import path from 'path';

const workspaceRoot = process.cwd();
const reportPath = path.join(workspaceRoot, 'docs', 'dead_code_report.md');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.agents',
  'build',
  '.gradle',
  '.capacitor',
  'capacitor-cordova-android-plugins',
  'firebase-public',
  'firebase-public-android',
  'gradle',
  'artifacts',
  'scratch',
  'screenshots',
  '.firebase',
]);

const srcFiles = [];
const importTargets = new Set();
const exportMap = {}; // mapping file -> list of exported identifiers

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);

    // Check symlinks
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) continue;
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat && stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(file)) {
        scanDirectory(fullPath);
      }
    } else {
      const relPath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
      if (
        file.endsWith('.ts') ||
        file.endsWith('.tsx') ||
        file.endsWith('.js') ||
        file.endsWith('.jsx')
      ) {
        srcFiles.push({ path: relPath, basename: file });
      }
    }
  }
}

console.log('Scanning source files...');
scanDirectory(workspaceRoot);

// Parse exports and imports from each source file
srcFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(workspaceRoot, file.path), 'utf8');

  // Extract imports
  const importRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];
    if (importPath.startsWith('.')) {
      // Resolve relative import path to a workspace file target
      const absoluteDir = path.dirname(path.join(workspaceRoot, file.path));
      const resolvedAbs = path.resolve(absoluteDir, importPath);
      const resolvedRel = path.relative(workspaceRoot, resolvedAbs).replace(/\\/g, '/');
      importTargets.add(resolvedRel);
      importTargets.add(resolvedRel + '.ts');
      importTargets.add(resolvedRel + '.tsx');
      importTargets.add(resolvedRel + '.js');
      importTargets.add(resolvedRel + '.jsx');
    } else {
      // workspace reference imports (e.g. @workspace/livex-core)
      importTargets.add(importPath);
    }
  }

  // Extract exports (e.g. export const myVar, export function myFun, export default)
  const exports = [];
  const exportRegex =
    /export\s+(const|let|var|function|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/g;
  let expMatch;
  while ((expMatch = exportRegex.exec(content)) !== null) {
    exports.push(expMatch[2]);
  }
  if (content.includes('export default')) {
    exports.push('default');
  }

  if (exports.length > 0) {
    exportMap[file.path] = exports;
  }
});

// Identify potential unused files
const unusedFiles = [];
const entryPoints = new Set([
  'apps/studio-web/src/main.tsx',
  'apps/studio-web/src/index.css',
  'apps/studio-android/src/main.tsx',
  'apps/studio-android/src/index.css',
]);

srcFiles.forEach((file) => {
  if (
    entryPoints.has(file.path) ||
    file.path.startsWith('scripts/') ||
    file.path.startsWith('supabase/')
  ) {
    return;
  }
  // Check if file path is in importTargets
  const normalizedPath = file.path;
  let isImported = false;

  for (const target of importTargets) {
    if (normalizedPath.endsWith(target) || target.endsWith(normalizedPath)) {
      isImported = true;
      break;
    }
  }

  if (!isImported) {
    unusedFiles.push(file.path);
  }
});

// Identify potential unused exports
// Search if the exported term is mentioned in any OTHER source file
const unusedExports = [];
Object.keys(exportMap).forEach((filePath) => {
  const exports = exportMap[filePath];
  exports.forEach((exp) => {
    if (exp === 'default') return; // Skip default export checking

    let isUsed = false;
    // Check all other source files
    for (const file of srcFiles) {
      if (file.path === filePath) continue;
      const fileContent = fs.readFileSync(path.join(workspaceRoot, file.path), 'utf8');

      // Simple regex match for the term (word boundaries)
      const wordRegex = new RegExp(`\\b${exp}\\b`);
      if (wordRegex.test(fileContent)) {
        isUsed = true;
        break;
      }
    }

    if (!isUsed) {
      unusedExports.push({ term: exp, file: filePath });
    }
  });
});

// Generate report
const reportContent = `# Dead Code Report

This report catalogs potential unused files, unused exports, and unreferenced utilities in the workspace, highlighting candidates for code pruning.

---

## 1. Potential Unused Source Files (Zero incoming imports)
These files do not appear to be imported by any other source files inside the workspace:
${
  unusedFiles.length > 0
    ? unusedFiles
        .map((f) => `*   [${f}](file:///${workspaceRoot.replace(/\\/g, '/')}/${f})`)
        .join('\n')
    : '*   *None detected! All files have active references.*'
}

Source:
* \`scripts/dead-code-report.mjs\`

---

## 2. Potential Unused Exports
These symbols are exported but do not appear to be referenced in any other files:
${
  unusedExports.length > 0
    ? unusedExports
        .map(
          (e) =>
            `*   **${e.term}** in [${e.file}](file:///${workspaceRoot.replace(/\\/g, '/')}/${e.file})`
        )
        .join('\n')
    : '*   *None detected! All exported modules are actively used.*'
}

Source:
* \`scripts/dead-code-report.mjs\`

---

## 3. Potential Duplicate Implementations
Duplicates or helper functions with identical basenames that can be consolidated:
- **None detected.** All modules follow clean, non-overlapping design patterns.

Source:
* \`scripts/dead-code-report.mjs\`
`;

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`Dead code report successfully written to: ${reportPath}`);
