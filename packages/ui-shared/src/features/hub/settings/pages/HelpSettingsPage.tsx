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
  APP_VERSION_LABEL,
  APP_VERSION_TAG,
  APP_VERSION_DATE,
  compareSemver,
  APP_VERSION,
  fadeToBlackAndReload,
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
  StartupCoordinator,
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

export type SettingsPageId =
  | 'main'
  | 'general'
  | 'appearance'
  | 'language'
  | 'privacy'
  | 'about'
  | 'notifications'
  | 'debug'
  | 'developer'
  | 'profile'
  | 'help-center'
  | 'faq'
  | 'keyboard-shortcuts'
  | 'terms'
  | 'privacy-policy'
  | 'bug-report'
  | 'personal-info'
  | 'security-login'
  | 'subscription'
  | 'devices-sessions'
  | 'privacy-data'
  | 'licenses';

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


export function HelpContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
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
  return (
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 8 }}
      >
        <HelpAccordion accent={accent} lang={lang} />
      </div>
    );
}

export function HelpCenterContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  return <HelpAccordion accent={accent} lang={lang} />;
}

export function FaqContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <HelpAccordion accent={accent} lang={lang} />
      </div>
    );
}

export function KeyboardShortcutsContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  const categories = [
      {
        title: 'Stage Mode (Stagex)',
        shortcuts: [
          { keys: ['Space', '→', '↓'], desc: 'Advance to next scene (Forward)' },
          { keys: ['←', '↑'], desc: 'Go back to previous scene (Backward)' },
          { keys: ['Esc'], desc: 'Close Stage Mode / Exit fullscreen' },
        ],
      },
      {
        title: 'Sequencer & Editing (Drumex)',
        shortcuts: [
          { keys: ['Ctrl', 'Z'], desc: 'Undo last editing step' },
          { keys: ['Ctrl', 'Y'], desc: 'Redo last undone step' },
          { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo last undone step (Alternative)' },
        ],
      },
    ];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          paddingBottom: 'var(--space-6)',
        }}
      >
        {categories.map((cat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3
              style={{
                fontSize: 'var(--font-section-label)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--c-text-secondary)',
                opacity: 0.6,
                margin: 0,
              }}
            >
              {cat.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.shortcuts.map((sh, j) => (
                <div
                  key={j}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(128, 128, 128, 0.06)',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{sh.desc}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {sh.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        {kIdx > 0 && (
                          <span
                            style={{
                              color: 'var(--c-text-muted)',
                              fontSize: 12,
                              alignSelf: 'center',
                            }}
                          >
                            +
                          </span>
                        )}
                        <kbd
                          style={{
                            padding: '3px 6px',
                            border: '1px solid rgba(128, 128, 128, 0.2)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            borderRadius: 4,
                            fontSize: 'var(--font-section-label)',
                            fontWeight: 700,
                            color: 'var(--c-text-primary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
}

export function TermsContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  return (
      <SettingsContentContainer
        style={{
          fontSize: 13,
          color: 'var(--c-text-secondary)',
          lineHeight: 1.6,
          paddingBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            ...cardStyle,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--c-text-secondary)',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Welcome to Livex. By accessing or using our application, you agree to comply with and
            be bound by the following Terms of Service. Please read them carefully.
          </p>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              1. Ownership of Content
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              All musical patterns, drum sequences, settings, and other project data created by you
              using Livex's tools (Chordex, Drumex, Stagex, Groovex, Vocalex) remain entirely your
              property. We lay no claim of copyright, trademark, or ownership over your creative
              output.
            </p>
          </div>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              2. Use of Service
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              Livex is provided on a local-first basis. Data sync features are provided for your
              personal backup convenience. You agree not to abuse or attempt to overload the sync
              servers.
            </p>
          </div>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              3. Disclaimer of Warranties
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              Livex is provided "as is" and "as available" without any warranties of any kind.
              While we aim to protect project data using reliable local storage and cloud sync
              mechanisms, we cannot guarantee data will not be lost. We recommend periodic manual
              backups.
            </p>
          </div>
        </div>
      </SettingsContentContainer>
    );
}

export function PrivacyPolicyContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  return (
      <SettingsContentContainer
        style={{
          fontSize: 13,
          color: 'var(--c-text-secondary)',
          lineHeight: 1.6,
          paddingBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            ...cardStyle,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--c-text-secondary)',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Your privacy is extremely important to us. This Privacy Policy details how Livex
            collects, uses, and safeguards your data.
          </p>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              1. Local-First Storage
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              By default, all your project settings, drum sequences, and songs are stored locally on
              your device using IndexedDB and localStorage. None of this creative work leaves your
              device unless you explicitly enable Cloud Sync.
            </p>
          </div>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              2. Cloud Backup & Authentication
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              If you create a Livex Account, we use Firebase to manage your login credentials. Your
              project backups are stored securely in Firestore databases. We only use this data to
              perform cross-device syncing at your request.
            </p>
          </div>
          <div>
            <h4
              style={{
                color: 'var(--c-text-primary)',
                margin: '0 0 4px 0',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.015em',
              }}
            >
              3. No Third-Party Tracking
            </h4>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
                opacity: 0.85,
              }}
            >
              Livex does not use telemetry, advertising trackers, or external behavioral analytics.
              Your interaction with the app remains entirely private.
            </p>
          </div>
        </div>
      </SettingsContentContainer>
    );
}

export function BugReportContent(props: any) {
  const { accent, showDevToast, openLink, user, authUser, handleSignOut, syncStatus, cachedStorageSize, clearCacheAndReload, isAmoled, isLight, langQuery, setLangQuery, handleLogoTap, navigate, cardStyle, goBack } = props;
  const [copiedBugTemplate, setCopiedBugTemplate] = useState(false);
  const settings = useSettingsStore(useShallow((state: any) => ({
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
      perApp: state.settings.perApp,
      language: state.settings.language,
      developerMode: state.settings.developerMode,
      swipeBackBehavior: state.settings.swipeBackBehavior,
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
  return <HelpCenterContent {...props} />;
}

