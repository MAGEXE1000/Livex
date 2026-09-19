import type { InstrumentStringTarget, InstrumentTuningMode } from './tunerTypes';
import { createAudioContext } from '../audioContextOptions';
import { drumAssetUrl } from '../storage/assetCache';
import { loadAudioSample } from '../audio/audioSampleLoader';
import { TUNER_SAMPLE_DATA } from './tunerSampleData';
import type { DrumPartId, DrumTensionId } from './drumTuningModels';
import { DRUM_PARTS, findNearestDrumPart } from './drumTuningModels';

let playbackAudioCtx: AudioContext | null = null;
const decodedBufferCache = new Map<string, AudioBuffer>();
let currentPlaybackId = 0;

let activeSources: AudioBufferSourceNode[] = [];
let activeGainNodes: GainNode[] = [];
let playbackTimeout: ReturnType<typeof setTimeout> | null = null;

export interface ActiveReferencePlayback {
  target: InstrumentStringTarget;
  frequency: number;
  mode: InstrumentTuningMode;
  startTime: number;
  duration: number;
}

let activePlaybackInfo: ActiveReferencePlayback | null = null;

/**
 * Calibrated post-playback settling duration in milliseconds.
 * Accounts for phone loudspeaker physical dissipation, small room acoustic reverb,
 * and draining the 2048-sample (~43ms) Web Audio analyzer input buffer.
 */
export const REFERENCE_SETTLING_TIME_MS = 250;

let suppressionUntilTimestamp = 0;
let activeToneCleanup: (() => void) | null = null;

/**
 * Returns currently active reference playback metadata, or null if no reference sound is playing.
 */
export function getActiveReferencePlayback(): ActiveReferencePlayback | null {
  return activePlaybackInfo;
}

/**
 * Returns whether reference audio is actively sounding through the speaker.
 */
export function isReferencePlaybackActive(): boolean {
  return activePlaybackInfo !== null || activeSources.length > 0;
}

/**
 * Returns whether pitch detection should be suppressed to isolate the tuner
 * from speaker acoustic feedback during reference playback or post-playback settling.
 */
export function isReferenceSuppressionActive(): boolean {
  return isReferencePlaybackActive() || Date.now() < suppressionUntilTimestamp;
}

/**
 * Returns remaining suppression duration in milliseconds, or 0 if suppression is inactive.
 */
export function getSuppressionRemainingMs(): number {
  return Math.max(0, suppressionUntilTimestamp - Date.now());
}

/**
 * Extends the suppression window for a specified duration plus the calibrated settling decay.
 */
export function markReferenceSuppression(durationMs: number): void {
  suppressionUntilTimestamp = Math.max(
    suppressionUntilTimestamp,
    Date.now() + Math.max(0, durationMs) + REFERENCE_SETTLING_TIME_MS
  );
}

/**
 * Immediately clears reference suppression. Used for test isolation and instant teardowns.
 */
export function clearTunerReferenceSuppression(): void {
  if (activeToneCleanup) {
    activeToneCleanup();
    activeToneCleanup = null;
  }
  activePlaybackInfo = null;
  suppressionUntilTimestamp = 0;
}

/**
 * Starts a coordinated reference tone suppression window for pure oscillator fallback tones.
 * Returns a cleanup function invoked when the tone stops.
 */
export function startReferenceToneSuppression(frequency: number, durationSeconds: number): () => void {
  if (activeToneCleanup) {
    activeToneCleanup();
    activeToneCleanup = null;
  }

  const durationMs = durationSeconds * 1000;
  const now = Date.now();
  suppressionUntilTimestamp = now + durationMs + REFERENCE_SETTLING_TIME_MS;

  activePlaybackInfo = {
    target: {
      name: 'Tone',
      note: '',
      octave: 0,
      fullName: `${frequency.toFixed(1)} Hz`,
      frequency,
      stringNumber: 0,
    },
    frequency,
    mode: 'electric',
    startTime: now,
    duration: durationSeconds,
  };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (activePlaybackInfo?.target.name === 'Tone') {
      activePlaybackInfo = null;
    }
    suppressionUntilTimestamp = Math.max(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    if (activeToneCleanup === cleanup) {
      activeToneCleanup = null;
    }
  };

  activeToneCleanup = cleanup;
  return cleanup;
}

/**
 * Clears decoded AudioBuffer cache and resets suppression state for test isolation.
 */
export function clearTunerReferenceCache(): void {
  decodedBufferCache.clear();
  clearTunerReferenceSuppression();
}

/**
 * Provides a dedicated, isolated AudioContext for reference string playback.
 * Used as a fallback when the main TunerAudioEngine AudioContext is not active.
 */
