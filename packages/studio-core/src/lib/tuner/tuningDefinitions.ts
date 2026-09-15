import type {
  InstrumentStringTarget,
  InstrumentTuningDefinition,
  InstrumentTuningMode,
  TuningCategory,
} from './tunerTypes';
import { DRUM_PARTS, getDrumStringTarget } from './drumTuningModels';

const SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function str(
  name: string,
  note: string,
  octave: number,
  stringNumber: number,
  refA4 = 440
): InstrumentStringTarget {
  const semi = SEMITONES[note] ?? 0;
  const midi = (octave + 1) * 12 + semi;
  const freq = Number((refA4 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
  return {
    name,
    note,
    octave,
    fullName: `${note}${octave}`,
    frequency: freq,
    stringNumber,
  };
}

const GUITAR_MODES: readonly InstrumentTuningMode[] = ['electric', 'acoustic'];
const BASS_4_MODES: readonly InstrumentTuningMode[] = ['bass-4'];
const DRUM_MODES: readonly InstrumentTuningMode[] = ['drum'];

export const CANONICAL_TUNINGS: readonly InstrumentTuningDefinition[] = [
  // ─── GUITAR (ELECTRIC & ACOUSTIC) ───────────────────────────────────────
  // Standard
  {
    id: 'guitar-standard',
    name: 'Standard',
    shortName: 'Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Standard',
    description: 'E A D G B E — Standard guitar tuning',
    strings: [
      str('Low E', 'E', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  // Drop
  {
    id: 'guitar-drop-d',
    name: 'Drop D',
    shortName: 'Drop D',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop',
    description: 'D A D G B E — 6th string tuned down to D',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  {
    id: 'guitar-drop-c',
    name: 'Drop C',
    shortName: 'Drop C',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop',
    description: 'C G C F A D — One whole step down with dropped 6th string',
    strings: [
      str('Low C', 'C', 2, 6),
      str('G', 'G', 2, 5),
      str('C', 'C', 3, 4),
      str('F', 'F', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  {
    id: 'guitar-drop-b',
    name: 'Drop B',
    shortName: 'Drop B',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop',
    description: 'B F# B E G# C# — 1.5 steps down with dropped 6th string',
    strings: [
      str('Low B', 'B', 1, 6),
      str('F#', 'F#', 2, 5),
      str('B', 'B', 2, 4),
      str('E', 'E', 3, 3),
      str('G#', 'G#', 3, 2),
      str('High C#', 'C#', 4, 1),
    ],
  },
  {
    id: 'guitar-double-drop-d',
    name: 'Double Drop D',
    shortName: 'Dbl Drop D',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop',
    description: 'D A D G B D — 1st and 6th strings tuned down to D',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  // Down-Tuned
  {
    id: 'guitar-half-step-down',
    name: 'Half Step Down (Eb)',
    shortName: 'Eb Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Down-Tuned',
    description: 'Eb Ab Db Gb Bb Eb — All strings down one semitone',
    strings: [
      str('Low Eb', 'Eb', 2, 6),
      str('Ab', 'Ab', 2, 5),
      str('Db', 'Db', 3, 4),
      str('Gb', 'Gb', 3, 3),
      str('Bb', 'Bb', 3, 2),
      str('High Eb', 'Eb', 4, 1),
    ],
  },
  {
    id: 'guitar-d-standard',
    name: 'D Standard',
    shortName: 'D Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Down-Tuned',
    description: 'D G C F A D — All strings down one whole step',
    strings: [
      str('Low D', 'D', 2, 6),
      str('G', 'G', 2, 5),
      str('C', 'C', 3, 4),
      str('F', 'F', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  // Open
  {
    id: 'guitar-open-d',
    name: 'Open D',
    shortName: 'Open D',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'D A D F# A D — Open D Major chord',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('F#', 'F#', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  {
    id: 'guitar-open-g',
    name: 'Open G',
    shortName: 'Open G',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'D G D G B D — Open G Major chord',
    strings: [
      str('Low D', 'D', 2, 6),
      str('G', 'G', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  {
    id: 'guitar-dadgad',
    name: 'DADGAD',
    shortName: 'DADGAD',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'D A D G A D — Celtic modal tuning',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },

  // ─── BASS 4-STRING ──────────────────────────────────────────────────────
  // Standard
  {
    id: 'bass4-standard',
    name: 'Standard',
    shortName: 'Std',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Standard',
    description: 'E A D G — Standard 4-string bass tuning',
    strings: [
      str('Low E', 'E', 1, 4),
      str('A', 'A', 1, 3),
      str('D', 'D', 2, 2),
      str('High G', 'G', 2, 1),
    ],
  },
  // Drop
  {
    id: 'bass4-drop-d',
    name: 'Drop D',
    shortName: 'Drop D',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Drop',
    description: 'D A D G — 4th string dropped to low D',
    strings: [
      str('Low D', 'D', 1, 4),
      str('A', 'A', 1, 3),
      str('D', 'D', 2, 2),
      str('High G', 'G', 2, 1),
    ],
  },
  {
    id: 'bass4-drop-c',
    name: 'Drop C',
    shortName: 'Drop C',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Drop',
    description: 'C G C F — Deep Drop C for 4-string bass',
    strings: [
      str('Low C', 'C', 1, 4),
      str('G', 'G', 1, 3),
      str('C', 'C', 2, 2),
      str('High F', 'F', 2, 1),
    ],
  },
  // Down-Tuned
  {
    id: 'bass4-half-step-down',
    name: 'Half Step Down (Eb)',
    shortName: 'Eb Std',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Down-Tuned',
    description: 'Eb Ab Db Gb — Down one semitone for 4-string bass',
    strings: [
      str('Low Eb', 'Eb', 1, 4),
      str('Ab', 'Ab', 1, 3),
      str('Db', 'Db', 2, 2),
      str('High Gb', 'Gb', 2, 1),
    ],
  },
  {
    id: 'bass4-d-standard',
    name: 'D Standard',
    shortName: 'D Std',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Down-Tuned',
    description: 'D G C F — Down one whole step for 4-string bass',
    strings: [
      str('Low D', 'D', 1, 4),
      str('G', 'G', 1, 3),
      str('C', 'C', 2, 2),
      str('High F', 'F', 2, 1),
    ],
  },
  // ─── DRUMS ──────────────────────────────────────────────────────────────
  {
    id: 'drum-standard',
    name: 'Kit Estándar',
    shortName: 'Drums',
    instrumentCompatibility: DRUM_MODES,
    instrumentFamily: 'drum',
    category: 'Standard',
    description: 'Afinación estándar de batería acústica (Tarola 242Hz / B3)',
    strings: DRUM_PARTS.map((p) => getDrumStringTarget(p, 'normal')),
  },
];

/**
 * Backward compatibility alias mapping for legacy tuning IDs.
 */
const TUNING_ALIASES: Record<string, string> = {
  'guitar-full-step-down': 'guitar-d-standard',
  'bass4-full-step-down': 'bass4-d-standard',
  'bass5-standard': 'bass4-standard',
  'bass5-drop-a': 'bass4-drop-d',
  'bass5-half-step-down': 'bass4-half-step-down',
  'bass5-high-c': 'bass4-standard',
};

/**
 * Returns all compatible tunings for an instrument mode.
 */
export function getTuningsForMode(
  mode: InstrumentTuningMode
): readonly InstrumentTuningDefinition[] {
  return CANONICAL_TUNINGS.filter((t) => t.instrumentCompatibility.includes(mode));
}

/**
 * Returns the default standard tuning definition for an instrument mode.
 */
export function getDefaultTuningForMode(
  mode: InstrumentTuningMode
): InstrumentTuningDefinition {
  if (mode === 'drum') {
    return (
      CANONICAL_TUNINGS.find((t) => t.id === 'drum-standard') || CANONICAL_TUNINGS[0]
    );
  }
  if (mode === 'bass-4') {
    return (
      CANONICAL_TUNINGS.find((t) => t.id === 'bass4-standard') || CANONICAL_TUNINGS[0]
    );
  }
  return (
    CANONICAL_TUNINGS.find((t) => t.id === 'guitar-standard') || CANONICAL_TUNINGS[0]
  );
}

/**
 * Resolves a tuning by its unique ID, with legacy alias fallback.
 */
export function getTuningById(id?: string | null): InstrumentTuningDefinition | undefined {
  if (!id) return undefined;
  const canonicalId = TUNING_ALIASES[id] || id;
  return CANONICAL_TUNINGS.find((t) => t.id === canonicalId);
}

/**
 * Groups tunings by category for display in selection interfaces.
 */
export function getTuningsByCategory(
  mode: InstrumentTuningMode
): Record<TuningCategory, InstrumentTuningDefinition[]> {
  const compatible = getTuningsForMode(mode);
  const groups: Record<TuningCategory, InstrumentTuningDefinition[]> = {
    Standard: [],
    Drop: [],
    'Down-Tuned': [],
    Open: [],
  };

  for (const t of compatible) {
    if (groups[t.category]) {
      groups[t.category].push(t);
    }
  }

  return groups;
}

export const TUNING_CATEGORIES: readonly TuningCategory[] = [
  'Standard',
  'Drop',
  'Down-Tuned',
  'Open',
] as const;
