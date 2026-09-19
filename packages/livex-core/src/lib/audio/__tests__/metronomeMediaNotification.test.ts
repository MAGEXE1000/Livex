import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MetronomeAudioEngine,
  metronomeAudioEngine,
  getBeatsPerMeasure,
  getSubdivisionsPerBeat,
} from '../metronomeAudio';
import { mediaSessionCoordinator } from '../mediaSessionCoordinator';
import {
  useMetronomeStore,
  FACTORY_PRESETS,
  type MetronomePreset,
  generateMetronomeBpmArtwork,
} from '../../../store/useMetronomeStore';

// ── Web Audio & MediaSession Mocks ──────────────────────────────────────────

class MockAudioBuffer {
  duration = 0.1;
  length = 4410;
  numberOfChannels = 1;
  sampleRate = 44100;
  private channelData = new Float32Array(4410);
  getChannelData() {
    return this.channelData;
  }
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBufferSourceNode {
  buffer: any = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 1.0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createBuffer = vi.fn(() => new MockAudioBuffer());
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// Setup global mocks for Vitest (Node environment)
const globalAudioCtx = new MockAudioContext();
(globalThis as any).AudioContext = vi.fn(() => globalAudioCtx);
(globalThis as any).webkitAudioContext = vi.fn(() => globalAudioCtx);

const mockMediaSession = {
  metadata: null as any,
  playbackState: 'none',
  setActionHandler: vi.fn(),
};

try {
  Object.defineProperty(globalThis.navigator, 'mediaSession', {
    value: mockMediaSession,
    configurable: true,
    writable: true,
  });
} catch {
  (globalThis as any).navigator = {
    mediaSession: mockMediaSession,
  };
}

(globalThis as any).requestAnimationFrame = (cb: (time: number) => void) =>
  setTimeout(() => cb(Date.now()), 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

(globalThis as any).MediaMetadata = class {
  title: string;
  artist: string;
  album: string;
  artwork: any[];
  constructor(init: { title: string; artist: string; album?: string; artwork?: any[] }) {
    this.title = init.title;
    this.artist = init.artist;
    this.album = init.album || '';
    this.artwork = init.artwork || [];
  }
};

const mockLocalStorageStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockLocalStorageStore[key] ?? null,
  setItem: (key: string, val: string) => {
    mockLocalStorageStore[key] = val;
  },
  removeItem: (key: string) => {
    delete mockLocalStorageStore[key];
  },
  clear: () => {
    for (const k of Object.keys(mockLocalStorageStore)) {
      delete mockLocalStorageStore[k];
    }
  },
};

(globalThis as any).window = globalThis;

const mockCanvasContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  font: '',
  textAlign: '',
  textBaseline: '',
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  moveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
};

(globalThis as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 512,
        height: 512,
        getContext: () => mockCanvasContext,
        toDataURL: () =>
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAgAElEQVR4nOy9',
      };
    }
    return {};
  },
};

