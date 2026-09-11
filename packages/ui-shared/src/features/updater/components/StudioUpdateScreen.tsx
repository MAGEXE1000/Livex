import React, { useEffect, useState, useMemo, memo } from 'react';
import {
  APP_VERSION_LABEL,
  UpdaterFlightRecorder,
  type StructuredReleaseNotes,
  useT,
  sanitizeUTF8String,
  extractStructuredReleaseNotes,
} from '@workspace/studio-core';

export interface StudioUpdateScreenProps {
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

interface SubtleValueProps {
  value: React.ReactNode;
  className?: string;
}

const SubtleValue = memo(function SubtleValue({ value, className }: SubtleValueProps) {
  return (
    <span key={String(value)} className={`livex-subtle-value inline-block ${className || ''}`}>
      {value}
    </span>
  );
});

export default memo(function StudioUpdateScreen({
  state,
  progress = 0,
  accentFrom = '#679cff',
  accentTo = '#007aff',
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
  isLight = false,
  isAmoled = false,
  fromVersion = APP_VERSION_LABEL,
  toVersion,
  apkSizeBytes,
  downloadSpeed,
  etaSeconds,
  downloadedBytes,
  totalBytes,
  error,
  releaseNotes,
}: StudioUpdateScreenProps) {
  // Flight recorder telemetry
  useEffect(() => {
    UpdaterFlightRecorder.record({
      thread: 'ui',
      sessionId: null,
      workflowId: null,
      eventType: 'StudioUpdateScreenRender',
      caller: 'StudioUpdateScreen',
      reason: `Rendered StudioUpdateScreen state: ${state} (${Math.round(progress * 100)}%)`,
    });
  }, [state, progress]);

  const t = useT();
  const updaterTr = (t as any)?.updater;

  // Local state for smooth dismiss morph
  const [isDismissing, setIsDismissing] = useState(false);

  // Normalized active pane mapping
  const normalizedState = useMemo(() => {
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
      s === 'preparing_install'
    ) {
      return 'verifying';
    }
    if (
      s === 'installing' ||
      s === 'packageinstaller_visible' ||
      s === 'waiting_user_confirmation' ||
      s === 'waitingforuserinstallconfirmation' ||
      s === 'ready_to_install' ||
      s === 'readyforinstallprompt'
    ) {
      return 'installing';
    }
    if (
      s === 'completed' ||
      s === 'installed' ||
      s === 'install_success' ||
      s === 'installedorready' ||
      s === 'update_success'
    ) {
      return 'completed';
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

  // Disable modal dismissal during non-cancellable system installation steps
  const canClose = ['available', 'idle', 'completed', 'error'].includes(normalizedState);

  // Close handlers with 200ms morph animation
  const handleDismiss = () => {
    if (!canClose || isDismissing) return;
    setIsDismissing(true);
    setTimeout(() => {
      if (onLater) onLater();
      else if (onClose) onClose();
    }, 200);
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
    }, 200);
  };

  const handleDone = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    setTimeout(() => {
      if (onDone) onDone();
      else handleDismiss();
    }, 200);
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
    if (apkSizeBytes && typeof apkSizeBytes === 'number' && apkSizeBytes > 0) {
      return `${(apkSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (totalBytes && typeof totalBytes === 'number' && totalBytes > 0) {
      return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return '—';
  }, [apkSizeBytes, totalBytes]);

  // Format Download Progress Numbers
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const downloadedMB = useMemo(() => {
    if (downloadedBytes && typeof downloadedBytes === 'number' && downloadedBytes > 0) {
      return (downloadedBytes / (1024 * 1024)).toFixed(1);
    }
    return '—';
  }, [downloadedBytes]);

  // Transfer Speed Text
  const speedText = useMemo(() => {
    if (downloadSpeed) return downloadSpeed;
    return '—';
  }, [downloadSpeed]);

  // ETA Text
  const etaText = useMemo(() => {
    if (typeof etaSeconds === 'number' && etaSeconds >= 0) {
      return `ETA ~${etaSeconds}s`;
    }
    return '—';
  }, [etaSeconds]);

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
        'Direct Kugou, QQ Music & Genius sources',
        'Stream versioned ZIP archives',
        'Resume & verify APK downloads',
        'Audio engine sleep timer & fallbacks',
      ];
    }

    return items;
  }, [releaseNotes]);

  // CSS Styles faithfully matching the new design and animation guidelines
  const themeStyles = `
    /* Dialog & Backdrop Entrance Animations (220ms, ease-out decelerate) */
    @keyframes livex-backdrop-enter {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }

    @keyframes livex-dialog-enter {
      0% {
        opacity: 0;
        transform: scale(0.96) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .livex-backdrop-animate {
      animation: livex-backdrop-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .livex-dialog-animate {
      animation: livex-dialog-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* State Panes (200ms coherent state switch) */
    @keyframes livex-pane-enter {
      0% {
        opacity: 0;
        transform: translateY(6px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .state-pane.hidden-pane {
      display: none;
    }

    .state-pane.active-pane {
      display: flex;
      animation: livex-pane-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Success State Micro-Interactions (240ms subtle scale/opacity) */
    @keyframes livex-success-badge-enter {
      0% {
        opacity: 0;
        transform: scale(0.85);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes livex-success-icon-enter {
      0% {
        opacity: 0;
        transform: scale(0.8);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .livex-success-badge {
      animation: livex-success-badge-enter 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .livex-success-icon {
      animation: livex-success-icon-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) 40ms both;
    }

    /* Subtle Value Opacity Transition (150ms gentle breath) */
    @keyframes livex-subtle-fade {
      0% {
        opacity: 0.65;
      }
      100% {
        opacity: 1;
      }
    }

    .livex-subtle-value {
      animation: livex-subtle-fade 150ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Refined scrollbar */
    .custom-scroll::-webkit-scrollbar {
      width: 3px;
    }
    .custom-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scroll::-webkit-scrollbar-thumb {
      background: ${isLight ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.12)'};
      border-radius: 9999px;
    }

    @keyframes livex-scan-track {
      0% { transform: translateX(-120%); }
      50% { transform: translateX(20%); }
      100% { transform: translateX(180%); }
    }
    .livex-animate-scan {
      animation: livex-scan-track 1.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
    }

    /* Reduced Motion Overrides */
    @media (prefers-reduced-motion: reduce) {
      .livex-backdrop-animate,
      .livex-dialog-animate,
      .state-pane.active-pane,
      .livex-success-badge,
      .livex-success-icon,
      .livex-subtle-value {
        animation: none !important;
        transform: none !important;
        opacity: 1 !important;
      }
    }
  `;

  // Palette definitions matching provided design and Livex theme system
  const dialogBg = isLight ? 'bg-white' : isAmoled ? 'bg-[#000000]' : 'bg-[#161618]';
  const dialogBorder = isLight
    ? 'border-black/[0.08]'
    : isAmoled
      ? 'border-white/[0.12]'
      : 'border-white/[0.08]';
  const dialogShadow = isLight
    ? 'shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)]'
    : isAmoled
      ? 'shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)]'
      : 'shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]';
  const cardBg = isLight ? 'bg-slate-50' : isAmoled ? 'bg-[#000000]' : 'bg-[#1b1b1e]';
  const cardBorder = isLight
    ? 'border-black/[0.04]'
    : isAmoled
      ? 'border-white/[0.12]'
      : 'border-white/[0.04]';
  const pillBg = isLight ? 'bg-slate-100' : isAmoled ? 'bg-[#000000]' : 'bg-[#202024]';
  const pillBorder = isLight
    ? 'border-black/[0.06]'
    : isAmoled
      ? 'border-white/[0.12]'
      : 'border-white/[0.06]';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isLight ? 'text-slate-500' : 'text-neutral-400';
  const textTertiary = isLight ? 'text-slate-400' : 'text-neutral-500';
  const listText = isLight ? 'text-slate-700' : 'text-neutral-300';
  const progressTrack = isLight ? 'bg-slate-200' : isAmoled ? 'bg-white/[0.08]' : 'bg-neutral-800';
  const cancelBtn = isLight
    ? 'bg-black/[0.04] hover:bg-black/[0.08] active:scale-[0.98] text-slate-700 hover:text-slate-900 border-black/[0.06]'
    : isAmoled
      ? 'bg-[#000000] hover:bg-white/[0.08] active:scale-[0.98] text-neutral-200 hover:text-white border-white/[0.12]'
      : 'bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.98] text-neutral-300 hover:text-white border-white/[0.06]';
  const laterBtn = isLight
    ? 'bg-transparent hover:bg-black/[0.04] active:scale-[0.98] text-slate-500 hover:text-slate-700'
    : 'bg-transparent hover:bg-white/[0.04] active:scale-[0.98] text-neutral-400 hover:text-neutral-200';
  const defaultIconBox = isLight
    ? 'bg-black/[0.04] border border-black/[0.08] text-slate-900'
    : isAmoled
      ? 'bg-[#000000] border border-white/[0.12] text-white'
      : 'bg-white/[0.05] border border-white/[0.08] text-white/90';
  const disabledBtn = isLight
    ? 'bg-black/[0.04] text-slate-400 border border-black/[0.04]'
    : 'bg-white/[0.04] text-neutral-400 border border-white/[0.04]';

  // Dynamic accent bindings honoring user theme selection
  const activeAccent = accentTo || 'var(--accent-to, #007aff)';
  const activeAccentFrom = accentFrom || 'var(--accent-from, #679cff)';

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 selection:bg-[#007aff]/30 ${
        isDismissing ? '' : 'livex-backdrop-animate'
      }`}
      style={{
        background: isLight
          ? 'rgba(0, 0, 0, 0.35)'
          : isAmoled
            ? 'rgba(0, 0, 0, 0.85)'
            : 'rgba(8, 8, 10, 0.75)',
        backdropFilter: 'var(--surface-float-blur, blur(8px))',
        WebkitBackdropFilter: 'var(--surface-float-blur, blur(8px))',
        opacity: isDismissing ? 0 : undefined,
        transition: isDismissing ? 'opacity 200ms cubic-bezier(0.32, 0, 0.67, 0)' : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && canClose) {
          handleDismiss();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="updater-dialog-title"
    >
      <style>{themeStyles}</style>

      {/* Modal Container: Slim, Tall, Proportional Mobile Width (345px) */}
      <div className="w-full max-w-[345px] relative z-40 mx-auto" id="modal-container">
        <div
          className={`w-full ${dialogBg} rounded-[32px] border ${dialogBorder} ${dialogShadow} p-6 relative overflow-hidden ${
            isDismissing ? '' : 'livex-dialog-animate'
          }`}
          id="updater-dialog"
          style={{
            opacity: isDismissing ? 0 : undefined,
            transform: isDismissing ? 'scale(0.96) translateY(8px)' : undefined,
            transition: isDismissing
              ? 'opacity 200ms cubic-bezier(0.32, 0, 0.67, 0), transform 200ms cubic-bezier(0.32, 0, 0.67, 0)'
              : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ==================================================================== */}
          {/* PANE 1: UPDATE AVAILABLE                                             */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'available' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-available"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className={`w-11 h-11 rounded-2xl ${defaultIconBox} flex items-center justify-center shrink-0`}
              >
                <span className="material-symbols-outlined text-[21px]">arrow_downward</span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[20px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {customTitle || updaterTr?.studioUpdateAvailable || 'Update Available'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  {customDescription || updaterTr?.newVersionReady || 'A new version is ready'}
                </p>
              </div>
            </div>

            {/* Version Transition Pill */}
            <div
              className={`w-full ${pillBg} border ${pillBorder} rounded-full py-2 px-3.5 flex items-center justify-between mb-5`}
            >
              <span className={`text-[12px] font-mono ${textSecondary} font-medium`}>
                v{fromVersion}
              </span>
              <span className={`material-symbols-outlined text-[14px] ${textTertiary}`}>
                arrow_forward
              </span>
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${activeAccent} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${activeAccent} 30%, transparent)`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: activeAccent }}
                ></span>
                <span
                  className="text-[12px] font-mono font-semibold"
                  style={{ color: isLight ? activeAccent : '#adc6ff' }}
                >
                  v{toVersion || 'latest'}
                </span>
              </div>
            </div>

            {/* Changelog Section */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-[11px] font-manrope font-semibold tracking-wider ${textSecondary} uppercase`}
                >
                  {updaterTr?.whatsNew || "What's New"}
                </span>
                <span className={`text-[11px] font-mono ${textTertiary} font-medium`}>
                  {formattedSize}
                </span>
              </div>
              <div
                className={`${cardBg} border ${cardBorder} rounded-2xl p-4 custom-scroll max-h-[175px] overflow-y-auto`}
              >
                {customChangelog ? (
                  customChangelog
                ) : (
                  <ul
                    className={`space-y-2.5 text-[12.5px] ${listText} font-manrope leading-relaxed text-left`}
                  >
                    {changelogItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span
                          className="w-1 h-1 rounded-full mt-2 shrink-0"
                          style={{ background: activeAccent }}
                        ></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Actions (Clean Stacked) */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full h-11 active:scale-[0.98] text-white font-manrope font-semibold text-[13px] rounded-full flex items-center justify-center gap-2 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${activeAccentFrom}, ${activeAccent})`,
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-out',
                }}
                onClick={handleUpdate}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>{updaterTr?.updateNow || 'Update Now'}</span>
              </button>
              {!isRequired && (
                <button
                  type="button"
                  className={`w-full h-10 ${laterBtn} font-manrope font-medium text-[13px] rounded-full flex items-center justify-center`}
                  style={{
                    transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease-out',
                  }}
                  onClick={handleDismiss}
                >
                  {updaterTr?.later || 'Later'}
                </button>
              )}
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 2: DOWNLOADING                                                  */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'downloading' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-downloading"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: `color-mix(in srgb, ${activeAccent} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${activeAccent} 20%, transparent)`,
                  color: activeAccent,
                }}
              >
                <span className="material-symbols-outlined text-[21px] animate-pulse">
                  download
                </span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[19px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {updaterTr?.downloadingUpdate || 'Downloading update…'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  Package v{toVersion || 'latest'}
                </p>
              </div>
            </div>

            {/* Progress Card */}
            <div className={`${cardBg} border ${cardBorder} rounded-2xl p-4 mb-6 space-y-3.5`}>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className={`${textPrimary} font-medium`} id="dl-bytes-text">
                  <SubtleValue value={`${downloadedMB} / ${formattedSize}`} />
                </span>
                <span
                  className="font-semibold text-[13px]"
                  id="dl-percent-badge"
                  style={{ color: isLight ? activeAccent : '#adc6ff' }}
                >
                  <SubtleValue value={`${progressPercent}%`} />
                </span>
              </div>
              {/* Thin sleek progress bar (6px / h-1.5) with GPU compositor transform */}
              <div
                className={`w-full h-1.5 ${progressTrack} rounded-full overflow-hidden relative`}
                style={{ transform: 'translateZ(0)' }}
              >
                <div
                  className="w-full h-full rounded-full"
                  id="dl-progress-bar"
                  style={{
                    background: `linear-gradient(90deg, ${activeAccentFrom}, ${activeAccent})`,
                    transform: `translateX(-${100 - progressPercent}%)`,
                    transformOrigin: 'left',
                    transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                    willChange: 'transform',
                  }}
                ></div>
              </div>
              <div
                className={`flex items-center justify-between text-[11px] ${textSecondary} font-mono pt-0.5`}
              >
                <span id="dl-speed-text">
                  <SubtleValue value={speedText} />
                </span>
                <span id="dl-eta-text">
                  <SubtleValue value={etaText} />
                </span>
              </div>
            </div>

            {/* Single Cancel Pill Button */}
            <div className="pt-1">
              <button
                type="button"
                className={`w-full h-11 ${cancelBtn} font-manrope font-medium text-[13px] rounded-full border flex items-center justify-center gap-1.5`}
                style={{
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease-out',
                }}
                onClick={handleCancel}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>{updaterTr?.cancel || 'Cancel'}</span>
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 3: VERIFYING                                                    */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'verifying' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-verifying"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: `color-mix(in srgb, ${activeAccent} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${activeAccent} 20%, transparent)`,
                  color: activeAccent,
                }}
              >
                <span className="material-symbols-outlined text-[21px]">verified</span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[19px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {updaterTr?.verifyingUpdate || 'Verifying Package'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  Checking APK signature & integrity
                </p>
              </div>
            </div>

            {/* Verification Card */}
            <div className={`${cardBg} border ${cardBorder} rounded-2xl p-4 mb-6 space-y-3.5`}>
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className={`${textPrimary} font-medium`}>SHA-256 Checksum</span>
                <span
                  className="font-semibold text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    color: isLight ? activeAccent : '#adc6ff',
                    background: `color-mix(in srgb, ${activeAccent} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${activeAccent} 20%, transparent)`,
                  }}
                >
                  V2/V3 SIGN
                </span>
              </div>
              {/* Scanning beam */}
              <div
                className={`w-full h-1.5 ${progressTrack} rounded-full overflow-hidden relative`}
                style={{ transform: 'translateZ(0)' }}
              >
                <div
                  className="w-1/3 h-full rounded-full livex-animate-scan"
                  style={{ background: activeAccent }}
                ></div>
              </div>
              <div
                className={`flex items-center justify-between text-[11px] ${textSecondary} font-mono pt-0.5`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Bytecode hash verified</span>
                </span>
                <span className="text-emerald-400 font-semibold">PASS</span>
              </div>
            </div>

            {/* Staging Button (Disabled) */}
            <div className="pt-1">
              <button
                type="button"
                className={`w-full h-11 ${disabledBtn} font-manrope font-medium text-[13px] rounded-full cursor-wait flex items-center justify-center gap-2`}
                disabled
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: activeAccent }}
                ></span>
                <span>Finalizing APK staging…</span>
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 4: INSTALLING                                                   */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'installing' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-installing"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: `color-mix(in srgb, ${activeAccent} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${activeAccent} 20%, transparent)`,
                  color: activeAccent,
                }}
              >
                <span className="material-symbols-outlined text-[21px] animate-spin">sync</span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[19px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {updaterTr?.installing || 'Installing update…'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  Handing off to PackageInstaller
                </p>
              </div>
            </div>

            {/* Installing Card */}
            <div className={`${cardBg} border ${cardBorder} rounded-2xl p-4 mb-6 space-y-3.5`}>
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className={`${textPrimary} font-medium`}>PackageInstaller Session</span>
                <span
                  className="font-semibold text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    color: activeAccent,
                    background: `color-mix(in srgb, ${activeAccent} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${activeAccent} 20%, transparent)`,
                  }}
                >
                  ACTIVE
                </span>
              </div>
              {/* Scanning beam */}
              <div
                className={`w-full h-1.5 ${progressTrack} rounded-full overflow-hidden relative`}
                style={{ transform: 'translateZ(0)' }}
              >
                <div
                  className="w-1/3 h-full rounded-full livex-animate-scan"
                  style={{ background: activeAccent }}
                ></div>
              </div>
              <div
                className={`flex items-center justify-between text-[11px] ${textSecondary} font-manrope pt-0.5`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Confirm system prompt if displayed</span>
                </span>
              </div>
            </div>

            {/* Staging Button (Disabled) */}
            <div className="pt-1">
              <button
                type="button"
                className={`w-full h-11 ${disabledBtn} font-manrope font-medium text-[13px] rounded-full cursor-wait flex items-center justify-center gap-2`}
                disabled
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: activeAccent }}
                ></span>
                <span>Applying system update…</span>
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 5: COMPLETED                                                    */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'completed' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-completed"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 livex-success-badge">
                <span className="material-symbols-outlined text-[21px] livex-success-icon">check_circle</span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[19px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {updaterTr?.appUpdated || 'Update Complete'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  Studio is up to date
                </p>
              </div>
            </div>

            {/* Completed Card */}
            <div
              className={`${cardBg} border ${cardBorder} rounded-2xl p-4 mb-6 space-y-2 text-left`}
            >
              <p className={`text-[12.5px] ${textPrimary} font-medium`}>
                Version v{toVersion || fromVersion} staged successfully
              </p>
              <p className={`text-[12px] ${textSecondary} leading-relaxed`}>
                All binaries, WebAssembly modules, and assets have been verified and applied.
              </p>
            </div>

            {/* Action Done */}
            <div className="pt-1">
              <button
                type="button"
                className="w-full h-11 active:scale-[0.98] text-white font-manrope font-semibold text-[13px] rounded-full flex items-center justify-center gap-2 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${activeAccentFrom}, ${activeAccent})`,
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-out',
                }}
                onClick={handleDone}
              >
                <span>{updaterTr?.done || 'Done'}</span>
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 6: ERROR                                                        */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'error' ? 'active-pane' : 'hidden-pane'
            }`}
            id="pane-error"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <span className="material-symbols-outlined text-[21px]">warning</span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[19px] ${textPrimary} tracking-tight leading-tight`}
                >
                  Update Failed
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  Could not complete update
                </p>
              </div>
            </div>

            {/* Error Description Card */}
            <div
              className={`${cardBg} border ${cardBorder} rounded-2xl p-4 mb-6 text-left space-y-1.5`}
            >
              <p className={`text-[12.5px] ${textPrimary} font-medium`}>Installation interrupted</p>
              <p className={`text-[12px] ${textSecondary} leading-relaxed`}>
                {error ||
                  'Studio encountered an issue while downloading or verifying the package. Please check your connection and retry.'}
              </p>
            </div>

            {/* Stacked Actions: Retry (Primary) / Cancel (Secondary) */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full h-11 active:scale-[0.98] text-white font-manrope font-semibold text-[13px] rounded-full flex items-center justify-center gap-2 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${activeAccentFrom}, ${activeAccent})`,
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-out',
                }}
                onClick={onRetry || handleUpdate}
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>{updaterTr?.retry || 'Retry'}</span>
              </button>
              <button
                type="button"
                className={`w-full h-10 ${laterBtn} font-manrope font-medium text-[13px] rounded-full flex items-center justify-center`}
                style={{
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease-out',
                }}
                onClick={handleDismiss}
              >
                {updaterTr?.cancel || 'Cancel'}
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* PANE 7: IDLE / CHECKING                                              */}
          {/* ==================================================================== */}
          <div
            className={`state-pane flex-col ${
              normalizedState === 'checking' || normalizedState === 'idle'
                ? 'active-pane'
                : 'hidden-pane'
            }`}
            id="pane-idle"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className={`w-11 h-11 rounded-2xl ${defaultIconBox} flex items-center justify-center shrink-0`}
              >
                <span
                  className={`material-symbols-outlined text-[21px] ${
                    normalizedState === 'checking' ? 'animate-spin' : ''
                  }`}
                  style={{ color: normalizedState === 'checking' ? activeAccent : undefined }}
                >
                  {normalizedState === 'checking' ? 'sync' : 'check_circle'}
                </span>
              </div>
              <div className="min-w-0 text-left">
                <h3
                  className={`font-manrope font-bold text-[20px] ${textPrimary} tracking-tight leading-tight`}
                >
                  {normalizedState === 'checking'
                    ? updaterTr?.checkingForUpdates || 'Checking for updates…'
                    : updaterTr?.upToDate || 'Studio is up to date'}
                </h3>
                <p className={`text-[13px] ${textSecondary} font-normal leading-normal mt-0.5`}>
                  {normalizedState === 'checking'
                    ? 'Connecting to release server…'
                    : `Current version v${fromVersion}`}
                </p>
              </div>
            </div>

            {/* Action Close */}
            <div className="pt-2">
              <button
                type="button"
                className={`w-full h-11 ${cancelBtn} font-manrope font-medium text-[13px] rounded-full border flex items-center justify-center`}
                style={{
                  transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease-out',
                }}
                onClick={handleDismiss}
              >
                {updaterTr?.done || 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
