import { describe, it, expect } from 'vitest';
import {
  calculatePitchMetrics,
  findNearestGuitarString,
  calculateRms,
  calculatePeak,
  STANDARD_GUITAR_STRINGS,
  CHROMATIC_NOTE_NAMES,
} from '../src/lib/tuner/pitchMath';

describe('Tuner Pitch Math & Detection Calculations', () => {
  describe('Standard Reference Pitch (A4 = 440 Hz)', () => {
    it('accurately identifies exact A4 at 440 Hz', () => {
      const metrics = calculatePitchMetrics(440.0);
      expect(metrics.noteName).toBe('A');
      expect(metrics.octave).toBe(4);
      expect(metrics.fullName).toBe('A4');
      expect(metrics.targetFrequency).toBe(440.0);
      expect(Math.abs(metrics.cents)).toBeLessThan(0.01);
      expect(metrics.tuningStatus).toBe('in_tune');
    });

    it('correctly detects slightly flat pitch (-19.78 cents at 435 Hz)', () => {
      const metrics = calculatePitchMetrics(435.0);
      expect(metrics.noteName).toBe('A');
      expect(metrics.fullName).toBe('A4');
      expect(metrics.cents).toBeCloseTo(-19.78, 1);
      expect(metrics.tuningStatus).toBe('flat');
    });

    it('correctly detects slightly sharp pitch (+19.56 cents at 445 Hz)', () => {
      const metrics = calculatePitchMetrics(445.0);
      expect(metrics.noteName).toBe('A');
      expect(metrics.fullName).toBe('A4');
      expect(metrics.cents).toBeCloseTo(19.56, 1);
      expect(metrics.tuningStatus).toBe('sharp');
    });

    it('considers pitches within +/- 3.5 cents as in_tune', () => {
      // 440.8 Hz is ~ +3.14 cents
      const sharpInTune = calculatePitchMetrics(440.8, 1.0, 0.1, 440, 3.5);
      expect(sharpInTune.cents).toBeCloseTo(3.14, 1);
      expect(sharpInTune.tuningStatus).toBe('in_tune');

      // 439.2 Hz is ~ -3.15 cents
      const flatInTune = calculatePitchMetrics(439.2, 1.0, 0.1, 440, 3.5);
      expect(flatInTune.cents).toBeCloseTo(-3.15, 1);
      expect(flatInTune.tuningStatus).toBe('in_tune');
    });

    it('applies hysteresis when currently in-tune', () => {
      // 441.0 Hz is ~ +3.92 cents.
      // Outside 3.5 initial tolerance, but inside 4.5 exit tolerance
      const notInTuneInitially = calculatePitchMetrics(441.0, 1.0, 0.1, 440, 3.5, false, 4.5);
      expect(notInTuneInitially.tuningStatus).toBe('sharp');

      const stayingInTuneWithHysteresis = calculatePitchMetrics(441.0, 1.0, 0.1, 440, 3.5, true, 4.5);
      expect(stayingInTuneWithHysteresis.tuningStatus).toBe('in_tune');

      // 441.3 Hz is ~ +5.1 cents, outside exit tolerance
      const exitingInTune = calculatePitchMetrics(441.3, 1.0, 0.1, 440, 3.5, true, 4.5);
      expect(exitingInTune.tuningStatus).toBe('sharp');
    });
  });

  describe('Standard 6-String Guitar Notes', () => {
    const testStrings = [
      { name: 'Low E', fullName: 'E2', freq: 82.41, stringNumber: 6 },
      { name: 'A', fullName: 'A2', freq: 110.0, stringNumber: 5 },
      { name: 'D', fullName: 'D3', freq: 146.83, stringNumber: 4 },
      { name: 'G', fullName: 'G3', freq: 196.0, stringNumber: 3 },
      { name: 'B', fullName: 'B3', freq: 246.94, stringNumber: 2 },
      { name: 'High E', fullName: 'E4', freq: 329.63, stringNumber: 1 },
    ];

    testStrings.forEach((str) => {
      it(`accurately detects ${str.fullName} (${str.name}) at ${str.freq} Hz`, () => {
        const metrics = calculatePitchMetrics(str.freq);
        expect(metrics.fullName).toBe(str.fullName);
        expect(Math.abs(metrics.cents)).toBeLessThan(0.1);
        expect(metrics.tuningStatus).toBe('in_tune');
        expect(metrics.nearestGuitarString).not.toBeNull();
        expect(metrics.nearestGuitarString?.fullName).toBe(str.fullName);
        expect(metrics.nearestGuitarString?.stringNumber).toBe(str.stringNumber);
      });
    });
  });

  describe('Standard 4-String and 5-String Bass Notes', () => {
    const bassStrings = [
      { name: 'Low B', fullName: 'B0', freq: 30.87, stringNumber: 5, mode: 'bass-5' as const },
      { name: 'E', fullName: 'E1', freq: 41.20, stringNumber: 4, mode: 'bass-4' as const },
      { name: 'A', fullName: 'A1', freq: 55.00, stringNumber: 3, mode: 'bass-4' as const },
      { name: 'D', fullName: 'D2', freq: 73.42, stringNumber: 2, mode: 'bass-4' as const },
      { name: 'G', fullName: 'G2', freq: 98.00, stringNumber: 1, mode: 'bass-4' as const },
    ];

    bassStrings.forEach((str) => {
      it(`accurately detects bass string ${str.fullName} at ${str.freq} Hz in ${str.mode}`, () => {
        const metrics = calculatePitchMetrics(
          str.freq,
          1.0,
          0.1,
          440,
          3.5,
          false,
          4.5,
          str.mode
        );
        expect(metrics.fullName).toBe(str.fullName);
        expect(Math.abs(metrics.cents)).toBeLessThan(0.15);
        expect(metrics.tuningStatus).toBe('in_tune');
        expect(metrics.nearestString).not.toBeNull();
        expect(metrics.nearestString?.fullName).toBe(str.fullName);
        expect(metrics.nearestString?.stringNumber).toBe(str.stringNumber);
      });
    });
  });

  describe('Manual String Target Locking', () => {
    it('calculates cents deviation specifically relative to the locked target string', () => {
      const lockedTarget = {
        name: 'A',
        note: 'A',
        octave: 2,
        fullName: 'A2',
        frequency: 110.0,
        stringNumber: 5,
      };

      // Play a detuned pitch near 108.0 Hz (~ -31.7 cents from A2)
      const metrics = calculatePitchMetrics(
        108.0,
        1.0,
        0.1,
        440,
        3.5,
        false,
        4.5,
        'electric',
        lockedTarget
      );

      expect(metrics.targetStringLocked).toBe(true);
      expect(metrics.fullName).toBe('A2');
      expect(metrics.targetFrequency).toBe(110.0);
      expect(metrics.cents).toBeCloseTo(-31.7, 1);
      expect(metrics.tuningStatus).toBe('flat');
    });
  });

  describe('findNearestGuitarString & findNearestString', () => {
    it('matches Low E string when detuned by -50 cents', () => {
      // 82.41 * 2^(-50/1200) = ~80.06 Hz
      const detunedLowE = 82.41 * Math.pow(2, -50 / 1200);
      const str = findNearestGuitarString(detunedLowE);
      expect(str).not.toBeNull();
      expect(str?.fullName).toBe('E2');
      expect(str?.stringNumber).toBe(6);
    });

    it('returns null for pitches far from any guitar string (e.g. F#2 ~92.5 Hz)', () => {
      const farPitch = 92.5; // halfway between E2 (82.4) and A2 (110)
      const str = findNearestGuitarString(farPitch);
      expect(str).toBeNull();
    });
  });

  describe('RMS and Peak calculations', () => {
    it('calculates RMS for a pure sine wave', () => {
      const size = 1000;
      const buf = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        buf[i] = Math.sin((2 * Math.PI * i) / 100);
      }
      const rms = calculateRms(buf);
      // Sine wave RMS should be approx 1 / sqrt(2) = 0.7071
      expect(rms).toBeCloseTo(0.7071, 2);
    });

    it('calculates peak amplitude', () => {
      const buf = new Float32Array([0.1, -0.4, 0.85, -0.92, 0.3]);
      expect(calculatePeak(buf)).toBeCloseTo(0.92, 4);
    });

    it('handles silence gracefully', () => {
      const silentBuf = new Float32Array(512);
      expect(calculateRms(silentBuf)).toBe(0);
      expect(calculatePeak(silentBuf)).toBe(0);

      const metrics = calculatePitchMetrics(0);
      expect(metrics.tuningStatus).toBe('silent');
      expect(metrics.fullName).toBe('-');
    });
  });
});
