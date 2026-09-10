import { Capacitor } from '@capacitor/core';
import {
  APP_VERSION,
  compareSemver,
  parseAndNormalizeVersion,
  parseSemver,
  sanitizeUTF8String,
} from '../appVersion';
import { updateDebugLogs } from './diagnostics';
import { StructuredReleaseNotes, globalUpdateState, activeUpdateSession } from './stateMachine';
import { logRawSource } from './versionLogger';
import { UpdaterFlightRecorder } from './flightRecorder';

/**
 * Normalizes and extracts structured release notes, bullet items, and formatted changelog
 * from any input format (StructuredReleaseNotes object, string array, markdown text, or bulleted string).
 */
export function extractStructuredReleaseNotes(input: unknown): {
  releaseNotes: StructuredReleaseNotes;
  bullets: string[];
  formattedChangelog: string;
} {
  const categories: Required<StructuredReleaseNotes> = {
    added: [],
    improved: [],
    fixed: [],
    changed: [],
  };
  const flatBullets: string[] = [];

  if (!input) {
    return { releaseNotes: {}, bullets: [], formattedChangelog: '' };
  }

  // 1. StructuredReleaseNotes object format
  if (typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as any;
    const catKeys: (keyof StructuredReleaseNotes)[] = ['added', 'improved', 'fixed', 'changed'];
    for (const key of catKeys) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          if (typeof item === 'string') {
            const clean = sanitizeUTF8String(item).trim();
            if (clean) {
              categories[key].push(clean);
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              flatBullets.push(`[${label}] ${clean}`);
            }
          }
        }
      }
    }
  } else if (Array.isArray(input)) {
    // 2. Array of strings
    for (const raw of input) {
      if (typeof raw !== 'string') continue;
      const clean = sanitizeUTF8String(raw).trim();
      if (!clean) continue;

      const tagMatch = clean.match(
        /^\[(Added|Improved|Fixed|Changed|Bug\s*Fixes|Fixes)\]\s*(.*)$/i
      );
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        const content = tagMatch[2].trim();
        if (tag.startsWith('add')) categories.added.push(content);
        else if (tag.startsWith('improv')) categories.improved.push(content);
        else if (tag.startsWith('fix') || tag.startsWith('bug')) categories.fixed.push(content);
        else categories.changed.push(content);
        flatBullets.push(clean);
      } else {
        categories.changed.push(clean);
        flatBullets.push(clean);
      }
    }
  } else if (typeof input === 'string') {
    // 3. String (Markdown, bullet points, or raw changelog body)
    const cleanedText = sanitizeUTF8String(input);
    const lines = cleanedText.split(/\r?\n/);
    let currentCategory: keyof StructuredReleaseNotes = 'changed';
    let hadExplicitHeading = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip version headers e.g. # Version 4.5.43 or ## 4.5.43
      if (/^(?:#|##)\s*(?:Version\s+)?v?\d+\.\d+\.\d+/i.test(line)) continue;
      // Skip Release Date: line
      if (/^Release\s+Date:/i.test(line)) continue;

      // Check category headings e.g. ### Fixed, ### Added, etc.
      const hMatch = line.match(
        /^(?:###|##|\*\*)\s*(Added|Improved|Fixed|Changes|Bug\s*Fixes|Fixes|Changed|Features|Security)\b/i
      );
      if (hMatch) {
        const heading = hMatch[1].toLowerCase();
        hadExplicitHeading = true;
        if (heading.startsWith('add') || heading.startsWith('feat')) currentCategory = 'added';
        else if (heading.startsWith('improv')) currentCategory = 'improved';
        else if (heading.startsWith('fix') || heading.startsWith('bug')) currentCategory = 'fixed';
        else if (heading.startsWith('change')) currentCategory = 'changed';
        else currentCategory = 'changed';
        continue;
      }

      // Check bullet items e.g. - item, * item, • item, or numbered 1. item
      const bulletMatch = line.match(/^[-*•\d.]+\s*(.*)$/);
      const bulletContent = (bulletMatch ? bulletMatch[1] : line).trim();
      if (!bulletContent) continue;

      // Check if bullet content has inline tag e.g. [Fixed] or Category:
      const inlineTagMatch = bulletContent.match(
        /^\[(Added|Improved|Fixed|Changed|Bug\s*Fixes|Fixes)\]\s*(.*)$/i
      );
      if (inlineTagMatch) {
        const tag = inlineTagMatch[1].toLowerCase();
        const content = inlineTagMatch[2].trim();
        let targetCat: keyof StructuredReleaseNotes = currentCategory;
        if (tag.startsWith('add')) targetCat = 'added';
        else if (tag.startsWith('improv')) targetCat = 'improved';
        else if (tag.startsWith('fix') || tag.startsWith('bug')) targetCat = 'fixed';
        else targetCat = 'changed';

        categories[targetCat].push(content);
        flatBullets.push(bulletContent);
      } else {
        categories[currentCategory].push(bulletContent);
        if (hadExplicitHeading) {
          const label = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
          flatBullets.push(`[${label}] ${bulletContent}`);
        } else {
          flatBullets.push(bulletContent);
        }
      }
    }
  }

  const structuredResult: StructuredReleaseNotes = {};
  if (categories.added.length > 0) structuredResult.added = categories.added;
  if (categories.improved.length > 0) structuredResult.improved = categories.improved;
  if (categories.fixed.length > 0) structuredResult.fixed = categories.fixed;
  if (categories.changed.length > 0) structuredResult.changed = categories.changed;

  const formattedChangelog = flatBullets.map((b) => (b.startsWith('•') ? b : `• ${b}`)).join('\n');

  return {
    releaseNotes: structuredResult,
    bullets: flatBullets,
    formattedChangelog,
  };
}

export interface RemoteVersionInfo {
  version: string;
  versionCode?: number;
  changelog?: string;
  mandatory?: boolean;
  downloadUrl?: string;
  updateType?: 'updater' | 'apk' | 'both' | 'none';
  apkUrl?: string;
  apkSha256?: string;
  manualApkUrl?: string;
  fallbackApkUrl?: string;
  releaseNotes?: string[] | StructuredReleaseNotes;
  requiredApkVersion?: string;
  requiredVersionCode?: number;
  platform?: string;
  reinstallRequired?: boolean;
  signatureChanged?: boolean;
  previousSignatureSha256?: string;
  newSignatureSha256?: string;
  installMode?: 'reinstall-required';
  signatures?: string;
  apkSizeBytes?: number;
  packageName?: string;
  tag_name?: string;
  name?: string;
}

const FETCH_TIMEOUT_MS = 6000;

export function versionJsonUrls(): string[] {
  const t = Date.now();
  const override = (import.meta.env.VITE_APK_VERSION_URL as string | undefined)?.trim();
  if (override) {
    const sep = override.includes('?') ? '&' : '?';
    return [`${override}${sep}t=${t}`];
  }

  const remoteBase =
    (import.meta.env.VITE_APK_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
    'https://studio-30f44.web.app';
  const urls: string[] = [];

  if (Capacitor.isNativePlatform()) {
    urls.push(`${remoteBase}/app-release.json?t=${t}`);
  } else {
    const localBase = import.meta.env.BASE_URL || '/';
    urls.push(`${localBase}version.json?t=${t}`);
    urls.push(`${remoteBase}/version.json?t=${t}`);
  }
  return urls;
}

async function fetchOne(url: string, signal: AbortSignal): Promise<RemoteVersionInfo | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      signal,
    });
    if (!res.ok) {
      const errStr = `HTTP Error ${res.status}`;
      if (url.includes('version.json')) updateDebugLogs.fetchedVersionJson = errStr;
      if (url.includes('app-release.json')) updateDebugLogs.fetchedAppReleaseJson = errStr;
      return null;
    }
    const text = await res.text();
    const isAppRelease = url.includes('app-release.json');
    const isVersionJson = url.includes('version.json');
    if (isAppRelease) {
      logRawSource('app-release.json', text);
    } else if (isVersionJson) {
      logRawSource('version.json', text);
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      const errStr = 'Malformed JSON response';
      if (isVersionJson) updateDebugLogs.fetchedVersionJson = errStr;
      if (isAppRelease) updateDebugLogs.fetchedAppReleaseJson = errStr;
      return null;
    }
    if (!json || typeof json !== 'object') {
      const errStr = 'Malformed JSON response';
      if (isVersionJson) updateDebugLogs.fetchedVersionJson = errStr;
      if (isAppRelease) updateDebugLogs.fetchedAppReleaseJson = errStr;
      return null;
    }
    const obj = json as Record<string, unknown>;
    const normalizedVersion = parseAndNormalizeVersion(obj.version as string | null | undefined);
    if (!normalizedVersion) {
      const errStr = 'Missing or invalid version field in JSON';
      if (url.includes('version.json')) updateDebugLogs.fetchedVersionJson = errStr;
      if (url.includes('app-release.json')) updateDebugLogs.fetchedAppReleaseJson = errStr;
      return null;
    }

    if (url.includes('version.json')) {
      updateDebugLogs.fetchedVersionJson = normalizedVersion;
    } else if (url.includes('app-release.json')) {
      updateDebugLogs.fetchedAppReleaseJson = normalizedVersion;
    }

    const rawNotesInput = obj.releaseNotes || obj.changelog || obj.description || obj.whatsNew;
    const extractedNotes = extractStructuredReleaseNotes(rawNotesInput);

    const changelog =
      typeof obj.changelog === 'string' && obj.changelog.trim().length > 0
        ? sanitizeUTF8String(obj.changelog).trim()
        : typeof obj.description === 'string' && obj.description.trim().length > 0
          ? sanitizeUTF8String(obj.description).trim()
          : extractedNotes.formattedChangelog || undefined;

    const downloadUrl =
      typeof obj.downloadUrl === 'string'
        ? obj.downloadUrl
        : typeof obj.apk_download_url === 'string'
          ? obj.apk_download_url
          : undefined;
    const updateType =
      obj.update_type === 'updater' ||
      obj.update_type === 'apk' ||
      obj.update_type === 'both' ||
      obj.update_type === 'none'
        ? obj.update_type
        : obj.updateType === 'updater' ||
            obj.updateType === 'apk' ||
            obj.updateType === 'both' ||
            obj.updateType === 'none'
          ? obj.updateType
          : undefined;
    const apkUrl =
      typeof obj.download_url === 'string'
        ? obj.download_url
        : typeof obj.apkUrl === 'string'
          ? obj.apkUrl
          : undefined;
    const apkSha256 =
      typeof obj.sha256 === 'string'
        ? obj.sha256
        : typeof obj.apkSha256 === 'string'
          ? obj.apkSha256
          : undefined;
    const manualApkUrl =
      typeof obj.manual_download_url === 'string'
        ? obj.manual_download_url
        : typeof obj.manualApkUrl === 'string'
          ? obj.manualApkUrl
          : undefined;
    const fallbackApkUrl =
      typeof obj.fallback_download_url === 'string'
        ? obj.fallback_download_url
        : typeof obj.fallbackApkUrl === 'string'
          ? obj.fallbackApkUrl
          : undefined;

    const reinstallRequired = !!(obj.reinstallRequired || obj.reinstall_required);
    const signatureChanged = !!(obj.signatureChanged || obj.signature_changed);
    const previousSignatureSha256 =
      typeof obj.previousSignatureSha256 === 'string'
        ? obj.previousSignatureSha256
        : typeof obj.previous_signature_sha256 === 'string'
          ? obj.previous_signature_sha256
          : undefined;
    const newSignatureSha256 =
      typeof obj.newSignatureSha256 === 'string'
        ? obj.newSignatureSha256
        : typeof obj.new_signature_sha256 === 'string'
          ? obj.new_signature_sha256
          : undefined;
    const installMode =
      obj.installMode === 'reinstall-required' || obj.install_mode === 'reinstall-required'
        ? 'reinstall-required'
        : undefined;
    const packageName =
      typeof obj.packageName === 'string'
        ? obj.packageName
        : typeof obj.package_name === 'string'
          ? obj.package_name
          : undefined;
    const signatures =
      typeof obj.signatures === 'string'
        ? obj.signatures
        : typeof obj.signature === 'string'
          ? obj.signature
          : undefined;

    const requiredApkVersion =
      typeof obj.required_apk_version === 'string'
        ? obj.required_apk_version
        : typeof obj.requiredApkVersion === 'string'
          ? obj.requiredApkVersion
          : undefined;
    const requiredVersionCode =
      typeof obj.required_version_code === 'number'
        ? obj.required_version_code
        : typeof obj.requiredVersionCode === 'number'
          ? obj.requiredVersionCode
          : typeof obj.required_version_code === 'string'
            ? parseInt(obj.required_version_code, 10)
            : typeof obj.requiredVersionCode === 'string'
              ? parseInt(obj.requiredVersionCode, 10)
              : undefined;
    const versionCode =
      typeof obj.versionCode === 'number'
        ? obj.versionCode
        : typeof obj.version_code === 'number'
          ? obj.version_code
          : typeof obj.versionCode === 'string'
            ? parseInt(obj.versionCode, 10)
            : typeof obj.version_code === 'string'
              ? parseInt(obj.version_code, 10)
              : undefined;

    const parsedReleaseNotes: StructuredReleaseNotes | undefined =
      Object.keys(extractedNotes.releaseNotes).length > 0 ? extractedNotes.releaseNotes : undefined;

    const resultObj: RemoteVersionInfo = {
      version: normalizedVersion,
      changelog,
      mandatory: obj.mandatory === true,
      downloadUrl,
      updateType,
      apkUrl,
      apkSha256,
      manualApkUrl,
      fallbackApkUrl,
      releaseNotes: parsedReleaseNotes,
      requiredApkVersion,
      requiredVersionCode,
      versionCode,
      platform: typeof obj.platform === 'string' ? obj.platform : undefined,
      reinstallRequired,
      signatureChanged,
      previousSignatureSha256,
      newSignatureSha256,
      installMode,
      packageName,
      signatures,
      apkSizeBytes:
        typeof obj.apkSizeBytes === 'number'
          ? obj.apkSizeBytes
          : typeof obj.apkSizeBytes === 'string'
            ? parseInt(obj.apkSizeBytes, 10)
            : undefined,
    };

    if (!validateRemoteMetadata(resultObj)) {
      const errStr = `Rejected remote metadata due to validation failure. version: ${normalizedVersion}`;
      if (url.includes('version.json')) updateDebugLogs.fetchedVersionJson = errStr;
      if (url.includes('app-release.json')) updateDebugLogs.fetchedAppReleaseJson = errStr;
      return null;
    }

    return resultObj;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (url.includes('version.json')) updateDebugLogs.fetchedVersionJson = `Error: ${errMsg}`;
    if (url.includes('app-release.json'))
      updateDebugLogs.fetchedAppReleaseJson = `Error: ${errMsg}`;
    return null;
  }
}

