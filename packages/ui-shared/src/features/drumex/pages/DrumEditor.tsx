import { Dialog } from '../../../shared/design-system/dialogs';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from '../../../components/motion/bouncy-accordion';
import { Capacitor } from '@capacitor/core';
import {
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  useT,
  useBackHandler,
  useNavCollapsed,
  setNavCollapsed,
  useIsWebDesktop,
  type LibraryPattern,
  registerDebugProvider,
  unregisterDebugProvider,
  useNavigationStore,
  NavigationDispatcher,
  useSettingsStore,
  useSessionStore,
  useMetronomeStore,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { DrumTransportBar } from '../components/DrumTransportBar';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SHARED_NAV_TRANSITION,
  getSharedNavTransform,
  getSharedNavOpacity,
} from '../../hub/navigation/navStyles';

const MetronomeIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size, display: 'block' }}
  >
    <path d="M12 2L5 21h14L12 2z" />
    <path d="M12 7v10" strokeWidth="1.5" opacity="0.5" />
    <path d="M12 17L15 8" strokeWidth="2" />
    <circle cx="15" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

import ElasticSlider from '../../../shared/progress/ElasticSlider';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import {
  SharedNavigationBar,
  type SharedNavigationItem,
} from '../../hub/navigation/SharedNavigationBar';
import EmptyStateLottie from '../../../shared/lottie/EmptyStateLottie';
import LoadingLottie from '../../../shared/lottie/LoadingLottie';
import { Loader } from '../../../components/motion/loader';
import SuccessLottie from '../../../shared/lottie/SuccessLottie';
import {
  useDrumStore,
  KIT_INSTRUMENTS,
  INSTRUMENT_COLOR,
  INSTRUMENT_NAME,
  KIT_FAMILY,
  HOUSE_MICS,
  HOUSE_CRASH_MODELS,
  CYMBAL_PACKS,
  stepsPerMeasure,
  INST_VARIATIONS,
  GROOVE_TAGS,
  DEFAULT_INST_FX,
  emptyMeasure,
  DRUM_INSTRUMENTS,
  DEFAULT_VELOCITY,
  MIN_VELOCITY,
  MAX_VELOCITY,
  clampVelocity,
  SWING_MIN,
  SWING_MAX,
  SWING_PRESETS,
  clampSwing,
  clampLoopRange,
  type DrumInstrument,
  type KitType,
  type HouseMic,
  type HouseCrashModel,
  type CymbalPack,
  type DrumSong,
  type DrumMeasure,
  type NoteVariation,
  type DrumPattern,
  type DrumHit,
  type GrooveEntry,
  type GrooveTag,
  type InstFX,
  type InstPlugin,
  type LoopRange,
  useBottomNavigationStore,
  defaultPattern,
  mediaSessionCoordinator,
} from '@workspace/studio-core';

import { NoteHead } from '../components/DrumNoteHeads';
import { InstrumentRow } from '../components/InstrumentRow';
import DrumPaperPreview, { type DrumExportConfig } from '../components/DrumPaperPreview';
import DrumExportModal from '../components/DrumExportModal';
import DrumImportModal from '../components/DrumImportModal';
import { MetronomePanel } from '../components/MetronomePanel';
import { DrumBeatsPanel } from '../components/DrumBeatsPanel';
import { DrumPatternsPanel } from '../components/DrumPatternsPanel';
import {
  drumScheduler,
  samplePool,
  loadDrumSamples,
  loadHouseKit,
  houseKitPool,
  setHouseKitMic,
  setHouseInstVelOverrides,
  HOUSE_VEL_CONFIGS,
  HOUSE_INST_LABELS,
  setHouseCrashModel as audioSetHouseCrashModel,
  setCymbalPackAudio,
  setRandomVariations,
  setHumanizeVelocity,
  KIT_DEFAULTS,
  getSoundForVariation,
  setInstFXMap,
  setInstPluginMap,
  getAudioCtx,
  type SampleStatus,
  type HouseInstName,
} from '@workspace/studio-core';

import DrumPrefsPanel from './DrumPrefsPanel';
import { StaggeredReveal } from '../../../shared/animation';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import WebAppSectionDock from '../../../shared/layout/WebAppSectionDock';
import { ScreenScaffold, ScrollScaffold } from '../../../shared/layout/StudioLayoutSystem';
import { Button, EmptyState, Input } from '../../../shared/design-system/StudioDesignSystem';
import {
  Toggle as ToggleComponent,
  SegmentedControl,
} from '../../../shared/settings/SettingControls';

// ── Layout ──────────────────────────────────────────────────────────────────
const LABEL_W = 104;
const ROW_H = 44;
const RULER_H = 28;
const SYS_SEP = 10;
const MIN_STEP = 16;

// Core instruments always visible; extras are collapsible.
// Order mirrors KIT_INSTRUMENTS display order: high → low pitch.
const CORE_INSTS: DrumInstrument[] = ['hihat-closed', 'snare', 'kick', 'crash'];

const getInstrumentColor = (inst: DrumInstrument, isLight: boolean, noteColor: string): string => {
  if (isLight) {
    switch (inst) {
      case 'kick':
      case 'snare':
        return '#09090b'; // zinc-950 (black/dark zinc)
      case 'hihat-closed':
      case 'hihat-open':
      case 'hihat-foot':
        return '#27272a'; // zinc-800
      case 'tom-high':
      case 'tom-mid':
      case 'tom-floor':
        return '#3f3f46'; // zinc-700
      case 'crash':
      case 'ride':
        return '#52525b'; // zinc-600
      default:
        return '#09090b';
    }
  }
  return INSTRUMENT_COLOR[inst] ?? noteColor;
};

// Staff lines within each row (fraction of ROW_H)
const STAFF_YF = [0.29, 0.52, 0.75] as const;

// Notehead vertical position within ROW_H — mirrors real notation positions
const NOTE_YF: Record<DrumInstrument, number> = {
  crash: 0.12,
  'hihat-closed': 0.12,
  'hihat-open': 0.12,
  ride: 0.12,
  'tom-high': 0.29,
  snare: 0.52,
  'tom-mid': 0.65,
  'tom-floor': 0.78,
  kick: 0.88,
  'hihat-foot': 0.88,
};

const SHORT_LABEL: Record<DrumInstrument, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'HH',
  'hihat-open': 'O.HH',
  'hihat-foot': 'HHF',
  'tom-high': 'Hi',
  'tom-mid': 'Mid',
  'tom-floor': 'Floor',
  crash: 'Cym',
  ride: 'Ride',
};
const INST_LABEL: Record<DrumInstrument, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'Hi-Hat',
  'hihat-open': 'Open HH',
  'hihat-foot': 'HH Foot',
  'tom-high': 'Tom Hi',
  'tom-mid': 'Tom Mid',
  'tom-floor': 'Floor Tom',
  crash: 'Cymbal',
  ride: 'Ride',
};
const KIT_LABEL: Record<KitType, string> = {
  ludwig: 'Acoustic • House Kit',
  jazz: 'Acoustic • House Kit',
  rock: 'Acoustic • House Kit',
  vintage: 'Acoustic • House Kit',
  studio: 'Acoustic • House Kit',
  r8: 'Acoustic • House Kit',
  linn: 'Acoustic • House Kit',
  funk: 'Acoustic • House Kit',
  cr78: 'Acoustic • House Kit',
  tr808: 'Acoustic • House Kit',
  techno: 'Acoustic • House Kit',
  stark: 'Acoustic • House Kit',
  rmm: 'Acoustic • House Kit',
  chrome: 'Acoustic • House Kit',
  house: 'Acoustic • House Kit',
};

