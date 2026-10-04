import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Button, StatefulButton } from '../../../shared/design-system/buttons';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { SpotlightLogo } from '../../../components/spotlight-logo';
import { StudioPageTransition } from '../../../components/StudioPageTransition';
import { ProgressiveBlur } from '../../../shared/design-system/ProgressiveBlur';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import { ActionButton } from '../../../shared/design-system/StudioDesignSystem';
import {
  SettingSection,
  SettingRow,
  SegmentedControl,
  Toggle,
} from '../../../shared/settings/SettingControls';
import {
  SettingsScaffold,
  SettingsContentContainer,
  SharedFloatingHeader,
} from '../../../shared/layout/StudioLayoutSystem';
import { useOverscrollSpring } from '../../../shared/layout/useOverscrollSpring';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import {
  LanguagePickerSheet,
  SUPPORTED_LANGUAGES,
} from '../../../shared/settings/LanguagePickerSheet';
import { ThemeToggle } from '../../../components/motion/theme-toggle';
import ChangelogSheet from '../../chordex/components/ChangelogSheet';
import StudioHubSettingsPanel from './StudioHubSettingsPanel';
import {
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../chordex/icons/ChordexLogo';
import AccountCard, {
  AccountSettingsPage,
} from '../../auth/components/AccountCard';
import { AccountDangerZone } from '../../auth/components/settings/AccountDangerZone';
const DevToolsDashboard = lazy(() => import('../../devtools/components/DevToolsDashboard'));
import {
  useBackHandler,
  type AuthUser,
  subscribeSyncStatus,
  type SyncStatus,
  deviceId,
  getConflictLogs,
  clearConflictLogs,
  createCloudBackup,
  getSyncDiagnostics,
  pushLocalSettingsToCloud,
  pullCloudSettingsFromCloud,
  registerDevice,
  registerCurrentDevice,
  reconnectDevices,
  useChordStore,
  ACCENT_COLORS,
  type AnimationSpeed,
  type DisplayDensity,
  type AppKey,
  type PerAppVisuals,
  useNavHidden,
  useNavCollapsed,
  useScrollHide,
  setNavHidden,
  useT,
  useAppUpdate,
  APP_VERSION_LABEL,
  APP_VERSION_TAG,
  APP_VERSION_DATE,
  compareSemver,
  APP_VERSION,
  getChangelogSections,
  RELEASE_HISTORY,
  updateDebugLogs,
  updateDiagnostics,
  checkForUpdate,
  resetAppUpdateState,
  isAppInstallerAvailable,
  applyUpdate,
  fadeToBlackAndReload,
  resolveApkUrl,
  downloadAndInstallApk,
  resolveReleasePageUrl,
  useIsWebDesktop,
  useStudioPreferences,
  registerDebugProvider,
  unregisterDebugProvider,
  recordNavigation,
  getFirestoreDiagnostics,
  getNavigationEntries,
  resetNav,
  useNavigationStore,
  NavigationDispatcher,
  useBottomNavigationStore,
  useSettingsStore,
  useShallow,
  DurationPresets,
  EasingPresets,
  SpringPresets,
  authRepository,
  getUpdateHistory,
  StartupCoordinator,
  startDiagnosticsSession,
  resetUpdateTimeline,
  getTimelineReport,
  settingsController,
  getUserCover,
  subscribeUserCover,
  usePerformanceTrack,
} from '@workspace/livex-core';
import {
  HubTab,
  HelpPageId,
  THEME_OPTIONS,
  TimeWord,
  TIME_GREETING_ES,
  GreetingPair,
  Theme,
  getSessionIndex,
} from '../components/hubConstants';
import { HelpAccordion } from '../components/faqConstants';
import { ChangelogView } from '../components/HubChangelogView';

export type SettingsPageId =
  | 'main'
  | 'general'
  | 'appearance'
  | 'language'
  | 'privacy'
  | 'about'
  | 'updater'
  | 'notifications'
  | 'debug'
  | 'developer'
  | 'profile'
  | 'help-center'
  | 'faq'
  | 'release-notes'
  | 'download-apps'
  | 'keyboard-shortcuts'
  | 'terms'
  | 'privacy-policy'
  | 'bug-report'
  | 'personal-info'
  | 'security-login'
  | 'subscription'
  | 'devices-sessions'
  | 'privacy-data'
  | 'licenses'
  | 'changelog';

const syncController = {
  syncNow: () => {},
};

export function formatHour(h: number): string {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}
import { HUB_SETTINGS_CSS } from './hubSettingsStyles';

import { HelpContent, HelpCenterContent, FaqContent, ReleaseNotesContent, ChangelogContent, DownloadAppsContent, KeyboardShortcutsContent, TermsContent, PrivacyPolicyContent, BugReportContent } from './pages/HelpSettingsPage';
import { GeneralContent } from './pages/GeneralSettingsPage';
import { PrivacyContent } from './pages/PrivacySettingsPage';
import { AboutContent } from './pages/AboutSettingsPage';
import { LicensesContent } from './pages/LicensesSettingsPage';
import { Profile } from './pages/ProfileSettingsPage';

export { HUB_SETTINGS_CSS };
export { SettingsNavRow, SettingsSectionLabel } from './components/SettingsRows';


function GlobalHint() {
  const t = useT();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '6px 4px 0' }}>
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 13,
          color: 'var(--c-text-secondary)',
          fontVariationSettings: "'FILL' 1",
          flexShrink: 0,
        }}
      >
        public
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--font-section-label)',
          fontWeight: 600,
          color: 'var(--c-text-secondary)',
          fontFamily: 'Inter',
          letterSpacing: '0.01em',
        }}
      >
        {t.hub.appliesToAll}
      </p>
    </div>
  );
}

function getUpdaterStatusText(updater: any, lang: string) {
  if (updater.loading) {
    if (['DOWNLOAD_APK', 'VERIFY_SHA256', 'PREPARING_INSTALL'].includes(updater.updateState)) {
      return lang === 'es' ? 'Descargando…' : 'Downloading...';
    }
    if (updater.updateState === 'INSTALLING') {
      return lang === 'es' ? 'Instalando…' : 'Installing...';
    }
    return lang === 'es' ? 'Buscando actualizaciones…' : 'Checking for updates...';
  }

  if (
    updater.updateState === 'WAITING_USER_CONFIRMATION' ||
    updater.updateState === 'PACKAGEINSTALLER_VISIBLE'
  ) {
    return lang === 'es' ? 'Listo para instalar' : 'Ready to install';
  }

  if (['INSTALL_FAILED', 'RECOVERY'].includes(updater.updateState)) {
    return lang === 'es' ? 'Error al instalar' : 'Failed';
  }

  if (updater.updateAvailable) {
    return lang === 'es' ? 'Actualización disponible' : 'Update available';
  }

  return lang === 'es' ? 'Al día' : 'Up to date';
}

