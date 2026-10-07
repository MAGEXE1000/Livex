import { createAudioContext, groovexStemRepository } from '@workspace/livex-core';
import SignalsmithStretch, { StretchNode } from 'signalsmith-stretch';
import { isPercussionStem } from './stemClassifier';

export interface TrackState {
  name: string;
  label: string;
  icon: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  buffer: AudioBuffer | null;
  originalBuffer: AudioBuffer | null;
  transposedCache?: Map<number, AudioBuffer>;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPercussion: boolean;
}

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = createAudioContext();
  }
  return audioCtx;
}

export function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ── IN-MEMORY DECODED AUDIOBUFFER LRU CACHE ──────────────────────────────
// Caches decoded PCM AudioBuffers in memory for recent songs (up to 3 songs)
// so that navigating between library and player or switching songs opens in 0ms.
const MAX_CACHED_DECODED_SONGS = 3;
const decodedAudioBufferCache = new Map<string, Map<string, AudioBuffer>>();

export function getCachedSongAudioBuffers(songId: string): Map<string, AudioBuffer> | null {
  const cached = decodedAudioBufferCache.get(songId);
  if (!cached) return null;
  // Refresh LRU order (delete & re-insert)
  decodedAudioBufferCache.delete(songId);
  decodedAudioBufferCache.set(songId, cached);
  return cached;
}

export function setCachedSongAudioBuffers(
  songId: string,
  buffers: Map<string, AudioBuffer> | Record<string, AudioBuffer>
): void {
  const map = buffers instanceof Map ? buffers : new Map(Object.entries(buffers));
  if (decodedAudioBufferCache.has(songId)) {
    decodedAudioBufferCache.delete(songId);
  } else if (decodedAudioBufferCache.size >= MAX_CACHED_DECODED_SONGS) {
    const oldestKey = decodedAudioBufferCache.keys().next().value;
    if (oldestKey) {
      decodedAudioBufferCache.delete(oldestKey);
    }
  }
  decodedAudioBufferCache.set(songId, map);
}

export function evictCachedSongAudioBuffers(songId?: string): void {
  if (songId) {
    decodedAudioBufferCache.delete(songId);
  } else {
    decodedAudioBufferCache.clear();
  }
}

// Auto-evict from in-memory cache when IndexedDB cache is deleted/cleared
groovexStemRepository.onCacheCleared((songId) => {
  evictCachedSongAudioBuffers(songId);
});

export const VINYL_STOP_DURATION = 0;
export const VINYL_STOP_MIN_RATE = 1.0;
export const VINYL_START_DURATION = 0;
export const VINYL_START_MIN_RATE = 1.0;

export const DELTA_STOP = 0;
export const DELTA_START = 0;

export interface AudioEngine {
  ctx: AudioContext;
  sumBus: GainNode;
  bypassGain: GainNode;
  shifterInGain: GainNode;
  shifterOutGain: GainNode;
  masterGain: GainNode;
  drumBus: GainNode;
  drumDelay: DelayNode;
  scrubFilter: BiquadFilterNode;
  scrubGain: GainNode;
  stretchNode: StretchNode | null;
  stretchLatency: number;
  tracks: TrackState[];
  isPlaying: boolean;
  isScrubbing: boolean;
  startTime: number;
  pauseOffset: number;
  duration: number;
  looping: boolean;
  _rampTimer: ReturnType<typeof setTimeout> | null;
  pitchSemitones: number;
  vinylTransitionState?: 'idle' | 'stopping' | 'starting';
}

export function playTurntableFeedback(_engine: AudioEngine, _type: 'stop' | 'start'): void {
  // Purged: No skeuomorphic vinyl crackle or turntable noise
}

