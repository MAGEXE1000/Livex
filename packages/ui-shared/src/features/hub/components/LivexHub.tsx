import { Capacitor } from '@capacitor/core';
import { Button, StatefulButton } from '../../../shared/design-system/buttons';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { LivexIcon, StudioIcon } from '../../../shared/icons/LivexIcon';
import { subscribeIntroDone } from '../../../shared/animation/introSignal';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import {
  useBackHandler,
  type AuthUser,
  pushLocalSettingsToCloud,
  pullCloudSettingsFromCloud,
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  type AnimationSpeed,
  type DisplayDensity,
  type AppKey,
  type PerAppVisuals,
  useNavHidden,
  useScrollHide,
  setNavHidden,
  useT,
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
  useApplicationTransitionStore,
  useSettingsStore,
  DurationPresets,
  EasingPresets,
  SpringPresets,
  authRepository,
} from '@workspace/livex-core';
import {
  getUpdateHistory,
  StartupCoordinator,
  startDiagnosticsSession,
  resetUpdateTimeline,
  getTimelineReport,
  getUserCover,
  subscribeUserCover,
} from '@workspace/livex-core';
import React, { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  motionValue,
  animate,
  Reorder,
} from 'motion/react';
import {
  LivexLogo,
  StudioLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../chordex/icons/ChordexLogo';
import { TuningForkIcon } from '../../chordex/components/tuner/TuningForkIcon';
import { SpotlightLogo } from '../../../components/spotlight-logo';

const HubSettings = lazy(() => import('../settings/HubSettings'));
const HubHelp = lazy(() => import('./HubHelp'));
import {
  Toggle,
  SectionHeader,
  SettingRow,
  SegmentedControl,
  BentoSettingCard,
  BentoSettingRow,
  SettingSection,
} from '../../../shared/settings/SettingControls';
import {
  SHARED_NAV_TRANSITION,
  getSharedNavTransform,
  getSharedNavOpacity,
} from '../navigation/navStyles';
import ProfileDropdown from '../../auth/components/ProfileDropdown';
import SmartLoading from '../../../shared/loading/SmartLoading';
import { LivexHeader, StudioHeader } from '../../../shared/layout/LivexHeader';
import { SharedNavigationBar } from '../navigation/SharedNavigationBar';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';
import { useStagexStore } from '../../stagex/state/useStagexStore';

const isHoverable = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
const GOOEY_SPRING = { type: 'spring', stiffness: 550, damping: 33, mass: 0.45 } as const;

const settingsController = {
  updateSettings: (patch: any) => useSettingsStore.getState().updateSettings(patch),
};
const syncController = {
  syncNow: async () => {
    await pushLocalSettingsToCloud();
    await pullCloudSettingsFromCloud();
  },
};

import AccountCard, {
  AccountDangerZone,
  AccountSettingsPage,
} from '../../auth/components/AccountCard';
import { AssistantChatView } from '../../assistant/pages/AssistantChatView';

import {
  HubTab,
  HelpPageId,
  TargetApp,
  THEME_OPTIONS,
  TimeWord,
  TIME_GREETING_ES,
  GreetingPair,
  _NAMED_PAIRS_EN,
  _NAMED_PAIRS_ES,
  _ANON_PAIRS_EN,
  _ANON_PAIRS_ES,
  Theme,
  getSessionIndex,
} from './hubConstants';
import { FAQ_ITEMS, HelpAccordion } from './faqConstants';
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from '../../../components/motion/bouncy-accordion';

export interface ShortcutOption {
  id: string;
  icon: string;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  app: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex';
}

function renderShortcutIcon(
  icon: string,
  size: number = 15,
  color: string = 'var(--c-text-secondary)'
) {
  if (icon === 'tuning-fork' || icon === 'tuner') {
    return <TuningForkIcon size={size} color={color} style={{ color }} />;
  }
  return <AnimatedIcon name={icon} size={size} color={color} />;
}

const ALL_SHORTCUT_OPTIONS: ShortcutOption[] = [
  // ── Global / Hub ──────────────────────────────────
  {
    id: 'settings',
    icon: 'settings',
    titleEn: 'Settings',
    titleEs: 'Ajustes',
    descEn: 'App preferences & visual theme',
    descEs: 'Preferencias y temas visuales',
    app: 'hub',
  },
  {
    id: 'notifications',
    icon: 'bell',
    titleEn: 'Notifications',
    titleEs: 'Notificaciones',
    descEn: 'System alerts and update logs',
    descEs: 'Alertas del sistema y avisos',
    app: 'hub',
  },
  {
    id: 'updater',
    icon: 'refresh-cw',
    titleEn: 'Check Updates',
    titleEs: 'Buscar Actualizaciones',
    descEn: 'Check and install app updates',
    descEs: 'Buscar e instalar actualizaciones',
    app: 'hub',
  },

  // ── Chordex ───────────────────────────────────────
  {
    id: 'chordex-songs',
    icon: 'audio-lines',
    titleEn: 'Chordex Songs',
    titleEs: 'Canciones Chordex',
    descEn: 'Song chord charts & repertoire',
    descEs: 'Cifrados de canciones y repertorio',
    app: 'chordex',
  },
  {
    id: 'chordex-library',
    icon: 'gallery-vertical-end',
    titleEn: 'Chordex Library',
    titleEs: 'Biblioteca Chordex',
    descEn: 'Chord voicings, shapes & scales',
    descEs: 'Acordes, digitaciones y escalas',
    app: 'chordex',
  },
  {
    id: 'chordex-tuner',
    icon: 'tuning-fork',
    titleEn: 'Chromatic Tuner',
    titleEs: 'Afinador Cromático',
    descEn: 'High-precision instrument pitch tuner',
    descEs: 'Afinador de instrumentos de alta precisión',
    app: 'chordex',
  },
  {
    id: 'chordex-practice',
    icon: 'music',
    titleEn: 'Chordex Practice',
    titleEs: 'Práctica de Acordes',
    descEn: 'Train chord changes & drills',
    descEs: 'Entrena cambios y progresiones',
    app: 'chordex',
  },

  // ── Drumex ────────────────────────────────────────
  {
    id: 'drumex-beats',
    icon: 'drum',
    titleEn: 'Drumex Beats',
    titleEs: 'Beats de Batería',
    descEn: 'Step sequencer drum patterns',
    descEs: 'Secuenciador por pasos y ritmos',
    app: 'drumex',
  },
  {
    id: 'drumex-patterns',
    icon: 'blocks',
    titleEn: 'Drumex Patterns',
    titleEs: 'Patrones Drumex',
    descEn: 'Preset rhythm library & styles',
    descEs: 'Catálogo de ritmos y estilos',
    app: 'drumex',
  },
  {
    id: 'drumex-metronome',
    icon: 'clock',
    titleEn: 'Drumex Metronome',
    titleEs: 'Metrónomo Drumex',
    descEn: 'Precision tempo & click trainer',
    descEs: 'Entrenador de tempo y claqueta',
    app: 'drumex',
  },

  // ── Stagex ────────────────────────────────────────
  {
    id: 'stagex-stage',
    icon: 'layout-panel-top',
    titleEn: 'Stage Plot',
    titleEs: 'Plano de Escenario',
    descEn: 'Interactive stage placement canvas',
    descEs: 'Distribución espacial del escenario',
    app: 'stagex',
  },
  {
    id: 'stagex-setlist',
    icon: 'layers',
    titleEn: 'Stage Setup: Setlist',
    titleEs: 'Stagex: Setlist en Vivo',
    descEn: 'Live show order & song durations',
    descEs: 'Orden del show y duraciones',
    app: 'stagex',
  },
  {
    id: 'stagex-rider',
    icon: 'file-text',
    titleEn: 'Stage Setup: Rider',
    titleEs: 'Stagex: Rider Técnico',
    descEn: 'Input channel list & technical patch',
    descEs: 'Lista de canales y patch técnico',
    app: 'stagex',
  },
  {
    id: 'stagex-gear',
    icon: 'grip',
    titleEn: 'Stage Setup: Gear',
    titleEs: 'Stagex: Inventario de Equipos',
    descEn: 'Stage instruments & hardware gear',
    descEs: 'Equipamiento físico y accesorios',
    app: 'stagex',
  },
  {
    id: 'stagex-crew',
    icon: 'users',
    titleEn: 'Stage Setup: Crew',
    titleEs: 'Stagex: Banda y Crew',
    descEn: 'Musicians, techs & stage roster',
    descEs: 'Músicos, técnicos y personal',
    app: 'stagex',
  },

  // ── GrooveX ───────────────────────────────────────
  {
    id: 'groovex-library',
    icon: 'layers',
    titleEn: 'GrooveX Library',
    titleEs: 'Biblioteca GrooveX',
    descEn: 'Backing tracks & audio catalog',
    descEs: 'Pistas de fondo y catálogo de audio',
    app: 'groovex',
  },
  {
    id: 'groovex-player',
    icon: 'disc',
    titleEn: 'GrooveX Player',
    titleEs: 'Reproductor GrooveX',
    descEn: 'Turntable vinyl deck player',
    descEs: 'Reproductor de vinilo y pistas',
    app: 'groovex',
  },

  // ── Vocalex ───────────────────────────────────────
  {
    id: 'vocalex-coach',
    icon: 'graduation-cap',
    titleEn: 'Vocalex Coach',
    titleEs: 'Entrenador Vocalex',
    descEn: 'Vocal warmups & pitch training',
    descEs: 'Calentamiento vocal y ejercicios',
    app: 'vocalex',
  },
  {
    id: 'vocalex-takes',
    icon: 'clapperboard',
    titleEn: 'Vocalex Takes',
    titleEs: 'Tomas Vocalex',
    descEn: 'Recorded vocal takes & analysis',
    descEs: 'Tomas grabadas y estabilidad',
    app: 'vocalex',
  },
];

const SHORTCUT_LABEL_MAP: Record<string, { en: string; es: string }> = {
  // Global / Hub
  settings: { en: 'Settings', es: 'Ajustes' },
  notifications: { en: 'Alerts', es: 'Alertas' },
  updater: { en: 'Updates', es: 'Actualiz.' },

  // Chordex
  'chordex-songs': { en: 'Songs', es: 'Canciones' },
  'chordex-library': { en: 'Library', es: 'Biblioteca' },
  'chordex-tuner': { en: 'Tuner', es: 'Afinador' },
  tuner: { en: 'Tuner', es: 'Afinador' },
  'chordex-practice': { en: 'Practice', es: 'Práctica' },

  // Drumex
  'drumex-beats': { en: 'Beats', es: 'Beats' },
  'drumex-patterns': { en: 'Patterns', es: 'Patrones' },
  'drumex-metronome': { en: 'Metronome', es: 'Metrónomo' },
  'drumex-grooves': { en: 'Patterns', es: 'Patrones' },

  // Stagex
  'stagex-stage': { en: 'Stage Plot', es: 'Escenario' },
  'stagex-setlist': { en: 'Setlist', es: 'Setlist' },
  'stagex-rider': { en: 'Rider', es: 'Rider' },
  'stagex-gear': { en: 'Gear', es: 'Equipos' },
  'stagex-crew': { en: 'Crew', es: 'Banda' },

  // GrooveX
  'groovex-library': { en: 'Library', es: 'Biblioteca' },
  'groovex-player': { en: 'Groovex', es: 'Groovex' },

  // Vocalex
  'vocalex-coach': { en: 'Coach', es: 'Entrenador' },
  'vocalex-takes': { en: 'Takes', es: 'Tomas' },

  // Legacy mappings for backward compatibility
  'chords-songs': { en: 'Songs', es: 'Canciones' },
  'chords-practice': { en: 'Practice', es: 'Práctica' },
  drumex: { en: 'Beats', es: 'Beats' },
  stagex: { en: 'Stage Plot', es: 'Escenario' },
  groovex: { en: 'Groovex', es: 'Groovex' },
  'stage-setlist': { en: 'Setlist', es: 'Setlist' },
  'stage-gear': { en: 'Gear', es: 'Equipos' },
  'stage-members': { en: 'Crew', es: 'Banda' },
};

const LEGACY_SHORTCUT_MAP: Record<string, string> = {
  'chords-songs': 'chordex-songs',
  'chords-practice': 'chordex-practice',
  tuner: 'chordex-tuner',
  'chordex-tuning': 'chordex-tuner',
  drumex: 'drumex-beats',
  'drumex-grooves': 'drumex-patterns',
  stagex: 'stagex-stage',
  groovex: 'groovex-player',
  'vocalex-pitch': 'vocalex-coach',
  'stage-setlist': 'stagex-setlist',
  'stage-gear': 'stagex-gear',
  'stage-members': 'stagex-crew',
  developer: 'settings',
  help: 'settings',
  faq: 'settings',
  sync: 'settings',
  backup: 'settings',
  appearance: 'settings',
  language: 'settings',
  diagnostics: 'settings',
  'keyboard-shortcuts': 'settings',
  'bug-report': 'settings',
};

const DEFAULT_SHORTCUTS = [
  'chordex-songs',
  'chordex-tuner',
  'drumex-metronome',
  'stagex-setlist',
  'settings',
];

function getGreetingPair(name?: string, idx?: number, lang: string = 'en'): GreetingPair {
  const h = new Date().getHours();
  const timeWord = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const i = idx ?? 0;

  if (name?.trim()) {
    const pairs = lang === 'es' ? _NAMED_PAIRS_ES : _NAMED_PAIRS_EN;
    const fn = pairs[i % pairs.length];
    return fn(name.trim(), timeWord);
  }

  const anonPairs = lang === 'es' ? _ANON_PAIRS_ES : _ANON_PAIRS_EN;
  const pair = anonPairs[i % anonPairs.length];
  if (lang === 'es') {
    return {
      ...pair,
      greeting:
        pair.greeting === 'Buenos días.'
          ? `${TIME_GREETING_ES[timeWord as TimeWord]}.`
          : pair.greeting,
    };
  }
  return {
    ...pair,
    greeting: pair.greeting === 'Good morning.' ? `Good ${timeWord}.` : pair.greeting,
  };
}

let _sessionIntroFinished = false;

function useStartupComplete() {
  const [complete, setComplete] = useState(() => StartupCoordinator.isStartupComplete());

  useEffect(() => {
    if (complete) return;
    return StartupCoordinator.subscribeStartupComplete(() => {
      setComplete(true);
    });
  }, [complete]);

  return complete;
}

const HubGreetingsHeader = React.memo(function HubGreetingsHeader({
  greeting,
  subtitle,
  canHover,
  prefersReduced,
}: {
  greeting: string;
  subtitle: string;
  canHover: boolean;
  prefersReduced: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '0',
      }}
    >
      <section
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--page-header-title-subtitle-gap, 4px)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--studio-font-display)',
            fontWeight: 850,
            color: 'var(--c-text-primary)',
            letterSpacing: 'var(--page-header-title-tracking, -0.03em)',
            fontSize: 'var(--page-header-title-size, 28px)',
            lineHeight: 'var(--page-header-title-line-height, 1.15)',
            margin: 0,
          }}
        >
          {greeting}
        </h2>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            color: 'var(--c-text-secondary)',
            fontSize: 'var(--page-header-subtitle-size, 13px)',
            fontWeight: 500,
            lineHeight: 'var(--page-header-subtitle-line-height, 1.4)',
            letterSpacing: '-0.01em',
            margin: 0,
            opacity: 0.82,
          }}
        >
          {subtitle}
        </p>
      </section>
      <motion.div
        whileHover={canHover && !prefersReduced ? { scale: 1.05 } : undefined}
        whileTap={prefersReduced ? undefined : { scale: 0.94 }}
        transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 25 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: 16,
          cursor: 'pointer',
        }}
      >
        <StudioLogo size={32} />
      </motion.div>
    </div>
  );
});

