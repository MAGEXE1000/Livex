import { execSync } from 'node:child_process';
import { fetchFirebaseReleaseMetadata } from '../release/firebase.mjs';

const REPO_SLUG = 'MAGEXE1000/Livex';

export async function generateReleaseTimeline(options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  const execFn = options.execFn || execSync;

  console.log('====================================================================');
  console.log('                   HISTORICAL RELEASE TIMELINE                      ');
  console.log('====================================================================\n');

  let releases = [];
  try {
    const rawJson = execFn(`gh release list --repo ${REPO_SLUG} --limit 10 --json tagName,name,publishedAt,targetCommitish`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    if (rawJson) {
      releases = JSON.parse(rawJson);
    }
  } catch (_) {
    try {
      const apiRes = await fetchFn(`https://api.github.com/repos/${REPO_SLUG}/releases?per_page=10`, {
        headers: { 'User-Agent': 'ReleaseTimeline/1.0', Accept: 'application/vnd.github.v3+json' },
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        releases = json.map((r) => ({
          tagName: r.tag_name,
          name: r.name,
          publishedAt: r.published_at,
          targetCommitish: r.target_commitish || 'main',
        }));
      }
    } catch (_) {}
  }

  const fbMeta = await fetchFirebaseReleaseMetadata({ fetchFn });

  if (releases.length === 0) {
    console.log('No published GitHub releases found or unable to fetch history.');
    return [];
  }

  console.log('+---------+--------------------+---------------+--------------------+------------+------------+');
  console.log('| Version | Date (UTC)         | GitHub Tag    | Target Commit      | Firebase   | OTA Status |');
  console.log('+---------+--------------------+---------------+--------------------+------------+------------+');

  for (const r of releases) {
    const ver = r.name || r.tagName.replace(/^v/, '');
    const dateStr = r.publishedAt ? new Date(r.publishedAt).toISOString().substring(0, 10) : 'N/A';
    const tag = r.tagName;
    const commit = (r.targetCommitish || 'main').substring(0, 8);
    const isFbMatch = fbMeta.ok && fbMeta.version === ver ? 'MATCHED' : 'HISTORICAL';
    const otaStatus = 'ACTIVE';

    console.log(`| ${ver.padEnd(7)} | ${dateStr.padEnd(18)} | ${tag.padEnd(13)} | ${commit.padEnd(18)} | ${isFbMatch.padEnd(10)} | ${otaStatus.padEnd(10)} |`);
  }
  console.log('+---------+--------------------+---------------+--------------------+------------+------------+\n');

  return releases;
}