export function createEngine(): AudioEngine {
  const ctx = getAudioContext();
  const sumBus = ctx.createGain();
  const bypassGain = ctx.createGain();
  const shifterInGain = ctx.createGain();
  const shifterOutGain = ctx.createGain();
  const masterGain = ctx.createGain();
  const drumBus = ctx.createGain();
  const drumDelay = ctx.createDelay(0.5);

  // Zero-semitone bypass active initially until stretchNode completes worklet handshake
  bypassGain.gain.setValueAtTime(1.0, ctx.currentTime);
  shifterInGain.gain.setValueAtTime(1.0, ctx.currentTime);
  shifterOutGain.gain.setValueAtTime(0.0, ctx.currentTime);
  masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
  drumBus.gain.setValueAtTime(1.0, ctx.currentTime);
  drumDelay.delayTime.setValueAtTime(0.0, ctx.currentTime);

  const scrubFilter = ctx.createBiquadFilter();
  scrubFilter.type = 'lowpass';
  scrubFilter.frequency.setValueAtTime(20000, ctx.currentTime);
  scrubFilter.Q.setValueAtTime(0.7, ctx.currentTime);
  const scrubGain = ctx.createGain();
  scrubGain.gain.setValueAtTime(1.0, ctx.currentTime);

  // Connect initial bypass audio graph:
  // Melodic stems route to sumBus -> bypassGain -> masterGain
  // Percussion stems route to drumBus -> drumDelay -> masterGain
  sumBus.connect(bypassGain);
  bypassGain.connect(masterGain);
  drumBus.connect(drumDelay);
  drumDelay.connect(masterGain);

  masterGain.connect(scrubFilter);
  scrubFilter.connect(scrubGain);
  scrubGain.connect(ctx.destination);

  return {
    ctx,
    sumBus,
    bypassGain,
    shifterInGain,
    shifterOutGain,
    masterGain,
    drumBus,
    drumDelay,
    scrubFilter,
    scrubGain,
    stretchNode: null,
    stretchLatency: 0,
    tracks: [],
    isPlaying: false,
    isScrubbing: false,
    startTime: 0,
    pauseOffset: 0,
    duration: 0,
    looping: false,
    _rampTimer: null,
    pitchSemitones: 0,
    vinylTransitionState: 'idle',
  };
}

export function getPitchRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function getSourceRate(_engine: AudioEngine): number {
  // Playback rate is always strictly 1.0000x for 100% time and BPM invariance
  return 1.0;
}

export async function initStretchNode(engine: AudioEngine): Promise<void> {
  if (engine.stretchNode) return;

  try {
    // Point to the static public script for maximum CSP compatibility in Android APK & Web
    SignalsmithStretch.moduleUrl = '/signalsmith-stretch.js';
    const stretchNode = await SignalsmithStretch(engine.ctx, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    const ct = engine.ctx.currentTime;
    let latencySec = 0.12; // 5292 / 44100 = 120ms
    try {
      const reported = await stretchNode.latency();
      if (typeof reported === 'number' && Number.isFinite(reported) && reported > 0) {
        latencySec = reported;
      }
    } catch {}

    engine.stretchNode = stretchNode;
    engine.stretchLatency = latencySec;

    // Connect sumBus -> stretchNode -> shifterOutGain -> masterGain
    engine.sumBus.connect(stretchNode);
    stretchNode.connect(engine.shifterOutGain);
    engine.shifterOutGain.connect(engine.masterGain);

    // Apply sample-accurate latency alignment: delay drums by exact stretch latency
    engine.drumDelay.delayTime.setValueAtTime(latencySec, ct);

    // Smoothly activate worklet output and disable initial bypass
    engine.shifterOutGain.gain.setValueAtTime(1.0, ct);
    engine.bypassGain.gain.setValueAtTime(0.0, ct);
    try {
      engine.sumBus.disconnect(engine.bypassGain);
      engine.bypassGain.disconnect(engine.masterGain);
    } catch {}

    if (typeof stretchNode.schedule === 'function') {
      stretchNode.schedule({ active: true, semitones: engine.pitchSemitones });
    }
  } catch (err) {
    console.warn('[GrooveX AudioEngine] Signalsmith Stretch initialization error:', err);
  }
}

export const initSoundTouch = initStretchNode;

export function createSyntheticAudioBuffer(
  ctx: AudioContext,
  durationSeconds: number = 180,
  sampleRate: number = 44100
): AudioBuffer {
  const duration = Math.max(1, durationSeconds || 180);
  const length = Math.floor(sampleRate * duration);
  return ctx.createBuffer(2, length, sampleRate);
}

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  try {
    const copy = arrayBuffer.slice(0);
    return await ctx.decodeAudioData(copy);
  } catch (err) {
    console.warn('[GrooveX AudioEngine] decodeAudioData failed for file, using synthetic buffer:', err);
    return createSyntheticAudioBuffer(ctx);
  }
}

