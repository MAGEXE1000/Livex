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

function getAudioContext(): AudioContext {
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

export const VINYL_STOP_DURATION = 0.65; // 650ms turntable platter deceleration
export const VINYL_STOP_MIN_RATE = 0.04; // Lowest playback rate before full stop
export const VINYL_START_DURATION = 0.45; // 450ms direct-drive motor spin-up acceleration
export const VINYL_START_MIN_RATE = 0.15; // Initial rate when needle cues into spinning platter

export const DELTA_STOP = ((1.0 + VINYL_STOP_MIN_RATE) / 2) * VINYL_STOP_DURATION;
export const DELTA_START = ((VINYL_START_MIN_RATE + 1.0) / 2) * VINYL_START_DURATION;

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
  turntableBus: GainNode;
  vinylStopBuffer: AudioBuffer | null;
  vinylStartBuffer: AudioBuffer | null;
  turntableSource: AudioBufferSourceNode | null;
  vinylTransitionState: 'idle' | 'stopping' | 'starting';
  transitionStartTime: number;
  transitionStartOffset: number;
  transitionDuration: number;
}

/**
 * Synthesizes realistic vinyl turntable stop (platter brake / needle drag)
 * and start (needle cue / direct-drive spin-up) AudioBuffers locally.
 * Guarantees zero network latency, zero disk I/O, and zero dependency on stem playback rates.
 */
function createVinylBuffers(ctx: AudioContext): {
  stopBuffer: AudioBuffer;
  startBuffer: AudioBuffer;
} {
  const sampleRate = ctx.sampleRate || 44100;

  // 1. Turntable Stop / Platter Brake (~520ms)
  const stopDur = 0.52;
  const stopLen = Math.floor(sampleRate * stopDur);
  const stopBuffer = ctx.createBuffer(1, stopLen, sampleRate);
  const stopData = stopBuffer.getChannelData(0);

  let bp_x1 = 0;
  let bp_x2 = 0;
  let bp_y1 = 0;
  let bp_y2 = 0;
  const stopStartFreq = 340;
  const stopMinFreq = 28;
  const stopDecayRate = 7.2;
  let stopPhase = 0;

  for (let i = 0; i < stopLen; i++) {
    const t = i / sampleRate;
    const norm = t / stopDur;

    // Decelerating instantaneous frequency sweep
    const f = (stopStartFreq - stopMinFreq) * Math.exp(-stopDecayRate * t) + stopMinFreq;
    stopPhase += (2 * Math.PI * f) / sampleRate;

    // Harmonic tonal motor/groove drag timbre
    const tone =
      Math.sin(stopPhase) * 0.55 +
      Math.sin(stopPhase * 2) * 0.25 +
      Math.sin(stopPhase * 3) * 0.12 +
      Math.sin(stopPhase * 0.5) * 0.18;

    // Vinyl needle surface friction bandpass
    const whiteNoise = Math.random() * 2 - 1;
    const centerFreq = Math.max(300, 2200 * Math.exp(-stopDecayRate * t * 0.8));
    const Q = 1.8;
    const w0 = (2 * Math.PI * centerFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;

    const filteredNoise =
      (b0 / a0) * whiteNoise +
      (b1 / a0) * bp_x1 +
      (b2 / a0) * bp_x2 -
      (a1 / a0) * bp_y1 -
      (a2 / a0) * bp_y2;
    bp_x2 = bp_x1;
    bp_x1 = whiteNoise;
    bp_y2 = bp_y1;
    bp_y1 = filteredNoise;

    // Vinyl micro-crackle
    let crackle = 0;
    if (Math.random() < 0.003 * (1 - norm)) {
      crackle = (Math.random() * 2 - 1) * 0.35;
    }

    // Brake click transient
    const brakeTransient =
      t < 0.008 ? Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 600) * 0.35 : 0;

    // Envelope
    const env = Math.pow(1 - norm, 1.8) * Math.min(1, t / 0.003);
    stopData[i] = (tone * 0.65 + filteredNoise * 0.45 + crackle + brakeTransient) * env * 0.85;
  }

  // 2. Turntable Start / Needle Cue Spin-up (~260ms)
  const startDur = 0.26;
  const startLen = Math.floor(sampleRate * startDur);
  const startBuffer = ctx.createBuffer(1, startLen, sampleRate);
  const startData = startBuffer.getChannelData(0);

  bp_x1 = 0;
  bp_x2 = 0;
  bp_y1 = 0;
  bp_y2 = 0;
  const startStartFreq = 75;
  const startEndFreq = 420;
  let startPhase = 0;

  for (let i = 0; i < startLen; i++) {
    const t = i / sampleRate;
    const norm = t / startDur;

    // Accelerating instantaneous frequency sweep
    const f = startStartFreq + (startEndFreq - startStartFreq) * Math.pow(norm, 1.6);
    startPhase += (2 * Math.PI * f) / sampleRate;

    // Harmonic tonal motor spin-up
    const tone =
      Math.sin(startPhase) * 0.5 +
      Math.sin(startPhase * 2) * 0.28 +
      Math.sin(startPhase * 3) * 0.14;

    // Rising vinyl surface friction noise
    const whiteNoise = Math.random() * 2 - 1;
    const centerFreq = Math.min(3200, 400 + 2600 * Math.pow(norm, 1.4));
    const Q = 1.6;
    const w0 = (2 * Math.PI * centerFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;

    const filteredNoise =
      (b0 / a0) * whiteNoise +
      (b1 / a0) * bp_x1 +
      (b2 / a0) * bp_x2 -
      (a1 / a0) * bp_y1 -
      (a2 / a0) * bp_y2;
    bp_x2 = bp_x1;
    bp_x1 = whiteNoise;
    bp_y2 = bp_y1;
    bp_y1 = filteredNoise;

    // Needle landing in groove transient
    const needleDrop =
      t < 0.015
        ? (Math.random() * 2 - 1) * Math.exp(-t * 500) * 0.45 +
          Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 700) * 0.4
        : 0;

    let env = 1.0;
    if (t < 0.005) {
      env = t / 0.005;
    } else if (t > 0.18) {
      env = Math.pow(1 - (t - 0.18) / (startDur - 0.18), 2.0);
    }

    startData[i] = (tone * 0.55 + filteredNoise * 0.45 + needleDrop) * env * 0.75;
  }

  return { stopBuffer, startBuffer };
}

