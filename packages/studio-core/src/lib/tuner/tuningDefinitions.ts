import type {
  InstrumentStringTarget,
  InstrumentTuningDefinition,
  InstrumentTuningMode,
  TuningCategory,
} from './tunerTypes';

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
const BASS_5_MODES: readonly InstrumentTuningMode[] = ['bass-5'];

export const CANONICAL_TUNINGS: readonly InstrumentTuningDefinition[] = [
  // ─── GUITAR ─────────────────────────────────────────────────────────────
  // Standard
  {
    id: 'guitar-standard',
    name: 'Standard',
    shortName: 'Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Standard',
    description: 'E A D G B E — Standard modern guitar tuning',
    strings: [
      str('Low E', 'E', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  // Drop / Power
  {
    id: 'guitar-drop-d',
    name: 'Drop D',
    shortName: 'Drop D',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop / Power',
    description: 'D A D G B E — 6th string lowered one full step for heavy power chords',
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
    category: 'Drop / Power',
    description: 'C G C F A D — One step down with dropped 6th string for metal and hard rock',
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
    category: 'Drop / Power',
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
    id: 'guitar-drop-a',
    name: 'Drop A',
    shortName: 'Drop A',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop / Power',
    description: 'A E A D F# B — Deep subterranean power tuning',
    strings: [
      str('Low A', 'A', 1, 6),
      str('E', 'E', 2, 5),
      str('A', 'A', 2, 4),
      str('D', 'D', 3, 3),
      str('F#', 'F#', 3, 2),
      str('High B', 'B', 3, 1),
    ],
  },
  {
    id: 'guitar-double-drop-d',
    name: 'Double Drop D',
    shortName: 'Dbl Drop D',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Drop / Power',
    description: 'D A D G B D — 1st and 6th strings tuned down to D for folk and rock resonance',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('B', 'B', 3, 2),
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
    description: 'D A D F# A D — Open D Major chord for slide and fingerstyle',
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
    description: 'D G D G B D — Open G Major chord favored in blues and Stones rock',
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
    id: 'guitar-open-c',
    name: 'Open C',
    shortName: 'Open C',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'C G C G C E — Lush, expansive resonant C Major chord',
    strings: [
      str('Low C', 'C', 2, 6),
      str('G', 'G', 2, 5),
      str('C', 'C', 3, 4),
      str('G', 'G', 3, 3),
      str('C', 'C', 4, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  {
    id: 'guitar-open-e',
    name: 'Open E',
    shortName: 'Open E',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'E B E G# B E — Open E Major chord for driving slide and blues',
    strings: [
      str('Low E', 'E', 2, 6),
      str('B', 'B', 2, 5),
      str('E', 'E', 3, 4),
      str('G#', 'G#', 3, 3),
      str('B', 'B', 3, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  {
    id: 'guitar-open-a',
    name: 'Open A',
    shortName: 'Open A',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'E A E A C# E — Open A Major chord with bright mid-range projection',
    strings: [
      str('Low E', 'E', 2, 6),
      str('A', 'A', 2, 5),
      str('E', 'E', 3, 4),
      str('A', 'A', 3, 3),
      str('C#', 'C#', 4, 2),
      str('High E', 'E', 4, 1),
    ],
  },
  {
    id: 'guitar-dadgad',
    name: 'DADGAD',
    shortName: 'DADGAD',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Open',
    description: 'D A D G A D — Celtic and modal tuning with open drone strings',
    strings: [
      str('Low D', 'D', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  // Alternate
  {
    id: 'guitar-half-step-down',
    name: 'Half Step Down (Eb)',
    shortName: 'Eb Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Alternate',
    description: 'Eb Ab Db Gb Bb Eb — All strings down one semitone for lower tension',
    strings: [
      str('Low D#', 'D#', 2, 6),
      str('G#', 'G#', 2, 5),
      str('C#', 'C#', 3, 4),
      str('F#', 'F#', 3, 3),
      str('A#', 'A#', 3, 2),
      str('High D#', 'D#', 4, 1),
    ],
  },
  {
    id: 'guitar-full-step-down',
    name: 'Full Step Down (D)',
    shortName: 'D Std',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Alternate',
    description: 'D G C F A D — All strings down one full tone',
    strings: [
      str('Low D', 'D', 2, 6),
      str('G', 'G', 2, 5),
      str('C', 'C', 3, 4),
      str('F', 'F', 3, 3),
      str('A', 'A', 3, 2),
      str('High D', 'D', 4, 1),
    ],
  },
  {
    id: 'guitar-all-fourths',
    name: 'All Fourths',
    shortName: 'All 4ths',
    instrumentCompatibility: GUITAR_MODES,
    instrumentFamily: 'guitar',
    category: 'Alternate',
    description: 'E A D G C F — Consistent perfect fourth intervals between all strings',
    strings: [
      str('Low E', 'E', 2, 6),
      str('A', 'A', 2, 5),
      str('D', 'D', 3, 4),
      str('G', 'G', 3, 3),
      str('C', 'C', 4, 2),
      str('High F', 'F', 4, 1),
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
  // Drop / Power
  {
    id: 'bass4-drop-d',
    name: 'Drop D',
    shortName: 'Drop D',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Drop / Power',
    description: 'D A D G — 4th string dropped to low D for heavy sub-bass',
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
    category: 'Drop / Power',
    description: 'C G C F — Deep Drop C for 4-string bass',
    strings: [
      str('Low C', 'C', 1, 4),
      str('G', 'G', 1, 3),
      str('C', 'C', 2, 2),
      str('High F', 'F', 2, 1),
    ],
  },
  // Alternate
  {
    id: 'bass4-half-step-down',
    name: 'Half Step Down (Eb)',
    shortName: 'Eb Std',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Alternate',
    description: 'Eb Ab Db Gb — Down one semitone for 4-string bass',
    strings: [
      str('Low D#', 'D#', 1, 4),
      str('G#', 'G#', 1, 3),
      str('C#', 'C#', 2, 2),
      str('High F#', 'F#', 2, 1),
    ],
  },
  {
    id: 'bass4-full-step-down',
    name: 'Full Step Down (D)',
    shortName: 'D Std',
    instrumentCompatibility: BASS_4_MODES,
    instrumentFamily: 'bass',
    category: 'Alternate',
    description: 'D G C F — Down one whole tone for 4-string bass',
    strings: [
      str('Low D', 'D', 1, 4),
      str('G', 'G', 1, 3),
      str('C', 'C', 2, 2),
      str('High F', 'F', 2, 1),
    ],
  },

  // ─── BASS 5-STRING ──────────────────────────────────────────────────────
  // Standard
  {
    id: 'bass5-standard',
    name: 'Standard',
    shortName: 'Std',
    instrumentCompatibility: BASS_5_MODES,
    instrumentFamily: 'bass',
    category: 'Standard',
    description: 'B E A D G — Extended low B0 5-string bass tuning',
    strings: [
      str('Low B', 'B', 0, 5),
      str('E', 'E', 1, 4),
      str('A', 'A', 1, 3),
      str('D', 'D', 2, 2),
      str('High G', 'G', 2, 1),
    ],
  },
  // Drop / Power
  {
    id: 'bass5-drop-a',
    name: 'Drop A',
    shortName: 'Drop A',
    instrumentCompatibility: BASS_5_MODES,
    instrumentFamily: 'bass',
    category: 'Drop / Power',
    description: 'A E A D G — Low B string dropped to earth-shaking A0 (27.5 Hz)',
    strings: [
      str('Low A', 'A', 0, 5),
      str('E', 'E', 1, 4),
      str('A', 'A', 1, 3),
      str('D', 'D', 2, 2),
      str('High G', 'G', 2, 1),
    ],
  },
  // Alternate
  {
    id: 'bass5-half-step-down',
    name: 'Half Step Down (Bb)',
    shortName: 'Bb Std',
    instrumentCompatibility: BASS_5_MODES,
    instrumentFamily: 'bass',
    category: 'Alternate',
    description: 'Bb Eb Ab Db Gb — All 5 strings down one semitone',
    strings: [
      str('Low A#', 'A#', 0, 5),
      str('D#', 'D#', 1, 4),
      str('G#', 'G#', 1, 3),
      str('C#', 'C#', 2, 2),
      str('High F#', 'F#', 2, 1),
    ],
  },
  {
    id: 'bass5-high-c',
    name: 'High C Tenor',
    shortName: 'High C',
    instrumentCompatibility: BASS_5_MODES,
    instrumentFamily: 'bass',
    category: 'Alternate',
    description: 'E A D G C — Soloist tuning replacing low B with high C3 string',
    strings: [
      str('Low E', 'E', 1, 5),
      str('A', 'A', 1, 4),
      str('D', 'D', 2, 3),
      str('G', 'G', 2, 2),
      str('High C', 'C', 3, 1),
    ],
  },
];

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
  if (mode === 'bass-4') {
    return (
      CANONICAL_TUNINGS.find((t) => t.id === 'bass4-standard') || CANONICAL_TUNINGS[0]
    );
  }
  if (mode === 'bass-5') {
    return (
      CANONICAL_TUNINGS.find((t) => t.id === 'bass5-standard') || CANONICAL_TUNINGS[0]
    );
  }
  return (
    CANONICAL_TUNINGS.find((t) => t.id === 'guitar-standard') || CANONICAL_TUNINGS[0]
  );
}

/**
 * Resolves a tuning by its unique ID.
 */
export function getTuningById(id?: string | null): InstrumentTuningDefinition | undefined {
  if (!id) return undefined;
  return CANONICAL_TUNINGS.find((t) => t.id === id);
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
    'Drop / Power': [],
    Open: [],
    Alternate: [],
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
  'Drop / Power',
  'Open',
  'Alternate',
] as const;