export function logPipelineTrace(caller: string, stage: string, input: any, output: any) {
  const timestamp = new Date().toISOString();
  const state = globalUpdateState?.updateState || 'UNKNOWN';
  const sessionId = activeUpdateSession
    ? String(activeUpdateSession.sessionId)
    : globalUpdateState?.sessionId
      ? String(globalUpdateState.sessionId)
      : 'N/A';

  const logMsg = `[PIPELINE_TRACE] [${timestamp}] [Session:${sessionId}] [State:${state}] [Caller:${caller}] [Stage:${stage}] | Input: ${typeof input === 'object' ? JSON.stringify(input) : input} | Output: ${typeof output === 'object' ? JSON.stringify(output) : output}`;
  // Also push to the Flight Recorder so it is captured in the diagnostic copy everything report
  try {
    UpdaterFlightRecorder.record({
      thread: 'js',
      sessionId: sessionId !== 'N/A' ? sessionId : null,
      workflowId: null,
      eventType: `trace_${stage}`,
      caller: caller,
      category: 'PIPELINE',
      reason: `${stage} trace`,
      details: JSON.stringify({ input, output, timestamp, state }),
    });
  } catch (e) {
    // ignore
  }
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  name?: string;
  body?: string;
  assets: GitHubReleaseAsset[];
}

