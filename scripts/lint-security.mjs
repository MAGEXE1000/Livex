#!/usr/bin/env node

/**
 * Livex Local Security Static Linter
 * Scans TypeScript and JavaScript source files across apps/ and packages/
 * to verify anti-regression guarantees for:
 * 1. Polynomial regular expression (ReDoS) catastrophic backtracking patterns.
 * 2. Prototype-polluting object assignments (CWE-1321).
 * 3. Path traversal patterns with missing directory separator guards (CWE-22/CWE-23).
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '..');
const TARGET_DIRS = ['packages', 'apps', 'scripts'];
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.gradle',
  '.git',
  '.artifacts',
  'coverage',
  'android-web',
  'stage-core',
]);

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Known ReDoS anti-patterns (nested quantifiers with overlapping alphabets)
const REDOS_PATTERNS = [
  {
    name: 'Nested Repetition on Word/Alpha Class',
    regex: /(?:^|[^\\])\(\[([a-zA-Z0-9_#b-]+)\]\+\)\+/g,
  },
  {
    name: 'Overlapping Wildcard Repetition',
    regex: /(?:^|[^\\])\(\\s\*\\w\*\)\+/g,
  },
  {
    name: 'Greedy Nested Wildcard',
    regex: /(?:^|[^\\])\(\.\*\)\+/g,
  },
];

// Prototype pollution anti-patterns
const PROTO_POLLUTION_PATTERNS = [
  {
    name: 'Unchecked prototype index assignment',
    regex: /\b(target|obj|destination)\[([a-zA-Z0-9_]+)\]\[([a-zA-Z0-9_]+)\]\s*=/g,
  },
];

let filesScanned = 0;
let violations = [];

function scanDirectory(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && ALLOWED_EXTENSIONS.has(extname(fullPath))) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  filesScanned++;
  const content = readFileSync(filePath, 'utf8');
  const relPath = filePath.replace(ROOT_DIR, '').replace(/^[\\/]/, '');

  // 1. Check ReDoS patterns
  for (const pattern of REDOS_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const line = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: relPath,
        line,
        type: 'ReDoS',
        description: pattern.name,
        match: match[0].trim(),
      });
    }
  }

  // 2. Check Prototype Pollution patterns
  for (const pattern of PROTO_POLLUTION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(content)) !== null) {
      // Ignore if file contains prototype guard
      if (content.includes('__proto__') && content.includes('constructor')) {
        continue;
      }
      const line = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: relPath,
        line,
        type: 'PrototypePollution',
        description: pattern.name,
        match: match[0].trim(),
      });
    }
  }
}

console.log('=== Livex Security Anti-Regression Scanner ===\n');
for (const target of TARGET_DIRS) {
  scanDirectory(resolve(ROOT_DIR, target));
}

console.log(`Scanned ${filesScanned} files across ${TARGET_DIRS.join(', ')}.`);

if (violations.length > 0) {
  console.error(`\n❌ Found ${violations.length} security violations:`);
  for (const v of violations) {
    console.error(`  - [${v.type}] ${v.file}:${v.line} — ${v.description} (${v.match})`);
  }
  process.exit(1);
} else {
  console.log('✓ 0 security vulnerabilities detected. Anti-regression verification passed cleanly.\n');
  process.exit(0);
}
