import { Dialog } from '../../../shared/design-system/dialogs';
import { Capacitor } from '@capacitor/core';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import {
  useAppUpdate,
  type StructuredReleaseNotes,
  updateDiagnostics,
  updateDebugLogs,
  APP_VERSION_LABEL,
  compareSemver,
  normalizeSemver,
  applyUpdate,
  fadeToBlackAndReload,
  useChordStore,
  isAppInstallerAvailable,
  AppInstaller,
  UpdaterFlightRecorder,
  useSettingsStore,
  DurationPresets,
  EasingPresets,
  SpringPresets,
  extractStructuredReleaseNotes,
  sanitizeUTF8String,
  useT,
} from '@workspace/studio-core';
import {
  applyUpdateDirect,
  shareDownloadedApk,
  getDiagnosticsReport,
  recordUpToDatePopup,
  recordCloseEvent,
  logTimelineEvent,
  clearInstallationJustCompleted,
  endPostInstallSession,
} from '@workspace/studio-core';
/**
 * Floating "update available" indicator — top of the Hub.
 *
 * Two-phase behaviour:
 *  1. BANNER — when an update is first detected, a wide pill drops in
 *     from the top of the screen, CENTERED horizontally, announcing
 *     "Version X.Y.Z available" with a minimize button. Stays for
 *     ~6 seconds (or until the user taps minimize), then…
 *  2. PILL — smoothly morphs into a small circular badge that travels
 *     to the top-right corner. Tapping the pill re-opens the modal.
 *     The pill STAYS VISIBLE FOREVER until the user actually updates
 *     (or a newer remote version replaces this one). "Later" only
 *     suppresses the auto-opening of the modal — it does NOT hide
 *     the pill, so the user always has a one-tap path back.
 *
 * Theme integration:
 *   The indicator pulls its accent from the Studio-wide theme variables
 *   `--accent-from` / `--accent-to` set on <html> by App.tsx. Whatever
 *   accent color the user picked in Studio settings (blue, purple, etc.)
 *   automatically tints the banner / pill / modal. The `accentFrom`
 *   and `accentTo` props are kept as fallbacks for the rare boot frame
 *   where the CSS vars haven't been written yet.
 *
 * Skip-version semantics:
 *   The Updater detector always reports the LATEST remote version. A user
 *   on 3.0.21 with 3.0.24 published will be offered 3.0.24 directly —
 *   they never have to walk through 3.0.22 / 3.0.23. The Updater bundle
 *   download is also a single shot to the newest manifest.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import StudioSpinner from '../../../shared/animata/progress/spinner';
import AnimatedActionButton from '../../../shared/animata/container/animated-border-trail';
import StudioUpdateScreen from './StudioUpdateScreen';

import ChangelogSheet from '../../chordex/components/ChangelogSheet';
import { DownloadIcon } from '../../../shared/icons/DownloadIcon';
import { Progress } from '@base-ui/react/progress';

import { enableLiquidGlass, tagLiquidTarget, untagLiquidTarget } from '@workspace/studio-core';

const isUpdateInProgress = (state: string) => {
  const isSim = false;
  return [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ].includes(state);
};

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

function GithubIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SpinnerSvg({
  cFrom,
  cTo,
  size = 14,
  strokeWidth = 3.2,
}: {
  cFrom: string;
  cTo: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      style={{
        animation: 'lg-spin-spinner 1s linear infinite',
        flexShrink: 0,
      }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="url(#lg-spinner-grad-indicator)"
        strokeWidth={strokeWidth}
      />
      <defs>
        <linearGradient id="lg-spinner-grad-indicator" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={cFrom} />
          <stop offset="100%" stopColor={cTo} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** How long the full banner stays visible before auto-minimizing. */
const BANNER_AUTO_MINIMIZE_MS = 6000;

/** Session flag so the banner shows at most once per page session. */
const BANNER_SHOWN_KEY = 'studio:updateBannerShown';

/**
 * localStorage key recording the latest version for which the user
 * tapped "Later". This SUPPRESSES the auto-open of the modal so we
 * stop nagging — but the corner pill remains visible so they can tap
 * it whenever they decide they're ready. A NEWER remote version
 * resets this and the modal auto-opens once again.
 */
const LATER_VERSION_KEY = 'studio:laterUpdateVersion';

/** sessionStorage key recording the latest version for which we have
 *  already auto-opened the update modal IN THIS SESSION. */
const AUTO_OPENED_VERSION_KEY = 'studio:autoOpenedUpdateVersion';

/** Legacy key from before "Later" stopped hiding the pill. We wipe
 *  it on mount so old installs aren't stuck with a hidden indicator. */
const LEGACY_DISMISSED_KEY = 'studio:dismissedUpdateVersion';

function readAutoOpenedVersion(): string | null {
  try {
    const raw = sessionStorage.getItem(AUTO_OPENED_VERSION_KEY);
    if (!raw || normalizeSemver(raw) === null) return null;
    return raw;
  } catch {
    return null;
  }
}
function writeAutoOpenedVersion(v: string): void {
  try {
    sessionStorage.setItem(AUTO_OPENED_VERSION_KEY, v);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(AUTO_OPENED_VERSION_KEY);
  } catch {
    /* ignore */
  }
}

function readLaterVersion(): string | null {
  try {
    const raw = sessionStorage.getItem(LATER_VERSION_KEY);
    if (!raw || normalizeSemver(raw) === null) return null;
    return raw;
  } catch {
    return null;
  }
}
function writeLaterVersion(v: string): void {
  try {
    sessionStorage.setItem(LATER_VERSION_KEY, v);
  } catch {
    /* quota / privacy */
  }
}
function clearLegacyDismissed(): void {
  try {
    localStorage.removeItem(LEGACY_DISMISSED_KEY);
    localStorage.removeItem(LATER_VERSION_KEY); // Also clean up any stale legacy persisted storage entry
  } catch {
    /* ignore */
  }
}

type Phase = 'banner' | 'pill';

function readInitialPhase(): Phase {
  return 'banner';
}

function markBannerShown(): void {
  try {
    sessionStorage.setItem(BANNER_SHOWN_KEY, '1');
  } catch {
    /* private mode / quota — silently ignore */
  }
}

function getSavedReleaseNotesAsSections(): any[] | undefined {
  try {
    const saved = localStorage.getItem('studio:last_installed_release_notes');
    if (saved) {
      const rn = JSON.parse(saved);
      if (Array.isArray(rn)) {
        return [{ heading: "What's New", items: rn }];
      }
      if (typeof rn === 'object' && rn !== null) {
        const sections: any[] = [];
        if (rn.added && rn.added.length > 0) {
          sections.push({ heading: 'Added', items: rn.added });
        }
        if (rn.improved && rn.improved.length > 0) {
          sections.push({ heading: 'Improved', items: rn.improved });
        }
        if (rn.fixed && rn.fixed.length > 0) {
          sections.push({ heading: 'Fixed', items: rn.fixed });
        }
        if (rn.changed && rn.changed.length > 0) {
          sections.push({ heading: 'Changed', items: rn.changed });
        }
        return sections.length > 0 ? sections : undefined;
      }
      if (typeof rn === 'string') {
        const extracted = extractStructuredReleaseNotes(rn);
        const sections: any[] = [];
        if (extracted.releaseNotes.added?.length)
          sections.push({ heading: 'Added', items: extracted.releaseNotes.added });
        if (extracted.releaseNotes.improved?.length)
          sections.push({ heading: 'Improved', items: extracted.releaseNotes.improved });
        if (extracted.releaseNotes.fixed?.length)
          sections.push({ heading: 'Fixed', items: extracted.releaseNotes.fixed });
        if (extracted.releaseNotes.changed?.length)
          sections.push({ heading: 'Changed', items: extracted.releaseNotes.changed });
        return sections.length > 0 ? sections : undefined;
      }
    }
  } catch (_) {}
  return undefined;
}