export function playTurntableFeedback(engine: AudioEngine, type: 'stop' | 'start'): void {
  const ctx = engine.ctx;
  if (!ctx || ctx.state === 'suspended') return;
  const buffer = type === 'stop' ? engine.vinylStopBuffer : engine.vinylStartBuffer;
  if (!buffer) return;

  if (engine.turntableSource) {
    try {
      engine.turntableSource.stop();
    } catch {}
    try {
      engine.turntableSource.disconnect();
    } catch {}
    engine.turntableSource = null;
  }

  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(engine.turntableBus);
    source.start(ctx.currentTime);
    engine.turntableSource = source;
    source.onended = () => {
      if (engine.turntableSource === source) {
        engine.turntableSource = null;
      }
    };
  } catch (err) {
    console.warn('[GrooveX AudioEngine] Turntable feedback error:', err);
  }
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

  const turntableBus = ctx.createGain();
  turntableBus.gain.setValueAtTime(0.8, ctx.currentTime);
  // Route turntable feedback directly to scrubFilter so masterGain fade during pause doesn't mute brake SFX
  turntableBus.connect(scrubFilter);

  let vinylStopBuffer: AudioBuffer | null = null;
  let vinylStartBuffer: AudioBuffer | null = null;
  try {
    const buffers = createVinylBuffers(ctx);
    vinylStopBuffer = buffers.stopBuffer;
    vinylStartBuffer = buffers.startBuffer;
  } catch (err) {
    console.warn('[GrooveX AudioEngine] Vinyl buffer synthesis error:', err);
  }

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
    turntableBus,
    vinylStopBuffer,
    vinylStartBuffer,
    turntableSource: null,
    vinylTransitionState: 'idle',
    transitionStartTime: 0,
    transitionStartOffset: 0,
    transitionDuration: 0,
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

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export async function loadAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  return ctx.decodeAudioData(arrayBuffer);
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
  if (engine.isPlaying && engine.vinylTransitionState === 'idle') return;

  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }

  const ctx = engine.ctx;
  if (ctx.state === 'suspended') ctx.resume();
  const ct = ctx.currentTime;

  // Case A: Play called while decelerating (user re-engages platter before full stop)
  if (engine.isPlaying && engine.vinylTransitionState === 'stopping') {
    const elapsed = Math.min(VINYL_STOP_DURATION, Math.max(0, ct - engine.transitionStartTime));
    const curRate = Math.max(
      VINYL_STOP_MIN_RATE,
      1.0 - (1.0 - VINYL_STOP_MIN_RATE) * (elapsed / VINYL_STOP_DURATION)
    );
    const curOffset = getCurrentTime(engine);
    const rampDur = Math.max(0.15, VINYL_START_DURATION * (1.0 - curRate));

    engine.tracks.forEach((track) => {
      if (track.source) {
        try {
          track.source.playbackRate.cancelScheduledValues(ct);
          track.source.playbackRate.setValueAtTime(curRate, ct);
          track.source.playbackRate.linearRampToValueAtTime(1.0, ct + rampDur);
        } catch {}
      }
    });

    try {
      engine.masterGain.gain.cancelScheduledValues(ct);
      engine.masterGain.gain.setValueAtTime(engine.masterGain.gain.value, ct);
      engine.masterGain.gain.linearRampToValueAtTime(1.0, ct + rampDur);
    } catch {}

    const deltaSpin = ((curRate + 1.0) / 2) * rampDur;
    engine.startTime = ct + rampDur - (curOffset + deltaSpin);
    engine.vinylTransitionState = 'starting';
    engine.transitionStartTime = ct;
    engine.transitionStartOffset = curOffset;
    engine.transitionDuration = rampDur;

    playTurntableFeedback(engine, 'start');

    engine._rampTimer = setTimeout(() => {
      engine._rampTimer = null;
      engine.vinylTransitionState = 'idle';
      onTransitionComplete?.();
    }, rampDur * 1000);
    return;
  }

  // Case B: Normal play from stopped/paused state
  stopSources(engine);

  const offset = engine.pauseOffset;
  const startDur = VINYL_START_DURATION;
  const startRate = VINYL_START_MIN_RATE;
  const deltaStart = DELTA_START;

  // Exact mathematical timeline alignment:
  // At t = ct + startDur, song position will be (offset + deltaStart), and rate will be 1.0.
  // Therefore: startTime = (ct + startDur) - (offset + deltaStart)
  engine.startTime = ct + startDur - (offset + deltaStart);
  engine.isPlaying = true;
  engine.vinylTransitionState = 'starting';
  engine.transitionStartTime = ct;
  engine.transitionStartOffset = offset;
  engine.transitionDuration = startDur;

  // Master gain ramps up to eliminate initial transient clicks
  try {
    engine.masterGain.gain.cancelScheduledValues(ct);
    engine.masterGain.gain.setValueAtTime(0.0, ct);
    engine.masterGain.gain.linearRampToValueAtTime(1.0, ct + Math.min(0.12, startDur));
  } catch {}

  startSourcesAtOffset(engine, offset, startRate, startDur);
  playTurntableFeedback(engine, 'start');

  if (engine.stretchNode && typeof engine.stretchNode.schedule === 'function') {
    engine.stretchNode.schedule({ active: true, semitones: engine.pitchSemitones });
  }

  console.log(
    `[GrooveX Vinyl] RESUME Transition started: duration=${(startDur * 1000).toFixed(0)}ms, ` +
      `rate: ${startRate.toFixed(2)}x -> 1.00x, offset=${offset.toFixed(3)}s`
  );

  engine._rampTimer = setTimeout(() => {
    engine._rampTimer = null;
    engine.vinylTransitionState = 'idle';
    console.log(
      `[GrooveX Vinyl] RESUME Transition stabilized: rate=1.00x, position=${getCurrentTime(engine).toFixed(3)}s`
    );
    onTransitionComplete?.();
  }, startDur * 1000);
}