export function getPlaybackAudioContext(): AudioContext | null {
  const AC =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : (globalThis as any).AudioContext;

  if (!AC) return null;

  if (!playbackAudioCtx || playbackAudioCtx.state === 'closed') {
    try {
      playbackAudioCtx = createAudioContext();
    } catch {
      playbackAudioCtx = null;
    }
  }
  if (playbackAudioCtx && playbackAudioCtx.state === 'suspended') {
    playbackAudioCtx.resume().catch(() => {});
  }
  return playbackAudioCtx;
}

/**
 * Resolves instrument family key from tuning mode.
 */
export function getFamilyForMode(mode: InstrumentTuningMode): 'acoustic' | 'electric' | 'bass' {
  if (mode === 'bass-4') return 'bass';
  if (mode === 'acoustic') return 'acoustic';
  return 'electric';
}

/**
 * Decodes and caches a reference audio buffer by family and note name (e.g. 'acoustic:E2', 'bass:B0').
 */
async function getOrDecodeNoteBuffer(
  ctx: AudioContext,
  family: 'acoustic' | 'electric' | 'bass',
  noteName: string
): Promise<AudioBuffer | null> {
  const cacheKey = `${family}:${noteName}`;
  const cached = decodedBufferCache.get(cacheKey);
  if (cached) return cached;

  const sample = await loadAudioSample(ctx, `/audio/tuner/${family}/${noteName}.mp3`);
  if (!sample) {
    console.warn(`[tunerReferenceAudio] Sample not found for ${family}:${noteName}`);
    return null;
  }

  decodedBufferCache.set(cacheKey, sample);
  return sample;
}

// ── Authoritative House Kit Sample Mapping for Drum Tuner ─────────────────────
export interface HouseKitAnchorConfig {
  partId: DrumPartId;
  name: string;
  path: string;
  anchorHz: number;
  duration: number;
}

export const HOUSE_KIT_TUNER_ANCHORS: Record<DrumPartId, HouseKitAnchorConfig> = {
  snare: {
    partId: 'snare',
    name: 'Tarola',
    path: '/drums/realistic/snare/blend/hard_1.opus',
    anchorHz: 211.5,
    duration: 2.5,
  },
  tom1: {
    partId: 'tom1',
    name: 'Tom 1',
    path: '/drums/realistic/tom10/blend/med_1.opus',
    anchorHz: 145.5,
    duration: 2.8,
  },
  tom2: {
    partId: 'tom2',
    name: 'Tom 2',
    path: '/drums/realistic/tom12/blend/med_1.opus',
    anchorHz: 112.4,
    duration: 2.8,
  },
  floorTom: {
    partId: 'floorTom',
    name: 'Piso',
    path: '/drums/realistic/tom16/blend/med_1.opus',
    anchorHz: 72.7,
    duration: 3.0,
  },
  kick: {
    partId: 'kick',
    name: 'Bombo',
    path: '/drums/realistic/kick/blend/med_1.opus',
    anchorHz: 59.5,
    duration: 1.8,
  },
};

/**
 * Loads and caches an authentic House Kit drum sample into an AudioBuffer.
 * Pre-decoded in memory so playback has zero latency.
 */
export async function loadDrumReferenceBuffer(
  ctx: AudioContext,
  partId: DrumPartId
): Promise<AudioBuffer | null> {
  const cacheKey = `drum:${partId}`;
  const cached = decodedBufferCache.get(cacheKey);
  if (cached) return cached;

  const anchor = HOUSE_KIT_TUNER_ANCHORS[partId];
  if (!anchor) return null;

  try {
    const url = await drumAssetUrl(anchor.path);
    const resp = await fetch(url, { cache: 'force-cache' });
    if (!resp.ok) {
      console.warn(`[tunerReferenceAudio] Failed to fetch drum sample for ${partId}: HTTP ${resp.status}`);
      return null;
    }
    const arrayBuf = await resp.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    decodedBufferCache.set(cacheKey, audioBuf);
    return audioBuf;
  } catch (err) {
    console.warn(`[tunerReferenceAudio] Failed to decode drum sample for ${partId}:`, err);
    return null;
  }
}

/**
 * Pre-decodes reference samples for an instrument mode in the background.
 */
