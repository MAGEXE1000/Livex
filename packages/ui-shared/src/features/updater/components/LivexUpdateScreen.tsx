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
  }, [state, progress]);

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

  // Format Package Size
  const formattedSize = useMemo(() => {
    const total =
      (typeof totalBytes === 'number' && totalBytes > 0 ? totalBytes : null) ??
      (typeof apkSizeBytes === 'number' && apkSizeBytes > 0 ? apkSizeBytes : null);
    if (total) {
      return `${(total / (1024 * 1024)).toFixed(1)} MB`;
    }
    return '77.4 MB';
  }, [apkSizeBytes, totalBytes]);

  // Format Download Progress Numbers (0 to 100)
  const effectiveProgress = useMemo(() => {
    if (typeof progress === 'number' && progress > 0) return progress;
    const total =
      (typeof totalBytes === 'number' && totalBytes > 0 ? totalBytes : null) ??
      (typeof apkSizeBytes === 'number' && apkSizeBytes > 0 ? apkSizeBytes : null);
    if (typeof downloadedBytes === 'number' && downloadedBytes > 0 && total && total > 0) {
      return downloadedBytes / total;
    }
    return 0;
  }, [progress, downloadedBytes, totalBytes, apkSizeBytes]);

  const progressPercent = Math.min(100, Math.max(0, Math.round(effectiveProgress * 100)));

  const downloadedMB = useMemo(() => {
    if (isInstalling) {
      return formattedSize.replace(' MB', '');
    }
    const total =
      (typeof totalBytes === 'number' && totalBytes > 0 ? totalBytes : null) ??
      (typeof apkSizeBytes === 'number' && apkSizeBytes > 0 ? apkSizeBytes : null);
    const bytes =
      typeof downloadedBytes === 'number' && downloadedBytes > 0
        ? downloadedBytes
        : total && progress > 0
          ? progress * total
          : null;
    if (bytes !== null && bytes >= 0) {
      return (bytes / (1024 * 1024)).toFixed(1);
    }
    return '0.0';
  }, [downloadedBytes, totalBytes, apkSizeBytes, progress, isInstalling, formattedSize]);

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

  const closeBtnBg = resolvedIsLight
    ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]'
    : resolvedIsAmoled
      ? 'bg-[#141416] hover:bg-[#202023] text-[#8e8e93] hover:text-white border border-white/[0.08]'
      : 'bg-[#1e1e21] hover:bg-[#28282c] text-[#8e8e93] hover:text-white';

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

  const customStyles = `
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
  `;

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
        {/* Close Button (Persistent top-right) */}
        <button
          aria-label="Close dialog"
          className={`absolute top-6 right-6 w-9 h-9 rounded-full ${closeBtnBg} transition-colors flex items-center justify-center focus:outline-none z-10`}
          data-purpose="close-dialog-btn"
          type="button"
          onClick={isProgressState ? handleCancel : handleDismiss}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>

        {/* BEGIN: HeaderSection (Persistent) */}
        <motion.div layout={!prefersReduced} className="pr-8 mb-6" data-purpose="modal-header">
          <h1
            className={`text-[26px] sm:text-[27px] font-bold tracking-tight ${textPrimary} leading-tight`}
            id="modal-title"
          >
            {customTitle || updaterTr?.studioUpdateAvailable || 'Update Available'}
          </h1>
          <p className={`text-[14.5px] sm:text-[15px] ${textMuted} mt-1.5 font-normal leading-snug`}>
            {customDescription || updaterTr?.newVersionReady || 'A new version of Livex is ready to install.'}
          </p>
        </motion.div>
        {/* END: HeaderSection */}

        {/* BEGIN: VersionComparison (Persistent) */}
        <motion.div
          layout={!prefersReduced}
          className={`${panelBg} border ${panelBorder} rounded-2xl p-4 sm:px-5 sm:py-4 mb-6 flex items-center justify-between`}
          data-purpose="version-status-panel"
        >
          {/* Current Version */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className={`text-[11.5px] font-medium ${textDim} tracking-wide`}>
              Current Version
            </span>
            <div className={`w-full max-w-[124px] py-2 px-3 ${currentPillBg} text-[15px] font-semibold rounded-full text-center`}>
              v{fromVersion}
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
              v{toVersion || '4.9.5'}
            </div>
          </div>
        </motion.div>
        {/* END: VersionComparison */}

        {/* BEGIN: ChangelogSection (Persistent) */}
        <motion.div layout={!prefersReduced} className="mb-6 sm:mb-7" data-purpose="whats-new-section">
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
        {/* END: ChangelogSection */}

        {/* BEGIN: Morphing Bottom Action / Progress Section */}
        <motion.div layout={!prefersReduced} className="relative w-full" data-purpose="morphing-bottom-section">
          <AnimatePresence mode="wait" initial={false}>
            {isProgressState ? (
              /* State 2: DOWNLOADING & INSTALLING (Stitch Screen 2) */
              <motion.div
                key="state-progress"
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3"
                data-purpose="install-progress-container"
              >
                {/* DownloadProgressSection (Exact Stitch Screen 2 Card) */}
                <section
                  className={`${progressCardBg} border ${progressCardBorder} rounded-2xl p-4 flex flex-col gap-2.5 text-left`}
                  data-purpose="install-progress-card"
                >
                  {/* Status & Percentage */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] font-semibold ${textPrimary} tracking-tight`}>
                      {isInstalling ? 'Installing...' : 'Downloading...'}
                    </span>
                    <span className="text-[15px] font-semibold text-[#5ea2ff] tracking-tight">
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
                    {/* Blue Active Progress Bar */}
                    <div
                      className="h-full bg-gradient-to-r from-[#4d94ff] to-[#5ea2ff] rounded-full progress-bar-glow transition-all duration-200 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Transferred / Total Download Size */}
                  <div className={`text-[12.5px] font-medium ${textDim}`}>
                    {downloadedMB} / {formattedSize}
                  </div>
                </section>

                {/* Cancel Action Button (Exact Stitch Screen 2 Footer Button) */}
                <footer className="pt-1">
                  <button
                    className={`w-full h-[52px] py-3.5 px-6 rounded-full ${cancelBtnClass} font-medium text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    data-purpose="cancel-action-button"
                    type="button"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </footer>
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
            ) : normalizedState === 'checking' || normalizedState === 'idle' ? (
              /* State Idle/Checking */
              <motion.div
                key="state-idle"
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3"
              >
                <div className={`${progressCardBg} border ${progressCardBorder} rounded-2xl p-4 flex items-center justify-between text-left`}>
                  <span className={`text-[15px] font-semibold ${textPrimary} tracking-tight`}>
                    {normalizedState === 'checking'
                      ? updaterTr?.checkingForUpdates || 'Checking for updates…'
                      : updaterTr?.upToDate || 'Livex is up to date'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className={`w-full h-[52px] ${cancelBtnClass} font-medium text-[15px] rounded-full transition-colors`}
                >
                  {updaterTr?.done || 'Close'}
                </button>
              </motion.div>
            ) : (
              /* State 1: UPDATE AVAILABLE / DOWNLOAD (Stitch Screen 1) */
              <motion.div
                key="state-available"
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3"
                data-purpose="action-buttons-group"
              >
                {/* Download & Install Button (Stitch Screen 1) */}
                <button
                  className="w-full h-[52px] bg-[#6ca0ff] hover:bg-[#5b94fd] active:scale-[0.985] text-[#001736] font-semibold text-[16px] rounded-full flex items-center justify-center transition-all duration-150 shadow-md"
                  data-purpose="install-button"
                  type="button"
                  onClick={handleUpdate}
                >
                  Download &amp; Install
                </button>

                {/* Later Button (Stitch Screen 1) */}
                {!isRequired && (
                  <button
                    className={`w-full h-[52px] ${laterBtnClass} font-medium text-[16px] rounded-full flex items-center justify-center transition-all duration-150`}
                    data-purpose="later-button"
                    type="button"
                    onClick={handleDismiss}
                  >
                    Later
                  </button>
                )}
              </motion.div>
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