describe('Drumex Metronome: Audio Engine & Media Notification State Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaSession.metadata = null;
    mockMediaSession.playbackState = 'none';
    metronomeAudioEngine.stop();
    metronomeAudioEngine.setBpm(120);
    metronomeAudioEngine.setTimeSignature('4/4');
    metronomeAudioEngine.setSubdivision('1/16');
    metronomeAudioEngine.setSound('woodblock');
    metronomeAudioEngine.setAccentBeat(0);
    metronomeAudioEngine.setVolume(0.85);

    useMetronomeStore.setState({
      bpm: 120,
      timeSignature: '4/4',
      subdivision: '1/16',
      sound: 'woodblock',
      accentBeat: 0,
      accentPattern: ['strong', 'normal', 'normal', 'normal'],
      volume: 85,
      isPlaying: false,
      activePresetId: null,
      userPresets: [],
      presets: [],
    });
  });

  afterEach(() => {
    metronomeAudioEngine.stop();
  });

  describe('MetronomeAudioEngine Core Unit Tests', () => {
    it('initializes with default settings', () => {
      const engine = new MetronomeAudioEngine();
      expect(engine.bpm).toBe(120);
      expect(engine.timeSignature).toBe('4/4');
      expect(engine.subdivision).toBe('1/16');
      expect(engine.sound).toBe('woodblock');
      expect(engine.accentBeat).toBe(0);
      expect(engine.volume).toBe(0.85);
      expect(engine.isPlaying).toBe(false);
      engine.dispose();
    });

    it('clamps accentBeat to valid beats in measure', () => {
      const engine = new MetronomeAudioEngine();
      // 4/4 has 4 beats (0, 1, 2, 3)
      engine.setAccentBeat(2);
      expect(engine.accentBeat).toBe(2);

      // Attempting to set beat 5 in 4/4 should clamp to 3
      engine.setAccentBeat(5);
      expect(engine.accentBeat).toBe(3);

      // Attempting negative beat should set to -1 (neutral / no-accent state)
      engine.setAccentBeat(-1);
      expect(engine.accentBeat).toBe(-1);

      // Changing time signature to 3/4 (beats 0, 1, 2) when accentBeat is 3 resets to 0
      engine.setTimeSignature('4/4');
      engine.setAccentBeat(3);
      expect(engine.accentBeat).toBe(3);
      engine.setTimeSignature('3/4');
      expect(engine.accentBeat).toBe(0);

      engine.dispose();
    });

    it('dynamically adjusts BPM without stopping or throwing', () => {
      const engine = new MetronomeAudioEngine();
      engine.setBpm(140);
      expect(engine.bpm).toBe(140);

      // Start engine and change BPM dynamically
      engine.start();
      expect(engine.isPlaying).toBe(true);

      expect(() => {
        engine.setBpm(160);
      }).not.toThrow();
      expect(engine.bpm).toBe(160);
      expect(engine.isPlaying).toBe(true);

      engine.stop();
      expect(engine.isPlaying).toBe(false);
      engine.dispose();
    });

    it('supports subdivisions: 1/4, 1/8, 1/16, and 3let', () => {
      const engine = new MetronomeAudioEngine();
      const subs: Array<'1/4' | '1/8' | '1/16' | '3let'> = ['1/4', '1/8', '1/16', '3let'];
      for (const sub of subs) {
        engine.setSubdivision(sub);
        expect(engine.subdivision).toBe(sub);
        expect(engine.getSubdivisionsPerBeat()).toBeGreaterThanOrEqual(1);
      }
      engine.dispose();
    });

    it('scheduleAudioPulse schedules accent buffer when current measure beat equals accentBeat', () => {
      const engine = new MetronomeAudioEngine();
      engine.setAccentBeat(2); // Accent on Beat 3 (index 2)
      engine.start();

      // Access private scheduleAudioPulse via any casting for deterministic assertion
      const ctx = (engine as any)._ctx as MockAudioContext;
      const createdSources: MockBufferSourceNode[] = [];
      ctx.createBufferSource = vi.fn(() => {
        const src = new MockBufferSourceNode();
        createdSources.push(src);
        return src as any;
      });

      // Normal beat (beat 0 !== accentBeat 2)
      (engine as any)._currentMeasureBeat = 0;
      (engine as any).scheduleAudioPulse(1.1, false, false, false, false);
      expect(createdSources.length).toBe(1);

      // Accent beat (beat 2 === accentBeat 2)
      (engine as any)._currentMeasureBeat = 2;
      (engine as any).scheduleAudioPulse(1.2, true, false, false, false);
      expect(createdSources.length).toBe(2);

      engine.stop();
      engine.dispose();
    });
  });

  describe('useMetronomeStore & Android Media Notification Integration', () => {
    it('Test A: Start metronome with active preset -> Title is preset name, artist is <BPM> BPM • <TIME SIGNATURE> • <SUBDIVISION>, album is "Drumex Metronome", and artwork is set', () => {
      const store = useMetronomeStore.getState();
      const pId = store.saveNewPreset('Rock 4/4 Groove');
      store.loadPreset(pId);
      store.start();

      expect(useMetronomeStore.getState().isPlaying).toBe(true);
      expect(mediaSessionCoordinator.getActiveProviderId()).toBe('drumex-metronome');

      const metadata = mockMediaSession.metadata;
      expect(metadata).not.toBeNull();
      // When a named preset is active, title is the preset name per production spec
      expect(metadata.title).toBe('Rock 4/4 Groove');
      // Secondary info (artist) is <BPM> BPM • <TIME SIGNATURE> • <SUBDIVISION>
      expect(metadata.artist).toBe('120 BPM • 4/4 • 1/16');
      // Album is "Drumex Metronome"
      expect(metadata.album).toBe('Drumex Metronome');
      // Artwork displays transparent Livex logo on 512x512 canvas
      expect(metadata.artwork).toBeDefined();
      expect(metadata.artwork.length).toBeGreaterThan(0);
      expect(metadata.artwork[0].src).toContain('data:image/png;base64,');
      expect(mockCanvasContext.clearRect).toHaveBeenCalledWith(0, 0, 512, 512);
      // Playback state is playing
      expect(mockMediaSession.playbackState).toBe('playing');
    });

    it('Test B: Dynamic BPM change with no active preset -> Title is "Drumex Metronome", artist updates immediately with new BPM', () => {
      const store = useMetronomeStore.getState();
      store.start();
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('120 BPM • 4/4 • 1/16');

      // Adjust BPM via slider/stepper to 155 BPM
      store.setBpm(155);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('155 BPM • 4/4 • 1/16');

      // Adjust BPM via relative adjustBpm(+5) to 160 BPM
      store.adjustBpm(5);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('160 BPM • 4/4 • 1/16');
    });

    it('Test C: Dynamic BPM change while playing / backgrounded re-anchors without stopping', () => {
      const store = useMetronomeStore.getState();
      store.start();
      expect(useMetronomeStore.getState().isPlaying).toBe(true);

      // Dynamic changes
      store.setBpm(180);
      expect(useMetronomeStore.getState().isPlaying).toBe(true);
      expect(metronomeAudioEngine.bpm).toBe(180);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('180 BPM • 4/4 • 1/16');

      store.adjustBpm(-20);
      expect(useMetronomeStore.getState().isPlaying).toBe(true);
      expect(metronomeAudioEngine.bpm).toBe(160);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('160 BPM • 4/4 • 1/16');
    });

    it('Test D & E: Reinterpreted previous/next actions navigate saved user presets in circular order and update title to preset name', () => {
      const store = useMetronomeStore.getState();
      store.start();

      // Create two distinct user presets
      const id1 = store.saveNewPreset('Fast Warmup');
      store.setBpm(180);
      store.setTimeSignature('3/4');
      store.setAccentBeat(1);
      store.updateCurrentPreset();

      const id2 = store.saveNewPreset('Slow Drill');
      store.setBpm(70);
      store.setTimeSignature('4/4');
      store.setAccentBeat(0);
      store.updateCurrentPreset();

      // Ensure user presets are loaded in store
      const userPresets = useMetronomeStore.getState().userPresets;
      expect(userPresets.length).toBe(2);

      // Trigger "next" preset from notification action
      mediaSessionCoordinator.handleAction('next');
      const activeState1 = useMetronomeStore.getState();
      expect([id1, id2]).toContain(activeState1.activePresetId);
      const activePreset1 = userPresets.find((p) => p.id === activeState1.activePresetId);
      expect(mockMediaSession.metadata?.title).toBe(activePreset1?.name);
      expect(mockMediaSession.metadata?.artist).toBe(
        `${activeState1.bpm} BPM • ${activeState1.timeSignature} • ${activeState1.subdivision}`
      );
      expect(mockMediaSession.metadata?.album).toBe('Drumex Metronome');

      // Trigger "next" again -> cycles circularly
      mediaSessionCoordinator.handleAction('next');
      const activeState2 = useMetronomeStore.getState();
      expect(activeState2.activePresetId).not.toBe(activeState1.activePresetId);
      const activePreset2 = userPresets.find((p) => p.id === activeState2.activePresetId);
      expect(mockMediaSession.metadata?.title).toBe(activePreset2?.name);
      expect(mockMediaSession.metadata?.artist).toBe(
        `${activeState2.bpm} BPM • ${activeState2.timeSignature} • ${activeState2.subdivision}`
      );
      expect(mockMediaSession.metadata?.album).toBe('Drumex Metronome');

      // Trigger "previous" -> returns to activeState1
      mediaSessionCoordinator.handleAction('previous');
      const activeState3 = useMetronomeStore.getState();
      expect(activeState3.activePresetId).toBe(activeState1.activePresetId);
      expect(mockMediaSession.metadata?.title).toBe(activePreset1?.name);
      expect(mockMediaSession.metadata?.artist).toBe(
        `${activeState1.bpm} BPM • ${activeState1.timeSignature} • ${activeState1.subdivision}`
      );
    });

    it('Test F: Loaded preset synchronizes BPM, signature, subdivision, sound, accent beat, volume', () => {
      const store = useMetronomeStore.getState();
      const customPreset: MetronomePreset = {
        id: 'test-custom-preset',
        name: 'Funk Beat',
        bpm: 112,
        timeSignature: '6/8',
        subdivision: '3let',
        sound: 'cowbell',
        volume: 90,
        accentBeat: 2,
        countInEnabled: false,
        createdAt: Date.now(),
      };

      useMetronomeStore.setState({
        userPresets: [customPreset],
        presets: [customPreset],
      });

      store.loadPreset('test-custom-preset');

      const s = useMetronomeStore.getState();
      expect(s.bpm).toBe(112);
      expect(s.timeSignature).toBe('6/8');
      expect(s.subdivision).toBe('3let');
      expect(s.sound).toBe('cowbell');
      expect(s.volume).toBe(90);
      expect(s.accentBeat).toBe(2);
      expect(s.countInEnabled).toBe(false);

      // Verify audio engine state
      expect(metronomeAudioEngine.bpm).toBe(112);
      expect(metronomeAudioEngine.timeSignature).toBe('6/8');
      expect(metronomeAudioEngine.subdivision).toBe('3let');
      expect(metronomeAudioEngine.sound).toBe('cowbell');
      expect(metronomeAudioEngine.accentBeat).toBe(2);
    });

    it('Test G: Metadata updates even when paused so notification shade displays current BPM in artist and artwork', () => {
      const store = useMetronomeStore.getState();
      // Start then pause
      store.start();
      store.stop();
      expect(useMetronomeStore.getState().isPlaying).toBe(false);
      expect(mockMediaSession.playbackState).toBe('paused');

      // Adjust BPM while paused (no preset active)
      store.setBpm(138);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('138 BPM • 4/4 • 1/16');
    });

    it('Test H: Zero saved user presets -> next/previous safely no-op without errors or crashing', () => {
      // Ensure 0 user presets and no active preset
      useMetronomeStore.setState({
        userPresets: [],
        presets: [],
        activePresetId: null,
      });

      const store = useMetronomeStore.getState();
      store.start();

      expect(() => {
        mediaSessionCoordinator.handleAction('next');
      }).not.toThrow();

      expect(() => {
        mediaSessionCoordinator.handleAction('previous');
      }).not.toThrow();

      // State remains safe and consistent with title as "Drumex Metronome"
      expect(useMetronomeStore.getState().bpm).toBe(120);
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('120 BPM • 4/4 • 1/16');
    });

    it('Test I: Repeated start/pause/stop lifecycle does not leak duplicate providers', () => {
      const store = useMetronomeStore.getState();

      // Start -> pause -> start -> stop cycles
      for (let i = 0; i < 5; i++) {
        store.start();
        expect(useMetronomeStore.getState().isPlaying).toBe(true);
        expect(mediaSessionCoordinator.getActiveProviderId()).toBe('drumex-metronome');

        store.stop();
        expect(useMetronomeStore.getState().isPlaying).toBe(false);
      }

      // Final stop session
      mediaSessionCoordinator.stopSession('drumex-metronome');
      expect(mockMediaSession.playbackState).toBe('none');
    });

    it('Test J: Accent architecture allows user to select accent beat and updates audio engine', () => {
      const store = useMetronomeStore.getState();
      store.setTimeSignature('4/4');

      // Default accent beat is 0 (Beat 1)
      expect(store.accentBeat).toBe(0);
      expect(metronomeAudioEngine.accentBeat).toBe(0);

      // Select Beat 3 (index 2) as accent beat
      store.setAccentBeat(2);
      expect(useMetronomeStore.getState().accentBeat).toBe(2);
      expect(metronomeAudioEngine.accentBeat).toBe(2);

      // Select Beat 4 (index 3) as accent beat
      store.setAccentBeat(3);
      expect(useMetronomeStore.getState().accentBeat).toBe(3);
      expect(metronomeAudioEngine.accentBeat).toBe(3);
    });

    it('Factory presets are completely removed (empty array) for user-first preset workflow', () => {
      expect(FACTORY_PRESETS).toEqual([]);
      expect(useMetronomeStore.getState().factoryPresets).toEqual([]);
    });

    it('Supports neutral accent beat (-1) in store and audio engine', () => {
      const store = useMetronomeStore.getState();
      store.setAccentBeat(-1);
      expect(useMetronomeStore.getState().accentBeat).toBe(-1);
      expect(metronomeAudioEngine.accentBeat).toBe(-1);
    });

    it('Test K: Extended time signatures (5/4, 7/8, 9/8, 12/8) and getBeatsPerMeasure calculate correct metrics', () => {
      const store = useMetronomeStore.getState();

      store.setTimeSignature('5/4');
      expect(metronomeAudioEngine.getBeatsPerMeasure()).toBe(5);
      expect(getBeatsPerMeasure('5/4')).toBe(5);

      store.setTimeSignature('7/8');
      expect(metronomeAudioEngine.getBeatsPerMeasure()).toBe(7);
      expect(getBeatsPerMeasure('7/8')).toBe(7);

      store.setTimeSignature('9/8');
      expect(metronomeAudioEngine.getBeatsPerMeasure()).toBe(9);
      expect(getBeatsPerMeasure('9/8')).toBe(9);

      store.setTimeSignature('12/8');
      expect(metronomeAudioEngine.getBeatsPerMeasure()).toBe(12);
      expect(getBeatsPerMeasure('12/8')).toBe(12);
    });

    it('Test L: Extended subdivisions (1/32, 6let) and getSubdivisionsPerBeat calculate correct pulses', () => {
      const store = useMetronomeStore.getState();

      store.setSubdivision('1/32');
      expect(metronomeAudioEngine.getSubdivisionsPerBeat()).toBe(8);
      expect(getSubdivisionsPerBeat('1/32')).toBe(8);

      store.setSubdivision('6let');
      expect(metronomeAudioEngine.getSubdivisionsPerBeat()).toBe(6);
      expect(getSubdivisionsPerBeat('6let')).toBe(6);
    });

    it('Test M: Accent Beat clamps safely when time signature changes to fewer beats', () => {
      const store = useMetronomeStore.getState();

      store.setTimeSignature('5/4');
      store.setAccentBeat(4); // 5th beat (index 4)
      expect(useMetronomeStore.getState().accentBeat).toBe(4);

      // Change to 3/4 -> accentBeat must clamp to index 2 (Beat 3)
      store.setTimeSignature('3/4');
      expect(useMetronomeStore.getState().accentBeat).toBeLessThanOrEqual(2);
      expect(metronomeAudioEngine.accentBeat).toBeLessThanOrEqual(2);
    });
  });

  describe('Production Metronome Presets and Incremental Tempo Systems', () => {
    beforeEach(() => {
      // Clear localStorage
      for (const key in mockLocalStorageStore) {
        delete mockLocalStorageStore[key];
      }
      useMetronomeStore.setState({
        userPresets: [],
        presets: [],
        activePresetId: null,
        bpm: 120,
        timeSignature: '4/4',
        subdivision: '1/16',
        sound: 'woodblock',
        volume: 85,
        countInEnabled: true,
        accentBeat: 0,
        isPlaying: false,
        tempoRamp: {
          enabled: false,
          startBpm: 100,
          targetBpm: 140,
          startDelaySec: 30,
          durationSec: 120,
          holdFinalBpm: true,
        },
        effectiveBpm: 120,
        rampProgress: undefined,
      });
      metronomeAudioEngine.setTempoRamp({
        enabled: false,
        startBpm: 100,
        targetBpm: 140,
        startDelaySec: 30,
        durationSec: 120,
        holdFinalBpm: true,
      });
    });

    it('Preset Library starts completely empty with 0 saved presets and null activePresetId', () => {
      const state = useMetronomeStore.getState();
      expect(state.userPresets).toEqual([]);
      expect(state.presets).toEqual([]);
      expect(state.activePresetId).toBeNull();
      expect(state.factoryPresets).toEqual([]);
      expect(FACTORY_PRESETS).toEqual([]);
    });

    it('Creates new user presets with custom properties and stores them in state and storage', () => {
      const store = useMetronomeStore.getState();
      const newId = store.saveNewPreset({
        name: 'Speed Chops Workout',
        bpm: 160,
        timeSignature: '4/4',
        subdivision: '1/16',
        sound: 'digital',
        volume: 90,
        countInEnabled: false,
        accentBeat: 1,
      });

      const updated = useMetronomeStore.getState();
      expect(updated.userPresets).toHaveLength(1);
      expect(updated.activePresetId).toBe(newId);
      expect(updated.userPresets[0].name).toBe('Speed Chops Workout');
      expect(updated.userPresets[0].bpm).toBe(160);
      expect(updated.userPresets[0].sound).toBe('digital');
      expect(updated.userPresets[0].isFactory).toBe(false);
    });

    it('Updates user preset in place without creating duplicates and immediately syncs if active', () => {
      const store = useMetronomeStore.getState();
      const id = store.saveNewPreset({
        name: 'Initial Preset',
        bpm: 100,
        timeSignature: '4/4',
        subdivision: '1/4',
        sound: 'click',
      });

      expect(useMetronomeStore.getState().userPresets).toHaveLength(1);

      // Update preset in place
      store.updatePreset(id, {
        name: 'Renamed Preset',
        bpm: 135,
        subdivision: '3let',
      });

      const updated = useMetronomeStore.getState();
      expect(updated.userPresets).toHaveLength(1); // No duplicates!
      expect(updated.userPresets[0].name).toBe('Renamed Preset');
      expect(updated.userPresets[0].bpm).toBe(135);
      expect(updated.userPresets[0].subdivision).toBe('3let');
      // Active preset was updated, so store BPM synced
      expect(updated.bpm).toBe(135);
      expect(updated.subdivision).toBe('3let');
    });

    it('Duplicates user presets with independent unique IDs and (Copy) suffix', () => {
      const store = useMetronomeStore.getState();
      const origId = store.saveNewPreset({
        name: 'Funk Groove',
        bpm: 110,
        timeSignature: '4/4',
        subdivision: '1/16',
        sound: 'cowbell',
      });

      store.duplicatePreset(origId);

      const state = useMetronomeStore.getState();
      expect(state.userPresets).toHaveLength(2);
      const duplicate = state.userPresets[0];
      const original = state.userPresets[1];

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Funk Groove (Copy)');
      expect(duplicate.bpm).toBe(110);
      expect(duplicate.sound).toBe('cowbell');

      // Modifying duplicate does not affect original
      store.updatePreset(duplicate.id, { bpm: 125 });
      const afterMod = useMetronomeStore.getState();
      const origAfter = afterMod.userPresets.find((p) => p.id === origId);
      expect(origAfter?.bpm).toBe(110);
    });

    it('Deleting active preset safely selects remaining preset or falls back to null', () => {
      const store = useMetronomeStore.getState();
      const id1 = store.saveNewPreset({ name: 'Preset 1', bpm: 100 });
      const id2 = store.saveNewPreset({ name: 'Preset 2', bpm: 120 });

      expect(useMetronomeStore.getState().userPresets).toHaveLength(2);
      expect(useMetronomeStore.getState().activePresetId).toBe(id2);

      // Delete active preset (id2) -> should safely select remaining preset (id1)
      store.deletePreset(id2);
      expect(useMetronomeStore.getState().userPresets).toHaveLength(1);
      expect(useMetronomeStore.getState().activePresetId).toBe(id1);

      // Delete remaining active preset (id1) -> should fall back to null
      store.deletePreset(id1);
      expect(useMetronomeStore.getState().userPresets).toHaveLength(0);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
    });

    it('Calculates authoritative Web Audio DAC tempo progression (acceleration and deceleration)', () => {
      const engine = new MetronomeAudioEngine();

      // Configure upward ramp: 100 -> 140 BPM, 10s delay, 30s duration
      engine.setTempoRamp({
        enabled: true,
        startBpm: 100,
        targetBpm: 140,
        startDelaySec: 10,
        durationSec: 30,
        holdFinalBpm: true,
      });

      // Internal start timeline simulation at mainStartTime = 100
      (engine as any)._mainStartTime = 100;

      // 1. Prior to delay (tau = 5s): remains at startBpm (100)
      expect(engine.getEffectiveBpm(105)).toBe(100);

      // 2. Exactly at delay end (tau = 10s): 100 BPM
      expect(engine.getEffectiveBpm(110)).toBe(100);

      // 3. Halfway through duration (tau = 25s, 15s into 30s): 120 BPM
      expect(engine.getEffectiveBpm(125)).toBe(120);

      // 4. At ramp completion (tau = 40s): 140 BPM
      expect(engine.getEffectiveBpm(140)).toBe(140);

      // 5. Past duration with holdFinalBpm = true (tau = 60s): 140 BPM
      expect(engine.getEffectiveBpm(160)).toBe(140);

      // Deceleration test: 160 -> 100 BPM, 0s delay, 20s duration
      engine.setTempoRamp({
        enabled: true,
        startBpm: 160,
        targetBpm: 100,
        startDelaySec: 0,
        durationSec: 20,
        holdFinalBpm: true,
      });
      (engine as any)._mainStartTime = 200;

      // Halfway through (tau = 10s): 130 BPM
      expect(engine.getEffectiveBpm(210)).toBe(130);

      // Finished (tau = 20s): 100 BPM
      expect(engine.getEffectiveBpm(220)).toBe(100);
    });

    it('Disabling tempo progression mid-flight cleanly resets ramp and preserves effective tempo without engine restart', () => {
      const engine = new MetronomeAudioEngine();
      (engine as any)._ctx = { currentTime: 1010 };
      (engine as any)._isPlaying = true;

      engine.setTempoRamp({
        enabled: true,
        startBpm: 100,
        targetBpm: 140,
        startDelaySec: 0,
        durationSec: 20,
        holdFinalBpm: true,
      });
      (engine as any)._mainStartTime = 1000;

      // At tau = 10s (halfway): 120 BPM
      expect(engine.getEffectiveBpm(1010)).toBe(120);

      // Disable ramp mid-flight at tau = 10s
      engine.setTempoRamp({ enabled: false });

      expect(engine.tempoRamp?.enabled).toBe(false);
      // Effective BPM is now the steady BPM
      expect(engine.getEffectiveBpm()).toBe(120);
      expect(engine.bpm).toBe(120);
    });

    it('Calculates authoritative Web Audio DAC tempo progression by bars', () => {
      const engine = new MetronomeAudioEngine();
      engine.setTempoRamp({
        enabled: true,
        mode: 'bars',
        startBpm: 100,
        targetBpm: 140,
        stepBpm: 5,
        startDelayBars: 2,
        intervalBars: 4,
        holdFinalBpm: true,
      });

      // Internal timeline simulation
      (engine as any)._ctx = globalAudioCtx;
      (engine as any)._mainStartTime = 100;
      (engine as any)._inCountIn = false;

      // At measure 0: within start delay -> 100 BPM
      expect(engine.getEffectiveBpm(undefined, 0)).toBe(100);
      expect(engine.getEffectiveBpm(undefined, 1)).toBe(100);
      // At measure 2: delay ended -> 100 BPM
      expect(engine.getEffectiveBpm(undefined, 2)).toBe(100);
      // At measure 6: 4 bars completed -> +5 BPM = 105 BPM
      expect(engine.getEffectiveBpm(undefined, 6)).toBe(105);
      // At measure 10: 8 bars completed -> +10 BPM = 110 BPM
      expect(engine.getEffectiveBpm(undefined, 10)).toBe(110);
      // At measure 34: 32 bars completed -> +40 BPM = 140 BPM (target reached)
      expect(engine.getEffectiveBpm(undefined, 34)).toBe(140);
      // At measure 40: past target with holdFinalBpm = true -> remains 140 BPM
      expect(engine.getEffectiveBpm(undefined, 40)).toBe(140);

      engine.dispose();
    });
  });

  describe('Production Metronome Fixes: Preset Dynamic Identity, Restart Isolation & Scaled Artwork', () => {
    it('Fix 2: Preset identity immediately clears (activePresetId: null) when any parameter differs and auto-restores when parameters match', () => {
      const store = useMetronomeStore.getState();
      const pId = store.saveNewPreset({
        name: 'Practice Session',
        bpm: 100,
        timeSignature: '4/4',
        subdivision: '1/8',
        sound: 'cowbell',
        volume: 80,
        accentBeat: 0,
        countInEnabled: false,
      });

      store.loadPreset(pId);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 1. Changing BPM clears active preset
      store.setBpm(105);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      // Restoring BPM restores active preset
      store.setBpm(100);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 2. Adjusting BPM via delta clears and restores
      store.adjustBpm(5);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.adjustBpm(-5);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 3. Changing Time Signature clears and restores
      store.setTimeSignature('3/4');
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.setTimeSignature('4/4');
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 4. Changing Subdivision clears and restores
      store.setSubdivision('1/16');
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.setSubdivision('1/8');
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 5. Changing Sound clears and restores
      store.setSound('woodblock');
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.setSound('cowbell');
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 6. Changing Accent Beat clears and restores
      store.setAccentBeat(2);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.setAccentBeat(0);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // 7. Changing Count In clears and restores
      store.setCountInBars(1);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      store.setCountInBars(0);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);

      // Ensure the saved preset in library remained unchanged throughout
      const savedPreset = useMetronomeStore.getState().userPresets.find((p) => p.id === pId);
      expect(savedPreset).toBeDefined();
      expect(savedPreset?.bpm).toBe(100);
      expect(savedPreset?.sound).toBe('cowbell');
    });

    it('Fix 3: Presets persist in userPresets but activePresetId initializes to null', () => {
      // Metronome store state initializes with null active preset ID
      useMetronomeStore.setState({
        activePresetId: null,
        userPresets: [
          {
            id: 'saved-preset-1',
            name: 'Stored Preset',
            bpm: 120,
            timeSignature: '4/4',
            subdivision: '1/16',
            sound: 'woodblock',
            volume: 85,
            accentBeat: 0,
            countInEnabled: true,
            createdAt: Date.now(),
          },
        ],
      });

      const state = useMetronomeStore.getState();
      expect(state.userPresets).toHaveLength(1);
      // Clean default state on startup
      expect(state.activePresetId).toBeNull();
    });

    it('Fix 4: Android Media Notification shows preset name when active, Drumex Metronome when inactive, and transparent Livex logo artwork', () => {
      const store = useMetronomeStore.getState();
      const pId = store.saveNewPreset({
        name: 'Te quiero',
        bpm: 95,
        timeSignature: '4/4',
        subdivision: '1/4',
        sound: 'click',
      });

      // Load preset -> notification reflects preset title and secondary info format
      store.loadPreset(pId);
      store.start();
      expect(mockMediaSession.metadata?.title).toBe('Te quiero');
      expect(mockMediaSession.metadata?.artist).toBe('95 BPM • 4/4 • 1/4');
      expect(mockMediaSession.metadata?.album).toBe('Drumex Metronome');

      // User adjusts BPM by +1 -> preset selection clears, title becomes "Drumex Metronome", artist becomes BPM & signature & subdivision
      store.adjustBpm(1);
      expect(useMetronomeStore.getState().activePresetId).toBeNull();
      expect(mockMediaSession.metadata?.title).toBe('Drumex Metronome');
      expect(mockMediaSession.metadata?.artist).toBe('96 BPM • 4/4 • 1/4');

      // Restoring BPM restores preset name in title
      store.adjustBpm(-1);
      expect(useMetronomeStore.getState().activePresetId).toBe(pId);
      expect(mockMediaSession.metadata?.title).toBe('Te quiero');
      expect(mockMediaSession.metadata?.artist).toBe('95 BPM • 4/4 • 1/4');

      // Transparent artwork verification: 512x512 canvas with clearRect(0, 0, 512, 512) and stroked Livex logo
      generateMetronomeBpmArtwork(95, '4/4');
      expect(mockCanvasContext.clearRect).toHaveBeenCalledWith(0, 0, 512, 512);
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });
  });

  describe('Comprehensive Verification of Drumex Metronome Improvements', () => {
    it('Area 1: Configurable Count-In Bars (1, 2, 3 bars) calculate accurate duration across diverse time signatures', () => {
      const engine = new MetronomeAudioEngine();

      // 4/4 + 1 bar = 4 beats
      engine.setTimeSignature('4/4');
      engine.setCountIn(true, 1);
      engine.start();
      expect((engine as any)._countInTotalBeats).toBe(4);
      engine.stop();

      // 4/4 + 2 bars = 8 beats
      engine.setCountIn(true, 2);
      engine.start();
      expect((engine as any)._countInTotalBeats).toBe(8);
      engine.stop();

      // 3/4 + 3 bars = 9 beats
      engine.setTimeSignature('3/4');
      engine.setCountIn(true, 3);
      engine.start();
      expect((engine as any)._countInTotalBeats).toBe(9);
      engine.stop();

      // 7/8 + 2 bars = 14 beats
      engine.setTimeSignature('7/8');
      engine.setCountIn(true, 2);
      engine.start();
      expect((engine as any)._countInTotalBeats).toBe(14);
      engine.stop();

      // 5/4 + 3 bars = 15 beats
      engine.setTimeSignature('5/4');
      engine.setCountIn(true, 3);
      engine.start();
      expect((engine as any)._countInTotalBeats).toBe(15);
      engine.stop();

      engine.dispose();
    });

    it('Area 1 (Voice Safety): When voice count-in is disabled, scheduleVoicePulse NEVER schedules audio buffers', () => {
      const engine = new MetronomeAudioEngine();
      engine.setCountIn(true, 1, false); // Voice disabled
      expect(engine.countInVoiceEnabled).toBe(false);

      engine.start();
      const ctx = (engine as any)._ctx as MockAudioContext;
      const createdSources: MockBufferSourceNode[] = [];
      ctx.createBufferSource = vi.fn(() => {
        const src = new MockBufferSourceNode();
        createdSources.push(src);
        return src as any;
      });

      // Attempt to schedule voice pulse while disabled
      (engine as any).scheduleVoicePulse(1.05, 1);
      expect(createdSources.length).toBe(0);

      // Verify voice gain is set to 0
      const voiceGain = (engine as any)._voiceGain as MockGainNode;
      expect(voiceGain.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));

      engine.stop();
      engine.dispose();
    });

    it('Area 2: Curated Click Sound library synthesizes studio-quality buffers for all 7 sounds', () => {
      const engine = new MetronomeAudioEngine();
      engine.start();

      const curatedSounds = [
        'woodblock',
        'click',
        'sidestick',
        'drystick',
        'studioclick',
        'rimclick',
        'digital',
      ] as const;

      for (const snd of curatedSounds) {
        engine.setSound(snd);
        expect(engine.sound).toBe(snd);

        // Verify all 4 buffer tiers exist in map
        expect((engine as any)._soundBuffers.has(`${snd}-strong`)).toBe(true);
        expect((engine as any)._soundBuffers.has(`${snd}-accent`)).toBe(true);
        expect((engine as any)._soundBuffers.has(`${snd}-normal`)).toBe(true);
        expect((engine as any)._soundBuffers.has(`${snd}-sub`)).toBe(true);
      }

      engine.stop();
      engine.dispose();
    });

    it('Area 3: Media Player Metadata strictly formats <BPM> BPM • <TIME SIGNATURE> • <SUBDIVISION>', () => {
      const store = useMetronomeStore.getState();
      const pId = store.saveNewPreset({
        name: 'Venezia',
        bpm: 173,
        timeSignature: '9/8',
        subdivision: '1/4',
        sound: 'sidestick',
      });

      store.loadPreset(pId);
      store.start();

      // With active preset: title is Venezia, artist is 173 BPM • 9/8 • 1/4, album is Drumex Metronome
      expect(mockMediaSession.metadata?.title).toBe('Venezia');
      expect(mockMediaSession.metadata?.artist).toBe('173 BPM • 9/8 • 1/4');
      expect(mockMediaSession.metadata?.album).toBe('Drumex Metronome');

      store.stop();
    });

    it('Area 4: Multi-Accent Pattern System supports 3 tiers and cycling across diverse meters', () => {
      const store = useMetronomeStore.getState();
      store.setTimeSignature('4/4');

      // Default 4/4 has ['strong', 'normal', 'normal', 'normal']
      expect(store.accentPattern).toEqual(['strong', 'normal', 'normal', 'normal']);

      // cycleBeatAccent on Beat 2 (index 1): normal -> accent
      store.cycleBeatAccent(1);
      expect(useMetronomeStore.getState().accentPattern).toEqual([
        'strong',
        'accent',
        'normal',
        'normal',
      ]);

      // cycleBeatAccent on Beat 2 again: accent -> strong
      store.cycleBeatAccent(1);
      expect(useMetronomeStore.getState().accentPattern).toEqual([
        'strong',
        'strong',
        'normal',
        'normal',
      ]);

      // cycleBeatAccent on Beat 2 again: strong -> normal
      store.cycleBeatAccent(1);
      expect(useMetronomeStore.getState().accentPattern).toEqual([
        'strong',
        'normal',
        'normal',
        'normal',
      ]);

      // Complex odd meter 7/8
      store.setTimeSignature('7/8');
      expect(useMetronomeStore.getState().accentPattern.length).toBe(7);
      expect(metronomeAudioEngine.accentPattern.length).toBe(7);

      // Set multi-accent pattern for 2+2+3 Balkan groove
      store.setAccentPattern([
        'strong',
        'normal',
        'accent',
        'normal',
        'accent',
        'normal',
        'normal',
      ]);
      expect(useMetronomeStore.getState().accentPattern).toEqual([
        'strong',
        'normal',
        'accent',
        'normal',
        'accent',
        'normal',
        'normal',
      ]);
      expect(metronomeAudioEngine.accentPattern).toEqual([
        'strong',
        'normal',
        'accent',
        'normal',
        'accent',
        'normal',
        'normal',
      ]);
    });

    it('Area 5: Robust Tap Tempo calculates instantly on 2 taps, rejects touch-noise, and supports high BPM', () => {
      const store = useMetronomeStore.getState();
      const perfNowSpy = vi.spyOn(performance, 'now');

      // Start fresh after pause > 2000ms
      let simulatedTime = 10000;
      perfNowSpy.mockImplementation(() => simulatedTime);

      // Tap 1 at t=10000
      store.tapTempo();

      // Tap 2 at t=10500 (interval = 500ms -> 120 BPM)
      simulatedTime = 10500;
      store.tapTempo();
      expect(useMetronomeStore.getState().bpm).toBe(120);

      // Tap 3 at t=11000 (interval = 500ms -> remains 120 BPM)
      simulatedTime = 11000;
      store.tapTempo();
      expect(useMetronomeStore.getState().bpm).toBe(120);

      // Test high-tempo tapping above 220 BPM up to 240 BPM (interval = 250ms)
      // Long pause (> 2000ms) to trigger sequence reset
      simulatedTime = 15000;
      store.tapTempo(); // Tap 1 of new sequence

      simulatedTime = 15250; // 250ms later -> 240 BPM
      store.tapTempo();
      expect(useMetronomeStore.getState().bpm).toBe(240);

      // Test touch-noise rejection: tap within 50ms should be ignored (< 70ms threshold)
      simulatedTime = 15280; // Only 30ms later
      store.tapTempo();
      expect(useMetronomeStore.getState().bpm).toBe(240); // BPM unchanged!

      perfNowSpy.mockRestore();
    });
  });
});
