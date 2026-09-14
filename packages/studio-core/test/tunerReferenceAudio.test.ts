import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFamilyForMode,
  preloadTunerReferenceAudio,
  playTunerReferenceString,
  stopTunerReferenceAudio,
} from '../src/lib/tuner/tunerReferenceAudio';
import { TUNER_SAMPLE_DATA } from '../src/lib/tuner/tunerSampleData';
import {
  STANDARD_GUITAR_STRINGS,
  STANDARD_BASS_4_STRINGS,
  getTargetStringsForMode,
} from '../src/lib/tuner/pitchMath';
import { TunerAudioEngine } from '../src/lib/tuner/tunerAudioEngine';

// ── Web Audio API Mocks for Node/Vitest ──────────────────────────────────────

class MockAudioBuffer {
  duration = 2.5;
  length = 110250;
  numberOfChannels = 2;
  sampleRate = 44100;
  private channelData = new Float32Array(110250);
  getChannelData() {
    return this.channelData;
  }
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockBufferSourceNode {
  buffer: any = null;
  playbackRate = {
    value: 1,
    setValueAtTime: vi.fn((val: number) => {
      this.playbackRate.value = val;
    }),
  };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  onended: (() => void) | null = null;
}

class MockAudioContext {
  currentTime = 1.0;
  state = 'running';
  destination = {};
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  createGain = vi.fn(() => new MockGainNode());
  decodeAudioData = vi.fn().mockResolvedValue(new MockAudioBuffer());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('Tuner Realistic Reference Audio Engine', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = new MockAudioContext();
  });

  afterEach(() => {
    stopTunerReferenceAudio();
  });

  describe('Mode to Instrument Family Mapping', () => {
    it('correctly maps all 4 tuning modes to their instrument sound families', () => {
      expect(getFamilyForMode('acoustic')).toBe('acoustic');
      expect(getFamilyForMode('electric')).toBe('electric');
      expect(getFamilyForMode('bass-4')).toBe('bass');
    });
  });

  describe('Sample Bank Integrity', () => {
    it('contains valid realistic recordings for all electric guitar strings', () => {
      const electricStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      for (const note of electricStrings) {
        const b64 = TUNER_SAMPLE_DATA['electric']?.[note];
        expect(b64, `Missing electric sample for ${note}`).toBeDefined();
        expect(b64!.length).toBeGreaterThan(100);
      }
    });

    it('contains valid realistic recordings for all acoustic guitar strings', () => {
      const acousticStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      for (const note of acousticStrings) {
        const b64 = TUNER_SAMPLE_DATA['acoustic']?.[note];
        expect(b64, `Missing acoustic sample for ${note}`).toBeDefined();
        expect(b64!.length).toBeGreaterThan(100);
      }
    });

    it('contains valid realistic recordings for all 4-string bass strings', () => {
      const bassStrings = ['E1', 'A1', 'D2', 'G2'];
      for (const note of bassStrings) {
        const b64 = TUNER_SAMPLE_DATA['bass']?.[note];
        expect(b64, `Missing bass sample for ${note}`).toBeDefined();
        expect(b64!.length).toBeGreaterThan(100);
      }
    });

    it('all target strings from pitchMath map to available samples in tunerSampleData', () => {
      const modes = ['acoustic', 'electric', 'bass-4'] as const;
      for (const mode of modes) {
        const family = getFamilyForMode(mode);
        const strings = getTargetStringsForMode(mode);
        for (const str of strings) {
          expect(
            TUNER_SAMPLE_DATA[family]?.[str.fullName],
            `Missing note ${str.fullName} in family ${family} for mode ${mode}`
          ).toBeDefined();
        }
      }
    });
  });

  describe('Sample Preloading', () => {
    it('preloads reference audio for a specified mode without errors', async () => {
      await preloadTunerReferenceAudio('electric', mockCtx as any);
      expect(mockCtx.decodeAudioData).toHaveBeenCalled();
    });

    it('preloads bass samples for bass-4 mode', async () => {
      await preloadTunerReferenceAudio('bass-4', mockCtx as any);
      expect(mockCtx.decodeAudioData).toHaveBeenCalled();
    });
  });

  describe('Reference String Playback', () => {
    it('plays string reference with correct A440 playback rate', async () => {
      const lowE = STANDARD_GUITAR_STRINGS[0]; // E2
      await playTunerReferenceString({
        target: lowE,
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      expect(lastSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(1.0, 1.0);
      expect(lastSource.start).toHaveBeenCalledWith(1.0);
    });

    it('adjusts playbackRate accurately for non-standard reference A4 (e.g. 442 Hz)', async () => {
      const stringA2 = STANDARD_GUITAR_STRINGS[1]; // A2
      await playTunerReferenceString({
        target: stringA2,
        mode: 'electric',
        refA4: 442,
        audioCtx: mockCtx as any,
      });

      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      expect(lastSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(442 / 440, 1.0);
    });

    it('adjusts playbackRate accurately for non-standard reference A4 (e.g. 432 Hz)', async () => {
      const stringA2 = STANDARD_GUITAR_STRINGS[1]; // A2
      await playTunerReferenceString({
        target: stringA2,
        mode: 'acoustic',
        refA4: 432,
        audioCtx: mockCtx as any,
      });

      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      expect(lastSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(432 / 440, 1.0);
    });

    it('fades out previous audio smoothly when tapping strings repeatedly', async () => {
      const stringE2 = STANDARD_GUITAR_STRINGS[0];
      const stringA2 = STANDARD_GUITAR_STRINGS[1];

      await playTunerReferenceString({
        target: stringE2,
        mode: 'acoustic',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      const firstGain = mockCtx.createGain.mock.results[0].value as MockGainNode;

      // Second tap immediately triggers
      await playTunerReferenceString({
        target: stringA2,
        mode: 'acoustic',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      // First gain node was ramped down to prevent clicks and overlapping cacophony
      expect(firstGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
    });

    it('can play 4-string bass Low E (E1) reference recording', async () => {
      const lowE = STANDARD_BASS_4_STRINGS[0]; // E1
      await playTunerReferenceString({
        target: lowE,
        mode: 'bass-4',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('universally resamples alternate tunings (e.g. Drop D D2) relative to nearest recorded anchor', async () => {
      const dropDString6 = {
        name: 'Drop D',
        note: 'D',
        octave: 2,
        fullName: 'D2',
        frequency: 73.42,
        stringNumber: 6,
      };

      await playTunerReferenceString({
        target: dropDString6,
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      // D2 is 2 semitones below E2 anchor (38 - 40 = -2), so playbackRate = 2^(-2/12) ≈ 0.8909
      const expectedRate = Math.pow(2, -2 / 12);
      expect(lastSource.playbackRate.value).toBeCloseTo(expectedRate, 3);
    });
  });

  describe('TunerAudioEngine Integration', () => {
    it('exposes playStringReference and preloadReferenceAudio on TunerAudioEngine instance', async () => {
      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
      });

      expect(typeof engine.playStringReference).toBe('function');
      expect(typeof engine.preloadReferenceAudio).toBe('function');

      // Preload does not throw
      expect(() => engine.preloadReferenceAudio('acoustic')).not.toThrow();

      // Clean destroy
      engine.destroy();
    });
  });
});
