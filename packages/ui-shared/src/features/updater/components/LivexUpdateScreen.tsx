import React, { useEffect, useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  APP_VERSION_LABEL,
  UpdaterFlightRecorder,
  type StructuredReleaseNotes,
  useT,
  sanitizeUTF8String,
  extractStructuredReleaseNotes,
  useSettingsStore,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexUpdateScreenProps {
  state: string;
  progress?: number;
  accentFrom?: string;
  accentTo?: string;
  title?: string;
  description?: React.ReactNode;
  iconName?: string;
  iconColor?: string;
  showSpinner?: boolean;
  showProgress?: boolean;
  actionButtons?: React.ReactNode;
  changelog?: React.ReactNode;
  isRequired?: boolean;
  onClose?: () => void;
  onLater?: () => void;
  onUpdateNow?: () => void;
  onCancelDownload?: () => void;
  onRetry?: () => void;
  onDone?: () => void;
  progressComponent?: React.ReactNode;
  isLight?: boolean;
  isAmoled?: boolean;
  fromVersion?: string;
  toVersion?: string;
  apkSizeBytes?: number | null;
  downloadSpeed?: string;
  etaSeconds?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string | null;
  releaseNotes?: string | string[] | StructuredReleaseNotes | null;
  bottomSection?: React.ReactNode;
}

export type StudioUpdateScreenProps = LivexUpdateScreenProps;

function CheckIconSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="#22c55e"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export const LivexUpdateScreen = memo(function LivexUpdateScreen({
  state,
  progress = 0,
  accentFrom,
  accentTo,
  title: customTitle,
  description: customDescription,
  actionButtons,
  changelog: customChangelog,
  isRequired,
  onClose,
  onLater,
  onUpdateNow,
  onCancelDownload,
  onRetry,
  onDone,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
  fromVersion = APP_VERSION_LABEL,
  toVersion,
  apkSizeBytes,
  downloadSpeed,
  etaSeconds,
  downloadedBytes,
  totalBytes,
  error,
  releaseNotes,
}: LivexUpdateScreenProps) {
  // Flight recorder telemetry
  useEffect(() => {
    UpdaterFlightRecorder.record({
      thread: 'ui',
      sessionId: null,
      workflowId: null,
      eventType: 'LivexUpdateScreenRender',
      caller: 'LivexUpdateScreen',
      reason: `Rendered LivexUpdateScreen state: ${state} (${Math.round(progress * 100)}%)`,
    });
  }, [state]);

  const t = useT();
  const updaterTr = (t as any)?.updater;
  const prefersReduced = useAppReducedMotion();

  // Settings theme fallback if not provided via props
  const hubVisTheme = useSettingsStore(
    (s) => s.settings.perApp?.hub?.theme ?? s.settings.theme ?? 'dark'
  );
  const isAmoledMode = useSettingsStore(
    (s) => Boolean(s.settings.amoledMode || s.settings.perApp?.hub?.amoledMode)
  );
  const dynamicLightStart = useSettingsStore((s) => s.settings.dynamicLightStart ?? 7);
  const dynamicLightEnd = useSettingsStore((s) => s.settings.dynamicLightEnd ?? 20);

  const [docTheme, setDocTheme] = useState<'light' | 'dark' | 'amoled'>(() => {
    if (typeof document === 'undefined') return 'dark';
    const doc = document.documentElement;
    if (doc.classList.contains('amoled') || doc.getAttribute('data-theme') === 'amoled') return 'amoled';
    if (doc.classList.contains('light') || doc.getAttribute('data-theme') === 'light') return 'light';
    if (doc.classList.contains('dark') || doc.getAttribute('data-theme') === 'dark') return 'dark';
    return 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const doc = document.documentElement;
    const updateTheme = () => {
      if (doc.classList.contains('amoled') || doc.getAttribute('data-theme') === 'amoled') {
        setDocTheme('amoled');
      } else if (doc.classList.contains('light') || doc.getAttribute('data-theme') === 'light') {
        setDocTheme('light');
      } else if (doc.classList.contains('dark') || doc.getAttribute('data-theme') === 'dark') {
        setDocTheme('dark');
      }
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(doc, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    window.addEventListener('storage', updateTheme);
    window.addEventListener('livex:theme-changed', updateTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
      window.removeEventListener('livex:theme-changed', updateTheme);
    };
  }, []);

  const resolvedIsAmoled = useMemo(() => {
    if (docTheme === 'amoled') return true;
    if (docTheme === 'light') return false;
    if (typeof isAmoledProp === 'boolean') return isAmoledProp;
    return isAmoledMode;
  }, [docTheme, isAmoledProp, isAmoledMode]);

  const resolvedIsLight = useMemo(() => {
    if (docTheme === 'amoled') return false;
    if (docTheme === 'dark') return false;
    if (docTheme === 'light') return true;
    if (typeof isLightProp === 'boolean') return isLightProp;
    if (hubVisTheme === 'light') return true;
    if (hubVisTheme === 'system') {
      return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      );
    }
    if (hubVisTheme === 'dynamic') {
      const h = new Date().getHours();
      return h >= dynamicLightStart && h < dynamicLightEnd;
    }
    return false;
  }, [docTheme, isLightProp, hubVisTheme, dynamicLightStart, dynamicLightEnd]);

  // Local state for smooth dismiss morph
  const [isDismissing, setIsDismissing] = useState(false);

  // Normalized active updater state
  const normalizedState = useMemo<'available' | 'downloading' | 'installing' | 'error' | 'checking' | 'idle'>(() => {
    const s = state?.toLowerCase() || 'available';
    if (
      s === 'available' ||
      s === 'update_available' ||
      s === 'manual_apk_required' ||
      s === 'reinstall_warning'
    ) {
      return 'available';
    }
    if (
      s === 'downloading' ||
      s === 'fetch_apk_information' ||
      s === 'download_apk' ||
      s === 'enteringprogressscreen'
    ) {
      return 'downloading';
    }
    if (
      s === 'verifying' ||
      s === 'verifying_sha' ||
      s === 'verifying_eligibility' ||
      s === 'verify_sha256' ||
      s === 'preparing_install' ||
      s === 'installing' ||
      s === 'packageinstaller_visible' ||
      s === 'waiting_user_confirmation' ||
      s === 'waitingforuserinstallconfirmation' ||
      s === 'ready_to_install' ||
      s === 'readyforinstallprompt' ||
      s === 'completed' ||
      s === 'installed' ||
      s === 'install_success' ||
      s === 'installedorready' ||
      s === 'update_success'
    ) {
      return 'installing';
    }
    if (
      s === 'failed' ||
      s === 'install_failed' ||
      s === 'signature_mismatch' ||
      s === 'versioncode_low' ||
      s === 'recovery' ||
      s === 'permission_blocked'
    ) {
      return 'error';
    }
    if (s === 'checking' || s === 'initializing') {
      return 'checking';
    }
    if (s === 'idle' || s === 'no_update_available') {
      return 'idle';
    }
    return 'available';
  }, [state]);

  const isInstalling = normalizedState === 'installing' || progress >= 1.0;
  const isProgressState = normalizedState === 'downloading' || isInstalling;
  const canClose = ['available', 'idle', 'error'].includes(normalizedState);

  // Auto-dismiss compact popup when up to date
  useEffect(() => {
    if (normalizedState === 'idle') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 2200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [normalizedState]);

  // Close handlers
  const handleDismiss = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    setTimeout(() => {
      if (onLater) onLater();
      else if (onClose) onClose();
    }, 180);
  };

  const handleUpdate = () => {
    if (onUpdateNow) onUpdateNow();
  };

  const handleCancel = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    setTimeout(() => {
      if (onCancelDownload) onCancelDownload();
      else if (onClose) onClose();
    }, 180);
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canClose, isDismissing]);

  // Real measured sizes and progress
  const realTotalBytes = useMemo(() => {
    if (typeof totalBytes === 'number' && totalBytes > 0) return totalBytes;
    if (typeof apkSizeBytes === 'number' && apkSizeBytes > 0) return apkSizeBytes;
    return null;
  }, [totalBytes, apkSizeBytes]);

  const realDownloadedBytes = useMemo(() => {
    if (isInstalling && realTotalBytes !== null && realTotalBytes > 0) {
      return realTotalBytes;
    }
    if (typeof downloadedBytes === 'number' && downloadedBytes >= 0) {
      return downloadedBytes;
    }
    if (realTotalBytes !== null && typeof progress === 'number' && progress > 0) {
      const normalized = progress > 1 ? progress / 100 : progress;
      return Math.round(normalized * realTotalBytes);
    }
    return null;
  }, [downloadedBytes, realTotalBytes, progress, isInstalling]);

  const isCheckError =
    normalizedState === 'error' &&
    !isProgressState &&
    !downloadedBytes &&
    !realDownloadedBytes;
  const isFullUpdaterState = (normalizedState === 'available' || isProgressState) && !isCheckError;

  // Format Package Size (Measured)
  const formattedSize = useMemo(() => {
    if (realTotalBytes !== null && realTotalBytes > 0) {
      return `${(realTotalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return null;
  }, [realTotalBytes]);

  // Format Download Progress Numbers (0 to 100)
  const effectiveProgress = useMemo(() => {
    if (isInstalling) return 1.0;
    if (realDownloadedBytes !== null && realTotalBytes !== null && realTotalBytes > 0) {
      return Math.min(1.0, realDownloadedBytes / realTotalBytes);
    }
    if (typeof progress === 'number' && progress > 0) {
      return Math.min(1.0, progress > 1 ? progress / 100 : progress);
    }
    return 0;
  }, [isInstalling, realDownloadedBytes, realTotalBytes, progress]);

  const progressPercent = Math.min(100, Math.max(0, Math.round(effectiveProgress * 100)));

  const downloadedMB = useMemo(() => {
    if (realDownloadedBytes !== null && realDownloadedBytes >= 0) {
      return (realDownloadedBytes / (1024 * 1024)).toFixed(1);
    }
    return null;
  }, [realDownloadedBytes]);

  // Changelog parser extracting clean items
  const changelogItems = useMemo<string[]>(() => {
    const items: string[] = [];

    if (releaseNotes) {
      if (typeof releaseNotes === 'string') {
        const extracted = extractStructuredReleaseNotes(releaseNotes);
        const rn = extracted.releaseNotes;
        if (Array.isArray(rn.added)) {
          items.push(
            ...rn.added.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.improved)) {
          items.push(
            ...rn.improved.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.fixed)) {
          items.push(
            ...rn.fixed.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.changed)) {
          items.push(
            ...rn.changed.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (items.length === 0) {
          const lines = releaseNotes
            .split('\n')
            .map((l) =>
              sanitizeUTF8String(l)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
            .filter((l) => l.length > 0 && !l.startsWith('#'));
          items.push(...lines);
        }
      } else if (typeof releaseNotes === 'object' && !Array.isArray(releaseNotes)) {
        const rn = releaseNotes as StructuredReleaseNotes;
        if (Array.isArray(rn.added)) {
          items.push(
            ...rn.added.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.improved)) {
          items.push(
            ...rn.improved.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.fixed)) {
          items.push(
            ...rn.fixed.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
        if (Array.isArray(rn.changed)) {
          items.push(
            ...rn.changed.map((item) =>
              sanitizeUTF8String(item)
                .replace(/^[-*•]\s*/, '')
                .trim()
            )
          );
        }
      } else if (Array.isArray(releaseNotes)) {
        for (const raw of releaseNotes) {
          if (typeof raw !== 'string') continue;
          const clean = sanitizeUTF8String(raw)
            .replace(/^[-*•]\s*/, '')
            .trim();
          if (clean) items.push(clean);
        }
      }
    }

    if (items.length === 0) {
      return [
        'Lyrics: Use direct Kugou, QQ Music, and Genius sources',
        'Backup: Stream versioned ZIP archives',
        'Updater: Resume and verify APK downloads',
        'Player: Add sleep timer',
        'Resolver: Add cross-platform fallback chain',
      ];
    }

    return items;
  }, [releaseNotes]);

  // Design Tokens strictly matching Stitch Screen 1 & Screen 2
  const modalBg = resolvedIsLight
    ? 'bg-white'
    : resolvedIsAmoled
      ? 'bg-[#000000]'
      : 'bg-[#101011]';
  const modalBorder = resolvedIsLight
    ? 'border-black/[0.08]'
    : resolvedIsAmoled
      ? 'border-white/[0.14]'
      : 'border-white/[0.08]';
  const modalShadow = resolvedIsLight
    ? 'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)]'
    : resolvedIsAmoled
      ? 'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.95)]'
      : 'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.85)]';

  const panelBg = resolvedIsLight
    ? 'bg-[#f8fafc]'
    : resolvedIsAmoled
      ? 'bg-[#0a0a0c]'
      : 'bg-[#151517]';
  const panelBorder = resolvedIsLight
    ? 'border-black/[0.05]'
    : resolvedIsAmoled
      ? 'border-white/[0.08]'
      : 'border-white/[0.04]';

  const progressCardBg = resolvedIsLight
    ? 'bg-[#f8fafc]'
    : resolvedIsAmoled
      ? 'bg-[#0c0c0e]'
      : 'bg-[#171719]';
  const progressCardBorder = resolvedIsLight
    ? 'border-black/[0.06]'
    : resolvedIsAmoled
      ? 'border-[#1f1f23]'
      : 'border-[#232326]';
  const progressTrackBg = resolvedIsLight
    ? 'bg-[#e2e8f0]'
    : resolvedIsAmoled
      ? 'bg-[#19191d]'
      : 'bg-[#26272b]';

  const textPrimary = resolvedIsLight ? 'text-[#0f172a]' : 'text-white';
  const textMuted = resolvedIsLight ? 'text-[#64748b]' : 'text-[#8e8e93]';
  const textDim = resolvedIsLight ? 'text-[#7d7d82]' : 'text-[#7d7d82]';
  const textChangelog = resolvedIsLight ? 'text-[#475569]' : 'text-[#b3b3b8]';

  const currentPillBg = resolvedIsLight
    ? 'bg-[#e2e8f0] text-[#334155]'
    : resolvedIsAmoled
      ? 'bg-[#161618] text-[#dcdce0]'
      : 'bg-[#212124] text-[#dcdce0]';


  const laterBtnClass = resolvedIsLight
    ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] active:scale-[0.985] text-[#475569] hover:text-[#0f172a] border border-black/[0.05]'
    : resolvedIsAmoled
      ? 'bg-[#0c0c0e] hover:bg-[#161619] active:scale-[0.985] text-[#8e8e93] hover:text-[#b0b0b5] border border-white/[0.08]'
      : 'bg-[#18181b] hover:bg-[#202024] active:scale-[0.985] text-[#8e8e93] hover:text-[#b0b0b5] border border-white/[0.05]';

  const cancelBtnClass = resolvedIsLight
    ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] border border-[#cbd5e1] text-[#334155]'
    : resolvedIsAmoled
      ? 'bg-[#121214] hover:bg-[#1a1a1e] active:bg-[#0c0c0e] border border-[#26262b] text-[#dedee3]'
      : 'bg-[#1e1e21] hover:bg-[#26262a] active:bg-[#18181a] border border-[#2c2c30] text-[#dedee3]';

  const customStyles = useMemo(
    () => `
    .progress-bar-glow {
      box-shadow: 0 0 12px rgba(66, 142, 255, 0.35);
    }
    .custom-scroll::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scroll::-webkit-scrollbar-thumb {
      background: ${resolvedIsLight ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.14)'};
      border-radius: 9999px;
    }
  `,
    [resolvedIsLight]
  );

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white"
      style={{
        background: resolvedIsLight
          ? 'rgba(0, 0, 0, 0.35)'
          : resolvedIsAmoled
            ? 'rgba(0, 0, 0, 0.88)'
            : 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: isDismissing ? 0 : 1,
        transition: isDismissing ? 'opacity 180ms cubic-bezier(0.32, 0, 0.67, 0)' : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && canClose) {
          handleDismiss();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <style>{customStyles}</style>

      {/* Persistent Morphing Modal Container */}
      <motion.div
        layout={!prefersReduced}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{
          opacity: isDismissing ? 0 : 1,
          scale: isDismissing ? 0.96 : 1,
          y: isDismissing ? 10 : 0,
        }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : {
                duration: 0.22,
                ease: [0.16, 1, 0.3, 1],
                layout: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
              }
        }
        className={`relative w-full max-w-[390px] ${modalBg} border ${modalBorder} rounded-[34px] ${modalShadow} p-6 sm:p-7 flex flex-col text-left overflow-hidden`}
        data-purpose="dialog-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BEGIN: HeaderSection */}
        <motion.div layout={!prefersReduced} className={isFullUpdaterState ? "mb-6" : ""} data-purpose="modal-header">
          <div className="flex items-center justify-between gap-3">
            <h1
              className={`text-[25px] sm:text-[27px] font-bold tracking-tight ${textPrimary} leading-tight`}
              id="modal-title"
            >
              {isInstalling
                ? updaterTr?.installing || 'Installing...'
                : isProgressState
                  ? updaterTr?.downloadingUpdate || 'Downloading update'
                  : normalizedState === 'checking'
                    ? updaterTr?.checkingForUpdates || 'Checking for updates'
                    : normalizedState === 'idle'
                      ? updaterTr?.upToDate || 'Livex is up to date'
                      : isCheckError
                        ? 'Couldn\'t check for updates'
                        : customTitle || updaterTr?.studioUpdateAvailable || 'Update Available'}
            </h1>
            {normalizedState === 'idle' && (
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckIconSvg />
              </div>
            )}
          </div>
          <p className={`text-[14px] sm:text-[14.5px] ${textMuted} mt-1.5 font-normal leading-snug`}>
            {isInstalling
              ? 'Waiting for installer... Please wait... Do not close the application.'
              : isProgressState
                ? updaterTr?.downloadingPackage || 'Livex is downloading the latest app package.'
                : normalizedState === 'checking'
                  ? customDescription || updaterTr?.connectingToServer || 'Connecting to release server...'
                  : normalizedState === 'idle'
                    ? fromVersion
                      ? `You're running the latest version of Livex (${fromVersion.startsWith('v') ? fromVersion : `v${fromVersion}`}).`
                      : 'You’re running the latest version of Livex.'
                    : isCheckError
                      ? error || 'Unable to contact the update server. Please check your network connection.'
                      : customDescription || updaterTr?.newVersionReady || 'A new version of Livex is ready to install.'}
          </p>
        </motion.div>
        {/* END: HeaderSection */}

        {/* Indeterminate loading bar when checking for updates */}
        <AnimatePresence>
          {normalizedState === 'checking' && (
            <motion.div
              key="checking-indeterminate-bar"
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full h-1.5 ${progressTrackBg} rounded-full overflow-hidden relative mt-4`}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-[#4d94ff] to-[#5ea2ff] rounded-full progress-bar-glow"
                animate={
                  prefersReduced
                    ? { opacity: [0.4, 1, 0.4] }
                    : { x: ['-100%', '250%'] }
                }
                transition={
                  prefersReduced
                    ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 1.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }
                }
                style={{ width: '45%' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* BEGIN: VersionComparison (Only shown in full updater states) */}
        <AnimatePresence>
          {isFullUpdaterState && (
            <motion.div
              key="version-comparison-panel"
              layout={!prefersReduced}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`${panelBg} border ${panelBorder} rounded-2xl p-4 sm:px-5 sm:py-4 mb-6 flex items-center justify-between`}
              data-purpose="version-status-panel"
            >
              {/* Current Version */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[11.5px] font-medium ${textDim} tracking-wide`}>
                  Current Version
                </span>
                <div className={`w-full max-w-[124px] py-2 px-3 ${currentPillBg} text-[15px] font-semibold rounded-full text-center`}>
                  {fromVersion ? (fromVersion.startsWith('v') ? fromVersion : `v${fromVersion}`) : 'Current'}
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="pt-5 px-2 text-[#636366] flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 stroke-[1.8]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* New Version */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[11.5px] font-medium ${textDim} tracking-wide`}>
                  New Version
                </span>
                <div className="w-full max-w-[124px] py-2 px-3 bg-[#387ff5] hover:bg-[#347ff8] text-white text-[15px] font-bold rounded-full text-center shadow-sm transition-colors">
                  {toVersion ? (toVersion.startsWith('v') ? toVersion : `v${toVersion}`) : 'Latest'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* END: VersionComparison */}

        {/* BEGIN: ChangelogSection (Only shown in full updater states) */}
        <AnimatePresence>
          {isFullUpdaterState && (
            <motion.div
              key="changelog-whats-new"
              layout={!prefersReduced}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 sm:mb-7"
              data-purpose="whats-new-section"
            >
              <h2 className={`text-[17px] sm:text-[18px] font-bold ${textPrimary} mb-3 tracking-tight`}>
                {updaterTr?.whatsNew || "What's New"}
              </h2>
              <div className={`${panelBg} border ${panelBorder} rounded-2xl p-4 sm:p-5 max-h-[160px] sm:max-h-[175px] overflow-y-auto custom-scroll`}>
                {customChangelog ? (
                  customChangelog
                ) : (
                  <ul className={`space-y-2.5 text-[13.5px] ${textChangelog} leading-relaxed font-normal`}>
                    {changelogItems.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mt-[7px] mr-2.5 shrink-0"
                          style={{ backgroundColor: resolvedIsLight ? '#94a3b8' : '#8e8e93' }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* END: ChangelogSection */}

        {/* BEGIN: Morphing Bottom Action / Progress Section */}
        <motion.div layout={!prefersReduced} className="relative w-full" data-purpose="morphing-bottom-section">
          <AnimatePresence mode="wait" initial={false}>
            {isCheckError ? (
              /* State Check Error: Small Compact Failure Popup */
              <motion.div
                key="state-check-error"
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-2.5 mt-5 w-full"
                data-purpose="check-error-buttons"
              >
                <button
                  type="button"
                  onClick={onRetry || handleUpdate}
                  className="flex-1 h-[44px] bg-[#6ca0ff] hover:bg-[#5b94fd] active:scale-[0.985] text-[#001736] font-semibold text-[14.5px] rounded-full flex items-center justify-center transition-all duration-150 shadow-md"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className={`flex-1 h-[44px] ${laterBtnClass} font-medium text-[14.5px] rounded-full flex items-center justify-center transition-all duration-150`}
                >
                  Close
                </button>
              </motion.div>
            ) : normalizedState === 'error' ? (
              /* State Error: Interrupted State with Retry / Cancel */
              <motion.div
                key="state-error"
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3"
                data-purpose="error-container"
              >
                <div className={`${progressCardBg} border border-rose-500/20 rounded-2xl p-4 flex flex-col gap-1 text-left`}>
                  <span className="text-[15px] font-semibold text-rose-400 tracking-tight">
                    Update Interrupted
                  </span>
                  <p className="text-[12.5px] text-[#9999a0] leading-snug">
                    {error || 'An error occurred during update. Please check your network and retry.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onRetry || handleUpdate}
                    className="w-full h-[52px] bg-[#6ca0ff] hover:bg-[#5b94fd] active:scale-[0.985] text-[#001736] font-semibold text-[16px] rounded-full flex items-center justify-center transition-all duration-150 shadow-md"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className={`w-full h-[52px] ${laterBtnClass} font-medium text-[16px] rounded-full flex items-center justify-center transition-all duration-150`}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : normalizedState === 'checking' || normalizedState === 'idle' ? null : (
              /* State 1 (Available) & State 2 (Downloading) & State 4 (Installing) */
              /* Unified Coordinated Morphing Surface */
              <div key="state-unified-surface" className="flex flex-col gap-3 w-full" data-purpose="action-buttons-group">
                <div className="relative w-full flex items-center">
                  {/* Coordinated Cancel Button positioned on the LEFT in State 1 */}
                  <motion.button
                    data-purpose="later-button"
                    type="button"
                    onClick={handleDismiss}
                    initial={false}
                    animate={
                      isProgressState
                        ? { width: 0, opacity: 0, scale: 0.85, marginRight: 0, paddingLeft: 0, paddingRight: 0 }
                        : { width: 'auto', opacity: 1, scale: 1, marginRight: 12, paddingLeft: 22, paddingRight: 22 }
                    }
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }
                    }
                    style={{
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      pointerEvents: isProgressState ? 'none' : 'auto',
                    }}
                    className={`h-[52px] ${laterBtnClass} font-medium text-[15px] rounded-full flex items-center justify-center transition-colors shrink-0`}
                  >
                    {updaterTr?.cancel || 'Cancel'}
                  </motion.button>

                  {/* Morphing Primary Surface — transforms from Download & Install button to Centered Progress Card */}
                  <motion.div
                    layout={!prefersReduced}
                    data-purpose={isProgressState ? 'install-progress-card' : 'install-button'}
                    role={isProgressState ? 'region' : 'button'}
                    tabIndex={isProgressState ? undefined : 0}
                    onClick={isProgressState ? undefined : handleUpdate}
                    onKeyDown={
                      isProgressState
                        ? undefined
                        : (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleUpdate();
                            }
                          }
                    }
                    initial={false}
                    animate={{
                      height: isProgressState ? 88 : 52,
                      borderRadius: isProgressState ? 16 : 26,
                      backgroundColor: isProgressState
                        ? resolvedIsLight
                          ? '#f8fafc'
                          : resolvedIsAmoled
                            ? '#0c0c0e'
                            : '#171719'
                        : '#6ca0ff',
                      borderColor: isProgressState
                        ? resolvedIsLight
                          ? 'rgba(0, 0, 0, 0.06)'
                          : resolvedIsAmoled
                            ? '#1f1f23'
                            : '#232326'
                        : 'transparent',
                    }}
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }
                    }
                    className={`relative flex-1 flex flex-col justify-center overflow-hidden border transition-colors select-none ${
                      isProgressState
                        ? 'p-4 cursor-default'
                        : 'hover:bg-[#5b94fd] active:scale-[0.985] cursor-pointer items-center shadow-md'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {!isProgressState ? (
                        /* State 1: Download & Install Label */
                        <motion.span
                          key="label-download-install"
                          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="text-[16px] font-semibold text-[#001736] tracking-tight leading-none"
                        >
                          Download &amp; Install
                        </motion.span>
                      ) : (
                        /* State 2 & 4: Download / Installing Progress */
                        <motion.div
                          key="content-progress"
                          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.22, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full flex flex-col gap-2.5 text-left"
                        >
                          {/* Status & Percentage */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[15px] font-semibold ${textPrimary} tracking-tight`}>
                              {isInstalling
                                ? updaterTr?.installing || 'Installing...'
                                : updaterTr?.downloading || 'Downloading...'}
                            </span>
                            <span
                              className="text-[15px] font-semibold text-[#5ea2ff] tracking-tight tabular-nums"
                              role="status"
                              aria-live="polite"
                            >
                              {progressPercent}%
                            </span>
                          </div>

                          {/* Horizontal Progress Bar Track */}
                          <div
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={progressPercent}
                            className={`w-full h-2 ${progressTrackBg} rounded-full overflow-hidden relative`}
                            role="progressbar"
                          >
                            {/* Blue Active Progress Bar with GPU ScaleX */}
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#4d94ff] to-[#5ea2ff] rounded-full progress-bar-glow"
                              initial={false}
                              animate={{ scaleX: Math.max(0.01, progressPercent / 100) }}
                              style={{ width: '100%', transformOrigin: 'left' }}
                              transition={
                                prefersReduced
                                  ? { duration: 0 }
                                  : { duration: 0.2, ease: 'easeOut' }
                              }
                            />
                          </div>

                          {/* Transferred / Total Download Size */}
                          <div className={`flex items-center justify-between text-[12.5px] font-medium ${textDim} tabular-nums`}>
                            <span>
                              {downloadedMB && formattedSize
                                ? `${downloadedMB} / ${formattedSize}`
                                : downloadedMB
                                  ? `${downloadedMB} MB`
                                  : formattedSize
                                    ? formattedSize
                                    : ''}
                            </span>
                            {downloadSpeed && !isInstalling && (
                              <span className="text-[11.5px] opacity-80">{downloadSpeed}</span>
                            )}
                            {isInstalling && (
                              <span className="text-[11.5px] text-[#5ea2ff] font-medium">
                                Verifying package
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Cancel Action Button (Appears below progress card in State 2 & 4) */}
                <AnimatePresence>
                  {isProgressState && (
                    <motion.footer
                      key="footer-cancel"
                      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, height: 0, y: 6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0, y: 6 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full pt-1"
                    >
                      <button
                        className={`w-full h-[52px] py-3.5 px-6 rounded-full ${cancelBtnClass} font-medium text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                        data-purpose="cancel-action-button"
                        type="button"
                        onClick={handleCancel}
                      >
                        {updaterTr?.cancel || 'Cancel'}
                      </button>
                    </motion.footer>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
        {/* END: Morphing Bottom Action / Progress Section */}
      </motion.div>
    </div>
  );
});

export const StudioUpdateScreen = LivexUpdateScreen;
export default LivexUpdateScreen;
