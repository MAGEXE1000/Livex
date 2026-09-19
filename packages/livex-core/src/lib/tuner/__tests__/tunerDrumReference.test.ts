import { describe, it, expect } from 'vitest';
import {
  HOUSE_KIT_TUNER_ANCHORS,
  preloadTunerReferenceAudio,
  playDrumReferenceSound,
} from '../tunerReferenceAudio';
import { DRUM_PARTS } from '../drumTuningModels';
import { TunerAudioEngine } from '../tunerAudioEngine';

describe('Drumex Tuner Realistic House Kit Reference Audio', () => {
  it('defines authoritative House Kit sample paths and anchor fundamentals for all 5 drum parts', () => {
    const requiredParts = ['snare', 'tom1', 'tom2', 'floorTom', 'kick'] as const;

    for (const partId of requiredParts) {
      const anchor = HOUSE_KIT_TUNER_ANCHORS[partId];
      expect(anchor, `Missing anchor for drum part: ${partId}`).toBeDefined();
      expect(anchor.path).toMatch(/^\/drums\/realistic\//);
      expect(anchor.path).toMatch(/\.opus$/);
      expect(anchor.anchorHz).toBeGreaterThan(30);
      expect(anchor.anchorHz).toBeLessThan(300);
      expect(anchor.duration).toBeGreaterThan(1.0);
    }

    // Exact calibrated anchor frequencies
    expect(HOUSE_KIT_TUNER_ANCHORS.snare.anchorHz).toBe(211.5);
    expect(HOUSE_KIT_TUNER_ANCHORS.tom1.anchorHz).toBe(145.5);
    expect(HOUSE_KIT_TUNER_ANCHORS.tom2.anchorHz).toBe(112.4);
    expect(HOUSE_KIT_TUNER_ANCHORS.floorTom.anchorHz).toBe(72.7);
    expect(HOUSE_KIT_TUNER_ANCHORS.kick.anchorHz).toBe(59.5);
  });

  it('matches all parts in the canonical DRUM_PARTS tuning models', () => {
    const canonicalIds = DRUM_PARTS.map((p) => p.id);
    expect(canonicalIds).toEqual(['snare', 'tom1', 'tom2', 'floorTom', 'kick']);
  });

  it('correctly calculates repitched playback rates for drum tensions', () => {
    // Snare: anchor 211.5 Hz
    // Tight: 260 Hz, Normal: 242 Hz, Loose: 220 Hz
    const snareAnchor = HOUSE_KIT_TUNER_ANCHORS.snare;
    expect(260 / snareAnchor.anchorHz).toBeCloseTo(1.229, 2);
    expect(242 / snareAnchor.anchorHz).toBeCloseTo(1.144, 2);
    expect(220 / snareAnchor.anchorHz).toBeCloseTo(1.040, 2);

    // Tom 1: anchor 145.5 Hz
    // Normal: 150 Hz
    const tom1Anchor = HOUSE_KIT_TUNER_ANCHORS.tom1;
    expect(150 / tom1Anchor.anchorHz).toBeCloseTo(1.031, 2);

    // Tom 2: anchor 112.4 Hz
    // Normal: 110 Hz
    const tom2Anchor = HOUSE_KIT_TUNER_ANCHORS.tom2;
    expect(110 / tom2Anchor.anchorHz).toBeCloseTo(0.979, 2);

    // Floor Tom: anchor 72.7 Hz
    // Normal: 82.4 Hz
    const floorAnchor = HOUSE_KIT_TUNER_ANCHORS.floorTom;
    expect(82.4 / floorAnchor.anchorHz).toBeCloseTo(1.133, 2);

    // Kick: anchor 59.5 Hz
    // Normal: 55 Hz
    const kickAnchor = HOUSE_KIT_TUNER_ANCHORS.kick;
    expect(55 / kickAnchor.anchorHz).toBeCloseTo(0.924, 2);
  });

  it('TunerAudioEngine includes playDrumReference method and can be instantiated for drum mode', () => {
    const engine = new TunerAudioEngine({
      instrumentMode: 'drum',
    });
    expect(typeof engine.playDrumReference).toBe('function');
    expect(engine.getMode()).toBe('drum');
  });

  it('exports preloadTunerReferenceAudio and playDrumReferenceSound as callable async functions', () => {
    expect(typeof preloadTunerReferenceAudio).toBe('function');
    expect(typeof playDrumReferenceSound).toBe('function');
  });
});
