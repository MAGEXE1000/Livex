import fs from 'node:fs';
import { getAppVersionInfo } from '../../../../scripts/parse-version.mjs';

export function simulateGitHubRelease(version = '4.3.55') {
  return {
    tagName: `v${version}`,
    name: version,
    isDraft: false,
    isPrerelease: false,
    publishedAt: new Date().toISOString(),
    assets: [
      {
        name: `studio-${version}.apk`,
        url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
        size: 52607278,
        contentType: 'application/vnd.android.package-archive',
      },
      {
        name: `studio-${version}.sha256`,
        url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.sha256`,
        size: 64,
        contentType: 'text/plain',
      },
      {
        name: 'release-manifest.json',
        url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/release-manifest.json`,
        size: 1168,
        contentType: 'application/json',
      },
    ],
  };
}

export function simulateFirebaseMetadata(version = '4.3.55', sandbox) {
  const meta = {
    platform: 'android',
    version,
    versionName: version,
    versionCode: 40355,
    packageName: 'com.chordex.app',
    updateType: 'apk',
    download_url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
    apkUrl: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
    sha256: '032bc2a0132388558d9bbe8956ed4047e5e1dfb5d528222989d6b5cd927d1f7f',
    apkSha256: '032bc2a0132388558d9bbe8956ed4047e5e1dfb5d528222989d6b5cd927d1f7f',
    signatures: getAppVersionInfo().productionSigningSha256,
  };

  const jsonPath = sandbox.resolvePath('app-release.json');
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2), 'utf8');
  return { meta, jsonPath };
}

export function simulateSimulatedManifest(version = '4.3.55', sandbox) {
  const manifest = {
    $schema: 'https://livex.app/schemas/release-manifest.v1.json',
    manifestVersion: '1.0.0',
    version,
    versionCode: 40355,
    releaseTag: `v${version}`,
    buildTimestampUtc: new Date().toISOString(),
    git: {
      commitSha: 'a3ba0a3ac15bd9ec319cb05e890c2bc2b5c0f98d',
      shortSha: 'a3ba0a3',
      branch: 'main',
    },
    artifact: {
      filename: `studio-${version}.apk`,
      sizeBytes: 52607278,
      sha256: '032bc2a0132388558d9bbe8956ed4047e5e1dfb5d528222989d6b5cd927d1f7f',
      signingCertFingerprint: getAppVersionInfo().productionSigningSha256,
    },
  };

  const path = sandbox.resolvePath('release-manifest.e2e.json');
  fs.writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf8');
  return { manifest, path };
}