async function fetchLatestFromGitHub(signal: AbortSignal): Promise<RemoteVersionInfo | null> {
  const caller = 'fetchLatestFromGitHub';
  const url = 'https://api.github.com/repos/MAGEXE1000/Livex/releases';
  logPipelineTrace(caller, 'HTTP_REQUEST_URL', { url }, 'N/A');

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    logPipelineTrace(
      caller,
      'HTTP_RESPONSE',
      { url },
      { status: res.status, statusText: res.statusText }
    );

    if (!res.ok) {
      return null;
    }

    const text = await res.text();
    logPipelineTrace(
      caller,
      'RAW_JSON',
      { url },
      { rawLength: text.length, sample: text.slice(0, 200) }
    );
    logRawSource('github-releases', text);

    const releases = JSON.parse(text) as GitHubRelease[];
    if (!Array.isArray(releases) || releases.length === 0) {
      return null;
    }

    // Find the first/latest release that contains an APK asset
    let targetRelease: GitHubRelease | null = null;
    let apkAsset: GitHubReleaseAsset | null = null;
    let shaAsset: GitHubReleaseAsset | null = null;

    for (const r of releases) {
      if (r.assets && Array.isArray(r.assets)) {
        const foundApk = r.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
        if (foundApk) {
          targetRelease = r;
          apkAsset = foundApk;
          shaAsset = r.assets.find((a) => a.name.toLowerCase().endsWith('.sha256')) || null;
          break;
        }
      }
    }

    if (!targetRelease || !apkAsset) {
      return null;
    }

    const version = parseAndNormalizeVersion(targetRelease.tag_name);
    if (!version) {
      return null;
    }

    logPipelineTrace(caller, 'METADATA_PARSING', { tag_name: targetRelease.tag_name }, { version });

    // Calculate versionCode from version string (e.g. 4.0.29 -> 40029)
    const semver = parseSemver(version);
    let versionCode = 0;
    if (semver) {
      versionCode = semver.major * 10000 + semver.minor * 100 + semver.patch;
    }
    logPipelineTrace(caller, 'VERSION_CODE_ASSIGNMENT', { version }, { versionCode });

    // Attempt to fetch the SHA-256 hash from the .sha256 asset
    let apkSha256 = '';
    if (shaAsset) {
      const shaUrl = shaAsset.browser_download_url;
      logPipelineTrace(caller, 'HTTP_REQUEST_URL', { url: shaUrl }, 'N/A');
      try {
        const shaRes = await fetch(shaUrl, { signal });
        logPipelineTrace(caller, 'HTTP_RESPONSE', { url: shaUrl }, { status: shaRes.status });
        if (shaRes.ok) {
          const shaText = await shaRes.text();
          logPipelineTrace(caller, 'RAW_JSON', { url: shaUrl }, { raw: shaText.trim() });
          const match = shaText.trim().match(/^([a-fA-F0-9]{64})/);
          if (match) {
            apkSha256 = match[1].toLowerCase();
          }
        }
      } catch (shaErr) {}
    }

    const rawNotesInput = targetRelease.body || targetRelease.name || '';
    const extractedNotes = extractStructuredReleaseNotes(rawNotesInput);

    const info: RemoteVersionInfo = {
      version,
      versionCode,
      changelog: extractedNotes.formattedChangelog || targetRelease.body || '',
      mandatory: false,
      downloadUrl: apkAsset.browser_download_url,
      apkUrl: apkAsset.browser_download_url,
      apkSha256: apkSha256 || undefined,
      manualApkUrl: apkAsset.browser_download_url,
      fallbackApkUrl: apkAsset.browser_download_url,
      platform: 'github',
      updateType: 'apk',
      tag_name: targetRelease.tag_name,
      name: targetRelease.name || `Studio v${version}`,
      releaseNotes:
        Object.keys(extractedNotes.releaseNotes).length > 0
          ? extractedNotes.releaseNotes
          : undefined,
    };

    logPipelineTrace(caller, 'RELEASE_METADATA_OBJECT', { source: 'github' }, info);
    return info;
  } catch (err) {
    return null;
  }
}

