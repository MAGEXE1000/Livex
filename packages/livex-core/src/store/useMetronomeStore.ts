import { create } from 'zustand';
import {
  metronomeAudioEngine,
  getBeatsPerMeasure,
  type MetronomeTimeSignature,
  type MetronomeSubdivision,
  type MetronomeSoundId,
  type MetronomeTempoRampConfig,
  type MetronomeAccentType,
} from '../lib/audio/metronomeAudio';
import { mediaSessionCoordinator } from '../lib/audio/mediaSessionCoordinator';

export interface MetronomePreset {
  id: string;
  name: string;
  bpm: number;
  timeSignature: MetronomeTimeSignature;
  subdivision: MetronomeSubdivision;
  sound: MetronomeSoundId;
  volume: number;
  countInEnabled: boolean;
  countInBars?: number; // 0, 1, 2, 3
  accentBeat?: number; // 0-indexed measure beat (0 = Beat 1)
  accentPattern?: MetronomeAccentType[]; // Full measure accent pattern
  tempoRamp?: MetronomeTempoRampConfig; // Optional integrated tempo ramp configuration
  isFactory?: boolean; // Immutable factory preset flag
  icon?: string;
  createdAt: number;
}

export const DEFAULT_TEMPO_RAMP: MetronomeTempoRampConfig = {
  enabled: false,
  mode: 'bars',
  startBpm: 100,
  targetBpm: 140,
  stepBpm: 5,
  startDelayBars: 0,
  intervalBars: 8,
  startDelaySec: 0,
  intervalSec: 30,
  durationSec: 120,
  holdFinalBpm: true,
};

export const SOUND_LABELS: Record<MetronomeSoundId, string> = {
  woodblock: 'Acoustic Woodblock',
  click: 'Acoustic Stick Click',
  sidestick: 'Studio Cross-Stick',
  drystick: 'Dry Hickory Stick',
  studioclick: 'Studio Master Click',
  rimclick: 'Vintage Rim Click',
  digital: 'Subtle Electronic Click',
  // Backward compatibility labels for existing user presets
  soft: 'Soft Click',
  tick: 'Studio Tick',
  shaker: 'Studio Shaker',
  claves: 'Latin Claves',
  cowbell: 'Acoustic Woodblock',
  rimshot: 'Studio Cross-Stick',
};

export const FACTORY_PRESETS: MetronomePreset[] = [];

export const DEFAULT_PRESETS: MetronomePreset[] = [];

/**
 * Generates a clean 512x512 transparent Livex logo artwork for Android MediaNotification & MediaSession.
 * Features 100% transparent background with the iconic Livex wave centered in crisp white (#ffffff).
 */
export function generateMetronomeBpmArtwork(_bpm?: number, _signature?: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 100% transparent background
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Canonical Livex Logo path: M 72 256 C 128 60 192 60 256 256 S 384 452 440 256
    if (typeof Path2D !== 'undefined') {
      const p = new Path2D('M 72 256 C 128 60 192 60 256 256 S 384 452 440 256');
      ctx.stroke(p);
    } else {
      ctx.beginPath();
      ctx.moveTo(72, 256);
      ctx.bezierCurveTo(128, 60, 192, 60, 256, 256);
      ctx.bezierCurveTo(320, 452, 384, 452, 440, 256);
      ctx.stroke();
    }
    ctx.restore();

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/**
 * Compares current metronome parameters against a saved preset definition.
 * A preset is considered matching if all defining parameters (BPM, meter, subdivision,
 * sound, accent beat, count-in, and tempo ramp configuration) are identical.
 */
export function checkPresetMatchesConfig(
  preset: MetronomePreset,
  config: {
    bpm: number;
    timeSignature: MetronomeTimeSignature;
    subdivision: MetronomeSubdivision;
    sound: MetronomeSoundId;
    accentBeat: number;
    accentPattern?: MetronomeAccentType[];
    countInEnabled: boolean;
    countInBars?: number;
    tempoRamp: MetronomeTempoRampConfig;
  }
): boolean {
  if (preset.bpm !== config.bpm) return false;
  if (preset.timeSignature !== config.timeSignature) return false;
  if (preset.subdivision !== config.subdivision) return false;
  if (preset.sound !== config.sound) return false;

  if (preset.accentPattern && config.accentPattern) {
    if (preset.accentPattern.length !== config.accentPattern.length) return false;
    for (let i = 0; i < preset.accentPattern.length; i++) {
      if (preset.accentPattern[i] !== config.accentPattern[i]) return false;
    }
  } else if ((preset.accentBeat ?? 0) !== (config.accentBeat ?? 0)) {
    return false;
  }

  if (Boolean(preset.countInEnabled) !== Boolean(config.countInEnabled)) return false;

  const presetRampEnabled = Boolean(preset.tempoRamp?.enabled);
  const configRampEnabled = Boolean(config.tempoRamp?.enabled);
  if (presetRampEnabled !== configRampEnabled) return false;
  if (presetRampEnabled && preset.tempoRamp) {
    if (preset.tempoRamp.startBpm !== config.tempoRamp.startBpm) return false;
    if (preset.tempoRamp.targetBpm !== config.tempoRamp.targetBpm) return false;
    if (preset.tempoRamp.mode !== config.tempoRamp.mode) return false;
  }
  return true;
}

export function findMatchingPresetId(
  presets: MetronomePreset[],
  config: {
    bpm: number;
    timeSignature: MetronomeTimeSignature;
    subdivision: MetronomeSubdivision;
    sound: MetronomeSoundId;
    accentBeat: number;
    accentPattern?: MetronomeAccentType[];
    countInEnabled: boolean;
    countInBars?: number;
    tempoRamp: MetronomeTempoRampConfig;
  },
  preferredId: string | null = null
): string | null {
  if (!presets || presets.length === 0) return null;
  // If preferredId (previously active preset) still matches, keep it
  if (preferredId) {
    const active = presets.find((p) => p.id === preferredId);
    if (active && checkPresetMatchesConfig(active, config)) {
      return preferredId;
    }
  }
  // Otherwise search if any saved preset matches the new configuration
  const match = presets.find((p) => checkPresetMatchesConfig(p, config));
  return match ? match.id : null;
}

const PRESETS_STORAGE_KEY = 'studio-metronome-presets';
const SETTINGS_STORAGE_KEY = 'studio-metronome-settings';

function loadStoredPresets(): MetronomePreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const legacyFactoryIds = [
      'preset-rock-4-4',
      'preset-warm-up',
      'preset-speed-chops',
      'preset-blues-shuffle',
      'preset-odd-meter',
      'preset-ballad',
    ];
    return Array.isArray(parsed)
      ? parsed.filter((p: any) => !p.isFactory && !legacyFactoryIds.includes(p.id))
      : [];
  } catch {
    return [];
  }
}

