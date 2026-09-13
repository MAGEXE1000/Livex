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

    it('provides tunings for 5-string bass', () => {
      const tunings = getTuningsForMode('bass-5');
      expect(tunings.length).toBeGreaterThanOrEqual(3);
      const ids = tunings.map((t) => t.id);
      expect(ids).toContain('bass5-standard');
      expect(ids).toContain('bass5-drop-a');
    });
  });

  describe('Category Groupings', () => {
    it('groups guitar tunings into Standard, Drop / Power, Open, and Alternate', () => {
      const grouped = getTuningsByCategory('electric');
      for (const cat of TUNING_CATEGORIES) {
        expect(grouped[cat]).toBeDefined();
        expect(grouped[cat].length).toBeGreaterThanOrEqual(1);
      }

      expect(grouped['Standard'][0].id).toBe('guitar-standard');
      expect(grouped['Drop / Power'].some((t) => t.id === 'guitar-drop-d')).toBe(true);
      expect(grouped['Open'].some((t) => t.id === 'guitar-open-g')).toBe(true);
      expect(grouped['Alternate'].some((t) => t.id === 'guitar-dadgad')).toBe(true);
    });
  });

  describe('Drop D Specific Targets & Calculations', () => {
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

    it('identifies D2 as nearest string in calculatePitchMetrics when Drop D strings are active', () => {
      const dropD = getTuningById('guitar-drop-d')!;
      // D2 is ~73.42 Hz
      const metrics = calculatePitchMetrics(
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

      expect(metrics.fullName).toBe('D2');
      expect(metrics.tuningStatus).toBe('in_tune');
      expect(metrics.nearestString).not.toBeNull();
      expect(metrics.nearestString!.stringNumber).toBe(6);
      expect(metrics.nearestString!.fullName).toBe('D2');
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
