const REPO_SLUG = 'MAGEXE1000/Livex';

export async function discoverApkAsset(githubRelease, version, options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  const targetTag = version.startsWith('v') ? version : `v${version}`;

  // 1. If release assets list is present in githubRelease data and matches target tag/version, find any asset ending in .apk
  if (githubRelease && githubRelease.data && Array.isArray(githubRelease.data.assets)) {
    const relTag = githubRelease.data.tagName || githubRelease.tag;
    const cleanRelTag = relTag ? relTag.replace(/^v/, '') : null;
    const cleanVersion = version ? version.replace(/^v/, '') : null;
    if (!cleanRelTag || cleanRelTag === cleanVersion || relTag === targetTag) {
      const apkAsset = githubRelease.data.assets.find((a) =>
        a.name.toLowerCase().endsWith('.apk') || a.contentType === 'application/vnd.android.package-archive'
      );
      if (apkAsset) {
        const url = apkAsset.url || apkAsset.browser_download_url;
        let status = 200;
        try {
          const head = await fetchFn(url, { method: 'HEAD' });
          status = head.status;
        } catch (_) {}
        return {
          found: status === 200,
          name: apkAsset.name,
          url,
          status,
          size: apkAsset.size || 0,
        };
      }
    }
  }

  // 2. Dynamic candidate fallback names
  const candidateNames = [
    `studio-${version}.apk`,
    `app-release.apk`,
    `studio-release.apk`,
    `app-${version}.apk`,
    `Studio-${version}.apk`,
  ];

  for (const name of candidateNames) {
    const candidateUrl = `https://github.com/${REPO_SLUG}/releases/download/${targetTag}/${name}`;
    try {
      const head = await fetchFn(candidateUrl, { method: 'HEAD' });
      if (head.ok) {
        return {
          found: true,
          name,
          url: candidateUrl,
          status: head.status,
          size: (head.headers && typeof head.headers.get === 'function') ? parseInt(head.headers.get('content-length') || '0', 10) : 0,
        };
      }
    } catch (_) {}
  }

  // Default fallback URL if missing
  const defaultUrl = `https://github.com/${REPO_SLUG}/releases/download/${targetTag}/studio-${version}.apk`;
  let defaultStatus = 404;
  try {
    const head = await fetchFn(defaultUrl, { method: 'HEAD' });
    defaultStatus = head.status;
  } catch (_) {}

  return {
    found: false,
    name: `studio-${version}.apk`,
    url: defaultUrl,
    status: defaultStatus,
    size: 0,
  };
}