export async function loadAudioBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackDuration: number = 180
): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  try {
    const copy = arrayBuffer.slice(0);
    return await ctx.decodeAudioData(copy);
  } catch (err) {
    console.warn('[GrooveX AudioEngine] decodeAudioData failed, using synthetic reference buffer:', err);
    return createSyntheticAudioBuffer(ctx, fallbackDuration);
  }
}

export function initTracks(
  engine: AudioEngine,
  stems: { name: string; label?: string; icon?: string }[],
  defaultVolume: number = 1.0
): TrackState[] {
  engine.tracks = stems.map((s) => {
    const isPercussion = isPercussionStem(s);
    const gainNode = engine.ctx.createGain();

    // Stems separation:
    // Percussion stems route directly to drumBus (100% immune to pitch processing)
    // Non-percussion melodic stems route into sumBus -> SignalsmithStretch
    if (isPercussion) {
      gainNode.connect(engine.drumBus);
    } else {
      gainNode.connect(engine.sumBus);
    }

    return {
      name: s.name,
      label: s.label || s.name,
      icon: s.icon || (isPercussion ? 'layers' : 'music_note'),
      volume: defaultVolume,
      muted: false,
      solo: false,
      buffer: null,
      originalBuffer: null,
      source: null,
      gainNode,
      isPercussion,
    };
  });
  applyMutesSolos(engine);
  return engine.tracks;
}

export function setTrackBuffer(engine: AudioEngine, trackIndex: number, buffer: AudioBuffer): void {
  const track = engine.tracks[trackIndex];
  if (!track) return;
  track.originalBuffer = buffer;
  track.buffer = buffer;

  if (buffer.duration > engine.duration) {
    engine.duration = buffer.duration;
  }
}

export function play(engine: AudioEngine, onTransitionComplete?: () => void): void {
  if (engine.isPlaying) return;

  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }

  const ctx = engine.ctx;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  stopSources(engine);

  const offset = Math.max(0, Math.min(engine.pauseOffset, engine.duration || 0));
  engine.startTime = ctx.currentTime - offset;
  engine.isPlaying = true;
  engine.vinylTransitionState = 'idle';

  try {
    engine.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    engine.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
  } catch {}

  startSourcesAtOffset(engine, offset);

  if (engine.stretchNode && typeof engine.stretchNode.schedule === 'function') {
    engine.stretchNode.schedule({ active: true, semitones: engine.pitchSemitones });
  }

  onTransitionComplete?.();
}

export function pause(engine: AudioEngine, onComplete?: () => void): void {
  if (!engine.isPlaying) return;

  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }

  engine.pauseOffset = getCurrentTime(engine);
  stopSources(engine);
  engine.isPlaying = false;
  engine.vinylTransitionState = 'idle';

  try {
    engine.masterGain.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.masterGain.gain.setValueAtTime(1.0, engine.ctx.currentTime);
  } catch {}

  onComplete?.();
}

export function stop(engine: AudioEngine): void {
  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }
  engine.vinylTransitionState = 'idle';
  try {
    engine.masterGain.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.masterGain.gain.setValueAtTime(1.0, engine.ctx.currentTime);
  } catch {}
  stopSources(engine);
  engine.isPlaying = false;
  engine.pauseOffset = 0;
  if (engine.stretchNode && typeof (engine.stretchNode as any).reset === 'function') {
    try {
      (engine.stretchNode as any).reset();
    } catch {}
  }
}

function stopSources(engine: AudioEngine): void {
  engine.tracks.forEach((track) => {
    if (track.source) {
      try {
        track.source.stop();
      } catch {}
      track.source.disconnect();
      track.source = null;
    }
  });
}

function startSourcesAtOffset(
  engine: AudioEngine,
  offset: number
): void {
  const ctx = engine.ctx;
  const ct = ctx.currentTime;
  engine.tracks.forEach((track) => {
    if (!track.buffer || !track.gainNode) return;
    if (offset >= track.buffer.duration) return;
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.loop = engine.looping;
    source.connect(track.gainNode);
    source.playbackRate.setValueAtTime(1.0, ct);

    source.start(0, offset);
    track.source = source;
    if (!engine.looping) {
      source.onended = () => {
        if (engine.isPlaying) {
          const songPos = getCurrentTime(engine);
          if (songPos >= engine.duration - 0.1) {
            stop(engine);
          }
        }
      };
    }
  });
  applyMutesSolos(engine);
}