export async function preloadTunerReferenceAudio(
  mode: InstrumentTuningMode,
  audioCtx?: AudioContext
): Promise<void> {
  const ctx = audioCtx && audioCtx.state !== 'closed' ? audioCtx : getPlaybackAudioContext();
  if (!ctx || typeof ctx.decodeAudioData !== 'function') return;

  if (mode === 'drum') {
    const drumParts: DrumPartId[] = ['snare', 'tom1', 'tom2', 'floorTom', 'kick'];
    await Promise.all(
      drumParts.map(async (partId) => {
        if (!decodedBufferCache.has(`drum:${partId}`)) {
          await loadDrumReferenceBuffer(ctx, partId);
        }
      })
    );
    return;
  }

  const family = getFamilyForMode(mode);
  try {
    const familyBank = TUNER_SAMPLE_DATA[family];
    if (!familyBank) return;

    const notes = Object.keys(familyBank);
    for (const note of notes) {
      const cacheKey = `${family}:${note}`;
      if (decodedBufferCache.has(cacheKey)) continue;
      await getOrDecodeNoteBuffer(ctx, family, note);
    }
  } catch {}
}

/**
 * Smoothly stops in-flight reference playback with a fast 25ms anti-click ramp
 * and cancels any pending asynchronous sample loading requests.
 */
export function stopTunerReferenceAudio(): void {
  currentPlaybackId++;
  stopTunerReferenceAudioInternal();
}

function stopTunerReferenceAudioInternal(): void {
  activePlaybackInfo = null;

  activeGainNodes.forEach((g) => {
    try {
      const now = g.context ? g.context.currentTime : 0;
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + 0.025);
    } catch {}
  });

  const sourcesToStop = [...activeSources];
  activeSources = [];
  activeGainNodes = [];

  setTimeout(() => {
    sourcesToStop.forEach((n) => {
      try {
        n.stop();
        n.disconnect();
      } catch {}
    });
  }, 35);

  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }

  // Preserve settling window for room reverberation and analyzer buffer
  suppressionUntilTimestamp = Date.now() + 35 + REFERENCE_SETTLING_TIME_MS;
}

/**
 * Converts note name with octave (e.g. 'E2', 'D#3', 'Bb1') to standard MIDI note number.
 */
export function noteNameToMidi(fullName: string): number {
  if (!fullName) return 69;
  const match = fullName.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return 69;
  const letter = match[1].toUpperCase();
  const acc = match[2];
  const octave = parseInt(match[3], 10);

  const baseMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let semitone = baseMap[letter] ?? 0;
  if (acc === '#') semitone += 1;
  else if (acc === 'b') semitone -= 1;

  return (octave + 1) * 12 + semitone;
}

/**
 * Finds the nearest recorded sample anchor within a family bank.
 */
function findNearestAnchor(
  familyBank: Record<string, string>,
  targetMidi: number
): { noteName: string; midi: number } | null {
  const availableNotes = Object.keys(familyBank);
  if (availableNotes.length === 0) return null;

  let bestNote = availableNotes[0];
  let bestMidi = noteNameToMidi(bestNote);
  let minDiff = Math.abs(targetMidi - bestMidi);

  for (let i = 1; i < availableNotes.length; i++) {
    const note = availableNotes[i];
    const midi = noteNameToMidi(note);
    const diff = Math.abs(targetMidi - midi);
    if (diff < minDiff) {
      minDiff = diff;
      bestNote = note;
      bestMidi = midi;
    }
  }

  return { noteName: bestNote, midi: bestMidi };
}

export interface PlayTunerReferenceOptions {
  target: InstrumentStringTarget;
  mode: InstrumentTuningMode;
  refA4?: number;
  volume?: number;
  audioCtx?: AudioContext;
}

/**
 * Plays a realistic recorded reference instrument string sound.
 * Supports:
 * - Electric guitar (clean recorded strings)
 * - Acoustic guitar (steel string recordings)
 * - 4-string bass (fingerstyle bass recordings)
 * - Universal resampling for all alternate tunings (Drop D, DADGAD, Open G, etc.)
 *   relative to nearest recorded anchor sample
 * - Pitch adjustment matching reference A4 (e.g. 440, 442, 432 Hz) via playbackRate
 * - Anti-click attack and smooth crossfade stopping previous tones
 */
