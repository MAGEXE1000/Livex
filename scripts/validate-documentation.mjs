import fs from 'fs';
import path from 'path';

const workspaceRoot = process.cwd();
const docsDir = path.join(workspaceRoot, 'docs');
const knowledgeDir = path.join(workspaceRoot, 'knowledge');
const sessionLogsDir = path.join(workspaceRoot, 'session_logs');

const issues = [];
const allDocs = []; // Array of absolute paths to all md files
const docLinkTargets = new Set(); // Set of absolute paths of md files that are linked to

function logIssue(level, document, line, problem, correction) {
  issues.push({ level, document, line, problem, correction });
}

// Recursively find all markdown files in a directory
function getMdFilesRecursive(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'archive') {
        results = results.concat(getMdFilesRecursive(filePath));
      }
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

// Normalize and verify if a path exists, registering it if it's another markdown file
function verifyPathExists(filePath, docFile, lineNum) {
  let normalizedPath = filePath.replace(/\\/g, '/');

  // Handle absolute file:/// links
  if (normalizedPath.startsWith('file:///')) {
    const studioIdx = normalizedPath.indexOf('/Studio/');
    if (studioIdx !== -1) {
      normalizedPath = normalizedPath.substring(studioIdx + 8); // strip up to '/Studio/'
    } else {
      normalizedPath = normalizedPath.replace('file:///', '');
      if (normalizedPath.match(/^[a-zA-Z]:/)) {
        normalizedPath = path.normalize(normalizedPath);
      }
    }
  }

  // Strip anchor references (e.g. #L10-L20)
  const cleanUrl = normalizedPath.split('#')[0];

  // Resolve to absolute path on disk
  let absolutePath;
  if (path.isAbsolute(cleanUrl)) {
    absolutePath = cleanUrl;
  } else if (fs.existsSync(path.resolve(workspaceRoot, cleanUrl))) {
    absolutePath = path.resolve(workspaceRoot, cleanUrl);
  } else if (cleanUrl.startsWith('/')) {
    absolutePath = path.resolve(workspaceRoot, cleanUrl.substring(1));
  } else {
    absolutePath = path.resolve(workspaceRoot, path.dirname(docFile), cleanUrl);
  }

  if (!fs.existsSync(absolutePath)) {
    // If the exact relative path doesn't exist, try searching for the basename in packages/ and apps/
    const baseName = path.basename(cleanUrl);
    let resolvedFallback = null;
    if (baseName.endsWith('.tsx') || baseName.endsWith('.ts') || baseName.endsWith('.js') || baseName.endsWith('.json') || baseName.endsWith('.css') || baseName.endsWith('.html') || baseName.endsWith('.md')) {
      const findCandidate = (dir) => {
        if (!fs.existsSync(dir)) return null;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'build') {
            const found = findCandidate(path.join(dir, entry.name));
            if (found) return found;
          } else if (entry.isFile() && entry.name === baseName) {
            return path.join(dir, entry.name);
          }
        }
        return null;
      };
      resolvedFallback = findCandidate(path.join(workspaceRoot, 'packages')) || findCandidate(path.join(workspaceRoot, 'apps'));
    }

    if (resolvedFallback) {
      if (resolvedFallback.endsWith('.md')) {
        docLinkTargets.add(path.normalize(resolvedFallback).toLowerCase());
      }
    } else {
      logIssue(
        'ERROR',
        docFile,
        lineNum,
        `Referenced path does not exist: "${filePath}" (resolved to: "${absolutePath}")`,
        `Verify the file or directory exists in the repository, or update the reference.`
      );
    }
  } else {
    // If it's a valid local markdown document, register it as linked
    if (absolutePath.endsWith('.md')) {
      docLinkTargets.add(path.normalize(absolutePath).toLowerCase());
    }
  }
}

