import { execSync } from 'node:child_process';

const REPO_SLUG = 'MAGEXE1000/Livex';

export async function checkGitTag(version, options = {}) {
  const execFn = options.execFn || execSync;
  const fetchFn = options.fetchFn || globalThis.fetch;
  const targetTag = `v${version}`;

  try {
    const output = execFn(`git tag -l ${targetTag}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (output && output.trim() === targetTag) {
      const commit = execFn(`git rev-parse ${targetTag}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      return {
        name: 'Git Tag',
        pass: true,
        details: `Tag ${targetTag} points to commit ${commit.substring(0, 8)}`,
      };
    }
  } catch (_) {}

  // Check remote tag via git ls-remote if local tag is missing
  try {
    const lsRemote = execFn(`git ls-remote origin refs/tags/${targetTag}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (lsRemote && lsRemote.includes(targetTag)) {
      return {
        name: 'Git Tag',
        pass: true,
        details: `Tag ${targetTag} verified on remote origin`,
      };
    }
  } catch (_) {}

  // Check GitHub Release API tag existence
  try {
    const res = await fetchFn(`https://api.github.com/repos/${REPO_SLUG}/releases/tags/${targetTag}`, {
      headers: { 'User-Agent': 'ReleaseDoctor/1.0', Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      return {
        name: 'Git Tag',
        pass: true,
        details: `Tag ${targetTag} verified via GitHub Release API`,
      };
    }
  } catch (_) {}

  return {
    name: 'Git Tag',
    pass: false,
    rootCause: `Git tag '${targetTag}' not found locally or on origin repository.`,
    suggestedFix: `Create and push tag '${targetTag}' during application release publication stage.`,
    priority: 'MEDIUM',
    expectedResolution: `Git tag '${targetTag}' exists on origin repository.`,
  };
}
