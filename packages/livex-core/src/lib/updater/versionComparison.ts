import { APP_VERSION, NATIVE_VERSION_CODE, compareSemver, parseSemver } from '../appVersion';
import { RemoteVersionInfo } from './releaseMetadata';
import { Capacitor } from '@capacitor/core';

export interface VersionComparisonResult {
  updateAvailable: boolean;
  isDowngrade: boolean;
  isUpgrade: boolean;
  isUpToDate: boolean;
  explanation: string;
  details: {
    localVersionName: string;
    localVersionCode: number | null;
    remoteVersionName: string | null;
    remoteVersionCode: number | null;
    metadataAvailable: boolean;
    metadataIntegrity: boolean;
    apkUrlPresent: boolean;
    sha256Present: boolean;
    [key: string]: any;
  };
}

export function compareVersions(
  remote: RemoteVersionInfo | null,
  localVersionName: string = APP_VERSION,
  localVersionCode?: number | null
): VersionComparisonResult {
  const details = {
    localVersionName,
    localVersionCode: localVersionCode ?? null,
    remoteVersionName: remote ? remote.version : null,
    remoteVersionCode: remote && remote.versionCode !== undefined ? remote.versionCode : null,
    metadataAvailable: remote !== null,
    metadataIntegrity: false,
    apkUrlPresent: false,
    sha256Present: false,
  };

  if (!remote) {
    return {
      updateAvailable: false,
      isDowngrade: false,
      isUpgrade: false,
      isUpToDate: false,
      explanation: 'Remote metadata is missing or unreachable.',
      details,
    };
  }

  const apkUrl = remote.apkUrl || remote.downloadUrl;
  details.apkUrlPresent = !!apkUrl;
  details.sha256Present = !!remote.apkSha256;

  const parsedRemoteSemver = remote.version ? parseSemver(remote.version) : null;
  const isVerNameValid = !!parsedRemoteSemver && remote.version !== 'V' && remote.version !== 'v';

  let isVerCodeValid = true;
  if (localVersionCode !== undefined && localVersionCode !== null) {
    const rawVersionCode = remote.versionCode;
    const versionCode =
      typeof rawVersionCode === 'number'
        ? rawVersionCode
        : typeof rawVersionCode === 'string'
          ? parseInt(rawVersionCode, 10)
          : undefined;
    isVerCodeValid =
      versionCode !== undefined &&
      typeof versionCode === 'number' &&
      !isNaN(versionCode) &&
      versionCode > 0;
  }

  if (!isVerNameValid || !isVerCodeValid) {
    return {
      updateAvailable: false,
      isDowngrade: false,
      isUpgrade: false,
      isUpToDate: false,
      explanation: `Remote metadata validation failed: version "${remote.version}" (semver: ${isVerNameValid ? 'VALID' : 'INVALID'}) and/or versionCode "${remote.versionCode}" (code: ${isVerCodeValid ? 'VALID' : 'INVALID'}) are invalid.`,
      details,
    };
  }

  details.metadataIntegrity = true;

  // Fail-closed verification for native / APK updates
  const isApkUpdate =
    Capacitor.isNativePlatform() || remote.updateType === 'apk' || remote.updateType === 'both';

  if (isApkUpdate) {
    if (!apkUrl || typeof apkUrl !== 'string' || apkUrl.trim().length === 0) {
      details.metadataIntegrity = false;
      return {
        updateAvailable: false,
        isDowngrade: false,
        isUpgrade: false,
        isUpToDate: false,
        explanation: `Remote metadata validation failed: missing valid APK download URL for native platform update.`,
        details,
      };
    }

    const sha = remote.apkSha256;
    if (!sha || typeof sha !== 'string' || !/^[a-fA-F0-9]{64}$/.test(sha.trim())) {
      details.metadataIntegrity = false;
      return {
        updateAvailable: false,
        isDowngrade: false,
        isUpgrade: false,
        isUpToDate: false,
        explanation: `Remote metadata validation failed: missing or malformed SHA-256 checksum ("${sha || ''}"). Native APK updates require a 64-character hex SHA-256 hash.`,
        details,
      };
    }
  }

  const nameComparison = compareSemver(remote.version, localVersionName);

  let isDowngrade = false;
  let isUpgrade = false;
  let isUpToDate = false;

  const effectiveLocalCode =
    localVersionCode !== undefined && localVersionCode !== null
      ? localVersionCode
      : Capacitor.isNativePlatform()
        ? NATIVE_VERSION_CODE
        : null;

  // Verify consistency between version code and version name
  let hasInconsistency = false;
  if (
    effectiveLocalCode !== null &&
    remote.versionCode !== undefined &&
    remote.versionCode !== null
  ) {
    if (remote.versionCode > effectiveLocalCode && nameComparison < 0) {
      hasInconsistency = true;
    } else if (remote.versionCode < effectiveLocalCode && nameComparison > 0) {
      hasInconsistency = true;
    } else if (remote.versionCode === effectiveLocalCode && nameComparison !== 0) {
      hasInconsistency = true;
    }
  }

  if (hasInconsistency) {
    details.metadataIntegrity = false;
    return {
      updateAvailable: false,
      isDowngrade: false,
      isUpgrade: false,
      isUpToDate: false,
      explanation: `Inconsistent remote metadata: Remote version is "${remote.version}" (code ${remote.versionCode}) but local version is "${localVersionName}" (code ${effectiveLocalCode}). This represents an inconsistent release configuration.`,
      details,
    };
  }

  if (
    effectiveLocalCode !== null &&
    remote.versionCode !== undefined &&
    remote.versionCode !== null
  ) {
    if (remote.versionCode > effectiveLocalCode) {
      isUpgrade = true;
    } else if (remote.versionCode < effectiveLocalCode) {
      isDowngrade = true;
    } else {
      isUpToDate = true;
    }
  } else {
    // Fallback: no versionCode available, use semver comparison
    isDowngrade = nameComparison < 0;
    isUpgrade = nameComparison > 0;
    isUpToDate = nameComparison === 0;
  }

  let explanation = '';
  if (isUpgrade) {
    explanation = `Newer version available: remote version ${remote.version} (code ${remote.versionCode || 'none'}) is higher than local version ${localVersionName} (code ${localVersionCode || 'none'}).`;
  } else if (isDowngrade) {
    explanation = `Remote version ${remote.version} (code ${remote.versionCode || 'none'}) is older than local version ${localVersionName} (code ${localVersionCode || 'none'}).`;
  } else {
    explanation = `Current version ${localVersionName} (code ${localVersionCode || 'none'}) is fully up to date with remote version ${remote.version} (code ${remote.versionCode || 'none'}).`;
  }

  return {
    updateAvailable: isUpgrade,
    isDowngrade,
    isUpgrade,
    isUpToDate,
    explanation,
    details,
  };
}