function saveStoredPresets(presets: MetronomePreset[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {}
}

function loadStoredSettings() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSettings(settings: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export interface MetronomeState {
  // Current settings
  bpm: number;
  timeSignature: MetronomeTimeSignature;
  subdivision: MetronomeSubdivision;
  sound: MetronomeSoundId;
  accentBeat: number; // 0 to N-1 (default 0 for Beat 1)
  accentPattern: MetronomeAccentType[]; // Multi-accent pattern per measure
  volume: number; // 0 - 100
  isMuted: boolean;
  countInEnabled: boolean;
  countInBars: number; // 0 (Off), 1, 2, 3
  countInVoiceEnabled: boolean; // Spoken female voice count-in
  isTempoLocked: boolean; // Protects BPM against accidental touches

  // Incremental Tempo Ramp
  tempoRamp: MetronomeTempoRampConfig;
  effectiveBpm: number;
  rampProgress?: number;

  // Active playhead
  isPlaying: boolean;
  activeBeat: number; // 0 to N-1, or -1
  activeSubdivision: number; // 0 to sub-1
  isAccent: boolean;
  isCountIn: boolean;
  countInNumber?: number; // Beat in bar: 1, 2, 3, 4
  countInBar?: number; // Active bar: 1, 2, 3
  countInTotalBars?: number; // Total count-in bars: 1, 2, 3

  // Presets
  activePresetId: string | null;
  userPresets: MetronomePreset[];
  factoryPresets: MetronomePreset[];
  presets: MetronomePreset[]; // Canonical saved presets (userPresets)

  // Stopwatch / Practice Timer
  stopwatchDurationSec: number; // Configured practice duration (e.g. 300 = 5:00)
  stopwatchRemainingSec: number; // Monotonically tracked remaining seconds
  stopwatchIsRunning: boolean;
  stopwatchIsCompleted: boolean;

  // Legacy practice timer compatibility
  practiceTimerActive: boolean;
  practiceTimerMinutes: number; // 0 = off, 5, 10, 15, 20, 30
  practiceSecondsRemaining: number;

  // Actions
  start: () => void;
  stop: () => void;
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  adjustBpm: (delta: number) => void;
  setTimeSignature: (sig: MetronomeTimeSignature) => void;
  setSubdivision: (sub: MetronomeSubdivision) => void;
  setSound: (sound: MetronomeSoundId) => void;
  setAccentBeat: (beatIndex: number) => void;
  setAccentPattern: (pattern: MetronomeAccentType[]) => void;
  setBeatAccent: (beatIndex: number, type: MetronomeAccentType) => void;
  cycleBeatAccent: (beatIndex: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleCountIn: () => void;
  setCountInBars: (bars: number) => void;
  setCountInVoice: (enabled: boolean) => void;
  toggleTempoLock: () => void;
  setIsTempoLocked: (locked: boolean) => void;
  tapTempo: () => void;

  // Presets CRUD
  loadPreset: (id: string) => void;
  saveNewPreset: (nameOrData: string | Partial<MetronomePreset>) => string;
  updateCurrentPreset: () => void;
  updatePreset: (id: string, updates: Partial<MetronomePreset>) => void;
  duplicatePreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;

  // Incremental Tempo Actions
  setTempoRamp: (config: Partial<MetronomeTempoRampConfig>) => void;
  toggleTempoRamp: () => void;

  // Stopwatch / Practice Timer Actions
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  toggleStopwatch: () => void;
  resetStopwatch: () => void;
  adjustStopwatchDuration: (deltaSec: number) => void;
  setStopwatchDuration: (seconds: number) => void;

  // Legacy Practice Timer Actions
  setPracticeTimerMinutes: (minutes: number) => void;
  togglePracticeTimer: () => void;
}

const tapTimes: number[] = [];
let stopwatchInterval: any = null;
let stopwatchTargetEndTime: number = 0;

export const useMetronomeStore = create<MetronomeState>((set, get) => {
  const stored = loadStoredSettings();
  const initialUserPresets = loadStoredPresets();

  const initialBpm = stored?.bpm ?? 120;
  const initialSig = stored?.timeSignature ?? '4/4';
  const initialSub = stored?.subdivision ?? '1/16';
  const initialSound = stored?.sound ?? 'woodblock';
  const initialAccent = stored?.accentBeat ?? 0;
  const initialVol = stored?.volume ?? 85;
  const initialCountInBars = stored?.countInBars ?? (stored?.countInEnabled !== false ? 1 : 0);
  const initialCountInVoice = stored?.countInVoiceEnabled ?? true;
  const initialTempoLocked = stored?.isTempoLocked ?? false;

  const initialBeatsCount = getBeatsPerMeasure(initialSig);
  const defaultPattern: MetronomeAccentType[] = Array(initialBeatsCount).fill('normal');
  if (initialAccent >= 0 && initialAccent < initialBeatsCount) {
    defaultPattern[initialAccent] = 'strong';
  } else if (initialAccent !== -1) {
    defaultPattern[0] = 'strong';
  }
  const initialAccentPattern: MetronomeAccentType[] =
    Array.isArray(stored?.accentPattern) && stored.accentPattern.length === initialBeatsCount
      ? stored.accentPattern
      : defaultPattern;

  // Configure audio engine with initial settings
  metronomeAudioEngine.setBpm(initialBpm);
  metronomeAudioEngine.setTimeSignature(initialSig);
  metronomeAudioEngine.setSubdivision(initialSub);
  metronomeAudioEngine.setSound(initialSound);
  metronomeAudioEngine.setAccentPattern(initialAccentPattern);
  metronomeAudioEngine.setVolume(initialVol / 100);
  metronomeAudioEngine.setCountIn(initialCountInBars > 0, initialCountInBars, initialCountInVoice);

  // Wire up audio engine callbacks to sync React store
  metronomeAudioEngine.onBeat = (event) => {
    set({
      activeBeat: event.beatIndex,
      activeSubdivision: event.subdivisionIndex,
      isAccent: event.isAccent,
      isCountIn: event.isCountIn,
      countInNumber: event.countInNumber,
      countInBar: event.countInBar,
      countInTotalBars: event.countInTotalBars,
      effectiveBpm: event.effectiveBpm,
      rampProgress: event.rampProgress,
    });
  };

  metronomeAudioEngine.onPlayStateChange = (playing) => {
    set({
      isPlaying: playing,
      activeBeat: playing ? get().activeBeat : -1,
      activeSubdivision: 0,
      isAccent: false,
      isCountIn: false,
      countInNumber: undefined,
      countInBar: undefined,
      countInTotalBars: undefined,
      effectiveBpm: playing
        ? get().tempoRamp.enabled
          ? get().tempoRamp.startBpm
          : get().bpm
        : get().bpm,
      rampProgress: playing && get().tempoRamp.enabled ? 0 : undefined,
    });

    syncMediaSession(playing);
  };

  const syncMediaSession = (playing?: boolean) => {
    const s = get();
    const isCurrentlyPlaying = playing !== undefined ? playing : s.isPlaying;
    const preset = s.activePresetId ? s.userPresets.find((p) => p.id === s.activePresetId) : null;
    const secondaryInfo = `${s.bpm} BPM • ${s.timeSignature} • ${s.subdivision}`;

    const title = preset ? preset.name : 'Drumex Metronome';
    const artist = secondaryInfo;
    const album = preset ? 'Drumex Metronome' : SOUND_LABELS[s.sound] || 'Acoustic Woodblock';
    const artworkUrl = generateMetronomeBpmArtwork(s.bpm, s.timeSignature);

    if (isCurrentlyPlaying) {
      mediaSessionCoordinator.registerProvider({
        id: 'drumex-metronome',
        getMetadata: () => {
          const state = get();
          const p = state.activePresetId
            ? state.userPresets.find((pr) => pr.id === state.activePresetId)
            : null;
          const info = `${state.bpm} BPM • ${state.timeSignature} • ${state.subdivision}`;
          if (p) {
            return {
              title: p.name,
              artist: info,
              album: 'Drumex Metronome',
              artworkUrl: generateMetronomeBpmArtwork(state.bpm, state.timeSignature),
            };
          }
          return {
            title: 'Drumex Metronome',
            artist: info,
            album: SOUND_LABELS[state.sound] || 'Acoustic Woodblock',
            artworkUrl: generateMetronomeBpmArtwork(state.bpm, state.timeSignature),
          };
        },
        getPlaybackState: () => ({
          state: get().isPlaying ? 'playing' : 'paused',
          speed: 1.0,
        }),
        onPlay: () => get().start(),
        onPause: () => get().stop(),
        onStop: () => {
          get().stop();
          mediaSessionCoordinator.stopSession('drumex-metronome');
        },
        onSkipForward: () => get().adjustBpm(5),
        onSkipBackward: () => get().adjustBpm(-5),
        onNext: () => {
          const list = get().userPresets;
          if (!list || list.length === 0) {
            // Zero saved presets: safely do nothing!
            return;
          }
          const currentId = get().activePresetId;
          const idx = list.findIndex((p) => p.id === currentId);
          const nextIdx = idx === -1 ? 0 : (idx + 1) % list.length;
          const next = list[nextIdx];
          if (next) get().loadPreset(next.id);
        },
        onPrevious: () => {
          const list = get().userPresets;
          if (!list || list.length === 0) {
            // Zero saved presets: safely do nothing!
            return;
          }
          const currentId = get().activePresetId;
          const idx = list.findIndex((p) => p.id === currentId);
          const prevIdx = idx === -1 ? list.length - 1 : (idx - 1 + list.length) % list.length;
          const prev = list[prevIdx];
          if (prev) get().loadPreset(prev.id);
        },
      });

      mediaSessionCoordinator.updateMetadata('drumex-metronome', {
        title,
        artist,
        album,
        artworkUrl,
      });

      mediaSessionCoordinator.updatePlaybackState('drumex-metronome', {
        state: 'playing',
        speed: 1.0,
      });
    } else {
      mediaSessionCoordinator.updatePlaybackState('drumex-metronome', {
        state: 'paused',
        speed: 1.0,
      });
      // Synchronize metadata when paused so BPM changes reflect immediately in notification
      if (mediaSessionCoordinator.getActiveProviderId() === 'drumex-metronome') {
        mediaSessionCoordinator.updateMetadata('drumex-metronome', {
          title,
          artist,
          album,
          artworkUrl,
        });
      }
    }
  };

  const evaluatePresetMatch = (patch: {
    bpm?: number;
    timeSignature?: MetronomeTimeSignature;
    subdivision?: MetronomeSubdivision;
    sound?: MetronomeSoundId;
    accentBeat?: number;
    accentPattern?: MetronomeAccentType[];
    countInEnabled?: boolean;
    countInBars?: number;
    tempoRamp?: MetronomeTempoRampConfig;
  }): string | null => {
    const current = get();
    const config = {
      bpm: patch.bpm !== undefined ? patch.bpm : current.bpm,
      timeSignature:
        patch.timeSignature !== undefined ? patch.timeSignature : current.timeSignature,
      subdivision: patch.subdivision !== undefined ? patch.subdivision : current.subdivision,
      sound: patch.sound !== undefined ? patch.sound : current.sound,
      accentBeat: patch.accentBeat !== undefined ? patch.accentBeat : current.accentBeat,
      accentPattern:
        patch.accentPattern !== undefined ? patch.accentPattern : current.accentPattern,
      countInEnabled:
        patch.countInEnabled !== undefined
          ? patch.countInEnabled
          : patch.countInBars !== undefined
            ? patch.countInBars > 0
            : current.countInEnabled,
      tempoRamp: patch.tempoRamp !== undefined ? patch.tempoRamp : current.tempoRamp,
    };
    return findMatchingPresetId(current.userPresets, config, current.activePresetId);
  };

  const persistSettings = () => {
    const s = get();
    saveStoredSettings({
      bpm: s.bpm,
      timeSignature: s.timeSignature,
      subdivision: s.subdivision,
      sound: s.sound,
      volume: s.volume,
      accentBeat: s.accentBeat,
      accentPattern: s.accentPattern,
      countInEnabled: s.countInEnabled,
      countInBars: s.countInBars,
      countInVoiceEnabled: s.countInVoiceEnabled,
      isTempoLocked: s.isTempoLocked,
    });
  };

  return {
    bpm: initialBpm,
    timeSignature: initialSig,
    subdivision: initialSub,
    sound: initialSound,
    accentBeat: initialAccent,
    accentPattern: initialAccentPattern,
    volume: initialVol,
    isMuted: false,
    countInEnabled: initialCountInBars > 0,
    countInBars: initialCountInBars,
    countInVoiceEnabled: initialCountInVoice,
    isTempoLocked: initialTempoLocked,

    // Incremental Tempo Ramp
    tempoRamp: DEFAULT_TEMPO_RAMP,
    effectiveBpm: initialBpm,
    rampProgress: undefined,

    isPlaying: false,
    activeBeat: -1,
    activeSubdivision: 0,
    isAccent: false,
    isCountIn: false,
    countInNumber: undefined,
    countInBar: undefined,
    countInTotalBars: undefined,

    activePresetId: null,
    userPresets: initialUserPresets,
    factoryPresets: FACTORY_PRESETS,
    presets: initialUserPresets,

    // Stopwatch / Practice Timer
    stopwatchDurationSec: 300,
    stopwatchRemainingSec: 300,
    stopwatchIsRunning: false,
    stopwatchIsCompleted: false,

    practiceTimerActive: false,
    practiceTimerMinutes: 5,
    practiceSecondsRemaining: 300,

    start: () => {
      const s = get();
      metronomeAudioEngine.setVoiceCountIn(s.countInVoiceEnabled);
      metronomeAudioEngine.setCountIn(s.countInEnabled, s.countInBars, s.countInVoiceEnabled);
      metronomeAudioEngine.start();
    },

    stop: () => {
      metronomeAudioEngine.stop();
    },

    togglePlay: () => {
      const s = get();
      if (!s.isPlaying) {
        metronomeAudioEngine.setVoiceCountIn(s.countInVoiceEnabled);
        metronomeAudioEngine.setCountIn(s.countInEnabled, s.countInBars, s.countInVoiceEnabled);
      }
      metronomeAudioEngine.togglePlay();
    },

    setBpm: (val: number) => {
      if (get().isTempoLocked) return;
      const clamped = Math.max(40, Math.min(280, Math.round(val)));
      metronomeAudioEngine.setBpm(clamped);
      const nextActivePresetId = evaluatePresetMatch({ bpm: clamped });
      set({
        bpm: clamped,
        effectiveBpm: get().tempoRamp.enabled ? get().effectiveBpm : clamped,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    adjustBpm: (delta: number) => {
      if (get().isTempoLocked) return;
      const current = get().bpm;
      const next = Math.max(40, Math.min(280, current + delta));
      metronomeAudioEngine.setBpm(next);
      const nextActivePresetId = evaluatePresetMatch({ bpm: next });
      set({
        bpm: next,
        effectiveBpm: get().tempoRamp.enabled ? get().effectiveBpm : next,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setTimeSignature: (sig: MetronomeTimeSignature) => {
      metronomeAudioEngine.setTimeSignature(sig);
      const nextPattern = metronomeAudioEngine.accentPattern;
      const nextAccent = metronomeAudioEngine.accentBeat;
      const nextActivePresetId = evaluatePresetMatch({
        timeSignature: sig,
        accentBeat: nextAccent,
        accentPattern: nextPattern,
      });
      set({
        timeSignature: sig,
        accentPattern: nextPattern,
        accentBeat: nextAccent,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setSubdivision: (sub: MetronomeSubdivision) => {
      metronomeAudioEngine.setSubdivision(sub);
      const nextActivePresetId = evaluatePresetMatch({ subdivision: sub });
      set({ subdivision: sub, activePresetId: nextActivePresetId });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setSound: (sound: MetronomeSoundId) => {
      metronomeAudioEngine.setSound(sound);
      const nextActivePresetId = evaluatePresetMatch({ sound });
      set({ sound, activePresetId: nextActivePresetId });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setAccentPattern: (pattern: MetronomeAccentType[]) => {
      metronomeAudioEngine.setAccentPattern(pattern);
      const nextPattern = metronomeAudioEngine.accentPattern;
      const nextAccent = metronomeAudioEngine.accentBeat;
      const nextActivePresetId = evaluatePresetMatch({
        accentBeat: nextAccent,
        accentPattern: nextPattern,
      });
      set({
        accentPattern: nextPattern,
        accentBeat: nextAccent,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setBeatAccent: (beatIndex: number, type: MetronomeAccentType) => {
      metronomeAudioEngine.setBeatAccent(beatIndex, type);
      const nextPattern = metronomeAudioEngine.accentPattern;
      const nextAccent = metronomeAudioEngine.accentBeat;
      const nextActivePresetId = evaluatePresetMatch({
        accentBeat: nextAccent,
        accentPattern: nextPattern,
      });
      set({
        accentPattern: nextPattern,
        accentBeat: nextAccent,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    cycleBeatAccent: (beatIndex: number) => {
      const currentPattern = get().accentPattern;
      const current = currentPattern[beatIndex] || 'normal';
      // Cycle: normal -> accent -> strong -> normal
      const nextType: MetronomeAccentType =
        current === 'normal' ? 'accent' : current === 'accent' ? 'strong' : 'normal';
      get().setBeatAccent(beatIndex, nextType);
    },

    setAccentBeat: (beatIndex: number) => {
      metronomeAudioEngine.setAccentBeat(beatIndex);
      const nextPattern = metronomeAudioEngine.accentPattern;
      const nextAccent = metronomeAudioEngine.accentBeat;
      const nextActivePresetId = evaluatePresetMatch({
        accentBeat: nextAccent,
        accentPattern: nextPattern,
      });
      set({
        accentBeat: nextAccent,
        accentPattern: nextPattern,
        activePresetId: nextActivePresetId,
      });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setVolume: (volume: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(volume)));
      metronomeAudioEngine.setVolume(clamped / 100);
      set({ volume: clamped });
      persistSettings();
    },

    toggleMute: () => {
      const next = !get().isMuted;
      metronomeAudioEngine.setMuted(next);
      set({ isMuted: next });
    },

    setCountInBars: (bars: number) => {
      const clamped = Math.max(0, Math.min(3, Math.round(bars)));
      const enabled = clamped > 0;
      metronomeAudioEngine.setCountIn(enabled, clamped, get().countInVoiceEnabled);
      const nextActivePresetId = evaluatePresetMatch({
        countInBars: clamped,
        countInEnabled: enabled,
      });
      set({ countInBars: clamped, countInEnabled: enabled, activePresetId: nextActivePresetId });
      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    setCountInVoice: (enabled: boolean) => {
      metronomeAudioEngine.setVoiceCountIn(enabled);
      set({ countInVoiceEnabled: enabled });
      persistSettings();
    },

    toggleCountIn: () => {
      const current = get().countInBars;
      // Cycle: 0 (Off) -> 1 Bar -> 2 Bars -> 3 Bars -> 0 (Off)
      const nextBars = current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0;
      get().setCountInBars(nextBars);
    },

    toggleTempoLock: () => {
      const next = !get().isTempoLocked;
      set({ isTempoLocked: next });
      persistSettings();
    },

    setIsTempoLocked: (locked: boolean) => {
      set({ isTempoLocked: locked });
      persistSettings();
    },

    tapTempo: () => {
      if (get().isTempoLocked) return;
      const now = performance.now();

      // Reset sequence if more than 2000ms pause between taps
      if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
        tapTimes.length = 0;
      }

      // Touch-noise debounce: ignore taps faster than 70ms (< 857 BPM physical tap bounce)
      if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] < 70) {
        return;
      }

      tapTimes.push(now);
      // Keep up to 7 taps (6 intervals) for responsive yet stable tracking
      if (tapTimes.length > 7) tapTimes.shift();

      // 2 taps immediately calculate an initial tempo!
      if (tapTimes.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < tapTimes.length; i++) {
          intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }

        // Weighted rolling average: recent intervals get slightly higher weight
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < intervals.length; i++) {
          const weight = 1 + (i / Math.max(1, intervals.length - 1)) * 0.5;
          weightedSum += intervals[i] * weight;
          totalWeight += weight;
        }

        const avgInterval = weightedSum / totalWeight;
        if (avgInterval > 0) {
          const calculatedBpm = Math.round(60000 / avgInterval);
          const clampedBpm = Math.max(40, Math.min(280, calculatedBpm));
          get().setBpm(clampedBpm);
        }
      }
    },

    loadPreset: (id: string) => {
      const preset = get().userPresets.find((p) => p.id === id);
      if (!preset) return;

      const clampedBpm = Math.max(40, Math.min(280, Math.round(preset.bpm)));
      metronomeAudioEngine.setBpm(clampedBpm);
      metronomeAudioEngine.setTimeSignature(preset.timeSignature);
      metronomeAudioEngine.setSubdivision(preset.subdivision);
      metronomeAudioEngine.setSound(preset.sound);
      metronomeAudioEngine.setVolume(preset.volume / 100);

      const beatsCount = getBeatsPerMeasure(preset.timeSignature);
      let pattern: MetronomeAccentType[];
      if (Array.isArray(preset.accentPattern) && preset.accentPattern.length === beatsCount) {
        pattern = [...preset.accentPattern];
      } else {
        pattern = Array(beatsCount).fill('normal');
        const acc = preset.accentBeat ?? 0;
        if (acc >= 0 && acc < beatsCount) {
          pattern[acc] = 'strong';
        }
      }
      metronomeAudioEngine.setAccentPattern(pattern);

      const countInEnabled = preset.countInEnabled ?? true;
      const countInBars = preset.countInBars ?? (countInEnabled ? 1 : 0);
      metronomeAudioEngine.setCountIn(countInEnabled, countInBars, get().countInVoiceEnabled);

      const nextRamp = preset.tempoRamp
        ? { ...preset.tempoRamp }
        : { ...DEFAULT_TEMPO_RAMP, enabled: false };
      metronomeAudioEngine.setTempoRamp(nextRamp);

      set({
        bpm: clampedBpm,
        effectiveBpm: clampedBpm,
        timeSignature: preset.timeSignature,
        subdivision: preset.subdivision,
        sound: preset.sound,
        volume: preset.volume,
        accentBeat: preset.accentBeat ?? pattern.findIndex((t) => t !== 'normal'),
        accentPattern: pattern,
        countInEnabled,
        countInBars,
        tempoRamp: nextRamp,
        activePresetId: id,
      });

      persistSettings();
      syncMediaSession(get().isPlaying);
    },

    saveNewPreset: (nameOrData: string | Partial<MetronomePreset>) => {
      const s = get();
      const newId = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isObject = typeof nameOrData === 'object' && nameOrData !== null;
      const name = (isObject ? nameOrData.name : nameOrData) || 'Custom Groove';

      const newPreset: MetronomePreset = {
        id: newId,
        name: (name || 'Custom Groove').trim(),
        bpm: isObject && nameOrData.bpm !== undefined ? nameOrData.bpm : s.bpm,
        timeSignature:
          isObject && nameOrData.timeSignature ? nameOrData.timeSignature : s.timeSignature,
        subdivision: isObject && nameOrData.subdivision ? nameOrData.subdivision : s.subdivision,
        sound: isObject && nameOrData.sound ? nameOrData.sound : s.sound,
        volume: isObject && nameOrData.volume !== undefined ? nameOrData.volume : s.volume,
        accentBeat:
          isObject && nameOrData.accentBeat !== undefined ? nameOrData.accentBeat : s.accentBeat,
        accentPattern:
          isObject && nameOrData.accentPattern
            ? [...nameOrData.accentPattern]
            : [...s.accentPattern],
        countInEnabled:
          isObject && nameOrData.countInEnabled !== undefined
            ? nameOrData.countInEnabled
            : s.countInEnabled,
        countInBars:
          isObject && nameOrData.countInBars !== undefined ? nameOrData.countInBars : s.countInBars,
        tempoRamp:
          isObject && nameOrData.tempoRamp
            ? { ...nameOrData.tempoRamp }
            : s.tempoRamp.enabled
              ? { ...s.tempoRamp }
              : undefined,
        isFactory: false,
        icon: isObject && nameOrData.icon ? nameOrData.icon : 'bookmark',
        createdAt: Date.now(),
      };

      const updated = [newPreset, ...s.userPresets];
      saveStoredPresets(updated);
      set({ userPresets: updated, presets: updated, activePresetId: newId });
      return newId;
    },

    updateCurrentPreset: () => {
      const s = get();
      if (!s.activePresetId) return;

      const updated = s.userPresets.map((p) => {
        if (p.id === s.activePresetId) {
          return {
            ...p,
            bpm: s.bpm,
            timeSignature: s.timeSignature,
            subdivision: s.subdivision,
            sound: s.sound,
            volume: s.volume,
            accentBeat: s.accentBeat,
            accentPattern: [...s.accentPattern],
            countInEnabled: s.countInEnabled,
            countInBars: s.countInBars,
            tempoRamp: s.tempoRamp.enabled ? { ...s.tempoRamp } : undefined,
          };
        }
        return p;
      });

      saveStoredPresets(updated);
      set({ userPresets: updated, presets: updated });
    },

    updatePreset: (id: string, updates: Partial<MetronomePreset>) => {
      const s = get();
      let updatedPreset: MetronomePreset | null = null;
      const updated = s.userPresets.map((p) => {
        if (p.id === id) {
          updatedPreset = { ...p, ...updates };
          return updatedPreset;
        }
        return p;
      });

      saveStoredPresets(updated);
      set({ userPresets: updated, presets: updated });

      if (s.activePresetId === id && updatedPreset) {
        if (updates.bpm !== undefined) get().setBpm(updates.bpm);
        if (updates.timeSignature !== undefined) get().setTimeSignature(updates.timeSignature);
        if (updates.subdivision !== undefined) get().setSubdivision(updates.subdivision);
        if (updates.sound !== undefined) get().setSound(updates.sound);
        if (updates.volume !== undefined) get().setVolume(updates.volume);
        if (updates.accentPattern !== undefined) get().setAccentPattern(updates.accentPattern);
        else if (updates.accentBeat !== undefined) get().setAccentBeat(updates.accentBeat);
        if (updates.countInEnabled !== undefined || updates.countInBars !== undefined) {
          const countInBars = updates.countInBars ?? (updates.countInEnabled ? 1 : 0);
          const countInEnabled = updates.countInEnabled ?? countInBars > 0;
          metronomeAudioEngine.setCountIn(countInEnabled, countInBars, get().countInVoiceEnabled);
          set({ countInEnabled, countInBars });
        }
        if (updates.tempoRamp !== undefined) {
          get().setTempoRamp(updates.tempoRamp);
        }
      }
    },

    duplicatePreset: (id: string) => {
      const s = get();
      const target = s.userPresets.find((p) => p.id === id);
      if (!target) return;

      const copy: MetronomePreset = {
        ...target,
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${target.name} (Copy)`,
        tempoRamp: target.tempoRamp ? { ...target.tempoRamp } : undefined,
        isFactory: false,
        createdAt: Date.now(),
      };

      const updated = [copy, ...s.userPresets];
      saveStoredPresets(updated);
      set({ userPresets: updated, presets: updated, activePresetId: copy.id });
    },

    deletePreset: (id: string) => {
      const s = get();
      const updated = s.userPresets.filter((p) => p.id !== id);
      saveStoredPresets(updated);
      const nextActiveId = s.activePresetId === id ? (updated[0]?.id ?? null) : s.activePresetId;
      set({
        userPresets: updated,
        presets: updated,
        activePresetId: nextActiveId,
      });
      if (s.activePresetId === id) {
        if (nextActiveId) {
          get().loadPreset(nextActiveId);
        } else {
          syncMediaSession(s.isPlaying);
        }
      }
    },

    renamePreset: (id: string, name: string) => {
      const s = get();
      const updated = s.userPresets.map((p) => (p.id === id ? { ...p, name: name.trim() } : p));
      saveStoredPresets(updated);
      set({ userPresets: updated, presets: updated });
    },

    setTempoRamp: (config: Partial<MetronomeTempoRampConfig>) => {
      const nextConfig: MetronomeTempoRampConfig = {
        ...get().tempoRamp,
        ...config,
      };
      metronomeAudioEngine.setTempoRamp(nextConfig);
      const nextActivePresetId = evaluatePresetMatch({ tempoRamp: nextConfig });
      set({
        tempoRamp: nextConfig,
        effectiveBpm: nextConfig.enabled ? nextConfig.startBpm : get().bpm,
        rampProgress: nextConfig.enabled ? 0 : undefined,
        activePresetId: nextActivePresetId,
      });
      syncMediaSession(get().isPlaying);
    },

    toggleTempoRamp: () => {
      const current = get().tempoRamp;
      const nextEnabled = !current.enabled;
      get().setTempoRamp({
        enabled: nextEnabled,
        startBpm: current.startBpm || get().bpm,
      });
    },

    // ── Stopwatch / Practice Timer Actions ─────────────────────────────────

    startStopwatch: () => {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
      }
      let remaining = get().stopwatchRemainingSec;
      if (remaining <= 0) {
        remaining = get().stopwatchDurationSec;
      }
      stopwatchTargetEndTime = performance.now() + remaining * 1000;
      set({
        stopwatchRemainingSec: remaining,
        stopwatchIsRunning: true,
        stopwatchIsCompleted: false,
        practiceTimerActive: true,
        practiceSecondsRemaining: remaining,
      });

      stopwatchInterval = setInterval(() => {
        const now = performance.now();
        const msLeft = stopwatchTargetEndTime - now;
        if (msLeft <= 0) {
          clearInterval(stopwatchInterval);
          stopwatchInterval = null;
          if (get().isPlaying) {
            metronomeAudioEngine.stop();
          }
          set({
            stopwatchRemainingSec: 0,
            stopwatchIsRunning: false,
            stopwatchIsCompleted: true,
            practiceTimerActive: false,
            practiceSecondsRemaining: 0,
          });
        } else {
          const sec = Math.ceil(msLeft / 1000);
          set({
            stopwatchRemainingSec: sec,
            practiceSecondsRemaining: sec,
          });
        }
      }, 100);
    },

    pauseStopwatch: () => {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
      }
      const now = performance.now();
      const msLeft = Math.max(0, stopwatchTargetEndTime - now);
      const sec = Math.ceil(msLeft / 1000);
      set({
        stopwatchRemainingSec: sec,
        stopwatchIsRunning: false,
        practiceTimerActive: false,
        practiceSecondsRemaining: sec,
      });
    },

    toggleStopwatch: () => {
      if (get().stopwatchIsRunning) {
        get().pauseStopwatch();
      } else {
        get().startStopwatch();
      }
    },

    resetStopwatch: () => {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
      }
      const dur = get().stopwatchDurationSec;
      set({
        stopwatchRemainingSec: dur,
        stopwatchIsRunning: false,
        stopwatchIsCompleted: false,
        practiceTimerActive: false,
        practiceSecondsRemaining: dur,
      });
    },

    adjustStopwatchDuration: (deltaSec: number) => {
      const currentDur = get().stopwatchDurationSec;
      const nextDur = Math.max(60, Math.min(3600, currentDur + deltaSec));
      const wasRunning = get().stopwatchIsRunning;
      if (wasRunning) {
        stopwatchTargetEndTime += deltaSec * 1000;
        const msLeft = Math.max(0, stopwatchTargetEndTime - performance.now());
        const sec = Math.ceil(msLeft / 1000);
        set({
          stopwatchDurationSec: nextDur,
          stopwatchRemainingSec: sec,
          practiceSecondsRemaining: sec,
        });
      } else {
        set({
          stopwatchDurationSec: nextDur,
          stopwatchRemainingSec: nextDur,
          stopwatchIsCompleted: false,
          practiceSecondsRemaining: nextDur,
        });
      }
    },

    setStopwatchDuration: (seconds: number) => {
      const clamped = Math.max(60, Math.min(3600, Math.round(seconds)));
      if (get().stopwatchIsRunning) {
        get().pauseStopwatch();
      }
      set({
        stopwatchDurationSec: clamped,
        stopwatchRemainingSec: clamped,
        stopwatchIsCompleted: false,
        practiceSecondsRemaining: clamped,
      });
    },

    setPracticeTimerMinutes: (minutes: number) => {
      if (minutes <= 0) {
        get().pauseStopwatch();
        get().resetStopwatch();
        set({ practiceTimerMinutes: 0, practiceTimerActive: false });
      } else {
        get().setStopwatchDuration(minutes * 60);
        get().startStopwatch();
        set({ practiceTimerMinutes: minutes, practiceTimerActive: true });
      }
    },

    togglePracticeTimer: () => {
      const cur = get().practiceTimerMinutes;
      // Cycle: 0 (Off) -> 5m -> 10m -> 15m -> 30m -> 0
      const nextMin = cur === 0 ? 5 : cur === 5 ? 10 : cur === 10 ? 15 : cur === 15 ? 30 : 0;
      get().setPracticeTimerMinutes(nextMin);
    },
  };
});
