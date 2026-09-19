import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFamilyForMode,
  preloadTunerReferenceAudio,
  playTunerReferenceString,
  stopTunerReferenceAudio,
  getActiveReferencePlayback,
  isReferencePlaybackActive,
  isReferenceSuppressionActive,
  REFERENCE_SETTLING_TIME_MS,
  getSuppressionRemainingMs,
  clearTunerReferenceSuppression,
  startReferenceToneSuppression,
  playDrumReferenceSound,
  clearTunerReferenceCache,
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
  context: any = { currentTime: 1.0 };
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
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

class MockOscillatorNode {
  type = 'triangle';
  frequency = {
    setValueAtTime: vi.fn(),
  };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

class MockAudioContext {
  currentTime = 1.0;
  sampleRate = 44100;
  state = 'running';
  destination = {};
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => {
    const g = new MockGainNode();
    g.context = this;
    return g;
  });
  decodeAudioData = vi.fn().mockResolvedValue(new MockAudioBuffer());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('Tuner Realistic Reference Audio Engine', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTunerReferenceCache();
    mockCtx = new MockAudioContext();
    (globalThis as any).AudioContext = vi.fn(() => mockCtx);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });
  });

  afterEach(() => {
    stopTunerReferenceAudio();
    clearTunerReferenceCache();
    delete (globalThis as any).AudioContext;
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

  describe('TunerAudioEngine Integration & Audio Separation', () => {
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

    it('tracks active reference playback metadata during string playback and clears on stop', async () => {
      const lowE = STANDARD_GUITAR_STRINGS[0]; // E2 at 82.41 Hz
      expect(isReferencePlaybackActive()).toBe(false);
      expect(getActiveReferencePlayback()).toBeNull();

      await playTunerReferenceString({
        target: lowE,
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);
      const active = getActiveReferencePlayback();
      expect(active).not.toBeNull();
      expect(active?.target.fullName).toBe('E2');
      expect(active?.frequency).toBeCloseTo(82.41, 1);
      expect(active?.mode).toBe('electric');

      stopTunerReferenceAudio();
      expect(isReferencePlaybackActive()).toBe(false);
      expect(getActiveReferencePlayback()).toBeNull();
    });

    it('scales active reference target frequency dynamically with refA4', async () => {
      const stringA2 = STANDARD_GUITAR_STRINGS[1]; // A2 (110.0 Hz at A440)
      await playTunerReferenceString({
        target: stringA2,
        mode: 'acoustic',
        refA4: 442,
        audioCtx: mockCtx as any,
      });

      const active = getActiveReferencePlayback();
      expect(active).not.toBeNull();
      // 110 * (442 / 440) = 110.5 Hz
      expect(active?.frequency).toBeCloseTo(110.5, 1);

      stopTunerReferenceAudio();
    });

    it('accurately tracks 4-string bass Drop D reference playback (D1 at 36.71 Hz)', async () => {
      const bassDropD = {
        name: 'Drop D',
        note: 'D',
        octave: 1,
        fullName: 'D1',
        frequency: 36.71,
        stringNumber: 4,
      };

      await playTunerReferenceString({
        target: bassDropD,
        mode: 'bass-4',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      const active = getActiveReferencePlayback();
      expect(active).not.toBeNull();
      expect(active?.target.fullName).toBe('D1');
      expect(active?.frequency).toBeCloseTo(36.71, 1);

      stopTunerReferenceAudio();
    });

    it('handles rapid sequential string taps without audio corruption or stale state', async () => {
      const strings = STANDARD_GUITAR_STRINGS.slice(0, 3);

      for (const str of strings) {
        await playTunerReferenceString({
          target: str,
          mode: 'electric',
          refA4: 440,
          audioCtx: mockCtx as any,
        });

        const active = getActiveReferencePlayback();
        expect(active?.target.fullName).toBe(str.fullName);
      }

      // Final active matches the last tapped string
      expect(getActiveReferencePlayback()?.target.fullName).toBe(strings[2].fullName);

      stopTunerReferenceAudio();
      expect(isReferencePlaybackActive()).toBe(false);
    });

    it('cancels pending in-flight async load when a newer string note is tapped', async () => {
      let resolveFirstLoad: () => void = () => {};

      // Custom mock context that pauses the first decodeAudioData
      let decodeCount = 0;
      const slowCtx = new MockAudioContext();
      slowCtx.decodeAudioData = vi.fn().mockImplementation(() => {
        decodeCount++;
        if (decodeCount === 1) {
          return new Promise((resolve) => {
            resolveFirstLoad = () => resolve(new MockAudioBuffer());
          });
        }
        return Promise.resolve(new MockAudioBuffer());
      });

      const stringE2 = STANDARD_GUITAR_STRINGS[0]; // E2
      const stringA2 = STANDARD_GUITAR_STRINGS[1]; // A2

      // Tap 1: starts loading E2 (in-flight, held by promise)
      const tap1Promise = playTunerReferenceString({
        target: stringE2,
        mode: 'acoustic',
        refA4: 440,
        audioCtx: slowCtx as any,
      });

      // Small tick to ensure async load reaches decodeAudioData
      await new Promise((r) => setTimeout(r, 20));

      // Tap 2: immediately taps A2
      const tap2Promise = playTunerReferenceString({
        target: stringA2,
        mode: 'acoustic',
        refA4: 440,
        audioCtx: slowCtx as any,
      });

      await tap2Promise;

      // Active playback must be A2
      expect(getActiveReferencePlayback()?.target.fullName).toBe('A2');
      const sourcesAfterTap2 = slowCtx.createBufferSource.mock.results.length;

      // Now resolve Tap 1 late
      resolveFirstLoad();
      await tap1Promise;

      // Tap 1's resolved sample must be discarded due to monotonic token!
      // No extra source node was started for the stale Tap 1!
      expect(slowCtx.createBufferSource.mock.results.length).toBe(sourcesAfterTap2);
      expect(getActiveReferencePlayback()?.target.fullName).toBe('A2');

      stopTunerReferenceAudio();
    });

    it('cancels in-flight load when stopTunerReferenceAudio is called before decode completes', async () => {
      let resolveLoad: () => void = () => {};
      const slowCtx = new MockAudioContext();
      slowCtx.decodeAudioData = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveLoad = () => resolve(new MockAudioBuffer());
        });
      });

      const stringE2 = STANDARD_GUITAR_STRINGS[0];
      const playPromise = playTunerReferenceString({
        target: stringE2,
        mode: 'electric',
        refA4: 440,
        audioCtx: slowCtx as any,
      });

      // Small tick to ensure async load reaches decodeAudioData
      await new Promise((r) => setTimeout(r, 20));

      // Stop called while decode is pending
      stopTunerReferenceAudio();

      // Resolve load
      resolveLoad();
      await playPromise;

      // No buffer source was started
      expect(slowCtx.createBufferSource).not.toHaveBeenCalled();
      expect(getActiveReferencePlayback()).toBeNull();
    });

    it('supports Acoustic Guitar Half-Step Down (Eb2) with exact semitone pitch shift', async () => {
      const halfStepDownE = {
        name: 'Eb2',
        note: 'Eb',
        octave: 2,
        fullName: 'Eb2',
        frequency: 77.78,
        stringNumber: 6,
      };

      await playTunerReferenceString({
        target: halfStepDownE,
        mode: 'acoustic',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      // Eb2 is 1 semitone below E2 anchor (39 - 40 = -1), rate = 2^(-1/12) ≈ 0.94387
      const expectedRate = Math.pow(2, -1 / 12);
      expect(lastSource.playbackRate.value).toBeCloseTo(expectedRate, 3);
    });

    it('supports Electric Guitar Drop C (C2) with -4 semitone pitch shift from E2 anchor', async () => {
      const dropCString6 = {
        name: 'Low C',
        note: 'C',
        octave: 2,
        fullName: 'C2',
        frequency: 65.41,
        stringNumber: 6,
      };

      await playTunerReferenceString({
        target: dropCString6,
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      // C2 (36) is 4 semitones below E2 anchor (40), rate = 2^(-4/12) ≈ 0.7937
      const expectedRate = Math.pow(2, -4 / 12);
      expect(lastSource.playbackRate.value).toBeCloseTo(expectedRate, 3);
    });

    it('supports 4-string Bass Half-Step Down (Eb1) with -1 semitone shift from E1 anchor', async () => {
      const bassEb1 = {
        name: 'Eb1',
        note: 'Eb',
        octave: 1,
        fullName: 'Eb1',
        frequency: 38.89,
        stringNumber: 4,
      };

      await playTunerReferenceString({
        target: bassEb1,
        mode: 'bass-4',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      const lastSource = mockCtx.createBufferSource.mock.results[0].value as MockBufferSourceNode;
      // Eb1 is 1 semitone below E1 anchor (27 - 28 = -1), rate = 2^(-1/12) ≈ 0.94387
      const expectedRate = Math.pow(2, -1 / 12);
      expect(lastSource.playbackRate.value).toBeCloseTo(expectedRate, 3);
    });

    it('silences reference audio immediately when engine.setMode is called', async () => {
      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
      });

      await playTunerReferenceString({
        target: STANDARD_GUITAR_STRINGS[0],
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);

      // Switching mode silences active reference
      engine.setMode('bass-4');
      expect(isReferencePlaybackActive()).toBe(false);

      engine.destroy();
    });

    it('silences reference audio immediately when engine.setTuning is called', async () => {
      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
      });

      await playTunerReferenceString({
        target: STANDARD_GUITAR_STRINGS[0],
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);

      // Switching tuning silences active reference
      engine.setTuning('guitar-drop-d');
      expect(isReferencePlaybackActive()).toBe(false);

      engine.destroy();
    });

    it('reuses engine.audioCtx when calling engine.playStringReference', async () => {
      const engine = new TunerAudioEngine({
        instrumentMode: 'acoustic',
        referenceA4: 440,
      });

      // Inject mockCtx as the engine's active audioCtx
      (engine as any).audioCtx = mockCtx;

      await engine.playStringReference(STANDARD_GUITAR_STRINGS[0]);

      // mockCtx was used to create buffer source and gain
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();

      engine.destroy();
    });
  });

  describe('Reference Audio Isolation & Detector Feedback Protection', () => {
    it('activates suppression during string reference playback', async () => {
      clearTunerReferenceCache();
      expect(isReferenceSuppressionActive()).toBe(false);

      await playTunerReferenceString({
        target: STANDARD_GUITAR_STRINGS[0],
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);
      expect(isReferenceSuppressionActive()).toBe(true);
      expect(getSuppressionRemainingMs()).toBeGreaterThan(0);

      stopTunerReferenceAudio();
    });

    it('preserves calibrated settling window after reference playback stops', async () => {
      clearTunerReferenceCache();

      await playTunerReferenceString({
        target: STANDARD_GUITAR_STRINGS[0],
        mode: 'electric',
        refA4: 440,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);
      expect(isReferenceSuppressionActive()).toBe(true);

      // Stop reference playback
      stopTunerReferenceAudio();

      // Audio is stopped, but suppression remains active for acoustic settling decay
      expect(isReferencePlaybackActive()).toBe(false);
      expect(isReferenceSuppressionActive()).toBe(true);
      expect(getSuppressionRemainingMs()).toBeGreaterThan(0);
      expect(getSuppressionRemainingMs()).toBeLessThanOrEqual(REFERENCE_SETTLING_TIME_MS + 60);

      // Explicitly clearing suppression restores immediate detector readiness
      clearTunerReferenceSuppression();
      expect(isReferenceSuppressionActive()).toBe(false);
      expect(getSuppressionRemainingMs()).toBe(0);
    });

    it('analyzeFrame emits null metrics and resets in-tune counters during reference suppression', () => {
      clearTunerReferenceCache();

      let lastEmittedFrame: any = null;
      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
        onFrame: (payload) => {
          lastEmittedFrame = payload;
        },
      });

      // Inject mock audio processing graph
      const mockAnalyser = {
        getFloatTimeDomainData: vi.fn((buf: Float32Array) => {
          buf.fill(0.1); // High amplitude signal
        }),
        disconnect: vi.fn(),
      };
      const mockDetector = {
        findPitch: vi.fn(() => [82.41, 0.95]), // In-tune Low E with high clarity
      };

      (engine as any).audioCtx = mockCtx;
      (engine as any).analyser = mockAnalyser;
      (engine as any).detector = mockDetector;

      // Simulate prior in-tune state
      (engine as any).consecutiveInTuneFrames = 2;
      (engine as any).currentlyInTune = true;

      // 1. Activate suppression
      expect(engine.isReferenceSuppressed()).toBe(false);
      (engine as any).playReferenceTone(82.41, 1.4);
      expect(engine.isReferenceSuppressed()).toBe(true);

      // 2. Execute analyzeFrame while suppressed
      (engine as any).analyzeFrame();

      // Detector must have been bypassed: null metrics emitted, state set to no_signal
      expect(lastEmittedFrame).not.toBeNull();
      expect(lastEmittedFrame.metrics).toBeNull();
      expect(lastEmittedFrame.state).toBe('no_signal');

      // Internal in-tune counters must be cleanly reset
      expect((engine as any).consecutiveInTuneFrames).toBe(0);
      expect((engine as any).currentlyInTune).toBe(false);
      expect(mockDetector.findPitch).not.toHaveBeenCalled();

      // 3. Clear suppression: detector resumes normal processing immediately
      clearTunerReferenceSuppression();
      expect(engine.isReferenceSuppressed()).toBe(false);

      // Advance frames past pluck transient cooldown (~2 frames) to sustained note
      (engine as any).analyzeFrame(); // frame 1: transient detected (peak 0.1 > prevPeak 0 * 2.8)
      (engine as any).analyzeFrame(); // frame 2: cooldown frame 1
      (engine as any).analyzeFrame(); // frame 3: pitch detection executed

      // Pitch detector was executed and metrics were emitted
      expect(mockDetector.findPitch).toHaveBeenCalled();
      expect(lastEmittedFrame.metrics).not.toBeNull();
      expect(lastEmittedFrame.metrics.fullName).toBe('E2');

      engine.destroy();
    });

    it('integrates playReferenceTone with unified suppression lifecycle', () => {
      clearTunerReferenceCache();

      const engine = new TunerAudioEngine({
        instrumentMode: 'electric',
        referenceA4: 440,
      });
      (engine as any).audioCtx = mockCtx;

      expect(engine.isReferencePlaying()).toBe(false);
      expect(engine.isReferenceSuppressed()).toBe(false);

      engine.playReferenceTone(440, 1.0);

      expect(engine.isReferencePlaying()).toBe(true);
      expect(engine.isReferenceSuppressed()).toBe(true);
      const active = getActiveReferencePlayback();
      expect(active).not.toBeNull();
      expect(active?.target.name).toBe('Tone');
      expect(active?.frequency).toBe(440);

      engine.stopReferenceAudio();
      expect(engine.isReferencePlaying()).toBe(false);
      expect(engine.isReferenceSuppressed()).toBe(true);

      clearTunerReferenceSuppression();
      expect(engine.isReferenceSuppressed()).toBe(false);

      engine.destroy();
    });

    it('integrates drum reference audio with suppression lifecycle and settling window', async () => {
      clearTunerReferenceCache();

      const engine = new TunerAudioEngine({
        instrumentMode: 'drum',
      });
      (engine as any).audioCtx = mockCtx;

      expect(engine.isReferenceSuppressed()).toBe(false);

      await playDrumReferenceSound({
        partId: 'snare',
        tensionId: 'normal',
        frequency: 242.0,
        duration: 2.5,
        audioCtx: mockCtx as any,
      });

      expect(isReferencePlaybackActive()).toBe(true);
      expect(isReferenceSuppressionActive()).toBe(true);
      const active = getActiveReferencePlayback();
      expect(active?.mode).toBe('drum');
      expect(active?.frequency).toBe(242.0);

      stopTunerReferenceAudio();
      expect(isReferencePlaybackActive()).toBe(false);
      expect(isReferenceSuppressionActive()).toBe(true);

      clearTunerReferenceSuppression();
      expect(isReferenceSuppressionActive()).toBe(false);

      engine.destroy();
    });
  });
});