export async function fetchRemoteVersion(signal?: AbortSignal): Promise<RemoteVersionInfo | null> {
  const caller = 'fetchRemoteVersion';
  const urls = versionJsonUrls();
  const ctrl = signal ? null : new AbortController();
  const sig = signal ?? ctrl!.signal;

  // 1. Primary path: Query Firebase metadata
  let firebaseRes: RemoteVersionInfo | null = null;
  if (urls.length > 0) {
    try {
      firebaseRes = await new Promise<RemoteVersionInfo | null>((resolve) => {
        let completed = false;
        let resolved = false;
        let failedCount = 0;
        const total = urls.length;

        urls.forEach((url) => {
          logPipelineTrace(caller, 'HTTP_REQUEST_URL', { url }, 'N/A');
          fetchOne(url, sig)
            .then((res) => {
              if (resolved || completed) return;
              if (res) {
                logPipelineTrace(caller, 'HTTP_RESPONSE', { url }, { status: 200 });
                logPipelineTrace(
                  caller,
                  'RELEASE_METADATA_OBJECT',
                  { source: 'firebase', url },
                  res
                );
                resolved = true;
                completed = true;
                resolve(res);
              } else {
                logPipelineTrace(caller, 'HTTP_RESPONSE', { url }, { status: 'failed/null' });
                failedCount++;
                if (failedCount === total) {
                  completed = true;
                  resolve(null);
                }
              }
            })
            .catch((err) => {
              logPipelineTrace(
                caller,
                'HTTP_RESPONSE',
                { url },
                { error: err?.message || String(err) }
              );
              if (resolved || completed) return;
              failedCount++;
              if (failedCount === total) {
                completed = true;
                resolve(null);
              }
            });
        });
      });
    } catch (e) {}
  }

  // 2. Query GitHub releases to ensure we pick the highest available release
  let githubRes: RemoteVersionInfo | null = null;
  try {
    githubRes = await fetchLatestFromGitHub(sig);
  } catch (err) {}

  if (firebaseRes && githubRes && firebaseRes.version && githubRes.version) {
    const comp = compareSemver(githubRes.version, firebaseRes.version);
    if (comp > 0) {
      logPipelineTrace(
        caller,
        'METADATA_SOURCE_SELECTION',
        { firebase: firebaseRes.version, github: githubRes.version },
        { selected: 'github' }
      );
      return githubRes;
    }
    logPipelineTrace(
      caller,
      'METADATA_SOURCE_SELECTION',
      { firebase: firebaseRes.version, github: githubRes.version },
      { selected: 'firebase' }
    );
    return firebaseRes;
  }

  const finalRemote = firebaseRes || githubRes;
  return finalRemote;
}

