import type {
  InstrumentStringTarget,
  GuitarStringTarget,
  InstrumentTuningMode,
  PitchMetrics,
  TuningStatus,
} from './tunerTypes';
import { DRUM_PARTS, getDrumStringTarget } from './drumTuningModels';

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

export const STANDARD_GUITAR_STRINGS: readonly InstrumentStringTarget[] = [
  { name: 'Low E', note: 'E', octave: 2, fullName: 'E2', frequency: 82.41, stringNumber: 6 },
  { name: 'A', note: 'A', octave: 2, fullName: 'A2', frequency: 110.0, stringNumber: 5 },
  { name: 'D', note: 'D', octave: 3, fullName: 'D3', frequency: 146.83, stringNumber: 4 },
  { name: 'G', note: 'G', octave: 3, fullName: 'G3', frequency: 196.0, stringNumber: 3 },
  { name: 'B', note: 'B', octave: 3, fullName: 'B3', frequency: 246.94, stringNumber: 2 },
  { name: 'High E', note: 'E', octave: 4, fullName: 'E4', frequency: 329.63, stringNumber: 1 },
];

export const STANDARD_BASS_4_STRINGS: readonly InstrumentStringTarget[] = [
  { name: 'E', note: 'E', octave: 1, fullName: 'E1', frequency: 41.20, stringNumber: 4 },
  { name: 'A', note: 'A', octave: 1, fullName: 'A1', frequency: 55.00, stringNumber: 3 },
  { name: 'D', note: 'D', octave: 2, fullName: 'D2', frequency: 73.42, stringNumber: 2 },
  { name: 'G', note: 'G', octave: 2, fullName: 'G2', frequency: 98.00, stringNumber: 1 },
];

/**
 * Returns canonical string targets for an instrument mode.
 */
export function getTargetStringsForMode(mode: InstrumentTuningMode): readonly InstrumentStringTarget[] {
  if (mode === 'drum') return DRUM_PARTS.map((p) => getDrumStringTarget(p, 'normal'));
  if (mode === 'bass-4') return STANDARD_BASS_4_STRINGS;
  return STANDARD_GUITAR_STRINGS;
}

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
 * @param mode Current instrument tuning mode
 * @param manualTarget Optional locked manual string target
 */
export function calculatePitchMetrics(
  frequency: number,
  confidence: number = 1.0,
  rms: number = 0.1,
  refA4: number = 440,
  inTuneToleranceCents: number = 3.5,
  isCurrentlyInTune: boolean = false,
  exitToleranceCents: number = 4.5,
  mode: InstrumentTuningMode = 'electric',
  manualTarget: InstrumentStringTarget | null = null,
  activeStrings?: readonly InstrumentStringTarget[]
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
      nearestString: null,
      nearestGuitarString: null,
      midiNote: 0,
      targetStringLocked: Boolean(manualTarget),
    };
  }

  // Exact MIDI note number calculation: M = 69 + 12 * log2(f / 440)
  const midiNote = 12 * Math.log2(frequency / refA4) + 69;
  const roundedMidi = Math.round(midiNote);

  // If a manual string target is locked by the user, calculate cents relative to that exact target
  let targetFrequency: number;
  let cents: number;
  let noteName: string;
  let octave: number;
  let fullName: string;
  let activeString: InstrumentStringTarget | null;

  if (manualTarget) {
    const scale = refA4 / 440;
    targetFrequency = Number((manualTarget.frequency * scale).toFixed(2));
    cents = 1200 * Math.log2(frequency / targetFrequency);
    noteName = manualTarget.note;
    octave = manualTarget.octave;
    fullName = manualTarget.fullName;
    activeString = manualTarget;
  } else {
    // AUTO Mode: First check if frequency matches a string in the active tuning
    activeString = findNearestString(frequency, mode, null, activeStrings);

    if (activeString) {
      const scale = refA4 / 440;
      targetFrequency = Number((activeString.frequency * scale).toFixed(2));
      cents = 1200 * Math.log2(frequency / targetFrequency);
      noteName = activeString.note;
      octave = activeString.octave;
      fullName = activeString.fullName;
    } else {
      // Fallback Chromatic Mode: target is the nearest 12-TET semitone
      targetFrequency = refA4 * Math.pow(2, (roundedMidi - 69) / 12);
      cents = 1200 * Math.log2(frequency / targetFrequency);

      const noteIdx = ((roundedMidi % 12) + 12) % 12;
      noteName = CHROMATIC_NOTE_NAMES[noteIdx];
      octave = Math.floor(roundedMidi / 12) - 1;
      fullName = `${noteName}${octave}`;
    }
  }

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
    nearestString: activeString,
    nearestGuitarString: activeString, // backward compatibility
    midiNote: roundedMidi,
    targetStringLocked: Boolean(manualTarget),
  };
}

/**
 * Find the nearest string target for any instrument mode or custom active tuning.
 */
export function findNearestString(
  frequency: number,
  mode: InstrumentTuningMode = 'electric',
  manualTarget: InstrumentStringTarget | null = null,
  activeStrings?: readonly InstrumentStringTarget[]
): InstrumentStringTarget | null {
  if (manualTarget) return manualTarget;
  if (frequency <= 0 || !Number.isFinite(frequency)) return null;

  const strings = activeStrings || getTargetStringsForMode(mode);
  let nearest: InstrumentStringTarget | null = null;
  let minCentsDiff = Infinity;

  for (const str of strings) {
    const diff = Math.abs(1200 * Math.log2(frequency / str.frequency));
    if (diff < minCentsDiff) {
      minCentsDiff = diff;
      nearest = str;
    }
  }

  // Bind to string if within 220 cents (approx whole tone+) of target string frequency
  return minCentsDiff <= 220 ? nearest : null;
}

/**
 * Backward-compatible helper for guitar-specific lookups.
 */
export function findNearestGuitarString(frequency: number): GuitarStringTarget | null {
  return findNearestString(frequency, 'electric');
}


/**
 * Combined single-pass calculation of RMS energy and Peak amplitude.
 * Reduces 2,048 memory array accesses and CPU branch operations per frame.
 */
export function calculateRmsAndPeak(buffer: Float32Array): { rms: number; peak: number } {
  let sumSq = 0;
  let max = 0;
  const len = buffer.length;
  for (let i = 0; i < len; i++) {
    const sample = buffer[i];
    sumSq += sample * sample;
    const abs = Math.abs(sample);
    if (abs > max) max = abs;
  }
  return { rms: Math.sqrt(sumSq / len), peak: max };
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
