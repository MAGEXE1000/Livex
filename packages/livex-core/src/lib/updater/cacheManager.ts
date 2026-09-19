import { Filesystem, Directory } from '@capacitor/filesystem';
import { AppInstaller } from '../apkDownloader';
import { parseAndNormalizeVersion } from '../appVersion';

export async function getLocalApkPath(version: string): Promise<string> {
  const fileName = `studio-update-${version}.apk`;
  const uriResult = await Filesystem.getUri({
    directory: Directory.Cache,
    path: fileName,
  });
  return uriResult.uri;
}

export async function validateLocalApk(
  version: string,
  expectedSha256?: string
): Promise<{ valid: boolean; filePath: string }> {
  let filePath = '';
  try {
    filePath = await getLocalApkPath(version);

    // 1. Check if file exists
    const stat = await Filesystem.stat({ path: filePath });
    if (!stat || stat.size === 0) {
      return { valid: false, filePath };
    }

    // 2. Validate SHA256 if provided
    if (expectedSha256) {
      const shaRes = await AppInstaller.verifySha256({ filePath, expectedHash: expectedSha256 });
      if (!shaRes.matches) {
        return { valid: false, filePath };
      }
    }

    // 3. Inspect APK using native tool
    const inspect = await AppInstaller.inspectApk({ filePath });
    if (!inspect.isValidApk) {
      return { valid: false, filePath };
    }

    // 4. Validate package name
    if (inspect.packageName !== 'com.chordex.app') {
      return { valid: false, filePath };
    }

    // 5. Validate signing certificate
    const expectedFingerprint = '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';
    const cleanFingerprint = inspect.signingSha256.replace(/:/g, '').toLowerCase();
    if (cleanFingerprint !== expectedFingerprint) {
      return { valid: false, filePath };
    }

    // 6. Validate version name
    const cleanInspectVersion = parseAndNormalizeVersion(inspect.versionName) || '';
    const cleanTargetVersion = parseAndNormalizeVersion(version) || '';
    if (cleanInspectVersion !== cleanTargetVersion) {
      return { valid: false, filePath };
    }

    return { valid: true, filePath };
  } catch (err) {
    return { valid: false, filePath };
  }
}

export async function deleteLocalApk(version: string): Promise<void> {
  try {
    const filePath = await getLocalApkPath(version);
    await Filesystem.deleteFile({ path: filePath });
  } catch (err) {
    // File might not exist, which is fine
  }
}

export const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function recordDismissal(version: string | null) {
  if (!version) return;
  try {
    localStorage.setItem('studio:lastDismissedRecoveryVersion', version);
    localStorage.setItem('studio:lastDismissedRecoveryTimestamp', Date.now().toString());
  } catch (err) {
  }
}

export function shouldShowRecoveryReminder(remoteVersion: string | null): boolean {
  if (!remoteVersion) return false;
  try {
    const lastDismissedVer = localStorage.getItem('studio:lastDismissedRecoveryVersion');
    const lastDismissedTime = localStorage.getItem('studio:lastDismissedRecoveryTimestamp');

    if (lastDismissedVer && lastDismissedVer !== remoteVersion) {
      return true;
    }

    if (lastDismissedTime) {
      const parsedTime = parseInt(lastDismissedTime, 10);
      if (!isNaN(parsedTime)) {
        const elapsed = Date.now() - parsedTime;
        if (elapsed < REMINDER_INTERVAL_MS) {
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    return true;
  }
}
