import type { InstPlugin } from '../lib/drumPlugins';
export type { InstPlugin };

export type DrumInstrument =
  | 'crash'
  | 'ride'
  | 'hihat-open'
  | 'hihat-closed'
  | 'hihat-foot'
  | 'snare'
  | 'tom-high'
  | 'tom-mid'
  | 'tom-floor'
  | 'kick';

export type NoteVariation =
  | 'normal' | 'ghost' | 'rimshot' | 'flam' | 'open' | 'pedal' | 'accent' | 'bell' | 'choke' | 'ride';

export type KitType =
  | 'ludwig' | 'jazz' | 'rock' | 'vintage' | 'studio' | 'r8' | 'linn'
  | 'funk' | 'cr78' | 'tr808' | 'techno' | 'stark' | 'rmm' | 'chrome' | 'house';

export type HouseMic = 'blend' | 'close' | 'oh' | 'room';
export const HOUSE_MICS: { id: HouseMic; label: string; desc: string }[] = [
  { id: 'blend', label: 'Blend', desc: 'Mixed multi-mic for balanced, production-ready tone' },
  { id: 'close', label: 'Close', desc: 'Close mic only — punchy, dry, very direct' },
  { id: 'oh', label: 'OH', desc: 'Overhead — open, airy, natural room perspective' },
  { id: 'room', label: 'Room', desc: 'Room mic — spacious live ambience' },
];

export type HouseCrashModel = 'ac18' | 'am17' | 'hhx18' | 'zcp19';
export const HOUSE_CRASH_MODELS: { id: HouseCrashModel; label: string; desc: string }[] = [
  { id: 'ac18', label: 'Custom 18"', desc: 'A-Custom 18" — bright, cutting, versatile' },
  { id: 'am17', label: 'Medium 17"', desc: 'A-Medium 17" — warm, controlled, mid-focused' },
  { id: 'hhx18', label: 'HHXplosion 18"', desc: 'HHXplosion 18" — explosive, dark, washy' },
  { id: 'zcp19', label: 'Z-Custom 19"', desc: 'Z-Custom Projection 19" — loud, full, wide spread' },
];

export type CymbalPack = 'default' | 'zildjian-k';
export const CYMBAL_PACKS: { id: CymbalPack; label: string; desc: string }[] = [
  { id: 'default', label: 'Sabian Pack', desc: 'Hi-hat, crash, ride — bright, versatile' },
];

export const DRUM_INSTRUMENTS: DrumInstrument[] = [
  'crash', 'ride', 'hihat-open', 'hihat-closed', 'hihat-foot',
  'snare', 'tom-high', 'tom-mid', 'tom-floor', 'kick',
];

export const INST_VARIATIONS: Partial<Record<DrumInstrument, NoteVariation[]>> = {
  snare: ['normal', 'rimshot', 'flam', 'ghost'],
  'hihat-closed': ['normal', 'open', 'pedal'],
  kick: ['normal', 'accent'],
  'tom-high': ['normal', 'accent'],
  'tom-mid': ['normal', 'accent'],
  'tom-floor': ['normal', 'accent'],
  crash: ['normal', 'choke', 'ride', 'bell'],
};

export const INSTRUMENT_NAME: Record<DrumInstrument, string> = {
  crash: 'Cymbal', ride: 'Ride', 'hihat-open': 'Open HH', 'hihat-closed': 'Hi-Hat',
  'hihat-foot': 'HH Foot', snare: 'Snare', 'tom-high': 'Tom Hi', 'tom-mid': 'Tom Mid',
  'tom-floor': 'Floor', kick: 'Kick',
};

export const INSTRUMENT_COLOR: Record<DrumInstrument, string> = {
  crash: '#a1a1aa', ride: '#71717a', 'hihat-open': '#d4d4d8', 'hihat-closed': '#e4e4e7',
  'hihat-foot': '#a1a1aa', snare: '#ffffff', 'tom-high': '#e4e4e7', 'tom-mid': '#d4d4d8',
  'tom-floor': '#a1a1aa', kick: '#ffffff',
};

