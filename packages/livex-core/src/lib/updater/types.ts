export type AppUpdateState =
  | 'INITIALIZING'
  | 'FETCH_REMOTE_METADATA'
  | 'VALIDATE_METADATA'
  | 'COMPARE_VERSION'
  | 'NO_UPDATE_AVAILABLE'
  | 'UPDATE_AVAILABLE'
  | 'FETCH_APK_INFORMATION'
  | 'DOWNLOAD_APK'
  | 'VERIFY_SHA256'
  | 'PREPARING_INSTALL'
  | 'WAITING_USER_CONFIRMATION'
  | 'PACKAGEINSTALLER_VISIBLE'
  | 'INSTALLING'
  | 'INSTALL_SUCCESS'
  | 'INSTALL_CANCELLED'
  | 'INSTALL_FAILED'
  | 'RECOVERY'
  | 'IDLE';

export interface StructuredReleaseNotes {
  added?: string[];
  improved?: string[];
  fixed?: string[];
  changed?: string[];
}

export interface CentralizedUpdateState {
  updateState: AppUpdateState;
  loading: boolean;
  progress: number;
  error: string | null;
  statusText: string | null;
  remoteVersion: string | null;
  updateAvailable: boolean;
  mandatory: boolean;
  changelog: string | null;
  releaseNotes: string[] | StructuredReleaseNotes | null;
  packageName: string | null;
  apkUrl: string | null;
  apkSha256: string | null;
  manualApkUrl: string | null;
  fallbackApkUrl: string | null;
  downloadUrl: string | null;
  apkSizeBytes: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  decisionExplanation: string | null;
  // Recovery Mode fields
  consecutiveFailures: number;
  activeFallback: string | null;
  recoveryMode: boolean;
  // Version comparison fields
  updateType: 'updater' | 'apk' | 'both' | 'none';
  reinstallRequired: boolean;
  requiredVersionCode: number;
  apkUpdateRequired: boolean;
  validApkExists: boolean;
  sessionId: number | null;
  isModalOpen?: boolean;
}
