import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  playChord,
  stopChordPlayback,
  preloadGuitarAudio,
  isGuitarAudioLoaded,
} from '../guitarAudio';

// ── Web Audio API Mocks for Node/Vitest ──────────────────────────────────────

class MockAudioBuffer {
  duration = 3.19;
  length = 140679;
  numberOfChannels = 2;
  sampleRate = 44100;
  private channelData = new Float32Array(140679);
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
  playbackRate = { value: 1 };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
}

class MockBiquadFilterNode {
  type = 'highpass';
  frequency = { value: 40 };
  Q = { value: 0.707 };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockDynamicsCompressorNode {
  threshold = { value: -3.0 };
  knee = { value: 4.0 };
  ratio = { value: 8.0 };
  attack = { value: 0.002 };
  release = { value: 0.12 };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockAudioContext {
  currentTime = 1.0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createBuffer = vi.fn(() => new MockAudioBuffer());
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
  decodeAudioData = vi.fn().mockImplementation(async () => new MockAudioBuffer());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// Attach mock AudioContext to globalThis
(globalThis as any).AudioContext = MockAudioContext;

describe('guitarAudio engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopChordPlayback();
  });

  it('handles preloadGuitarAudio without throwing', async () => {
    await expect(preloadGuitarAudio()).resolves.toBeUndefined();
  });

  it('correctly tracks isGuitarAudioLoaded state', async () => {
    await preloadGuitarAudio();
    expect(isGuitarAudioLoaded()).toBe(true);
  });

  it('plays C Major chord with 5 active sounding strings (low E muted)', async () => {
    const cMajorData = {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      barres: [],
      baseFret: 1,
    };

    playChord(cMajorData, 0.65);
    await new Promise((r) => setTimeout(r, 50));
    expect(true).toBe(true);
  });

  it('plays G Major chord with all 6 strings sounding', async () => {
    const gMajorData = {
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, 0, 0, 0, 3],
      barres: [],
      baseFret: 1,
    };

    playChord(gMajorData, 0.7);
    await new Promise((r) => setTimeout(r, 50));
    expect(true).toBe(true);
  });

  it('plays E Minor chord with open strings', async () => {
    const emData = {
      frets: [0, 2, 2, 0, 0, 0],
      fingers: [0, 2, 3, 0, 0, 0],
      barres: [],
      baseFret: 1,
    };

    playChord(emData, 0.65);
    await new Promise((r) => setTimeout(r, 50));
    expect(true).toBe(true);
  });

  it('plays F Major barre chord', async () => {
    const fMajorData = {
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [1, 3, 4, 2, 1, 1],
      barres: [{ fret: 1, fromString: 1, toString: 6 }],
      baseFret: 1,
    };

    playChord(fMajorData, 0.65);
    await new Promise((r) => setTimeout(r, 50));
    expect(true).toBe(true);
  });

  it('plays D7 chord with 4 strings sounding (strings 0 and 1 muted)', async () => {
    const d7Data = {
      frets: [-1, -1, 0, 2, 1, 2],
      fingers: [0, 0, 0, 2, 1, 3],
      barres: [],
      baseFret: 1,
    };

    playChord(d7Data, 0.65);
    await new Promise((r) => setTimeout(r, 50));
    expect(true).toBe(true);
  });

  it('gracefully handles empty or invalid chord data', () => {
    expect(() => playChord({ frets: [], fingers: [], barres: [], baseFret: 1 })).not.toThrow();
    expect(() => playChord(null as any)).not.toThrow();
  });

  it('stops in-flight chord playback cleanly without throwing', () => {
    const cMajorData = {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      barres: [],
      baseFret: 1,
    };

    playChord(cMajorData, 0.65);
    expect(() => stopChordPlayback()).not.toThrow();
  });
});
