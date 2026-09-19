export type SaxophoneVariant = 'alto' | 'tenor' | 'baritone';

export interface SaxVariantInfo {
  id: SaxophoneVariant;
  name: string;
  key: 'Eb' | 'Bb';
  octaveOffset: number; // Semitones from concert pitch
  description: string;
}

export const SAX_VARIANTS: Record<SaxophoneVariant, SaxVariantInfo> = {
  alto: {
    id: 'alto',
    name: 'Alto Saxophone',
    key: 'Eb',
    octaveOffset: -9, // Concert pitch = Transposed pitch - 9 semitones
    description: 'E♭ Transposing Instrument (Concert C4 = Written A4)',
  },
  tenor: {
    id: 'tenor',
    name: 'Tenor Saxophone',
    key: 'Bb',
    octaveOffset: -14, // Concert pitch = Transposed pitch - 14 semitones
    description: 'B♭ Transposing Instrument (Concert C4 = Written D5)',
  },
  baritone: {
    id: 'baritone',
    name: 'Baritone Saxophone',
    key: 'Eb',
    octaveOffset: -21, // Concert pitch = Transposed pitch - 21 semitones
    description: 'E♭ Low Transposing Instrument (Concert C3 = Written A4)',
  },
};

export type SaxKeyId =
  | 'octave'
  | 'lh_d'
  | 'lh_eb'
  | 'lh_f'
  | 'front_f'
  | 'lh1'
  | 'bis'
  | 'lh2'
  | 'lh3'
  | 'lh_gsharp'
  | 'lh_low_gsharp'
  | 'lh_low_csharp'
  | 'lh_low_b'
  | 'lh_low_bb'
  | 'rh1'
  | 'rh2'
  | 'rh3'
  | 'rh_side_e'
  | 'rh_side_c'
  | 'rh_side_bb'
  | 'rh_low_c'
  | 'rh_low_eb';

export interface SaxFingering {
  writtenNote: string;      // e.g. "A4", "F#5", "Bb4"
  displayNote: string;      // e.g. "A4", "F♯5", "B♭4"
  midiNote: number;         // Written MIDI note (e.g. C4 = 60)
  keys: SaxKeyId[];         // Keys pressed for standard fingering
  alternateKeys?: SaxKeyId[][]; // Alternate fingerings
  isTrill?: boolean;
  trillKey?: SaxKeyId;
  description: string;
}

