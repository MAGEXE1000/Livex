import { describe, it, expect } from 'vitest';
import {
  getTuningsForMode,
  getDefaultTuningForMode,
  getTuningById,
  getTuningsByCategory,
  TUNING_CATEGORIES,
} from '../src/lib/tuner/tuningDefinitions';
import { calculatePitchMetrics } from '../src/lib/tuner/pitchMath';
import { noteNameToMidi } from '../src/lib/tuner/tunerReferenceAudio';
import { TunerAudioEngine } from '../src/lib/tuner/tunerAudioEngine';

describe('Tuning Definitions & Registry', () => {
  describe('Mode-Specific Tunings', () => {
    it('provides rich tuning selections for electric guitar', () => {
      const tunings = getTuningsForMode('electric');
      expect(tunings.length).toBeGreaterThanOrEqual(10);

      const ids = tunings.map((t) => t.id);
      expect(ids).toContain('guitar-standard');
      expect(ids).toContain('guitar-drop-d');
      expect(ids).toContain('guitar-drop-c');
      expect(ids).toContain('guitar-dadgad');
      expect(ids).toContain('guitar-open-g');
      expect(ids).toContain('guitar-half-step-down');
    });

    it('provides tunings for acoustic guitar', () => {
      const tunings = getTuningsForMode('acoustic');
      expect(tunings.length).toBeGreaterThanOrEqual(10);
      const defaultTuning = getDefaultTuningForMode('acoustic');
      expect(defaultTuning.id).toBe('guitar-standard');
    });

    it('provides tunings for 4-string bass', () => {
      const tunings = getTuningsForMode('bass-4');
      expect(tunings.length).toBeGreaterThanOrEqual(4);
      const ids = tunings.map((t) => t.id);
      expect(ids).toContain('bass4-standard');
      expect(ids).toContain('bass4-drop-d');
      expect(ids).toContain('bass4-half-step-down');
    });

    it('resolves legacy bass-5 IDs via aliases to bass-4 tunings', () => {
      expect(getTuningById('bass5-standard')?.id).toBe('bass4-standard');
      expect(getTuningById('bass5-drop-a')?.id).toBe('bass4-drop-d');
      expect(getTuningById('bass5-half-step-down')?.id).toBe('bass4-half-step-down');
      expect(getTuningById('bass5-high-c')?.id).toBe('bass4-standard');
    });
  });

  describe('Category Groupings', () => {
    it('groups guitar tunings into Standard, Drop, Down-Tuned, and Open', () => {
      const grouped = getTuningsByCategory('electric');
      for (const cat of TUNING_CATEGORIES) {
        expect(grouped[cat]).toBeDefined();
        expect(grouped[cat].length).toBeGreaterThanOrEqual(1);
      }

      expect(grouped['Standard'][0].id).toBe('guitar-standard');
      expect(grouped['Drop'].some((t) => t.id === 'guitar-drop-d')).toBe(true);
      expect(grouped['Down-Tuned'].some((t) => t.id === 'guitar-d-standard')).toBe(true);
      expect(grouped['Open'].some((t) => t.id === 'guitar-open-g')).toBe(true);
    });
  });

  describe('Alternate Tunings Specific Targets & Calculations', () => {
    it('has string 6 tuned to D2 at ~73.42 Hz in Drop D', () => {
      const dropD = getTuningById('guitar-drop-d');
      expect(dropD).toBeDefined();

      const string6 = dropD!.strings.find((s) => s.stringNumber === 6);
      expect(string6).toBeDefined();
      expect(string6!.note).toBe('D');
      expect(string6!.octave).toBe(2);
      expect(string6!.fullName).toBe('D2');
      expect(string6!.frequency).toBeCloseTo(73.42, 1);
    });

    it('identifies D2 as nearest string and calculates cents against D2 target frequency when Drop D is active', () => {
      const dropD = getTuningById('guitar-drop-d')!;
      // Exact D2 target is ~73.42 Hz
      const inTuneMetrics = calculatePitchMetrics(
        73.42,
        1.0,
        0.1,
        440,
        3.5,
        false,
        4.5,
        'electric',
        null,
        dropD.strings
      );

      expect(inTuneMetrics.fullName).toBe('D2');
      expect(inTuneMetrics.targetFrequency).toBeCloseTo(73.42, 1);
      expect(inTuneMetrics.tuningStatus).toBe('in_tune');
      expect(Math.abs(inTuneMetrics.cents)).toBeLessThan(1.0);
      expect(inTuneMetrics.nearestString).not.toBeNull();
      expect(inTuneMetrics.nearestString!.stringNumber).toBe(6);
      expect(inTuneMetrics.nearestString!.fullName).toBe('D2');

      // Sharp by 1 Hz (74.42 Hz) evaluates against D2 (73.42 Hz) target
      const sharpMetrics = calculatePitchMetrics(
        74.42,
        1.0,
        0.1,
        440,
        3.5,
        false,
        4.5,
        'electric',
        null,
        dropD.strings
      );
      expect(sharpMetrics.fullName).toBe('D2');
      expect(sharpMetrics.targetFrequency).toBeCloseTo(73.42, 1);
      expect(sharpMetrics.cents).toBeGreaterThan(15);
      expect(sharpMetrics.tuningStatus).toBe('sharp');
    });

    it('verifies D Standard targets on electric guitar (D2 G2 C3 F3 A3 D4)', () => {
      const dStd = getTuningById('guitar-d-standard')!;
      expect(dStd).toBeDefined();
      expect(dStd.strings.map((s) => s.fullName)).toEqual(['D2', 'G2', 'C3', 'F3', 'A3', 'D4']);
      expect(dStd.strings[0].frequency).toBeCloseTo(73.42, 1); // D2
      expect(dStd.strings[5].frequency).toBeCloseTo(293.66, 1); // D4
    });

    it('verifies Drop C targets on electric guitar (C2 G2 C3 F3 A3 D4)', () => {
      const dropC = getTuningById('guitar-drop-c')!;
      expect(dropC).toBeDefined();
      expect(dropC.strings.map((s) => s.fullName)).toEqual(['C2', 'G2', 'C3', 'F3', 'A3', 'D4']);
      expect(dropC.strings[0].frequency).toBeCloseTo(65.41, 1); // C2
    });

    it('verifies 4-string bass standard (E1 A1 D2 G2) and Drop D (D1 A1 D2 G2)', () => {
      const bassStd = getTuningById('bass4-standard')!;
      expect(bassStd).toBeDefined();
      expect(bassStd.strings.map((s) => s.fullName)).toEqual(['E1', 'A1', 'D2', 'G2']);
      expect(bassStd.strings[0].frequency).toBeCloseTo(41.20, 1);

      const bassDropD = getTuningById('bass4-drop-d')!;
      expect(bassDropD).toBeDefined();
      expect(bassDropD.strings.map((s) => s.fullName)).toEqual(['D1', 'A1', 'D2', 'G2']);
      expect(bassDropD.strings[0].frequency).toBeCloseTo(36.71, 1);
    });
  });

  describe('MIDI Note Conversion', () => {
    it('converts standard note names with octaves to accurate MIDI note numbers', () => {
      expect(noteNameToMidi('C4')).toBe(60);
      expect(noteNameToMidi('A4')).toBe(69);
      expect(noteNameToMidi('E2')).toBe(40);
      expect(noteNameToMidi('D2')).toBe(38);
      expect(noteNameToMidi('B0')).toBe(23);
      expect(noteNameToMidi('Eb2')).toBe(39);
      expect(noteNameToMidi('D#2')).toBe(39);
    });
  });

  describe('TunerAudioEngine Tuning Integration', () => {
    it('initializes with default tuning and allows setting custom tuning', () => {
      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
      });

      expect(engine.getActiveTuning().id).toBe('guitar-standard');

      engine.setTuning('guitar-drop-d');
      expect(engine.getActiveTuning().id).toBe('guitar-drop-d');
      expect(engine.getActiveTuning().name).toBe('Drop D');

      // Mode switch resets or validates tuning
      engine.setMode('bass-4');
      expect(engine.getMode()).toBe('bass-4');
      expect(engine.getActiveTuning().id).toBe('bass4-standard');

      engine.destroy();
    });
  });
});
