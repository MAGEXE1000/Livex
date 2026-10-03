import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetronomeAudioEngine } from '../metronomeAudio';

// Web Audio API Mocking
class MockGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioBufferSourceNode {
  buffer = null;
  start = vi.fn();
  stop = vi.fn();
  connect = vi.fn();
  disconnect = vi.fn();
  onended = null;
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn().mockResolvedValue(undefined);
  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createBuffer = vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(10)),
  }));
}

global.window = global.window || ({} as any);
(global as any).AudioContext = MockAudioContext;
(globalThis as any).AudioContext = MockAudioContext;
(window as any).AudioContext = MockAudioContext;
(global as any).requestAnimationFrame = vi.fn();
(global as any).cancelAnimationFrame = vi.fn();
(window as any).requestAnimationFrame = vi.fn();
(window as any).cancelAnimationFrame = vi.fn();

describe('MetronomeAudioEngine Mutex', () => {
  beforeEach(() => {
    MetronomeAudioEngine.stopAll();
    MetronomeAudioEngine._instances.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    MetronomeAudioEngine.stopAll();
  });

  it('stops other engines when a new one starts', () => {
    const engineA = new MetronomeAudioEngine();
    const engineB = new MetronomeAudioEngine();

    engineA.start();
    expect((engineA as any)._isPlaying).toBe(true);

    engineB.start();
    expect((engineB as any)._isPlaying).toBe(true);
    expect((engineA as any)._isPlaying).toBe(false);

    engineA.dispose();
    engineB.dispose();
  });

  it('dispose removes instance from static registry', () => {
    const engine = new MetronomeAudioEngine();
    engine.start();
    expect((engine as any)._isPlaying).toBe(true);
    
    expect(MetronomeAudioEngine._instances).toContain(engine);

    engine.dispose();
    
    expect(MetronomeAudioEngine._instances).not.toContain(engine);
  });

  it('stopAll stops all registered engines', () => {
    const engineA = new MetronomeAudioEngine();
    const engineB = new MetronomeAudioEngine();
    const engineC = new MetronomeAudioEngine();

    (engineA as any)._isPlaying = true;
    (engineB as any)._isPlaying = true;
    (engineC as any)._isPlaying = true;

    MetronomeAudioEngine.stopAll();

    expect((engineA as any)._isPlaying).toBe(false);
    expect((engineB as any)._isPlaying).toBe(false);
    expect((engineC as any)._isPlaying).toBe(false);

    engineA.dispose();
    engineB.dispose();
    engineC.dispose();
  });
});