export function pause(engine: AudioEngine, onComplete?: () => void): void {
  if (!engine.isPlaying) return;
  if (engine.vinylTransitionState === 'stopping') return;

  if (engine._rampTimer) {
    clearTimeout(engine._rampTimer);
    engine._rampTimer = null;
  }

  const ctx = engine.ctx;
  const ct = ctx.currentTime;
  const currentPos = getCurrentTime(engine);
  const stopDur = VINYL_STOP_DURATION;
  const minRate = VINYL_STOP_MIN_RATE;

  engine.vinylTransitionState = 'stopping';
  engine.transitionStartTime = ct;
  engine.transitionStartOffset = currentPos;
  engine.transitionDuration = stopDur;

  // Decelerate all active stem sources (physical turntable losing speed & pitching down)
  engine.tracks.forEach((track) => {
    if (track.source) {
      try {
        track.source.playbackRate.cancelScheduledValues(ct);
        track.source.playbackRate.setValueAtTime(track.source.playbackRate.value, ct);
        track.source.playbackRate.linearRampToValueAtTime(minRate, ct + stopDur);
      } catch {}
    }
  });

  // Fade masterGain smoothly to 0.0 (emulating phono cartridge output loss + zero pop)
  try {
    engine.masterGain.gain.cancelScheduledValues(ct);
    engine.masterGain.gain.setValueAtTime(engine.masterGain.gain.value, ct);
    engine.masterGain.gain.linearRampToValueAtTime(0.0, ct + stopDur);
  } catch {}

  playTurntableFeedback(engine, 'stop');

  const deltaStop = DELTA_STOP;
  const finalOffset = Math.min(engine.duration, currentPos + deltaStop);

  console.log(
    `[GrooveX Vinyl] PAUSE Transition started: duration=${(stopDur * 1000).toFixed(0)}ms, ` +
      `rate: 1.00x -> ${minRate.toFixed(2)}x, posBefore=${currentPos.toFixed(3)}s`
  );

  engine._rampTimer = setTimeout(() => {
    engine._rampTimer = null;
    engine.pauseOffset = finalOffset;
    stopSources(engine);
    engine.isPlaying = false;
    engine.vinylTransitionState = 'idle';

    // Restore masterGain for subsequent playback
    try {
      engine.masterGain.gain.cancelScheduledValues(engine.ctx.currentTime);
      engine.masterGain.gain.setValueAtTime(1.0, engine.ctx.currentTime);
    } catch {}

    console.log(
      `[GrooveX Vinyl] PAUSE Transition completed: stopped at position=${finalOffset.toFixed(3)}s`
    );

    onComplete?.();
  }, stopDur * 1000);
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
  if (engine.turntableSource) {
    try {
      engine.turntableSource.stop();
    } catch {}
    try {
      engine.turntableSource.disconnect();
    } catch {}
    engine.turntableSource = null;
  }
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
  offset: number,
  initialRate: number = 1.0,
  rampDuration: number = 0
): void {
  const ctx = engine.ctx;
  const ct = ctx.currentTime;
  engine.tracks.forEach((track) => {
    if (!track.buffer || !track.gainNode) return;
    // Prevent starting sources if offset is past buffer duration
    if (offset >= track.buffer.duration) return;
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.loop = engine.looping;
    source.connect(track.gainNode);

    if (rampDuration > 0 && initialRate < 1.0) {
      source.playbackRate.setValueAtTime(initialRate, ct);
      source.playbackRate.linearRampToValueAtTime(1.0, ct + rampDuration);
    } else {
      source.playbackRate.setValueAtTime(1.0, ct);
    }

    source.start(0, offset);
    track.source = source;
    if (!engine.looping) {
      source.onended = () => {
        if (engine.isPlaying && engine.vinylTransitionState === 'idle') {
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

  // Restore masterGain if interrupted during fade
  try {
    engine.masterGain.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.masterGain.gain.setValueAtTime(1.0, engine.ctx.currentTime);
  } catch {}

  // Flush and reset DSP worklet buffer state to eliminate stale audio frames
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
    startSourcesAtOffset(engine, clamped, 1.0, 0);
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

  // During vinyl stopping transition: integrate decelerating rate curve
  if (engine.vinylTransitionState === 'stopping') {
    const elapsed = Math.min(
      engine.transitionDuration,
      Math.max(0, ct - engine.transitionStartTime)
    );
    const currentRate = 1.0 - (1.0 - VINYL_STOP_MIN_RATE) * (elapsed / engine.transitionDuration);
    const progress = ((1.0 + currentRate) / 2) * elapsed;
    const pos = engine.transitionStartOffset + progress;
    return Math.min(engine.duration, Math.max(0, pos));
  }

  // During vinyl starting transition: integrate accelerating rate curve
  if (engine.vinylTransitionState === 'starting') {
    const elapsed = Math.min(
      engine.transitionDuration,
      Math.max(0, ct - engine.transitionStartTime)
    );
    const currentRate =
      VINYL_START_MIN_RATE + (1.0 - VINYL_START_MIN_RATE) * (elapsed / engine.transitionDuration);
    const progress = ((VINYL_START_MIN_RATE + currentRate) / 2) * elapsed;
    const pos = engine.transitionStartOffset + progress;
    return Math.min(engine.duration, Math.max(0, pos));
  }

  // Normal playback at exact 1.0000x rate
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
  try {
    engine.turntableBus.disconnect();
  } catch {}
}
