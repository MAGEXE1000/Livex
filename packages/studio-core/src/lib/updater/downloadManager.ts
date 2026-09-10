import { downloadApk, resolveApkUrl, AppInstaller } from '../apkDownloader';
import {
  updateGlobalState,
  resetDownloadWatchdog,
  globalUpdateState,
  transitionToState,
} from './stateMachine';
import { updateDebugLogs, logProgressStage, nextJsCallId } from './diagnostics';
import { logPipelineTrace } from './releaseMetadata';

export interface DownloadOptions {
  url: string;
  version: string;
  manualApkUrl?: string;
  fallbackApkUrl?: string;
  onProgress?: (progress: number, totalBytes?: number, downloadedBytes?: number) => void;
}

export async function downloadUpdateApk(options: DownloadOptions): Promise<string> {
  const { url, version, manualApkUrl, fallbackApkUrl, onProgress } = options;
  const fileName = `studio-update-${version}.apk`;
  logPipelineTrace('downloadUpdateApk', 'APK filename generation', { version }, { fileName });

  const sources = [url, manualApkUrl, fallbackApkUrl].filter(Boolean) as string[];

  const uniqueSources = Array.from(new Set(sources));
  let downloadSuccess = false;
  let lastDownloadError: Error | null = null;
  let filePath = '';

  updateDebugLogs.downloadSourcesConfigured = uniqueSources.join(' | ');

  for (let sIdx = 0; sIdx < uniqueSources.length; sIdx++) {
    const sourceUrl = uniqueSources[sIdx];
    updateDebugLogs.currentDownloadSource = sourceUrl;
    updateDebugLogs.downloadStatus += `\nTrying Source [${sIdx + 1}/${uniqueSources.length}]: ${sourceUrl}`;

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        void logProgressStage(
          'Download started',
          `Source: ${sourceUrl} (Attempt ${retryCount + 1})`
        );

        let lastUpdateTime = 0;
        filePath = await downloadApk(sourceUrl, fileName, (percent, totalBytes, downloadedBytes) => {
          resetDownloadWatchdog();
          const now = Date.now();
          if (now - lastUpdateTime >= 100 || percent === 100 || percent === 0) {
            lastUpdateTime = now;
            if (onProgress) {
              onProgress(percent, totalBytes, downloadedBytes);
            } else {
              updateGlobalState({
                progress: Math.max(0, Math.min(1, percent / 100)),
                statusText: `Downloading update (${Math.round(percent)}%)`,
                downloadedBytes: downloadedBytes ?? null,
                totalBytes: totalBytes ?? null,
              });
            }
          }
        });

        downloadSuccess = true;
        break;
      } catch (err: any) {
        retryCount++;
        lastDownloadError = err instanceof Error ? err : new Error(String(err));
        const delay = Math.pow(2, retryCount) * 1000;
        updateGlobalState({
          statusText: `Retry ${retryCount}/${maxRetries} in ${delay / 1000}s...`,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (downloadSuccess) {
      break;
    }
  }

  if (!downloadSuccess) {
    const baseErr = lastDownloadError || new Error('All download sources failed.');
    throw new Error('[Download] ' + baseErr.message);
  }

  return filePath;
}

export async function downloadAndInstallGitHubApk(): Promise<void> {
  const callId = nextJsCallId();
  void logProgressStage('[INSTRUMENTATION] downloadAndInstallGitHubApk ENTER', `Call #${callId}`);

  updateGlobalState({
    loading: true,
    progress: 0,
    statusText: 'Resolving latest GitHub Release...',
  });
  try {
    const gitHubApkUrl = await resolveApkUrl(globalUpdateState.remoteVersion ?? undefined);

    updateDebugLogs.currentDownloadSource = gitHubApkUrl;
    updateDebugLogs.downloadStatus = `Downloading GitHub package: ${gitHubApkUrl}`;
    updateGlobalState({ statusText: 'Downloading from GitHub...' });

    const { filePath } = await AppInstaller.downloadApk({
      url: gitHubApkUrl,
      fileName: `studio-github-${globalUpdateState.remoteVersion || 'latest'}.apk`,
    });

    updateDebugLogs.downloadStatus += `\nDownload finished. Path: ${filePath}`;
    updateGlobalState({ progress: 1.0, statusText: 'Verifying package signatures...' });

    if (globalUpdateState.apkSha256) {
      updateGlobalState({ statusText: 'Verifying SHA-256...' });
      const shaMatches = (
        await AppInstaller.verifyApkSha256({ filePath, expectedHash: globalUpdateState.apkSha256 })
      ).matches;
      updateDebugLogs.shaVerification = shaMatches ? 'SUCCESS' : 'FAILED';
      if (!shaMatches) {
        throw new Error('SHA-256 checksum verification failed.');
      }
    }

    const info = await AppInstaller.inspectApk({ filePath });
    updateDebugLogs.downloadedIsValidApk = info.isValidApk;
    updateDebugLogs.downloadedSigningSha256 = info.signingSha256;
    if (!info.isValidApk) {
      throw new Error('The downloaded package is not a valid APK.');
    }

    updateGlobalState({ statusText: 'Launching package installer...' });
    await AppInstaller.installApk({ filePath });

    transitionToState('IDLE', 'GitHub download complete');
  } catch (err: any) {
    console.error(`[INSTRUMENTATION] downloadAndInstallGitHubApk EXIT Call #${callId} error:`, err);
    updateGlobalState({
      loading: false,
      error: `GitHub installation failed: ${err.message || String(err)}`,
    });
  }
}
