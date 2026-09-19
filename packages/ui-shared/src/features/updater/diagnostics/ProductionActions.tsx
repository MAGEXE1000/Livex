import React, { useState } from 'react';
import { checkForUpdate, downloadUpdate, applyUpdate } from '@workspace/livex-core';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';

interface ProductionActionsProps {
  showToast: (msg: string) => void;
  triggerRefresh: () => void;
  addJsLog: (msg: string) => void;
}

export default function ProductionActions({
  showToast,
  triggerRefresh,
  addJsLog,
}: ProductionActionsProps) {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [completing, setCompleting] = useState(false);

  const runAction = async (
    label: string,
    setLoadingState: React.Dispatch<React.SetStateAction<boolean>>,
    actionFn: () => Promise<any>
  ) => {
    setLoadingState(true);
    addJsLog(`[Action Triggered] ${label}`);
    const start = Date.now();
    try {
      await actionFn();
      const elapsed = Date.now() - start;
      addJsLog(`[Action Succeeded] ${label} finished in ${elapsed}ms.`);
      showToast(`${label} Succeeded!`);
    } catch (err: any) {
      const elapsed = Date.now() - start;
      addJsLog(
        `[Action Failed] ${label} failed after ${elapsed}ms. Error: ${err?.message || String(err)}`
      );
      showToast(`${label} Failed: ${err?.message || String(err)}`);
    } finally {
      setLoadingState(false);
      triggerRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Check for Updates */}
      <button
        disabled={checking || downloading || completing}
        onClick={() =>
          runAction('Check for Updates', setChecking, async () => {
            await checkForUpdate(true, 'dev_tools', 'Check for Updates button tapped');
          })
        }
        className="bg-black hover:bg-white/5 p-5 rounded-xl flex flex-col items-start gap-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed w-full border border-outline-variant/10 text-left outline-none active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
          <AnimatedIcon name="refresh" state={checking ? 'loading' : 'inactive'} size={24} color="currentColor" />
        </div>
        <div>
          <span className="block font-bold text-on-surface">Check for Updates</span>
          <span className="text-xs text-on-surface-variant">Poll remote registry</span>
        </div>
      </button>

      {/* Download APK */}
      <button
        disabled={checking || downloading || completing}
        onClick={() =>
          runAction('Download APK', setDownloading, async () => {
            await downloadUpdate('Download APK button tapped');
          })
        }
        className="bg-black hover:bg-white/5 p-5 rounded-xl flex flex-col items-start gap-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed w-full border border-outline-variant/10 text-left outline-none active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
          <AnimatedIcon name="download" state={downloading ? 'loading' : 'inactive'} size={24} color="currentColor" />
        </div>
        <div>
          <span className="block font-bold text-on-surface">Download APK</span>
          <span className="text-xs text-on-surface-variant">Fetch latest binary</span>
        </div>
      </button>

      {/* Complete Flow */}
      <button
        disabled={checking || downloading || completing}
        onClick={() =>
          runAction('Complete Flow', setCompleting, async () => {
            const checkRes = await checkForUpdate(true, 'dev_tools', 'Complete Flow button tapped');
            if (checkRes.updateAvailable) {
              await downloadUpdate('Complete Flow');
              await applyUpdate('Complete Flow');
            } else {
              showToast('No update available.');
            }
          })
        }
        className="bg-tertiary hover:brightness-110 p-5 rounded-xl flex flex-col items-start gap-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed w-full text-left outline-none shadow-xl active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
          <AnimatedIcon name="play" state={completing ? 'loading' : 'inactive'} size={24} color="currentColor" />
        </div>
        <div>
          <span className="block font-bold text-white">Complete Flow</span>
          <span className="text-xs text-white/70">Full update cycle</span>
        </div>
      </button>
    </div>
  );
}
