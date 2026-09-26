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

import { SettingsSectionLabel, SettingsNavRow } from '../HubSettings';


export function PrivacyContent(props: any) {
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
  const updater = useAppUpdate();
  return (
      <SettingsContentContainer style={{ paddingBottom: 'var(--space-6)' }}>
        <SettingsSectionLabel>
          {(t.hub as { studioSettings?: { accountControls?: string } }).studioSettings
            ?.accountControls ?? 'Account Controls'}
        </SettingsSectionLabel>
        <Suspense fallback={null}>
          <AccountDangerZone accent={accent} cardStyle={cardStyle} />
        </Suspense>
      </SettingsContentContainer>
    );
}

