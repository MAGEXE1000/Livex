import { downloadApk, resolveApkUrl, AppInstaller } from '../apkDownloader';
import {
  updateGlobalState,
  resetDownloadWatchdog,
  globalUpdateState,
  transitionToState,
} from './stateMachine';
import { updateDebugLogs, logProgressStage, nextJsCallId } from './diagnostics';
import { logPipelineTrace } from './releaseMetadata';
import { runEligibilityCheck } from './eligibilityVerification';

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
        filePath = await downloadApk(
          sourceUrl,
          fileName,
          (percent, totalBytes, downloadedBytes) => {
            resetDownloadWatchdog();
            const now = Date.now();
            if (now - lastUpdateTime >= 100 || percent === 100 || percent === 0) {
              lastUpdateTime = now;
              const effectiveTotal =
                (typeof totalBytes === 'number' && totalBytes > 0 ? totalBytes : null) ??
                globalUpdateState.apkSizeBytes ??
                null;
              const effectiveDownloaded =
                (typeof downloadedBytes === 'number' && downloadedBytes > 0 ? downloadedBytes : null) ??
                (effectiveTotal && percent > 0 ? Math.round((percent / 100) * effectiveTotal) : null);

              if (onProgress) {
                onProgress(percent, effectiveTotal ?? undefined, effectiveDownloaded ?? undefined);
              } else {
                updateGlobalState({
                  progress: Math.max(0, Math.min(1, percent / 100)),
                  statusText: `Downloading update (${Math.round(percent)}%)`,
                  downloadedBytes: effectiveDownloaded,
                  totalBytes: effectiveTotal,
                });
              }
            }
          },
          globalUpdateState.apkSha256 ?? undefined
        );

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

    const apkSha256 = globalUpdateState.apkSha256;
    if (
      !apkSha256 ||
      typeof apkSha256 !== 'string' ||
      !/^[a-fA-F0-9]{64}$/.test(apkSha256.trim()) ||
      apkSha256.trim().replace(/0/g, '') === ''
    ) {
      throw new Error('[GitHub Download] Missing or invalid SHA-256 checksum for update package.');
    }

    const { filePath } = await AppInstaller.downloadApk({
      url: gitHubApkUrl,
      fileName: `studio-github-${globalUpdateState.remoteVersion || 'latest'}.apk`,
      expectedHash: apkSha256.trim().toLowerCase(),
    });

    updateDebugLogs.downloadStatus += `\nDownload finished. Path: ${filePath}`;
    updateGlobalState({ progress: 1.0, statusText: 'Verifying package checksum...' });

    updateGlobalState({ statusText: 'Verifying SHA-256...' });
    const shaMatches = (
      await AppInstaller.verifyApkSha256({ filePath, expectedHash: apkSha256.trim().toLowerCase() })
    ).matches;
    updateDebugLogs.shaVerification = shaMatches ? 'SUCCESS' : 'FAILED';
    if (!shaMatches) {
      throw new Error('SHA-256 checksum verification failed.');
    }

    updateGlobalState({ statusText: 'Verifying package authenticity & eligibility...' });
    const eligible = await runEligibilityCheck(filePath);
    if (!eligible) {
      throw new Error('Package failed authenticity/eligibility verification.');
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
