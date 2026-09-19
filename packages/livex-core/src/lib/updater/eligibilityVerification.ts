import { checkApkEligibility } from '../apkDownloader';
import { PRODUCTION_SIGNING_SHA256 } from '../appVersion';
import { globalUpdateState, transitionToState } from './stateMachine';
import { updateDebugLogs, logProgressStage, nextJsCallId } from './diagnostics';

let eligibilityCheckCallCount = 0;

export async function runEligibilityCheck(
  filePath: string,
  allowDowngrade?: boolean
): Promise<boolean> {
  eligibilityCheckCallCount++;
  const callId = nextJsCallId();
  void logProgressStage(
    '[INSTRUMENTATION] runEligibilityCheck ENTER',
    `Call #${callId} filePath=${filePath}`
  );
  try {
    const el = await checkApkEligibility(filePath, allowDowngrade);

    // Populate installed app info
    updateDebugLogs.installedPackageName = el.installed?.packageName ?? null;
    updateDebugLogs.installedVersionName = el.installed?.versionName ?? null;
    updateDebugLogs.installedVersionCode = el.installed?.versionCode ?? null;
    updateDebugLogs.installedSigningSha256 = el.installed?.signingSha256 ?? null;
    updateDebugLogs.installedDebuggable = el.installed?.debuggable ?? null;

    // Populate downloaded APK info
    updateDebugLogs.downloadedPackageName = el.downloaded?.packageName ?? null;
    updateDebugLogs.downloadedVersionName = el.downloaded?.versionName ?? null;
    updateDebugLogs.downloadedVersionCode = el.downloaded?.versionCode ?? null;
    updateDebugLogs.downloadedSigningSha256 = el.downloaded?.signingSha256 ?? null;
    updateDebugLogs.downloadedDebuggable = el.downloaded?.debuggable ?? null;
    updateDebugLogs.downloadedApkPath = filePath;
    updateDebugLogs.downloadedIsValidApk = el.downloaded?.isValidApk ?? null;
    updateDebugLogs.downloadedIsUniversalApk = el.downloaded?.isUniversalApk ?? null;

    // Get file size from filesystem only if downloaded APK is valid
    if (el.downloaded?.isValidApk) {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        const info = await Filesystem.stat({ path: filePath });
        updateDebugLogs.downloadedApkSize = `${(info.size / (1024 * 1024)).toFixed(2)} MB (${info.size} bytes)`;
      } catch {
        updateDebugLogs.downloadedApkSize = 'N/A';
      }
    } else {
      updateDebugLogs.downloadedApkSize = 'N/A';
    }
    updateDebugLogs.downloadedApkSha256 = globalUpdateState.apkSha256 ?? null;

    // Populate eligibility checks
    if (el.installed && el.downloaded) {
      updateDebugLogs.eligibilityPackageNameMatch =
        el.installed.packageName === el.downloaded.packageName;
      updateDebugLogs.eligibilitySigningMatch =
        (el.installed.signingSha256 || '').replace(/:/g, '').toLowerCase() ===
        (el.downloaded.signingSha256 || '').replace(/:/g, '').toLowerCase();
      updateDebugLogs.eligibilityVersionCodeHigher =
        el.downloaded.versionCode > el.installed.versionCode;
      updateDebugLogs.eligibilityReleaseBuild = el.downloaded.debuggable === false;
      updateDebugLogs.eligibilityValidApk = el.downloaded.isValidApk === true;

      // Detailed diagnostics fields
      updateDebugLogs.certificateSubject =
        (el.downloaded as any).certificateSubject ||
        (el.installed as any).certificateSubject ||
        'CN=Unknown Subject';
      updateDebugLogs.certificateIssuer =
        (el.downloaded as any).certificateIssuer ||
        (el.installed as any).certificateIssuer ||
        'CN=Unknown Issuer';
      updateDebugLogs.expectedSigningSha256 = PRODUCTION_SIGNING_SHA256.toLowerCase()
        .replace(/:/g, '')
        .trim();
      updateDebugLogs.validationStage = 'Post-Download Package Verification';
      updateDebugLogs.exactFailingStage =
        el.reason === 'signature_mismatch'
          ? 'Certificate Fingerprint Match Check'
          : el.reason === 'packageName_mismatch'
            ? 'Package Name Match Check'
            : 'Version/Metadata Match Check';
      updateDebugLogs.rootCause =
        el.reason === 'signature_mismatch'
          ? `Signing certificate mismatch. Expected production fingerprint: ${PRODUCTION_SIGNING_SHA256}, but the downloaded APK was signed with fingerprint: ${el.downloaded.signingSha256 || 'N/A'}`
          : el.errorDetails || 'N/A';
      updateDebugLogs.suggestedFix =
        el.reason === 'signature_mismatch'
          ? 'Re-sign the update package using the official production key corresponding to the production certificate fingerprint, or reinstall the official production app release.'
          : 'Ensure package is built and signed correctly.';
    } else {
      updateDebugLogs.eligibilityPackageNameMatch = null;
      updateDebugLogs.eligibilitySigningMatch = null;
      updateDebugLogs.eligibilityVersionCodeHigher = null;
      updateDebugLogs.eligibilityReleaseBuild = null;
      updateDebugLogs.eligibilityValidApk = null;
    }

    updateDebugLogs.eligibilityFinalInstall = el.eligible ? 'can install' : 'cannot install';
    updateDebugLogs.eligibilityReason = el.reason ?? null;
    updateDebugLogs.apkEligibilityResult = el.eligible ? 'eligible' : (el.reason ?? 'unknown');

    if (!el.eligible) {
      if (el.reason === 'signature_mismatch') {
        transitionToState(
          'RECOVERY',
          `Eligibility failed: ${el.reason}`,
          el.errorDetails || 'Signing certificate mismatch'
        );
      } else if (el.reason === 'versionCode_low') {
        transitionToState(
          'INSTALL_FAILED',
          `Eligibility failed: ${el.reason}`,
          el.errorDetails || 'Version code is too low.'
        );
      } else {
        transitionToState(
          'INSTALL_FAILED',
          `Eligibility failed: ${el.reason || 'unknown'}`,
          el.errorDetails || 'APK eligibility validation failed.'
        );
      }
      void logProgressStage(
        '[INSTRUMENTATION] runEligibilityCheck EXIT',
        `Call #${callId} returns=false reason=${el.reason}`
      );
      return false;
    }
    void logProgressStage(
      '[INSTRUMENTATION] runEligibilityCheck EXIT',
      `Call #${callId} returns=true`
    );
    return true;
  } catch (err) {
    console.error(`[INSTRUMENTATION] runEligibilityCheck EXIT Call #${callId} error:`, err);
    void logProgressStage(
      '[INSTRUMENTATION] runEligibilityCheck EXIT',
      `Call #${callId} failed err=${err instanceof Error ? err.message : String(err)}`
    );
    console.error('[Updater] Eligibility helper check failed:', err);
    updateDebugLogs.eligibilityFinalInstall = 'cannot install';
    updateDebugLogs.eligibilityReason = 'parse_failed';
    updateDebugLogs.apkEligibilityResult = 'parse_failed';
    transitionToState(
      'INSTALL_FAILED',
      'Eligibility check exception: parse_failed',
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