export function seek(engine: AudioEngine, time: number): void {
  const wasPlaying = engine.isPlaying;
  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }
  engine.vinylTransitionState = 'idle';
  if (wasPlaying) stopSources(engine);
  const clamped = Math.max(0, Math.min(time, engine.duration));
  engine.pauseOffset = clamped;

  try {
    engine.masterGain.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.masterGain.gain.setValueAtTime(1.0, engine.ctx.currentTime);
  } catch {}

  if (engine.stretchNode) {
    if (typeof (engine.stretchNode as any).reset === 'function') {
      try {
        (engine.stretchNode as any).reset();
      } catch {}
    }
    if (typeof engine.stretchNode.schedule === 'function') {
      engine.stretchNode.schedule({ active: true, semitones: engine.pitchSemitones });
    }
  }

  if (wasPlaying) {
    const ctx = engine.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    engine.startTime = ctx.currentTime - clamped;
    engine.isPlaying = true;
    startSourcesAtOffset(engine, clamped);
  } else {
    engine.isPlaying = false;
  }
}

export function startScrub(engine: AudioEngine): void {
  engine.isScrubbing = true;
}

export function scrubSeek(_engine: AudioEngine, _delta: number): void {
  // Maintained for API compatibility without altering source playbackRate
}

export function endScrub(engine: AudioEngine, targetTime: number): void {
  engine.isScrubbing = false;
  seek(engine, targetTime);
}

export function setPitch(engine: AudioEngine, semitones: number): void {
  if (engine.pitchSemitones === semitones) return;
  engine.pitchSemitones = semitones;

  // Real-time parameter automation in the AudioWorklet thread: zero UI thread overhead
  if (engine.stretchNode && typeof engine.stretchNode.schedule === 'function') {
    engine.stretchNode.schedule({ active: true, semitones });
  }
}

export function setTrackVolume(engine: AudioEngine, trackIndex: number, volume: number): void {
  const track = engine.tracks[trackIndex];
  if (!track || !track.gainNode) return;
  track.volume = volume;
  applyMutesSolos(engine);
}

export function toggleMute(engine: AudioEngine, trackIndex: number): void {
  const track = engine.tracks[trackIndex];
  if (!track) return;
  track.muted = !track.muted;
  applyMutesSolos(engine);
}

export function toggleSolo(engine: AudioEngine, trackIndex: number): void {
  const track = engine.tracks[trackIndex];
  if (!track) return;
  track.solo = !track.solo;
  applyMutesSolos(engine);
}

export function setMasterVolume(engine: AudioEngine, volume: number): void {
  const ct = engine.ctx.currentTime;
  engine.masterGain.gain.setValueAtTime(volume, ct);
  engine.drumBus.gain.setValueAtTime(volume, ct);
}

function applyMutesSolos(engine: AudioEngine): void {
  const anySolo = engine.tracks.some((t) => t.solo);
  engine.tracks.forEach((track) => {
    if (!track.gainNode) return;
    let effectiveVolume = track.volume;
    if (track.muted) effectiveVolume = 0;
    else if (anySolo && !track.solo) effectiveVolume = 0;
    track.gainNode.gain.setValueAtTime(effectiveVolume, engine.ctx.currentTime);
  });
}

export function getCurrentTime(engine: AudioEngine): number {
  if (!engine.isPlaying) return engine.pauseOffset;

  const ct = engine.ctx.currentTime;
  const songPos = ct - engine.startTime;
  if (engine.looping && engine.duration > 0) {
    return songPos % engine.duration;
  }
  return Math.min(Math.max(0, songPos), engine.duration);
}

export function destroyEngine(engine: AudioEngine): void {
  stop(engine);
  engine.tracks.forEach((t) => {
    if (t.gainNode) t.gainNode.disconnect();
    t.transposedCache?.clear();
  });
  engine.sumBus.disconnect();
  engine.bypassGain.disconnect();
  engine.shifterInGain.disconnect();
  engine.shifterOutGain.disconnect();
  engine.masterGain.disconnect();
  engine.drumBus.disconnect();
  engine.drumDelay.disconnect();
  if (engine.stretchNode) {
    try {
      engine.stretchNode.disconnect();
    } catch {}
    engine.stretchNode = null;
  }
  engine.scrubFilter.disconnect();
  engine.scrubGain.disconnect();
}

