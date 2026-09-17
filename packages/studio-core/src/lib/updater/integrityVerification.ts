import { verifyApkSha256 } from '../apkDownloader';
import { transitionToState, updateGlobalState } from './stateMachine';
import { updateDebugLogs, logProgressStage } from './diagnostics';

export async function verifyFileIntegrity(filePath: string, expectedHash: string): Promise<void> {
  updateDebugLogs.downloadStatus += `\nStarting SHA verification (Expected: ${expectedHash})...`;
  transitionToState('VERIFY_SHA256', 'Starting SHA verification');
  updateGlobalState({ statusText: 'Verifying package' });

  if (
    !expectedHash ||
    typeof expectedHash !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(expectedHash.trim()) ||
    expectedHash.trim().replace(/0/g, '') === ''
  ) {
    updateDebugLogs.shaVerification = 'FAILED';
    void logProgressStage('SHA verified', 'SHA validation failed: invalid expected hash');
    throw new Error('[SHA Verification] Invalid or missing expected SHA-256 hash in update metadata');
  }

  const isValid = await verifyApkSha256(filePath, expectedHash);
  void logProgressStage(
    'SHA verified',
    isValid ? 'SHA validation successful' : 'SHA validation failed'
  );
  updateDebugLogs.shaVerification = isValid ? 'SUCCESS' : 'FAILED';

  if (!isValid) {
    throw new Error('[SHA Verification] APK hash verification failed (corrupted download)');
  }
}