export function validateRemoteMetadata(remote: RemoteVersionInfo | null): boolean {
  if (!remote) return false;

  const versionName = remote.version;
  const rawVersionCode = remote.versionCode;
  const versionCode =
    typeof rawVersionCode === 'number'
      ? rawVersionCode
      : typeof rawVersionCode === 'string'
        ? parseInt(rawVersionCode, 10)
        : undefined;

  const tag =
    remote.platform === 'github'
      ? (remote as any).tag_name
      : remote.version
        ? `v${remote.version}`
        : undefined;
  const releaseName =
    remote.platform === 'github'
      ? (remote as any).name
      : remote.version
        ? `Studio v${remote.version}`
        : undefined;

  const isNativeCheck = Capacitor.isNativePlatform();

  let isVerNameValid = false;
  let isVerCodeValid = false;
  let isTagValid = false;
  let isReleaseNameValid = false;

  if (versionName && typeof versionName === 'string') {
    const parsed = parseSemver(versionName);
    if (parsed && versionName !== 'V' && versionName !== 'v') {
      isVerNameValid = true;
    }
  }

  // tag validation: must parse as valid semver
  if (tag && typeof tag === 'string') {
    const parsed = parseSemver(tag);
    if (parsed && tag !== 'V' && tag !== 'v') {
      isTagValid = true;
    }
  }

  if (releaseName && typeof releaseName === 'string' && releaseName.trim().length > 0) {
    isReleaseNameValid = true;
  }

  if (isNativeCheck) {
    if (
      versionCode !== undefined &&
      typeof versionCode === 'number' &&
      !isNaN(versionCode) &&
      versionCode > 0
    ) {
      isVerCodeValid = true;
    }
  } else {
    isVerCodeValid = true; // Not required on web
  }

  if (!isVerNameValid || !isVerCodeValid || !isTagValid || !isReleaseNameValid) {
    console.error(
      `[AppUpdater] [METADATA REJECTED] Validation failure: ` +
        `versionName: "${versionName}" (${isVerNameValid ? 'VALID' : 'INVALID'}), ` +
        `versionCode: ${versionCode} (${isVerCodeValid ? 'VALID' : 'INVALID'}), ` +
        `tag: "${tag}" (${isTagValid ? 'VALID' : 'INVALID'}), ` +
        `releaseName: "${releaseName}" (${isReleaseNameValid ? 'VALID' : 'INVALID'})`
    );
    return false;
  }

  return true;
}