// Complete Standard Saxophone Fingering Chart (Written Pitch C4–F#6)
export const SAX_FINGERINGS: SaxFingering[] = [
  {
    writtenNote: 'Bb3',
    displayNote: 'A♯3 / B♭3',
    midiNote: 58,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'rh_low_c', 'lh_low_b', 'lh_low_bb'],
    description: 'Low B♭: All main keys + Low C + Low B + Low B♭ pinky keys.',
  },
  {
    writtenNote: 'B3',
    displayNote: 'B3',
    midiNote: 59,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'rh_low_c', 'lh_low_b'],
    description: 'Low B: All main keys + Low C + Low B pinky key.',
  },
  {
    writtenNote: 'C4',
    displayNote: 'C4',
    midiNote: 60,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'rh_low_c'],
    description: 'Low C: All 6 main stack keys + Right Hand Low C pinky key.',
  },
  {
    writtenNote: 'C#4',
    displayNote: 'C♯4 / D♭4',
    midiNote: 61,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'lh_low_csharp'],
    description: 'Low C♯: All main keys + LH Low C♯ pinky key.',
  },
  {
    writtenNote: 'D4',
    displayNote: 'D4',
    midiNote: 62,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3'],
    description: 'Low D: All 6 main stack keys closed (3 LH + 3 RH).',
  },
  {
    writtenNote: 'Eb4',
    displayNote: 'D♯4 / E♭4',
    midiNote: 63,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'rh_low_eb'],
    description: 'Low E♭: All 6 main stack keys + RH Low E♭ pinky key.',
  },
  {
    writtenNote: 'E4',
    displayNote: 'E4',
    midiNote: 64,
    keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2'],
    description: 'E4: LH 1-2-3 + RH 1-2.',
  },
  {
    writtenNote: 'F4',
    displayNote: 'F4',
    midiNote: 65,
    keys: ['lh1', 'lh2', 'lh3', 'rh1'],
    description: 'F4: LH 1-2-3 + RH 1.',
  },
  {
    writtenNote: 'F#4',
    displayNote: 'F♯4 / G♭4',
    midiNote: 66,
    keys: ['lh1', 'lh2', 'lh3', 'rh2'],
    alternateKeys: [['lh1', 'lh2', 'lh3', 'rh1', 'rh_side_bb']],
    description: 'F♯4: LH 1-2-3 + RH 2 (Middle F♯).',
  },
  {
    writtenNote: 'G4',
    displayNote: 'G4',
    midiNote: 67,
    keys: ['lh1', 'lh2', 'lh3'],
    description: 'G4: Left Hand 1-2-3 closed.',
  },
  {
    writtenNote: 'G#4',
    displayNote: 'G♯4 / A♭4',
    midiNote: 68,
    keys: ['lh1', 'lh2', 'lh3', 'lh_gsharp'],
    description: 'G♯4: LH 1-2-3 + LH G♯ pinky key.',
  },
  {
    writtenNote: 'A4',
    displayNote: 'A4',
    midiNote: 69,
    keys: ['lh1', 'lh2'],
    description: 'A4: Left Hand 1 and 2.',
  },
  {
    writtenNote: 'Bb4',
    displayNote: 'A♯4 / B♭4',
    midiNote: 70,
    keys: ['lh1', 'bis'],
    alternateKeys: [
      ['lh1', 'rh1'], // 1+1 Bb
      ['lh1', 'lh2', 'rh_side_bb'], // Side Bb
    ],
    description: 'B♭4: LH 1 + Bis key (or 1+1 or Side B♭).',
  },
  {
    writtenNote: 'B4',
    displayNote: 'B4',
    midiNote: 71,
    keys: ['lh1'],
    description: 'B4: Left Hand 1 (Index finger).',
  },
  {
    writtenNote: 'C5',
    displayNote: 'C5',
    midiNote: 72,
    keys: ['lh2'],
    alternateKeys: [['lh1', 'rh_side_c']],
    description: 'C5: Left Hand 2 (Middle finger).',
  },
  {
    writtenNote: 'C#5',
    displayNote: 'C♯5 / D♭5',
    midiNote: 73,
    keys: [],
    description: 'C♯5: Open (No main keys pressed).',
  },
  {
    writtenNote: 'D5',
    displayNote: 'D5',
    midiNote: 74,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3'],
    description: 'Middle D: Octave key + All 6 main stack keys.',
  },
  {
    writtenNote: 'Eb5',
    displayNote: 'D♯5 / E♭5',
    midiNote: 75,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3', 'rh_low_eb'],
    description: 'Middle E♭: Octave key + 6 main keys + RH Low E♭.',
  },
  {
    writtenNote: 'E5',
    displayNote: 'E5',
    midiNote: 76,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'rh1', 'rh2'],
    description: 'E5: Octave key + LH 1-2-3 + RH 1-2.',
  },
  {
    writtenNote: 'F5',
    displayNote: 'F5',
    midiNote: 77,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'rh1'],
    description: 'F5: Octave key + LH 1-2-3 + RH 1.',
  },
  {
    writtenNote: 'F#5',
    displayNote: 'F♯5 / G♭5',
    midiNote: 78,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'rh2'],
    description: 'F♯5: Octave key + LH 1-2-3 + RH 2.',
  },
  {
    writtenNote: 'G5',
    displayNote: 'G5',
    midiNote: 79,
    keys: ['octave', 'lh1', 'lh2', 'lh3'],
    description: 'G5: Octave key + LH 1-2-3.',
  },
  {
    writtenNote: 'G#5',
    displayNote: 'G♯5 / A♭5',
    midiNote: 80,
    keys: ['octave', 'lh1', 'lh2', 'lh3', 'lh_gsharp'],
    description: 'G♯5: Octave key + LH 1-2-3 + G♯ pinky key.',
  },
  {
    writtenNote: 'A5',
    displayNote: 'A5',
    midiNote: 81,
    keys: ['octave', 'lh1', 'lh2'],
    description: 'A5: Octave key + LH 1-2.',
  },
  {
    writtenNote: 'Bb5',
    displayNote: 'A♯5 / B♭5',
    midiNote: 82,
    keys: ['octave', 'lh1', 'bis'],
    alternateKeys: [['octave', 'lh1', 'rh1']],
    description: 'B♭5: Octave key + LH 1 + Bis key.',
  },
  {
    writtenNote: 'B5',
    displayNote: 'B5',
    midiNote: 83,
    keys: ['octave', 'lh1'],
    description: 'B5: Octave key + LH 1.',
  },
  {
    writtenNote: 'C6',
    displayNote: 'C6',
    midiNote: 84,
    keys: ['octave', 'lh2'],
    description: 'C6: Octave key + LH 2.',
  },
  {
    writtenNote: 'C#6',
    displayNote: 'C♯6 / D♭6',
    midiNote: 85,
    keys: ['octave'],
    description: 'High C♯: Octave key open.',
  },
  {
    writtenNote: 'D6',
    displayNote: 'D6',
    midiNote: 86,
    keys: ['octave', 'lh_d'],
    description: 'High D: Octave key + Left Palm D key.',
  },
  {
    writtenNote: 'Eb6',
    displayNote: 'D♯6 / E♭6',
    midiNote: 87,
    keys: ['octave', 'lh_d', 'lh_eb'],
    description: 'High E♭: Octave key + LH Palm D + LH Palm E♭ key.',
  },
  {
    writtenNote: 'E6',
    displayNote: 'E6',
    midiNote: 88,
    keys: ['octave', 'lh_d', 'lh_eb', 'rh_side_e'],
    description: 'High E: Octave key + Palm D + Palm E♭ + RH Side E key.',
  },
  {
    writtenNote: 'F6',
    displayNote: 'F6',
    midiNote: 89,
    keys: ['octave', 'lh_d', 'lh_eb', 'lh_f', 'rh_side_e'],
    alternateKeys: [['octave', 'front_f', 'lh2', 'lh3']],
    description: 'High F: Octave key + Palm D + Palm E♭ + Palm F + Side E key.',
  },
  {
    writtenNote: 'F#6',
    displayNote: 'F♯6 / G♭6',
    midiNote: 90,
    keys: ['octave', 'lh_d', 'lh_eb', 'lh_f', 'rh_side_e'],
    alternateKeys: [['octave', 'front_f', 'lh2', 'rh2']],
    description: 'High F♯: Octave key + Palm keys + High F♯ key.',
  },
];

export function getFingeringForNote(note: string): SaxFingering | undefined {
  const clean = note.replace('♭', 'b').replace('♯', '#').trim();
  return (
    SAX_FINGERINGS.find(
      (f) =>
        f.writtenNote.toLowerCase() === clean.toLowerCase() ||
        f.displayNote.toLowerCase().includes(clean.toLowerCase())
    ) || SAX_FINGERINGS.find((f) => f.writtenNote === 'C4')
  );
}

export function getConcertNote(writtenNote: string, variant: SaxophoneVariant): string {
  const fingering = getFingeringForNote(writtenNote);
  if (!fingering) return writtenNote;
  const offset = SAX_VARIANTS[variant].octaveOffset;
  const concertMidi = fingering.midiNote + offset;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = noteNames[((concertMidi % 12) + 12) % 12];
  const octave = Math.floor(concertMidi / 12) - 1;
  return `${name}${octave}`;
}

export function getConcertFrequency(writtenNote: string, variant: SaxophoneVariant): number {
  const fingering = getFingeringForNote(writtenNote);
  const midi = (fingering ? fingering.midiNote : 60) + SAX_VARIANTS[variant].octaveOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
