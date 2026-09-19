import { describe, it, expect } from 'vitest';
import {
  transposeChordId,
  transposeKeyString,
  formatOffset,
  CHROMATIC,
  CHROMATIC_FLATS,
} from '../transpose';

// ─── transposeChordId ────────────────────────────────────────────────────────

describe('transposeChordId', () => {
  it('returns the same ID when semitones is 0', () => {
    expect(transposeChordId('C-major', 0)).toBe('C-major');
    expect(transposeChordId('F#-min7', 0)).toBe('F#-min7');
  });

  it('transposes up by 1 semitone', () => {
    expect(transposeChordId('C-major', 1)).toBe('C#-major');
    expect(transposeChordId('E-minor', 1)).toBe('F-minor');
    expect(transposeChordId('B-dim', 1)).toBe('C-dim');
  });

  it('transposes up by multiple semitones', () => {
    expect(transposeChordId('C-major', 7)).toBe('G-major');
    expect(transposeChordId('A-min7', 3)).toBe('C-min7');
  });

  it('transposes down (negative semitones)', () => {
    expect(transposeChordId('C-major', -1)).toBe('B-major');
    expect(transposeChordId('D-sus4', -2)).toBe('C-sus4');
    expect(transposeChordId('F-aug', -5)).toBe('C-aug');
  });

  it('wraps around the chromatic scale correctly', () => {
    // Full circle: 12 semitones = same note
    expect(transposeChordId('G-7', 12)).toBe('G-7');
    expect(transposeChordId('A#-maj7', 12)).toBe('A#-maj7');
  });

  it('handles large positive semitone values', () => {
    // 25 semitones = 2 octaves + 1 semitone
    expect(transposeChordId('C-major', 25)).toBe('C#-major');
  });

  it('handles large negative semitone values', () => {
    // -25 semitones should still wrap correctly
    expect(transposeChordId('C#-major', -25)).toBe('C-major');
  });

  it('always returns sharp-notation roots', () => {
    // Even if we start from a flat-notated root via the ROOT_TO_IDX map,
    // the function uses CHROMATIC (sharps). But the input must use the
    // hyphen format. Db is a valid root in ROOT_TO_IDX.
    expect(transposeChordId('Db-minor', 1)).toBe('D-minor');
    expect(transposeChordId('Bb-7', 2)).toBe('C-7');
  });

  it('returns original if no hyphen found', () => {
    expect(transposeChordId('Cmajor', 3)).toBe('Cmajor');
    expect(transposeChordId('', 1)).toBe('');
  });

  it('returns original if root is unrecognized', () => {
    expect(transposeChordId('X-major', 2)).toBe('X-major');
    expect(transposeChordId('H-minor', 1)).toBe('H-minor');
  });

  it('preserves complex chord type suffixes', () => {
    expect(transposeChordId('C-maj7sus4', 2)).toBe('D-maj7sus4');
    expect(transposeChordId('G#-dim7b5', 3)).toBe('B-dim7b5');
  });
});

// ─── transposeKeyString ──────────────────────────────────────────────────────

describe('transposeKeyString', () => {
  it('returns the same key when semitones is 0', () => {
    expect(transposeKeyString('C Major', 0, false)).toBe('C Major');
    expect(transposeKeyString('Am', 0, true)).toBe('Am');
  });

  it('returns empty/falsy key unchanged', () => {
    expect(transposeKeyString('', 5, false)).toBe('');
  });

  it('transposes a simple key up', () => {
    expect(transposeKeyString('C Major', 2, false)).toBe('D Major');
    expect(transposeKeyString('G', 5, false)).toBe('C');
  });

  it('transposes a key with sharp root', () => {
    expect(transposeKeyString('F# Minor', 1, false)).toBe('G Minor');
  });

  it('transposes a key with flat root', () => {
    // Bb = index 10, +2 = index 0 = C (not C#)
    expect(transposeKeyString('Bb Minor', 2, false)).toBe('C Minor');
  });

  it('uses flat notation when preferFlats is true', () => {
    expect(transposeKeyString('C Major', 1, true)).toBe('Db Major');
    expect(transposeKeyString('A', 1, true)).toBe('Bb');
  });

  it('uses sharp notation when preferFlats is false', () => {
    expect(transposeKeyString('C Major', 1, false)).toBe('C# Major');
    expect(transposeKeyString('A', 1, false)).toBe('A#');
  });

  it('handles minor key suffixes', () => {
    // parseKeyRoot('Am') → root='A', rest='m'
    // transposeKeyString joins with space: `${newRoot} ${rest}` → 'C m'
    expect(transposeKeyString('Am', 3, false)).toBe('C m');
    expect(transposeKeyString('Am', 3, true)).toBe('C m');
  });

  it('returns original if root is unrecognizable', () => {
    expect(transposeKeyString('X Minor', 2, false)).toBe('X Minor');
    expect(transposeKeyString('123', 1, false)).toBe('123');
  });

  it('wraps around chromatic scale', () => {
    expect(transposeKeyString('B Major', 1, false)).toBe('C Major');
    expect(transposeKeyString('B Major', 1, true)).toBe('C Major');
  });

  it('transposes down (negative semitones)', () => {
    expect(transposeKeyString('C Major', -1, false)).toBe('B Major');
    expect(transposeKeyString('D Minor', -3, true)).toBe('B Minor');
  });
});

// ─── formatOffset ────────────────────────────────────────────────────────────

describe('formatOffset', () => {
  it('formats zero as ±0', () => {
    expect(formatOffset(0)).toBe('±0');
  });

  it('formats positive offsets with + prefix', () => {
    expect(formatOffset(1)).toBe('+1');
    expect(formatOffset(7)).toBe('+7');
    expect(formatOffset(12)).toBe('+12');
  });

  it('formats negative offsets with - prefix', () => {
    expect(formatOffset(-1)).toBe('-1');
    expect(formatOffset(-5)).toBe('-5');
    expect(formatOffset(-12)).toBe('-12');
  });
});

// ─── CHROMATIC arrays ────────────────────────────────────────────────────────

describe('CHROMATIC constants', () => {
  it('has 12 entries in sharps array', () => {
    expect(CHROMATIC).toHaveLength(12);
  });

  it('has 12 entries in flats array', () => {
    expect(CHROMATIC_FLATS).toHaveLength(12);
  });

  it('sharps and flats arrays agree on natural notes', () => {
    const naturalIndices = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
    for (const i of naturalIndices) {
      expect(CHROMATIC[i]).toBe(CHROMATIC_FLATS[i]);
    }
  });

  it('sharps array uses # for accidentals', () => {
    const sharpIndices = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
    for (const i of sharpIndices) {
      expect(CHROMATIC[i]).toContain('#');
    }
  });

  it('flats array uses b for accidentals', () => {
    const flatIndices = [1, 3, 6, 8, 10]; // Db, Eb, Gb, Ab, Bb
    for (const i of flatIndices) {
      expect(CHROMATIC_FLATS[i]).toContain('b');
    }
  });
});