// ── Per-instrument character presets ─────────────────────────────────────────
// Each preset applies a curated combination of FX values in one tap.
// Values use the same range as the sliders (0-1 for knobs, Â±12 for EQ dB).
type FXPreset = { label: string; values: Partial<InstFX> };
const INST_PRESETS: Partial<Record<DrumInstrument, FXPreset[]>> = {
  snare: [
    {
      label: 'Tight',
      values: { gate: 0.72, eqHigh: 5, eqMid: 3, compress: 0.5, attack: 0.08, reverb: 0 },
    },
    {
      label: 'Fat',
      values: { eqLow: 6, eqLowMid: 3, eqMid: 1, compress: 0.38, attack: 0.3, reverb: 0.12 },
    },
    {
      label: 'Crack',
      values: { eqHigh: 8, eqMid: 5, gate: 0.42, compress: 0.6, attack: 0.04, reverb: 0 },
    },
    { label: 'Brush', values: { eqLow: 2, eqHigh: -3, reverb: 0.3, compress: 0.18, attack: 0.42 } },
  ],
  kick: [
    { label: 'Sub', values: { eqLow: 8, eqMid: -4, eqHigh: -2, gate: 0.3 } },
    { label: 'Punch', values: { eqLowMid: 5, compress: 0.5, attack: 0.15, gate: 0.28 } },
    { label: 'Click', values: { eqMid: 6, eqLow: -3, compress: 0.35, attack: 0.04 } },
    { label: 'Tight', values: { gate: 0.65, eqHigh: 2, compress: 0.55, attack: 0.06 } },
  ],
  'hihat-closed': [
    { label: 'Bright', values: { eqHigh: 6 } },
    { label: 'Dark', values: { eqHigh: -5, eqLowMid: 2 } },
    { label: 'Crisp', values: { eqHigh: 4, compress: 0.3, attack: 0.04 } },
  ],
  'hihat-open': [
    { label: 'Bright', values: { eqHigh: 5 } },
    { label: 'Dark', values: { eqHigh: -5 } },
    { label: 'Wash', values: { reverb: 0.38, eqHigh: 2 } },
  ],
  crash: [
    { label: 'Bright', values: { eqHigh: 6 } },
    { label: 'Dark', values: { eqHigh: -5, reverb: 0.22 } },
    { label: 'Long', values: { reverb: 0.45 } },
  ],
  ride: [
    { label: 'Bright', values: { eqHigh: 5 } },
    { label: 'Dark', values: { eqHigh: -4, reverb: 0.18 } },
    { label: 'Bell', values: { eqHigh: 3, eqMid: 4, compress: 0.3, attack: 0.05 } },
  ],
  'tom-high': [
    { label: 'Warm', values: { eqLow: 4, eqHigh: -2, reverb: 0.15 } },
    { label: 'Attack', values: { eqMid: 4, compress: 0.45, attack: 0.08, gate: 0.32 } },
  ],
  'tom-mid': [
    { label: 'Warm', values: { eqLow: 4, eqHigh: -2, reverb: 0.15 } },
    { label: 'Attack', values: { eqMid: 4, compress: 0.45, attack: 0.08, gate: 0.32 } },
  ],
  'tom-floor': [
    { label: 'Deep', values: { eqLow: 6, eqMid: -2, reverb: 0.12 } },
    { label: 'Punch', values: { eqLowMid: 4, compress: 0.42, attack: 0.1 } },
  ],
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const KIT_IMAGE: Record<KitType, string> = {
  ludwig: `${BASE}/kit-warm.webp`,
  jazz: `${BASE}/kit-soft.webp`,
  rmm: `${BASE}/kit-punchy.webp`,
  chrome: `${BASE}/kit-bright.webp`,
  rock: `${BASE}/kit-rock.webp`,
  vintage: `${BASE}/kit-vintage.webp`,
  studio: `${BASE}/kit-studio.webp`,
  r8: `${BASE}/kit-advanced.webp`,
  linn: `${BASE}/kit-linn.webp`,
  funk: `${BASE}/kit-funk.webp`,
  cr78: `${BASE}/kit-cr78.webp`,
  tr808: `${BASE}/kit-tr808.webp`,
  techno: `${BASE}/kit-electronic.webp`,
  stark: `${BASE}/kit-stark.webp`,
  house: `${BASE}/kit-house.webp`,
};
const KIT_CATEGORIES: { id: string; kits: KitType[] }[] = [
  { id: 'acoustic', kits: ['ludwig', 'jazz', 'rmm', 'chrome'] },
  { id: 'studio', kits: ['studio', 'r8', 'linn', 'funk'] },
  { id: 'electric', kits: ['cr78', 'tr808', 'techno', 'stark'] },
  { id: 'ultrahd', kits: ['house'] },
];

// ── Tabs ───────────────────────────────────────────────────────────────────
type DrumTab = 'metronome' | 'songs' | 'patterns' | 'prefs';
const TAB_ORDER: DrumTab[] = ['metronome', 'songs', 'patterns', 'prefs'];

const DRUM_VIEWS = ['metronome', 'songs-list', 'songs-editor', 'patterns', 'prefs'] as const;
type DrumView = (typeof DRUM_VIEWS)[number];

// ── SVG note heads (memoized — rendered hundreds of times in the grid) ─────
function IconDrumSongs({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  const ao = active ? 0.13 : 0;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={sw}
        fill="currentColor"
        fillOpacity={ao}
      />
      <line
        x1="7.5"
        y1="8"
        x2="16.5"
        y2="8"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
      <line
        x1="7.5"
        y1="12"
        x2="16.5"
        y2="12"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
      <line
        x1="7.5"
        y1="16"
        x2="13"
        y2="16"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconPatterns({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth={sw} />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={sw * 0.7} />
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth={sw * 0.7} />
      <circle cx="7" cy="6" r="1.2" fill="currentColor" />
      <circle cx="12" cy="6" r="1.2" fill="currentColor" />
      <circle cx="17" cy="12" r="1.2" fill="currentColor" />
      <circle cx="7" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" />
      <circle cx="17" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconMixer({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  const ao = active ? 1 : 0;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <line
        x1="5"
        y1="19"
        x2="5"
        y2="10"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <circle
        cx="5"
        cy="10"
        r="2.2"
        fill="currentColor"
        fillOpacity={ao}
        stroke="currentColor"
        strokeWidth={active ? 0 : sw - 0.3}
      />
      <line
        x1="12"
        y1="19"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="6"
        r="2.2"
        fill="currentColor"
        fillOpacity={ao}
        stroke="currentColor"
        strokeWidth={active ? 0 : sw - 0.3}
      />
      <line
        x1="19"
        y1="19"
        x2="19"
        y2="13"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <circle
        cx="19"
        cy="13"
        r="2.2"
        fill="currentColor"
        fillOpacity={ao}
        stroke="currentColor"
        strokeWidth={active ? 0 : sw - 0.3}
      />
    </svg>
  );
}

function IconPrefs({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="9"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="9"
        x2="14"
        y2="15"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="15"
        x2="10"
        y2="21"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Bottom nav (Metronome / Songs / Patterns / Prefs) ──────────────────────
function IconMetronome({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  const ao = active ? 0.13 : 0;
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M12 2L5 21h14L12 2z" fill="currentColor" fillOpacity={ao} />
      <path d="M12 7v10" strokeWidth="1.5" opacity="0.5" />
      <path d="M12 17L15 8" strokeWidth="2" />
      <circle cx="15" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function useDrumNavTabs(): { id: DrumTab; label: string; Icon: React.FC<{ active: boolean }> }[] {
  const t = useT();
  return [
    { id: 'metronome', label: (t.drum as any)?.metronome || 'Metronome', Icon: IconMetronome },
    { id: 'songs', label: t.drum.songs, Icon: IconDrumSongs },
    { id: 'patterns', label: t.drum.patterns, Icon: IconPatterns },
    { id: 'prefs', label: t.drum.preferences, Icon: IconPrefs },
  ];
}
function DrumNav({
  activeTab,
  setTab,
  accent,
  isLight,
  isAmoled,
  hidden,
}: {
  activeTab: DrumTab;
  setTab: (t: DrumTab) => void;
  accent: { from: string; to: string };
  isLight: boolean;
  isAmoled: boolean;
  hidden?: boolean;
}) {
  const ALL_NAV_TABS = useDrumNavTabs();
  const isWebDesktop = useIsWebDesktop();

  useEffect(() => {}, []);

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: 'var(--c-text-muted)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        margin: '0 0 8px',
        padding: '0 20px',
      }}
    >
      {children}
    </p>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        margin: '0 16px 20px',
        background: 'var(--app-surface)',
        borderRadius: 14,
        border: '1px solid rgba(128,128,128,0.07)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Export config ───────────────────────────────────────────────────────────

// ── JSON export ─────────────────────────────────────────────────────────────
async function exportDrumSongJSON(
  patterns: DrumPattern[],
  song: DrumSong | null,
  mode: 'save' | 'share' = 'share'
) {
  const payload = {
    _app: 'Drumex',
    exportedAt: new Date().toISOString(),
    song: song ? { id: song.id, name: song.name, artist: song.artist, notes: song.notes } : null,
    patterns: patterns.map((p) => ({
      id: p.id,
      name: p.name,
      bpm: p.bpm,
      subdivision: p.subdivision,
      mutedInstruments: p.mutedInstruments ?? [],
      measures: p.measures.map((m: DrumMeasure) => ({ id: m.id, hits: m.hits })),
    })),
  };
  const fileName = `${song?.name ?? 'drumex'}.json`;
  const jsonStr = JSON.stringify(payload, null, 2);
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const written = await Filesystem.writeFile({
        path: fileName,
        data: b64,
        directory: Directory.Cache,
        recursive: true,
      });
      if (mode === 'share') await Share.share({ title: fileName, url: written.uri });
      else
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: b64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
    } catch {
      /* fall through to web download */
    }
    return;
  }
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export ──────────────────────────────────────────────────────────────
const HEX_TO_RGB = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Instruments that use an X notehead (cymbals)
const IS_CYMBAL: Partial<Record<DrumInstrument, boolean>> = {
  crash: true,
  ride: true,
  'hihat-closed': true,
  'hihat-open': true,
  'hihat-foot': true,
};
// Instruments whose stem goes downward
const STEM_DOWN: Partial<Record<DrumInstrument, boolean>> = {
  kick: true,
  'hihat-foot': true,
};

export default function DrumEditor() {
  const settings = useSettingsStore(useShallow((s) => s.settings));

  const isWebDesktop = useIsWebDesktop();
  const [isLargeDesktop, setIsLargeDesktop] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (!isWebDesktop) return;
    const handleResize = () => {
      setIsLargeDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isWebDesktop]);
  const {
    patterns,
    activePatternId,
    soundMap,
    volumeMap,
    masterVolume,
    kitType,
    activeInstruments,
    setKitType,
    toggleInstrument,
    setMasterVolume,
    setVolumeForInstrument,
    toggleHit,
    simpleToggleHit,
    setHitVelocity,
    addMeasure,
    deleteMeasure,
    clearMeasure,
    duplicateMeasure,
    updatePattern,
    addBlankPattern,
    duplicatePattern,
    deletePattern,
    renamePattern,
    setActivePattern,
    drumSongs,
    saveDrumSong,
    createBlankDrumSong,
    loadDrumSong,
    deleteDrumSong,
    updateDrumSong,
    restorePatterns,
    insertMeasureAfter,
    togglePatternMute,
    importDrumSong,
    grooves,
    saveGroove,
    deleteGroove,
    renameGroove,
    loadGrooveReplace,
    loadGrooveAppend,
    duplicateGroove,
    instFX,
    setInstFX,
    instPlugins,
    setInstPlugins,
    houseKitMic,
    setHouseKitMic: storeSetHouseKitMic,
    houseInstVelOverride,
    setHouseInstVelOverride: storeSetInstVelOverride,
    houseCrashModel,
    setHouseCrashModel: storeSetHouseCrashModel,
    cymbalPack,
    setCymbalPack: storeSetCymbalPack,
    drumPrefs,
    updateDrumPrefs,
  } = useDrumStore();

  const pattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId) ?? patterns[0] ?? defaultPattern(),
    [patterns, activePatternId]
  );
  const accent = resolveAccent(settings.accentColor);
  const spm = stepsPerMeasure(pattern);
  const stepsPerBeat = pattern.subdivision / pattern.timeSignature[1];
  const kit = kitType ?? 'house';
  const ALL_INSTS = KIT_INSTRUMENTS[kit] ?? KIT_INSTRUMENTS.house;

  // ── Theme — use per-app drums theme, fall back to global ─────────────────
  const drumsVis = settings.perApp?.drumex ?? {
    theme: settings.theme ?? 'dark',
    amoledMode: settings.amoledMode ?? false,
  };
  const isLight = (() => {
    if (drumsVis.theme === 'light') return true;
    if (drumsVis.theme === 'system') {
      return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      );
    }
    if (drumsVis.theme === 'dynamic') {
      const h = new Date().getHours();
      const lightStart = settings.dynamicLightStart ?? 7;
      const lightEnd = settings.dynamicLightEnd ?? 20;
      return h >= lightStart && h < lightEnd;
    }
    return false;
  })();
  const isAmoled = !isLight && (drumsVis.amoledMode ?? false);
  // SVG/canvas colors — CSS vars can't be used directly in SVG props
  const noteColor = isLight ? '#111118' : '#ffffff';
  const staffColor = isLight ? 'rgba(9, 9, 11, 0.08)' : 'rgba(255, 255, 255, 0.05)';
  const barColor = isLight ? 'rgba(9, 9, 11, 0.25)' : 'rgba(255, 255, 255, 0.15)';
  const altBg = isLight ? 'rgba(9, 9, 11, 0.015)' : 'rgba(255, 255, 255, 0.008)';

  const ROW_H = isWebDesktop ? 68 : 44;
  const rowGap = isWebDesktop ? 8 : 0;

  // ── Landscape detection ──────────────────────────────────────────────────
  const [isLandscape, setIsLandscape] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth > window.innerHeight &&
      window.innerWidth >= 600
  );
  useEffect(() => {
    const check = () =>
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth >= 600);
    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) {
      mql.addEventListener('change', check);
    } else {
      mql.addListener(check);
    }
    window.addEventListener('resize', check);
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', check);
      } else {
        mql.removeListener(check);
      }
      window.removeEventListener('resize', check);
    };
  }, []);

  // ── State ────────────────────────────────────────────────────────────────
  const activeTab = useNavigationStore((s) => {
    const lastRoute = s.history[s.history.length - 1];
    if (lastRoute?.app === 'drumex' && lastRoute.page) {
      const page = lastRoute.page;
      if (page === 'metronome') return 'metronome';
      if (page === 'songs' || page === 'beats') return 'songs';
      if (page === 'patterns' || page === 'prefs') return page as DrumTab;
    }
    const st = useSettingsStore.getState();
    if (st.settings.restoreLastSession) {
      const last = useSessionStore.getState().lastSession?.drumexTab;
      if (last === 'metronome' || last === 'songs' || last === 'patterns' || last === 'prefs')
        return last;
    }
    const dt = st.settings.defaultDrumTab;
    return (
      dt === 'metronome' || dt === 'songs' || dt === 'patterns' || dt === 'prefs' ? dt : 'songs'
    ) as DrumTab;
  });

  const inEditor = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return last?.app === 'drumex' && last.subView === 'editor';
  });

  // Persist the active Drumex tab on every change.
  useEffect(() => {
    useSessionStore.getState().setLastSession({ drumexTab: activeTab });
  }, [activeTab]);

  const activePatternIdRef = useRef(activePatternId);
  activePatternIdRef.current = activePatternId;
  const patternsRef = useRef(patterns);
  patternsRef.current = patterns;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const patternRef = useRef(pattern);
  patternRef.current = pattern;
  const kitTypeRef = useRef(kitType);
  kitTypeRef.current = kitType;
  const houseKitMicRef = useRef(houseKitMic);
  houseKitMicRef.current = houseKitMic;
  const houseCrashModelRef = useRef(houseCrashModel);
  houseCrashModelRef.current = houseCrashModel;
  const cymbalPackRef = useRef(cymbalPack);
  cymbalPackRef.current = cymbalPack;

  useEffect(() => {
    registerDebugProvider({
      id: 'drumex',
      name: 'Drumex Editor',
      getDebugState: () => ({
        activePatternId: activePatternIdRef.current,
        patternsCount: patternsRef.current?.length || 0,
        activeTab: activeTabRef.current,
        isPlaying: drumScheduler?.isPlaying || false,
        tempo: patternRef.current?.bpm || 120,
        swing: patternRef.current?.swing || 0,
        kitType: kitTypeRef.current || 'house',
        houseKitMic: houseKitMicRef.current,
        loopRange: patternRef.current?.loopRange || null,
        soundState: {
          houseCrashModel: houseCrashModelRef.current,
          cymbalPack: cymbalPackRef.current,
        },
      }),
    });
    return () => {
      unregisterDebugProvider('drumex');
    };
  }, []);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(() => drumPrefs.loopPlayback);
  const [countingIn, setCountingIn] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('idle');
  const [houseLoaded, setHouseLoaded] = useState(false);
  const [houseProgress, setHouseProgress] = useState({ loaded: 0, total: 0 });
  const [showBpmPanel, setShowBpmPanel] = useState(false);
  const [showBpmPopover, setShowBpmPopover] = useState(false);
  const [bpmInputVal, setBpmInputVal] = useState(() => pattern.bpm.toString());
  const [songOpenUp, setSongOpenUp] = useState(false);
  const metronomeBtnRef = useRef<HTMLButtonElement | null>(null);
  const renameBtnRef = useRef<HTMLButtonElement | null>(null);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    position: 'above' | 'below';
  } | null>(null);

  const updatePopoverPosition = useCallback(() => {
    if (!showBpmPopover || !metronomeBtnRef.current) return;
    const rect = metronomeBtnRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 230; // approximate height
    const padding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, left));

    let position: 'above' | 'below' = 'below';
    let top = rect.bottom + 8;

    if (
      top + popoverHeight + padding > window.innerHeight &&
      rect.top - popoverHeight - 8 - padding > 0
    ) {
      position = 'above';
      top = rect.top - popoverHeight - 8;
    }

    setPopoverCoords({ top, left, position });
  }, [showBpmPopover]);

  useEffect(() => {
    if (!showBpmPopover) return;
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition, { passive: true });
    window.addEventListener('scroll', updatePopoverPosition, { capture: true, passive: true });

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBpmPopover(false);
        metronomeBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showBpmPopover, updatePopoverPosition]);

  useEffect(() => {
    setBpmInputVal(pattern.bpm.toString());
  }, [pattern.bpm]);

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avgMs = sum / (tapTimesRef.current.length - 1);
      const calculatedBpm = Math.round(60000 / avgMs);
      const clampedBpm = Math.max(40, Math.min(280, calculatedBpm));
      updatePattern(pattern.id, { bpm: clampedBpm });
    }
  }, [pattern.id, updatePattern]);

  const commitBpm = useCallback(
    (valStr: string) => {
      let bpmVal = parseInt(valStr, 10);
      if (isNaN(bpmVal)) {
        bpmVal = pattern.bpm;
      } else {
        bpmVal = Math.max(40, Math.min(280, bpmVal));
      }
      setBpmInputVal(bpmVal.toString());
      updatePattern(pattern.id, { bpm: bpmVal });
    },
    [pattern.id, pattern.bpm, updatePattern]
  );

  const handleBpmKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitBpm(bpmInputVal);
        e.currentTarget.blur();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextBpm = Math.min(280, pattern.bpm + (e.shiftKey ? 5 : 1));
        updatePattern(pattern.id, { bpm: nextBpm });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextBpm = Math.max(40, pattern.bpm - (e.shiftKey ? 5 : 1));
        updatePattern(pattern.id, { bpm: nextBpm });
      }
    },
    [bpmInputVal, pattern.bpm, pattern.id, updatePattern, commitBpm]
  );

  const changeBpmBy = useCallback(
    (delta: number) => {
      const nextBpm = Math.max(40, Math.min(280, pattern.bpm + delta));
      updatePattern(pattern.id, { bpm: nextBpm });
    },
    [pattern.bpm, pattern.id, updatePattern]
  );

  const [showLoopPanel, setShowLoopPanel] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [hamburgerClosing, setHamburgerClosing] = useState(false);
  const [showSoundCharacter, setShowSoundCharacter] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => new Set(['acoustic']));
  const [focusedInst, setFocusedInst] = useState<DrumInstrument | null>(null);
  const [soloInst, setSoloInst] = useState<DrumInstrument | null>(null);
  const handleToggleSolo = useCallback((inst: DrumInstrument) => {
    setSoloInst((prev) => (prev === inst ? null : inst));
  }, []);
  const [sideTab, setSideTab] = useState<'kit' | 'mixer' | 'fx'>('kit');
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  // Songs panel state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createArtist, setCreateArtist] = useState('');
  const [createBpm, setCreateBpm] = useState('120');
  const [createNotes, setCreateNotes] = useState('');
  const [createFamily, setCreateFamily] = useState<string>('acoustic');
  const [createVariant, setCreateVariant] = useState<KitType>('house');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveArtist, setSaveArtist] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [songSearch, setSongSearch] = useState('');
  const [songKitFilter, setSongKitFilter] = useState('all');
  const [songSort, setSongSort] = useState<'recent' | 'name' | 'bpm'>('recent');
  const [songMenuId, setSongMenuId] = useState<string | null>(null);
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!songMenuId) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSongMenuId(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [songMenuId]);
  const [editingSong, setEditingSong] = useState<DrumSong | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingArtist, setEditingArtist] = useState('');
  const activeDrumSongId = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return last?.app === 'drumex' && last.subView === 'editor' ? last.id || null : null;
  });

  const currentView: DrumView =
    activeTab === 'metronome'
      ? 'metronome'
      : activeTab === 'patterns'
        ? 'patterns'
        : activeTab === 'prefs'
          ? 'prefs'
          : inEditor
            ? 'songs-editor'
            : 'songs-list';

  const filteredSongs = useMemo(() => {
    let list = [...drumSongs];
    if (songKitFilter !== 'all') {
      list = list.filter((s) => s.kitType === songKitFilter);
    }
    if (songSearch.trim()) {
      const q = songSearch.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q))
      );
    }
    if (songSort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (songSort === 'bpm') {
      list.sort((a, b) => {
        const aPat = a.patterns.find((p: any) => p.id === a.activePatternId) ?? a.patterns[0];
        const bPat = b.patterns.find((p: any) => p.id === b.activePatternId) ?? b.patterns[0];
        const aBpm = aPat?.bpm ?? 120;
        const bBpm = bPat?.bpm ?? 120;
        return bBpm - aBpm;
      });
    } else {
      list.reverse();
    }
    return list;
  }, [drumSongs, songSearch, songKitFilter, songSort]);
  const [collapsedKitSections, setCollapsedKitSections] = useState<Record<string, boolean>>({
    'drum-kit': false,
    'kit-variant': false,
    'mic-position': true,
    'sound-character': true,
    'advanced-kit-options': true,
  });
  const [collapsedMixerSections, setCollapsedMixerSections] = useState<Record<string, boolean>>({
    master: false,
    levels: false,
    pan: true,
    'room-send': true,
  });
  const [collapsedFxSections, setCollapsedFxSections] = useState<Record<string, boolean>>({
    'global-fx': false,
    'per-instrument-fx': false,
    'reverb-room': true,
    'humanize-groove-feel': true,
  });
  const handleSetTab = (newTab: DrumTab) => {
    NavigationDispatcher.push({ app: 'drumex', page: newTab === 'songs' ? 'beats' : newTab });
    setNavCollapsed(false);
    drumNavLastY.current = 0;
  };

  useEffect(() => {
    if (activeTab !== 'metronome') {
      useMetronomeStore.getState().stop();
    }
  }, [activeTab]);
  const [humanizeFeedback, setHumanizeFeedback] = useState(false);

  // ── Row visibility (persisted to localStorage) ───────────────────────────
  const [showExtraRows, setShowExtraRows] = useState<boolean>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('chordex-drum-ui') ?? '{}');
      return v.showExtraRows !== false;
    } catch {
      return true;
    }
  });

  // ── Undo / Redo stacks ───────────────────────────────────────────────────
  type HistoryEntry = { patterns: typeof patterns; activePatternId: string | null };
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [historyCount, setHistoryCount] = useState(0);

  // ── Bar copy/paste clipboard ──────────────────────────────────────────────
  const [copiedMeasure, setCopiedMeasure] = useState<DrumMeasure | null>(null);
  const [openBarMenu, setOpenBarMenu] = useState<string | null>(null); // measureId
  const [flashBarId, setFlashBarId] = useState<string | null>(null); // brief highlight on paste

  // ── Per-instrument FX sheet ────────────────────────────────────────────────
  const [showFXSheet, setShowFXSheet] = useState(false);
  const [fxInst, setFxInst] = useState<DrumInstrument>('kick');

  // Sync instFX + instPlugins store → drumAudio module whenever they change
  useEffect(() => {
    setInstFXMap(instFX);
  }, [instFX]);
  useEffect(() => {
    setInstPluginMap(instPlugins);
  }, [instPlugins]);
  useEffect(() => {
    setHouseInstVelOverrides(houseInstVelOverride);
  }, [houseInstVelOverride]);
  useEffect(() => {
    audioSetHouseCrashModel(houseCrashModel);
  }, [houseCrashModel]);
  useEffect(() => {
    setCymbalPackAudio(cymbalPack);
  }, [cymbalPack]);
  useEffect(() => {
    setRandomVariations(drumPrefs.randomVariations);
  }, [drumPrefs.randomVariations]);
  useEffect(() => {
    setHumanizeVelocity(drumPrefs.humanizeVelocity);
  }, [drumPrefs.humanizeVelocity]);

  // ── Quick mixer sheet + export modal + import modal ──────────────────────
  const [showMixerSheet, setShowMixerSheet] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportDrum, setShowImportDrum] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Groove Library state ──────────────────────────────────────────────────
  const [grooveFilter, setGrooveFilter] = useState<GrooveTag>('');
  const [patRenameId, setPatRenameId] = useState<string | null>(null);
  const [patRenameName, setPatRenameName] = useState('');
  const [grooveMenuId, setGrooveMenuId] = useState<string | null>(null);
  const [previewingGrooveId, setPreviewingGrooveId] = useState<string | null>(null);
  const [showSaveGroove, setShowSaveGroove] = useState(false);
  const [savGrName, setSavGrName] = useState('');
  const [savGrTag, setSavGrTag] = useState<GrooveTag>('');
  const [grooveRenameId, setGrooveRenameId] = useState<string | null>(null);
  const [grooveRenameName, setGrooveRenameName] = useState('');
  const [grooveRenameTag, setGrooveRenameTag] = useState<GrooveTag>('');

  // ── Container width ──────────────────────────────────────────────────────
  // Use a stable callback ref so the observer re-attaches every time the
  // container div mounts (e.g. first open of the editor, or after a tab switch
  // remounts the content wrapper). A plain useEffect(fn,[]) misses mounts that
  // happen after the initial render because containerRef.current is null then.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const _roRef = useRef<ResizeObserver | null>(null);
  const _rafRef = useRef<number | null>(null);

  const containerCallbackRef = useCallback((el: HTMLDivElement | null) => {
    // Tear down previous observer / animation frame
    if (_roRef.current) {
      _roRef.current.disconnect();
      _roRef.current = null;
    }
    if (_rafRef.current !== null) {
      cancelAnimationFrame(_rafRef.current);
      _rafRef.current = null;
    }
    // Keep the imperative ref in sync (used by pointer/playhead handlers)
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (!el) return;

    const update = (w: number) => {
      if (w > 0) setContainerW(w);
    };

    let tries = 0;
    const poll = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width;
      if (w > 0) {
        update(w);
        return;
      }
      if (tries++ < 40) _rafRef.current = requestAnimationFrame(poll);
    };
    poll();

    const ro = new ResizeObserver((e) => update(e[0].contentRect.width));
    ro.observe(el);
    _roRef.current = ro;
  }, []);

  // ── Visible instruments ───────────────────────────────────────────────────
  const extraInsts = useMemo(() => ALL_INSTS.filter((i) => !CORE_INSTS.includes(i)), [ALL_INSTS]);
  const patternMuted = useMemo(
    () => new Set(pattern.mutedInstruments ?? []),
    [pattern.mutedInstruments]
  );
  const visibleInsts = useMemo(() => {
    return showExtraRows ? ALL_INSTS : ALL_INSTS.filter((i) => CORE_INSTS.includes(i));
  }, [ALL_INSTS, showExtraRows]);

  // ── Layout ───────────────────────────────────────────────────────────────
  const availableW = containerW - LABEL_W;
  // rawMpr: how many measures fit per row at the minimum step width.
  // In landscape the screen is wider so rawMpr is naturally larger →
  // more measures shown per row without stretching any of them.
  const rawMpr = Math.max(1, Math.floor(availableW / (spm * MIN_STEP)));
  const measuresPerRow = isLandscape ? pattern.measures.length : 1;
  const MEASURE_W = isLandscape
    ? pattern.measures.length <= 2
      ? (availableW - 16) / Math.max(1, pattern.measures.length)
      : Math.max(340, availableW / 2.5)
    : availableW;
  const STEP_W = MEASURE_W / spm;
  const SYSTEM_H =
    RULER_H +
    visibleInsts.length * ROW_H +
    (visibleInsts.length > 0 ? (visibleInsts.length - 1) * rowGap : 0);
  const FULL_SYS_H = SYSTEM_H + SYS_SEP;

  const spmRef = useRef(spm);
  spmRef.current = spm;
  const mprRef = useRef(measuresPerRow);
  mprRef.current = measuresPerRow;
  const stepWRef = useRef(STEP_W);
  stepWRef.current = STEP_W;
  const measureWRef = useRef(MEASURE_W);
  measureWRef.current = MEASURE_W;
  const sysHRef = useRef(FULL_SYS_H);
  sysHRef.current = FULL_SYS_H;
  const allInstsRef = useRef(visibleInsts);
  allInstsRef.current = visibleInsts;
  const activeDragInst = useRef<DrumInstrument | null>(null);
  const totalStepsRef = useRef(spm * pattern.measures.length);
  totalStepsRef.current = spm * pattern.measures.length;
  const secPerStepRef = useRef(0);
  secPerStepRef.current = 60 / pattern.bpm / (pattern.subdivision / pattern.timeSignature[1]);

  // ── System rows ──────────────────────────────────────────────────────────
  const systemRows = useMemo(() => {
    const rows: (typeof pattern.measures)[] = [];
    for (let i = 0; i < pattern.measures.length; i += measuresPerRow)
      rows.push(pattern.measures.slice(i, i + measuresPerRow));
    return rows;
  }, [pattern.measures, measuresPerRow]);

  // ── Smart loop range (clamped against current bar count) ─────────────────
  // Always derive a valid range; `loopActive` gates visual + audio behavior.
  const effectiveLoop = useMemo<LoopRange>(
    () => clampLoopRange(pattern.loopRange, pattern.measures.length),
    [pattern.loopRange, pattern.measures.length]
  );
  const loopActive = effectiveLoop.enabled && pattern.measures.length > 0;

  // ── Hit maps (step → { variation, velocity }) ────────────────────────────

  // ── Scroll-hide for bottom nav ────────────────────────────────────────────
  const drumNavLastY = useRef(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragFilled = useRef(new Set<string>());
  const countInTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    samplePool.onStatusChange = (s) => setSampleStatus(s);
    setSampleStatus(samplePool.status);
    return () => {
      samplePool.onStatusChange = null;
    };
  }, []);
  // Cleanup on unmount: stop scheduler + clear any pending count-in timers
  useEffect(() => {
    return () => {
      drumScheduler.stop();
      countInTimers.current.forEach(clearTimeout);
      countInTimers.current = [];
    };
  }, []);
  useEffect(() => {
    if (kitType) loadDrumSamples(kitType);
  }, [kitType]);

  // House kit: load Opus samples when kit === 'house' or mic changes
  useEffect(() => {
    if (kit !== 'house') return;
    houseKitPool.onStatusChange = (loaded, total) => {
      setHouseProgress({ loaded, total });
      if (loaded >= total) setHouseLoaded(true);
    };
    setHouseLoaded(houseKitPool.ready);
    loadHouseKit(houseKitMic);
    return () => {
      houseKitPool.onStatusChange = null;
    };
  }, [kit, houseKitMic]);

  useEffect(() => {
    if (playing) drumScheduler.updatePattern(pattern);
  }, [pattern, playing]);

  // ── Scroll-hide: attach to grid scroll container ──────────────────────────
  const drumScrollHide = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    if (y < 30) {
      setNavCollapsed(false);
      drumNavLastY.current = y;
      return;
    }
    const dy = y - drumNavLastY.current;
    if (Math.abs(dy) < 6) return;
    setNavCollapsed(dy > 0);
    drumNavLastY.current = y;
  }, []);

  // ── Auto-save: persist patterns/kit into the loaded song whenever they change
  useEffect(() => {
    if (!activeDrumSongId) return;
    const t = setTimeout(() => {
      updateDrumSong(activeDrumSongId, {
        patterns: JSON.parse(JSON.stringify(patterns)),
        activePatternId: activePatternId ?? patterns[0]?.id ?? '',
        kitType,
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns, activePatternId, kitType, activeDrumSongId]);

  // ── Playhead ─────────────────────────────────────────────────────────────
  const endAdvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drumPrefsRef = useRef(drumPrefs);
  useEffect(() => {
    drumPrefsRef.current = drumPrefs;
  }, [drumPrefs]);
  // Low latency now lives globally (Studio Hub → Performance) and is wired in App.tsx.

  useEffect(() => {
    drumScheduler.onStep = (gs, mIdx, stepInM) => {
      if (endAdvTimerRef.current) {
        clearTimeout(endAdvTimerRef.current);
        endAdvTimerRef.current = null;
      }
      if (gs < 0) {
        if (playheadRef.current) {
          playheadRef.current.style.transform = `translate(${LABEL_W}px, 0px)`;
          playheadRef.current.style.display = 'block';
        }
        return;
      }
      const sp = spmRef.current;
      const mpr = mprRef.current;
      const sw = stepWRef.current;
      const sh = sysHRef.current;
      const systemIdx = Math.floor(mIdx / mpr);
      const measureInRow = mIdx % mpr;
      const stepInRow = measureInRow * sp + stepInM;
      const x = LABEL_W + stepInRow * sw;
      const y = systemIdx * sh;
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translate(${x}px, ${y}px)`;
        playheadRef.current.style.display = 'block';
      }
      const el = scrollRef.current;
      if (el) {
        const rowBottom =
          y +
          RULER_H +
          allInstsRef.current.length * ROW_H +
          (allInstsRef.current.length > 0 ? (allInstsRef.current.length - 1) * rowGap : 0);
        if (y < el.scrollTop || rowBottom > el.scrollTop + el.clientHeight)
          el.scrollTop = Math.max(0, y - 40);

        // Horizontal auto-scroll
        const leftBound = el.scrollLeft + LABEL_W;
        const rightBound = el.scrollLeft + el.clientWidth;
        if (x < leftBound) {
          el.scrollLeft = Math.max(0, x - LABEL_W - 20);
        } else if (x > rightBound - 40) {
          el.scrollLeft = x - el.clientWidth + 40;
        }
      }
      // ── Auto-expand ────────────────────────────────────────────────────────
      const totalSteps = drumScheduler.totalSteps;
      if (drumPrefsRef.current.autoExpandPattern && gs === totalSteps - 1) {
        const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
        const curPat = pts.find((p) => p.id === actId);
        if (curPat) useDrumStore.getState().addMeasure(curPat.id);
      }
      // On the last step, advance the playhead to the end bar line after one step duration
      if (gs === totalStepsRef.current - 1) {
        const endX = LABEL_W + (stepInRow + 1) * sw;
        endAdvTimerRef.current = setTimeout(() => {
          if (playheadRef.current)
            playheadRef.current.style.transform = `translate(${endX}px, ${y}px)`;
          endAdvTimerRef.current = null;
        }, secPerStepRef.current * 1000);
      }
    };
    return () => {
      drumScheduler.onStep = null;
      if (endAdvTimerRef.current) {
        clearTimeout(endAdvTimerRef.current);
        endAdvTimerRef.current = null;
      }
    };
  }, []);
  useEffect(
    () => () => {
      drumScheduler.stop();
      if (_roRef.current) {
        _roRef.current.disconnect();
        _roRef.current = null;
      }
      if (_rafRef.current !== null) {
        cancelAnimationFrame(_rafRef.current);
        _rafRef.current = null;
      }
      if (endAdvTimerRef.current) {
        clearTimeout(endAdvTimerRef.current);
        endAdvTimerRef.current = null;
      }
    },
    []
  );

  // ── Master volume → audio engine ─────────────────────────────────────────
  useEffect(() => {
    drumScheduler.setMasterVolume(masterVolume);
  }, [masterVolume]);

  // ── Row visibility persistence ────────────────────────────────────────────
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem('chordex-drum-ui') ?? '{}');
      localStorage.setItem('chordex-drum-ui', JSON.stringify({ ...prev, showExtraRows }));
    } catch {}
  }, [showExtraRows]);

  // ── Undo / Redo helpers ────────────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    undoStack.current.push({ patterns: JSON.parse(JSON.stringify(pts)), activePatternId: actId });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    setHistoryCount(undoStack.current.length);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return;
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    redoStack.current.push({ patterns: JSON.parse(JSON.stringify(pts)), activePatternId: actId });
    const prev = undoStack.current.pop()!;
    restorePatterns(prev.patterns, prev.activePatternId);
    setHistoryCount(undoStack.current.length);
  }, [restorePatterns]);

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length) return;
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    undoStack.current.push({ patterns: JSON.parse(JSON.stringify(pts)), activePatternId: actId });
    const next = redoStack.current.pop()!;
    restorePatterns(next.patterns, next.activePatternId);
    setHistoryCount(undoStack.current.length);
  }, [restorePatterns]);

  const handleAddBar = useCallback(() => {
    pushUndo();
    addMeasure(pattern.id);
  }, [pattern.id, addMeasure, pushUndo]);

  const prevMeasureCount = useRef(pattern.measures.length);
  useLayoutEffect(() => {
    const currentCount = pattern.measures.length;
    if (currentCount > prevMeasureCount.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          left: scrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }
    prevMeasureCount.current = currentCount;
  }, [pattern.measures.length]);

  // ── Keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) ──────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Metronome click ──────────────────────────────────────────────────────
  const playMetronomeClick = useCallback(
    (isBeat1: boolean, soundOverride?: string) => {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const dest = ctx.destination;
      const t = ctx.currentTime;
      const soundType = soundOverride || drumPrefs.metronomeSound || 'classic';

      if (soundType === 'wood') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        const pitch = isBeat1 ? 1400 : 1000;
        osc1.frequency.setValueAtTime(pitch, t);
        osc2.frequency.setValueAtTime(pitch * 1.4, t);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(isBeat1 ? 0.35 : 0.25, t + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(dest);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.06);
        osc2.stop(t + 0.06);
      } else if (soundType === 'studio') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        const pitch = isBeat1 ? 2500 : 1800;
        osc.frequency.setValueAtTime(pitch, t);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(isBeat1 ? 0.3 : 0.2, t + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
        osc.connect(gainNode);
        gainNode.connect(dest);
        osc.start(t);
        osc.stop(t + 0.02);
      } else if (soundType === 'digital') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        const pitch = isBeat1 ? 800 : 600;
        osc.frequency.setValueAtTime(pitch, t);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(isBeat1 ? 0.28 : 0.2, t + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        osc.connect(gainNode);
        gainNode.connect(dest);
        osc.start(t);
        osc.stop(t + 0.04);
      } else if (soundType === 'rim') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        const pitch = isBeat1 ? 1200 : 850;
        osc.frequency.setValueAtTime(pitch, t);
        const bufferSize = Math.floor(ctx.sampleRate * 0.03);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, t);
        filter.Q.setValueAtTime(8, t);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(isBeat1 ? 0.22 : 0.15, t + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(isBeat1 ? 0.25 : 0.18, t + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);
        osc.connect(gainNode);
        gainNode.connect(dest);
        noise.start(t);
        osc.start(t);
        noise.stop(t + 0.03);
        osc.stop(t + 0.03);
      } else {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        const pitch = isBeat1 ? 1200 : 880;
        osc.frequency.setValueAtTime(pitch * 2.5, t);
        osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.002);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(isBeat1 ? 0.35 : 0.25, t + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        osc.connect(gainNode);
        gainNode.connect(dest);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    },
    [drumPrefs.metronomeSound]
  );

  // ── Play/stop ────────────────────────────────────────────────────────────
  const startPattern = useCallback(() => {
    setRandomVariations(useDrumStore.getState().drumPrefs.randomVariations);
    const sm = { ...KIT_DEFAULTS[kit].soundMap, ...soundMap };
    const vol: Partial<Record<DrumInstrument, number>> = {};
    activeInstruments.forEach((i) => {
      if (soloInst) {
        vol[i] = i === soloInst ? (volumeMap[i] ?? 1.0) : 0;
      } else if (pattern.mutedInstruments?.includes(i)) {
        vol[i] = 0;
      } else {
        vol[i] = volumeMap[i] ?? 1.0;
      }
    });
    if (kit === 'house') loadHouseKit(houseKitMic);
    else loadDrumSamples(kit);
    drumScheduler.start(pattern, sm, vol, masterVolume, looping, kit);
    setPlaying(true);
  }, [
    pattern,
    kit,
    soundMap,
    volumeMap,
    activeInstruments,
    masterVolume,
    looping,
    houseKitMic,
    soloInst,
  ]);

  useEffect(() => {
    if (!drumScheduler.isPlaying) return;
    const vol: Partial<Record<DrumInstrument, number>> = {};
    activeInstruments.forEach((i) => {
      if (soloInst) {
        vol[i] = i === soloInst ? (volumeMap[i] ?? 1.0) : 0;
      } else if (pattern.mutedInstruments?.includes(i)) {
        vol[i] = 0;
      } else {
        vol[i] = volumeMap[i] ?? 1.0;
      }
    });
    drumScheduler.setVolumeMap(vol);
  }, [soloInst, pattern.mutedInstruments, volumeMap, activeInstruments]);

  const handlePlay = useCallback(() => {
    if (drumScheduler.isPlaying || countingIn) {
      countInTimers.current.forEach(clearTimeout);
      countInTimers.current = [];
      drumScheduler.stop();
      setPlaying(false);
      setCountingIn(false);
      return;
    }
    if (drumPrefs.countIn) {
      // Resume audio context first
      const ctx = getAudioCtx();
      if (ctx && ctx.state !== 'running') ctx.resume();
      const spBeat = pattern.subdivision / pattern.timeSignature[1];
      const msPerBeat = ((60 / pattern.bpm) * 1000) / spBeat;
      setCountingIn(true);
      playMetronomeClick(true);
      [1, 2, 3].forEach((i) => {
        const id = setTimeout(() => {
          playMetronomeClick(i === 0);
          if (i === 3) {
            setCountingIn(false);
            startPattern();
          }
        }, i * msPerBeat);
        countInTimers.current.push(id);
      });
    } else {
      startPattern();
    }
  }, [
    startPattern,
    countingIn,
    drumPrefs.countIn,
    pattern.bpm,
    pattern.subdivision,
    pattern.timeSignature,
    playMetronomeClick,
  ]);

  // ── MediaSession integration for Drumex Beats ──────────────────────────────
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;

  useEffect(() => {
    if (activeTab === 'metronome') return;

    if (playing) {
      mediaSessionCoordinator.registerProvider({
        id: 'drumex-beats',
        getMetadata: () => ({
          title: pattern.name || 'Drum Beat',
          artist: KIT_DEFAULTS[kit]?.label || 'Drumex Studio',
          album: `Drumex Beats · ${pattern.bpm} BPM`,
        }),
        getPlaybackState: () => ({
          state: playing ? 'playing' : 'paused',
          speed: 1.0,
        }),
        onPlay: () => {
          if (!drumScheduler.isPlaying) handlePlayRef.current();
        },
        onPause: () => {
          if (drumScheduler.isPlaying) handlePlayRef.current();
        },
        onStop: () => {
          drumScheduler.stop();
          setPlaying(false);
          mediaSessionCoordinator.stopSession('drumex-beats');
        },
      });

      mediaSessionCoordinator.updateMetadata('drumex-beats', {
        title: pattern.name || 'Drum Beat',
        artist: KIT_DEFAULTS[kit]?.label || 'Drumex Studio',
        album: `Drumex Beats · ${pattern.bpm} BPM`,
      });

      mediaSessionCoordinator.updatePlaybackState('drumex-beats', {
        state: 'playing',
        speed: 1.0,
      });
    } else {
      mediaSessionCoordinator.updatePlaybackState('drumex-beats', {
        state: 'paused',
        speed: 1.0,
      });
    }

    return () => {
      mediaSessionCoordinator.unregisterProvider('drumex-beats');
    };
  }, [playing, pattern, kit, activeTab]);

  // ── Kit ──────────────────────────────────────────────────────────────────
  const handleKitSelect = useCallback(
    (k: KitType) => {
      if (kitType === k) return;
      setKitType(k, KIT_DEFAULTS[k].soundMap);
      if (k === 'house') loadHouseKit(houseKitMic);
      else loadDrumSamples(k);
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
    },
    [setKitType, kitType, houseKitMic]
  );

  // ── Groove Library ────────────────────────────────────────────────────────
  const filteredGrooves = grooveFilter ? grooves.filter((g) => g.tag === grooveFilter) : grooves;

  const handleGroovePreview = useCallback(
    (groove: GrooveEntry) => {
      if (previewingGrooveId === groove.id && drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
        setPreviewingGrooveId(null);
        setRandomVariations(useDrumStore.getState().drumPrefs.randomVariations);
        return;
      }
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
      const sm = { ...KIT_DEFAULTS[kit].soundMap, ...soundMap };
      const vol: Partial<Record<DrumInstrument, number>> = {};
      activeInstruments.forEach((i) => {
        vol[i] = volumeMap[i] ?? 1.0;
      });
      const tempPat: DrumPattern = {
        id: groove.id,
        name: groove.name,
        bpm: groove.bpm,
        timeSignature: [4, 4],
        subdivision: groove.subdivision,
        measures: groove.measures,
      };
      loadDrumSamples(kit);
      drumScheduler.start(tempPat, sm, vol, masterVolume, true, kit);
      setPreviewingGrooveId(groove.id);
      setPlaying(false);
    },
    [previewingGrooveId, kit, soundMap, volumeMap, activeInstruments, masterVolume]
  );

  const handleLibPreview = useCallback(
    (lp: LibraryPattern) => {
      if (previewingGrooveId === lp.id && drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
        setPreviewingGrooveId(null);
        setRandomVariations(useDrumStore.getState().drumPrefs.randomVariations);
        return;
      }
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
      const libKit: KitType = 'house';
      const sm = { ...KIT_DEFAULTS[libKit].soundMap };
      const vol: Partial<Record<DrumInstrument, number>> = {};
      activeInstruments.forEach((i) => {
        vol[i] = volumeMap[i] ?? 1.0;
      });
      const flatMeasures = lp.measures.map((m) => {
        const hits: typeof m.hits = {};
        for (const [inst, arr] of Object.entries(m.hits)) {
          hits[inst as DrumInstrument] = (arr as DrumHit[]).map((h) =>
            h.variation && h.variation !== 'normal' ? { ...h, variation: 'normal' as const } : h
          );
        }
        return { ...m, hits };
      });
      const tempPat: DrumPattern = {
        id: lp.id,
        name: lp.name,
        bpm: lp.bpm,
        timeSignature: [4, 4],
        subdivision: lp.subdivision,
        measures: flatMeasures,
      };
      setRandomVariations(false);
      loadHouseKit('blend');
      drumScheduler.start(tempPat, sm, vol, masterVolume, true, libKit);
      setPreviewingGrooveId(lp.id);
      setPlaying(false);
    },
    [previewingGrooveId, volumeMap, activeInstruments, masterVolume]
  );

  const handleLibInsert = useCallback(
    (lp: LibraryPattern) => {
      if (!pattern) return;
      const newMeasures = lp.measures.map((m) => ({
        ...m,
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        hits: { ...m.hits },
      }));
      updatePattern(pattern.id, {
        measures: [...pattern.measures, ...newMeasures],
      });
      NavigationDispatcher.replace({
        app: 'drumex',
        page: 'songs',
        subView: 'editor',
        id: activeDrumSongId || undefined,
      });
    },
    [pattern, updatePattern, activeDrumSongId]
  );

  const handleLibReplace = useCallback(
    (lp: LibraryPattern) => {
      if (!pattern) return;
      const newMeasures = lp.measures.map((m) => ({
        ...m,
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        hits: { ...m.hits },
      }));
      updatePattern(pattern.id, {
        measures: newMeasures,
        bpm: lp.bpm,
        subdivision: lp.subdivision,
      });
      NavigationDispatcher.replace({
        app: 'drumex',
        page: 'songs',
        subView: 'editor',
        id: activeDrumSongId || undefined,
      });
    },
    [pattern, updatePattern, activeDrumSongId]
  );

  // ── BPM ──────────────────────────────────────────────────────────────────
  const adjustBpm = useCallback(
    (d: number) => {
      const bpm = Math.max(40, Math.min(280, pattern.bpm + d));
      updatePattern(pattern.id, { bpm });
    },
    [pattern.id, pattern.bpm, updatePattern]
  );

  // ── Subdivision ──────────────────────────────────────────────────────────
  const toggleSub = useCallback(() => {
    updatePattern(pattern.id, { subdivision: pattern.subdivision === 16 ? 8 : 16 });
    if (drumScheduler.isPlaying) {
      drumScheduler.stop();
      setPlaying(false);
    }
  }, [pattern, updatePattern]);

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (drumScheduler.isPlaying) {
      drumScheduler.stop();
      setPlaying(false);
    }
    drumScheduler.seekTo(0);
    pushUndo();
    const clearedMeasures = pattern.measures.map((m) => ({ ...m, hits: {} }));
    updatePattern(pattern.id, { measures: clearedMeasures });
  }, [pattern, updatePattern, pushUndo]);

  // ── Cell tap / drag ──────────────────────────────────────────────────────
  // Resolve which grid cell a pointer event falls on; returns null if outside grid
  const resolveCell = (clientX: number, clientY: number, instOverride?: DrumInstrument | null) => {
    const el = scrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left - LABEL_W + el.scrollLeft;
    const cy = clientY - rect.top + el.scrollTop;
    if (cx < 0) return null;
    const sysIdx = Math.floor(cy / sysHRef.current);
    const measureInRow = Math.floor(cx / measureWRef.current);
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    const curPat = pts.find((p) => p.id === actId);
    if (!curPat) return null;
    if (
      sysIdx * mprRef.current + measureInRow < 0 ||
      sysIdx * mprRef.current + measureInRow >= curPat.measures.length
    )
      return null;
    const mIdx = sysIdx * mprRef.current + measureInRow;

    // snapToGrid=false → quantize to beat rather than subdivision step
    let stepInM = Math.floor((cx % measureWRef.current) / stepWRef.current);
    if (!useDrumStore.getState().drumPrefs.snapToGrid) {
      const spBeat = spmRef.current / 4;
      stepInM = Math.floor(stepInM / spBeat) * spBeat;
    }
    if (stepInM < 0 || stepInM >= spmRef.current) return null;

    const vis = allInstsRef.current;
    let inst: DrumInstrument;
    let instIdx: number;

    if (instOverride) {
      inst = instOverride;
      instIdx = vis.indexOf(inst);
    } else {
      const yInSys = (cy % sysHRef.current) - RULER_H;
      if (yInSys < 0) return null;
      instIdx = -1;
      for (let i = 0; i < vis.length; i++) {
        const top = i * (ROW_H + rowGap);
        const bottom = top + ROW_H;
        if (yInSys >= top && yInSys <= bottom) {
          instIdx = i;
          break;
        }
      }
      if (instIdx === -1) return null;
      inst = vis[instIdx];
    }

    if (instIdx < 0 || instIdx >= vis.length) return null;
    return { inst, m: curPat.measures[mIdx], stepInM, mIdx, instIdx };
  };

  const applyHitToCell = useCallback(
    (inst: DrumInstrument, m: DrumMeasure, stepInM: number, patternId: string, preview = true) => {
      const prefs = useDrumStore.getState().drumPrefs;
      const useSimple = !prefs.noteVariationsCycle;
      if (useSimple) {
        simpleToggleHit(patternId, m.id, inst, stepInM);
      } else {
        toggleHit(patternId, m.id, inst, stepInM);
      }
      if (preview) {
        const newPat = useDrumStore.getState().patterns.find((p) => p.id === patternId);
        const newMeasure = newPat?.measures.find((ms) => ms.id === m.id);
        const newHit = newMeasure?.hits[inst]?.find((h) => h.step === stepInM);
        const variation = newHit?.variation ?? 'normal';
        const kitDefs = KIT_DEFAULTS[kit].soundMap;
        const previewId = getSoundForVariation(inst, variation, soundMap, kitDefs);
        const previewVol = variation === 'ghost' ? 0.25 : 0.55;
        drumScheduler.previewSound(previewId, previewVol, kit);
      }
      if (drumScheduler.isPlaying)
        drumScheduler.updatePattern(
          useDrumStore.getState().patterns.find((p) => p.id === patternId)!
        );
      // Auto-play on edit
      const livePrefs = useDrumStore.getState().drumPrefs;
      if (livePrefs.autoPlayOnEdit && !drumScheduler.isPlaying) {
        const sm = { ...KIT_DEFAULTS[kit].soundMap, ...soundMap };
        const vol: Partial<Record<DrumInstrument, number>> = {};
        activeInstruments.forEach((i) => {
          vol[i] = volumeMap[i] ?? 1.0;
        });
        const latestPat = useDrumStore.getState().patterns.find((p) => p.id === patternId)!;
        if (kit === 'house') loadHouseKit(houseKitMic);
        else loadDrumSamples(kit);
        drumScheduler.start(latestPat, sm, vol, masterVolume, livePrefs.loopPlayback, kit);
        setPlaying(true);
      }
    },
    [
      kit,
      soundMap,
      volumeMap,
      activeInstruments,
      masterVolume,
      houseKitMic,
      toggleHit,
      simpleToggleHit,
    ]
  );

  const cancelPointer = () => {
    pointerStart.current = null;
    activeDragInst.current = null;
    isDragging.current = false;
    dragFilled.current.clear();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (openBarMenu) setOpenBarMenu(null);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
    dragFilled.current.clear();

    const cell = resolveCell(e.clientX, e.clientY);
    if (cell) {
      activeDragInst.current = cell.inst;
    } else {
      activeDragInst.current = null;
    }

    // Capture the pointer so move/up fire even if finger leaves the element
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!useDrumStore.getState().drumPrefs.dragToFill) return;
    if (!pointerStart.current) return;
    const s = pointerStart.current;
    const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (dist < 8) return; // minimum drag threshold
    if (!isDragging.current) {
      isDragging.current = true;
      pushUndo();
    }
    const cell = resolveCell(e.clientX, e.clientY, activeDragInst.current);
    if (!cell) return;
    const key = `${cell.inst}:${cell.mIdx}:${cell.stepInM}`;
    if (dragFilled.current.has(key)) return; // already filled in this drag
    dragFilled.current.add(key);
    // When dragging, only add notes (don't remove), so use simpleToggleHit-style
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    const curPat = pts.find((p) => p.id === actId);
    if (!curPat) return;
    const existing = cell.m.hits[cell.inst]?.find((h) => h.step === cell.stepInM);
    if (!existing) {
      simpleToggleHit(curPat.id, cell.m.id, cell.inst, cell.stepInM);
      if (drumScheduler.isPlaying)
        drumScheduler.updatePattern(
          useDrumStore.getState().patterns.find((p) => p.id === curPat.id)!
        );
    }
    setFocusedInst(cell.inst);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const s = pointerStart.current;
    if (!s) return;
    pointerStart.current = null;
    const instLock = activeDragInst.current;
    activeDragInst.current = null;
    // If this was a drag-to-fill event, just clean up
    if (isDragging.current) {
      isDragging.current = false;
      dragFilled.current.clear();
      return;
    }
    if (Math.abs(e.clientX - s.x) > 12 || Math.abs(e.clientY - s.y) > 12) return;
    const cell = resolveCell(e.clientX, e.clientY, instLock);
    if (!cell) return;
    const { activePatternId: actId } = useDrumStore.getState();
    if (!actId) return;
    pushUndo();
    applyHitToCell(cell.inst, cell.m, cell.stepInM, actId);
    setFocusedInst(cell.inst);
  };

  // ── Back ─────────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (inEditor) {
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
      setShowHamburger(false);
      setShowBpmPanel(false);
      NavigationDispatcher.pop();
    } else {
      drumScheduler.stop();
      NavigationDispatcher.pop();
    }
  };

  useBackHandler(
    'nested',
    () => {
      if (NavigationDispatcher.currentApp() !== 'drumex') return false;

      // 1. Confirmations and Modals
      if (showClearConfirm) {
        setShowClearConfirm(false);
        return true;
      }
      if (showExportModal) {
        setShowExportModal(false);
        return true;
      }
      if (showImportDrum) {
        setShowImportDrum(false);
        return true;
      }
      if (showSaveGroove) {
        setShowSaveGroove(false);
        return true;
      }

      // 2. Forms
      if (showCreateForm) {
        setShowCreateForm(false);
        return true;
      }
      if (showSaveForm) {
        setShowSaveForm(false);
        return true;
      }

      // 3. Sheets / Menus / Panels
      if (showMixerSheet) {
        setShowMixerSheet(false);
        return true;
      }
      if (showFXSheet) {
        setShowFXSheet(false);
        return true;
      }
      if (showBpmPanel) {
        setShowBpmPanel(false);
        return true;
      }
      if (showLoopPanel) {
        setShowLoopPanel(false);
        return true;
      }
      if (showSoundCharacter) {
        setShowSoundCharacter(false);
        return true;
      }
      if (showHamburger) {
        setShowHamburger(false);
        return true;
      }

      // 4. Default view exit
      if (inEditor) {
        if (drumScheduler.isPlaying) {
          drumScheduler.stop();
          setPlaying(false);
        }
        NavigationDispatcher.pop();
        return true;
      }
      if (activeTab !== 'songs') {
        NavigationDispatcher.pop();
        return true;
      }
      return false;
    },
    [
      inEditor,
      activeTab,
      showClearConfirm,
      showExportModal,
      showImportDrum,
      showSaveGroove,
      showCreateForm,
      showSaveForm,
      showMixerSheet,
      showFXSheet,
      showBpmPanel,
      showLoopPanel,
      showSoundCharacter,
      showHamburger,
    ]
  );

  // ── Create Beat ───────────────────────────────────────────────────────────
  const handleCreateBeat = useCallback(() => {
    if (!createName.trim()) return;
    const bpm = Math.max(40, Math.min(280, parseInt(createBpm, 10) || 120));
    const id = createBlankDrumSong(createName, createArtist, bpm, createNotes, createVariant);
    loadDrumSong(id);
    setKitType(createVariant, KIT_DEFAULTS[createVariant].soundMap);
    if (createVariant === 'house') loadHouseKit(houseKitMic);
    else loadDrumSamples(createVariant);
    NavigationDispatcher.push({ app: 'drumex', page: 'songs', subView: 'editor', id: id });
    setShowCreateForm(false);
    setCreateName('');
    setCreateArtist('');
    setCreateBpm('120');
    setCreateNotes('');
    setCreateFamily('acoustic');
    setCreateVariant('ludwig');
  }, [
    createName,
    createArtist,
    createBpm,
    createNotes,
    createVariant,
    createBlankDrumSong,
    loadDrumSong,
    setKitType,
    houseKitMic,
  ]);

  // ── Songs ─────────────────────────────────────────────────────────────────
  const handleOpenSaveForm = useCallback(() => {
    if (activeDrumSongId) {
      const song = drumSongs.find((s) => s.id === activeDrumSongId);
      if (song) {
        setSaveName(song.name);
        setSaveArtist(song.artist);
        setSaveNotes(song.notes ?? '');
      }
    } else {
      setSaveName('');
      setSaveArtist('');
      setSaveNotes('');
    }
    setShowSaveForm(true);
  }, [activeDrumSongId, drumSongs]);

  const handleSaveAsNew = useCallback(() => {
    if (!saveName.trim()) return;
    const newId = saveDrumSong(saveName, saveArtist, saveNotes);
    setSaveName('');
    setSaveArtist('');
    setSaveNotes('');
    setShowSaveForm(false);
    NavigationDispatcher.replace({ app: 'drumex', page: 'songs', subView: 'editor', id: newId });
  }, [saveName, saveArtist, saveNotes, saveDrumSong]);

  const handleUpdateSong = useCallback(() => {
    if (!saveName.trim() || !activeDrumSongId) return;
    updateDrumSong(activeDrumSongId, {
      name: saveName.trim(),
      artist: saveArtist.trim(),
      notes: saveNotes.trim(),
      patterns: JSON.parse(JSON.stringify(patterns)),
      activePatternId: activePatternId ?? patterns[0]?.id ?? '',
      kitType: kitType,
    });
    setShowSaveForm(false);
  }, [
    saveName,
    saveArtist,
    saveNotes,
    activeDrumSongId,
    updateDrumSong,
    patterns,
    activePatternId,
    kitType,
  ]);

  const handleLoadSong = useCallback(
    (song: DrumSong) => {
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
      setPreviewingSongId(null);
      loadDrumSong(song.id);
      if (song.kitType) {
        setKitType(song.kitType, KIT_DEFAULTS[song.kitType].soundMap);
        if (song.kitType === 'house') loadHouseKit(houseKitMic);
        else loadDrumSamples(song.kitType);
      }
      NavigationDispatcher.push({ app: 'drumex', page: 'songs', subView: 'editor', id: song.id });
    },
    [loadDrumSong, setKitType, houseKitMic]
  );

  const handleStartEdit = useCallback((song: DrumSong) => {
    setEditingSong(song);
    setEditingName(song.name);
    setEditingArtist(song.artist);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingSong) return;
    updateDrumSong(editingSong.id, {
      name: editingName.trim() || editingSong.name,
      artist: editingArtist.trim(),
    });
    setEditingSong(null);
  }, [editingSong, editingName, editingArtist, updateDrumSong]);

  const handleSongPreview = useCallback(
    (song: DrumSong) => {
      if (previewingSongId === song.id && drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPreviewingSongId(null);
        setPlaying(false);
        return;
      }
      if (drumScheduler.isPlaying) {
        drumScheduler.stop();
        setPlaying(false);
      }
      const activePat =
        song.patterns.find((p) => p.id === song.activePatternId) ?? song.patterns[0];
      if (!activePat) return;

      const songKit = song.kitType || kit;
      const sm = { ...KIT_DEFAULTS[songKit]?.soundMap, ...soundMap };
      const vol: Partial<Record<DrumInstrument, number>> = {};
      activeInstruments.forEach((i) => {
        vol[i] = volumeMap[i] ?? 1.0;
      });

      if (songKit === 'house') {
        loadHouseKit(houseKitMic);
      } else {
        loadDrumSamples(songKit);
      }
      drumScheduler.start(activePat, sm, vol, masterVolume, true, songKit);
      setPreviewingSongId(song.id);
      setPlaying(false);
    },
    [previewingSongId, kit, soundMap, volumeMap, activeInstruments, masterVolume, houseKitMic]
  );

  // ── Humanize ──────────────────────────────────────────────────────────────
  // Applies subtle variation to note types across the active pattern,
  // producing a more human feel without drastically altering the groove.
  const handleHumanize = useCallback(() => {
    if (!pattern) return;
    const HUMANIZE_RULES: Partial<
      Record<DrumInstrument, { from: NoteVariation; to: NoteVariation; chance: number }[]>
    > = {
      snare: [{ from: 'normal', to: 'ghost', chance: 0.28 }],
      kick: [{ from: 'normal', to: 'accent', chance: 0.18 }],
      'hihat-closed': [{ from: 'normal', to: 'open', chance: 0.14 }],
      ride: [{ from: 'normal', to: 'bell', chance: 0.14 }],
    };
    const newMeasures: DrumMeasure[] = pattern.measures.map((measure) => {
      const newHits: DrumMeasure['hits'] = {};
      for (const [instKey, hitList] of Object.entries(measure.hits)) {
        const inst = instKey as DrumInstrument;
        const rules = HUMANIZE_RULES[inst];
        if (!hitList || !rules) {
          newHits[inst] = hitList;
          continue;
        }
        newHits[inst] = hitList.map((hit) => {
          const variation = hit.variation ?? 'normal';
          for (const rule of rules) {
            if (variation === rule.from && Math.random() < rule.chance) {
              return { ...hit, variation: rule.to };
            }
          }
          return hit;
        });
      }
      return { ...measure, hits: newHits };
    });
    updatePattern(pattern.id, { measures: newMeasures });
    setHumanizeFeedback(true);
    setTimeout(() => setHumanizeFeedback(false), 900);
  }, [pattern, updatePattern]);

  // ── Convenience: active song ─────────────────────────────────────────────
  const activeSong = activeDrumSongId
    ? (drumSongs.find((s) => s.id === activeDrumSongId) ?? null)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  const inputSt: React.CSSProperties = {
    width: '100%',
    background: 'var(--app-surface-high)',
    border: '1px solid rgba(72,72,72,0.12)',
    borderRadius: '0.625rem',
    padding: '11px 14px',
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelSt: React.CSSProperties = {
    color: 'var(--c-text-secondary)',
    fontFamily: 'var(--font-headline)',
    fontWeight: 700,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    display: 'block',
    marginBottom: 6,
  };
  const renderCollapsibleSection = (
    id: string,
    title: string,
    collapsedState: Record<string, boolean>,
    onToggle: (id: string) => void,
    content: React.ReactNode
  ) => {
    const isCollapsed = collapsedState[id];
    const item: BouncyAccordionItem = {
      id,
      title: (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </span>
      ),
      description: (
        <div style={{ padding: '6px 4px 2px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {content}
        </div>
      ),
    };

    return (
      <BouncyAccordion
        key={id}
        items={[item]}
        value={!isCollapsed ? id : null}
        onValueChange={(val) => onToggle(id)}
      />
    );
  };
  const menuItemSt: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--c-text-primary)',
    fontSize: 12.5,
    fontFamily: 'var(--font-headline)',
    fontWeight: 600,
    textAlign: 'left',
    transition: 'background 120ms',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        background: 'var(--app-bg)',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* ── Floating Pill Top Bar (Canonical Studio Language) ───────── */}
      {!isWebDesktop
        ? inEditor && (
            <header
              className={`fixed left-3 right-3 z-50 rounded-full px-3.5 ${
                isLandscape ? 'py-1.5' : 'py-2'
              } backdrop-blur-md shadow-[0_6px_28px_rgba(0,0,0,0.08)] border flex items-center justify-between select-none ${
                isAmoled
                  ? 'bg-black/92 border-zinc-800 text-white'
                  : isLight
                    ? 'bg-white/95 border-slate-200/80 text-slate-800'
                    : 'bg-zinc-900/92 border-zinc-800 text-zinc-100'
              }`}
              style={{
                top: isLandscape
                  ? 'calc(env(safe-area-inset-top, 0px) + 6px)'
                  : 'calc(env(safe-area-inset-top, 0px) + 10px)',
              }}
            >
              {/* Left: Back Button */}
              <div className="flex items-center gap-1.5 w-16 sm:w-20">
                <button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer"
                  style={{
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                    color: 'var(--c-text-primary)',
                  }}
                  aria-label="Back"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
              </div>

              {/* Center: Pattern Metadata & Info */}
              <div className="flex flex-col items-center justify-center text-center flex-1 min-w-0 px-1">
                <div className="flex items-center gap-1.5 justify-center max-w-full">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[110px] sm:max-w-[160px]">
                    {activeSong?.name ?? pattern.name ?? '01'}
                  </span>
                  <button
                    onClick={() => setShowBpmPanel((s) => !s)}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition active:scale-95 cursor-pointer"
                    style={{
                      background: isLight ? '#eff6ff' : 'rgba(0,122,255,0.15)',
                      color: '#007aff',
                      borderColor: isLight ? '#dbeafe' : 'rgba(0,122,255,0.35)',
                    }}
                    title="Adjust BPM & Swing"
                  >
                    {pattern.bpm} BPM
                  </button>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                    {pattern.timeSignature[0]}/{pattern.timeSignature[1]}
                  </span>
                </div>
                {!isLandscape && (
                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium tracking-wide truncate mt-0.5 max-w-[220px]">
                    {KIT_LABEL[kit] ?? 'Acoustic • House Kit'} • {pattern.subdivision}th Master
                  </p>
                )}
              </div>

              {/* Right: Actions (Undo, Redo, Landscape Play, Menu) */}
              <div className="flex items-center justify-end gap-1 w-16 sm:w-20">
                {isLandscape && (
                  <button
                    onClick={handlePlay}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-[#007aff] transition active:scale-95 cursor-pointer"
                    aria-label={playing ? 'Pause' : 'Play'}
                    title={playing ? 'Pause' : 'Play'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {playing ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleUndo}
                  disabled={historyCount === 0}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  style={{ color: 'var(--c-text-secondary)' }}
                  title="Undo (Ctrl+Z)"
                  aria-label="Undo"
                >
                  <span className="material-symbols-outlined text-[17px]">undo</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.current.length === 0}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  style={{ color: 'var(--c-text-secondary)' }}
                  title="Redo (Ctrl+Y)"
                  aria-label="Redo"
                >
                  <span className="material-symbols-outlined text-[17px]">redo</span>
                </button>
                <button
                  onClick={() => {
                    if (showHamburger) {
                      setHamburgerClosing(true);
                      setTimeout(() => {
                        setShowHamburger(false);
                        setHamburgerClosing(false);
                      }, 170);
                    } else {
                      setShowHamburger(true);
                    }
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer"
                  style={{
                    background: showHamburger
                      ? `${accent.from}1e`
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.08)',
                    color: showHamburger ? accent.from : 'var(--c-text-primary)',
                  }}
                  title="Toggle Menu"
                  aria-label="Toggle Menu"
                >
                  <span className="material-symbols-outlined text-[18px]">menu</span>
                </button>
              </div>
            </header>
          )
        : inEditor && (
            <div
              className={`h-12 border-b px-5 flex items-center justify-between flex-shrink-0 select-none ${
                isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-900 bg-[#000000]'
              }`}
            >
              {/* Left Group: App Logo + Section + Title */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {/* Module Brand */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-zinc-900' : 'text-white'}`}
                  >
                    DRUMEX
                  </span>
                  <span
                    className={`text-[10px] font-bold ${isLight ? 'text-zinc-300' : 'text-zinc-800'}`}
                  >
                    |
                  </span>
                  <span
                    className={`text-[9.5px] font-extrabold uppercase tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}
                  >
                    STEP SEQUENCER
                  </span>
                </div>
                <div className={`h-4.5 w-[1px] ${isLight ? 'bg-zinc-200' : 'bg-zinc-850'}`} />
                {/* Back button */}
                <button
                  onClick={handleBack}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                    isLight
                      ? 'bg-transparent text-zinc-700 border-zinc-200 hover:border-zinc-350 hover:text-black'
                      : 'bg-transparent text-zinc-405 border-zinc-900 hover:text-white hover:border-zinc-800'
                  }`}
                  title="Back to Beats"
                  aria-label="Back"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                </button>

                {/* Beat title */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-[11px] font-extrabold uppercase tracking-widest ${isLight ? 'text-zinc-800' : 'text-white'} truncate`}
                  >
                    {activeSong?.name || 'Untitled Beat'}
                  </span>
                </div>
              </div>

              {/* Center Group: Transport Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    border: isLight
                      ? '1px solid rgba(0,0,0,0.08)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '4px 12px',
                    height: 40,
                  }}
                >
                  {/* Undo */}
                  <button
                    onClick={handleUndo}
                    disabled={historyCount === 0}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    className="btn-smooth"
                    style={{
                      height: 28,
                      width: 28,
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      cursor: historyCount > 0 ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: historyCount > 0 ? 'var(--c-text-secondary)' : 'var(--c-text-muted)',
                      opacity: historyCount > 0 ? 1 : 0.35,
                      transition: 'all 150ms',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      undo
                    </span>
                  </button>

                  {/* Redo */}
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.current.length === 0}
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo"
                    className="btn-smooth"
                    style={{
                      height: 28,
                      width: 28,
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      cursor: redoStack.current.length > 0 ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        redoStack.current.length > 0
                          ? 'var(--c-text-secondary)'
                          : 'var(--c-text-muted)',
                      opacity: redoStack.current.length > 0 ? 1 : 0.35,
                      transition: 'all 150ms',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      redo
                    </span>
                  </button>

                  <div
                    style={{
                      width: 1,
                      height: 18,
                      background: isLight ? 'rgba(9, 9, 11, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                    }}
                  />

                  {/* Play/Stop */}
                  <button
                    onClick={handlePlay}
                    className="btn-smooth"
                    title={playing ? 'Stop Playback' : 'Start Playback'}
                    aria-label={playing ? 'Stop' : 'Play'}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: 'none',
                      background: playing ? '#ef4444' : isLight ? '#18181b' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: playing ? '#ffffff' : isLight ? '#ffffff' : '#18181b',
                      transition: 'all 150ms',
                      flexShrink: 0,
                    }}
                  >
                    {playing ? '⏹' : '▶'}
                  </button>

                  <div
                    style={{
                      width: 1,
                      height: 18,
                      background: isLight ? 'rgba(9, 9, 11, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                    }}
                  />

                  {/* Subdivision */}
                  <button
                    onClick={toggleSub}
                    className="btn-smooth"
                    title="Step Resolution (Subdivision)"
                    aria-label="Step Resolution (Subdivision)"
                    style={{
                      height: 24,
                      padding: '0 8px',
                      borderRadius: 6,
                      background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                      border: isLight
                        ? '1px solid rgba(0,0,0,0.08)'
                        : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      color: 'var(--c-text-secondary)',
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    1/{pattern.subdivision}
                  </button>

                  <div
                    style={{
                      width: 1,
                      height: 18,
                      background: isLight ? 'rgba(9, 9, 11, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                    }}
                  />

                  {/* Tempo & Metronome */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      ref={metronomeBtnRef}
                      onClick={() => setShowBpmPopover((s) => !s)}
                      className="btn-smooth"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: 'none',
                        background:
                          showBpmPopover || drumPrefs.metronome
                            ? `${accent.from}1a`
                            : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          showBpmPopover || drumPrefs.metronome
                            ? accent.from
                            : 'var(--c-text-secondary)',
                        transition: 'all 150ms',
                      }}
                      title="Tempo & Metronome"
                      aria-label="Tempo and Metronome"
                    >
                      <MetronomeIcon size={16} />
                    </button>

                    {showBpmPopover &&
                      createPortal(
                        <>
                          {/* Click-away overlay */}
                          <div
                            onClick={() => {
                              commitBpm(bpmInputVal);
                              setShowBpmPopover(false);
                            }}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 998,
                              cursor: 'default',
                            }}
                          />
                          {/* Popover Card */}
                          <div
                            style={{
                              position: 'fixed',
                              top: popoverCoords?.top ?? 0,
                              left: popoverCoords?.left ?? 0,
                              background: isLight ? '#ffffff' : '#18181b',
                              border: isLight
                                ? '1px solid rgba(0,0,0,0.1)'
                                : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 12,
                              padding: '16px',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(20px)',
                              minWidth: 260,
                              width: 260,
                              zIndex: 999,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                            }}
                          >
                            {/* Title / Header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: isLight
                                  ? '1px solid rgba(0,0,0,0.06)'
                                  : '1px solid rgba(255,255,255,0.06)',
                                paddingBottom: 8,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  color: 'var(--c-text-secondary)',
                                }}
                              >
                                Tempo & Metronome
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: accent.from }}>
                                {pattern.bpm} BPM
                              </span>
                            </div>

                            {/* Tempo Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="text"
                                  value={bpmInputVal}
                                  onChange={(e) => setBpmInputVal(e.target.value)}
                                  onBlur={(e) => commitBpm(e.target.value)}
                                  onKeyDown={handleBpmKeyDown}
                                  style={{
                                    width: 56,
                                    height: 32,
                                    borderRadius: 6,
                                    border: isLight
                                      ? '1px solid rgba(0,0,0,0.15)'
                                      : '1px solid rgba(255,255,255,0.15)',
                                    background: 'transparent',
                                    textAlign: 'center',
                                    fontSize: 14,
                                    fontWeight: 850,
                                    color: 'var(--c-text-primary)',
                                    fontFamily: 'monospace',
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                                  <button
                                    onClick={() => changeBpmBy(-5)}
                                    style={{
                                      flex: 1,
                                      height: 32,
                                      borderRadius: 6,
                                      border: 'none',
                                      background: isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: 'var(--c-text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    -5
                                  </button>
                                  <button
                                    onClick={() => changeBpmBy(-1)}
                                    style={{
                                      flex: 1,
                                      height: 32,
                                      borderRadius: 6,
                                      border: 'none',
                                      background: isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: 'var(--c-text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    -1
                                  </button>
                                  <button
                                    onClick={() => changeBpmBy(1)}
                                    style={{
                                      flex: 1,
                                      height: 32,
                                      borderRadius: 6,
                                      border: 'none',
                                      background: isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: 'var(--c-text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    +1
                                  </button>
                                  <button
                                    onClick={() => changeBpmBy(5)}
                                    style={{
                                      flex: 1,
                                      height: 32,
                                      borderRadius: 6,
                                      border: 'none',
                                      background: isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: 'var(--c-text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>

                              {/* Range Slider */}
                              <input
                                type="range"
                                min={40}
                                max={280}
                                step={1}
                                value={pattern.bpm}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setBpmInputVal(val.toString());
                                  updatePattern(pattern.id, { bpm: val });
                                }}
                                style={{
                                  width: '100%',
                                  cursor: 'pointer',
                                  accentColor: accent.from,
                                  height: 16,
                                }}
                              />

                              {/* Tap Tempo Button */}
                              <button
                                onClick={handleTapTempo}
                                style={{
                                  width: '100%',
                                  height: 32,
                                  borderRadius: 6,
                                  border: isLight
                                    ? '1px solid rgba(0,0,0,0.1)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                  background: isLight
                                    ? 'rgba(0,0,0,0.03)'
                                    : 'rgba(255,255,255,0.03)',
                                  color: 'var(--c-text-primary)',
                                  cursor: 'pointer',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  transition: 'background 100ms',
                                }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 15 }}
                                >
                                  touch_app
                                </span>
                                <span>Tap Tempo</span>
                              </button>
                            </div>

                            <div
                              style={{
                                height: 1,
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                              }}
                            />

                            {/* Metronome Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'var(--c-text-muted)',
                                  }}
                                >
                                  METRONOME
                                </span>
                                <button
                                  onClick={() =>
                                    updateDrumPrefs({ metronome: !drumPrefs.metronome })
                                  }
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: drumPrefs.metronome
                                      ? `${accent.from}1a`
                                      : isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.05)',
                                    color: drumPrefs.metronome
                                      ? accent.from
                                      : 'var(--c-text-secondary)',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {drumPrefs.metronome ? 'ON' : 'OFF'}
                                </button>
                              </div>

                              {/* Sound Choices */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 750,
                                    color: 'var(--c-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Sound Character
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {[
                                    { id: 'classic', label: 'Classic Mechanical' },
                                    { id: 'wood', label: 'Wood Block' },
                                    { id: 'studio', label: 'Studio Click' },
                                    { id: 'digital', label: 'Soft Digital' },
                                    { id: 'rim', label: 'Rim Click' },
                                  ].map((choice) => {
                                    const isSel =
                                      (drumPrefs.metronomeSound || 'classic') === choice.id;
                                    return (
                                      <div
                                        key={choice.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          width: '100%',
                                          height: 28,
                                          borderRadius: 6,
                                          background: isSel ? `${accent.from}15` : 'transparent',
                                          padding: '0 4px 0 8px',
                                        }}
                                      >
                                        <button
                                          onClick={() => {
                                            updateDrumPrefs({ metronomeSound: choice.id });
                                            playMetronomeClick(true, choice.id);
                                          }}
                                          style={{
                                            flex: 1,
                                            height: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            color: isSel ? accent.from : 'var(--c-text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            fontWeight: isSel ? 750 : 500,
                                            textAlign: 'left',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {choice.label}
                                        </button>
                                        <div
                                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                        >
                                          <button
                                            title={`Preview ${choice.label}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              playMetronomeClick(true, choice.id);
                                            }}
                                            style={{
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--c-text-muted)',
                                              cursor: 'pointer',
                                              padding: 4,
                                              borderRadius: 4,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: 9,
                                            }}
                                          >
                                            ▶
                                          </button>
                                          {isSel && (
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: accent.from,
                                                paddingRight: 4,
                                              }}
                                            >
                                              ✓
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>,
                        document.body
                      )}
                  </div>
                </div>
              </div>

              {/* Right Group: Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 12,
                  flex: '1 1 0%',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Add Bar */}
                  <button
                    onClick={handleAddBar}
                    title="Add new measure (bar)"
                    aria-label="Add Bar"
                    className="btn-smooth"
                    style={{
                      height: 30,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                      border: isLight
                        ? '1px solid rgba(0,0,0,0.1)'
                        : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--c-text-primary)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      add
                    </span>
                    <span>Add Bar</span>
                  </button>

                  {/* Clear */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowClearConfirm((s) => !s)}
                      title="Clear pattern"
                      aria-label="Clear pattern"
                      className="btn-smooth"
                      style={{
                        height: 30,
                        width: 30,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ee7d77',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                    {showClearConfirm && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          background: 'rgba(10, 10, 12, 0.98)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12,
                          padding: '12px 14px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(20px)',
                          minWidth: 190,
                          zIndex: 100,
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 10px',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: 'var(--c-text-primary)',
                            fontFamily: 'var(--studio-font-body)',
                            lineHeight: 1.4,
                          }}
                        >
                          Reset pattern?
                        </p>
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: 11,
                            color: 'var(--c-text-muted)',
                            lineHeight: 1.4,
                          }}
                        >
                          All hits will be removed, preserving your bar count. You can undo after.
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="btn-smooth"
                            style={{
                              flex: 1,
                              padding: '7px 0',
                              borderRadius: 9,
                              background: 'rgba(128,128,128,0.12)',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--c-text-secondary)',
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              handleClear();
                              setShowClearConfirm(false);
                            }}
                            className="btn-smooth"
                            style={{
                              flex: 1,
                              padding: '7px 0',
                              borderRadius: 9,
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#f87171',
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save Groove */}
                  <button
                    onClick={() => {
                      setSavGrName(pattern.name);
                      setSavGrTag('');
                      setShowSaveGroove(true);
                    }}
                    title="Save pattern to Groove Library"
                    aria-label="Save pattern to Groove Library"
                    className="btn-smooth"
                    style={{
                      height: 30,
                      width: 30,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: accent.from,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      bookmark
                    </span>
                  </button>

                  <div
                    style={{
                      width: 1,
                      height: 18,
                      background: 'rgba(255,255,255,0.08)',
                      margin: '0 2px',
                    }}
                  />

                  {/* Export JSON / PDF */}
                  <button
                    onClick={() => {
                      exportDrumSongJSON(patterns, activeSong);
                    }}
                    title="Export pattern as JSON file"
                    aria-label="Export pattern as JSON file"
                    className="btn-smooth"
                    style={{
                      height: 30,
                      width: 30,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      data_object
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportModal(true);
                    }}
                    title="Export as PDF"
                    className="btn-smooth"
                    style={{
                      height: 30,
                      width: 30,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      picture_as_pdf
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* ── Hamburger panel ──────────────────────────────────────────────── */}
      {inEditor && (showHamburger || hamburgerClosing) && (
        <div
          style={{
            flexShrink: 0,
            overflow: 'hidden',
            background: isAmoled
              ? '#000'
              : isLight
                ? 'rgba(250,249,247,0.98)'
                : 'rgba(14,14,17,0.98)',
            borderBottom: '1px solid rgba(128,128,128,0.10)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            animation: hamburgerClosing
              ? 'drumHamburgerOut 170ms cubic-bezier(0.4,0,1,1) both'
              : 'drumHamburgerIn 200ms cubic-bezier(0.22,1,0.36,1)',
            maxHeight: kit === 'house' ? '70vh' : undefined,
          }}
        >
          <div
            className="no-scrollbar"
            style={{
              padding: '10px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: kit === 'house' ? 'auto' : 'visible',
              maxHeight: kit === 'house' ? '70vh' : undefined,
            }}
          >
            {/* ── House Kit mic selector ──────────────────────────────────── */}
            {kit === 'house' && (
              <>
                <div style={{ padding: '8px 4px 4px' }}>
                  <span
                    style={{
                      color: 'var(--c-text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Mic Position
                  </span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {HOUSE_MICS.map((m) => {
                      const active = houseKitMic === m.id;
                      return (
                        <button
                          key={m.id}
                          className="btn-smooth"
                          onClick={() => {
                            storeSetHouseKitMic(m.id);
                            setHouseKitMic(m.id);
                          }}
                          style={{
                            flex: 1,
                            height: 30,
                            borderRadius: 8,
                            border: active
                              ? `1.5px solid ${accent.from}66`
                              : '1.5px solid rgba(128,128,128,0.12)',
                            background: active ? `${accent.from}1a` : 'rgba(128,128,128,0.06)',
                            color: active ? accent.from : 'var(--c-text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 160ms',
                            fontFamily: 'var(--studio-font-body)',
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  {!houseLoaded && (
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Loader variant="dots" size={16} />
                      <span
                        style={{
                          fontSize: 10.5,
                          color: 'var(--c-text-muted)',
                          fontFamily: 'Inter,sans-serif',
                        }}
                      >
                        {houseProgress.total > 0
                          ? `${houseProgress.loaded}/${houseProgress.total}`
                          : 'Loading…'}
                      </span>
                    </div>
                  )}
                  {houseLoaded && (
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <SuccessLottie size={16} isLight={isLight} />
                      <span
                        style={{
                          fontSize: 10.5,
                          color: accent.from,
                          fontFamily: 'Inter,sans-serif',
                        }}
                      >
                        Samples ready
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '8px 4px 4px' }}
                />

                {/* ── Per-instrument velocity flavor (collapsible) ── */}
                <div style={{ padding: '4px 4px 6px' }}>
                  <button
                    onClick={() => setShowSoundCharacter((s) => !s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 0 6px',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--c-text-secondary)',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        flex: 1,
                        textAlign: 'left',
                      }}
                    >
                      Sound Character
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--c-text-muted)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transition: 'transform 200ms',
                        transform: showSoundCharacter ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showSoundCharacter && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                      {(['kick', 'snare', 'tom10', 'tom12', 'tom14'] as HouseInstName[]).map(
                        (hInst) => {
                          const locked = houseInstVelOverride[hInst];
                          return (
                            <div key={hInst}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}
                              >
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    color: 'var(--c-text-primary)',
                                    flex: 1,
                                    fontFamily: 'var(--studio-font-body)',
                                  }}
                                >
                                  {HOUSE_INST_LABELS[hInst]}
                                </span>
                                {locked && (
                                  <button
                                    onClick={() => storeSetInstVelOverride(hInst, undefined)}
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      color: 'var(--c-text-muted)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '0 2px',
                                      fontFamily: 'var(--studio-font-body)',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    AUTO
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {HOUSE_VEL_CONFIGS[hInst].map((v) => {
                                  const active = locked === v.id;
                                  return (
                                    <button
                                      key={v.id}
                                      className="btn-smooth"
                                      onClick={() =>
                                        storeSetInstVelOverride(hInst, active ? undefined : v.id)
                                      }
                                      style={{
                                        height: 26,
                                        padding: '0 10px',
                                        borderRadius: 6,
                                        border: active
                                          ? `1.5px solid ${accent.from}66`
                                          : '1.5px solid rgba(128,128,128,0.14)',
                                        background: active
                                          ? `${accent.from}1a`
                                          : 'rgba(128,128,128,0.06)',
                                        color: active ? accent.from : 'var(--c-text-secondary)',
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 140ms',
                                        fontFamily: 'var(--studio-font-body)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {v.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      )}

                      {/* ── Crash Cymbal model selector ── */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--c-text-primary)',
                              flex: 1,
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            Crash Cymbal
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {HOUSE_CRASH_MODELS.map((m) => {
                            const active = houseCrashModel === m.id;
                            return (
                              <button
                                key={m.id}
                                className="btn-smooth"
                                onClick={() => storeSetHouseCrashModel(m.id as HouseCrashModel)}
                                title={m.desc}
                                style={{
                                  height: 26,
                                  padding: '0 10px',
                                  borderRadius: 6,
                                  border: active
                                    ? `1.5px solid ${accent.from}66`
                                    : '1.5px solid rgba(128,128,128,0.14)',
                                  background: active
                                    ? `${accent.from}1a`
                                    : 'rgba(128,128,128,0.06)',
                                  color: active ? accent.from : 'var(--c-text-secondary)',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 140ms',
                                  fontFamily: 'var(--studio-font-body)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Cymbal Pack selector ── */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--c-text-primary)',
                              flex: 1,
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            Cymbal Pack
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {CYMBAL_PACKS.map((p) => {
                            const active = cymbalPack === p.id;
                            return (
                              <button
                                key={p.id}
                                className="btn-smooth"
                                onClick={() => storeSetCymbalPack(p.id as CymbalPack)}
                                title={p.desc}
                                style={{
                                  height: 26,
                                  padding: '0 10px',
                                  borderRadius: 6,
                                  border: active
                                    ? `1.5px solid ${accent.from}66`
                                    : '1.5px solid rgba(128,128,128,0.14)',
                                  background: active
                                    ? `${accent.from}1a`
                                    : 'rgba(128,128,128,0.06)',
                                  color: active ? accent.from : 'var(--c-text-secondary)',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 140ms',
                                  fontFamily: 'var(--studio-font-body)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Random Variations toggle ── */}
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: 'var(--c-text-primary)',
                            fontFamily: 'var(--studio-font-body)',
                          }}
                        >
                          Random Variations
                        </span>
                        <button
                          onClick={() =>
                            updateDrumPrefs({ randomVariations: !drumPrefs.randomVariations })
                          }
                          style={{
                            width: 36,
                            height: 20,
                            borderRadius: 10,
                            background: drumPrefs.randomVariations
                              ? `linear-gradient(135deg,${accent.from},${accent.to})`
                              : 'rgba(128,128,128,0.18)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 220ms',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 2.5,
                              left: drumPrefs.randomVariations ? 18 : 2.5,
                              width: 15,
                              height: 15,
                              borderRadius: '50%',
                              background: '#fff',
                              transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                              display: 'block',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 4px' }} />
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center', padding: '9px 4px', gap: 12 }}>
              <span
                style={{ flex: 1, color: 'var(--c-text-primary)', fontSize: 13, fontWeight: 500 }}
              >
                Loop
              </span>
              <button
                onClick={() => {
                  setLooping((l) => {
                    const n = !l;
                    updateDrumPrefs({ loopPlayback: n });
                    return n;
                  });
                }}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: looping
                    ? `linear-gradient(135deg,${accent.from},${accent.to})`
                    : 'rgba(128,128,128,0.18)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 220ms',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: looping ? 20 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'block',
                  }}
                />
              </button>
            </div>
            <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '9px 4px', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--c-text-primary)', fontSize: 13, fontWeight: 500 }}>
                  Step Resolution
                </span>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--c-text-muted)',
                    fontSize: 11,
                    marginTop: 1,
                  }}
                >
                  {pattern.subdivision === 16 ? '16th notes' : '8th notes'}
                </span>
              </div>
              <button
                onClick={toggleSub}
                style={{
                  height: 28,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: `${accent.from}18`,
                  border: `1px solid ${accent.from}33`,
                  cursor: 'pointer',
                  color: accent.from,
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                1/{pattern.subdivision}
              </button>
            </div>
            {/* ── Humanize ──────────────────────────────────────────────── */}
            <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '9px 4px', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--c-text-primary)', fontSize: 13, fontWeight: 500 }}>
                  Humanize
                </span>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--c-text-muted)',
                    fontSize: 11,
                    marginTop: 1,
                  }}
                >
                  {humanizeFeedback ? 'Applied!' : 'Add subtle variation to the pattern'}
                </span>
              </div>
              <button
                onClick={handleHumanize}
                className="btn-smooth"
                style={{
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 8,
                  background: humanizeFeedback ? `${accent.from}22` : `${accent.from}18`,
                  border: `1px solid ${humanizeFeedback ? accent.from + '55' : accent.from + '33'}`,
                  cursor: 'pointer',
                  color: accent.from,
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 200ms',
                  fontFamily: 'var(--studio-font-body)',
                }}
              >
                {humanizeFeedback ? '✓ Done' : 'Apply'}
              </button>
            </div>

            {/* ── Preferences ───────────────────────────────────────────── */}
            <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 4px' }} />
            <button
              onClick={() => {
                setShowHamburger(false);
                handleSetTab('prefs');
              }}
              className="btn-smooth"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--c-text-secondary)',
                fontSize: 13,
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 500,
                textAlign: 'left',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="6" x2="8" y2="3" />
                <line x1="8" y1="6" x2="8" y2="9" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="14" y1="12" x2="14" y2="9" />
                <line x1="14" y1="12" x2="14" y2="15" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <line x1="10" y1="18" x2="10" y2="15" />
                <line x1="10" y1="18" x2="10" y2="21" />
              </svg>
              <span>Preferences</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: 'auto' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '9px 4px', gap: 8 }}>
              <span
                style={{ flex: 1, color: 'var(--c-text-secondary)', fontSize: 13, fontWeight: 500 }}
              >
                Export
              </span>
              {/* JSON icon button */}
              <button
                onClick={() => {
                  exportDrumSongJSON(patterns, activeSong);
                  setShowHamburger(false);
                }}
                title="Export as JSON"
                className="btn-smooth"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--app-surface-high)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--c-text-secondary)', fontSize: 17 }}
                >
                  data_object
                </span>
              </button>
              {/* PDF icon button */}
              <button
                onClick={() => {
                  setShowHamburger(false);
                  setShowExportModal(true);
                }}
                title="Export as PDF"
                className="btn-smooth"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--app-surface-high)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--c-text-secondary)', fontSize: 17 }}
                >
                  picture_as_pdf
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: isWebDesktop && isLargeDesktop ? 'row' : 'column',
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {isWebDesktop && (
          <WebAppSectionDock
            app="drumex"
            activeSection={activeTab === 'songs' ? 'beats' : activeTab}
            onChangeSection={(sec: string) =>
              handleSetTab(sec === 'beats' ? 'songs' : (sec as any))
            }
          />
        )}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: '0px',
          }}
        >
          {/* Top bar / header for desktop */}
          {isWebDesktop && !inEditor && (
            <div
              className={`h-12 border-b px-5 flex items-center justify-between flex-shrink-0 select-none ${
                isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-900 bg-[#000000]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-zinc-900' : 'text-white'}`}
                >
                  DRUMEX
                </span>
                <span
                  className={`text-[10px] font-bold ${isLight ? 'text-zinc-300' : 'text-zinc-800'}`}
                >
                  |
                </span>
                <span
                  className={`text-[9.5px] font-extrabold uppercase tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}
                >
                  {activeTab === 'metronome'
                    ? 'METRONOME'
                    : activeTab === 'songs'
                      ? 'BEATS'
                      : activeTab === 'patterns'
                        ? 'GROOVE LIBRARY'
                        : 'PREFERENCES'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {activeTab === 'songs' && (
                  <>
                    <button
                      onClick={() => setShowImportDrum(true)}
                      className="h-7.5 px-3 rounded-lg text-[9.5px] font-extrabold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-1.5"
                      style={{
                        background: 'var(--c-surface-low)',
                        border: '1px solid var(--c-border)',
                        color: 'var(--c-text-secondary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[13px]">upload_file</span>
                      <span>IMPORT</span>
                    </button>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="h-7.5 px-3.5 rounded-lg text-[9.5px] font-extrabold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-1.5"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                        border: '1px solid var(--studio-accent-border)',
                        color: 'var(--color-on-tertiary, #ffffff)',
                        boxShadow: 'var(--studio-accent-glow)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[13px]">add</span>
                      <span>NEW BEAT</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ═══ SONGS LIST (Songs tab, not in editor) ═══════════════════════ */}
            <SharedNavigationContainer activeView={currentView} viewOrder={DRUM_VIEWS}>
              {(viewId) => {
                switch (viewId) {
                  case 'metronome':
                    return (
                      <MetronomePanel
                        isAmoled={isAmoled}
                        onScroll={drumScrollHide}
                        onBack={() => {
                          const history = useNavigationStore.getState().history;
                          if (history.length > 1 && history[history.length - 2]?.app === 'drumex') {
                            NavigationDispatcher.pop();
                          } else {
                            handleSetTab('songs');
                          }
                        }}
                      />
                    );
                  case 'songs-list':
                    if (!isWebDesktop) {
                      return (
                        <DrumBeatsPanel
                          drumSongs={drumSongs}
                          onSelectSong={handleLoadSong}
                          onCreateSong={() => setShowCreateForm(true)}
                          onImportSong={() => setShowImportDrum(true)}
                          onDeleteSong={deleteDrumSong}
                          onUpdateSong={(id, data) => updateDrumSong(id, data)}
                          previewingSongId={previewingSongId}
                          onTogglePreview={handleSongPreview}
                          accent={accent}
                          isLight={isLight}
                          isAmoled={isAmoled}
                          isWebDesktop={isWebDesktop}
                          onScroll={drumScrollHide}
                        />
                      );
                    }
                    return (
                      <div
                        onScroll={drumScrollHide}
                        style={{
                          overflowY: 'auto',
                          paddingBottom: 100,
                          paddingLeft: 24,
                          paddingRight: 24,
                        }}
                        className="no-scrollbar flex flex-col w-full h-full"
                      >
                        {!isWebDesktop && (
                          <StudioHeader
                            title="Beats"
                            subtitle="Your drum songs"
                            disableHorizontalPadding={true}
                          />
                        )}

                        {/* Desktop Secondary Toolbar */}
                        {isWebDesktop && (
                          <div
                            className={`h-10 border-b px-5 flex items-center justify-between flex-shrink-0 text-[11px] ${
                              isLight
                                ? 'border-zinc-200 bg-zinc-50/50'
                                : 'border-zinc-900 bg-[#000000]'
                            }`}
                          >
                            {/* Left: Search input */}
                            <div className="flex items-center gap-2 flex-1 max-w-xs relative">
                              <span className="material-symbols-outlined text-[14px] text-zinc-500 absolute left-2">
                                search
                              </span>
                              <input
                                value={songSearch}
                                onChange={(e) => setSongSearch(e.target.value)}
                                placeholder="Search beats..."
                                className={`w-full pl-7 pr-2.5 py-1 rounded-md border text-[10.5px] outline-none transition-all ${
                                  isLight
                                    ? 'bg-white border-zinc-200 text-zinc-850 focus:border-zinc-350 placeholder-zinc-400'
                                    : 'bg-[#000000] border-zinc-850 text-white focus:border-zinc-750 placeholder-zinc-650'
                                }`}
                              />
                            </div>

                            {/* Right: Filters & Sorting */}
                            <div className="flex items-center gap-4">
                              {/* Kit filter */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold">
                                  Kit:
                                </span>
                                <select
                                  value={songKitFilter}
                                  onChange={(e) => setSongKitFilter(e.target.value)}
                                  className={`px-2 py-0.5 rounded border text-[10.5px] font-bold outline-none cursor-pointer ${
                                    isLight
                                      ? 'bg-white border-zinc-200 text-zinc-700'
                                      : 'bg-[#000000] border-zinc-850 text-zinc-300'
                                  }`}
                                >
                                  <option value="all">All Kits</option>
                                  <option value="house">Acoustic — House Kit</option>
                                </select>
                              </div>

                              {/* Sort */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold">
                                  Sort:
                                </span>
                                <select
                                  value={songSort}
                                  onChange={(e) => setSongSort(e.target.value as any)}
                                  className={`px-2 py-0.5 rounded border text-[10.5px] font-bold outline-none cursor-pointer ${
                                    isLight
                                      ? 'bg-white border-zinc-200 text-zinc-700'
                                      : 'bg-[#000000] border-zinc-850 text-zinc-300'
                                  }`}
                                >
                                  <option value="recent">Recent</option>
                                  <option value="name">Name</option>
                                  <option value="bpm">BPM</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                        {drumSongs.length === 0 ? (
                          <div
                            className={`spring-in flex flex-col items-center justify-center p-12 mx-5 border rounded-2xl gap-5 ${
                              isLight
                                ? 'bg-zinc-50 border-zinc-200'
                                : 'bg-[#000000] border-zinc-900'
                            }`}
                          >
                            <div
                              className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                                isLight
                                  ? 'border-zinc-200 bg-zinc-100/50 text-zinc-650'
                                  : 'border-zinc-900 bg-zinc-950/20 text-zinc-400'
                              }`}
                            >
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <ellipse cx="12" cy="7" rx="10" ry="4" />
                                <path d="M2 7c0 2.21 4.48 4 10 4s10-1.79 10-4" />
                                <path d="M2 7v5c0 2.21 4.48 4 10 4s10-1.79 10-4V7" />
                                <path d="M2 12v5c0 2.21 4.48 4 10 4s10-1.79 10-4v-5" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <span
                                className={`block text-sm font-extrabold uppercase tracking-widest ${isLight ? 'text-zinc-800' : 'text-white'}`}
                              >
                                No beats yet
                              </span>
                              <span className="block text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide mt-1.5">
                                Create your first drum beat to get started.
                              </span>
                            </div>
                            <button
                              onClick={() => setShowCreateForm(true)}
                              className="py-2 px-5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase transition-all cursor-pointer"
                              style={{
                                background:
                                  'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                                border: '1px solid var(--studio-accent-border)',
                                color: 'var(--color-on-tertiary, #ffffff)',
                                boxShadow: 'var(--studio-accent-glow)',
                              }}
                            >
                              New Beat
                            </button>
                          </div>
                        ) : filteredSongs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
                            <span className="material-symbols-outlined text-[36px] mb-3">
                              search_off
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              No matching beats found
                            </span>
                            <span className="text-[10px] mt-1">
                              Try refining your search term or filters.
                            </span>
                          </div>
                        ) : (
                          <div
                            className={
                              isWebDesktop
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6'
                                : 'flex flex-col gap-2.5 px-4'
                            }
                          >
                            <StaggeredReveal staggerInterval={40}>
                              {filteredSongs.map((song: any) => {
                                const isDeleting = deletingId === song.id;
                                const isEditing = editingSong?.id === song.id;
                                const kitLabel = song.kitType
                                  ? KIT_LABEL[song.kitType as KitType]
                                  : 'No kit';
                                const pCount = song.patterns.length;
                                const activePat =
                                  song.patterns.find((p: any) => p.id === song.activePatternId) ??
                                  song.patterns[0];
                                const bpm = activePat?.bpm ?? 120;
                                return (
                                  <div
                                    key={song.id}
                                    className="rounded-xl transition-all duration-300"
                                    style={{
                                      background: 'var(--c-surface-low)',
                                      border: '1px solid var(--c-border)',
                                    }}
                                  >
                                    {isEditing ? (
                                      <div className="p-3.5 flex flex-col gap-2.5">
                                        <input
                                          value={editingName}
                                          onChange={(e) => setEditingName(e.target.value)}
                                          autoFocus
                                          placeholder="Beat name"
                                          className="w-full py-1.5 px-2.5 rounded-lg text-[12px] font-extrabold outline-none transition-all"
                                          style={{
                                            backgroundColor: 'var(--c-surface-lowest)',
                                            border: '1px solid var(--c-border)',
                                            color: 'var(--c-text-primary)',
                                          }}
                                        />
                                        <input
                                          value={editingArtist}
                                          onChange={(e) => setEditingArtist(e.target.value)}
                                          placeholder="Artist (optional)"
                                          className="w-full py-1.5 px-2.5 rounded-lg text-[11px] outline-none transition-all"
                                          style={{
                                            backgroundColor: 'var(--c-surface-lowest)',
                                            border: '1px solid var(--c-border)',
                                            color: 'var(--c-text-primary)',
                                          }}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleSaveEdit}
                                            className="flex-1 py-1.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase transition-all cursor-pointer"
                                            style={{
                                              background:
                                                'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                                              border: '1px solid var(--studio-accent-border)',
                                              color: 'var(--color-on-tertiary, #ffffff)',
                                              boxShadow: 'var(--studio-accent-glow)',
                                            }}
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingSong(null)}
                                            className="flex-1 py-1.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase transition-all cursor-pointer"
                                            style={{
                                              background: 'var(--c-surface-mid)',
                                              border: '1px solid var(--c-border)',
                                              color: 'var(--c-text-secondary)',
                                            }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : isDeleting ? (
                                      <div className="p-4 flex flex-col justify-center items-center text-center gap-3 flex-1">
                                        <span
                                          className={`text-[10.5px] font-extrabold uppercase tracking-wide ${isLight ? 'text-zinc-800' : 'text-white'}`}
                                        >
                                          Delete this beat?
                                        </span>
                                        <div className="flex gap-2 w-full max-w-[180px]">
                                          <button
                                            onClick={() => {
                                              deleteDrumSong(song.id);
                                              setDeletingId(null);
                                            }}
                                            className="flex-1 py-1 rounded-lg text-[9.5px] font-extrabold tracking-widest uppercase border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() => setDeletingId(null)}
                                            className={`flex-1 py-1 rounded-lg text-[9.5px] font-extrabold tracking-widest uppercase border cursor-pointer ${
                                              isLight
                                                ? 'border-zinc-200 bg-zinc-50 text-zinc-650'
                                                : 'border-zinc-900 bg-zinc-950 text-zinc-400'
                                            }`}
                                          >
                                            No
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col flex-1 relative">
                                        {/* Menu button (Â·Â·Â·) */}
                                        <div className="absolute right-2 top-2 z-10">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (songMenuId === song.id) {
                                                setSongMenuId(null);
                                              } else {
                                                const rect =
                                                  e.currentTarget.getBoundingClientRect();
                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                setSongOpenUp(spaceBelow < 120);
                                                setSongMenuId(song.id);
                                              }
                                            }}
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                              songMenuId === song.id
                                                ? isLight
                                                  ? 'bg-zinc-100 border-zinc-350 text-black'
                                                  : 'bg-zinc-900 border-zinc-800 text-white'
                                                : isLight
                                                  ? 'bg-transparent border-transparent text-zinc-450 hover:border-zinc-250 hover:text-black'
                                                  : 'bg-transparent border-transparent text-zinc-500 hover:border-zinc-800 hover:text-white'
                                            }`}
                                          >
                                            <span className="material-symbols-outlined text-[16px]">
                                              more_vert
                                            </span>
                                          </button>

                                          {/* Dropdown Menu */}
                                          {songMenuId === song.id && (
                                            <>
                                              {/* Click-away overlay */}
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSongMenuId(null);
                                                }}
                                                style={{
                                                  position: 'fixed',
                                                  top: 0,
                                                  left: 0,
                                                  right: 0,
                                                  bottom: 0,
                                                  zIndex: 15,
                                                  cursor: 'default',
                                                }}
                                              />
                                              <div
                                                className={`absolute right-0 z-20 w-32 py-1 rounded-lg border shadow-lg ${
                                                  songOpenUp ? 'bottom-8' : 'top-8'
                                                } ${
                                                  isLight
                                                    ? 'bg-white border-zinc-200'
                                                    : 'bg-[#080808] border-zinc-900'
                                                }`}
                                              >
                                                <button
                                                  ref={renameBtnRef}
                                                  autoFocus
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'ArrowDown' || e.key === 'Tab') {
                                                      e.preventDefault();
                                                      deleteBtnRef.current?.focus();
                                                    }
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartEdit(song);
                                                    setSongMenuId(null);
                                                  }}
                                                  className={`w-full text-left px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                                                    isLight
                                                      ? 'text-zinc-700 hover:bg-zinc-50 hover:text-black'
                                                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                                  }`}
                                                >
                                                  <span className="material-symbols-outlined text-[13px]">
                                                    edit
                                                  </span>
                                                  Rename
                                                </button>
                                                <button
                                                  ref={deleteBtnRef}
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === 'ArrowUp' ||
                                                      (e.key === 'Tab' && e.shiftKey)
                                                    ) {
                                                      e.preventDefault();
                                                      renameBtnRef.current?.focus();
                                                    }
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingId(song.id);
                                                    setSongMenuId(null);
                                                  }}
                                                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 transition-colors text-red-400 hover:bg-red-500/10"
                                                >
                                                  <span className="material-symbols-outlined text-[13px]">
                                                    delete
                                                  </span>
                                                  Delete
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>

                                        {/* Card click area */}
                                        <button
                                          onClick={() => handleLoadSong(song)}
                                          className="w-full text-left p-4 flex items-start gap-3.5 bg-transparent border-none cursor-pointer transition-all hover:bg-zinc-500/5 flex-1 rounded-xl"
                                        >
                                          <div
                                            className={`w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                                              isLight
                                                ? 'border-zinc-200 bg-zinc-100'
                                                : 'border-zinc-900 bg-zinc-950'
                                            }`}
                                          >
                                            {song.kitType && KIT_IMAGE[song.kitType as KitType] ? (
                                              <img
                                                src={KIT_IMAGE[song.kitType as KitType]}
                                                alt={kitLabel}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span
                                                className={`material-symbols-outlined text-[18px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}
                                              >
                                                music_note
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0 pr-6">
                                            <span
                                              className={`block text-[12.5px] font-extrabold uppercase tracking-widest ${isLight ? 'text-zinc-800' : 'text-white'} truncate`}
                                            >
                                              {song.name}
                                            </span>
                                            {song.artist && (
                                              <span
                                                className={`block text-[9px] font-extrabold uppercase tracking-wider truncate mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}
                                              >
                                                {song.artist}
                                              </span>
                                            )}
                                            <div className="flex gap-2 mt-2 items-center flex-wrap">
                                              <span
                                                className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                                                  isLight
                                                    ? 'bg-zinc-100 border-zinc-200 text-zinc-650'
                                                    : 'bg-zinc-900/30 border-zinc-900 text-zinc-400'
                                                }`}
                                              >
                                                {kitLabel}
                                              </span>
                                              <span
                                                className={`text-[8.5px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}
                                              >
                                                <span className="material-symbols-outlined text-[10px]">
                                                  speed
                                                </span>
                                                {bpm} BPM
                                              </span>
                                              <span
                                                className={`text-[8.5px] font-extrabold uppercase tracking-wider ${isLight ? 'text-zinc-450' : 'text-zinc-550'}`}
                                              >
                                                {pCount} pattern{pCount !== 1 ? 's' : ''}
                                              </span>
                                            </div>
                                          </div>
                                        </button>

                                        {/* Bottom hover bar or indicator */}
                                        <div
                                          className={`h-1 w-full transition-all duration-300 mt-auto ${
                                            isLight
                                              ? 'bg-zinc-100 group-hover:bg-blue-600'
                                              : 'bg-zinc-950 group-hover:bg-blue-500/80'
                                          }`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </StaggeredReveal>
                          </div>
                        )}
                      </div>
                    );
                  case 'songs-editor':
                    return (
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: isWebDesktop ? 'row' : 'column',
                          overflow: 'hidden',
                        }}
                        className="w-full h-full"
                      >
                        <div
                          ref={containerCallbackRef}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative',
                            paddingTop: !isWebDesktop
                              ? isLandscape
                                ? 'calc(env(safe-area-inset-top, 0px) + 48px)'
                                : 'calc(env(safe-area-inset-top, 0px) + 58px)'
                              : undefined,
                          }}
                        >
                          {/* ── Grid Toolbar ── */}
                          <section
                            className="flex items-center justify-between px-3 sm:px-4 flex-shrink-0"
                            style={{
                              height: 34,
                              borderBottom: `1px solid ${barColor}`,
                              background: 'var(--app-bg)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  color: 'var(--c-text-muted)',
                                  fontSize: 10,
                                  fontFamily: 'var(--font-headline)',
                                  fontWeight: 700,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {showExtraRows
                                  ? `ALL ROWS (${visibleInsts.length})`
                                  : `CORE ROWS (${visibleInsts.length})`}
                              </span>
                              <button
                                onClick={() => setSideTab('kit')}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-750 transition cursor-pointer"
                                type="button"
                              >
                                Preset
                                <svg
                                  className="w-2.5 h-2.5 text-slate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M19 9l-7 7-7-7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </button>
                            </div>
                            {extraInsts.length > 0 && (
                              <button
                                onClick={() => setShowExtraRows((v) => !v)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-[#007aff] hover:bg-blue-100/80 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/40 rounded-full text-[10px] font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                                type="button"
                              >
                                {showExtraRows ? (
                                  <>
                                    <svg
                                      width="9"
                                      height="9"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                    >
                                      <path d="M18 15l-6-6-6 6" />
                                    </svg>
                                    Hide extras
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      width="9"
                                      height="9"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                    >
                                      <path d="M6 9l6 6 6-6" />
                                    </svg>
                                    Show all
                                  </>
                                )}
                              </button>
                            )}
                          </section>
                          <div
                            ref={scrollRef}
                            onScroll={drumScrollHide}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={cancelPointer}
                            onPointerCancel={cancelPointer}
                            style={{
                              flex: 1,
                              overflowY: 'auto',
                              overflowX: pattern.measures.length > 2 ? 'auto' : 'hidden',
                              paddingTop: 8,
                              paddingBottom: isWebDesktop ? 110 : isLandscape ? 20 : 108,
                              position: 'relative',
                            }}
                            className="no-scrollbar"
                          >
                            {/* Playhead — extends into ruler, draggable handle at top */}
                            <div
                              ref={playheadRef}
                              style={{
                                position: 'absolute',
                                top: 8,
                                left: 0,
                                width: 2,
                                height:
                                  RULER_H +
                                  visibleInsts.length * ROW_H +
                                  (visibleInsts.length > 0
                                    ? (visibleInsts.length - 1) * rowGap
                                    : 0),
                                background: accent.from,
                                boxShadow: `0 0 6px ${accent.from}88`,
                                pointerEvents: 'none',
                                zIndex: 10,
                                display: 'block',
                                borderRadius: 1,
                                willChange: 'transform',
                                transform: `translate(${LABEL_W}px, 0px)`,
                              }}
                            >
                              {/* Draggable handle — downward triangle above the ruler */}
                              <div
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  const el = scrollRef.current;
                                  if (!el) return;
                                  const onMove = (ev: PointerEvent) => {
                                    const rect = el.getBoundingClientRect();
                                    const relX = ev.clientX - rect.left + el.scrollLeft - LABEL_W;
                                    const step = Math.max(0, Math.floor(relX / stepWRef.current));
                                    drumScheduler.seekTo(step);
                                  };
                                  const onUp = () => {
                                    document.removeEventListener('pointermove', onMove);
                                    document.removeEventListener('pointerup', onUp);
                                  };
                                  document.addEventListener('pointermove', onMove);
                                  document.addEventListener('pointerup', onUp);
                                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 0,
                                  height: 0,
                                  borderLeft: '4.5px solid transparent',
                                  borderRight: '4.5px solid transparent',
                                  borderTop: `7.5px solid ${accent.from}`,
                                  cursor: 'ew-resize',
                                  pointerEvents: 'auto',
                                }}
                              />
                            </div>
                            {containerW > LABEL_W &&
                              systemRows.map((rowMeasures, sysIdx) => {
                                const mStartIdx = sysIdx * measuresPerRow;
                                return (
                                  <div
                                    key={sysIdx}
                                    style={{
                                      marginBottom: SYS_SEP,
                                      width: isLandscape
                                        ? LABEL_W + pattern.measures.length * MEASURE_W
                                        : '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        height: RULER_H,
                                        borderBottom: `1px solid ${barColor}`,
                                        position: 'relative',
                                        width: '100%',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: LABEL_W,
                                          flexShrink: 0,
                                          position: 'sticky',
                                          left: 0,
                                          zIndex: 25,
                                          background: isLight
                                            ? 'rgba(248,250,252,0.95)'
                                            : isAmoled
                                              ? '#000000'
                                              : 'rgba(18,18,22,0.95)',
                                          borderRight: `1px solid ${barColor}`,
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0 8px',
                                          boxSizing: 'border-box',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            color: 'var(--c-text-primary)',
                                            letterSpacing: '0.02em',
                                          }}
                                        >
                                          BAR {mStartIdx + 1}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontFamily: 'monospace',
                                            color: 'var(--c-text-muted)',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {pattern.subdivision}th
                                        </span>
                                      </div>
                                      {rowMeasures.map((m, mi) => {
                                        const globalM = mStartIdx + mi;
                                        const canDelete = pattern.measures.length > 2;
                                        const menuOpen = openBarMenu === m.id;
                                        const isFlash = flashBarId === m.id;
                                        return (
                                          <div
                                            key={mi}
                                            style={{
                                              width: MEASURE_W,
                                              flexShrink: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              height: '100%',
                                              borderLeft:
                                                mi > 0 ? `1.5px solid ${barColor}` : 'none',
                                              position: 'relative',
                                              background: isFlash
                                                ? `${accent.from}22`
                                                : loopActive &&
                                                    globalM >= effectiveLoop.startBar &&
                                                    globalM <= effectiveLoop.endBar
                                                  ? `${accent.from}1a`
                                                  : 'transparent',
                                              transition: 'background 400ms',
                                            }}
                                          >
                                            {/* Loop range bracket markers */}
                                            {loopActive && globalM === effectiveLoop.startBar && (
                                              <span
                                                aria-hidden
                                                style={{
                                                  position: 'absolute',
                                                  top: 2,
                                                  left: 2,
                                                  fontSize: 8,
                                                  fontWeight: 900,
                                                  color: accent.from,
                                                  lineHeight: 1,
                                                  pointerEvents: 'none',
                                                  zIndex: 15,
                                                }}
                                              >
                                                ▶
                                              </span>
                                            )}
                                            {loopActive && globalM === effectiveLoop.endBar && (
                                              <span
                                                aria-hidden
                                                style={{
                                                  position: 'absolute',
                                                  top: 2,
                                                  right: 2,
                                                  fontSize: 8,
                                                  fontWeight: 900,
                                                  color: accent.from,
                                                  lineHeight: 1,
                                                  pointerEvents: 'none',
                                                  zIndex: 15,
                                                }}
                                              >
                                                ◀
                                              </span>
                                            )}

                                            {/* Subdivision Ruler Cells */}
                                            {Array.from({ length: spm }, (_, s) => {
                                              const isBeat = s % stepsPerBeat === 0;
                                              const beatIdx = Math.floor(s / stepsPerBeat) + 1;
                                              const isBarBoundary = (s + 1) % stepsPerBeat === 0;
                                              let subLabel = '';
                                              if (stepsPerBeat === 4) {
                                                subLabel =
                                                  s % 4 === 0
                                                    ? globalM === 0
                                                      ? `${beatIdx}`
                                                      : `${globalM + 1}•${beatIdx}`
                                                    : s % 4 === 1
                                                      ? 'e'
                                                      : s % 4 === 2
                                                        ? '&'
                                                        : 'a';
                                              } else {
                                                subLabel =
                                                  s % 2 === 0
                                                    ? globalM === 0
                                                      ? `${beatIdx}`
                                                      : `${globalM + 1}•${beatIdx}`
                                                    : '&';
                                              }
                                              return (
                                                <div
                                                  key={s}
                                                  style={{
                                                    width: STEP_W,
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: isBeat ? 10 : 9,
                                                    fontWeight: isBeat ? 700 : 500,
                                                    fontFamily: 'monospace',
                                                    color: isBeat
                                                      ? 'var(--c-text-primary)'
                                                      : 'var(--c-text-muted)',
                                                    background: isBeat
                                                      ? isLight
                                                        ? 'rgba(0,0,0,0.035)'
                                                        : 'rgba(255,255,255,0.04)'
                                                      : 'transparent',
                                                    borderRight: isBarBoundary
                                                      ? `1.5px solid ${barColor}`
                                                      : `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}`,
                                                    userSelect: 'none',
                                                  }}
                                                >
                                                  {subLabel}
                                                </div>
                                              );
                                            })}

                                            {/* ··· measure menu button */}
                                            <button
                                              onPointerDown={(e) => e.stopPropagation()}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenBarMenu(menuOpen ? null : m.id);
                                              }}
                                              style={{
                                                position: 'absolute',
                                                right: 3,
                                                top: 5,
                                                width: 18,
                                                height: 18,
                                                borderRadius: 4,
                                                flexShrink: 0,
                                                background: menuOpen
                                                  ? `${accent.from}22`
                                                  : 'rgba(128,128,128,0.12)',
                                                border: `1px solid ${menuOpen ? accent.from + '44' : 'rgba(128,128,128,0.22)'}`,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: menuOpen
                                                  ? accent.from
                                                  : 'var(--c-text-muted)',
                                                fontSize: 9,
                                                letterSpacing: '0.05em',
                                                fontWeight: 900,
                                                lineHeight: 1,
                                                padding: 0,
                                                transition: 'all 140ms',
                                              }}
                                            >
                                              <span className="material-symbols-outlined text-[13px] leading-none">
                                                more_horiz
                                              </span>
                                            </button>
                                            {/* Dropdown menu */}
                                            {menuOpen && (
                                              <div
                                                onPointerDown={(e) => e.stopPropagation()}
                                                style={{
                                                  position: 'absolute',
                                                  top: RULER_H + 2,
                                                  left: 0,
                                                  zIndex: 92,
                                                  background: isAmoled
                                                    ? 'rgba(4,4,4,0.98)'
                                                    : isLight
                                                      ? 'rgba(255,255,255,0.98)'
                                                      : 'rgba(18,18,22,0.98)',
                                                  border: isLight
                                                    ? '1px solid rgba(0,0,0,0.10)'
                                                    : '1px solid rgba(255,255,255,0.10)',
                                                  borderRadius: 10,
                                                  boxShadow: isLight
                                                    ? '0 8px 32px rgba(0,0,0,0.14)'
                                                    : '0 8px 32px rgba(0,0,0,0.55)',
                                                  padding: '4px 0',
                                                  minWidth: 148,
                                                  backdropFilter: 'blur(20px)',
                                                  WebkitBackdropFilter: 'blur(20px)',
                                                  animation:
                                                    'drumHamburgerIn 150ms cubic-bezier(0.22,1,0.36,1)',
                                                }}
                                              >
                                                <button
                                                  onPointerUp={(e) => {
                                                    e.stopPropagation();
                                                    setCopiedMeasure(JSON.parse(JSON.stringify(m)));
                                                    setOpenBarMenu(null);
                                                  }}
                                                  style={menuItemSt}
                                                >
                                                  <svg
                                                    width="11"
                                                    height="11"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <rect
                                                      x="9"
                                                      y="9"
                                                      width="13"
                                                      height="13"
                                                      rx="2"
                                                    />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                  </svg>
                                                  Copy bar
                                                </button>
                                                <button
                                                  onPointerUp={(e) => {
                                                    e.stopPropagation();
                                                    pushUndo();
                                                    duplicateMeasure(pattern.id, m.id);
                                                    setOpenBarMenu(null);
                                                  }}
                                                  style={menuItemSt}
                                                >
                                                  <svg
                                                    width="11"
                                                    height="11"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <rect
                                                      x="3"
                                                      y="3"
                                                      width="13"
                                                      height="13"
                                                      rx="2"
                                                    />
                                                    <path d="M9 17v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2" />
                                                  </svg>
                                                  Duplicate
                                                </button>
                                                {copiedMeasure && (
                                                  <button
                                                    onPointerUp={(e) => {
                                                      e.stopPropagation();
                                                      pushUndo();
                                                      const newId = insertMeasureAfter(
                                                        pattern.id,
                                                        m.id,
                                                        copiedMeasure.hits
                                                      );
                                                      setOpenBarMenu(null);
                                                      setFlashBarId(newId);
                                                      setTimeout(() => setFlashBarId(null), 700);
                                                    }}
                                                    style={{ ...menuItemSt, color: accent.from }}
                                                  >
                                                    <svg
                                                      width="11"
                                                      height="11"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2.2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                                      <rect
                                                        x="8"
                                                        y="2"
                                                        width="8"
                                                        height="4"
                                                        rx="1"
                                                      />
                                                    </svg>
                                                    Paste after
                                                  </button>
                                                )}
                                                {canDelete && (
                                                  <>
                                                    <div
                                                      style={{
                                                        height: 1,
                                                        background: 'rgba(128,128,128,0.10)',
                                                        margin: '4px 0',
                                                      }}
                                                    />
                                                    <button
                                                      onPointerUp={(e) => {
                                                        e.stopPropagation();
                                                        pushUndo();
                                                        if (drumScheduler.isPlaying) {
                                                          drumScheduler.stop();
                                                          setPlaying(false);
                                                        }
                                                        deleteMeasure(pattern.id, m.id);
                                                        setOpenBarMenu(null);
                                                      }}
                                                      style={{ ...menuItemSt, color: '#f87171' }}
                                                    >
                                                      <svg
                                                        width="11"
                                                        height="11"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      >
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                      </svg>
                                                      Delete bar
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {visibleInsts.map((inst, instIdx) => {
                                      const isFoc = focusedInst === inst;
                                      const varList = INST_VARIATIONS[inst];
                                      const isMuted =
                                        pattern.mutedInstruments?.includes(inst) ?? false;
                                      const isSoloed = soloInst === inst;
                                      return (
                                        <div
                                          key={inst}
                                          style={{
                                            display: 'flex',
                                            height: ROW_H,
                                            marginBottom: rowGap,
                                            borderRadius: isWebDesktop ? 8 : 0,
                                            border: isWebDesktop
                                              ? isLight
                                                ? '1px solid rgba(0,0,0,0.08)'
                                                : '1px solid rgba(255,255,255,0.08)'
                                              : 'none',
                                            borderBottom: isWebDesktop
                                              ? isLight
                                                ? '1px solid rgba(0,0,0,0.08)'
                                                : '1px solid rgba(255,255,255,0.08)'
                                              : instIdx < visibleInsts.length - 1
                                                ? `1px solid ${staffColor}`
                                                : `1.5px solid ${barColor}`,
                                            background:
                                              isFoc && drumPrefs.highlightActiveInst
                                                ? isLight
                                                  ? 'rgba(0,0,0,0.025)'
                                                  : 'rgba(255,255,255,0.018)'
                                                : isWebDesktop
                                                  ? 'var(--app-surface)'
                                                  : 'transparent',
                                            overflow: isWebDesktop ? 'hidden' : 'visible',
                                            width: '100%',
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: LABEL_W,
                                              flexShrink: 0,
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'stretch',
                                              justifyContent: 'center',
                                              paddingLeft: 8,
                                              paddingRight: 6,
                                              borderRight: isWebDesktop
                                                ? isLight
                                                  ? '1px solid rgba(0,0,0,0.06)'
                                                  : '1px solid rgba(255,255,255,0.06)'
                                                : `1px solid ${barColor}`,
                                              position: 'sticky',
                                              left: 0,
                                              zIndex: 10,
                                              background:
                                                isFoc && drumPrefs.highlightActiveInst
                                                  ? isLight
                                                    ? '#eae9e6'
                                                    : '#1b1b21'
                                                  : isWebDesktop
                                                    ? 'var(--app-surface)'
                                                    : 'var(--app-bg)',
                                              opacity: isMuted ? 0.55 : 1,
                                              transition: 'opacity 150ms, background 200ms',
                                            }}
                                          >
                                            <div className="flex items-center justify-between w-full min-w-0">
                                              <span
                                                className="text-[10px] font-bold uppercase tracking-tight truncate flex-1 min-w-0"
                                                style={{
                                                  fontFamily: 'var(--font-headline)',
                                                  color:
                                                    isFoc && drumPrefs.highlightActiveInst
                                                      ? 'var(--c-text-primary)'
                                                      : isMuted
                                                        ? 'var(--c-text-muted)'
                                                        : 'var(--c-text-primary)',
                                                }}
                                              >
                                                {INST_LABEL[inst]}
                                              </span>
                                              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePatternMute(pattern.id, inst);
                                                  }}
                                                  title={isMuted ? 'Unmute track' : 'Mute track'}
                                                  aria-label={
                                                    isMuted
                                                      ? `Unmute ${INST_LABEL[inst]}`
                                                      : `Mute ${INST_LABEL[inst]}`
                                                  }
                                                  className={`w-4 h-4 rounded text-[9px] font-extrabold flex items-center justify-center cursor-pointer transition active:scale-95 ${
                                                    isMuted
                                                      ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                                                      : isLight
                                                        ? 'bg-slate-200/70 text-slate-500 hover:bg-slate-300 hover:text-slate-800'
                                                        : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                                  }`}
                                                >
                                                  M
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleSolo(inst);
                                                  }}
                                                  title={isSoloed ? 'Clear solo' : 'Solo track'}
                                                  aria-label={
                                                    isSoloed
                                                      ? `Unsolo ${INST_LABEL[inst]}`
                                                      : `Solo ${INST_LABEL[inst]}`
                                                  }
                                                  className={`w-4 h-4 rounded text-[9px] font-extrabold flex items-center justify-center cursor-pointer transition active:scale-95 ${
                                                    isSoloed
                                                      ? 'bg-[#007aff] text-white shadow-[0_0_8px_rgba(0,122,255,0.4)]'
                                                      : isLight
                                                        ? 'bg-slate-200/70 text-slate-500 hover:bg-slate-300 hover:text-slate-800'
                                                        : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                                  }`}
                                                >
                                                  S
                                                </button>
                                              </div>
                                            </div>
                                            {varList && varList.length > 1 ? (
                                              <span
                                                className="text-[7.5px] font-mono tracking-tight truncate w-full mt-0.5 opacity-60"
                                                style={{
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                {varList.join(' • ')}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-[7.5px] font-mono tracking-tight truncate w-full mt-0.5 opacity-40"
                                                style={{
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                norm
                                              </span>
                                            )}
                                          </div>
                                          <InstrumentRow
                                            inst={inst}
                                            mStartIdx={mStartIdx}
                                            rowMeasures={rowMeasures}
                                            spm={spm}
                                            stepsPerBeat={stepsPerBeat}
                                            STEP_W={STEP_W}
                                            MEASURE_W={MEASURE_W}
                                            noteColor={noteColor}
                                            staffColor={staffColor}
                                            barColor={barColor}
                                            altBg={altBg}
                                            showVariations={drumPrefs.showNoteVariations}
                                            gridEmphasis={drumPrefs.gridLinesEmphasis}
                                            accentFrom={accent.from}
                                            ROW_H={ROW_H}
                                            isLight={isLight}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                          </div>
                          {/* ── Floating Transport Dock (Canonical Mobile Transport Capsule) ── */}
                          <aside
                            aria-label="Drum sequencer transport controls"
                            className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl"
                            style={{
                              display: isWebDesktop || isLandscape ? 'none' : 'flex',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              bottom:
                                'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
                              backgroundColor: isAmoled
                                ? 'rgba(12, 12, 14, 0.94)'
                                : isLight
                                  ? 'rgba(255, 255, 255, 0.94)'
                                  : 'rgba(22, 22, 26, 0.94)',
                              borderColor: isLight
                                ? 'rgba(0, 0, 0, 0.08)'
                                : 'rgba(255, 255, 255, 0.12)',
                              boxShadow: isLight
                                ? '0 10px 30px -5px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                                : '0 12px 36px -4px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)',
                            }}
                          >
                            {/* 1. Erase / Trash action */}
                            <div style={{ position: 'relative' }}>
                              {showClearConfirm && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 14px)',
                                    left: 0,
                                    background: isAmoled
                                      ? 'rgba(4,4,4,0.98)'
                                      : isLight
                                        ? 'rgba(250,250,252,0.98)'
                                        : 'rgba(18,18,22,0.98)',
                                    border: isLight
                                      ? '1px solid rgba(0,0,0,0.1)'
                                      : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 14,
                                    padding: '12px 14px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    minWidth: 190,
                                    animation: 'drumHamburgerIn 150ms cubic-bezier(0.22,1,0.36,1)',
                                    zIndex: 80,
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: '0 0 10px',
                                      fontSize: 12.5,
                                      fontWeight: 700,
                                      color: 'var(--c-text-primary)',
                                      fontFamily: 'var(--studio-font-body)',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Reset pattern?
                                  </p>
                                  <p
                                    style={{
                                      margin: '0 0 12px',
                                      fontSize: 11,
                                      color: 'var(--c-text-muted)',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    All hits and extra bars will be removed, leaving one empty bar.
                                    You can undo after.
                                  </p>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      onClick={() => setShowClearConfirm(false)}
                                      className="btn-smooth cursor-pointer"
                                      style={{
                                        flex: 1,
                                        padding: '7px 0',
                                        borderRadius: 9,
                                        background: 'rgba(128,128,128,0.12)',
                                        border: 'none',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'var(--c-text-secondary)',
                                        fontFamily: 'var(--studio-font-body)',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleClear();
                                        setShowClearConfirm(false);
                                      }}
                                      className="btn-smooth cursor-pointer"
                                      style={{
                                        flex: 1,
                                        padding: '7px 0',
                                        borderRadius: 9,
                                        background: 'rgba(239,68,68,0.15)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#f87171',
                                        fontFamily: 'var(--studio-font-body)',
                                      }}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setShowClearConfirm((s) => !s);
                                  setShowLoopPanel(false);
                                  setShowBpmPanel(false);
                                }}
                                aria-label="Delete / Reset pattern"
                                title="Reset pattern"
                                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 focus:outline-none cursor-pointer"
                                style={{
                                  background: showClearConfirm
                                    ? 'rgba(239,68,68,0.18)'
                                    : isAmoled
                                      ? 'rgba(255,255,255,0.06)'
                                      : isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.08)',
                                  color: '#ef4444',
                                  border: isLight
                                    ? '1px solid rgba(0,0,0,0.06)'
                                    : '1px solid rgba(255,255,255,0.08)',
                                }}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>

                            {/* 2. Loop / Pattern Repeat action */}
                            <div
                              style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                              }}
                            >
                              {showLoopPanel &&
                                (() => {
                                  const barCount = pattern.measures.length;
                                  const lr = effectiveLoop;
                                  const enabled = lr.enabled;
                                  const setLR = (next: Partial<LoopRange>) => {
                                    const merged = clampLoopRange({ ...lr, ...next }, barCount);
                                    updatePattern(pattern.id, { loopRange: merged });
                                  };
                                  const presets: {
                                    id: string;
                                    label: string;
                                    bars: number | 'full';
                                  }[] = [
                                    { id: '1bar', label: '1 Bar', bars: 1 },
                                    { id: '2bars', label: '2 Bars', bars: 2 },
                                    { id: 'full', label: 'Full', bars: 'full' },
                                  ];
                                  const applyPreset = (bars: number | 'full') => {
                                    pushUndo();
                                    if (bars === 'full') {
                                      setLR({
                                        startBar: 0,
                                        endBar: Math.max(0, barCount - 1),
                                        enabled: true,
                                      });
                                    } else {
                                      const span = Math.min(bars, barCount);
                                      const start = Math.min(
                                        lr.startBar,
                                        Math.max(0, barCount - span)
                                      );
                                      setLR({
                                        startBar: start,
                                        endBar: start + span - 1,
                                        enabled: true,
                                      });
                                    }
                                  };
                                  const isPresetActive = (bars: number | 'full') => {
                                    if (!enabled) return false;
                                    if (bars === 'full')
                                      return lr.startBar === 0 && lr.endBar === barCount - 1;
                                    return lr.endBar - lr.startBar + 1 === bars;
                                  };
                                  const dimIfDisabled: React.CSSProperties = enabled
                                    ? {}
                                    : { opacity: 0.42, pointerEvents: 'none' };
                                  return (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 14px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: isAmoled
                                          ? 'rgba(0,0,0,0.97)'
                                          : isLight
                                            ? 'rgba(255,255,255,0.96)'
                                            : 'rgba(18,18,22,0.96)',
                                        border: isLight
                                          ? '1px solid rgba(0,0,0,0.10)'
                                          : '1px solid rgba(255,255,255,0.10)',
                                        borderRadius: 14,
                                        padding: '10px 12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: isLight
                                          ? '0 8px 32px rgba(0,0,0,0.12)'
                                          : '0 8px 32px rgba(0,0,0,0.50)',
                                        whiteSpace: 'nowrap',
                                        animation:
                                          'drumHamburgerIn 160ms cubic-bezier(0.22,1,0.36,1)',
                                        minWidth: 232,
                                        zIndex: 80,
                                      }}
                                    >
                                      {/* Header: label + on/off toggle */}
                                      <div
                                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            color: 'var(--c-text-secondary)',
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            flex: 1,
                                          }}
                                        >
                                          Smart Loop
                                        </span>
                                        <button
                                          onClick={() => {
                                            pushUndo();
                                            setLR({ enabled: !enabled });
                                          }}
                                          aria-pressed={enabled}
                                          aria-label="Toggle smart loop"
                                          style={{
                                            width: 40,
                                            height: 22,
                                            borderRadius: 11,
                                            background: enabled
                                              ? `linear-gradient(135deg,${accent.from},${accent.to})`
                                              : 'rgba(128,128,128,0.20)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background 200ms',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div
                                            style={{
                                              position: 'absolute',
                                              top: 2,
                                              left: enabled ? 20 : 2,
                                              width: 18,
                                              height: 18,
                                              borderRadius: '50%',
                                              background: '#fff',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                              transition: 'left 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                            }}
                                          />
                                        </button>
                                      </div>
                                      {/* Bar range row */}
                                      <div
                                        style={{
                                          height: 1,
                                          background: 'rgba(128,128,128,0.18)',
                                          margin: '2px -4px',
                                        }}
                                      />
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          ...dimIfDisabled,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            color: 'var(--c-text-secondary)',
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            minWidth: 38,
                                          }}
                                        >
                                          Bars
                                        </span>
                                        <button
                                          onPointerDown={() => pushUndo()}
                                          onClick={() =>
                                            setLR({ startBar: Math.max(0, lr.startBar - 1) })
                                          }
                                          style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: 7,
                                            background: 'rgba(128,128,128,0.10)',
                                            border: '1px solid rgba(128,128,128,0.14)',
                                            cursor: 'pointer',
                                            color: 'var(--c-text-secondary)',
                                            fontSize: 14,
                                            fontWeight: 800,
                                            lineHeight: 1,
                                          }}
                                        >
                                          −
                                        </button>
                                        <span
                                          style={{
                                            color: accent.from,
                                            fontSize: 13,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            minWidth: 18,
                                            textAlign: 'center',
                                          }}
                                        >
                                          {lr.startBar + 1}
                                        </span>
                                        <button
                                          onPointerDown={() => pushUndo()}
                                          onClick={() =>
                                            setLR({
                                              startBar: Math.min(lr.endBar, lr.startBar + 1),
                                            })
                                          }
                                          style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: 7,
                                            background: 'rgba(128,128,128,0.10)',
                                            border: '1px solid rgba(128,128,128,0.14)',
                                            cursor: 'pointer',
                                            color: 'var(--c-text-secondary)',
                                            fontSize: 14,
                                            fontWeight: 800,
                                            lineHeight: 1,
                                          }}
                                        >
                                          +
                                        </button>
                                        <span
                                          style={{
                                            color: 'var(--c-text-muted)',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '0 2px',
                                          }}
                                        >
                                          –
                                        </span>
                                        <button
                                          onPointerDown={() => pushUndo()}
                                          onClick={() =>
                                            setLR({ endBar: Math.max(lr.startBar, lr.endBar - 1) })
                                          }
                                          style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: 7,
                                            background: 'rgba(128,128,128,0.10)',
                                            border: '1px solid rgba(128,128,128,0.14)',
                                            cursor: 'pointer',
                                            color: 'var(--c-text-secondary)',
                                            fontSize: 14,
                                            fontWeight: 800,
                                            lineHeight: 1,
                                          }}
                                        >
                                          −
                                        </button>
                                        <span
                                          style={{
                                            color: accent.from,
                                            fontSize: 13,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            minWidth: 18,
                                            textAlign: 'center',
                                          }}
                                        >
                                          {lr.endBar + 1}
                                        </span>
                                        <button
                                          onPointerDown={() => pushUndo()}
                                          onClick={() =>
                                            setLR({ endBar: Math.min(barCount - 1, lr.endBar + 1) })
                                          }
                                          style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: 7,
                                            background: 'rgba(128,128,128,0.10)',
                                            border: '1px solid rgba(128,128,128,0.14)',
                                            cursor: 'pointer',
                                            color: 'var(--c-text-secondary)',
                                            fontSize: 14,
                                            fontWeight: 800,
                                            lineHeight: 1,
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                      {/* Preset chips */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: 4,
                                          justifyContent: 'flex-end',
                                        }}
                                      >
                                        {presets.map((p) => {
                                          const active = isPresetActive(p.bars);
                                          const tooBig =
                                            typeof p.bars === 'number' && p.bars > barCount;
                                          return (
                                            <button
                                              key={p.id}
                                              disabled={tooBig}
                                              onClick={() => applyPreset(p.bars)}
                                              style={{
                                                height: 24,
                                                padding: '0 10px',
                                                borderRadius: 7,
                                                background: active
                                                  ? `${accent.from}26`
                                                  : 'rgba(128,128,128,0.10)',
                                                border: active
                                                  ? `1px solid ${accent.from}66`
                                                  : '1px solid rgba(128,128,128,0.14)',
                                                color: active
                                                  ? accent.from
                                                  : 'var(--c-text-secondary)',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                fontFamily: 'var(--font-headline)',
                                                letterSpacing: '0.03em',
                                                cursor: tooBig ? 'not-allowed' : 'pointer',
                                                opacity: tooBig ? 0.35 : 1,
                                                transition: 'all 140ms',
                                              }}
                                            >
                                              {p.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              <button
                                onClick={() => {
                                  setShowLoopPanel((s) => !s);
                                  setShowClearConfirm(false);
                                  setShowBpmPanel(false);
                                }}
                                title="Smart loop"
                                aria-label="Smart loop"
                                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 focus:outline-none cursor-pointer"
                                style={{
                                  background: loopActive
                                    ? `${accent.from}22`
                                    : showLoopPanel
                                      ? `${accent.from}15`
                                      : isAmoled
                                        ? 'rgba(255,255,255,0.06)'
                                        : isLight
                                          ? 'rgba(0,0,0,0.05)'
                                          : 'rgba(255,255,255,0.08)',
                                  color: loopActive ? accent.from : isLight ? '#334155' : '#cbd5e1',
                                  border: loopActive
                                    ? `1.5px solid ${accent.from}88`
                                    : isLight
                                      ? '1px solid rgba(0,0,0,0.06)'
                                      : '1px solid rgba(255,255,255,0.08)',
                                }}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  repeat
                                </span>
                              </button>
                            </div>

                            {/* 3. Metronome / Tempo action */}
                            <div
                              style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                              }}
                            >
                              {showBpmPanel &&
                                (() => {
                                  const swing = pattern.swing ?? 0;
                                  const presetLabels: Record<
                                    (typeof SWING_PRESETS)[number]['id'],
                                    string
                                  > = {
                                    tight: 'Tight',
                                    groove: 'Groove',
                                    funky: 'Funky',
                                  };
                                  return (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 14px)',
                                        left: '50%',
                                        transform: 'translateX(-65%)',
                                        background: isAmoled
                                          ? 'rgba(0,0,0,0.97)'
                                          : isLight
                                            ? 'rgba(255,255,255,0.96)'
                                            : 'rgba(18,18,22,0.96)',
                                        border: isLight
                                          ? '1px solid rgba(0,0,0,0.10)'
                                          : '1px solid rgba(255,255,255,0.10)',
                                        borderRadius: 14,
                                        padding: '10px 12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: isLight
                                          ? '0 8px 32px rgba(0,0,0,0.12)'
                                          : '0 8px 32px rgba(0,0,0,0.50)',
                                        whiteSpace: 'nowrap',
                                        animation:
                                          'drumHamburgerIn 160ms cubic-bezier(0.22,1,0.36,1)',
                                        zIndex: 80,
                                      }}
                                    >
                                      {/* BPM row */}
                                      <div
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                      >
                                        {([-10, -1, +1, +10] as const).map((d) => (
                                          <button
                                            key={d}
                                            onClick={() => adjustBpm(d)}
                                            style={{
                                              width: 34,
                                              height: 34,
                                              borderRadius: 9,
                                              background: 'rgba(128,128,128,0.10)',
                                              border: '1px solid rgba(128,128,128,0.14)',
                                              cursor: 'pointer',
                                              color: 'var(--c-text-secondary)',
                                              fontSize: 11,
                                              fontWeight: 700,
                                            }}
                                          >
                                            {d > 0 ? `+${d}` : d}
                                          </button>
                                        ))}
                                        <div
                                          style={{
                                            width: 1,
                                            height: 24,
                                            background: 'rgba(128,128,128,0.2)',
                                            margin: '0 2px',
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: accent.from,
                                            fontSize: 16,
                                            fontWeight: 800,
                                            minWidth: 36,
                                            textAlign: 'center',
                                          }}
                                        >
                                          {pattern.bpm}
                                        </span>
                                      </div>
                                      {/* Swing row */}
                                      <div
                                        style={{
                                          height: 1,
                                          background: 'rgba(128,128,128,0.18)',
                                          margin: '2px -4px',
                                        }}
                                      />
                                      <div
                                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            color: 'var(--c-text-secondary)',
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            minWidth: 38,
                                          }}
                                        >
                                          Swing
                                        </span>
                                        <input
                                          type="range"
                                          min={SWING_MIN}
                                          max={SWING_MAX}
                                          step={1}
                                          value={swing}
                                          onPointerDown={() => pushUndo()}
                                          onChange={(e) =>
                                            updatePattern(pattern.id, {
                                              swing: clampSwing(Number(e.target.value)),
                                            })
                                          }
                                          aria-label="Swing"
                                          style={{
                                            width: 132,
                                            height: 22,
                                            accentColor: accent.from,
                                            cursor: 'pointer',
                                            verticalAlign: 'middle',
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: swing > 0 ? accent.from : 'var(--c-text-muted)',
                                            fontSize: 13,
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-headline)',
                                            minWidth: 34,
                                            textAlign: 'right',
                                          }}
                                        >
                                          {swing}%
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: 4,
                                          justifyContent: 'flex-end',
                                        }}
                                      >
                                        {SWING_PRESETS.map((p) => {
                                          const active = swing === p.value;
                                          return (
                                            <button
                                              key={p.id}
                                              onClick={() => {
                                                pushUndo();
                                                updatePattern(pattern.id, { swing: p.value });
                                              }}
                                              style={{
                                                height: 24,
                                                padding: '0 10px',
                                                borderRadius: 7,
                                                background: active
                                                  ? `${accent.from}26`
                                                  : 'rgba(128,128,128,0.10)',
                                                border: active
                                                  ? `1px solid ${accent.from}66`
                                                  : '1px solid rgba(128,128,128,0.14)',
                                                color: active
                                                  ? accent.from
                                                  : 'var(--c-text-secondary)',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                fontFamily: 'var(--font-headline)',
                                                letterSpacing: '0.03em',
                                                cursor: 'pointer',
                                                transition: 'all 140ms',
                                              }}
                                            >
                                              {presetLabels[p.id]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              <button
                                onClick={() => {
                                  setShowBpmPanel((s) => !s);
                                  setShowClearConfirm(false);
                                  setShowLoopPanel(false);
                                }}
                                title="BPM & Swing"
                                aria-label="Metronome and Tempo"
                                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 focus:outline-none cursor-pointer"
                                style={{
                                  background: showBpmPanel
                                    ? `${accent.from}22`
                                    : isAmoled
                                      ? 'rgba(255,255,255,0.06)'
                                      : isLight
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'rgba(255,255,255,0.08)',
                                  color: showBpmPanel
                                    ? accent.from
                                    : isLight
                                      ? '#334155'
                                      : '#cbd5e1',
                                  border: showBpmPanel
                                    ? `1.5px solid ${accent.from}88`
                                    : isLight
                                      ? '1px solid rgba(0,0,0,0.06)'
                                      : '1px solid rgba(255,255,255,0.08)',
                                }}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">timer</span>
                              </button>
                            </div>

                            {/* Separator */}
                            <div
                              className="w-[1px] h-5 mx-0.5"
                              style={{
                                backgroundColor: isLight
                                  ? 'rgba(0,0,0,0.10)'
                                  : 'rgba(255,255,255,0.12)',
                              }}
                            />

                            {/* 4. Primary Play FAB */}
                            <button
                              onClick={() => {
                                setShowClearConfirm(false);
                                setShowLoopPanel(false);
                                setShowBpmPanel(false);
                                handlePlay();
                              }}
                              title={playing ? 'Pause' : 'Play'}
                              aria-label={playing ? 'Pause drum pattern' : 'Play drum pattern'}
                              className="w-11 h-11 rounded-full flex items-center justify-center text-white transition active:scale-95 focus:outline-none cursor-pointer"
                              style={{
                                background: '#007aff',
                                boxShadow: '0 4px 16px rgba(0,122,255,0.45)',
                              }}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[24px]">
                                {playing ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          </aside>
                        </div>

                        {isWebDesktop && (
                          <button
                            onClick={() => setIsRightPanelCollapsed((v) => !v)}
                            title={isRightPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-label={
                              isRightPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                            }
                            style={{
                              position: 'absolute',
                              top: '50%',
                              right: isRightPanelCollapsed ? 0 : 320,
                              transform: 'translateY(-50%)',
                              zIndex: 99,
                              width: 18,
                              height: 64,
                              background: isLight
                                ? 'rgba(240, 240, 242, 0.95)'
                                : 'rgba(20, 20, 24, 0.95)',
                              border: isLight
                                ? '1px solid rgba(0, 0, 0, 0.15)'
                                : '1px solid rgba(255, 255, 255, 0.15)',
                              borderRight: 'none',
                              borderRadius: '8px 0 0 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--c-text-secondary)',
                              transition:
                                'right 250ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 200ms, color 200ms',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              boxShadow: isLight
                                ? '-2px 0 8px rgba(0,0,0,0.06)'
                                : '-2px 0 8px rgba(0,0,0,0.3)',
                            }}
                            onPointerOver={(e) => (e.currentTarget.style.color = accent.from)}
                            onPointerOut={(e) =>
                              (e.currentTarget.style.color = 'var(--c-text-secondary)')
                            }
                          >
                            {isRightPanelCollapsed ? (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            ) : (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Right Side Panel (Desktop only) */}
                        {isWebDesktop && (
                          <div
                            style={{
                              width: isRightPanelCollapsed ? 0 : 320,
                              flexShrink: 0,
                              borderLeft: isRightPanelCollapsed
                                ? 'none'
                                : isLight
                                  ? '1px solid #e4e4e7'
                                  : '1px solid #18181b',
                              background: isLight ? '#f9f9fb' : '#000000',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              transition: 'width 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            }}
                          >
                            {/* Tab Switcher */}
                            <div
                              style={{
                                display: 'flex',
                                borderBottom: isLight ? '1px solid #e4e4e7' : '1px solid #18181b',
                                padding: '12px 16px',
                                gap: 8,
                                flexShrink: 0,
                              }}
                            >
                              {(['kit', 'mixer', 'fx'] as const).map((tab) => {
                                const active = sideTab === tab;
                                return (
                                  <button
                                    key={tab}
                                    onClick={() => setSideTab(tab)}
                                    className="btn-smooth"
                                    title={`Switch to ${tab} panel`}
                                    aria-label={`Switch to ${tab} panel`}
                                    style={{
                                      flex: 1,
                                      padding: '6px 0',
                                      borderRadius: '8px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      fontFamily: 'var(--font-headline)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      cursor: 'pointer',
                                      background: active
                                        ? isLight
                                          ? '#f4f4f5'
                                          : '#18181b'
                                        : 'transparent',
                                      border: active
                                        ? isLight
                                          ? '1px solid #e4e4e7'
                                          : '1px solid #27272a'
                                        : '1px solid transparent',
                                      color: active
                                        ? isLight
                                          ? '#09090b'
                                          : '#ffffff'
                                        : isLight
                                          ? '#71717a'
                                          : '#a1a1aa',
                                      transition: 'all 160ms',
                                    }}
                                  >
                                    {tab}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Tab Contents */}
                            <div
                              style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '16px 20px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16,
                              }}
                              className="no-scrollbar"
                            >
                              {/* KIT TAB */}
                              {sideTab === 'kit' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div
                                    style={{
                                      padding: '16px',
                                      background: isLight
                                        ? 'rgba(0, 0, 0, 0.03)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                      border: isLight
                                        ? '1px solid rgba(0, 0, 0, 0.08)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 12,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 9.5,
                                        fontWeight: 800,
                                        color: 'var(--c-text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      Active Drum Kit
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: 'var(--c-text-primary)',
                                      }}
                                    >
                                      Acoustic — House Kit
                                    </span>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 11,
                                        color: 'var(--c-text-muted)',
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      Premium multi-velocity studio kit featuring 5 velocity layers
                                      and 7 round-robin variations per instrument for natural
                                      acoustic expression.
                                    </p>
                                  </div>

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'mic-position',
                                      'Mic Position',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        {HOUSE_MICS.map((m) => {
                                          const active = houseKitMic === m.id;
                                          return (
                                            <button
                                              key={m.id}
                                              className="btn-smooth"
                                              onClick={() => {
                                                storeSetHouseKitMic(m.id);
                                                setHouseKitMic(m.id);
                                              }}
                                              style={{
                                                flex: 1,
                                                height: 28,
                                                borderRadius: 8,
                                                border: active
                                                  ? `1.5px solid ${accent.from}66`
                                                  : '1.5px solid rgba(255,255,255,0.1)',
                                                background: active
                                                  ? `${accent.from}1a`
                                                  : 'rgba(255,255,255,0.03)',
                                                color: active
                                                  ? accent.from
                                                  : 'var(--c-text-secondary)',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              {m.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'sound-character',
                                      'Sound Character',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                      >
                                        {(
                                          [
                                            'kick',
                                            'snare',
                                            'tom10',
                                            'tom12',
                                            'tom14',
                                          ] as HouseInstName[]
                                        ).map((hInst) => {
                                          const locked = houseInstVelOverride[hInst];
                                          return (
                                            <div
                                              key={hInst}
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{ display: 'flex', alignItems: 'center' }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: 'var(--c-text-primary)',
                                                    flex: 1,
                                                  }}
                                                >
                                                  {HOUSE_INST_LABELS[hInst]}
                                                </span>
                                                {locked && (
                                                  <button
                                                    onClick={() =>
                                                      storeSetInstVelOverride(hInst, undefined)
                                                    }
                                                    style={{
                                                      fontSize: 9.5,
                                                      fontWeight: 700,
                                                      color: 'var(--c-text-muted)',
                                                      background: 'none',
                                                      border: 'none',
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    AUTO
                                                  </button>
                                                )}
                                              </div>
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  gap: 4,
                                                  flexWrap: 'wrap',
                                                }}
                                              >
                                                {HOUSE_VEL_CONFIGS[hInst].map((v) => {
                                                  const active = locked === v.id;
                                                  return (
                                                    <button
                                                      key={v.id}
                                                      className="btn-smooth"
                                                      onClick={() =>
                                                        storeSetInstVelOverride(
                                                          hInst,
                                                          active ? undefined : v.id
                                                        )
                                                      }
                                                      style={{
                                                        height: 24,
                                                        padding: '0 8px',
                                                        borderRadius: 6,
                                                        border: active
                                                          ? `1.5px solid ${accent.from}66`
                                                          : '1.5px solid rgba(255,255,255,0.1)',
                                                        background: active
                                                          ? `${accent.from}1a`
                                                          : 'rgba(255,255,255,0.03)',
                                                        color: active
                                                          ? accent.from
                                                          : 'var(--c-text-secondary)',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                      }}
                                                    >
                                                      {v.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'advanced-kit-options',
                                      'Advanced Kit Options',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 12,
                                        }}
                                      >
                                        <div>
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              fontWeight: 600,
                                              color: 'var(--c-text-secondary)',
                                              display: 'block',
                                              marginBottom: 4,
                                            }}
                                          >
                                            Crash Cymbal Model
                                          </span>
                                          <div
                                            style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
                                          >
                                            {HOUSE_CRASH_MODELS.map((m) => {
                                              const active = houseCrashModel === m.id;
                                              return (
                                                <button
                                                  key={m.id}
                                                  className="btn-smooth"
                                                  onClick={() =>
                                                    storeSetHouseCrashModel(m.id as HouseCrashModel)
                                                  }
                                                  title={m.desc}
                                                  style={{
                                                    height: 24,
                                                    padding: '0 8px',
                                                    borderRadius: 6,
                                                    border: active
                                                      ? `1.5px solid ${accent.from}66`
                                                      : '1.5px solid rgba(255,255,255,0.1)',
                                                    background: active
                                                      ? `${accent.from}1a`
                                                      : 'rgba(255,255,255,0.03)',
                                                    color: active
                                                      ? accent.from
                                                      : 'var(--c-text-secondary)',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                  }}
                                                >
                                                  {m.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div>
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              fontWeight: 600,
                                              color: 'var(--c-text-secondary)',
                                              display: 'block',
                                              marginBottom: 4,
                                            }}
                                          >
                                            Cymbal Pack
                                          </span>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: 'var(--c-text-primary)',
                                              padding: '2px 0',
                                            }}
                                          >
                                            Sabian Pack (Hi-hat, crash, ride — bright, versatile)
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginTop: 4,
                                          }}
                                        >
                                          <span
                                            style={{
                                              flex: 1,
                                              fontSize: 12,
                                              fontWeight: 600,
                                              color: 'var(--c-text-primary)',
                                            }}
                                          >
                                            Random Variations
                                          </span>
                                          <button
                                            onClick={() =>
                                              updateDrumPrefs({
                                                randomVariations: !drumPrefs.randomVariations,
                                              })
                                            }
                                            style={{
                                              width: 36,
                                              height: 20,
                                              borderRadius: 10,
                                              background: drumPrefs.randomVariations
                                                ? `linear-gradient(135deg,${accent.from},${accent.to})`
                                                : 'rgba(255,255,255,0.15)',
                                              border: 'none',
                                              cursor: 'pointer',
                                              position: 'relative',
                                              transition: 'background 220ms',
                                              flexShrink: 0,
                                            }}
                                          >
                                            <span
                                              style={{
                                                position: 'absolute',
                                                top: 2.5,
                                                left: drumPrefs.randomVariations ? 18 : 2.5,
                                                width: 15,
                                                height: 15,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                transition:
                                                  'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                                                display: 'block',
                                              }}
                                            />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* MIXER TAB */}
                              {sideTab === 'mixer' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {renderCollapsibleSection(
                                    'master',
                                    'Master',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: 12,
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span
                                          style={{ fontSize: 11, fontWeight: 700, color: 'white' }}
                                        >
                                          Master Volume
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            color: 'var(--c-text-muted)',
                                            fontWeight: 700,
                                          }}
                                        >
                                          {(masterVolume * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <ElasticSlider
                                        min={0}
                                        max={1}
                                        step={0.005}
                                        value={masterVolume}
                                        onChange={setMasterVolume}
                                        accentColor={accent.from}
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'levels',
                                    'Levels',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      {activeInstruments.map((inst) => {
                                        const vol = volumeMap[inst] ?? 1;
                                        const muted = patternMuted.has(inst);
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={inst}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              padding: '4px 0',
                                              opacity: muted ? 0.5 : 1,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <ElasticSlider
                                              min={0}
                                              max={1}
                                              step={0.01}
                                              value={vol}
                                              onChange={(v) => setVolumeForInstrument(inst, v)}
                                              accentColor={color}
                                              style={{ width: 80 }}
                                            />
                                            <button
                                              onClick={() => togglePatternMute(pattern.id, inst)}
                                              style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 6,
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: muted
                                                  ? 'rgba(255,255,255,0.05)'
                                                  : `${color}18`,
                                                color: muted ? 'var(--c-text-muted)' : color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: 14 }}
                                              >
                                                {muted ? 'volume_off' : 'volume_up'}
                                              </span>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'pan',
                                    'Pan',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 9.5,
                                          color: 'var(--c-text-muted)',
                                          fontStyle: 'italic',
                                          marginBottom: 4,
                                          display: 'block',
                                        }}
                                      >
                                        Note: Stereo panning is simulated (Future Update)
                                      </span>
                                      {activeInstruments.map((inst) => {
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={`pan-${inst}`}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              opacity: 0.5,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                L
                                              </span>
                                              <input
                                                type="range"
                                                min="-50"
                                                max="50"
                                                defaultValue="0"
                                                disabled
                                                style={{
                                                  width: 75,
                                                  accentColor: color,
                                                  cursor: 'not-allowed',
                                                }}
                                              />
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                R
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'room-send',
                                    'Room / Send',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      {activeInstruments.map((inst) => {
                                        const curFX = {
                                          ...DEFAULT_INST_FX,
                                          ...(instFX[inst] ?? {}),
                                        };
                                        const rev = curFX.reverb ?? 0;
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={`rev-${inst}`}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <ElasticSlider
                                              min={0}
                                              max={1}
                                              step={0.01}
                                              value={rev}
                                              onChange={(v) =>
                                                setInstFX(inst, { ...curFX, reverb: v })
                                              }
                                              accentColor={color}
                                              style={{ width: 80 }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: 'var(--c-text-muted)',
                                                width: 26,
                                                textAlign: 'right',
                                              }}
                                            >
                                              {Math.round(rev * 100)}%
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <button
                                    onClick={() => {
                                      setMasterVolume(1.0);
                                      activeInstruments.forEach((inst) => {
                                        setVolumeForInstrument(inst, 1.0);
                                        if (patternMuted.has(inst)) {
                                          togglePatternMute(pattern.id, inst);
                                        }
                                      });
                                    }}
                                    className="btn-smooth bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 w-full mt-2"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: '15px' }}
                                    >
                                      restart_alt
                                    </span>
                                    Reset Mix
                                  </button>
                                </div>
                              )}

                              {/* FX TAB */}
                              {sideTab === 'fx' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {renderCollapsibleSection(
                                    'global-fx',
                                    'Global FX',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      <div>
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: 'var(--c-text-primary)',
                                            }}
                                          >
                                            Swing
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: accent.from,
                                            }}
                                          >
                                            {pattern.swing ?? 0}%
                                          </span>
                                        </div>
                                        <ElasticSlider
                                          min={0}
                                          max={100}
                                          step={1}
                                          value={pattern.swing ?? 0}
                                          onChange={(v) => updatePattern(pattern.id, { swing: v })}
                                          accentColor={accent.from}
                                          style={{ width: '100%' }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'per-instrument-fx',
                                    'Per-Instrument FX',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                    >
                                      <div>
                                        <label style={labelSt}>Instrument</label>
                                        <select
                                          value={fxInst}
                                          onChange={(e) =>
                                            setFxInst(e.target.value as DrumInstrument)
                                          }
                                          style={{
                                            ...inputSt,
                                            padding: '6px 10px',
                                            fontSize: 13,
                                            background: 'var(--app-surface-high)',
                                          }}
                                        >
                                          {activeInstruments.map((inst) => (
                                            <option key={inst} value={inst}>
                                              {INST_LABEL[inst]}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {INST_PRESETS[fxInst] && INST_PRESETS[fxInst]!.length > 0 && (
                                        <div>
                                          <span style={labelSt}>Character</span>
                                          <div
                                            style={{
                                              display: 'flex',
                                              gap: 6,
                                              flexWrap: 'wrap',
                                              marginTop: 4,
                                            }}
                                          >
                                            {INST_PRESETS[fxInst]!.map((preset) => {
                                              const curFX = {
                                                ...DEFAULT_INST_FX,
                                                ...(instFX[fxInst] ?? {}),
                                              };
                                              const active = Object.keys(preset.values).every(
                                                (k) =>
                                                  Math.abs(
                                                    (curFX[k as keyof InstFX] ?? 0) -
                                                      (preset.values[k as keyof InstFX] ?? 0)
                                                  ) < 0.05
                                              );
                                              const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                              return (
                                                <button
                                                  key={preset.label}
                                                  onClick={() =>
                                                    setInstFX(fxInst, {
                                                      ...DEFAULT_INST_FX,
                                                      ...preset.values,
                                                    })
                                                  }
                                                  title={`Apply "${preset.label}" FX character to ${INST_LABEL[fxInst] || fxInst}`}
                                                  className="btn-smooth"
                                                  style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 12,
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: active
                                                      ? color
                                                      : 'rgba(255,255,255,0.03)',
                                                    border: active
                                                      ? `1.5px solid ${color}`
                                                      : '1.5px solid rgba(255,255,255,0.08)',
                                                    color: active
                                                      ? '#fff'
                                                      : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  {preset.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 10,
                                        }}
                                      >
                                        {(() => {
                                          const curFX = {
                                            ...DEFAULT_INST_FX,
                                            ...(instFX[fxInst] ?? {}),
                                          };
                                          const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                          type SliderDef = {
                                            key: keyof InstFX;
                                            label: string;
                                            min: number;
                                            max: number;
                                            step: number;
                                          };
                                          const sliders: SliderDef[] = [
                                            {
                                              key: 'compress',
                                              label: 'Compress',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'attack',
                                              label: 'Attack',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'gate',
                                              label: 'Gate',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'eqLow',
                                              label: 'Low 80Hz',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqLowMid',
                                              label: 'Lo-Mid 350',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqMid',
                                              label: 'Mid 2kHz',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqHigh',
                                              label: 'High 10k',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                          ];
                                          return sliders.map((s) => {
                                            const val = curFX[s.key] ?? 0;
                                            const isEQ = s.key.startsWith('eq');
                                            const dispVal = isEQ
                                              ? (val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) +
                                                'dB'
                                              : `${Math.round(val * 100)}%`;
                                            const active = val !== 0;
                                            return (
                                              <div
                                                key={s.key}
                                                style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: 4,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      color: active
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                    }}
                                                  >
                                                    {s.label}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      color: active ? color : 'var(--c-text-muted)',
                                                    }}
                                                  >
                                                    {dispVal}
                                                  </span>
                                                </div>
                                                <ElasticSlider
                                                  min={s.min}
                                                  max={s.max}
                                                  step={s.step}
                                                  value={val}
                                                  onChange={(v) =>
                                                    setInstFX(fxInst, { ...curFX, [s.key]: v })
                                                  }
                                                  accentColor={color}
                                                  style={{ width: '100%' }}
                                                />
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'reverb-room',
                                    'Reverb / Room',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div>
                                      {(() => {
                                        const curFX = {
                                          ...DEFAULT_INST_FX,
                                          ...(instFX[fxInst] ?? {}),
                                        };
                                        const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                        const reverbVal = curFX.reverb ?? 0;
                                        const saturateVal = curFX.saturate ?? 0;
                                        return (
                                          <div
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 10,
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      reverbVal > 0
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  Reverb Send
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      reverbVal > 0 ? color : 'var(--c-text-muted)',
                                                  }}
                                                >
                                                  {Math.round(reverbVal * 100)}%
                                                </span>
                                              </div>
                                              <ElasticSlider
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={reverbVal}
                                                onChange={(v) =>
                                                  setInstFX(fxInst, { ...curFX, reverb: v })
                                                }
                                                accentColor={color}
                                                style={{ width: '100%' }}
                                              />
                                            </div>
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      saturateVal > 0
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  Saturation
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      saturateVal > 0
                                                        ? color
                                                        : 'var(--c-text-muted)',
                                                  }}
                                                >
                                                  {Math.round(saturateVal * 100)}%
                                                </span>
                                              </div>
                                              <ElasticSlider
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={saturateVal}
                                                onChange={(v) =>
                                                  setInstFX(fxInst, { ...curFX, saturate: v })
                                                }
                                                accentColor={color}
                                                style={{ width: '100%' }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'humanize-groove-feel',
                                    'Humanize / Groove Feel',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span
                                          style={{
                                            flex: 1,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: 'var(--c-text-primary)',
                                          }}
                                        >
                                          Humanize Velocity
                                        </span>
                                        <button
                                          onClick={() =>
                                            updateDrumPrefs({
                                              humanizeVelocity: !drumPrefs.humanizeVelocity,
                                            })
                                          }
                                          style={{
                                            width: 36,
                                            height: 20,
                                            borderRadius: 10,
                                            background: drumPrefs.humanizeVelocity
                                              ? `linear-gradient(135deg,${accent.from},${accent.to})`
                                              : 'rgba(255,255,255,0.15)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background 220ms',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <span
                                            style={{
                                              position: 'absolute',
                                              top: 2.5,
                                              left: drumPrefs.humanizeVelocity ? 18 : 2.5,
                                              width: 15,
                                              height: 15,
                                              borderRadius: '50%',
                                              background: '#fff',
                                              transition:
                                                'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                                              display: 'block',
                                            }}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => setInstFX(fxInst, { ...DEFAULT_INST_FX })}
                                    className="btn-smooth bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 w-full mt-2"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: '15px' }}
                                    >
                                      restart_alt
                                    </span>
                                    Reset {INST_LABEL[fxInst]} FX
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  case 'patterns':
                    return (
                      <DrumPatternsPanel
                        onPreviewPattern={handleLibPreview}
                        onUsePattern={handleLibReplace}
                        onAppendPattern={handleLibInsert}
                        grooves={grooves}
                        onPreviewGroove={handleGroovePreview}
                        onUseGroove={(id) => {
                          loadGrooveReplace(id);
                          NavigationDispatcher.push({
                            app: 'drumex',
                            page: 'songs',
                            subView: 'editor',
                            id: activeDrumSongId || undefined,
                          });
                        }}
                        onAppendGroove={(id) => {
                          loadGrooveAppend(id);
                          NavigationDispatcher.push({
                            app: 'drumex',
                            page: 'songs',
                            subView: 'editor',
                            id: activeDrumSongId || undefined,
                          });
                        }}
                        onSaveCurrentPattern={() => {
                          setSavGrName(pattern.name);
                          setSavGrTag('');
                          setShowSaveGroove(true);
                        }}
                        onDeleteGroove={(id) => {
                          deleteGroove(id);
                          if (previewingGrooveId === id) {
                            drumScheduler.stop();
                            setPreviewingGrooveId(null);
                            setRandomVariations(useDrumStore.getState().drumPrefs.randomVariations);
                          }
                        }}
                        onRenameGroove={(id, name, tag) => {
                          renameGroove(id, name, tag);
                        }}
                        previewingId={previewingGrooveId}
                        activePatternName={pattern.name}
                        accent={accent}
                        isLight={isLight}
                        isAmoled={isAmoled}
                        isWebDesktop={isWebDesktop}
                        onScroll={drumScrollHide}
                      />
                    );
                  case 'prefs':
                    return <DrumPrefsPanel />;
                  default:
                    return null;
                }
              }}
            </SharedNavigationContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────── */}
      <DrumNav
        activeTab={activeTab}
        setTab={handleSetTab}
        accent={accent}
        isLight={isLight}
        isAmoled={isAmoled}
        hidden={isWebDesktop || inEditor || activeTab === 'metronome'}
      />

      {/* ── Save Groove sheet ────────────────────────────────────────────── */}
      {showSaveGroove && (
        <Dialog open={true} onClose={() => setShowSaveGroove(false)} title="Save to Groove Library">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--c-text-secondary)',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                NAME
              </label>
              <Input
                autoFocus
                value={savGrName}
                onChange={(e) => setSavGrName(e.target.value)}
                placeholder="Groove name…"
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--c-text-secondary)',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                TAG
              </label>
              <div
                className="no-scrollbar"
                style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: '4px' }}
              >
                {(['', ...GROOVE_TAGS] as (GrooveTag | '')[]).map((tag) => {
                  const label = tag === '' ? 'None' : tag;
                  const active = savGrTag === tag;
                  return (
                    <button
                      key={label}
                      onClick={() => setSavGrTag(tag as GrooveTag)}
                      className="btn-smooth"
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-headline)',
                        cursor: 'pointer',
                        border: active
                          ? '1.5px solid var(--c-accent-from)'
                          : '1.5px solid var(--c-border)',
                        background: active ? 'var(--c-accent-from)18' : 'transparent',
                        color: active ? 'var(--c-accent-from)' : 'var(--c-text-secondary)',
                        transition: 'all 140ms',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              variant="primary"
              disabled={!savGrName.trim()}
              onClick={() => {
                if (!savGrName.trim()) return;
                saveGroove(savGrName.trim(), savGrTag);
                setShowSaveGroove(false);
              }}
              style={{ width: '100%' }}
            >
              Save Groove
            </Button>
          </div>
        </Dialog>
      )}

      {/* ── Quick Mixer sheet (EQ button in editor toolbar) ──────────────── */}
      {showMixerSheet && inEditor && (
        <Dialog open={true} onClose={() => setShowMixerSheet(false)} title="Pattern Mixer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Master Volume row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--c-border)',
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accent.from,
                  flexShrink: 0,
                }}
              />
              <span
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-primary)', flex: 1 }}
              >
                Master
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--c-text-secondary)',
                  fontWeight: 700,
                  minWidth: 36,
                  textAlign: 'right',
                }}
              >
                {(masterVolume * 100).toFixed(1)}%
              </span>
              <ElasticSlider
                min={0}
                max={1}
                step={0.005}
                value={masterVolume}
                onChange={setMasterVolume}
                accentColor={accent.from}
                style={{ width: 110, flexShrink: 0 }}
              />
              <div style={{ width: 32, flexShrink: 0 }} />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '350px',
                overflowY: 'auto',
              }}
              className="no-scrollbar"
            >
              {ALL_INSTS.map((inst, i) => {
                const vol = volumeMap[inst] ?? 1;
                const hidden = patternMuted.has(inst);
                const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                return (
                  <div
                    key={inst}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 0',
                      borderTop: i > 0 ? '1px solid var(--c-border)' : 'none',
                      opacity: hidden ? 0.5 : 1,
                      transition: 'opacity 150ms',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: hidden ? 'var(--c-text-secondary)' : 'var(--c-text-primary)',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {INST_LABEL[inst]}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--c-text-secondary)',
                        fontWeight: 700,
                        minWidth: 30,
                        textAlign: 'right',
                      }}
                    >
                      {Math.round(vol * 100)}%
                    </span>
                    <ElasticSlider
                      min={0}
                      max={1}
                      step={0.01}
                      value={vol}
                      onChange={(v) => setVolumeForInstrument(inst, v)}
                      accentColor={color}
                      style={{ width: 90, flexShrink: 0 }}
                    />
                    <button
                      onClick={() => togglePatternMute(pattern.id, inst)}
                      title={hidden ? 'Show row' : 'Hide row'}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: hidden ? 'rgba(128,128,128,0.08)' : `${color}18`,
                        border: hidden ? '1px solid var(--c-border)' : `1px solid ${color}30`,
                        cursor: 'pointer',
                        color: hidden ? 'var(--c-text-secondary)' : color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 180ms',
                        padding: 0,
                      }}
                    >
                      {hidden ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Per-instrument FX sheet ──────────────────────────────────────── */}
      {showFXSheet &&
        inEditor &&
        (() => {
          const curFX: InstFX = { ...DEFAULT_INST_FX, ...(instFX[fxInst] ?? {}) };
          const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
          type SliderDef = {
            key: keyof InstFX;
            label: string;
            min: number;
            max: number;
            step: number;
            hint?: string;
          };
          const fxSliders: SliderDef[] = [
            // ── Dynamics ────────────────────────────────────────────────────────
            {
              key: 'compress',
              label: 'Compress',
              min: 0,
              max: 1,
              step: 0.01,
              hint: 'Squash dynamics',
            },
            {
              key: 'attack',
              label: 'Attack',
              min: 0,
              max: 1,
              step: 0.01,
              hint: '0=punchy, 1=slow build',
            },
            {
              key: 'gate',
              label: 'Gate',
              min: 0,
              max: 1,
              step: 0.01,
              hint: 'Chop the tail (tighter sound)',
            },
            // ── EQ (4-band) ─────────────────────────────────────────────────────
            { key: 'eqLow', label: 'Low 80 Hz', min: -12, max: 12, step: 0.5, hint: 'Boom / thin' },
            {
              key: 'eqLowMid',
              label: 'Lo-Mid 350',
              min: -12,
              max: 12,
              step: 0.5,
              hint: 'Body / mud',
            },
            { key: 'eqMid', label: 'Mid 2 kHz', min: -12, max: 12, step: 0.5, hint: 'Snap / honk' },
            { key: 'eqHigh', label: 'High 10k', min: -12, max: 12, step: 0.5, hint: 'Air / sheen' },
            // ── Space & character ────────────────────────────────────────────────
            { key: 'reverb', label: 'Reverb', min: 0, max: 1, step: 0.01, hint: 'Room / ambience' },
            {
              key: 'saturate',
              label: 'Saturate',
              min: 0,
              max: 1,
              step: 0.01,
              hint: 'Tape warmth / drive',
            },
          ];
          const presets = INST_PRESETS[fxInst] ?? [];
          return (
            <Dialog open={true} onClose={() => setShowFXSheet(false)} title="Instrument FX">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--c-text-secondary)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Select Instrument
                  </span>
                  <button
                    onClick={() => setInstFX(fxInst, { ...DEFAULT_INST_FX })}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--c-text-secondary)',
                      background: 'rgba(128,128,128,0.10)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-headline)',
                    }}
                  >
                    Reset
                  </button>
                </div>
                {/* instrument chips */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: '0 20px 12px',
                    overflowX: 'auto',
                    flexShrink: 0,
                  }}
                >
                  {activeInstruments.map((inst) => {
                    const isAct = inst === fxInst;
                    const c = INSTRUMENT_COLOR[inst] ?? accent.from;
                    const hasFX = instFX[inst] && Object.values(instFX[inst]!).some((v) => v !== 0);
                    return (
                      <button
                        key={inst}
                        onClick={() => setFxInst(inst)}
                        style={{
                          flexShrink: 0,
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--font-headline)',
                          cursor: 'pointer',
                          background: isAct ? `${c}22` : 'var(--app-surface-high)',
                          border: isAct ? `1.5px solid ${c}55` : '1.5px solid transparent',
                          color: isAct ? c : 'var(--c-text-secondary)',
                          position: 'relative',
                          transition: 'all 130ms',
                        }}
                      >
                        {INSTRUMENT_NAME[inst] ??
                          inst.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
                        {hasFX && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 3,
                              right: 3,
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: c,
                              display: 'block',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* scrollable body */}
                <div
                  style={{
                    overflowY: 'auto',
                    flexShrink: 1,
                    paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)',
                  }}
                >
                  {/* ── Character presets ────────────────────────────────── */}
                  {presets.length > 0 && (
                    <div style={{ padding: '0 20px 14px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--c-text-muted)',
                          fontFamily: 'var(--font-headline)',
                        }}
                      >
                        Character
                      </span>
                      <div style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
                        {presets.map((preset) => {
                          const merged = { ...DEFAULT_INST_FX, ...preset.values };
                          const isActive = Object.keys(preset.values).every(
                            (k) =>
                              Math.abs(
                                (curFX[k as keyof InstFX] ?? 0) -
                                  (preset.values[k as keyof InstFX] ?? 0)
                              ) < 0.05
                          );
                          return (
                            <button
                              key={preset.label}
                              onClick={() => setInstFX(fxInst, merged)}
                              title={`Apply "${preset.label}" FX character to ${INST_LABEL[fxInst] || fxInst}`}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: 'var(--font-headline)',
                                cursor: 'pointer',
                                transition: 'all 140ms',
                                background: isActive ? color : 'var(--app-surface-high)',
                                color: isActive ? '#fff' : 'var(--c-text-secondary)',
                                border: isActive
                                  ? `1.5px solid ${color}`
                                  : '1.5px solid rgba(128,128,128,0.15)',
                              }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* ── FX sliders ──────────────────────────────────────── */}
                  {fxSliders.map(({ key, label, min, max, step, hint }) => {
                    const val = curFX[key] ?? 0;
                    const isEQ =
                      key === 'eqLow' || key === 'eqLowMid' || key === 'eqMid' || key === 'eqHigh';
                    const dispVal = isEQ
                      ? (val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) + ' dB'
                      : `${Math.round(val * 100)}%`;
                    const active = val !== 0;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 20px',
                          borderBottom: '1px solid rgba(128,128,128,0.06)',
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                            opacity: active ? 1 : 0.22,
                            transition: 'opacity 150ms',
                          }}
                        />
                        <div style={{ width: 90, flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: active ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                              fontFamily: 'var(--font-headline)',
                              lineHeight: 1.2,
                            }}
                          >
                            {label}
                          </div>
                          {hint && (
                            <div
                              style={{
                                fontSize: 9,
                                color: 'var(--c-text-muted)',
                                fontFamily: 'var(--font-headline)',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {hint}
                            </div>
                          )}
                        </div>
                        <ElasticSlider
                          min={min}
                          max={max}
                          step={step}
                          value={val}
                          onChange={(v) => setInstFX(fxInst, { ...curFX, [key]: v })}
                          accentColor={color}
                          style={{ flex: 1 }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: active ? color : 'var(--c-text-muted)',
                            minWidth: 58,
                            textAlign: 'right',
                            fontFamily: 'var(--font-headline)',
                            transition: 'color 150ms',
                          }}
                        >
                          {dispVal}
                        </span>
                      </div>
                    );
                  })}

                  {/* ── Plugins section ──────────────────────────────── */}
                  <div style={{ padding: '14px 20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--c-text-muted)',
                          fontFamily: 'var(--font-headline)',
                          flex: 1,
                        }}
                      >
                        Plugins
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '18px 0 14px',
                        color: 'var(--c-text-muted)',
                        fontSize: 11.5,
                        fontFamily: 'var(--font-headline)',
                        fontStyle: 'italic',
                        opacity: 0.7,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0, opacity: 0.7 }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Coming soon
                    </div>
                  </div>
                </div>
              </div>
            </Dialog>
          );
        })()}

      {/* ── Export modal (full-screen) ────────────────────────────────────── */}
      {showExportModal && (
        <DrumExportModal
          patterns={patterns}
          song={activeSong}
          accent={accent}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* ── Import modal ─────────────────────────────────────────────────── */}
      {showImportDrum && (
        <DrumImportModal
          accent={accent}
          onImport={(name, artist, notes, pats, activeId, kitType) => {
            importDrumSong(name, artist, notes, pats, activeId, kitType);
            setShowImportDrum(false);
          }}
          onClose={() => setShowImportDrum(false)}
        />
      )}

      {/* ── Create Beat Surface ─────────────────────────────────────────── */}
      <MorphingActionSurface
        isOpen={showCreateForm}
        onOpenChange={setShowCreateForm}
        placement="center"
        maxWidth={380}
        title="New Beat"
        subtitle="Create a custom drum pattern"
        accentColor={accent.from}
      >
        {({ close }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 14px 14px 14px' }}>
            {/* ── Beat info ── */}
            <div>
              <label style={labelSt}>Beat Title</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Funky Groove"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && createName.trim()) handleCreateBeat();
                }}
              />
            </div>
            <div>
              <label style={labelSt}>Artist</label>
              <Input
                value={createArtist}
                onChange={(e) => setCreateArtist(e.target.value)}
                placeholder="e.g. The Beatmakers"
              />
            </div>

            {/* ── BPM ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSt}>BPM</label>
                <Input
                  type="number"
                  min={40}
                  max={280}
                  value={createBpm}
                  onChange={(e) => setCreateBpm(e.target.value)}
                />
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 42 }}>
                  {([80, 100, 120, 140] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setCreateBpm(String(b))}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        height: 34,
                        borderRadius: 8,
                        background:
                          createBpm === String(b)
                            ? 'var(--c-accent-from)22'
                            : 'var(--c-surface-high)',
                        border: `1px solid ${createBpm === String(b) ? 'var(--c-accent-from)44' : 'var(--c-border)'}`,
                        cursor: 'pointer',
                        color:
                          createBpm === String(b)
                            ? 'var(--c-accent-from)'
                            : 'var(--c-text-secondary)',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Drum Kit Details ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSt}>Drum Kit</label>
                <div
                  style={{
                    ...inputSt,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--c-surface-high)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-text-secondary)',
                    cursor: 'default',
                  }}
                >
                  Acoustic
                </div>
              </div>
              <div>
                <label style={labelSt}>Sound</label>
                <div
                  style={{
                    ...inputSt,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--c-surface-high)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-text-secondary)',
                    cursor: 'default',
                  }}
                >
                  House Kit
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            <div>
              <label style={labelSt}>Notes</label>
              <textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes…"
                style={
                  {
                    ...inputSt,
                    resize: 'none',
                    lineHeight: 1.5,
                    background: 'var(--c-surface-lowest)',
                    border: '1px solid var(--c-border)',
                  } as React.CSSProperties
                }
              />
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Button onClick={() => setShowCreateForm(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!createName.trim()}
                onClick={handleCreateBeat}
                style={{ flex: 2 }}
              >
                Create Beat
              </Button>
            </div>
          </div>
        )}
      </MorphingActionSurface>
    </div>
  );
}