export const KIT_INSTRUMENTS: Record<KitType, DrumInstrument[]> = {
  ludwig: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  jazz: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  rock: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  vintage: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  studio: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  r8: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  linn: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high'],
  funk: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high'],
  cr78: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high'],
  tr808: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high'],
  techno: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high'],
  stark: ['hihat-closed', 'snare', 'kick', 'crash'],
  rmm: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  chrome: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
  house: ['hihat-closed', 'snare', 'kick', 'crash', 'tom-high', 'tom-mid', 'tom-floor'],
};

export const MIN_VELOCITY = 1;
export const MAX_VELOCITY = 127;
export const DEFAULT_VELOCITY = 100;
export const NEW_NOTE_VELOCITY_MIN = 85;
export const NEW_NOTE_VELOCITY_MAX = 110;

export function randomNewNoteVelocity(): number {
  return Math.round(NEW_NOTE_VELOCITY_MIN + Math.random() * (NEW_NOTE_VELOCITY_MAX - NEW_NOTE_VELOCITY_MIN));
}

export function clampVelocity(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_VELOCITY;
  return Math.max(MIN_VELOCITY, Math.min(MAX_VELOCITY, Math.round(v)));
}

export interface DrumHit {
  step: number;
  length: number;
  variation?: NoteVariation;
  velocity?: number;
}
export interface DrumMeasure {
  id: string;
  hits: Partial<Record<DrumInstrument, DrumHit[]>>;
}

export const GROOVE_TAGS = ['Rock', 'Trap', 'Jazz', 'Funk', 'Fill', 'Intro', 'Outro', 'Loop', 'Latin'] as const;

export interface InstFX {
  compress: number;
  attack: number;
  eqLow: number;
  eqLowMid: number;
  eqMid: number;
  eqHigh: number;
  reverb: number;
  gate: number;
  saturate: number;
}
export const DEFAULT_INST_FX: InstFX = {
  compress: 0, attack: 0, eqLow: 0, eqLowMid: 0, eqMid: 0, eqHigh: 0, reverb: 0, gate: 0, saturate: 0,
};

export interface KitVariation {
  kit: KitType;
  label: string;
  desc: string;
}
export interface KitFamilyEntry {
  id: string;
  label: string;
  variations: KitVariation[];
}
export const KIT_FAMILY: KitFamilyEntry[] = [
  {
    id: 'acoustic',
    label: 'Acoustic',
    variations: [
      {
        kit: 'house',
        label: 'House Kit',
        desc: 'Premium multi-velocity studio kit — 5 velocity layers × 7 round-robin variations per instrument. Choose mic position (Blend / Close / OH / Room) in kit settings.',
      },
    ],
  },
];
export type GrooveTag = (typeof GROOVE_TAGS)[number] | '';

export interface GrooveEntry {
  id: string;
  name: string;
  tag: GrooveTag;
  bpm: number;
  bars: number;
  subdivision: 8 | 16;
  measures: DrumMeasure[];
  savedAt: number;
}

export interface LoopRange {
  startBar: number;
  endBar: number;
  enabled: boolean;
}

export interface DrumPattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  subdivision: 8 | 16;
  measures: DrumMeasure[];
  mutedInstruments?: DrumInstrument[];
  swing?: number;
  loopRange?: LoopRange;
}

export function defaultLoopRange(): LoopRange {
  return { startBar: 0, endBar: 0, enabled: false };
}

export function clampLoopRange(lr: LoopRange | undefined, barCount: number): LoopRange {
  const maxBar = Math.max(0, barCount - 1);
  if (!lr) return { startBar: 0, endBar: maxBar, enabled: false };
  const start = Math.max(0, Math.min(Math.floor(lr.startBar), maxBar));
  const end = Math.max(start, Math.min(Math.floor(lr.endBar), maxBar));
  return { startBar: start, endBar: end, enabled: !!lr.enabled };
}