interface HubModuleCardsProps {
  lang: string;
  isLight: boolean;
  canHover: boolean;
  prefersReduced: boolean;
  activeRouteApp: string;
  onLaunchApp: (app: TargetApp, el: HTMLElement) => void;
  chordexDesc: string;
  drumexDesc: string;
  stagexDesc: string;
  groovexDesc: string;
  vocalexDesc: string;
}

const HubModuleCards = React.memo(function HubModuleCards({
  lang,
  isLight,
  canHover,
  prefersReduced,
  activeRouteApp,
  onLaunchApp,
  chordexDesc,
  drumexDesc,
  stagexDesc,
  groovexDesc,
  vocalexDesc,
}: HubModuleCardsProps) {
  const modules = useMemo(
    () => [
      {
        app: 'chordex' as TargetApp,
        Logo: ChordexLogo,
        name: 'Chordex',
        desc: chordexDesc,
        color: '#a855f7',
        active: activeRouteApp === 'chordex',
      },
      {
        app: 'drumex' as TargetApp,
        Logo: DrumexLogo,
        name: 'Drumex',
        desc: drumexDesc,
        color: '#ec4899',
        active: activeRouteApp === 'drumex',
      },
      {
        app: 'stagex' as TargetApp,
        Logo: StagexLogoIcon,
        name: 'Stagex',
        desc: stagexDesc,
        color: '#3b82f6',
        active: activeRouteApp === 'stagex',
      },
      {
        app: 'groovex' as TargetApp,
        Logo: GroovexLogo,
        name: 'Groovex',
        desc: groovexDesc,
        color: '#10b981',
        active: activeRouteApp === 'groovex',
      },
      {
        app: 'vocalex' as TargetApp,
        Logo: VocalexLogo,
        name: 'Vocalex',
        desc: vocalexDesc,
        color: '#f59e0b',
        active: activeRouteApp === 'vocalex',
      },
    ],
    [activeRouteApp, chordexDesc, drumexDesc, stagexDesc, groovexDesc, vocalexDesc]
  );

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '9.5px',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 800,
          color: 'var(--c-text-tertiary, #808080)',
          margin: 0,
          padding: '0 2px',
        }}
      >
        {lang === 'es' ? 'Módulos del Ecosistema' : 'Livex Modules'}
      </h3>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        className="w-full"
      >
        {modules.map(({ app, Logo, name, desc, color, active }) => (
          <motion.button
            key={app}
            data-app={app}
            onClick={(e) => onLaunchApp(app, e.currentTarget)}
            whileTap={prefersReduced ? undefined : { scale: 0.975 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.015, y: -1 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '14px 16px',
              background: isLight
                ? 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.70))'
                : 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
              border: active
                ? `1.5px solid ${color}`
                : isLight
                  ? '1px solid rgba(0, 0, 0, 0.06)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              cursor: 'pointer',
              textAlign: 'left',
              boxSizing: 'border-box',
              outline: 'none',
              position: 'relative',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-surface-raised)',
              overflow: 'hidden',
            }}
            className="sc-module-card group"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: isLight ? `${color}14` : `${color}18`,
                  border: `1px solid ${color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color,
                  flexShrink: 0,
                }}
              >
                <Logo size={22} />
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: '15.5px',
                      fontWeight: 800,
                      color: 'var(--c-text-primary)',
                      fontFamily: 'var(--studio-font-display)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {name}
                  </span>
                  {active && (
                    <span
                      style={{
                        fontSize: '8.5px',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        backgroundColor: `${color}22`,
                        border: `1px solid ${color}40`,
                        color: color,
                        fontWeight: 800,
                        fontFamily: 'Inter, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: color,
                        }}
                      />
                      {lang === 'es' ? 'En Vivo' : 'Live'}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    marginTop: '2px',
                    lineHeight: 1.3,
                    opacity: 0.82,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {desc}
                </span>
              </div>
            </div>

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isLight
                  ? 'rgba(0,0,0,0.03)'
                  : 'rgba(255,255,255,0.04)',
                border: isLight
                  ? '1px solid rgba(0,0,0,0.05)'
                  : '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              <StudioIcon
                name="chevron_right"
                size={16}
                style={{
                  color: 'var(--c-text-secondary)',
                  opacity: 0.6,
                }}
              />
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
});

export default function LivexHub() {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const lang = useSettingsStore((s) => s.settings.language ?? 'en');
  const accentColor = useSettingsStore((s) => s.settings.accentColor);
  const theme = useSettingsStore((s) => s.settings.theme);
  const hubTheme = useSettingsStore(
    (s) => s.settings.perApp?.hub?.theme ?? s.settings.theme ?? 'dark'
  );
  const dynamicLightStart = useSettingsStore((s) => s.settings.dynamicLightStart ?? 7);
  const dynamicLightEnd = useSettingsStore((s) => s.settings.dynamicLightEnd ?? 20);
  const hubUserName = useSettingsStore((s) => s.settings.hubUserName);

  const currentApp = useNavigationStore((s) => s.history[s.history.length - 1]?.app ?? 'hub');

  const startupComplete = useStartupComplete();
  const isWebDesktop = useIsWebDesktop();
  const t = useT();
  const accent = resolveAccent(accentColor);
  const isHubLight = (() => {
    if (hubTheme === 'light') return true;
    if (hubTheme === 'system') {
      return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      );
    }
    if (hubTheme === 'dynamic') {
      const h = new Date().getHours();
      return h >= dynamicLightStart && h < dynamicLightEnd;
    }
    return false;
  })();

  const tab = useNavigationStore((s) => {
    const history = s.history;
    const current = history[history.length - 1];
    return (current?.tab ?? 'home') as HubTab;
  });

  const setTab = useCallback((action: React.SetStateAction<HubTab>) => {
    const currentTab =
      useNavigationStore.getState().history[useNavigationStore.getState().history.length - 1]
        ?.tab ?? 'home';
    const nextTab = typeof action === 'function' ? action(currentTab as HubTab) : action;
    NavigationDispatcher.push({ app: 'hub', page: nextTab, tab: nextTab });
  }, []) as React.Dispatch<React.SetStateAction<HubTab>>;

  useEffect(() => {
    resetNav();
  }, [tab]);

  useEffect(() => {
    console.log(
      `[STARTUP-TRACE] LivexHub: mount useEffect fired at ${performance.now().toFixed(0)}ms, calling notifyHubMounted()`
    );
    StartupCoordinator.notifyHubMounted();
  }, []);
  const [zooming, setZooming] = useState(false);
  const activeRoute = useNavigationStore((s) => s.history[s.history.length - 1]) || {
    app: 'hub',
    tab: 'home',
  };
  const page =
    activeRoute.app === 'hub' && activeRoute.tab === 'settings'
      ? (activeRoute.page ?? 'main')
      : 'main';

  const routeApp = activeRoute.app;
  const routeTab = activeRoute.tab;
  const routePage = activeRoute.page;
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const [langQuery, setLangQuery] = useState('');
  const [shortcutPickerOpen, setShortcutPickerOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<string[]>([]);

  // Drag-to-reorder state variables
  const [isEditMode, setIsEditMode] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const longPressTimeoutRef = useRef<any>(null);
  const startLongPressTimer = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.navigator?.vibrate === 'function') {
        try {
          window.navigator.vibrate(15);
        } catch (_) {}
      }
      setIsEditMode(true);
    }, 500);
  };
  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!shortcutPickerOpen && !isEditMode) return;
    const id = shortcutPickerOpen ? 'quick-actions-sheet' : 'quick-actions-reorder';
    activeOverlaysRegistry.register('sheet', id);
    setNavHidden(true);
    return () => {
      activeOverlaysRegistry.unregister('sheet', id);
      setNavHidden(false);
    };
  }, [shortcutPickerOpen, isEditMode]);

  const activeRouteApp = useNavigationStore((s) => s.history[s.history.length - 1]?.app ?? 'hub');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('studio:quick-shortcuts');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const normalized = Array.from(
          new Set(
            parsed
              .map((id) => LEGACY_SHORTCUT_MAP[id] || id)
              .filter(
                (id) =>
                  !id.includes('preferences') &&
                  !id.includes('prefs') &&
                  ALL_SHORTCUT_OPTIONS.some((opt) => opt.id === id)
              )
          )
        ).slice(0, 5);

        if (normalized.length === 0) {
          setShortcuts(DEFAULT_SHORTCUTS);
          localStorage.setItem('studio:quick-shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
        } else {
          setShortcuts(normalized);
          if (JSON.stringify(normalized) !== stored) {
            localStorage.setItem('studio:quick-shortcuts', JSON.stringify(normalized));
          }
        }
      } else {
        setShortcuts(DEFAULT_SHORTCUTS);
        localStorage.setItem('studio:quick-shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
      }
    } catch {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  }, []);

  const handleShortcutClick = (rawId: string) => {
    const id = LEGACY_SHORTCUT_MAP[rawId] || rawId;
    switch (id) {
      // ── Global / Hub ──────────────────────────────────
      case 'settings':
        NavigationDispatcher.push({ app: 'hub', tab: 'settings' });
        break;
      case 'notifications':
        NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'notifications' });
        break;
      case 'updater':
        NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'updater' });
        break;

      // ── Chordex ───────────────────────────────────────
      case 'chordex-library':
        NavigationDispatcher.push({ app: 'chordex', page: 'library' });
        break;
      case 'chordex-songs':
        NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
        break;
      case 'chordex-tuner':
      case 'tuner':
        NavigationDispatcher.push({ app: 'chordex', page: 'library', subView: 'tuner' });
        break;
      case 'chordex-practice':
        NavigationDispatcher.push({ app: 'chordex', page: 'practice' });
        break;

      // ── Drumex ────────────────────────────────────────
      case 'drumex-metronome':
        NavigationDispatcher.push({ app: 'drumex', page: 'metronome' });
        break;
      case 'drumex-beats':
        NavigationDispatcher.push({ app: 'drumex', page: 'beats' });
        break;
      case 'drumex-patterns':
      case 'drumex-grooves':
        NavigationDispatcher.push({ app: 'drumex', page: 'patterns' });
        break;

      // ── Stagex ────────────────────────────────────────
      case 'stagex-rider':
        useStagexStore.getState().setSetupSubView('rider');
        NavigationDispatcher.push({ app: 'stagex', page: 'Setup', subView: 'rider' });
        break;
      case 'stagex-setlist':
        useStagexStore.getState().setSetupSubView('setlist');
        NavigationDispatcher.push({ app: 'stagex', page: 'Setup', subView: 'setlist' });
        break;
      case 'stagex-gear':
        useStagexStore.getState().setSetupSubView('gear');
        NavigationDispatcher.push({ app: 'stagex', page: 'Setup', subView: 'gear' });
        break;
      case 'stagex-crew':
        useStagexStore.getState().setSetupSubView('members');
        NavigationDispatcher.push({ app: 'stagex', page: 'Setup', subView: 'members' });
        break;
      case 'stagex-stage':
        NavigationDispatcher.push({ app: 'stagex', page: 'Editor' });
        break;

      // ── GrooveX ───────────────────────────────────────
      case 'groovex-library':
        NavigationDispatcher.push({ app: 'groovex', page: 'library' });
        break;
      case 'groovex-player':
        NavigationDispatcher.push({ app: 'groovex', page: 'player' });
        break;

      // ── Vocalex ───────────────────────────────────────
      case 'vocalex-coach':
        NavigationDispatcher.push({ app: 'vocalex', page: 'coach' });
        break;
      case 'vocalex-takes':
        NavigationDispatcher.push({ app: 'vocalex', page: 'takes' });
        break;

      default:
        console.warn(`[QuickActions] Unhandled shortcut id: ${rawId} (resolved to ${id})`);
        break;
    }
  };
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
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
  }, [authUser]);
  const [successAnimationState, setSuccessAnimationState] = useState<
    'entering' | 'exiting' | 'hidden'
  >('hidden');
  const [successName, setSuccessName] = useState('');
  const homeScrollRef = useRef<HTMLDivElement>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  const helpScrollRef = useRef<HTMLDivElement>(null);
  const assistantScrollRef = useRef<HTMLDivElement>(null);
  const launchTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const lastUserRef = useRef<AuthUser | null>(null);

  // Only bind outer useScrollHide for home tab; HubSettings and other sub-views manage their own internal scroll containers
  useScrollHide(homeScrollRef, tab === 'home');

  const isFirstAuthRun = useRef(true);

  // Android-style Developer Options Tap & Toast state
  const devTapsRef = useRef(0);
  const [devToast, setDevToast] = useState<string | null>(null);
  const [devToastTimer, setDevToastTimer] = useState<number | null>(null);

  const tabRef = useRef(tab);
  tabRef.current = tab;
  const zoomingRef = useRef(zooming);
  zoomingRef.current = zooming;
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;

  useEffect(() => {
    registerDebugProvider({
      id: 'hub',
      name: 'Livex Hub',
      getDebugState: () => {
        const diag = getFirestoreDiagnostics();
        const navEntries = getNavigationEntries();
        const lastNav = navEntries.length > 0 ? navEntries[navEntries.length - 1] : null;
        const currentStore = useChordStore.getState();
        const currentSettings = useSettingsStore.getState();
        return {
          activeTab: tabRef.current,
          zooming: zoomingRef.current,
          authStatus: authUserRef.current ? 'Signed In' : 'Signed Out',
          theme: currentSettings.settings.theme,
          language: currentSettings.settings.language,
          'Sync Provider': diag.syncProvider,
          'Firestore Runtime Active': diag.firestoreRuntimeActive,
          'Firestore Disabled (Verified)': !diag.firestoreRuntimeActive,
          'Firestore Listen Channels': diag.firestoreListenChannels,
          'Firestore Write Channels': diag.firestoreWriteChannels,
          'Firestore Last Error': diag.firestoreLastError,
          'Firestore Init Call Stack': (diag as any).firestoreInitStack || 'never',
          'Hub Transition Status': (window as any).studioTransitionActive ? 'Active' : 'Completed',
          'Last Navigation Path': lastNav ? `${lastNav.fromApp} -> ${lastNav.toApp}` : 'none',
          'Last Navigation Duration':
            lastNav && lastNav.transitionComplete && lastNav.transitionStart
              ? `${lastNav.transitionComplete - lastNav.transitionStart}ms`
              : 'N/A',
        };
      },
    });
    return () => {
      unregisterDebugProvider('hub');
    };
  }, []);

  const showDevToast = (msg: string) => {
    if (devToastTimer) {
      window.clearTimeout(devToastTimer);
    }
    setDevToast(msg);
    const id = window.setTimeout(() => setDevToast(null), 2000);
    setDevToastTimer(id);
  };

  const handleLogoTap = () => {};

  const renderDevToast = () => (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: isHubLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
        color: isHubLight ? '#fff' : '#000',
        padding: '8px 18px',
        borderRadius: '20px',
        fontSize: '12.5px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        zIndex: 99999,
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
        whiteSpace: 'nowrap',
      }}
    >
      {devToast}
    </div>
  );

  useEffect(() => {
    return authRepository.subscribeAuth((user) => {
      if (isFirstAuthRun.current) {
        isFirstAuthRun.current = false;
        lastUserRef.current = user;
        setAuthUser(user);
        return;
      }

      if (!lastUserRef.current && user) {
        // Successful login transition!
        setSuccessName(user.displayName || user.email || 'User');
        setSuccessAnimationState('entering');
        setTimeout(() => {
          setSuccessAnimationState('exiting');
          setTimeout(() => {
            setSuccessAnimationState('hidden');
          }, 450); // wait for exit animation to complete
        }, 1800); // linger success check for 1.8 seconds
      }
      lastUserRef.current = user;
      setAuthUser(user);
    });
  }, []);

  const launchApp = useCallback((appMode: AppKey, _sourceElement?: HTMLElement | null) => {
    if ((window as any).studioTransitionActive) {
      console.warn('[Navigation] App switch request ignored: transition in progress.');
      return;
    }

    useApplicationTransitionStore.getState().requestTransition(appMode);

    const currentApp = NavigationDispatcher.currentApp();
    recordNavigation({
      fromApp: currentApp,
      toApp: appMode,
      transitionStart: Date.now(),
      transitionLockState: true,
      activeAppAfterTransition: appMode,
      fallbackRendered: false,
    });

    (window as any).studioTransitionActive = true;
    setZooming(true);

    NavigationDispatcher.push({ app: appMode });

    // Clear any pending launch timers
    launchTimers.current.forEach(clearTimeout);
    launchTimers.current = [];

    const t2 = setTimeout(() => {
      (window as any).studioTransitionActive = false;
      setZooming(false);
      recordNavigation({
        fromApp: currentApp,
        toApp: appMode,
        transitionComplete: Date.now(),
        transitionLockState: false,
        activeAppAfterTransition: appMode,
        fallbackRendered: false,
      });
    }, 280);
    launchTimers.current.push(t2);
    // updateSettings is stable (Zustand action), setZooming is React setState
  }, []);

  useEffect(() => {
    return () => {
      launchTimers.current.forEach(clearTimeout);
    };
  }, []);

  const [introFinished, setIntroFinished] = useState(() => {
    if (_sessionIntroFinished || (typeof window !== 'undefined' && (window as any).__introDone))
      return true;
    if (
      typeof document !== 'undefined' &&
      !document.getElementById('intro') &&
      !document.querySelector('[data-solar-intro]')
    ) {
      _sessionIntroFinished = true;
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (introFinished) {
      _sessionIntroFinished = true;
      return;
    }
    return subscribeIntroDone(() => {
      _sessionIntroFinished = true;
      setIntroFinished(true);
    });
  }, [introFinished]);

  // Reset zooming state when returning to the Hub
  useEffect(() => {
    if (currentApp === 'hub') {
      setZooming(false);
      // Clear launch timers to prevent race conditions (black screen return bug)
      launchTimers.current.forEach(clearTimeout);
      launchTimers.current = [];
      (window as any).studioTransitionActive = false;
    }
  }, [currentApp]);

  // Safety watchdog: recover from stuck zooming state on the Hub
  useEffect(() => {
    let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
    if (currentApp === 'hub' && zooming) {
      watchdogTimer = setTimeout(() => {
        console.warn('[Safety] Hub zooming stuck on Hub mode for too long, forcing reset.');
        setZooming(false);
        (window as any).studioTransitionActive = false;
      }, 600);
    }
    return () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [currentApp, zooming]);

  const sessionIdx = getSessionIndex();
  const greetName = authUser?.displayName?.trim() || hubUserName;
  const { greeting, subtitle } = useMemo(
    () => getGreetingPair(greetName, sessionIdx, lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [greetName, lang]
  );

  return (
    <div
      data-livex-hub-root="true"
      style={{
        position: 'relative',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--app-bg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--studio-font-body)',
        transform: zooming
          ? 'scale(0.985)'
          : !introFinished
            ? 'scale(0.988)'
            : 'scale(1)',
        opacity: zooming ? 0.35 : !introFinished ? 0.88 : 1,
        transition: zooming
          ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease-out, background-color 700ms cubic-bezier(0.4, 0, 0.2, 1)'
          : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), background-color 700ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: introFinished ? 'auto' : 'none',
      }}
    >
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative', width: '100%', height: '100%' }}
      >
        <SharedNavigationContainer
          activeView={tab}
          viewOrder={['home', 'settings', 'profile', 'help', 'assistant']}
          variant="tab"
        >
          {(tabId) => {
            const isScrollableDirectly = tabId === 'home' || tabId === 'help';
            const currentScrollRef =
              tabId === 'home'
                ? homeScrollRef
                : tabId === 'help'
                  ? helpScrollRef
                  : null;
            return (
              <div
                ref={currentScrollRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflowY: isScrollableDirectly ? 'auto' : 'hidden',
                  overflowX: 'hidden',
                  willChange: 'transform',
                  transform: 'translate3d(0, 0, 0)',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {' '}
                {/* 🏠 HOME TAB */}
                {tabId === 'home' && (
                  <div
                    data-hub-tab-content
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0 var(--page-header-inset-h, var(--page-inset-h, 24px))',
                      paddingTop:
                        'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 40px))',
                      paddingBottom:
                        'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 110px)',
                    }}
                  >
                    {/* Dashboard Contents Scroll Area */}
                    <div
                      style={{ width: '100%', maxWidth: 'var(--content-max-w, 420px)' }}
                      className="flex flex-col gap-6 w-full"
                    >
                      {/* Greetings Section & Logo Header Row */}
                      <HubGreetingsHeader
                        greeting={greeting}
                        subtitle={subtitle}
                        canHover={canHover}
                        prefersReduced={prefersReduced}
                      />

                      {/* Pinned Quick Actions Section */}
                      <section
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 2px',
                          }}
                        >
                          <h3
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '9.5px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.14em',
                              fontWeight: 800,
                              color: 'var(--c-text-tertiary, #808080)',
                              margin: 0,
                            }}
                          >
                            {lang === 'es' ? 'Acciones Fijadas' : 'Pinned Actions'}
                          </h3>
                          {isEditMode ? (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => setIsEditMode(false)}
                              style={{
                                background: accent.from,
                                border: 'none',
                                color: '#000',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '11px',
                                fontWeight: 750,
                                borderRadius: 9999,
                                padding: '3px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                boxShadow: `0 2px 8px ${accent.from}40`,
                              }}
                            >
                              <StudioIcon
                                name="check"
                                size={13}
                              />
                              {lang === 'es' ? 'Listo' : 'Done'}
                            </motion.button>
                          ) : (
                            <MorphingActionSurface
                              isOpen={shortcutPickerOpen}
                              onOpenChange={setShortcutPickerOpen}
                              placement="bottom"
                              maxWidth={440}
                              maxHeight="80vh"
                              title={lang === 'es' ? 'Acciones Rápidas' : 'Customize Quick Actions'}
                              subtitle={`${shortcuts.length}/5 ${lang === 'es' ? 'activos' : 'active'}`}
                              accentColor={accent.from}
                              customTrigger={({ open, surfaceId, triggerProps }) => (
                                <motion.button
                                  {...triggerProps}
                                  onClick={open}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.10)',
                                    color: accent.from,
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 650,
                                    borderRadius: 9999,
                                    padding: '3px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <StudioIcon
                                    name="add"
                                    size={13}
                                  />
                                  {lang === 'es' ? 'Fijar' : 'Pin'}
                                </motion.button>
                              )}
                            >
                              {({ close }) => (
                                <div
                                  style={{
                                    padding: '10px 14px 14px 14px',
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '70vh',
                                    overflowY: 'auto',
                                  }}
                                >
                                  <p
                                    style={{
                                      fontFamily: 'Inter, sans-serif',
                                      fontSize: 12,
                                      color: 'var(--c-text-secondary)',
                                      margin: '0 0 12px 0',
                                      opacity: 0.8,
                                    }}
                                  >
                                    {lang === 'es'
                                      ? 'Arrastra para reordenar. Elige hasta 5 accesos directos.'
                                      : 'Drag to reorder. Select up to 5 quick shortcuts.'}
                                  </p>

                                  <div
                                    style={{
                                      flex: 1,
                                      overflowY: 'auto',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 14,
                                      paddingRight: 2,
                                    }}
                                    className="hide-scrollbar"
                                  >
                                    {/* Active Shortcuts Section */}
                                    <div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          marginBottom: 6,
                                        }}
                                      >
                                        <h4
                                          style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: 'var(--font-section-label)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            color: 'var(--c-text-secondary)',
                                            opacity: 0.7,
                                            margin: 0,
                                          }}
                                        >
                                          {lang === 'es' ? 'Atajos Activos' : 'Active Shortcuts'}
                                        </h4>
                                        {shortcuts.length > 1 && (
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              color: 'var(--c-text-secondary)',
                                              opacity: 0.6,
                                            }}
                                          >
                                            {lang === 'es' ? 'Arrastra para ordenar' : 'Drag to reorder'}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {shortcuts.length === 0 ? (
                                          <div
                                            style={{
                                              fontSize: 12,
                                              color: 'var(--c-text-secondary)',
                                              opacity: 0.6,
                                              padding: '10px 12px',
                                              border: '1px dashed var(--c-border)',
                                              borderRadius: 10,
                                              textAlign: 'center',
                                            }}
                                          >
                                            {lang === 'es'
                                              ? 'Ninguno seleccionado. Agrega algunos abajo.'
                                              : 'No active shortcuts. Add options below.'}
                                          </div>
                                        ) : (
                                          <Reorder.Group
                                            axis="y"
                                            values={shortcuts}
                                            onReorder={(newShortcuts) => {
                                              setShortcuts(newShortcuts);
                                              localStorage.setItem(
                                                'studio:quick-shortcuts',
                                                JSON.stringify(newShortcuts)
                                              );
                                            }}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 6,
                                              padding: 0,
                                              margin: 0,
                                              listStyle: 'none',
                                            }}
                                          >
                                            {shortcuts.map((id) => {
                                              const opt = ALL_SHORTCUT_OPTIONS.find((o) => o.id === id);
                                              if (!opt) return null;
                                              return (
                                                <Reorder.Item
                                                  key={id}
                                                  value={id}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '7px 10px',
                                                    background: 'var(--app-surface)',
                                                    border: '1px solid var(--c-border)',
                                                    borderRadius: 10,
                                                    cursor: 'grab',
                                                    userSelect: 'none',
                                                    touchAction: 'none',
                                                  }}
                                                  whileDrag={{
                                                    scale: 1.02,
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                                    background: 'var(--app-surface-bright, var(--app-surface))',
                                                    cursor: 'grabbing',
                                                    zIndex: 10,
                                                  }}
                                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <StudioIcon
                                                      name="drag_indicator"
                                                      size={16}
                                                      style={{
                                                        color: 'var(--c-text-secondary)',
                                                        opacity: 0.4,
                                                        cursor: 'grab',
                                                      }}
                                                    />
                                                    <div
                                                      style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: 7,
                                                        background: 'var(--app-surface-low)',
                                                        border: '1px solid var(--c-border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                      }}
                                                    >
                                                      {renderShortcutIcon(opt.icon, 15)}
                                                    </div>
                                                    <div
                                                      style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        minWidth: 0,
                                                        flex: 1,
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontSize: 12.5,
                                                          color: 'var(--c-text-primary)',
                                                          fontWeight: 600,
                                                          lineHeight: 1.2,
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis',
                                                          whiteSpace: 'nowrap',
                                                        }}
                                                      >
                                                        {lang === 'es' ? opt.titleEs : opt.titleEn}
                                                      </span>
                                                      <span
                                                        style={{
                                                          fontSize: 10.5,
                                                          color: 'var(--c-text-secondary)',
                                                          opacity: 0.75,
                                                          marginTop: 1,
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis',
                                                          whiteSpace: 'nowrap',
                                                        }}
                                                      >
                                                        {lang === 'es' ? opt.descEs : opt.descEn}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <button
                                                    onClick={() => {
                                                      const newShortcuts = shortcuts.filter((x) => x !== id);
                                                      setShortcuts(newShortcuts);
                                                      localStorage.setItem(
                                                        'studio:quick-shortcuts',
                                                        JSON.stringify(newShortcuts)
                                                      );
                                                    }}
                                                    title={lang === 'es' ? 'Quitar' : 'Remove'}
                                                    style={{
                                                      width: 24,
                                                      height: 24,
                                                      borderRadius: '50%',
                                                      background: 'rgba(239, 68, 68, 0.1)',
                                                      border: 'none',
                                                      color: '#ef4444',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      cursor: 'pointer',
                                                      padding: 0,
                                                      flexShrink: 0,
                                                      transition: 'transform 120ms ease, background 120ms ease',
                                                    }}
                                                  >
                                                    <StudioIcon
                                                      name="remove"
                                                      size={14}
                                                      strokeWidth={2.5}
                                                    />
                                                  </button>
                                                </Reorder.Item>
                                              );
                                            })}
                                          </Reorder.Group>
                                        )}
                                      </div>
                                    </div>

                                    {/* Available Shortcuts Section */}
                                    <div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          marginBottom: 6,
                                        }}
                                      >
                                        <h4
                                          style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: 'var(--font-section-label)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            color: 'var(--c-text-secondary)',
                                            opacity: 0.7,
                                            margin: 0,
                                          }}
                                        >
                                          {lang === 'es' ? 'Atajos Disponibles' : 'Available Shortcuts'}
                                        </h4>
                                        {shortcuts.length >= 5 && (
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              color: '#ef4444',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {lang === 'es' ? 'Máximo alcanzado' : 'Limit reached'}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {ALL_SHORTCUT_OPTIONS.filter((o) => !shortcuts.includes(o.id)).map((opt) => {
                                          const isLimitReached = shortcuts.length >= 5;
                                          return (
                                            <div
                                              key={opt.id}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '7px 10px',
                                                background: 'var(--app-surface-low)',
                                                border: '1px solid var(--c-border)',
                                                borderRadius: 10,
                                                opacity: isLimitReached ? 0.6 : 1,
                                                transition: 'opacity 180ms ease',
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div
                                                  style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: 7,
                                                    background: 'var(--app-surface)',
                                                    border: '1px solid var(--c-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {renderShortcutIcon(opt.icon, 15)}
                                                </div>
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    minWidth: 0,
                                                    flex: 1,
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 12.5,
                                                      color: 'var(--c-text-primary)',
                                                      fontWeight: 550,
                                                      lineHeight: 1.2,
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                      whiteSpace: 'nowrap',
                                                    }}
                                                  >
                                                    {lang === 'es' ? opt.titleEs : opt.titleEn}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 10.5,
                                                      color: 'var(--c-text-secondary)',
                                                      opacity: 0.75,
                                                      marginTop: 1,
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                      whiteSpace: 'nowrap',
                                                    }}
                                                  >
                                                    {lang === 'es' ? opt.descEs : opt.descEn}
                                                  </span>
                                                </div>
                                              </div>

                                              <button
                                                disabled={isLimitReached}
                                                onClick={() => {
                                                  const newShortcuts = [...shortcuts, opt.id];
                                                  setShortcuts(newShortcuts);
                                                  localStorage.setItem(
                                                    'studio:quick-shortcuts',
                                                    JSON.stringify(newShortcuts)
                                                  );
                                                }}
                                                title={
                                                  isLimitReached
                                                    ? lang === 'es'
                                                      ? 'Máximo alcanzado'
                                                      : 'Limit reached (5/5)'
                                                    : lang === 'es'
                                                      ? 'Agregar'
                                                      : 'Add'
                                                }
                                                style={{
                                                  width: 24,
                                                  height: 24,
                                                  borderRadius: '50%',
                                                  background: isLimitReached ? 'transparent' : accent.from,
                                                  border: isLimitReached ? '1px solid var(--c-border)' : 'none',
                                                  color: isLimitReached ? 'var(--c-text-secondary)' : '#ffffff',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  cursor: isLimitReached ? 'default' : 'pointer',
                                                  padding: 0,
                                                  flexShrink: 0,
                                                  opacity: isLimitReached ? 0.4 : 1,
                                                  transition: 'transform 120ms ease, opacity 120ms ease',
                                                }}
                                              >
                                                <StudioIcon
                                                  name="add"
                                                  size={14}
                                                  strokeWidth={2.5}
                                                />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Done Button */}
                                  <button
                                    onClick={close}
                                    className="w-full active:scale-[0.98] transition-transform"
                                    style={{
                                      width: '100%',
                                      height: 48,
                                      minHeight: 48,
                                      borderRadius: 14,
                                      background: accent.from,
                                      color: '#ffffff',
                                      border: 'none',
                                      fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                                      fontWeight: 700,
                                      fontSize: 14,
                                      cursor: 'pointer',
                                      marginTop: 14,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 8,
                                      boxShadow: `0 4px 16px ${accent.from}33`,
                                      letterSpacing: '-0.01em',
                                    }}
                                  >
                                    <StudioIcon
                                      name="check"
                                      size={18}
                                      strokeWidth={2.5}
                                    />
                                    {lang === 'es' ? 'Listo' : 'Done'}
                                  </button>
                                </div>
                              )}
                            </MorphingActionSurface>
                          )}
                        </div>

                        <div ref={gridRef} style={{ position: 'relative', width: '100%' }}>
                          <Reorder.Group
                            axis="x"
                            values={shortcuts}
                            onReorder={(newShortcuts) => {
                              setShortcuts(newShortcuts);
                              localStorage.setItem(
                                'studio:quick-shortcuts',
                                JSON.stringify(newShortcuts)
                              );
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: '10px',
                              padding: '2px 0 6px',
                              listStyle: 'none',
                              margin: 0,
                            }}
                          >
                            {shortcuts.slice(0, 5).map((id) => {
                              const opt = ALL_SHORTCUT_OPTIONS.find((o) => o.id === id);
                              if (!opt) return null;
                              const mappedLabel = SHORTCUT_LABEL_MAP[id] || {
                                en: opt.titleEn.split(' ')[0],
                                es: opt.titleEs.split(' ')[0],
                              };
                              const displayLabel = lang === 'es' ? mappedLabel.es : mappedLabel.en;

                              return (
                                <Reorder.Item
                                  key={id}
                                  value={id}
                                  drag={isEditMode ? 'x' : false}
                                  dragConstraints={gridRef}
                                  dragElastic={0}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    position: 'relative',
                                    userSelect: 'none',
                                  }}
                                  onPointerDown={startLongPressTimer}
                                  onPointerUp={clearLongPressTimer}
                                  onPointerCancel={clearLongPressTimer}
                                  onPointerLeave={clearLongPressTimer}
                                  onClick={() => {
                                    if (!isEditMode) {
                                      handleShortcutClick(id);
                                    }
                                  }}
                                >
                                  <motion.div
                                    whileTap={isEditMode || prefersReduced ? undefined : { scale: 0.9 }}
                                    whileHover={!isEditMode && canHover && !prefersReduced ? { scale: 1.06, y: -2 } : undefined}
                                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}
                                    animate={
                                      isEditMode
                                        ? {
                                            rotate: [0, -1.5, 0, 1.5, 0],
                                            transition: {
                                              duration: 0.26,
                                              repeat: Infinity,
                                              ease: 'easeInOut',
                                            },
                                          }
                                        : { rotate: 0 }
                                    }
                                    style={{
                                      width: '52px',
                                      height: '52px',
                                      borderRadius: '9999px',
                                      background: isLight
                                        ? 'linear-gradient(160deg, rgba(255, 255, 255, 0.90) 0%, rgba(240, 244, 255, 0.75) 100%)'
                                        : 'linear-gradient(160deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                      border: isLight
                                        ? '1px solid rgba(255, 255, 255, 0.95)'
                                        : '1px solid rgba(255, 255, 255, 0.12)',
                                      boxShadow: 'var(--shadow-control-raised)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      position: 'relative',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {/* Top Specular Rim */}
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 4,
                                        right: 4,
                                        height: '1px',
                                        background: 'var(--surface-glass-rim)',
                                        pointerEvents: 'none',
                                        opacity: 0.8,
                                      }}
                                    />
                                    {renderShortcutIcon(opt.icon, 22)}

                                    {isEditMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newShortcuts = shortcuts.filter((x) => x !== id);
                                          setShortcuts(newShortcuts);
                                          localStorage.setItem(
                                            'studio:quick-shortcuts',
                                            JSON.stringify(newShortcuts)
                                          );
                                        }}
                                        style={{
                                          position: 'absolute',
                                          top: 2,
                                          right: 2,
                                          background: '#ef4444',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: 18,
                                          height: 18,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          padding: 0,
                                          zIndex: 20,
                                          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                                        }}
                                      >
                                        <StudioIcon
                                          name="close"
                                          size={12}
                                          strokeWidth={2.5}
                                        />
                                      </button>
                                    )}
                                  </motion.div>
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 650,
                                      color: 'var(--c-text-secondary)',
                                      marginTop: '6px',
                                      textAlign: 'center',
                                      width: '100%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      letterSpacing: '-0.015em',
                                      fontFamily: 'Inter, sans-serif',
                                    }}
                                  >
                                    {displayLabel}
                                  </span>
                                </Reorder.Item>
                              );
                            })}

                            {shortcuts.length < 5 && !isEditMode && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setShortcutPickerOpen(true)}
                              >
                                <motion.div
                                  whileTap={prefersReduced ? undefined : { scale: 0.9 }}
                                  whileHover={canHover && !prefersReduced ? { scale: 1.06, y: -2 } : undefined}
                                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '9999px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1.5px dashed rgba(255, 255, 255, 0.20)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <StudioIcon
                                    name="add"
                                    size={20}
                                    style={{
                                      color: 'var(--c-text-secondary)',
                                      opacity: 0.7,
                                    }}
                                  />
                                </motion.div>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 650,
                                    color: 'var(--c-text-secondary)',
                                    marginTop: '6px',
                                    textAlign: 'center',
                                    opacity: 0.7,
                                    letterSpacing: '-0.015em',
                                    fontFamily: 'Inter, sans-serif',
                                  }}
                                >
                                  {lang === 'es' ? 'Añadir' : 'Add'}
                                </span>
                              </div>
                            )}
                          </Reorder.Group>
                        </div>
                      </section>

                      {/* Studio Modules grid columns */}
                      <HubModuleCards
                        lang={lang}
                        isLight={isLight}
                        canHover={canHover}
                        prefersReduced={prefersReduced}
                        activeRouteApp={activeRouteApp}
                        onLaunchApp={launchApp}
                        chordexDesc={t.hub.chordexDesc}
                        drumexDesc={t.hub.drumexDesc}
                        stagexDesc={t.hub.stagexDesc}
                        groovexDesc={t.hub.groovexDesc}
                        vocalexDesc={t.hub.vocalexDesc}
                      />
                    </div>
                  </div>
                )}
                {/* ⚙️ SETTINGS TAB */}
                {tabId === 'settings' && (
                  <Suspense fallback={null}>
                    <HubSettings
                      accent={accent}
                      scrollRef={settingsScrollRef}
                      authUser={authUser}
                      tab={tab}
                      setTab={setTab}
                      showDevToast={showDevToast}
                      handleLogoTap={handleLogoTap}
                      devToast={devToast}
                      renderDevToast={renderDevToast}
                    />
                  </Suspense>
                )}
                {/* 👤 PROFILE TAB */}
                {tabId === 'profile' && (
                  <>
                    <Suspense fallback={null}>
                      <HubSettings
                        accent={accent}
                        scrollRef={profileScrollRef}
                        authUser={authUser}
                        onProfile={() => {
                          NavigationDispatcher.push({ app: 'hub', page: 'profile', tab: 'profile' });
                        }}
                        tab={tab}
                        setTab={setTab}
                        showDevToast={showDevToast}
                        handleLogoTap={handleLogoTap}
                        devToast={devToast}
                        renderDevToast={renderDevToast}
                      />
                    </Suspense>

                    {/* Premium Login Success Check Overlay */}
                    {successAnimationState !== 'hidden' && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 9999,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(10, 10, 12, 0.72)',
                          backdropFilter: 'blur(20px)', // token-guard-ignore
                          WebkitBackdropFilter: 'blur(20px)', // token-guard-ignore
                          animation:
                            successAnimationState === 'entering'
                              ? 'success-fade-in-blur 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
                              : 'success-fade-out-blur 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                        }}
                      >
                        <style>{`
                          @keyframes success-fade-in-blur {
                            from { opacity: 0; }
                            to { opacity: 1; }
                          }
                          @keyframes success-fade-out-blur {
                            from { opacity: 1; transform: scale(1); }
                            to { opacity: 0; transform: scale(0.95); }
                          }
                          @keyframes success-pop {
                            0% { transform: scale(0.85) translateY(16px); opacity: 0; }
                            100% { transform: scale(1) translateY(0); opacity: 1; }
                          }
                          @keyframes draw-circle {
                            0% { stroke-dashoffset: 166; }
                            100% { stroke-dashoffset: 0; }
                          }
                          @keyframes draw-check {
                            0% { stroke-dashoffset: 48; }
                            100% { stroke-dashoffset: 0; }
                          }
                          @keyframes draw-ripple {
                            0% { transform: scale(1); opacity: 0.6; stroke-width: 4px; }
                            100% { transform: scale(1.4); opacity: 0; stroke-width: 0.5px; }
                          }
                          @keyframes fade-circle-fill {
                            from { fill: rgba(16, 185, 129, 0); }
                            to { fill: rgba(16, 185, 129, 0.06); }
                          }
                          @keyframes fade-in-up-stagger {
                            from { opacity: 0; transform: translateY(8px); }
                            to { opacity: 1; transform: translateY(0); }
                          }
                          .success-card {
                            padding: 40px 32px;
                            border-radius: 32px;
                            background: var(--app-surface, rgba(20, 20, 24, 0.8));
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1);
                            text-align: center;
                            max-width: 320px;
                            width: calc(100% - 40px);
                            animation: success-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                          }
                          .success-svg {
                            width: 76px;
                            height: 76px;
                            display: block;
                            margin: 0 auto 24px;
                            overflow: visible;
                          }
                          .success-circle {
                            stroke-dasharray: 166;
                            stroke-dashoffset: 166;
                            stroke-linecap: round;
                            animation: draw-circle 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                            animation-delay: 0.05s;
                          }
                          .success-circle-fill {
                            animation: fade-circle-fill 0.4s ease forwards;
                            animation-delay: 0.6s;
                          }
                          .success-check {
                            stroke-dasharray: 48;
                            stroke-dashoffset: 48;
                            animation: draw-check 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                            animation-delay: 0.55s;
                          }
                          .success-ripple {
                            transform-origin: center;
                            animation: draw-ripple 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                          }
                          .success-ripple-1 {
                            animation-delay: 0.4s;
                          }
                          .success-ripple-2 {
                            animation-delay: 0.62s;
                          }
                          .success-title {
                            margin: 0 0 8px;
                            font-family: var(--studio-font-display);
                            font-weight: 800;
                            font-size: 20px;
                            color: var(--c-text-primary);
                            animation: fade-in-up-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                            animation-delay: 0.78s;
                          }
                          .success-text {
                            margin: 0;
                            font-family: 'Inter', sans-serif;
                            font-size: 12.5px;
                            color: var(--c-text-secondary);
                            line-height: 1.4;
                            word-break: break-all;
                            animation: fade-in-up-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                            animation-delay: 0.9s;
                          }
                        `}</style>
                        <div className="success-card">
                          <svg className="success-svg" viewBox="0 0 52 52" fill="none">
                            <circle
                              className="success-circle success-circle-fill"
                              cx="26"
                              cy="26"
                              r="25"
                              stroke="#10b981"
                              strokeWidth="4"
                            />
                            <circle
                              className="success-ripple success-ripple-1"
                              cx="26"
                              cy="26"
                              r="25"
                              stroke="#10b981"
                              strokeWidth="4"
                              fill="none"
                            />
                            <circle
                              className="success-ripple success-ripple-2"
                              cx="26"
                              cy="26"
                              r="25"
                              stroke="#10b981"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="success-check"
                              stroke="#10b981"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.1 27.2l7.1 7.2 16.7-16.8"
                            />
                          </svg>
                          <h3 className="success-title">{t.hub.accountSection.signedIn}</h3>
                          <p className="success-text">{successName}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* ❓ HELP TAB */}
                {tabId === 'help' && (
                  <Suspense fallback={null}>
                    <HubHelp accent={accent} authUser={authUser} tab={tab} setTab={setTab} />
                  </Suspense>
                )}
                {/* 🤖 ASSISTANT TAB */}
                {tabId === 'assistant' && (
                  <AssistantChatView />
                )}
              </div>
            );
          }}
        </SharedNavigationContainer>
      </div>

      {/* ── Bottom nav ── */}

      {/* UpdateIndicator is now hoisted to AppShell so it appears on
          every screen, not just the Hub. */}

      {devToast && renderDevToast()}
    </div>
  );
}

// ── App row (list item inside the combined card) ───────────────────────────────
function AppRow({
  app,
  Logo,
  name,
  desc,
  last,
  onClick,
}: {
  app: TargetApp;
  Logo: React.FC<{ size: number }>;
  name: string;
  desc: string;
  last: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const isWebDesktop = useIsWebDesktop();

  if (isWebDesktop) {
    return (
      <button
        onClick={onClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '10px 14px',
          background: pressed
            ? 'var(--hub-card-pressed-bg, rgba(255, 255, 255, 0.04))'
            : 'var(--hub-card-bg, rgba(255, 255, 255, 0.01))',
          border: '1px solid var(--track, var(--hub-card-border, rgba(255, 255, 255, 0.06)))',
          borderRadius: 'var(--radius-compact, 12px)',
          cursor: 'pointer',
          textAlign: 'left',
          transform: pressed ? 'scale(0.99)' : 'scale(1)',
          transition: 'all 150ms ease',
          marginBottom: '8px',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-compact, 12px)',
            flexShrink: 0,
            background: 'var(--hub-card-icon-bg, rgba(255, 255, 255, 0.04))',
            border:
              '1px solid var(--track, var(--hub-card-icon-border, rgba(255, 255, 255, 0.08)))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--c-text-primary)',
          }}
        >
          <Logo size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 'var(--type-body-size, 14.5px)',
              lineHeight: 'var(--type-body-lh, 18px)',
              fontWeight: 600,
              fontFamily:
                'var(--type-title-font, var(--studio-font-display, "Inter Tight", sans-serif))',
              color: 'var(--c-text-primary, var(--text))',
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            {name}
          </p>
          <p
            style={{
              fontSize: 'var(--type-meta-size, 12px)',
              lineHeight: 'var(--type-meta-lh, 16px)',
              color: 'var(--c-text-secondary, var(--muted))',
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              margin: '2px 0 0',
              fontWeight: 400,
            }}
          >
            {desc}
          </p>
        </div>
        <StudioIcon
          name="chevron_right"
          size={16}
          style={{ color: 'var(--c-text-muted)', flexShrink: 0 }}
        />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '13px 18px',
        background: pressed ? 'rgba(128,128,128,0.07)' : 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : '1px solid rgba(128,128,128,0.08)',
        cursor: 'pointer',
        textAlign: 'left',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'background 100ms ease, transform 120ms cubic-bezier(0.34,1.15,0.64,1)',
        boxSizing: 'border-box',
      }}
    >
      {/* Icon pill */}
      <div
        data-intro-target={app}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          background: 'rgba(128,128,128,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-primary)',
        }}
      >
        <Logo size={22} />
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--c-text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--c-text-secondary)',
            margin: '2px 0 0',
            fontWeight: 500,
          }}
        >
          {desc}
        </p>
      </div>

      {/* Chevron */}
      <StudioIcon
        name="chevron_right"
        size={18}
        style={{ color: 'var(--c-text-secondary)', flexShrink: 0, opacity: 0.5 }}
      />
    </button>
  );
}

export const StudioHub = LivexHub;