function validateFile(absoluteFilePath) {
  const relativeDocPath = path.relative(workspaceRoot, absoluteFilePath);
  const content = fs.readFileSync(absoluteFilePath, 'utf8');
  const lines = content.split('\n');

  const headers = new Set();
  let currentHeader = null;
  let hasContentUnderHeader = false;
  let inSourceBlock = false;
  let inCodeBlock = false;
  let hasH1 = false;
  let hasSourceBlock = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      return;
    }

    // Check for H1 header
    if (trimmed.startsWith('# ')) {
      hasH1 = true;
    }

    // Detect Source: blocks
    if (trimmed.startsWith('Source:')) {
      inSourceBlock = true;
      hasSourceBlock = true;
      return;
    }

    // Process source files in Source block
    if (inSourceBlock) {
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('---')) {
        inSourceBlock = false;
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        let pathRef = trimmed.substring(2).trim();
        const firstBacktick = pathRef.indexOf('`');
        const secondBacktick = pathRef.indexOf('`', firstBacktick + 1);
        if (firstBacktick !== -1 && secondBacktick !== -1) {
          pathRef = pathRef.substring(firstBacktick + 1, secondBacktick).trim();
        } else {
          pathRef = pathRef.replace(/`/g, '').trim();
        }
        // Skip markdown links already validated by link matching
        if (!pathRef.startsWith('[')) {
          verifyPathExists(pathRef, relativeDocPath, lineNum);
        }
      }
    }

    // Detect Headers
    if (trimmed.startsWith('#')) {
      // Check if previous header was empty
      if (currentHeader && !hasContentUnderHeader) {
        logIssue(
          'WARNING',
          relativeDocPath,
          currentHeader.line,
          `Section "${currentHeader.title}" has no content.`,
          `Add content to this section or remove the header.`
        );
      }

      const match = trimmed.match(/^(#+)\s+(.+)$/);
      if (match) {
        const title = match[2].trim();
        if (headers.has(title)) {
          logIssue(
            'WARNING',
            relativeDocPath,
            lineNum,
            `Duplicate section header: "${title}"`,
            `Rename the section header to ensure unique navigation targets.`
          );
        }
        headers.add(title);
        currentHeader = { title, line: lineNum };
        hasContentUnderHeader = false;
      }
      return;
    }

    // If we have non-empty text, the current header has content
    if (trimmed !== '' && !trimmed.startsWith('Source:')) {
      hasContentUnderHeader = true;
    }

    // Detect placeholders
    const placeholders = [
      { pattern: /\btodo\b/i, name: 'TODO' },
      { pattern: /\btbd\b/i, name: 'TBD' },
      { pattern: /\bcoming soon\b/i, name: 'Coming Soon' },
      { pattern: /\bcoming_soon\b/i, name: 'Coming Soon' },
      { pattern: /\bplaceholder\b/i, name: 'Placeholder example' },
    ];

    placeholders.forEach((p) => {
      // Allow the documentation_validation document itself to list the strings for explanation
      if (
        relativeDocPath.endsWith('documentation_validation.md') ||
        relativeDocPath.endsWith('report_templates.md')
      ) {
        return;
      }
      if (p.pattern.test(line)) {
        logIssue(
          'WARNING',
          relativeDocPath,
          lineNum,
          `Found placeholder pattern "${p.name}" in text: "${trimmed}"`,
          `Replace the placeholder with actual repository specifications.`
        );
      }
    });

    // Detect Markdown Links [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const label = linkMatch[1];
      const url = linkMatch[2].trim();

      // Skip external, mailto, anchor or dummy urls
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('#') ||
        url === 'url' ||
        url === 'path'
      ) {
        continue;
      }

      verifyPathExists(url, relativeDocPath, lineNum);
    }
  });

  // Check last header
  if (currentHeader && !hasContentUnderHeader) {
    logIssue(
      'WARNING',
      relativeDocPath,
      currentHeader.line,
      `Section "${currentHeader.title}" has no content.`,
      `Add content to this section or remove the header.`
    );
  }

  // Validate missing required elements
  if (!hasH1) {
    logIssue(
      'WARNING',
      relativeDocPath,
      1,
      `Missing H1 Title header`,
      `Every active document should start with a "# title" header.`
    );
  }

  if (!hasSourceBlock && relativeDocPath.startsWith('docs/')) {
    logIssue(
      'WARNING',
      relativeDocPath,
      lines.length,
      `Missing Source reference block`,
      `Every reference document should end with a trailing "Source:" list pointing to its source files.`
    );
  }
}

console.log('--- Starting Documentation Validation ---');

// 1. Collect all documents recursively from docs, knowledge, and session_logs directories
const mdFiles = [
  ...getMdFilesRecursive(docsDir),
  ...getMdFilesRecursive(knowledgeDir),
  ...getMdFilesRecursive(sessionLogsDir),
];

mdFiles.forEach((file) => {
  allDocs.push(path.normalize(file));
});

// 2. Validate content and extract links
allDocs.forEach((file) => {
  validateFile(file);
});

// 3. Detect and report orphan files
const ignoredOrphans = new Set([
  path.normalize(path.join(docsDir, 'engineering_guide.md')).toLowerCase(),
  path.normalize(path.join(docsDir, 'architecture/internal-index.md')).toLowerCase(),
]);

allDocs.forEach((file) => {
  const normalizedFile = file.toLowerCase();
  if (ignoredOrphans.has(normalizedFile)) return;
  if (!docLinkTargets.has(normalizedFile)) {
    const relativePath = path.relative(workspaceRoot, file);
    logIssue(
      'WARNING',
      relativePath,
      1,
      `Orphan document: No other documents link to this file.`,
      `Add a markdown link pointing to this file from another active guide (e.g. engineering_guide.md).`
    );
  }
});

console.log(`Scanned ${allDocs.length} documentation files.\n`);

const errors = issues.filter((i) => i.level === 'ERROR');
const warnings = issues.filter((i) => i.level === 'WARNING');

if (issues.length === 0) {
  console.log(
    '✓ Validation passed! All file references exist and no placeholders or orphans were found.'
  );
  process.exit(0);
}

console.log(
  `Found ${issues.length} issues (${errors.length} errors, ${warnings.length} warnings):\n`
);

issues.forEach((i) => {
  console.log(`[${i.level}] File: ${i.document} (Line ${i.line})`);
  console.log(`      Problem: ${i.problem}`);
  console.log(`      Fix:     ${i.correction}\n`);
});

if (errors.length > 0) {
  console.log('Validation failed due to file reference errors.');
  process.exit(1);
} else {
  console.log('Validation passed with warnings.');
  process.exit(0);
}
