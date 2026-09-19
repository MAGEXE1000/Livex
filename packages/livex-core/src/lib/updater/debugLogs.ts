import { APP_VERSION } from '../appVersion';
import { StructuredReleaseNotes } from './types';

export const updateDebugLogs: {
  appVersion: string;
  nativeApkVersion: string | null;

  fetchedVersionJson: string | null;
  fetchedAppReleaseJson: string | null;
  compareResult: number | null;
  updateType: string | null;
  remoteUpdateType: string | null;

  apkEligibilityResult: string;
  finalDecision: string | null;
  downloadStatus: string | null;
  installError: string | null;
  shaVerification: string | null;
  fileDetails: string | null;
  installerLaunchStatus: string | null;
  lastExceptionStackTrace: string | null;
  appInstallerAvailable: boolean;
  registeredPlugins: string;
  pluginMethodCheck: string;
  finalUpdatePath: string;
  downloadApkAvailable: boolean;
  verifyApkSha256Available: boolean;
  installApkAvailable: boolean;
  openInstallPermissionSettingsAvailable: boolean;
  installedVersionCode: number | null;
  requiredApkVersion: string | null;
  requiredVersionCode: number | null;
  nativeApkBehind: boolean;
  apkUpdateRequired: boolean;

  UpdaterSetBlocked: boolean;
  triggerComponent: string | null;
  finalPathExecuted:
    | 'Updater applied'
    | 'APK installer launched'
    | 'blocked due to APK required'
    | 'N/A';
  installedPackageName: string | null;
  installedVersionName: string | null;
  installedSigningSha256: string | null;
  installedDebuggable: boolean | null;
  downloadedPackageName: string | null;
  downloadedVersionName: string | null;
  downloadedVersionCode: number | null;
  downloadedSigningSha256: string | null;
  downloadedDebuggable: boolean | null;
  downloadedApkPath: string | null;
  downloadedApkSize: string | null;
  downloadedApkSha256: string | null;
  downloadedIsValidApk: boolean | null;
  downloadedIsUniversalApk: boolean | null;
  eligibilityPackageNameMatch: boolean | null;
  eligibilitySigningMatch: boolean | null;
  eligibilityVersionCodeHigher: boolean | null;
  eligibilityReleaseBuild: boolean | null;
  eligibilityValidApk: boolean | null;
  eligibilityFinalInstall: string | null;
  eligibilityReason: string | null;
  updateDecision: string | null;
  updateDecisionReason: string | null;
  remoteVersionCode: number | null;
  versionComparisonResult: string | null;
  nativePlatformDetected: boolean | null;
  platformDetected: string | null;
  apkMetadataValid: boolean | null;
  apkUrlPresent: boolean | null;
  apkShaPresent: boolean | null;
  skippedDismissedState: string | null;
  releaseChannel: string | null;
  rolloutEligibility: string | null;
  magicHeaderCheck: string | null;
  downloadSourcesConfigured: string | null;
  currentDownloadSource: string | null;
  recoveryAttemptsPerformed: string[];
  signatureMismatchDetectedCause: string | null;
  expectedSigningSha256: string | null;
  certificateSubject: string | null;
  certificateIssuer: string | null;
  validationStage: string | null;
  exactFailingStage: string | null;
  rootCause: string | null;
  suggestedFix: string | null;
  magicHeaderCheckResult?: string | null;
  renderCount?: number;
  paintCount?: number;
  layoutCount?: number;
} = {
  appVersion: APP_VERSION,
  nativeApkVersion: null,

  fetchedVersionJson: null,
  fetchedAppReleaseJson: null,
  compareResult: null,
  updateType: null,
  remoteUpdateType: null,

  apkEligibilityResult: 'N/A',
  finalDecision: null,
  downloadStatus: null,
  installError: null,
  shaVerification: null,
  fileDetails: null,
  installerLaunchStatus: null,
  lastExceptionStackTrace: null,
  appInstallerAvailable: false,
  registeredPlugins: '[]',
  pluginMethodCheck: 'N/A',
  finalUpdatePath: 'N/A',
  downloadApkAvailable: false,
  verifyApkSha256Available: false,
  installApkAvailable: false,
  openInstallPermissionSettingsAvailable: false,
  installedVersionCode: null,
  requiredApkVersion: null,
  requiredVersionCode: null,
  nativeApkBehind: false,
  apkUpdateRequired: false,

  UpdaterSetBlocked: false,
  triggerComponent: null,
  finalPathExecuted: 'N/A',
  installedPackageName: null,
  installedVersionName: null,
  installedSigningSha256: null,
  installedDebuggable: null,
  downloadedPackageName: null,
  downloadedVersionName: null,
  downloadedVersionCode: null,
  downloadedSigningSha256: null,
  downloadedDebuggable: null,
  downloadedApkPath: null,
  downloadedApkSize: null,
  downloadedApkSha256: null,
  downloadedIsValidApk: null,
  downloadedIsUniversalApk: null,
  eligibilityPackageNameMatch: null,
  eligibilitySigningMatch: null,
  eligibilityVersionCodeHigher: null,
  eligibilityReleaseBuild: null,
  eligibilityValidApk: null,
  eligibilityFinalInstall: null,
  eligibilityReason: null,
  updateDecision: null,
  updateDecisionReason: null,
  remoteVersionCode: null,
  versionComparisonResult: null,
  nativePlatformDetected: null,
  platformDetected: null,
  apkMetadataValid: null,
  apkUrlPresent: null,
  apkShaPresent: null,
  skippedDismissedState: null,
  releaseChannel: null,
  rolloutEligibility: null,
  magicHeaderCheck: null,
  downloadSourcesConfigured: null,
  currentDownloadSource: null,
  recoveryAttemptsPerformed: [],
  signatureMismatchDetectedCause: null,
  expectedSigningSha256: null,
  certificateSubject: null,
  certificateIssuer: null,
  validationStage: null,
  exactFailingStage: null,
  rootCause: null,
  suggestedFix: null,
  magicHeaderCheckResult: null,
};
