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
import { Button, StatefulButton } from '../../../../shared/design-system/buttons';
import { AnimatedIcon } from '../../../../shared/icons/AnimatedIcon';
import { SpotlightLogo } from '../../../../components/spotlight-logo';
import { StudioPageTransition } from '../../../../components/StudioPageTransition';
import { ProgressiveBlur } from '../../../../shared/design-system/ProgressiveBlur';
import { useHoverCapable } from '../../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';
import { ActionButton } from '../../../../shared/design-system/StudioDesignSystem';
import {
  SettingSection,
  SettingRow,
  SegmentedControl,
  Toggle,
} from '../../../../shared/settings/SettingControls';
import {
  SettingsScaffold,
  SettingsContentContainer,
  SharedFloatingHeader,
} from '../../../../shared/layout/StudioLayoutSystem';
import { useOverscrollSpring } from '../../../../shared/layout/useOverscrollSpring';
import { StudioHeader } from '../../../../shared/layout/StudioHeader';
import { SharedNavigationContainer } from '../../../../navigation/SharedNavigationContainer';
import {
  LanguagePickerSheet,
  SUPPORTED_LANGUAGES,
} from '../../../../shared/settings/LanguagePickerSheet';
import { ThemeToggle } from '../../../../components/motion/theme-toggle';
import ChangelogSheet from '../../../chordex/components/ChangelogSheet';
import StudioHubSettingsPanel from '.././StudioHubSettingsPanel';
import {
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../../chordex/icons/ChordexLogo';
import AccountCard, {
  AccountSettingsPage,
} from '../../../auth/components/AccountCard';
import { AccountDangerZone } from '../../../auth/components/settings/AccountDangerZone';
const DevToolsDashboard = lazy(() => import('../../../devtools/components/DevToolsDashboard'));
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
} from '../../components/hubConstants';
import { HelpAccordion } from '../../components/faqConstants';
import { ChangelogView } from '../../components/HubChangelogView';

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

import { SettingsSectionLabel, SettingsNavRow } from '../components/SettingsRows';


export function AboutContent(props: any) {
  const { prefersReduced, canHover, accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const [copiedLogs, setCopiedLogs] = useState(false);
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      hapticFeedback: state.settings.hapticFeedback,
      highRefreshRate: state.settings.highRefreshRate,
      lowLatencyMode: state.settings.lowLatencyMode,
      performanceMode: state.settings.performanceMode,
  })));
  const updateSettings = useSettingsStore((state: any) => state.updateSettings);
  const updatePerApp = useSettingsStore((state: any) => state.updatePerApp);
  const { preferences, setPreference } = useStudioPreferences();
  const lang = settings.language ?? 'en';
  const t = useT();
  const tr = t as any;
  const isWebDesktop = useIsWebDesktop();
  const updater = useAppUpdate();
  const subAppLogos: { key: string; node: React.ReactNode; label: string }[] = [
      { key: 'chordex', label: 'Chordex', node: <ChordexLogo size={34} /> },
      { key: 'drumex', label: 'Drumex', node: <DrumexLogo size={34} /> },
      { key: 'stagex', label: 'Stagex', node: <StagexLogoIcon size={34} /> },
      { key: 'groovex', label: 'Groovex', node: <GroovexLogo size={34} /> },
      { key: 'vocalex', label: 'Vocalex', node: <VocalexLogo size={34} /> },
    ];

    

    const heroCardStyle: React.CSSProperties = isWebDesktop
      ? {
          background: 'transparent',
          borderRadius: '0px',
          border: 'none',
          padding: 'var(--space-6) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }
      : {
          ...cardStyle,
          background: isAmoled ? '#000000' : cardStyle.background,
          padding: 'var(--space-6) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        };

    return (
      <SettingsContentContainer style={{ paddingBottom: 'var(--space-6)' }}>
        <div style={heroCardStyle} data-about-hero="true">
          <SpotlightLogo onClick={handleLogoTap} />
          <p
            style={{
              margin: 'var(--space-4) 0 0',
              fontFamily: 'var(--studio-font-display)',
              fontWeight: 800,
              fontSize: 'var(--font-display-sm)',
              letterSpacing: '-0.03em',
              color: 'var(--c-text-primary)',
              lineHeight: 1.1,
            }}
          >
            Livex
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'Inter',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              fontWeight: 500,
            }}
          >
            {t.settings.about.version} {APP_VERSION_LABEL}
          </p>
          <p
            style={{
              margin: 'var(--space-3.5) 0 0',
              fontFamily: 'Inter',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
              padding: '0 8px',
            }}
          >
            {lang === 'es'
              ? 'Suite de producción musical todo en uno. Graba, mezcla, sintetiza y compone pistas directamente en tu dispositivo.'
              : 'All-in-one music production suite. Record, mix, synthesize, and compose tracks directly on your device.'}
          </p>
        </div>

        <div style={cardStyle}>
          {[
            {
              title: lang === 'es' ? 'Condiciones de Servicio' : 'Terms of Service',
              icon: 'gavel',
              page: 'terms' as SettingsPageId,
            },
            {
              title: lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy',
              icon: 'security',
              page: 'privacy-policy' as SettingsPageId,
            },
            {
              title: lang === 'es' ? 'Licencias de Software' : 'Software Licenses',
              icon: 'receipt_long',
              page: 'licenses' as SettingsPageId,
            },
          ].map(({ title, icon, page }) => (
            <motion.button
              key={page}
              onClick={() => navigate(page)}
              whileTap={prefersReduced ? undefined : { scale: 0.985 }}
              whileHover={canHover && !prefersReduced ? { scale: 1.006 } : undefined}
              transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
              className="hover:bg-white/5 transition-colors"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '14px 16px',
                borderBottom: '1px solid var(--c-border)',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--c-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {icon}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--type-body-font, var(--studio-font-body))',
                    fontWeight: 750,
                    fontSize: 14,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </span>
              </div>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 15, color: 'var(--c-text-secondary)', opacity: 0.6 }}
                >
                  chevron_right
                </span>
              </div>
            </motion.button>
          ))}

          <motion.button
            onClick={() => window.open('https://github.com/MAGEXE1000/Livex', '_system')}
            whileTap={prefersReduced ? undefined : { scale: 0.985 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.006 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            className="hover:bg-white/5 transition-colors"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--c-text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-text-secondary)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  code
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--type-body-font, var(--studio-font-body))',
                  fontWeight: 750,
                  fontSize: 14,
                  letterSpacing: '-0.01em',
                }}
              >
                {lang === 'es' ? 'Créditos y Repositorio' : 'Credits & GitHub'}
              </span>
            </div>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 15, color: 'var(--c-text-secondary)', opacity: 0.6 }}
              >
                open_in_new
              </span>
            </div>
          </motion.button>
        </div>

        <div
          style={{
            padding: '16px 0 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 32,
              height: 2,
              borderRadius: 999,
              background: 'rgba(128,128,128,0.25)',
              marginBottom: 4,
            }}
          />
          <p
            style={{
              color: 'var(--c-text-muted)',
              fontFamily: 'var(--type-body-font, var(--studio-font-body))',
              fontWeight: 700,
              fontSize: 'var(--font-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              margin: 0,
            }}
          >
            {t.settings.about.footer}
          </p>
        </div>
      </SettingsContentContainer>
    );
}