function UpdaterSettingsContent({
  lang,
  updater,
  accent,
  showDevToast,
  navigate,
}: {
  lang: string;
  updater: any;
  accent: { from: string; to: string; mid?: string };
  showDevToast: (msg: string) => void;
  navigate: (page: SettingsPageId) => void;
}) {
  const isNative = Capacitor.isNativePlatform();
  const [autoUpdates, setAutoUpdates] = useState(() => {
    return localStorage.getItem('studio:automatic_updates') !== 'false';
  });
  const handleToggleAutoUpdates = (val: boolean) => {
    setAutoUpdates(val);
    localStorage.setItem('studio:automatic_updates', String(val));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        width: '100%',
        paddingBottom: 'var(--space-6)',
      }}
    >
      <SettingSection title={lang === 'es' ? 'SISTEMA DE ACTUALIZACIONES' : 'UPDATE SYSTEM'}>
        {/* Current Version */}
        <SettingRow
          label={lang === 'es' ? 'Versión actual' : 'Current Version'}
          desc={`${APP_VERSION_TAG} ${APP_VERSION} (Build ${APP_VERSION_DATE})`}
        >
          <span style={{ fontSize: 12, color: 'var(--c-text-secondary)', fontWeight: 600 }}>
            {lang === 'es' ? 'Instalado' : 'Installed'}
          </span>
        </SettingRow>

        {/* Check for Updates */}
        <SettingRow
          label={lang === 'es' ? 'Buscar actualizaciones' : 'Check for Updates'}
          desc={getUpdaterStatusText(updater, lang)}
        >
          {updater.loading ? (
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                color: accent.from,
                animation: 'updater-check-spin 1s linear infinite',
                display: 'inline-block',
              }}
            >
              refresh
            </span>
          ) : updater.updateAvailable ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => updater.openModal()}
              icon={
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE'].includes(
                    updater.updateState
                  )
                    ? 'install_mobile'
                    : 'download'}
                </span>
              }
            >
              {['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE'].includes(
                updater.updateState
              )
                ? lang === 'es'
                  ? 'Instalar'
                  : 'Install Update'
                : lang === 'es'
                  ? 'Continuar'
                  : 'Continue Update'}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await updater.checkNow();
              }}
            >
              {lang === 'es' ? 'Buscar' : 'Check Now'}
            </Button>
          )}
        </SettingRow>

        {/* Automatic Updates */}
        <SettingRow
          label={lang === 'es' ? 'Actualizaciones automáticas' : 'Automatic Updates'}
          desc={
            lang === 'es'
              ? 'Buscar y descargar compilaciones en segundo plano'
              : 'Check and download builds in the background'
          }
        >
          <Toggle value={autoUpdates} onChange={handleToggleAutoUpdates} />
        </SettingRow>

        {/* Update Diagnostics */}
        <SettingRow
          label={lang === 'es' ? 'Diagnósticos de actualización' : 'Update Diagnostics'}
          desc={
            lang === 'es'
              ? 'Copiar informes de depuración y estado del actualizador'
              : 'Copy debug reports and check recovery logs'
          }
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                const report = await updater.getDiagnosticsReport();
                await navigator.clipboard.writeText(report);
                showDevToast(
                  lang === 'es' ? 'Copiado al portapapeles' : 'Copied report to clipboard'
                );
              } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
              }
            }}
            icon={
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                content_copy
              </span>
            }
          >
            {lang === 'es' ? 'Copiar' : 'Copy'}
          </Button>
        </SettingRow>

        {/* Changelog */}
        <SettingRow
          label={lang === 'es' ? 'Historial de cambios' : 'Changelog'}
          desc={
            lang === 'es'
              ? 'Ver notas de lanzamiento completas'
              : 'View full chronological release notes'
          }
        >
          <button
            onClick={() => navigate('changelog')}
            className="btn-smooth animate-click"
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              background: 'var(--c-surface-low)',
              color: 'var(--c-text-primary)',
              border: '1px solid var(--c-border)',
              fontSize: 'var(--font-section-label)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              history
            </span>
            {lang === 'es' ? 'Ver' : 'View'}
          </button>
        </SettingRow>
      </SettingSection>

      {/* About this Update */}
      {updater.updateAvailable && updater.changelog && (
        <SettingSection
          title={lang === 'es' ? 'ACERCA DE ESTA ACTUALIZACIÓN' : 'ABOUT THIS UPDATE'}
        >
          <div
            style={{
              padding: 'var(--density-row-pad)',
              color: 'var(--c-text-secondary)',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: '0 0 10px 0', fontWeight: 700, color: 'var(--c-text-primary)' }}>
              {lang === 'es' ? 'Novedades en v' : "What's new in v"}
              {updater.remoteVersion}:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {updater.changelog.split('\n').map((line: string, idx: number) => {
                const cleanLine = line.replace(/^[•\s*-]+/g, '').trim();
                if (!cleanLine) return null;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: accent.from, marginTop: 1 }}>•</span>
                    <span>{cleanLine}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SettingSection>
      )}

      {/* Recovery official releases link */}
      {isNative && (
        <SettingSection title={lang === 'es' ? 'RECUPERACIÓN' : 'RECOVERY'}>
          <SettingRow
            label={lang === 'es' ? 'Descargas oficiales' : 'Official Downloads'}
            desc={
              lang === 'es'
                ? 'Descargar compilaciones firmadas desde GitHub'
                : 'Download signed production builds from GitHub'
            }
          >
            <button
              onClick={() =>
                window.open('https://github.com/MAGEXE1000/Livex/releases', '_system')
              }
              className="btn-smooth animate-click"
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                background: 'var(--c-surface-low)',
                color: 'var(--c-text-primary)',
                border: '1px solid var(--c-border)',
                fontSize: 'var(--font-section-label)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                download
              </span>
              GitHub
            </button>
          </SettingRow>
        </SettingSection>
      )}
    </div>
  );
}

