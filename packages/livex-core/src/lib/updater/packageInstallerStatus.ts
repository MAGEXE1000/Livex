/**
 * updater/packageInstallerStatus.ts
 *
 * Maps Android PackageInstaller integer status codes to human-readable names.
 * Exports: getPackageInstallerStatusName
 */

export function getPackageInstallerStatusName(status: number): string {
  switch (status) {
    case -2:
      return 'STATUS_PENDING_INSTALL (Installer Started)';
    case -1:
      return 'STATUS_PENDING_USER_ACTION (Requires confirmation)';
    case -3:
      return 'STATUS_PROGRESS_UPDATE';
    case 0:
      return 'STATUS_SUCCESS';
    case 1:
      return 'STATUS_FAILURE';
    case 2:
      return 'STATUS_FAILURE_BLOCKED';
    case 3:
      return 'STATUS_FAILURE_ABORTED (User cancelled)';
    case 4:
      return 'STATUS_FAILURE_INVALID';
    case 5:
      return 'STATUS_FAILURE_CONFLICT (Signature mismatch)';
    case 6:
      return 'STATUS_FAILURE_STORAGE (Insufficient storage)';
    case 7:
      return 'STATUS_FAILURE_INCOMPATIBLE (Version Code low)';
    default:
      return `STATUS_UNKNOWN (${status})`;
  }
}
