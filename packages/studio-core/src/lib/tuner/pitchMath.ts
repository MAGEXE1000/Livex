import type { GuitarStringTarget, PitchMetrics, TuningStatus } from './tunerTypes';

export const CHROMATIC_NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const STANDARD_GUITAR_STRINGS: readonly GuitarStringTarget[] = [
  { name: 'Low E', note: 'E', octave: 2, fullName: 'E2', frequency: 82.41, stringNumber: 6 },
  { name: 'A', note: 'A', octave: 2, fullName: 'A2', frequency: 110.0, stringNumber: 5 },
  { name: 'D', note: 'D', octave: 3, fullName: 'D3', frequency: 146.83, stringNumber: 4 },
  { name: 'G', note: 'G', octave: 3, fullName: 'G3', frequency: 196.0, stringNumber: 3 },
  { name: 'B', note: 'B', octave: 3, fullName: 'B3', frequency: 246.94, stringNumber: 2 },
  { name: 'High E', note: 'E', octave: 4, fullName: 'E4', frequency: 329.63, stringNumber: 1 },
];

/**
 * Calculate exact musical pitch metrics from frequency in Hz.
 *
 * @param frequency Detected fundamental frequency in Hz
 * @param confidence Clarity / confidence score from detector (0.0 - 1.0)
 * @param rms Root-mean-square amplitude of the analyzed audio window
 * @param refA4 Reference concert pitch in Hz (default: 440)
 * @param inTuneToleranceCents Tolerance window for in-tune state in cents (default: 3.5)
 * @param isCurrentlyInTune Whether the previous consecutive frame was already in-tune (for hysteresis)
 * @param exitToleranceCents Exit window for in-tune state in cents (default: 4.5)
 */
export function calculatePitchMetrics(
  frequency: number,
  confidence: number = 1.0,
  rms: number = 0.1,
  refA4: number = 440,
  inTuneToleranceCents: number = 3.5,
  isCurrentlyInTune: boolean = false,
  exitToleranceCents: number = 4.5
): PitchMetrics {
  if (frequency <= 0 || !Number.isFinite(frequency)) {
    return {
      frequency: 0,
      targetFrequency: 0,
      noteName: '-',
      octave: 0,
      fullName: '-',
      cents: 0,
      confidence: 0,
      rms,
      tuningStatus: 'silent',
      nearestGuitarString: null,
      midiNote: 0,
    };
  }

  // Exact MIDI note number calculation: M = 69 + 12 * log2(f / 440)
  const midiNote = 12 * Math.log2(frequency / refA4) + 69;
  const roundedMidi = Math.round(midiNote);

  // Exact target frequency of the closest chromatic semitone
  const targetFrequency = refA4 * Math.pow(2, (roundedMidi - 69) / 12);

  // Mathematically exact cents deviation: cents = 1200 * log2(f / f_target)
  const cents = 1200 * Math.log2(frequency / targetFrequency);

  // Chromatic note name and octave calculation
  const noteIdx = ((roundedMidi % 12) + 12) % 12;
  const noteName = CHROMATIC_NOTE_NAMES[noteIdx];
  const octave = Math.floor(roundedMidi / 12) - 1;
  const fullName = `${noteName}${octave}`;

  // Evaluate in-tune status with hysteresis
  const absCents = Math.abs(cents);
  let tuningStatus: TuningStatus;

  const threshold = isCurrentlyInTune ? exitToleranceCents : inTuneToleranceCents;
  if (absCents <= threshold) {
    tuningStatus = 'in_tune';
  } else if (cents < 0) {
    tuningStatus = 'flat';
  } else {
    tuningStatus = 'sharp';
  }

  // Find nearest guitar string target
  const nearestGuitarString = findNearestGuitarString(frequency);

  return {
    frequency,
    targetFrequency,
    noteName,
    octave,
    fullName,
    cents,
    confidence,
    rms,
    tuningStatus,
    nearestGuitarString,
    midiNote: roundedMidi,
  };
}

/**
 * Find the nearest standard guitar string for a given frequency.
 */
export function findNearestGuitarString(frequency: number): GuitarStringTarget | null {
  if (frequency <= 0 || !Number.isFinite(frequency)) return null;

  let nearest: GuitarStringTarget | null = null;
  let minCentsDiff = Infinity;

  for (const str of STANDARD_GUITAR_STRINGS) {
    const diff = Math.abs(1200 * Math.log2(frequency / str.frequency));
    if (diff < minCentsDiff) {
      minCentsDiff = diff;
      nearest = str;
    }
  }

  // Only bind to string if within 180 cents (approx whole tone) of the target string frequency
  return minCentsDiff <= 180 ? nearest : null;
}

/**
 * Calculate RMS (Root Mean Square) energy of a Float32Array audio frame.
 */
export function calculateRms(buffer: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = buffer[i];
    sumSq += sample * sample;
  }
  return Math.sqrt(sumSq / buffer.length);
}

/**
 * Peak amplitude of a Float32Array audio frame.
 */
export function calculatePeak(buffer: Float32Array): number {
  let max = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > max) max = abs;
  }
  return max;
}