export async function playTunerReferenceString(
  options: PlayTunerReferenceOptions
): Promise<void> {
  const { target, mode, refA4 = 440, volume = 0.8, audioCtx } = options;
  if (!target || !target.fullName) return;

  const playbackId = ++currentPlaybackId;

  // Mark suppression immediately upon triggering so detector does not capture attack or asynchronous load interval
  markReferenceSuppression(4000);

  // Smoothly fade out previous string reference
  stopTunerReferenceAudioInternal();

  const ctx = audioCtx && audioCtx.state !== 'closed' ? audioCtx : getPlaybackAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  if (playbackId !== currentPlaybackId) return;

  const family = getFamilyForMode(mode);
  const familyBank = TUNER_SAMPLE_DATA[family];
  if (!familyBank) return;

  const targetMidi = noteNameToMidi(target.fullName);
  let sampleNoteName = target.fullName;
  let pitchShiftSemitones = 0;

  if (familyBank[target.fullName]) {
    sampleNoteName = target.fullName;
    pitchShiftSemitones = 0;
  } else {
    const anchor = findNearestAnchor(familyBank, targetMidi);
    if (!anchor) return;
    sampleNoteName = anchor.noteName;
    pitchShiftSemitones = targetMidi - anchor.midi;
  }

  const buffer = await getOrDecodeNoteBuffer(ctx, family, sampleNoteName);
  if (!buffer || playbackId !== currentPlaybackId) {
    if (activeSources.length === 0) {
      suppressionUntilTimestamp = Math.min(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
    return;
  }

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state === 'closed' || playbackId !== currentPlaybackId) return;

  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Exact pitch adjustment relative to A4 (recorded samples are at A4=440Hz)
  // multiplied by semitone shift ratio 2^(semitones / 12) for alternate tunings
  const a4Ratio = (refA4 || 440) / 440;
  const pitchRatio = Math.pow(2, pitchShiftSemitones / 12);
  const playbackRate = Math.max(0.25, Math.min(4.0, a4Ratio * pitchRatio));
  source.playbackRate.setValueAtTime(playbackRate, now);

  const gain = ctx.createGain();
  // 6ms fast linear attack to prevent DAC clicks, then let natural acoustic envelope decay
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.006);

  // Allow up to 3.5s sustain with a natural final fade-out
  const ringDuration = 3.5;
  const fadeStart = Math.min(buffer.duration / playbackRate - 0.5, 2.8);
  if (fadeStart > 0.05) {
    gain.gain.setValueAtTime(volume, now + fadeStart);
    gain.gain.linearRampToValueAtTime(0.0001, now + fadeStart + 0.5);
  }

  source.connect(gain);
  gain.connect(ctx.destination);

  activeSources.push(source);
  activeGainNodes.push(gain);

  // Track active reference playback metadata for engine discrimination
  const targetFrequency = Number((target.frequency * a4Ratio).toFixed(2));
  activePlaybackInfo = {
    target,
    frequency: targetFrequency,
    mode,
    startTime: Date.now(),
    duration: ringDuration,
  };

  suppressionUntilTimestamp = Date.now() + Math.round(ringDuration * 1000) + REFERENCE_SETTLING_TIME_MS;

  source.start(now);
  source.stop(now + ringDuration);

  source.onended = () => {
    try {
      source.disconnect();
      gain.disconnect();
    } catch {}
    activeSources = activeSources.filter((s) => s !== source);
    activeGainNodes = activeGainNodes.filter((g) => g !== gain);
    if (activeSources.length === 0) {
      activePlaybackInfo = null;
      suppressionUntilTimestamp = Math.max(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
  };

  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
  }
  playbackTimeout = setTimeout(() => {
    if (activeSources.length === 0) {
      activePlaybackInfo = null;
      suppressionUntilTimestamp = Math.max(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
  }, (ringDuration + 0.1) * 1000);
}

/**
 * Options for playing a realistic House Kit drum reference sample.
 */
export interface PlayDrumReferenceOptions {
  partId: DrumPartId;
  tensionId?: DrumTensionId;
  frequency: number;
  duration?: number;
  volume?: number;
  audioCtx?: AudioContext;
}

/**
 * Plays the authentic acoustic House Kit drum sample for the selected drum part,
 * repitched to the exact calibrated fundamental frequency via Web Audio playbackRate.
 *
 * Supports both options object and positional arguments:
 * - playDrumReferenceSound(options: PlayDrumReferenceOptions)
 * - playDrumReferenceSound(partId, tensionId, frequency, duration, volume)
 * - playDrumReferenceSound(frequency, duration, volume) [legacy fallback]
 */
export async function playDrumReferenceSound(
  partIdOrOptionsOrFreq: PlayDrumReferenceOptions | DrumPartId | number,
  tensionIdOrDuration: DrumTensionId | number = 'normal',
  targetFrequency?: number,
  duration?: number,
  volume: number = 0.85,
  audioCtx?: AudioContext
): Promise<void> {
  let explicitCtx: AudioContext | undefined = audioCtx;
  if (typeof partIdOrOptionsOrFreq === 'object' && partIdOrOptionsOrFreq !== null) {
    explicitCtx = partIdOrOptionsOrFreq.audioCtx ?? explicitCtx;
  }
  const ctx = explicitCtx && explicitCtx.state !== 'closed' ? explicitCtx : getPlaybackAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }

  stopTunerReferenceAudio();

  // Mark suppression immediately upon triggering so detector does not capture attack or asynchronous load interval
  markReferenceSuppression(3500);

  let partId: DrumPartId = 'snare';
  let tensionId: DrumTensionId = 'normal';
  let freq = 242.0;
  let requestedDuration = 2.5;
  let vol = volume;

  if (typeof partIdOrOptionsOrFreq === 'object' && partIdOrOptionsOrFreq !== null) {
    partId = partIdOrOptionsOrFreq.partId;
    tensionId = partIdOrOptionsOrFreq.tensionId ?? 'normal';
    freq = partIdOrOptionsOrFreq.frequency;
    requestedDuration = partIdOrOptionsOrFreq.duration ?? 2.5;
    vol = partIdOrOptionsOrFreq.volume ?? 0.85;
  } else if (typeof partIdOrOptionsOrFreq === 'string') {
    partId = partIdOrOptionsOrFreq as DrumPartId;
    tensionId = (typeof tensionIdOrDuration === 'string' ? tensionIdOrDuration : 'normal') as DrumTensionId;
    freq = targetFrequency ?? (DRUM_PARTS.find((p) => p.id === partId)?.tensions[tensionId].frequency ?? 242);
    requestedDuration = duration ?? 2.5;
  } else if (typeof partIdOrOptionsOrFreq === 'number') {
    // Legacy fallback when only frequency was provided
    freq = partIdOrOptionsOrFreq;
    requestedDuration = typeof tensionIdOrDuration === 'number' ? tensionIdOrDuration : 2.5;
    vol = targetFrequency ?? 0.85;
    const nearest = findNearestDrumPart(freq, 'normal');
    partId = nearest.part.id;
    tensionId = 'normal';
  }

  const anchor = HOUSE_KIT_TUNER_ANCHORS[partId] || HOUSE_KIT_TUNER_ANCHORS.snare;
  const buffer = await loadDrumReferenceBuffer(ctx, partId);
  if (!buffer) {
    if (activeSources.length === 0) {
      suppressionUntilTimestamp = Math.min(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
    return;
  }

  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Calibrated playbackRate: resamples authentic shell resonance to the exact target Hz
  const playbackRate = Math.max(0.3, Math.min(3.5, freq / anchor.anchorHz));
  source.playbackRate.setValueAtTime(playbackRate, now);

  const gain = ctx.createGain();
  // Fast 3ms linear attack to prevent DAC clicks, preserving the physical transient strike
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.003);

  // Natural acoustic decay envelope bounded by sample duration and requested duration
  const effectiveDuration = Math.min(requestedDuration, buffer.duration / playbackRate);
  const fadeStart = Math.max(0.1, effectiveDuration - 0.4);
  gain.gain.setValueAtTime(vol, now + fadeStart);
  gain.gain.linearRampToValueAtTime(0.0001, now + effectiveDuration);

  source.connect(gain);
  gain.connect(ctx.destination);

  activeSources.push(source);
  activeGainNodes.push(gain);

  activePlaybackInfo = {
    target: {
      name: anchor.name,
      note: '',
      octave: 0,
      fullName: `${anchor.name} (${freq.toFixed(1)} Hz)`,
      frequency: freq,
      stringNumber: 1,
    },
    frequency: freq,
    mode: 'drum',
    startTime: Date.now(),
    duration: effectiveDuration,
  };

  suppressionUntilTimestamp = Date.now() + Math.round(effectiveDuration * 1000) + REFERENCE_SETTLING_TIME_MS;

  source.start(now);
  source.stop(now + effectiveDuration + 0.05);

  source.onended = () => {
    try {
      source.disconnect();
      gain.disconnect();
    } catch {}
    activeSources = activeSources.filter((s) => s !== source);
    activeGainNodes = activeGainNodes.filter((g) => g !== gain);
    if (activeSources.length === 0) {
      activePlaybackInfo = null;
      suppressionUntilTimestamp = Math.max(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
  };

  if (playbackTimeout) clearTimeout(playbackTimeout);
  playbackTimeout = setTimeout(() => {
    if (activeSources.length === 0) {
      activePlaybackInfo = null;
      suppressionUntilTimestamp = Math.max(suppressionUntilTimestamp, Date.now() + REFERENCE_SETTLING_TIME_MS);
    }
  }, (effectiveDuration + 0.1) * 1000);
}