export function HubSettings({
  accent,
  scrollRef,
  authUser,
  onProfile,
  tab,
  setTab,
  showDevToast = () => {},
  handleLogoTap = () => {},
  devToast = null,
  renderDevToast = () => null,
}: {
  accent: { from: string; to: string; mid: string };
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  authUser?: AuthUser | null;
  onProfile?: () => void;
  tab: HubTab;
  setTab: React.Dispatch<React.SetStateAction<HubTab>>;
  showDevToast?: (msg: string) => void;
  handleLogoTap?: () => void;
  devToast?: string | null;
  renderDevToast?: () => React.ReactNode;
}) {
  usePerformanceTrack('HubSettings');
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const settings = useSettingsStore(
    useShallow((state) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      hapticFeedback: state.settings.hapticFeedback,
      highRefreshRate: state.settings.highRefreshRate,
      lowLatencyMode: state.settings.lowLatencyMode,
      performanceMode: state.settings.performanceMode,
    }))
  );
  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled =
    !isLight &&
    (Boolean(settings.amoledMode) ||
      Boolean(settings.perApp?.hub?.amoledMode) ||
      (typeof document !== 'undefined' &&
        document.documentElement.classList.contains('amoled')));
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const updatePerApp = useSettingsStore((state) => state.updatePerApp);
  const historyLength = useNavigationStore((s) => s.history.length);
  const { preferences, setPreference } = useStudioPreferences();
  const [langQuery, setLangQuery] = useState('');
  const t = useT();
  const lang = settings.language ?? 'en';
      const isWebDesktop = useIsWebDesktop();
  const updater = useAppUpdate();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    signedIn: false,
    phase: 'idle',
    syncing: false,
    lastSyncedMs: null,
    error: null,
    showMigrationPrompt: false,
    migrationChoice: null,
  });

  useEffect(() => {
    return subscribeSyncStatus((s) => {
      setSyncStatus(s);
    });
  }, []);
  const getInitialSettingsPage = () => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('studio:routeToUpdater') === '1') {
      sessionStorage.removeItem('studio:routeToUpdater');
      return 'notifications';
    }
    if (typeof window !== 'undefined' && sessionStorage.getItem('studio:routeToPrivacy') === '1') {
      sessionStorage.removeItem('studio:routeToPrivacy');
      return 'privacy';
    }
    const target =
      typeof window !== 'undefined' ? sessionStorage.getItem('studio:routeToSettingsPage') : null;
    if (target) {
      sessionStorage.removeItem('studio:routeToSettingsPage');
      return target as SettingsPageId;
    }
    return 'main';
  };

  const page = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    if (last?.tab === 'profile') {
      const p = last.page ?? 'profile';
      if (
        ['personal-info', 'security-login', 'subscription', 'devices-sessions', 'privacy-data'].includes(p)
      ) {
        return 'profile' as SettingsPageId;
      }
      return p as SettingsPageId;
    }
    if (last?.tab === 'settings') {
      if (!last.page || last.page === 'settings') {
        return 'main' as SettingsPageId;
      }
      return last.page as SettingsPageId;
    }
    return 'main' as SettingsPageId;
  });
  const pageKey = historyLength;

  const curLen = historyLength;
  const prevLenRef = useRef(curLen);
  const prevDirRef = useRef<'forward' | 'backward'>('forward');

  let slideDir: 'forward' | 'backward' = prevDirRef.current;
  if (curLen !== prevLenRef.current) {
    slideDir = curLen >= prevLenRef.current ? 'forward' : 'backward';
    prevDirRef.current = slideDir;
    prevLenRef.current = curLen;
  }

  // ── Hidden Developer Options 10-tap Unlock Gesture ──
  const [localDevToast, setLocalDevToast] = useState<string | null>(null);
  const localToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aboutTapCountRef = useRef(0);
  const lastAboutTapTimeRef = useRef(0);
  const aboutTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (aboutTapTimerRef.current) {
        clearTimeout(aboutTapTimerRef.current);
      }
      if (localToastTimerRef.current) {
        clearTimeout(localToastTimerRef.current);
      }
    };
  }, []);

  const triggerDevToast = useCallback(
    (msg: string) => {
      showDevToast?.(msg);
      if (localToastTimerRef.current) {
        clearTimeout(localToastTimerRef.current);
      }
      setLocalDevToast(msg);
      localToastTimerRef.current = setTimeout(() => {
        setLocalDevToast(null);
      }, 2000);
    },
    [showDevToast]
  );

  const handleAboutLogoTap = useCallback(() => {
    handleLogoTap?.();

    const now = Date.now();
    const timeDelta = now - lastAboutTapTimeRef.current;

    // Minimum interval debounce guard to avoid synthetic or hardware double-tap events
    if (timeDelta < 80) {
      return;
    }
    lastAboutTapTimeRef.current = now;

    if (aboutTapTimerRef.current) {
      clearTimeout(aboutTapTimerRef.current);
      aboutTapTimerRef.current = null;
    }

    // Interval threshold: 1000ms idle resets counter sequence
    if (timeDelta > 1000) {
      aboutTapCountRef.current = 1;
    } else {
      aboutTapCountRef.current += 1;
    }

    // Set expiration timer for incomplete sequences
    aboutTapTimerRef.current = setTimeout(() => {
      aboutTapCountRef.current = 0;
    }, 1000);

    if (aboutTapCountRef.current === 10) {
      aboutTapCountRef.current = 0;
      if (aboutTapTimerRef.current) {
        clearTimeout(aboutTapTimerRef.current);
        aboutTapTimerRef.current = null;
      }

      if (settings.developerMode) {
        triggerDevToast(
          lang === 'es'
            ? 'Las opciones de desarrollador ya están activadas'
            : 'Developer options are already active'
        );
      } else {
        updateSettings({ developerMode: true });
        triggerDevToast(
          lang === 'es' ? 'Opciones de desarrollador desbloqueadas' : 'Developer options unlocked'
        );
      }
    }
  }, [handleLogoTap, settings.developerMode, updateSettings, triggerDevToast, lang]);

  const activeDevToast = devToast || localDevToast;

  const renderToastElement = () => {
    if (!activeDevToast) return null;
    if (devToast && renderDevToast && renderDevToast()) {
      return renderDevToast();
    }
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          color: isLight ? '#fff' : '#000',
          padding: '8px 18px',
          borderRadius: '20px',
          fontSize: '12.5px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          zIndex: 999999,
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
          whiteSpace: 'nowrap',
        }}
      >
        {activeDevToast}
      </div>
    );
  };

  const activePageId = page === 'main' ? 'general' : page;

  const sections = useMemo(() => {
    const list: {
      label: string;
      items: { id: SettingsPageId; icon: string; label: string }[];
    }[] = [];
    if (tab === 'profile') {
      list.push({
        label: t.hub.studioSettings.userLabel || (lang === 'es' ? 'Usuario' : 'User'),
        items: [
          {
            id: 'profile' as const,
            icon: 'account_circle',
            label:
              t.hub.studioSettings.profileTitle ||
              (lang === 'es' ? 'Perfil y Cuenta' : 'Profile & Account'),
          },
        ],
      });
    }
    list.push(
      {
        label:
          t.hub.studioSettings.preferencesLabel || (lang === 'es' ? 'Preferencias' : 'Preferences'),
        items: [
          {
            id: 'general' as const,
            icon: 'settings',
            label: t.hub.studioSettings.generalTitle || (lang === 'es' ? 'Ajustes' : 'Settings'),
          },
          {
            id: 'notifications' as const,
            icon: 'notifications',
            label: lang === 'es' ? 'Centro de Notificaciones' : 'Notification Center',
          },
          {
            id: 'appearance' as const,
            icon: 'palette',
            label: t.settings.sections.appearance || (lang === 'es' ? 'Apariencia' : 'Appearance'),
          },
          {
            id: 'language' as const,
            icon: 'language',
            label: t.settings.sections.language || (lang === 'es' ? 'Idioma' : 'Language'),
          },
          {
            id: 'privacy' as const,
            icon: 'security',
            label:
              t.hub.studioSettings.privacyTitle ||
              (lang === 'es' ? 'Privacidad y Seguridad' : 'Privacy & Security'),
          },
        ],
      },
      {
        label:
          t.hub.studioSettings.applicationLabel || (lang === 'es' ? 'Aplicación' : 'Application'),
        items: [
          {
            id: 'updater' as const,
            icon: 'system_update',
            label: lang === 'es' ? 'Actualizador' : 'Updater',
          },
          {
            id: 'about' as const,
            icon: 'info',
            label: lang === 'es' ? 'Acerca de' : 'About',
          },
          ...(settings.developerMode
            ? [
                {
                  id: 'developer' as const,
                  icon: 'terminal',
                  label:
                    t.hub.studioSettings.developerTitle ||
                    (lang === 'es' ? 'Opciones de Desarrollador' : 'Developer Options'),
                },
              ]
            : []),
        ],
      }
    );
    return list;
  }, [t, settings.developerMode, lang, tab]);

  const getPageTitle = (id: SettingsPageId | 'profile') => {
    if (id === 'changelog') return lang === 'es' ? 'Historial de Cambios' : 'Changelog';
    if (id === 'updater') return lang === 'es' ? 'Actualizador' : 'Updater';
    if (id === 'help-center') return t.hub.studioSettings.helpTitle || 'Help Center';
    if (id === 'faq') return (t.hub as any).studioSettings?.helpTitle || 'FAQ & Support';
    if (id === 'terms') return t.hub.studioSettings.termsTitle || 'Terms of Service';
    if (id === 'privacy-policy') return t.hub.studioSettings.privacyTitle || 'Privacy Policy';
    if (id === 'bug-report') return t.hub.studioSettings.bugTitle || 'Report a Bug';
    if (id === 'profile')
      return (
        t.hub.studioSettings.profileTitle ||
        (lang === 'es' ? 'Perfil y Cuenta' : 'Profile & Account')
      );
    if (id === 'personal-info')
      return lang === 'es' ? 'Información personal' : 'Personal Information';
    if (id === 'security-login') return lang === 'es' ? 'Seguridad y acceso' : 'Security & Login';
    if (id === 'subscription')
      return lang === 'es' ? 'Suscripción y facturación' : 'Subscription & Billing';
    if (id === 'devices-sessions')
      return lang === 'es' ? 'Dispositivos y sesiones' : 'Devices & Sessions';
    if (id === 'privacy-data') return lang === 'es' ? 'Privacidad y datos' : 'Privacy & Data';

    for (const section of sections) {
      const item = section.items.find((n) => n.id === id);
      if (item) return item.label;
    }
    return 'Settings';
  };

  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!authUser?.uid) {
      setCustomPhoto(null);
      return;
    }
    const refresh = () => setCustomPhoto(getUserCover(authUser.uid));
    refresh();
    return subscribeUserCover(({ uid, cover }) => {
      if (uid === authUser.uid) {
        setCustomPhoto(cover);
      }
    });
  }, [authUser?.uid]);

  const hubVis: PerAppVisuals = settings.perApp?.hub ?? {
    theme: 'dark',
    amoledMode: false,
  };
  const [changelogOpen, setChangelogOpen] = useState(false);

  function requestChange(patch: Partial<PerAppVisuals>) {
    const globalPatch: Record<string, any> = {};
    if (patch.theme) globalPatch.theme = patch.theme;
    if (patch.amoledMode !== undefined) globalPatch.amoledMode = patch.amoledMode;
    if (Object.keys(globalPatch).length > 0) {
      settingsController.updateSettings(globalPatch);
    }
  }

  // Scroll-position memory per sub-page. Without this, navigating
  // Settings → About → back resets the outer scroll container to the
  // top. We snapshot the current scrollTop right before any page change
  // and restore it on the next paint after the new page is in the DOM.
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  useScrollHide(localScrollRef);
  useOverscrollSpring({ scrollContainerRef: localScrollRef });
  const pageScrollPositions = useRef<Record<string, number>>({});
  const pendingRestoreRef = useRef<string | null>(null);
  function snapshotScroll(forPage: SettingsPageId) {
    const el = localScrollRef.current;
    if (el) pageScrollPositions.current[forPage] = el.scrollTop;
  }
  useLayoutEffect(() => {
    const el = localScrollRef.current;
    const target = pendingRestoreRef.current;
    if (target !== null) {
      if (el) el.scrollTop = pageScrollPositions.current[target] ?? 0;
      pendingRestoreRef.current = null;
    }
  }, [page, pageKey]);

  const navigate = (to: SettingsPageId) => {
    snapshotScroll(page);
    pendingRestoreRef.current = to;
    NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: to });
  };

  const goBack = () => {
    snapshotScroll(page);
    pendingRestoreRef.current = 'main';
    const store = useNavigationStore.getState();
    if (store.history.length > 1) {
      NavigationDispatcher.pop();
    } else {
      if (tab === 'profile') {
        NavigationDispatcher.replace({ app: 'hub', tab: 'home' });
      } else {
        NavigationDispatcher.replace({ app: 'hub', tab: 'settings', page: 'main' });
      }
    }
  };

  const goBackRef = useRef(goBack);
  useEffect(() => {
    goBackRef.current = goBack;
  });

  const [devNativeVersion, setDevNativeVersion] = useState<string>('Loading...');
  const [devOtaVersion, setDevOtaVersion] = useState<string>('Loading...');
  const [devBundleId, setDevBundleId] = useState<string>('Loading...');
  const [devVersionCode, setDevVersionCode] = useState<string>('Loading...');
  const [preferencesDump, setPreferencesDump] = useState<string>('Loading...');
  const [localStorageStatus, setLocalStorageStatus] = useState<string>('Loading...');
  const [firebaseVersionJson, setFirebaseVersionJson] = useState<string>('Loading...');
  const [firebaseAppReleaseJson, setFirebaseAppReleaseJson] = useState<string>('Loading...');
  const [verboseLogs, setVerboseLogs] = useState<boolean>(
    () => localStorage.getItem('studio:verboseLogs') === 'true'
  );
  const [installedPackageDetails, setInstalledPackageDetails] = useState<any>(null);
  const [downloadedApkDetails, setDownloadedApkDetails] = useState<any>(null);
  const [apkEligibility, setApkEligibility] = useState<any>(null);

  useEffect(() => {
    if (
      page !== 'developer' &&
      page !== 'debug' &&
      page !== 'download-apps' &&
      page !== 'release-notes'
    )
      return;

    const loadInfo = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          setDevNativeVersion(info.version);
          setDevBundleId(info.id);
          setDevVersionCode(info.build);
        } else {
          setDevNativeVersion('N/A — Web build');
          setDevBundleId('N/A — Web build');
          setDevVersionCode('N/A — Web build');
        }
      } catch (e) {
        setDevNativeVersion('Error loading native info');
        setDevBundleId('Error loading native info');
        setDevVersionCode('Error');
      }

      try {
        if (Capacitor.isNativePlatform()) {
          setDevOtaVersion('disabled');
        } else {
          setDevOtaVersion('N/A — Web build');
        }
      } catch (e) {
        setDevOtaVersion('Error loading Updater info');
      }

      // Load local storage status
      try {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            size += key.length + (localStorage.getItem(key)?.length || 0);
          }
        }
        setLocalStorageStatus(`${localStorage.length} keys (~${(size / 1024).toFixed(2)} KB)`);
      } catch (e) {
        setLocalStorageStatus('Error loading storage info');
      }

      // Load Capacitor Preferences dump
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { keys } = await Preferences.keys();
        const dump: Record<string, string | null> = {};
        for (const k of keys) {
          const { value } = await Preferences.get({ key: k });
          dump[k] = value;
        }
        setPreferencesDump(JSON.stringify(dump, null, 2));
      } catch (e: any) {
        setPreferencesDump(`Error loading Preferences: ${e?.message || String(e)}`);
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const { AppInstaller, checkApkEligibility } = await import('@workspace/livex-core');
          const installed = await AppInstaller.getInstalledAppInfo();
          setInstalledPackageDetails({
            ...installed,
            signatures: installed.signingSha256,
          });

          const apkPath = localStorage.getItem('studio:downloadedApkPath');
          if (apkPath) {
            try {
              const inspected = await AppInstaller.inspectApk({ filePath: apkPath });

              if (!inspected || !inspected.isValidApk) {
                localStorage.removeItem('studio:downloadedApkPath');
                localStorage.removeItem('studio:downloadedApkVersion');
                setDownloadedApkDetails(null);
                setApkEligibility(null);
              } else {
                let sizeStr = 'N/A';
                try {
                  const { Filesystem } = await import('@capacitor/filesystem');
                  const statInfo = await Filesystem.stat({ path: apkPath });
                  sizeStr = `${(statInfo.size / (1024 * 1024)).toFixed(2)} MB (${statInfo.size} bytes)`;
                } catch (e) {
                  console.warn('Error reading APK size for valid APK:', e);
                }

                setDownloadedApkDetails({
                  ...inspected,
                  fileSize: sizeStr,
                  filePath: apkPath,
                });

                const eligibility = await checkApkEligibility(apkPath);
                setApkEligibility(eligibility);
              }
            } catch (apkErr) {
              console.warn('Error loading downloaded APK details:', apkErr);
              localStorage.removeItem('studio:downloadedApkPath');
              localStorage.removeItem('studio:downloadedApkVersion');
              setDownloadedApkDetails(null);
              setApkEligibility(null);
            }
          } else {
            setDownloadedApkDetails(null);
            setApkEligibility(null);
          }
        } catch (err) {
          console.warn('Error loading native package/APK details:', err);
        }
      }
    };

    const loadManifests = async () => {
      const t = Date.now();
      const baseUrl = 'https://studio-30f44.web.app';
      try {
        const r1 = await fetch(`${baseUrl}/version.json?t=${t}`);
        if (r1.ok) {
          const text = await r1.text();
          setFirebaseVersionJson(text);
        } else {
          setFirebaseVersionJson(`Error: HTTP ${r1.status}`);
        }
      } catch (e: any) {
        setFirebaseVersionJson(`Error: ${e.message || String(e)}`);
      }

      try {
        const r2 = await fetch(`${baseUrl}/app-release.json?t=${t}`);
        if (r2.ok) {
          const text = await r2.text();
          setFirebaseAppReleaseJson(text);
        } else {
          setFirebaseAppReleaseJson(`Error: HTTP ${r2.status}`);
        }
      } catch (e: any) {
        setFirebaseAppReleaseJson(`Error: ${e.message || String(e)}`);
      }
    };

    loadInfo();
    loadManifests();
  }, [page]);

  const handleClearUpdateCache = async () => {
    try {
      const filePath = localStorage.getItem('studio:downloadedApkPath');
      if (filePath && Capacitor.isNativePlatform()) {
        const { Filesystem } = await import('@capacitor/filesystem');
        await Filesystem.deleteFile({ path: filePath }).catch(() => {});
      }
      localStorage.removeItem('studio:downloadedApkPath');
      localStorage.removeItem('studio:downloadedApkVersion');
      localStorage.removeItem('studio:downloadedBundleId');
      localStorage.removeItem('studio:downloadedVersions');
      showDevToast('Update cache cleared.');
    } catch (err: any) {
      showDevToast(`Clear failed: ${err.message || String(err)}`);
    }
  };

  const handleClearDismissed = () => {
    localStorage.removeItem('studio:dismissedVersions');
    sessionStorage.removeItem('studio:laterUpdateVersion');
    localStorage.removeItem('studio:notifiedUpdateVersion');
    showDevToast('Dismissed versions cleared.');
  };

  const handleClearApplied = () => {
    localStorage.removeItem('studio:appliedVersions');
    localStorage.removeItem('studio:appliedUpdateVersion');
    if (Capacitor.isNativePlatform()) {
      import('@workspace/livex-core')
        .then(({ AppInstaller }) => {
          AppInstaller.clearInstallerLogHistory();
        })
        .catch((err) => console.error(err));
    }
    showDevToast('Applied versions cleared.');
  };

  const handleResetOta = async () => {
    showDevToast('Updater System: disabled.');
  };

  const handleForceOtaRefresh = async () => {
    showDevToast('Updater System: disabled.');
  };

  const handleTestNotification = async () => {
    try {
      const mockVer = `3.3.0-test-${Date.now()}`;
      showDevToast(`Triggering test notification: ${mockVer}`);
    } catch (err: any) {
      showDevToast(`Notification test failed: ${err.message || String(err)}`);
    }
  };

  const handleTestOtaDetection = async () => {
    try {
      const mockVer = '3.3.1';
      const mockRemote = {
        version: mockVer,
        updateType: 'updater',
        downloadUrl: 'https://example.com/mock-updater.zip',
        changelog: 'Simulated Updater Update Changelog for v3.3.1. Adds sleek developer features.',
        releaseNotes: ['Simulated Updater item 1', 'Simulated Updater item 2'],
      };
      sessionStorage.setItem('studio:mockOtaResponse', JSON.stringify(mockRemote));

      const dismissed = localStorage.getItem('studio:dismissedVersions');
      if (dismissed) {
        try {
          const list = JSON.parse(dismissed);
          localStorage.setItem(
            'studio:dismissedVersions',
            JSON.stringify(list.filter((v: string) => v !== mockVer))
          );
        } catch {}
      }
      showDevToast('Manual update check initiated...');
      await checkForUpdate(true, 'settings_manual', 'manual update check');
    } catch (err: any) {
      showDevToast(`Check failed: ${err.message || String(err)}`);
    }
  };

  const handleTestApkDetection = async () => {
    try {
      const mockVer = '3.3.2';
      const mockRemote = {
        version: mockVer,
        updateType: 'apk',
        apkUrl: 'https://example.com/mock-apk.apk',
        changelog: 'Simulated APK System Update for v3.3.2. Includes Android-specific fixes.',
        apkSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        releaseNotes: ['Simulated APK item 1', 'Simulated APK item 2'],
      };
      sessionStorage.setItem('studio:mockOtaResponse', JSON.stringify(mockRemote));

      const dismissed = localStorage.getItem('studio:dismissedVersions');
      if (dismissed) {
        try {
          const list = JSON.parse(dismissed);
          localStorage.setItem(
            'studio:dismissedVersions',
            JSON.stringify(list.filter((v: string) => v !== mockVer))
          );
        } catch {}
      }
      sessionStorage.removeItem('studio:laterUpdateVersion');

      showDevToast('APK simulation configured. Checking update...');
      await checkForUpdate(true, 'settings_manual', 'dev test check');
    } catch (err: any) {
      showDevToast(`Simulate failed: ${err.message || String(err)}`);
    }
  };

  const getDiagnosticsText = () => {
    const isNativePlat = Capacitor.isNativePlatform();
    const wrapperVersion = updateDebugLogs.nativeApkVersion || 'Unknown';
    const hasMismatch =
      isNativePlat &&
      wrapperVersion !== 'Unknown' &&
      wrapperVersion !== 'N/A' &&
      APP_VERSION !== wrapperVersion;

    return [
      '=== STUDIO DIAGNOSTICS REPORT ===',
      `Timestamp: ${new Date().toISOString()}`,
      `App Version: ${APP_VERSION}`,
      `Device Model: ${Capacitor.isNativePlatform() ? 'Native Device' : 'Web Browser'}`,
      ...(hasMismatch
        ? [
            '',
            'VERSION_MISMATCH_DETECTED',
            `App Version (${APP_VERSION}) does not match APK Wrapper Version (${wrapperVersion})`,
            '',
          ]
        : []),
      '',
      '=== APK UPDATE DIAGNOSTICS ===',
      `App Version: ${APP_VERSION}`,
      `APK Version: ${devNativeVersion}`,
      `versionCode: ${devVersionCode}`,
      `Update System: APK only`,
      `Updater System: disabled`,
      `AppInstaller Available: ${updateDebugLogs.appInstallerAvailable}`,
      `downloadApk Available: ${updateDebugLogs.downloadApkAvailable}`,
      `verifyApkSha256 Available: ${updateDebugLogs.verifyApkSha256Available}`,
      `installApk Available: ${updateDebugLogs.installApkAvailable}`,
      `openInstallPermissionSettings Available: ${updateDebugLogs.openInstallPermissionSettingsAvailable}`,
      `Registered Capacitor Plugins: ${updateDebugLogs.registeredPlugins}`,
      `Plugin Method Check: ${updateDebugLogs.pluginMethodCheck}`,
      `Fetched version.json: ${updateDebugLogs.fetchedVersionJson}`,
      `Fetched app-release.json: ${updateDebugLogs.fetchedAppReleaseJson}`,
      `Update Type: ${updateDebugLogs.updateType}`,
      `Download Status: ${updateDebugLogs.downloadStatus}`,
      `SHA Verification: ${updateDebugLogs.shaVerification}`,
      `File Details: ${updateDebugLogs.fileDetails}`,
      `Install Error / Log: ${updateDebugLogs.installError}`,
      `Installer Launch Status: ${updateDebugLogs.installerLaunchStatus}`,
      `Last Exception Stack Trace: ${updateDebugLogs.lastExceptionStackTrace}`,
      '',
      '=== APK INSTALL DETAILS ===',
      `Exception Message: ${updateDiagnostics.exceptionMessage}`,
      `Failure Reason: ${updateDiagnostics.failureReason}`,
      `Download URL: ${updateDiagnostics.downloadUrl}`,
      `APK Path: ${updateDiagnostics.apkPath}`,
      `File Size: ${updateDiagnostics.fileSize}`,
      `SHA Expected: ${updateDiagnostics.shaExpected}`,
      `SHA Calculated: ${updateDiagnostics.shaCalculated}`,
      `Installer Result: ${updateDiagnostics.installerResult}`,
      `Permission State: ${updateDiagnostics.permissionState}`,
      `Android Version: ${updateDiagnostics.androidVersion}`,
      `Device Model: ${updateDiagnostics.deviceModel}`,
      `Diagnostics Timestamp: ${updateDiagnostics.timestamp}`,
    ].join('\n');
  };

  const handleExportDiagnostics = async () => {
    const content = getDiagnosticsText();
    const filename = `studio-diagnostics-${Date.now()}.txt`;
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: 'utf8' as any,
        });
        showDevToast(`Exported to Documents: ${filename}`);
      } catch (err: any) {
        showDevToast(`Export failed: ${err.message || String(err)}`);
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showDevToast('Diagnostics exported successfully.');
    }
  };

  const cardStyle: React.CSSProperties = isWebDesktop
    ? {
        background: 'transparent',
        borderRadius: '0px',
        overflow: 'visible',
        border: 'none',
      }
    : {
        background: isLight
          ? 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.70))'
          : isAmoled
            ? '#000000'
            : 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
        borderRadius: 'clamp(16px, 2.2vh, 22px)',
        overflow: 'hidden',
        border: isLight
          ? '1px solid rgba(0, 0, 0, 0.06)'
          : isAmoled
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
        WebkitBackdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
        boxShadow: 'var(--shadow-surface-raised)',
      };

  const settingCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: 'clamp(54px, 8.0vh, 72px)',
    padding: 'clamp(8px, 1.4vh, 14px) clamp(14px, 3.6vw, 18px)',
    background: isLight
      ? 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.70))'
      : isAmoled
        ? '#000000'
        : 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
    border: isLight
      ? '1px solid rgba(0, 0, 0, 0.06)'
      : isAmoled
        ? '1px solid rgba(255, 255, 255, 0.12)'
        : '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'clamp(16px, 2.2vh, 22px)',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
    outline: 'none',
    position: 'relative',
    justifyContent: 'space-between',
    boxShadow: 'var(--shadow-surface-raised)',
    overflow: 'hidden',
    backdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
    WebkitBackdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
  };

  const settingIconContainerStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isLight
      ? 'rgba(0, 0, 0, 0.04)'
      : isAmoled
        ? '#000000'
        : 'rgba(255, 255, 255, 0.06)',
    border: isLight
      ? '1px solid rgba(0, 0, 0, 0.06)'
      : isAmoled
        ? '1px solid rgba(255, 255, 255, 0.12)'
        : '1px solid rgba(255, 255, 255, 0.10)',
    boxShadow: isLight
      ? 'inset 0 1px 1px rgba(255, 255, 255, 0.8)'
      : isAmoled
        ? 'none'
        : 'inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
  };

  const slideAnim = slideDir === 'forward' ? 'hub-slide-in' : 'hub-slide-back';
  const subStyle: React.CSSProperties = {
    padding: '0 20px',
    paddingBottom: 'var(--content-bottom-pad)',
    animation: `${slideAnim} 300ms cubic-bezier(0.25,0.46,0.45,0.94) both`,
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    zIndex: 100,
  };





























  function renderMobileProfileCard() {
    const name = authUser?.displayName || 'Guest User';
    const email =
      authUser?.email ||
      (lang === 'es'
        ? 'Inicia sesión para respaldar tu música'
        : 'Sign in to back up your music & settings');
    const photo = customPhoto || authUser?.photoURL;
    const initial = (name[0] ?? 'S').toUpperCase();
    const hasUser = !!authUser;

    return (
      <motion.button
        type="button"
        onClick={() => onProfile?.()}
        whileTap={prefersReduced ? undefined : { scale: 0.985 }}
        whileHover={canHover && !prefersReduced ? { scale: 1.008 } : undefined}
        transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
        className="outline-none"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: 'clamp(54px, 8.0vh, 72px)',
          padding: 'clamp(12px, 1.8vh, 18px) clamp(14px, 3.6vw, 18px)',
          background: isLight
            ? 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.70))'
            : isAmoled
              ? '#000000'
              : 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
          border: isLight
            ? '1px solid rgba(0, 0, 0, 0.06)'
            : isAmoled
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'clamp(16px, 2.2vh, 22px)',
          cursor: 'pointer',
          outline: 'none',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'left',
          boxSizing: 'border-box',
          backdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
          WebkitBackdropFilter: isAmoled ? 'none' : 'var(--surface-float-blur)',
          boxShadow: 'var(--shadow-surface-raised)',
        }}
      >
        {/* Top Specular Rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 14,
            right: 14,
            height: '1px',
            background: 'var(--surface-glass-rim)',
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        />

        {/* Ambient Gradient Glow */}
        <div
          style={{
            position: 'absolute',
            top: -24,
            right: -24,
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${accent.from}22 0%, transparent 70%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            position: 'relative',
            zIndex: 2,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Avatar Squircle / Circle Pod */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid rgba(255, 255, 255, 0.15)`,
              background: `linear-gradient(135deg, ${accent.from}30, ${accent.to}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 16px ${accent.from}30, inset 0 1px 1.5px rgba(255, 255, 255, 0.35)`,
              position: 'relative',
            }}
          >
            {photo ? (
              <img
                src={photo}
                alt=""
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : hasUser ? (
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 850,
                  fontFamily: 'var(--studio-font-display)',
                  color: '#ffffff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {initial}
              </span>
            ) : (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 28, color: 'var(--c-text-secondary)', opacity: 0.9 }} // token-guard-ignore
              >
                account_circle
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 850,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.025em',
                  fontFamily: 'var(--studio-font-display)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasUser ? name : lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
              </h2>
              {hasUser && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${accent.from}30, ${accent.to}25)`,
                    color: '#ffffff',
                    border: `1px solid ${accent.from}50`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    boxShadow: `0 2px 8px ${accent.from}25`,
                  }}
                >
                  Pro
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12.5,
                color: 'var(--c-text-secondary)',
                margin: '2px 0 0',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: 0.82,
              }}
            >
              {email}
            </p>
          </div>
        </div>

        {/* Chevron Pod */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--c-surface-low)',
            border: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            marginLeft: 10,
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 16,
              color: 'var(--c-text-secondary)',
              opacity: 0.7,
            }}
          >
            chevron_right
          </span>
        </div>
      </motion.button>
    );
  }



  function renderActivePageContent(activePageId: SettingsPageId) {
    const pageProps = {
      accent,
      showDevToast,
      openLink: (url: string) => window.open(url, '_blank'),
      user: authUser,
      authUser,
      handleSignOut: () => {
        authRepository.signOut();
      },
      syncStatus,
            clearCacheAndReload: async () => {}, 
      isAmoled,
      isLight,
      langQuery,
      setLangQuery,
      handleLogoTap,
      navigate: (tab: any, params: any) => {}, 
      cardStyle,
      goBack
    };
    switch (activePageId as any) {
      case 'general':
        return <GeneralContent {...pageProps} />;
      case 'updater':
        return (
          <UpdaterSettingsContent
            lang={lang}
            updater={updater}
            accent={accent}
            showDevToast={showDevToast}
            navigate={navigate}
          />
        );
      case 'appearance':
        console.log(
          '[APPEARANCE-RUNTIME-PROOF] StudioHub renderActivePageContent rendering StudioHubSettingsPanel for page: appearance'
        );
        return <StudioHubSettingsPanel />;

      case 'privacy':
        return <PrivacyContent {...pageProps} />;
      case 'about':
        return <AboutContent {...pageProps} />;
      case 'licenses':
        return <LicensesContent {...pageProps} />;
      case 'profile':
        return <Profile {...pageProps} />;
      case 'release-notes':
        return <ReleaseNotesContent {...pageProps} />;
      case 'changelog':
        return <ChangelogContent {...pageProps} />;
      case 'help-center':
        return <HelpCenterContent {...pageProps} />;
      case 'faq':
        return <FaqContent {...pageProps} />;
      case 'terms':
        return <TermsContent {...pageProps} />;
      case 'privacy-policy':
        return <PrivacyPolicyContent {...pageProps} />;
      case 'bug-report':
        return <BugReportContent {...pageProps} />;
      default:
        return <GeneralContent {...pageProps} />;
    }
  }

  /* ── MOBILE DRILL DOWN LAYOUTS ──────────────────────────────────── */
  if (!isWebDesktop) {
    const standardScrollPages: SettingsPageId[] = [
      'general',
      'updater',
      'changelog',
      'appearance',
      'language',
      'privacy',
      'about',
      'debug',
      'profile',
      'release-notes',
      'help-center',
      'faq',
      'terms',
      'privacy-policy',
      'bug-report',
    ];

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <SharedNavigationContainer
          activeView={page}
          viewOrder={[
            'main',
            'general',
            'updater',
            'changelog',
            'appearance',
            'language',
            'privacy',
            'about',
            'debug',
            'profile',
            'release-notes',
            'help-center',
            'faq',
            'terms',
            'privacy-policy',
            'bug-report',
            'developer',
            'notifications',
          ]}
        >
          {(pageId) => {
            if (pageId === 'developer') {
              if (page !== 'developer') return null;
              return (
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: 24,
                        color: 'var(--c-text-secondary)',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Loading Developer Panel...
                    </div>
                  }
                >
                  <DevToolsDashboard accent={accent} onBack={goBack} />
                </Suspense>
              );
            }

            if (standardScrollPages.includes(pageId as SettingsPageId)) {
              const toolbarActions = undefined;

              return (
                <SettingsScaffold
                  title={getPageTitle(pageId as SettingsPageId)}
                  onBack={goBack}
                  toolbarActions={toolbarActions}
                  hideBack={pageId === 'profile'}
                >
                  {renderActivePageContent(pageId as SettingsPageId)}
                </SettingsScaffold>
              );
            }
            if (pageId === 'main') {
              return (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'var(--app-bg)',
                    position: 'relative',
                  }}
                >
                  <SharedFloatingHeader
                    title={lang === 'es' ? 'Ajustes' : 'Settings'}
                    hideBack={true}
                    scrollContainerRef={localScrollRef}
                    isLight={isLight}
                  />

                  <div
                    ref={localScrollRef}
                    data-purpose="hub-settings-scroll-container"
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      padding: '0',
                      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 92px)',
                      paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 80px)',
                      WebkitOverflowScrolling: 'touch',
                    }}
                    className="no-scrollbar"
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 'var(--content-max-w)',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        boxSizing: 'border-box',
                        paddingLeft: 'var(--page-inset-h)',
                        paddingRight: 'var(--page-inset-h)',
                      }}
                    >

                      {/* Minimal Update Card */}
                      {updater.updateAvailable && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            background: `linear-gradient(135deg, ${accent.from}18, ${accent.to}10)`,
                            border: `1px solid ${accent.from}35`,
                            borderRadius: 20,
                            padding: 16,
                            marginBottom: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            boxShadow: `0 6px 24px ${accent.from}14, inset 0 1px 1px rgba(255, 255, 255, 0.20)`,
                            backdropFilter: 'var(--surface-float-blur)',
                            WebkitBackdropFilter: 'var(--surface-float-blur)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: `${accent.from}22`,
                                border: `1px solid ${accent.from}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accent.from,
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 22, lineHeight: 1 }}
                              >
                                system_update
                              </span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: 'var(--c-text-primary)',
                                  fontFamily: 'var(--studio-font-display)',
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                {lang === 'es' ? 'Actualización disponible' : 'Update available'}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: 'var(--c-text-secondary)',
                                  opacity: 0.8,
                                  fontFamily: 'Inter, sans-serif',
                                }}
                              >
                                {lang === 'es' ? 'Versión ' : 'Version '}
                                {updater.remoteVersion}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => navigate('updater')}
                              style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: 12,
                                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 13,
                                fontWeight: 750,
                                fontFamily: 'Inter, sans-serif',
                                cursor: 'pointer',
                                boxShadow: `0 4px 14px ${accent.from}35`,
                              }}
                            >
                              {lang === 'es' ? 'Actualizar' : 'Update'}
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                updater.dismissUpdate();
                              }}
                              style={{
                                padding: '10px 16px',
                                borderRadius: 12,
                                background: isLight
                                  ? 'rgba(0, 0, 0, 0.05)'
                                  : isAmoled
                                    ? '#000000'
                                    : 'rgba(255, 255, 255, 0.06)',
                                border: isLight
                                  ? '1px solid rgba(0, 0, 0, 0.08)'
                                  : isAmoled
                                    ? '1px solid rgba(255, 255, 255, 0.12)'
                                    : '1px solid rgba(255, 255, 255, 0.10)',
                                color: 'var(--c-text-secondary)',
                                fontSize: 13,
                                fontWeight: 650,
                                fontFamily: 'Inter, sans-serif',
                                cursor: 'pointer',
                              }}
                            >
                              {lang === 'es' ? 'Descartar' : 'Dismiss'}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {/* Preferences Group */}
                      <div style={{ marginBottom: 'clamp(16px, 2.4vh, 22px)' }}>
                        <h3
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--c-text-tertiary, #808080)',
                            margin: 0,
                            padding: '0 2px',
                            marginBottom: 8,
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {lang === 'es' ? 'PREFERENCIAS' : 'PREFERENCES'}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'clamp(8px, 1.3vh, 13px)',
                          }}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={() => navigate('appearance')}
                            className="w-full active:scale-[0.975] md:hover:scale-[1.015] md:hover:-translate-y-[1px] transition-transform duration-300 sc-module-card group"
                            style={settingCardStyle}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(12px, 3.2vw, 16px)',
                                minWidth: 0,
                              }}
                            >
                              <div style={settingIconContainerStyle}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ color: isLight ? '#000000' : '#FFFFFF', fontSize: 20 }}
                                >
                                  palette
                                </span>
                              </div>
                              <div
                                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                              >
                                <span
                                  style={{
                                    fontSize: 'clamp(15.5px, 1.95vh, 17px)',
                                    fontWeight: 800,
                                    color: 'var(--c-text-primary)',
                                    fontFamily: 'var(--studio-font-display)',
                                    letterSpacing: '-0.02em',
                                  }}
                                >
                                  {lang === 'es' ? 'Apariencia' : 'Appearance'}
                                </span>
                                <span
                                  style={{
                                    fontSize: 'clamp(12px, 1.45vh, 13px)',
                                    color: 'var(--c-text-secondary)',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    marginTop: '3px',
                                    lineHeight: 1.35,
                                    opacity: 0.85,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {lang === 'es'
                                    ? 'Tema, colores dinámicos, acento'
                                    : 'Theme, dynamic colors, accent'}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              <StudioIcon
                                name="chevron_right"
                                size={20}
                                style={{
                                  color: isLight ? '#000000' : '#FFFFFF',
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Help & Support Group */}
                      <div style={{ marginBottom: 'clamp(16px, 2.4vh, 22px)' }}>
                        <h3
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--c-text-tertiary, #808080)',
                            margin: 0,
                            padding: '0 2px',
                            marginBottom: 8,
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {lang === 'es' ? 'AYUDA Y SOPORTE' : 'HELP & SUPPORT'}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'clamp(8px, 1.3vh, 13px)',
                          }}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={() => navigate('help-center')}
                            className="w-full active:scale-[0.975] md:hover:scale-[1.015] md:hover:-translate-y-[1px] transition-transform duration-300 sc-module-card group"
                            style={settingCardStyle}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(12px, 3.2vw, 16px)',
                                minWidth: 0,
                              }}
                            >
                              <div style={settingIconContainerStyle}>
                                <AnimatedIcon
                                  name="circle-help"
                                  size={20}
                                  color={isLight ? '#000000' : '#FFFFFF'}
                                />
                              </div>
                              <div
                                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                              >
                                <span
                                  style={{
                                    fontSize: 'clamp(15.5px, 1.95vh, 17px)',
                                    fontWeight: 800,
                                    color: 'var(--c-text-primary)',
                                    fontFamily: 'var(--studio-font-display)',
                                    letterSpacing: '-0.02em',
                                  }}
                                >
                                  {lang === 'es' ? 'Ayuda y soporte' : 'Help & Support'}
                                </span>
                                <span
                                  style={{
                                    fontSize: 'clamp(12px, 1.45vh, 13px)',
                                    color: 'var(--c-text-secondary)',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    marginTop: '3px',
                                    lineHeight: 1.35,
                                    opacity: 0.85,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {lang === 'es'
                                    ? 'Documentación y preguntas frecuentes'
                                    : 'Documentation and FAQ'}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              <StudioIcon
                                name="chevron_right"
                                size={20}
                                style={{
                                  color: isLight ? '#000000' : '#FFFFFF',
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* System & About Group */}
                      <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--c-text-tertiary, #808080)',
                            margin: 0,
                            padding: '0 2px',
                            marginBottom: 8,
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {lang === 'es' ? 'SISTEMA Y ACERCA DE' : 'SYSTEM & ABOUT'}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'clamp(8px, 1.3vh, 13px)',
                          }}
                          className="w-full"
                        >
                          {/* Updater Card */}
                          <button
                            type="button"
                            onClick={() => navigate('updater')}
                            className="w-full active:scale-[0.975] md:hover:scale-[1.015] md:hover:-translate-y-[1px] transition-transform duration-300 sc-module-card group"
                            style={settingCardStyle}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(12px, 3.2vw, 16px)',
                                minWidth: 0,
                              }}
                            >
                              <div style={settingIconContainerStyle}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ color: isLight ? '#000000' : '#FFFFFF', fontSize: 20 }}
                                >
                                  system_update
                                </span>
                              </div>
                              <div
                                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span
                                    style={{
                                      fontSize: 'clamp(15.5px, 1.95vh, 17px)',
                                      fontWeight: 800,
                                      color: 'var(--c-text-primary)',
                                      fontFamily: 'var(--studio-font-display)',
                                      letterSpacing: '-0.02em',
                                    }}
                                  >
                                    {lang === 'es' ? 'Actualizador' : 'Updater'}
                                  </span>
                                  {updater.updateAvailable && (
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        display: 'inline-block',
                                        boxShadow: '0 0 6px #ef4444',
                                      }}
                                    />
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: 'clamp(12px, 1.45vh, 13px)',
                                    color: 'var(--c-text-secondary)',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    marginTop: '3px',
                                    lineHeight: 1.35,
                                    opacity: 0.85,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {getUpdaterStatusText(updater, lang)}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              <StudioIcon
                                name="chevron_right"
                                size={20}
                                style={{
                                  color: isLight ? '#000000' : '#FFFFFF',
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                          </button>

                          {/* About Card */}
                          <button
                            type="button"
                            onClick={() => navigate('about')}
                            className="w-full active:scale-[0.975] md:hover:scale-[1.015] md:hover:-translate-y-[1px] transition-transform duration-300 sc-module-card group"
                            style={settingCardStyle}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(12px, 3.2vw, 16px)',
                                minWidth: 0,
                              }}
                            >
                              <div style={settingIconContainerStyle}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ color: isLight ? '#000000' : '#FFFFFF', fontSize: 20 }}
                                >
                                  info
                                </span>
                              </div>
                              <div
                                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                              >
                                <span
                                  style={{
                                    fontSize: 'clamp(15.5px, 1.95vh, 17px)',
                                    fontWeight: 800,
                                    color: 'var(--c-text-primary)',
                                    fontFamily: 'var(--studio-font-display)',
                                    letterSpacing: '-0.02em',
                                  }}
                                >
                                  {lang === 'es' ? 'Acerca de' : 'About'}
                                </span>
                                <span
                                  style={{
                                    fontSize: 'clamp(12px, 1.45vh, 13px)',
                                    color: 'var(--c-text-secondary)',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    marginTop: '3px',
                                    lineHeight: 1.35,
                                    opacity: 0.85,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {lang === 'es'
                                    ? `Versión ${APP_VERSION_LABEL}`
                                    : `Version ${APP_VERSION_LABEL}`}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              <StudioIcon
                                name="chevron_right"
                                size={20}
                                style={{
                                  color: isLight ? '#000000' : '#FFFFFF',
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                          </button>

                          {/* Developer Options Card */}
                          {settings.developerMode && (
                            <button
                              type="button"
                              onClick={() => navigate('developer')}
                              className="w-full active:scale-[0.975] md:hover:scale-[1.015] md:hover:-translate-y-[1px] transition-transform duration-300 sc-module-card group"
                              style={settingCardStyle}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'clamp(12px, 3.2vw, 16px)',
                                  minWidth: 0,
                                }}
                              >
                                <div style={settingIconContainerStyle}>
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ color: isLight ? '#000000' : '#FFFFFF', fontSize: 20 }}
                                  >
                                    terminal
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 'clamp(15.5px, 1.95vh, 17px)',
                                      fontWeight: 800,
                                      color: 'var(--c-text-primary)',
                                      fontFamily: 'var(--studio-font-display)',
                                      letterSpacing: '-0.02em',
                                    }}
                                  >
                                    {lang === 'es'
                                      ? 'Opciones de Desarrollador'
                                      : 'Developer Options'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 'clamp(12px, 1.45vh, 13px)',
                                      color: 'var(--c-text-secondary)',
                                      fontFamily: 'Inter, sans-serif',
                                      fontWeight: 500,
                                      marginTop: '3px',
                                      lineHeight: 1.35,
                                      opacity: 0.85,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {lang === 'es'
                                      ? 'Herramientas de depuración'
                                      : 'Debug tools & metrics'}
                                  </span>
                                </div>
                              </div>
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginLeft: 8,
                                }}
                              >
                                <StudioIcon
                                  name="chevron_right"
                                  size={20}
                                  style={{
                                    color: isLight ? '#000000' : '#FFFFFF',
                                    opacity: 0.5,
                                  }}
                                />
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        </SharedNavigationContainer>
        {renderToastElement()}
      </div>
    );
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'var(--surface-float-blur)',
        WebkitBackdropFilter: 'var(--surface-float-blur)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setTab('home');
        }
      }}
    >
      <style>{HUB_SETTINGS_CSS}</style>
      <style>{`
        @keyframes hub-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes settings-content-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .settings-content-animate {
          animation: settings-content-fade-in 150ms ease both;
        }
        .settings-desktop-layout .flex.items-center.justify-between.gap-4 {
          padding-left: 0px !important;
          padding-right: 0px !important;
        }
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="padding-left: 28px"],
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="paddingLeft: 28px"],
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="28px"] {
          padding-left: 12px !important;
        }
        .settings-desktop-layout div[style*="border-bottom"],
        .settings-desktop-layout div[style*="borderBottom"] {
          border-bottom: 1px solid rgba(128, 128, 128, 0.08) !important;
        }
        .settings-desktop-layout button.btn-smooth:not(.active-settings-nav):hover {
          background: var(--sidebar-hover-bg, rgba(255, 255, 255, 0.04)) !important;
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          width: '880px',
          height: '640px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: 'var(--app-surface, rgba(18, 18, 18, 0.95))',
          border: '1px solid rgba(128, 128, 128, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          animation: 'hub-modal-fade-in 250ms ease both',
        }}
        className="settings-desktop-layout"
      >
        {/* Left Pane: Sub-navigation */}
        <div
          style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid rgba(128, 128, 128, 0.08)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <button
            onClick={() => setTab('home')}
            className="btn-smooth"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(128, 128, 128, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--c-text-primary)',
              marginBottom: 16,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>

          <div
            style={{
              padding: '0 8px 16px 8px',
              borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-page-title)',
                fontWeight: 800,
                color: 'var(--c-text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--studio-font-display)',
              }}
            >
              {lang === 'es' ? 'Ajustes de Livex' : 'Livex Settings'}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {sections.map((section, secIdx) => (
              <div key={section.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {secIdx > 0 && (
                  <div
                    style={{
                      height: 1,
                      borderTop: '1px solid rgba(128,128,128,0.08)',
                      margin: '4px 0 10px 0',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 'var(--font-section-label)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--c-text-secondary)',
                    opacity: 0.6,
                    padding: '0 12px 4px 12px',
                  }}
                >
                  {section.label}
                </span>
                {section.items.map((item) => {
                  const isActive = activePageId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`btn-smooth ${isActive ? 'active-settings-nav' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: isActive
                          ? 'var(--sidebar-hover-bg, rgba(255, 255, 255, 0.08))'
                          : 'transparent',
                        color: isActive ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 13,
                        fontFamily: 'var(--type-nav-font, var(--studio-font-body))',
                      }}
                    >
                      <AnimatedIcon
                        name={item.icon}
                        size={16}
                        color={isActive ? accent.from : 'var(--c-text-secondary)'}
                        state={isActive ? 'active' : 'inactive'}
                      />
                      <span className="truncate" style={{ flex: 1 }}>
                        {item.label}
                      </span>
                      {item.id === 'updater' && updater.updateAvailable && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#ef4444',
                            marginRight: 4,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Content */}
        <div
          style={{
            flex: 1,
            padding: 'var(--space-8) var(--space-12)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div
            key={activePageId}
            className="settings-content-animate"
            style={{ maxWidth: 'var(--content-max-w)', width: '100%', margin: '0 auto' }}
          >
            <div
              style={{
                marginBottom: 28,
                borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
                paddingBottom: 16,
              }}
            >
              <h1
                style={{
                  fontSize: 'var(--font-display-page)',
                  fontWeight: 800,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.03em',
                  fontFamily: 'var(--studio-font-display)',
                }}
              >
                {getPageTitle(activePageId)}
              </h1>
            </div>

            <Suspense
              fallback={
                <div style={{ color: 'var(--c-text-secondary)', fontSize: 14 }}>
                  Loading settings...
                </div>
              }
            >
              {renderActivePageContent(activePageId)}
            </Suspense>
          </div>
        </div>

        <ChangelogSheet open={changelogOpen} onClose={() => setChangelogOpen(false)} />
        {renderToastElement()}
      </div>
    </div>,
    document.body
  );
}

export default HubSettings;