export const SWING_MIN = 0;
export const SWING_MAX = 60;
export const SWING_PRESETS: { id: 'tight' | 'groove' | 'funky'; value: number }[] = [
  { id: 'tight', value: 0 },
  { id: 'groove', value: 18 },
  { id: 'funky', value: 40 },
];
export function clampSwing(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(SWING_MIN, Math.min(SWING_MAX, Math.round(v)));
}

export interface DrumSong {
  id: string;
  name: string;
  artist: string;
  notes: string;
  patterns: DrumPattern[];
  activePatternId: string;
  kitType: KitType | null;
  createdAt: number;
  updatedAt: number;
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyMeasure(): DrumMeasure {
  return { id: `m-${uid()}`, hits: {} };
}

export function defaultPattern(): DrumPattern {
  return {
    id: `p-${uid()}`,
    name: 'Pattern 1',
    bpm: 120,
    timeSignature: [4, 4],
    subdivision: 16,
    measures: [emptyMeasure(), emptyMeasure()],
    swing: 0,
  };
}

export function stepsPerMeasure(p: DrumPattern): number {
  return p.timeSignature[0] * (p.subdivision / p.timeSignature[1]);
}

export function migratePatterns(patterns: DrumPattern[]): DrumPattern[] {
  return patterns.map((p) => ({
    ...p,
    measures: p.measures.map((m) => {
      const hhHits: DrumHit[] = [...(m.hits['hihat-closed'] ?? [])];
      (m.hits['hihat-open'] ?? []).forEach((h) => {
        if (!hhHits.some((c) => c.step === h.step)) hhHits.push({ ...h, variation: 'open' });
      });
      (m.hits['hihat-foot'] ?? []).forEach((h) => {
        if (!hhHits.some((c) => c.step === h.step)) hhHits.push({ ...h, variation: 'pedal' });
      });
      hhHits.sort((a, b) => a.step - b.step);

      const cymHits: DrumHit[] = [...(m.hits['crash'] ?? [])];
      (m.hits['ride'] ?? []).forEach((h) => {
        if (!cymHits.some((c) => c.step === h.step)) {
          const var_: NoteVariation = h.variation === 'bell' ? 'bell' : 'ride';
          cymHits.push({ ...h, variation: var_ });
        }
      });
      cymHits.sort((a, b) => a.step - b.step);

      const { 'hihat-open': _o, 'hihat-foot': _f, ride: _r, ...rest } = m.hits as Partial<Record<string, DrumHit[]>>;
      return {
        ...m,
        hits: {
          ...rest,
          'hihat-closed': hhHits,
          crash: cymHits,
        } as Partial<Record<DrumInstrument, DrumHit[]>>,
      };
    }),
  }));
}

export interface DrumPrefs {
  noteVariationsCycle: boolean;
  autoExpandPattern: boolean;
  snapToGrid: boolean;
  dragToFill: boolean;
  autoPlayOnEdit: boolean;
  loopPlayback: boolean;
  metronome: boolean;
  countIn: boolean;
  metronomeSound: string;
  showNoteVariations: boolean;
  highlightActiveInst: boolean;
  gridLinesEmphasis: boolean;
  randomVariations: boolean;
  humanizeVelocity: boolean;
}

export const DEFAULT_DRUM_PREFS: DrumPrefs = {
  noteVariationsCycle: true,
  autoExpandPattern: false,
  snapToGrid: true,
  dragToFill: true,
  autoPlayOnEdit: false,
  loopPlayback: true,
  metronome: false,
  countIn: false,
  metronomeSound: 'classic',
  showNoteVariations: true,
  highlightActiveInst: true,
  gridLinesEmphasis: true,
  randomVariations: true,
  humanizeVelocity: true,
};
