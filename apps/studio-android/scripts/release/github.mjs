import { execFileSync } from 'node:child_process';

const REPO_SLUG = 'MAGEXE1000/Livex';
const [OWNER, REPO] = REPO_SLUG.split('/');

export async function fetchGitHubReleaseInfo(tag, options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  const execFn = options.execFn || execFileSync;
  const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const isLatestQuery = tag === 'latest' || tag === 'latest-release';
  const targetTag = isLatestQuery ? 'latest' : (tag.startsWith('v') ? tag : `v${tag}`);

  const excludeTag = options.excludeTag ? (options.excludeTag.startsWith('v') ? options.excludeTag : `v${options.excludeTag}`) : null;

  let releaseData = null;
  let releaseExists = false;
  let provider = 'None';

  // 1. Primary: GitHub REST API
  try {
    const headers = {
      'User-Agent': 'ReleaseValidator/1.0',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) headers.Authorization = `token ${token}`;

    if (isLatestQuery && excludeTag) {
      const endpoint = `https://api.github.com/repos/${REPO_SLUG}/releases?per_page=10`;
      const apiRes = await fetchFn(endpoint, { headers });
      if (apiRes.ok) {
        const releasesList = await apiRes.json();
        const validRel = Array.isArray(releasesList) ? releasesList.find((r) => !r.draft && r.tag_name !== excludeTag) : null;
        if (validRel) {
          releaseData = {
            tagName: validRel.tag_name,
            name: validRel.name,
            isDraft: validRel.draft || false,
            isPrerelease: validRel.prerelease || false,
            publishedAt: validRel.published_at,
            assets: Array.isArray(validRel.assets)
              ? validRel.assets.map((a) => ({
                  name: a.name,
                  url: a.browser_download_url,
                  size: a.size,
                  contentType: a.content_type,
                }))
              : [],
          };
          releaseExists = !releaseData.isDraft;
          provider = 'REST API (List)';
          return { exists: releaseExists, tag: releaseData.tagName, data: releaseData, provider };
        }
      }
    } else {
      const endpoint = isLatestQuery
        ? `https://api.github.com/repos/${REPO_SLUG}/releases/latest`
        : `https://api.github.com/repos/${REPO_SLUG}/releases/tags/${targetTag}`;

      const apiRes = await fetchFn(endpoint, { headers });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (!excludeTag || json.tag_name !== excludeTag) {
          releaseData = {
            tagName: json.tag_name,
            name: json.name,
            isDraft: json.draft || false,
            isPrerelease: json.prerelease || false,
            publishedAt: json.published_at,
            assets: Array.isArray(json.assets)
              ? json.assets.map((a) => ({
                  name: a.name,
                  url: a.browser_download_url,
                  size: a.size,
                  contentType: a.content_type,
                }))
              : [],
          };
          releaseExists = !releaseData.isDraft;
          provider = 'REST API';
          return { exists: releaseExists, tag: releaseData.tagName, data: releaseData, provider };
        }
      }
    }
  } catch (_) {}

  // 2. Secondary: GitHub GraphQL API
  if (!releaseExists && token) {
    try {
      const graphqlQuery = {
        query: `
          query ($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              releases(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
                nodes {
                  tagName
                  name
                  isDraft
                  isPrerelease
                  publishedAt
                  releaseAssets(first: 20) {
                    nodes {
                      name
                      downloadUrl
                      size
                      contentType
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { owner: OWNER, repo: REPO },
      };

      const gqlRes = await fetchFn('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': 'ReleaseValidator/1.0',
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (gqlRes.ok) {
        const gqlJson = await gqlRes.json();
        const repoData = gqlJson.data?.repository;
        const nodes = repoData?.releases?.nodes || (repoData?.release ? [repoData.release] : []);
        const release = isLatestQuery
          ? nodes.find((n) => !n.isDraft && (!excludeTag || n.tagName !== excludeTag))
          : nodes.find((n) => (n.tagName === targetTag || (!targetTag.startsWith('v') && n.tagName === `v${targetTag}`)) && (!excludeTag || n.tagName !== excludeTag));

        if (release) {
          releaseData = {
            tagName: release.tagName,
            name: release.name,
            isDraft: release.isDraft,
            isPrerelease: release.isPrerelease,
            publishedAt: release.publishedAt,
            assets: release.releaseAssets?.nodes?.map((a) => ({
              name: a.name,
              url: a.downloadUrl,
              size: a.size,
              contentType: a.contentType,
            })) || [],
          };
          releaseExists = !releaseData.isDraft;
          provider = 'GraphQL';
          return { exists: releaseExists, tag: releaseData.tagName, data: releaseData, provider };
        }
      }
    } catch (_) {}
  }

  // 3. Fallback: GitHub CLI (Last Resort Only)
  if (!releaseExists) {
    try {
      let targetCliTag = targetTag;
      if (isLatestQuery && excludeTag) {
        const listRaw = execFn('gh', ['release', 'list', '--repo', REPO_SLUG, '--limit', '10', '--json', 'tagName,isDraft'], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        if (listRaw) {
          const listParsed = JSON.parse(listRaw);
          const validCliRel = Array.isArray(listParsed) ? listParsed.find((r) => !r.isDraft && r.tagName !== excludeTag) : null;
          if (validCliRel) {
            targetCliTag = validCliRel.tagName;
          }
        }
      }

      let cmdArgs;
      if (isLatestQuery && !excludeTag) {
        cmdArgs = ['release', 'view', '--repo', REPO_SLUG, '--json', 'tagName,name,assets,isDraft,isPrerelease'];
      } else {
        cmdArgs = ['release', 'view', targetCliTag, '--repo', REPO_SLUG, '--json', 'tagName,name,assets,isDraft,isPrerelease'];
      }

      let rawJson;
      try {
        rawJson = execFn('gh', cmdArgs, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch (_) {}
      if (!rawJson) {
        try {
          rawJson = execFn(`gh ${cmdArgs.join(' ')}`);
        } catch (_) {}
      }
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (!excludeTag || parsed.tagName !== excludeTag) {
          releaseData = {
            tagName: parsed.tagName,
            name: parsed.name,
            isDraft: parsed.isDraft || false,
            isPrerelease: parsed.isPrerelease || false,
            assets: Array.isArray(parsed.assets)
              ? parsed.assets.map((a) => ({
                  name: a.name,
                  url: a.url,
                  size: a.size || 0,
                  contentType: a.contentType || '',
                }))
              : [],
          };
          releaseExists = !releaseData.isDraft;
          provider = 'GitHub CLI Fallback';
          return { exists: releaseExists, tag: releaseData.tagName, data: releaseData, provider };
        }
      }
    } catch (_) {}
  }

  // 4. HTTP HEAD tag page fallback check
  if (!releaseExists && !isLatestQuery) {
    try {
      const tagHead = await fetchFn(`https://github.com/${REPO_SLUG}/releases/tag/${targetTag}`, {
        method: 'HEAD',
      });
      if (tagHead.ok || tagHead.status === 302 || tagHead.status === 301) {
        releaseExists = true;
        provider = 'HTTP Fallback';
      }
    } catch (_) {}
  }

  return {
    exists: releaseExists,
    tag: targetTag,
    data: releaseData,
    provider,
  };
}