export default function UpdateIndicator({
  accentFrom,
  accentTo,
}: {
  /** Boot-frame fallback only — actual color comes from --accent-from. */
  accentFrom: string;
  /** Boot-frame fallback only — actual color comes from --accent-to. */
  accentTo: string;
}) {
  const updater = useAppUpdate();

  // Record render of UpdateIndicator during active install states
  const installStates = [
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ];
  if (installStates.includes(updater.updateState)) {
    UpdaterFlightRecorder.record({
      thread: 'ui',
      sessionId: null,
      workflowId: null,
      eventType: 'UpdateIndicatorRender',
      caller: 'UpdateIndicator',
      reason: `Rendered UpdateIndicator in state: ${updater.updateState} with progress: ${Math.round(updater.progress * 100)}%`,
    });
  }

  const [phase, setPhase] = useState<Phase>(readInitialPhase);
  const [open, setOpen] = useState(() => isUpdateInProgress(updater.updateState));
  const [installFailedReason, setInstallFailedReason] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [laterVersion, setLaterVersion] = useState<string | null>(readLaterVersion);

  const checkRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLButtonElement | null>(null);
  const t = useT();
  const updaterTr = (t as any)?.updater;

  const hubVisTheme = useSettingsStore(
    (s) => s.settings.perApp?.hub?.theme ?? s.settings.theme ?? 'dark'
  );
  const dynamicLightStart = useSettingsStore((s) => s.settings.dynamicLightStart ?? 7);
  const dynamicLightEnd = useSettingsStore((s) => s.settings.dynamicLightEnd ?? 20);
  const isLight = (() => {
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
  })();

  const [successNotificationVersion, setSuccessNotificationVersion] = useState<string | null>(null);
  const [showChangelogSheet, setShowChangelogSheet] = useState(false);

  useEffect(() => {
    clearLegacyDismissed();
    if (typeof (window as any).logDiagnosticEvent === 'function') {
      (window as any).logDiagnosticEvent('UPDATE_UI_MOUNTED');
    }

    if (typeof window !== 'undefined') {
      (window as any).__triggerStudioUpdatedToast = (ver: string) => {
        setSuccessNotificationVersion(ver);
      };
    }

    if (true && isAppInstallerAvailable()) {
      (async () => {
        try {
          const { AppInstaller } = await import('@workspace/studio-core');
          const result = await AppInstaller['getLastInstallResult']();
          if (result.statusCode === 0) {
            const expectedVerName = result.expectedVersionName;
            const currentAppVer = APP_VERSION_LABEL;
            if (expectedVerName && expectedVerName === currentAppVer) {
              const lastShownDone = localStorage.getItem('studio:lastShownDoneVersion');
              if (lastShownDone !== currentAppVer) {
                setShowChangelogSheet(true);
                localStorage.setItem('studio:lastShownDoneVersion', currentAppVer);
                updater.dismissUpdate();
              }
            }
          }
        } catch (e) {}
      })();
    }

    return () => {
      if (typeof (window as any).logDiagnosticEvent === 'function') {
        (window as any).logDiagnosticEvent('UPDATE_UI_UNMOUNTED');
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__studioVisibleModal = open ? 'UpdateModal' : 'none';
    }
    if (open) {
      try {
        logTimelineEvent('UI', 'SHOW_INSTALL_SCREEN', 'Update modal opened');
      } catch (_) {}
    } else {
      try {
        recordCloseEvent('Update modal closed');
      } catch (_) {}
    }
  }, [open]);

  useEffect(() => {
    if (isUpdateInProgress(updater.updateState)) {
      setOpen(true);
    }
  }, [updater.updateState]);

  useEffect(() => {
    if (updater.validApkExists && updater.remoteVersion) {
      if (updater.shouldShowRecoveryReminder(updater.remoteVersion)) {
        setOpen(true);
      } else {
      }
    }
  }, [updater.validApkExists, updater.remoteVersion]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    if (updater.isModalOpen) {
      setOpen(true);
    }
  }, [updater.isModalOpen]);

  useEffect(() => {
    const isFailed = updater.updateState === 'INSTALL_FAILED' || updater.updateState === 'RECOVERY';
    if (isFailed && updater.error) {
      setInstallFailedReason(updater.error);
    }
  }, [updater.updateState, updater.error]);

  // Auto-open update modal immediately when update is available, unless dismissed/later'ed.
  useEffect(() => {
    console.log('[UPDATER-RUNTIME-PROOF]', {
      localVersion: APP_VERSION_LABEL,
      remoteVersion: updater.remoteVersion,
      updateAvailable: updater.updateAvailable,
      updateState: updater.updateState,
      openState: open,
      wasLater: readLaterVersion() === updater.remoteVersion,
      wasAutoOpened: readAutoOpenedVersion() === updater.remoteVersion,
      timestamp: new Date().toISOString(),
    });

    if (updater.updateAvailable && updater.remoteVersion) {
      const wasLater = readLaterVersion() === updater.remoteVersion;
      if (!wasLater) {
        writeAutoOpenedVersion(updater.remoteVersion);
        setOpen(true);
      }
    }
  }, [updater.updateAvailable, updater.remoteVersion]);

  // WEB-ONLY: track whether the user dismissed the web refresh banner this session
  const [webBannerDismissed, setWebBannerDismissed] = useState(() => {
    if (Capacitor.isNativePlatform()) return false;
    try {
      const dismissed = sessionStorage.getItem('studio:web-update-dismissed');
      return dismissed === updater.remoteVersion;
    } catch {
      return false;
    }
  });

  // CHECK-STATUS PILL ─────────────────────────────────────────────────
  // When there's NO update available we still want the user to see that
  // the app actually checked. Phases:
  //   'checking'  — spinner + "Checking…" while updater.loading is true
  //   'ok'        — green check + "Up to date" for ~1.6 s
  //   'fading'    — spins 360° while shrinking + fading away (~700 ms)
  //   'gone'      — unmounted
  // If an update IS available, this whole branch is skipped and the
  // existing banner/pill flow takes over.
  const [checkPhase, setCheckPhase] = useState<'checking' | 'ok' | 'fading' | 'gone'>('checking');
  useEffect(() => {
    if (updater.updateAvailable) {
      setCheckPhase('gone');
      return;
    }
    if (updater.loading) {
      setCheckPhase('checking');
      return;
    }
    setCheckPhase('ok');
    try {
      const isAuto = !updateDebugLogs.triggerComponent?.toLowerCase().includes('manual');
      recordUpToDatePopup('checkPhase transitioned to ok', isAuto);
    } catch (_) {}
    const tFade = window.setTimeout(() => setCheckPhase('fading'), 1600);
    const tGone = window.setTimeout(() => setCheckPhase('gone'), 1600 + 920);
    return () => {
      window.clearTimeout(tFade);
      window.clearTimeout(tGone);
    };
  }, [updater.loading, updater.updateAvailable]);

  // Tag "Up to date" check indicator with Liquid Glass
  useEffect(() => {
    const el = checkRef.current;
    if (!el) return;
    enableLiquidGlass();
    tagLiquidTarget(el);
    return () => {
      untagLiquidTarget(el);
    };
  }, [checkPhase]);

  // Tag "Update available" indicator with Liquid Glass
  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    enableLiquidGlass();
    tagLiquidTarget(el);
    return () => {
      untagLiquidTarget(el);
    };
  }, [phase, updater.updateAvailable]);

  if (!updater.updateAvailable) {
    if (!open) return null;
    // Only show the full update modal on native
    if (!Capacitor.isNativePlatform()) return null;
    return (
      <UpdateModal
        fromLabel={APP_VERSION_LABEL}
        toVersion={updater.remoteVersion ?? '—'}
        mandatory={updater.mandatory}
        downloadUrl={updater.downloadUrl}
        accentFrom={`var(--accent-from, ${accentFrom})`}
        accentTo={`var(--accent-to, ${accentTo})`}
        onLater={() => setOpen(false)}
        onClose={() => {
          setOpen(false);
        }}
        installFailedReason={installFailedReason}
        setInstallFailedReason={setInstallFailedReason}
      />
    );
  }

  /* ── WEB-ONLY: slim non-blocking refresh banner ─────────────────────── */
  if (!Capacitor.isNativePlatform()) {
    if (webBannerDismissed) return null;
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            height: 40,
            background: `linear-gradient(135deg, var(--accent-from, ${accentFrom}), var(--accent-to, ${accentTo}))`,
            color: '#fff',
            fontFamily: 'var(--studio-font-body)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            animation: 'web-refresh-bar-enter 400ms cubic-bezier(0.34, 1.12, 0.64, 1) both',
          }}
        >
          <AnimatedIcon name="system_update" size={16} color="currentColor" />
          <span>
            {updater.remoteVersion
              ? `Studio v${updater.remoteVersion} available`
              : 'New version available'}
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.22)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              backdropFilter: 'blur(6px)',
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              setWebBannerDismissed(true);
              try {
                if (updater.remoteVersion) {
                  sessionStorage.setItem('studio:web-update-dismissed', updater.remoteVersion);
                }
              } catch {
                /* ignore */
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <AnimatedIcon name="close" size={16} color="currentColor" />
          </button>
        </div>
        <style>{`
          @keyframes web-refresh-bar-enter {
            from { transform: translateY(-100%); opacity: 0; }
            to   { transform: translateY(0);     opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  const minimize = () => {
    setPhase('pill');
    markBannerShown();
  };

  const handleLater = () => {
    // Stop auto-opening the modal for this version, but KEEP the
    // pill visible in the corner so the user always has a one-tap
    // path back to update.
    setOpen(false);
    if (updater.remoteVersion) {
      writeLaterVersion(updater.remoteVersion);
      setLaterVersion(updater.remoteVersion);
      updater.recordDismissal(updater.remoteVersion);
      try {
        const key = 'studio:dismissedVersions';
        const val = localStorage.getItem(key);
        const list = val ? JSON.parse(val) : [];
        if (!list.includes(updater.remoteVersion)) {
          list.push(updater.remoteVersion);
          localStorage.setItem(key, JSON.stringify(list));
        }
      } catch (err) {}
    }
    setPhase('pill');
    markBannerShown();
  };

  const isBanner = phase === 'banner';

  // Use theme CSS vars when available (Studio user-chosen accent),
  // fall back to the props during the brief boot frame before App.tsx
  // has written them. Wrapping in `var(--name, fallback)` makes the
  // swap atomic and cross-fades correctly when the user changes their
  // accent in Studio settings.
  const cFrom = `var(--accent-from, ${accentFrom})`;
  const cTo = `var(--accent-to, ${accentTo})`;
  // For tinted backgrounds we need an alpha-mixed version. color-mix
  // is supported on every Android Chrome WebView ≥ 111 (we ship Updater
  // on a far newer baseline) so we can mix the live CSS var directly.
  const tint = (pct: number) => `color-mix(in srgb, ${cTo} ${pct}%, transparent)`;
  const tintFrom = (pct: number) => `color-mix(in srgb, ${cFrom} ${pct}%, transparent)`;

  const amoledBg = isLight ? 'rgba(255, 255, 255, 0.40)' : 'rgba(26, 26, 30, 0.72)';
  const fallbackBorder = isLight
    ? '1px solid rgba(0, 0, 0, 0.08)'
    : '1px solid rgba(255, 255, 255, 0.28)';
  const fallbackShadow = isBanner
    ? isLight
      ? '0 16px 40px rgba(0, 0, 0, 0.12), inset 0 1.5px 0 rgba(255, 255, 255, 0.70)'
      : '0 16px 40px rgba(0, 0, 0, 0.40), inset 0 1.5px 0 rgba(255, 255, 255, 0.08)'
    : isLight
      ? '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1.5px 0 rgba(255, 255, 255, 0.70)'
      : '0 12px 48px rgba(0, 0, 0, 0.50), inset 0 1.5px 0 rgba(255, 255, 255, 0.08)';

  if (!open) {
    return (
      <>
        {/* Lightweight boot-up update success toast */}
        <AnimatePresence>
          {successNotificationVersion && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={SpringPresets.medium}
              style={{
                position: 'fixed',
                top: 'calc(env(safe-area-inset-top) + 16px)',
                left: '50%',
                x: '-50%',
                zIndex: 99999,
                width: 'min(360px, calc(100vw - 32px))',
                background: isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(20, 20, 25, 0.85)',
                border: isLight
                  ? '1px solid rgba(0, 0, 0, 0.08)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '12px 16px',
                boxSizing: 'border-box',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isLight ? '0 12px 32px rgba(0,0,0,0.08)' : '0 12px 32px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckIconSvg />
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 800,
                    fontSize: 13,
                    color: 'var(--c-text-primary)',
                  }}
                >
                  {updaterTr?.appUpdated || 'Studio updated'}
                </span>
                <span
                  style={{ fontFamily: 'Inter', fontSize: 11, color: 'var(--c-text-secondary)' }}
                >
                  Version v{successNotificationVersion} installed successfully
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowChangelogSheet(true);
                  localStorage.setItem('studio:lastShownDoneVersion', APP_VERSION_LABEL);
                  setSuccessNotificationVersion(null);
                  updater.dismissUpdate();
                }}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: `var(--accent-from, ${accentFrom})`,
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                {updaterTr?.whatsNew || 'View changelog'}
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('studio:lastShownDoneVersion', APP_VERSION_LABEL);
                  setSuccessNotificationVersion(null);
                  updater.dismissUpdate();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--c-text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AnimatedIcon name="close" size={16} color="currentColor" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ChangelogSheet
          open={showChangelogSheet}
          onClose={() => {
            setShowChangelogSheet(false);
            try {
              localStorage.removeItem('studio:last_installed_release_notes');
            } catch (_) {}
          }}
          version={successNotificationVersion || APP_VERSION_LABEL}
          sections={getSavedReleaseNotesAsSections()}
        />
      </>
    );
  }

  // Only show the full update modal on native
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <>
      <UpdateModal
        fromLabel={APP_VERSION_LABEL}
        toVersion={updater.remoteVersion ?? '—'}
        mandatory={updater.mandatory}
        downloadUrl={updater.downloadUrl}
        accentFrom={cFrom}
        accentTo={cTo}
        onLater={handleLater}
        onClose={() => {
          setOpen(false);
          if (phase === 'banner') {
            setPhase('pill');
            markBannerShown();
          }
          if (updater.remoteVersion) {
            updater.recordDismissal(updater.remoteVersion);
          }
        }}
        installFailedReason={installFailedReason}
        setInstallFailedReason={setInstallFailedReason}
      />

      <style>{`
        @keyframes pill-pulse {
          0%, 100% { box-shadow: 0 4px 14px ${tint(19)}; }
          50%      { box-shadow: 0 4px 14px ${tint(19)}, 0 0 0 6px ${tint(12)}; }
        }
        @keyframes pill-download-bounce {
          0%   { transform: translateY(-3px); opacity: 0.55; }
          45%  { transform: translateY(2px);  opacity: 1; }
          60%  { transform: translateY(2px);  opacity: 1; }
          100% { transform: translateY(-3px); opacity: 0.55; }
        }
        @keyframes lg-spin-spinner {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lg-indeterminate-progress {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </>
  );
}

function ActionButton({
  style,
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled || prefersReduced ? undefined : { scale: 0.96 }}
      whileHover={disabled || !canHover || prefersReduced ? undefined : { scale: 1.015 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: DurationPresets.fast, ease: EasingPresets.decelerate }
      }
      style={{
        ...style,
        outline: 'none',
        border: style?.border || 'none',
        transition:
          'opacity 200ms ease, background-color 200ms ease, border-color 200ms ease, transform 200ms ease',
      }}
    >
      {children}
    </motion.button>
  );
}

const DownloadProgressIndicator = React.memo(
  ({ updater, toVersion, accentFrom, accentTo, isLight }: any) => {
    const rawProgress = typeof updater.progress === 'number' ? updater.progress : 0;
    const pct = Math.min(100, Math.max(0, Math.round(rawProgress * 100)));

    let statusText = 'Downloading update';
    const s = updater.updateState;
    if (s === 'VERIFY_SHA256') {
      statusText = 'Verifying checksum';
    } else if (s === 'PREPARING_INSTALL') {
      statusText = 'Preparing installation';
    } else if (
      s === 'INSTALLING' ||
      s === 'PACKAGEINSTALLER_VISIBLE' ||
      s === 'WAITING_USER_CONFIRMATION'
    ) {
      statusText = 'Installing update';
    } else if (s === 'INSTALL_SUCCESS') {
      statusText = 'Update complete';
    }

    return (
      <Progress.Root
        value={pct}
        max={100}
        style={{
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--studio-font-body)',
            color: isLight ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <span>{statusText}</span>
          <span>{pct}%</span>
        </div>

        <Progress.Track
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Progress.Indicator
            style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${accentFrom || '#679cff'}, ${accentTo || '#007aff'})`,
              transition: 'width 120ms ease-out',
              borderRadius: 3,
            }}
          />
        </Progress.Track>
      </Progress.Root>
    );
  },
  (prev: any, next: any) => {
    return (
      prev.updater.progress === next.updater.progress &&
      prev.updater.updateState === next.updater.updateState &&
      prev.isLight === next.isLight
    );
  }
);

function UpdateModal({
  fromLabel,
  toVersion,
  mandatory,
  downloadUrl,
  accentFrom,
  accentTo,
  onClose,
  onLater,
  installFailedReason,
  setInstallFailedReason,
}: {
  fromLabel: string;
  toVersion: string;
  mandatory: boolean;
  downloadUrl: string | null;
  accentFrom: string;
  accentTo: string;
  onClose: () => void;
  onLater: () => void;
  installFailedReason: string | null;
  setInstallFailedReason: (v: string | null) => void;
}) {
  const updater = useAppUpdate();

  // ── Real-time download speed calculation (sliding window) ──
  const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([]);
  const [computedSpeed, setComputedSpeed] = useState<string | null>(null);
  const [computedEta, setComputedEta] = useState<number | null>(null);

  useEffect(() => {
    const bytes = updater.downloadedBytes;
    const total = updater.totalBytes;
    if (typeof bytes !== 'number' || bytes <= 0) return;

    const now = Date.now();
    const samples = speedSamplesRef.current;
    samples.push({ time: now, bytes });

    // Keep a 3-second sliding window
    const windowMs = 3000;
    while (samples.length > 1 && now - samples[0].time > windowMs) {
      samples.shift();
    }

    if (samples.length >= 2) {
      const oldest = samples[0];
      const newest = samples[samples.length - 1];
      const dtSec = (newest.time - oldest.time) / 1000;
      if (dtSec > 0.1) {
        const bytesPerSec = (newest.bytes - oldest.bytes) / dtSec;
        const mbps = bytesPerSec / (1024 * 1024);
        setComputedSpeed(`${mbps.toFixed(1)} MB/s`);

        if (typeof total === 'number' && total > 0 && bytesPerSec > 0) {
          const remaining = total - newest.bytes;
          setComputedEta(Math.max(1, Math.round(remaining / bytesPerSec)));
        }
      }
    }
  }, [updater.downloadedBytes, updater.totalBytes]);

  // Reset speed samples when download is not active
  useEffect(() => {
    if (updater.updateState !== 'DOWNLOAD_APK') {
      speedSamplesRef.current = [];
      setComputedSpeed(null);
      setComputedEta(null);
    }
  }, [updater.updateState]);
  const t = useT();
  const updaterTr = (t as any)?.updater;
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleOpenGitHub = () => {
    window.open('https://github.com/MAGEXE1000/Livex/releases', '_system');
  };

  const hubVisTheme = useSettingsStore(
    (s) => s.settings.perApp?.hub?.theme ?? s.settings.theme ?? 'dark'
  );
  const isAmoledMode = useSettingsStore(
    (s) => Boolean(s.settings.amoledMode || s.settings.perApp?.hub?.amoledMode)
  );
  const dynamicLightStart = useSettingsStore((s) => s.settings.dynamicLightStart ?? 7);
  const dynamicLightEnd = useSettingsStore((s) => s.settings.dynamicLightEnd ?? 20);
  const isLight = (() => {
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
  })();
  const isAmoled = !isLight && isAmoledMode;

  const [interpolatedProgress, setInterpolatedProgress] = useState(0);

  useEffect(() => {
    let target = 0;
    const s = updater.updateState;
    if (s === 'FETCH_APK_INFORMATION') {
      target = 0.05;
    } else if (s === 'DOWNLOAD_APK') {
      target = 0.05 + updater.progress * 0.8;
    } else if (s === 'VERIFY_SHA256') {
      target = 0.88;
    } else if (s === 'PREPARING_INSTALL') {
      target = 0.92;
    } else if (s === 'WAITING_USER_CONFIRMATION' || s === 'PACKAGEINSTALLER_VISIBLE') {
      target = 0.96;
    } else if (s === 'INSTALLING') {
      target = 0.98;
    } else if (s === 'INSTALL_SUCCESS') {
      target = 1.0;
    }

    let animationFrameId: number;
    const step = () => {
      setInterpolatedProgress((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.002) {
          return target;
        }
        const next = prev + diff * 0.12;
        animationFrameId = requestAnimationFrame(step);
        return next;
      });
    };
    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [updater.progress, updater.updateState]);

  const pct = Math.round(interpolatedProgress * 100);
  const isNearCompletion = pct >= 95;

  useEffect(() => {
    const isCompleted = updater.updateState === 'INSTALL_SUCCESS';
    if (!isCompleted) return;
    // The success screen stays visible until one of:
    // 1. Android kills this process and relaunches the new version
    // 2. The user taps the "Done" button (which calls endPostInstallSession)
    // 3. The 5-minute safety timeout in stateMachine.ts expires
    //
    // We do NOT auto-close, dismiss, or exit. The post-install session in
    // stateMachine.ts blocks ALL automatic update checks, lifecycle triggers,
    // and state resets. This eliminates the premature "Studio is up to date"
    // message that occurred when the old process was still alive after APK
    // installation.
  }, [updater.updateState, updater]);

  const getDiagnosticsText = () => {
    return [
      '=== STUDIO UPDATE DIAGNOSTICS ===',
      `Failure Timestamp: ${updateDiagnostics.timestamp || 'N/A'}`,
      `Device Model/Manufacturer: ${updateDiagnostics.deviceModel || 'N/A'}`,
      `Android Version: ${updateDiagnostics.androidVersion || 'N/A'}`,
      `Permission State: ${updateDiagnostics.permissionState || 'N/A'}`,
      `Exception Message: ${updateDiagnostics.exceptionMessage || 'N/A'}`,
      `Failure Reason & Stack Trace:`,
      updateDiagnostics.failureReason || 'N/A',
      `Download URL Used: ${updateDiagnostics.downloadUrl || 'N/A'}`,
      `APK Path: ${updateDiagnostics.apkPath || 'N/A'}`,
      `File Size: ${updateDiagnostics.fileSize || 'N/A'}`,
      `SHA-256 Expected: ${updateDiagnostics.shaExpected || 'N/A'}`,
      `SHA-256 Calculated: ${updateDiagnostics.shaCalculated || 'N/A'}`,
      `Installer Result: ${updateDiagnostics.installerResult || 'N/A'}`,
      '',
      '=== COMPREHENSIVE DEBUG LOGS ===',
      `App Version (APP_VERSION): ${updateDebugLogs.appVersion}`,
      `APK Version (Wrapper): ${updateDebugLogs.nativeApkVersion || 'N/A'}`,
      `Update System: APK only`,
      `Updater System: disabled`,
      `AppInstaller Available: ${updateDebugLogs.appInstallerAvailable}`,
      `downloadApk Available: ${updateDebugLogs.downloadApkAvailable}`,
      `verifyApkSha256 Available: ${updateDebugLogs.verifyApkSha256Available}`,
      `installApk Available: ${updateDebugLogs.installApkAvailable}`,
      `openInstallPermissionSettings Available: ${updateDebugLogs.openInstallPermissionSettingsAvailable}`,
      `Registered Capacitor Plugins: ${updateDebugLogs.registeredPlugins}`,
      `Plugin Method Check: ${updateDebugLogs.pluginMethodCheck}`,
      `Fetched version.json: ${updateDebugLogs.fetchedVersionJson || 'N/A'}`,
      `Fetched app-release.json: ${updateDebugLogs.fetchedAppReleaseJson || 'N/A'}`,
      `Update Type: ${updateDebugLogs.updateType || 'N/A'}`,
      `Download Status: ${updateDebugLogs.downloadStatus || 'N/A'}`,
      `SHA Verification Status: ${updateDebugLogs.shaVerification || 'N/A'}`,
      `File Details: ${updateDebugLogs.fileDetails || 'N/A'}`,
      `Install Error / Log: ${updateDebugLogs.installError || 'N/A'}`,
      `Installer Launch Status: ${updateDebugLogs.installerLaunchStatus || 'N/A'}`,
      `Last Exception Stack Trace:`,
      updateDebugLogs.lastExceptionStackTrace || 'N/A',
      '',
      '=== ELIGIBILITY DETAILS ===',
      `Installed package: ${updateDebugLogs.installedPackageName || 'N/A'}`,
      `Installed versionName: ${updateDebugLogs.installedVersionName || 'N/A'}`,
      `Installed versionCode: ${updateDebugLogs.installedVersionCode || 'N/A'}`,
      `Installed signing SHA-256: ${updateDebugLogs.installedSigningSha256 || 'N/A'}`,
      `Installed debuggable: ${updateDebugLogs.installedDebuggable !== null ? updateDebugLogs.installedDebuggable : 'N/A'}`,
      '',
      `Downloaded package: ${updateDebugLogs.downloadedPackageName || 'N/A'}`,
      `Downloaded versionName: ${updateDebugLogs.downloadedVersionName || 'N/A'}`,
      `Downloaded versionCode: ${updateDebugLogs.downloadedVersionCode || 'N/A'}`,
      `Downloaded signing SHA-256: ${updateDebugLogs.downloadedSigningSha256 || 'N/A'}`,
      `Downloaded debuggable: ${updateDebugLogs.downloadedDebuggable !== null ? updateDebugLogs.downloadedDebuggable : 'N/A'}`,
      `Downloaded isValidApk: ${updateDebugLogs.downloadedIsValidApk !== null ? updateDebugLogs.downloadedIsValidApk : 'N/A'}`,
      `Downloaded isUniversalApk: ${updateDebugLogs.downloadedIsUniversalApk !== null ? updateDebugLogs.downloadedIsUniversalApk : 'N/A'}`,
      `Downloaded size: ${updateDebugLogs.downloadedApkSize || 'N/A'}`,
      '',
      `Eligibility package match: ${updateDebugLogs.eligibilityPackageNameMatch !== null ? updateDebugLogs.eligibilityPackageNameMatch : 'N/A'}`,
      `Eligibility signing match: ${updateDebugLogs.eligibilitySigningMatch !== null ? updateDebugLogs.eligibilitySigningMatch : 'N/A'}`,
      `Eligibility versionCode higher: ${updateDebugLogs.eligibilityVersionCodeHigher !== null ? updateDebugLogs.eligibilityVersionCodeHigher : 'N/A'}`,
      `Eligibility release build: ${updateDebugLogs.eligibilityReleaseBuild !== null ? updateDebugLogs.eligibilityReleaseBuild : 'N/A'}`,
      `Eligibility valid APK: ${updateDebugLogs.eligibilityValidApk !== null ? updateDebugLogs.eligibilityValidApk : 'N/A'}`,
      `Eligibility final install: ${updateDebugLogs.eligibilityFinalInstall || 'N/A'}`,
      `Eligibility reason: ${updateDebugLogs.eligibilityReason || 'N/A'}`,
    ].join('\n');
  };

  const isApkFlow = updater.updateType === 'apk' || updater.updateType === 'both';

  // Signature purple/pink colors override
  const purpleFrom = '#b57bee';
  const purpleTo = '#db2777';

  const handleStartUpdate = async () => {
    try {
      if (true && isAppInstallerAvailable()) {
        const { AppInstaller } = await import('@workspace/studio-core');
        await AppInstaller.clearInstallerLogHistory();
      }
      await updater.downloadUpdate('UpdateIndicator: UpdateModal');
      await updater.applyUpdate('UpdateIndicator: UpdateModal');
    } catch (err) {
      console.error('[UpdateIndicator] Start update failed:', err);
    }
  };

  const handleInstallApk = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { AppInstaller, updateActiveSession } = await import('@workspace/studio-core');
        const hasPerm = (await AppInstaller.canRequestPackageInstalls()).value;
        if (!hasPerm) {
          setPermissionBlocked(true);
          updateActiveSession({ installStep: 'permission_settings' });
          await AppInstaller.openUnknownAppSourcesSettings();
          return;
        }
      }

      // Attempt to launch installer
      await updater.applyUpdate('UpdateIndicator: UpdateModal');
    } catch (err) {
      console.error('[UpdateIndicator] APK Install failed:', err);
    }
  };

  const handleOpenSettings = async () => {
    try {
      const { AppInstaller, updateActiveSession } = await import('@workspace/studio-core');
      updateActiveSession({ installStep: 'permission_settings' });
      await AppInstaller.openUnknownAppSourcesSettings();
    } catch (err) {
      console.error('[UpdateIndicator] Failed to open settings:', err);
    }
  };

  useEffect(() => {
    if (!permissionBlocked) return;
    let active = true;
    let nativeListener: { remove: () => Promise<void> } | undefined;

    const checkPerm = async () => {
      try {
        const { AppInstaller } = await import('@workspace/studio-core');
        const hasPerm = (await AppInstaller.canRequestPackageInstalls()).value;
        if (hasPerm && active) {
          setPermissionBlocked(false);
          await updater.applyUpdate('UpdateIndicator: UpdateModal');
        }
      } catch (err) {}
    };

    import('@capacitor/app')
      .then(async ({ App }) => {
        if (!active) return;
        nativeListener = await App.addListener('appStateChange', (s) => {
          if (s.isActive) checkPerm();
        });
      })
      .catch(() => {});

    window.addEventListener('focus', checkPerm);
    return () => {
      active = false;
      window.removeEventListener('focus', checkPerm);
      nativeListener?.remove().catch(() => {});
    };
  }, [permissionBlocked, updater]);

  // Select Icon and Colors based on State
  let iconName = 'download';
  let iconColor = purpleFrom;
  let title = updaterTr?.studioUpdateAvailable || 'Update available';
  let description: React.ReactNode = '';
  const showProgress = isUpdateInProgress(updater.updateState);
  const progressVal = updater.progress;
  let showButtons = true;
  let showSpinner = false;

  const displayState = (() => {
    const s = updater.updateState;
    if (
      s === 'INITIALIZING' ||
      s === 'FETCH_REMOTE_METADATA' ||
      s === 'VALIDATE_METADATA' ||
      s === 'COMPARE_VERSION'
    )
      return 'checking';
    if (s === 'NO_UPDATE_AVAILABLE' || s === 'IDLE') return 'idle';
    if (s === 'UPDATE_AVAILABLE') return 'update_available';
    if (s === 'FETCH_APK_INFORMATION' || s === 'DOWNLOAD_APK') return 'downloading';
    if (s === 'VERIFY_SHA256') return 'verifying_sha';
    if (s === 'PREPARING_INSTALL') return 'verifying_eligibility';
    if (s === 'WAITING_USER_CONFIRMATION') return 'ready_to_install';
    if (s === 'PACKAGEINSTALLER_VISIBLE') return 'packageinstaller_visible';
    if (s === 'INSTALLING') return 'installing';
    if (s === 'INSTALL_SUCCESS') {
      const isSim = false;
      return isSim ? 'completed' : 'installing';
    }
    if (s === 'INSTALL_CANCELLED') return 'cancelled';
    if (s === 'INSTALL_FAILED') return 'failed';
    if (s === 'RECOVERY') {
      if (
        updater.error?.includes('Signature mismatch') ||
        updater.error?.includes('Conflicting Package')
      )
        return 'signature_mismatch';
      if (updater.error?.includes('versionCode_low')) return 'versionCode_low';
      return 'failed';
    }
    return s;
  })();

  let state = installFailedReason
    ? 'install_failed'
    : permissionBlocked
      ? 'permission_blocked'
      : displayState;
  if (state === 'update_available') {
    if (updater.reinstallRequired) {
      state = 'reinstall_warning';
    } else if (updater.apkUpdateRequired && !isAppInstallerAvailable()) {
      state = 'manual_apk_required';
    } else {
      state = 'available';
    }
  } else if (state === 'waiting_for_confirmation') {
    state = 'waitingForUserInstallConfirmation';
  } else if (displayState === 'ready_to_install') {
    state = 'readyForInstallPrompt';
  } else if (displayState === 'completed') {
    state = 'installedOrReady';
  } else if (displayState === 'idle') {
    if (updater.error) {
      if (
        updater.error.includes('Signature mismatch') ||
        updater.error.includes('Conflicting Package')
      ) {
        state = 'signature_mismatch';
      } else if (updater.error.includes('versionCode_low')) {
        state = 'versionCode_low';
      } else {
        state = 'failed';
      }
    } else {
      state = 'idle';
    }
  }

  switch (state) {
    case 'reinstall_warning':
      iconName = 'warning';
      iconColor = '#f59e0b';
      title = 'Manual reinstall required';
      description = (
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          This update requires a manual reinstall. Android security policy prevents automatic
          upgrades when cryptographic keys change. Please uninstall the current app, then install
          the new version.
        </p>
      );
      break;

    case 'permission_blocked':
      iconName = 'security';
      iconColor = '#eab308';
      title = 'Automatic installation blocked';
      description =
        "Please enable the 'Install unknown apps' permission for Studio in system settings to install the update.";
      break;

    case 'checking':
      iconName = 'sync';
      iconColor = purpleFrom;
      showSpinner = true;
      title = updaterTr?.checkingForUpdates || 'Checking for updates';
      description = updaterTr?.connectingToServer || 'Connecting to release server...';
      showButtons = false;
      break;

    case 'idle':
      iconName = 'check_circle';
      iconColor = '#22c55e';
      title = updaterTr?.upToDate || 'Studio is up to date';
      description = updaterTr?.latestVersion || 'You’re running the latest version of Studio.';
      break;

    case 'available':
      iconName = 'system_update';
      iconColor = purpleFrom;
      title = updaterTr?.studioUpdateAvailable || 'Studio update available';
      description = updaterTr?.newVersionReady || 'A new version of Studio is ready to install.';
      break;

    case 'manual_apk_required':
      iconName = 'download_for_offline';
      iconColor = '#eab308';
      title = 'Manual update required';
      description =
        'This version of Studio cannot install updates automatically. Please download and install Studio manually once. Future updates will install automatically.';
      break;

    case 'preparing':
      iconName = 'sync';
      iconColor = purpleFrom;
      showSpinner = true;
      title = 'Preparing update';
      description = 'Initializing update system...';
      showButtons = false;
      break;

    case 'enteringProgressScreen':
      iconName = 'sync';
      iconColor = purpleFrom;
      showSpinner = true;
      title = 'Starting update';
      description = 'Transitioning to progress screen...';
      showButtons = false;
      break;

    case 'downloading':
      iconName = 'cloud_download';
      iconColor = purpleFrom;
      title = updaterTr?.downloadingUpdate || 'Downloading update';
      description =
        updaterTr?.downloadingPackage || 'Studio is downloading the latest app package.';
      showButtons = false;
      showSpinner = true;
      break;

    case 'verifying_sha':
    case 'verifying_eligibility':
    case 'verifying':
      iconName = 'verified_user';
      iconColor = purpleFrom;
      title = updaterTr?.verifyingUpdate || 'Verifying update';
      description =
        updater.statusText || 'Studio is checking the update package before installation.';
      showSpinner = true;
      showButtons = false;
      break;

    case 'readyForInstallPrompt':
      iconName = 'task_alt';
      iconColor = '#22c55e';
      title = updaterTr?.readyToInstall || 'Ready to install';
      description =
        'The update package is verified. Android will now ask you to confirm the installation.';
      break;

    case 'waitingForUserInstallConfirmation':
      iconName = 'security';
      iconColor = '#eab308';
      title = 'Installation pending';
      description = 'Please follow system prompts to complete installation.';
      showSpinner = true;
      break;

    case 'packageinstaller_visible':
    case 'installing':
      iconName = 'sync';
      iconColor = purpleFrom;
      showSpinner = true;
      const isSuccess = updater.updateState === 'INSTALL_SUCCESS';
      title = isSuccess
        ? updaterTr?.finalizing || 'Finalizing...'
        : updaterTr?.installing || 'Installing...';
      description = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <div>
            {isSuccess
              ? updaterTr?.finalizing || 'Finalizing installation...'
              : updater.statusText || updaterTr?.installing || 'Android is installing the update.'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>
            Please wait... Do not close the application.
          </div>
        </div>
      );
      showButtons = false;
      break;

    case 'installedOrReady':
    case 'installed':
    case 'update_success':
    case 'completed':
      iconName = 'check_circle';
      iconColor = '#22c55e';
      title = updaterTr?.appUpdated || 'App updated';
      description = updaterTr?.appUpdatedDesc || 'Your application has been successfully updated.';
      showButtons = false;
      showSpinner = false;
      break;

    case 'install_failed':
      iconName = 'error';
      iconColor = '#f87171';
      title = updaterTr?.installFailed || 'Installation Failed';
      description = installFailedReason || 'The installation could not be launched.';
      showButtons = false;
      showSpinner = false;
      break;

    case 'signature_mismatch':
      iconName = 'warning';
      iconColor = '#f87171';
      title = 'Signature Mismatch Detected';
      description = (
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          The downloaded update package signature does not match the installed app's signature.
          Android blocks installations when keys differ to prevent security conflicts. Please
          reinstall the application or use fallback download options below.
        </p>
      );
      break;

    case 'versionCode_low':
      iconName = 'error';
      iconColor = '#f87171';
      title = 'Invalid update package';
      description =
        'This update cannot be installed because its Android versionCode is not newer than the installed app.';
      break;

    case 'failed':
      if (updater.recoveryMode) {
        iconName = 'healing';
        iconColor = '#eab308';
        title = 'Update Recovery Mode';
        description = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'left',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: '#eab308', lineHeight: 1.4 }}>
              Studio failed to update automatically multiple times.
            </p>
            <p style={{ margin: 0, color: 'var(--c-text-secondary)', lineHeight: 1.45 }}>
              Use the fail-safe recovery options below to install the update directly, share the
              update package, or download from alternative mirror sites.
            </p>
          </div>
        );
      } else {
        iconName = 'error';
        iconColor = '#f87171';
        title = updaterTr?.downloadFailed || 'Update download failed';
        if (
          updater.error &&
          (updater.error.includes('404') || updater.error.includes('non-OK status: 404'))
        ) {
          description = (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
                fontSize: 13,
                marginTop: 4,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: '#f87171', lineHeight: 1.4 }}>
                Studio update package was not found on the release server.
              </p>
              <div
                style={{
                  background: 'rgba(128,128,128,0.05)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  border: '1px solid rgba(128,128,128,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div>Target Version: {updater.remoteVersion || 'N/A'}</div>
                <div style={{ wordBreak: 'break-all' }}>APK URL: {updater.apkUrl || 'N/A'}</div>
                <div>HTTP Status: 404 (Not Found)</div>
                <div>Metadata (app-release.json) fetched: Yes</div>
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--c-text-secondary)',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                <strong>Suggested action:</strong> Try again later. This usually means the release
                metadata was published before the APK upload completed.
              </p>
            </div>
          );
        } else {
          description =
            updater.error ||
            'Studio could not complete the update. You can try again or copy diagnostics.';
        }
      }
  }

  if (isNearCompletion) {
    title = 'Almost ready...';
    description = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <div>Finalizing installation before handing over to Android installer.</div>
        <div style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>
          Please wait... Do not close the application.
        </div>
      </div>
    );
  }

  // Visual custom styles overrides using HSL purple/pink colors
  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #679cff 0%, #007aff 100%)',
    border: 'none',
    color: '#ffffff',
    fontFamily: 'var(--studio-font-body)',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0, 122, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 150ms ease, opacity 150ms ease',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    borderRadius: 9999,
    background: 'transparent',
    border: 'none',
    color: '#acabaa',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 150ms ease',
  };

  const halfSecondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    height: 42,
    borderRadius: 12,
    background: isLight ? 'var(--c-surface-low)' : '#131313',
    border: isLight ? '1px solid var(--c-border)' : '1px solid rgba(72, 72, 72, 0.2)',
    color: isLight ? 'var(--c-text-primary)' : '#e7e5e4',
    fontFamily: 'var(--studio-font-body)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const tertiaryButtonStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    borderRadius: 9999,
    background: 'transparent',
    border: 'none',
    color: '#acabaa',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const animatedPrimaryButtonStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #679cff 0%, #007aff 100%)',
    fontFamily: 'var(--studio-font-body)',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 8px 24px rgba(0, 122, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const renderButtons = () => {
    if (!showButtons) return null;

    if (state === 'permission_blocked') {
      return (
        <div style={{ display: 'flex', gap: 8, marginTop: 18, width: '100%' }}>
          <ActionButton
            type="button"
            onClick={() => setPermissionBlocked(false)}
            style={secondaryButtonStyle}
          >
            {updaterTr?.cancel || 'Cancel'}
          </ActionButton>
          <ActionButton type="button" onClick={handleOpenSettings} style={primaryButtonStyle}>
            Open Settings
          </ActionButton>
        </div>
      );
    }

    if (state === 'idle') {
      return (
        <div style={{ marginTop: 18, width: '100%' }}>
          <ActionButton
            type="button"
            onClick={onClose}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {updaterTr?.done || 'Close'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'reinstall_warning') {
      return (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18, width: '100%' }}
        >
          <ActionButton type="button" onClick={onClose} style={primaryButtonStyle}>
            I understand
          </ActionButton>

          <ActionButton type="button" onClick={onLater} style={tertiaryButtonStyle}>
            {updaterTr?.cancel || 'Cancel'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'available') {
      return (
        <div style={{ width: '100%' }}>
          {updater.validApkExists ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 18,
                width: '100%',
              }}
            >
              <ActionButton
                type="button"
                onClick={async () => {
                  try {
                    await updater.downloadUpdate('Modal: Continue Installation');
                    await updater.applyUpdate('Modal: Continue Installation');
                  } catch (err) {
                    console.error('[UpdateIndicator] Continue installation failed:', err);
                  }
                }}
                style={primaryButtonStyle}
              >
                <AnimatedIcon
                  name="play-circle"
                  size={18}
                  color="currentColor"
                  style={{ marginRight: 6 }}
                />
                Continue Installation
              </ActionButton>
              <ActionButton type="button" onClick={onLater} style={secondaryButtonStyle}>
                {updaterTr?.later || 'Later'}
              </ActionButton>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <button type="button" onClick={handleStartUpdate} style={primaryButtonStyle}>
                {updaterTr?.installNow || 'Update Now'}
              </button>
              <button type="button" onClick={onLater} style={secondaryButtonStyle}>
                {updaterTr?.later || 'Later'}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (state === 'manual_apk_required') {
      const manualApkUrl =
        updater.manualApkUrl ||
        `https://studio-30f44.web.app/apk/studio-${updater.remoteVersion}.bin`;

      return (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, width: '100%' }}
        >
          <ActionButton
            type="button"
            onClick={() => window.open(manualApkUrl, '_system')}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Download APK
          </ActionButton>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <ActionButton
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(manualApkUrl);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch (err) {
                  console.error('Failed to copy manual APK URL:', err);
                }
              }}
              style={halfSecondaryButtonStyle}
            >
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </ActionButton>
            <ActionButton type="button" onClick={handleOpenGitHub} style={halfSecondaryButtonStyle}>
              GitHub Fallback
            </ActionButton>
          </div>
          <ActionButton type="button" onClick={onLater} style={tertiaryButtonStyle}>
            {updaterTr?.later || 'Later'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'ready_to_install') {
      return (
        <div style={{ display: 'flex', gap: 8, marginTop: 18, width: '100%' }}>
          <ActionButton type="button" onClick={onLater} style={secondaryButtonStyle}>
            {updaterTr?.later || 'Later'}
          </ActionButton>
          <ActionButton type="button" onClick={handleInstallApk} style={primaryButtonStyle}>
            {updaterTr?.installNow || 'Install'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'signature_mismatch') {
      const copyDiagnostics = async () => {
        try {
          const report = await getDiagnosticsReport();
          await navigator.clipboard.writeText(report);
          alert('Diagnostics health report copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy diagnostics:', err);
        }
      };

      const handleRetryRecovery = async () => {
        try {
          await updater.runSignatureMismatchRecovery();
        } catch (err: any) {
          alert(`Recovery failed: ${err.message || String(err)}`);
        }
      };

      return (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18, width: '100%' }}
        >
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <ActionButton
              type="button"
              onClick={handleRetryRecovery}
              style={halfSecondaryButtonStyle}
            >
              Retry
            </ActionButton>
            <ActionButton type="button" onClick={onLater} style={halfSecondaryButtonStyle}>
              {updaterTr?.cancel || 'Cancel'}
            </ActionButton>
          </div>

          <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 4 }}>
            <ActionButton
              type="button"
              onClick={handleOpenGitHub}
              style={{ ...halfSecondaryButtonStyle, fontSize: 11, height: 36 }}
            >
              GitHub Release Page
            </ActionButton>
            <ActionButton
              type="button"
              onClick={copyDiagnostics}
              style={{ ...halfSecondaryButtonStyle, fontSize: 11, height: 36 }}
            >
              Copy Diagnostics
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              style={{ ...halfSecondaryButtonStyle, fontSize: 11, height: 36 }}
            >
              Diagnostics UI
            </ActionButton>
          </div>
        </div>
      );
    }

    if (state === 'versionCode_low') {
      return (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18, width: '100%' }}
        >
          <ActionButton type="button" onClick={onLater} style={primaryButtonStyle}>
            {updaterTr?.later || 'Later'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'failed') {
      if (updater.validApkExists) {
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 14,
              width: '100%',
            }}
          >
            <h4
              style={{
                margin: '4px 0 2px',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
                alignSelf: 'flex-start',
              }}
            >
              Installation could not be started
            </h4>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 11.5,
                color: 'var(--c-text-secondary)',
                fontFamily: 'Inter',
                lineHeight: 1.45,
                textAlign: 'left',
              }}
            >
              {updater.error ||
                'Studio could not start the installation automatically. Please choose an option below.'}
            </p>

            <ActionButton
              type="button"
              onClick={async () => {
                try {
                  await updater.downloadUpdate('Recovery Center: Retry Installation');
                  await updater.applyUpdate('Recovery Center: Retry Installation');
                } catch (err) {
                  console.error('[UpdateIndicator] Recovery retry failed:', err);
                }
              }}
              style={primaryButtonStyle}
            >
              <AnimatedIcon
                name="refresh"
                size={18}
                color="currentColor"
                style={{ marginRight: 6 }}
              />
              {updaterTr?.retry || 'Retry Installation'}
            </ActionButton>

            <ActionButton type="button" onClick={onLater} style={tertiaryButtonStyle}>
              {updaterTr?.cancel || 'Cancel'}
            </ActionButton>
          </div>
        );
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 14,
            width: '100%',
          }}
        >
          <h4
            style={{
              margin: '4px 0 2px',
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              alignSelf: 'flex-start',
            }}
          >
            Update Failed
          </h4>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 11.5,
              color: 'var(--c-text-secondary)',
              fontFamily: 'Inter',
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            {updater.error || 'Studio could not complete the update automatically.'}
          </p>

          <ActionButton
            type="button"
            onClick={async () => {
              if (updater.updateAvailable) {
                await handleStartUpdate();
              } else {
                await updater.checkNow();
              }
            }}
            style={primaryButtonStyle}
          >
            <AnimatedIcon
              name="refresh"
              size={18}
              color="currentColor"
              style={{ marginRight: 6 }}
            />
            {updaterTr?.retry || 'Retry Update'}
          </ActionButton>

          <ActionButton type="button" onClick={onLater} style={tertiaryButtonStyle}>
            {updaterTr?.cancel || 'Cancel'}
          </ActionButton>
        </div>
      );
    }

    if (state === 'update_success' || state === 'installed' || state === 'installedOrReady') {
      return (
        <div style={{ marginTop: 18, width: '100%' }}>
          <ActionButton
            type="button"
            onClick={async () => {
              try {
                // End the post-install session and clear all locks so future
                // automatic checks are not blocked on the next cold start.
                endPostInstallSession('user_done_button');
                clearInstallationJustCompleted();
                onClose();
                updater.dismissUpdate();
                if (Capacitor.isNativePlatform()) {
                  await AppInstaller.clearInstallerLogHistory();
                  const { App: CapApp } = await import('@capacitor/app');
                  await CapApp.exitApp();
                }
              } catch (err) {
                console.error('[UpdateIndicator] Done click failed:', err);
              }
            }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {updaterTr?.done || 'Done'}
          </ActionButton>
        </div>
      );
    }

    return null;
  };

  const renderIndeterminateProgress = () => {
    return (
      <div
        style={{ width: '100%', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--studio-font-body)',
            color: 'var(--c-text-primary)',
          }}
        >
          <span>Installing update...</span>
          <span>In progress</span>
        </div>
        <div
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: 'rgba(128,128,128,0.12)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '40%',
              height: '100%',
              background: `linear-gradient(90deg, ${purpleFrom}, ${purpleTo})`,
              animation: 'lg-indeterminate-progress 1.5s infinite linear',
              borderRadius: 3,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--c-text-secondary)',
            fontFamily: 'Inter',
            opacity: 0.8,
            textAlign: 'left',
          }}
        >
          {updater.statusText || 'Waiting for system confirmation...'}
        </div>
      </div>
    );
  };

  const renderProgress = () => {
    return null;
  };

  const renderSpinner = () => {
    if (!showSpinner) return null;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '12px 0 6px',
        }}
      >
        <SpinnerSvg cFrom={purpleFrom} cTo={purpleTo} />
      </div>
    );
  };

  const renderIcon = () => {
    if (
      isNearCompletion ||
      showProgress ||
      state === 'downloading' ||
      state === 'installing' ||
      state === 'packageinstaller_visible' ||
      state === 'readyForInstallPrompt'
    ) {
      return null;
    }
    if (showSpinner) {
      return (
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'rgba(128,128,128,0.06)',
            border: '1.5px solid rgba(128,128,128,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <SpinnerSvg cFrom={purpleFrom} cTo={purpleTo} size={28} strokeWidth={3.6} />
        </div>
      );
    }

    return (
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: `color-mix(in srgb, ${iconColor} 12%, var(--app-surface))`,
          border: `1.5px solid color-mix(in srgb, ${iconColor} 28%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px color-mix(in srgb, ${iconColor} 18%, transparent)`,
          marginBottom: 10,
        }}
      >
        <AnimatedIcon name={iconName} size={28} color={iconColor} />
      </div>
    );
  };

  // Render buttons
  const actionButtons = renderButtons();

  let progressComponent: React.ReactNode = undefined;
  if (state === 'downloading' && !isNearCompletion) {
    progressComponent = (
      <DownloadProgressIndicator
        updater={updater}
        toVersion={toVersion}
        accentFrom={accentFrom}
        accentTo={accentTo}
        isLight={isLight}
      />
    );
  }

  // Construct What's New changelog content
  const targetVer = toVersion || updater.remoteVersion;
  const notesList: string[] = (() => {
    // 1. Try structured releaseNotes or string array from updater
    if (updater.releaseNotes) {
      if (Array.isArray(updater.releaseNotes)) {
        const filtered = updater.releaseNotes
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => sanitizeUTF8String(item.trim()));
        if (filtered.length > 0) return filtered;
      } else if (typeof updater.releaseNotes === 'object') {
        const extracted = extractStructuredReleaseNotes(updater.releaseNotes);
        if (extracted.bullets.length > 0) {
          return extracted.bullets;
        }
      }
    }

    // 2. Fallback to parsing updater.changelog / description if releaseNotes was empty
    if (
      updater.changelog &&
      typeof updater.changelog === 'string' &&
      updater.changelog.trim().length > 0
    ) {
      const extracted = extractStructuredReleaseNotes(updater.changelog);
      if (extracted.bullets.length > 0) {
        return extracted.bullets;
      }
    }

    // 3. Dynamic per-version default (never display old hardcoded notes from prior versions)
    if (targetVer) {
      return [
        `Studio update v${targetVer} includes performance optimizations, UI refinements, and stability improvements.`,
      ];
    }

    return [];
  })();

  const parsedNotes = notesList.map((raw) => {
    let text = sanitizeUTF8String(raw || '').trim();
    // Strip leading bullet or dash e.g. "• ", "- ", "* "
    text = text.replace(/^[-*•]\s*/, '').trim();

    let tag: string | null = null;
    let tagType: 'improved' | 'fixed' | 'added' | 'changed' | 'default' = 'default';

    // 1. Check for [Category] tag e.g. [Improved], [Fixed], [Added], [Changed]
    const tagMatch = text.match(
      /^\[(Added|Improved|Fixed|Changed|Bug\s*Fixes|Fixes|Features|Security)\]\s*(.*)$/i
    );
    if (tagMatch) {
      tag = tagMatch[1];
      const rawTag = tag.toLowerCase();
      if (rawTag.startsWith('improv')) tagType = 'improved';
      else if (rawTag.startsWith('fix') || rawTag.startsWith('bug')) tagType = 'fixed';
      else if (rawTag.startsWith('add') || rawTag.startsWith('feat')) tagType = 'added';
      else tagType = 'changed';
      text = tagMatch[2].trim();
    }

    // 2. Check for Title: Description pattern
    let title: string | null = null;
    let body = text;
    const colonIdx = text.indexOf(':');
    if (colonIdx > 0 && colonIdx < 65 && !text.slice(0, colonIdx).includes('\n')) {
      title = text.slice(0, colonIdx + 1).trim();
      body = text.slice(colonIdx + 1).trim();
    }

    return { tag, tagType, title, body };
  });

  const getTagStyle = (
    tagType: 'improved' | 'fixed' | 'added' | 'changed' | 'default'
  ): { bg: string; color: string; border: string } => {
    switch (tagType) {
      case 'improved':
        return {
          bg: isLight
            ? 'rgba(2, 132, 199, 0.09)'
            : isAmoled
              ? 'rgba(56, 189, 248, 0.14)'
              : 'rgba(56, 189, 248, 0.12)',
          color: isLight ? '#0369a1' : isAmoled ? '#bae6fd' : '#7dd3fc',
          border: isLight
            ? '1px solid rgba(2, 132, 199, 0.24)'
            : '1px solid rgba(56, 189, 248, 0.28)',
        };
      case 'fixed':
        return {
          bg: isLight
            ? 'rgba(22, 163, 74, 0.09)'
            : isAmoled
              ? 'rgba(74, 222, 128, 0.14)'
              : 'rgba(74, 222, 128, 0.12)',
          color: isLight ? '#15803d' : isAmoled ? '#bbf7d0' : '#86efac',
          border: isLight
            ? '1px solid rgba(22, 163, 74, 0.24)'
            : '1px solid rgba(74, 222, 128, 0.28)',
        };
      case 'added':
        return {
          bg: isLight
            ? 'rgba(124, 58, 237, 0.09)'
            : isAmoled
              ? 'rgba(168, 85, 247, 0.14)'
              : 'rgba(168, 85, 247, 0.12)',
          color: isLight ? '#6d28d9' : isAmoled ? '#e9d5ff' : '#d8b4fe',
          border: isLight
            ? '1px solid rgba(124, 58, 237, 0.24)'
            : '1px solid rgba(168, 85, 247, 0.28)',
        };
      case 'changed':
      default:
        return {
          bg: isLight
            ? 'rgba(100, 116, 139, 0.09)'
            : isAmoled
              ? 'rgba(148, 163, 184, 0.14)'
              : 'rgba(148, 163, 184, 0.12)',
          color: isLight ? '#475569' : isAmoled ? '#e2e8f0' : '#cbd5e1',
          border: isLight
            ? '1px solid rgba(100, 116, 139, 0.24)'
            : '1px solid rgba(148, 163, 184, 0.28)',
        };
    }
  };

  const changelogContent = (
    <div
      className="studio-updater-changelog-scroll"
      style={{
        width: '100%',
        background: isLight
          ? 'rgba(0, 0, 0, 0.025)'
          : isAmoled
            ? '#050505'
            : 'rgba(255, 255, 255, 0.03)',
        border: isLight
          ? '1px solid rgba(0, 0, 0, 0.08)'
          : isAmoled
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '12px 14px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight: 'min(250px, 34vh)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 4,
          borderBottom: isLight
            ? '1px solid rgba(0, 0, 0, 0.05)'
            : '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: `var(--c-accent-from, ${accentFrom || '#679cff'})`,
            fontFamily: 'var(--studio-font-body)',
          }}
        >
          {updaterTr?.whatsNew || "What's New"}
        </span>
        {targetVer && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              color: isLight ? '#64748b' : '#94a3b8',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            v{targetVer}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          margin: 0,
          padding: 0,
        }}
      >
        {parsedNotes.map((note, idx) => {
          const tagStyle = getTagStyle(note.tagType);
          const isLast = idx === parsedNotes.length - 1;
          return (
            <div
              key={idx}
              style={{
                display: 'block',
                paddingBottom: isLast ? 0 : 8,
                borderBottom: isLast
                  ? 'none'
                  : isLight
                    ? '1px solid rgba(0, 0, 0, 0.04)'
                    : '1px solid rgba(255, 255, 255, 0.04)',
                textAlign: 'left',
                lineHeight: 1.55,
              }}
            >
              {note.tag ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'var(--studio-font-body)',
                    letterSpacing: '0.03em',
                    padding: '1.5px 6px',
                    borderRadius: 5,
                    background: tagStyle.bg,
                    color: tagStyle.color,
                    border: tagStyle.border,
                    lineHeight: 1.25,
                    marginRight: 6,
                    verticalAlign: 'baseline',
                    flexShrink: 0,
                  }}
                >
                  [{note.tag}]
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: `var(--c-accent-from, ${accentFrom || '#679cff'})`,
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
              )}
              {note.title && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'Inter, sans-serif',
                    color: isLight ? '#0f172a' : isAmoled ? '#ffffff' : '#f8fafc',
                    marginRight: 4,
                  }}
                >
                  {note.title}
                </span>
              )}
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  color: isLight ? '#334155' : isAmoled ? '#e5e5e5' : '#cbd5e1',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {note.body}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const showChangelog =
    updater.updateAvailable &&
    [
      'available',
      'downloading',
      'readyForInstallPrompt',
      'installing',
      'installedOrReady',
    ].includes(state);

  return (
    <StudioUpdateScreen
      state={state}
      progress={updater.progress}
      accentFrom={accentFrom}
      accentTo={accentTo}
      title={title}
      description={description}
      iconName={iconName}
      iconColor={iconColor}
      showSpinner={showSpinner}
      actionButtons={actionButtons}
      isRequired={mandatory && state === 'available'}
      onClose={onClose}
      onLater={onLater}
      onUpdateNow={handleStartUpdate}
      onCancelDownload={onLater}
      onRetry={handleStartUpdate}
      onDone={async () => {
        try {
          endPostInstallSession('user_done_button');
          clearInstallationJustCompleted();
          onClose();
          updater.dismissUpdate();
          if (Capacitor.isNativePlatform()) {
            await AppInstaller.clearInstallerLogHistory();
            const { App: CapApp } = await import('@capacitor/app');
            await CapApp.exitApp();
          }
        } catch (err) {
          console.error('[UpdateIndicator] Done click failed:', err);
        }
      }}
      apkSizeBytes={updater.apkSizeBytes}
      downloadSpeed={computedSpeed ?? undefined}
      etaSeconds={computedEta ?? undefined}
      downloadedBytes={updater.downloadedBytes ?? undefined}
      totalBytes={updater.totalBytes ?? undefined}
      error={updater.error || installFailedReason}
      releaseNotes={updater.releaseNotes || updater.changelog}
      progressComponent={progressComponent}
      isLight={isLight}
      isAmoled={isAmoled}
      fromVersion={fromLabel}
      toVersion={toVersion}
    />
  );
}
