import type { InstrumentStringTarget, InstrumentTuningMode } from './tunerTypes';
import { createAudioContext } from '../audioContextOptions';

let playbackAudioCtx: AudioContext | null = null;
const decodedBufferCache = new Map<string, AudioBuffer>();
let sampleBankPromise: Promise<Record<string, Record<string, string>>> | null = null;

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
 * Returns currently active reference playback metadata, or null if no reference sound is playing.
 */
export function getActiveReferencePlayback(): ActiveReferencePlayback | null {
  return activePlaybackInfo;
}

/**
 * Returns whether a reference string sound is currently sounding.
 */
export function isReferencePlaybackActive(): boolean {
  return activePlaybackInfo !== null;
}

/**
 * Provides a dedicated, isolated AudioContext for reference string playback.
 * Strictly decoupled from microphone capture AudioContext to prevent any audio feedback or loopback.
 */
export function getPlaybackAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

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
 * Lazy loads the base64 sample bank as an isolated chunk.
 * Keeps initial application bundle small and startup instantaneous.
 */
async function getSampleBank(): Promise<Record<string, Record<string, string>>> {
  if (!sampleBankPromise) {
    sampleBankPromise = import('./tunerSampleData')
      .then((mod) => mod.TUNER_SAMPLE_DATA)
      .catch((err) => {
        sampleBankPromise = null;
        console.warn('[tunerReferenceAudio] Failed to load tuner sample data:', err);
        return {};
      });
  }
  return sampleBankPromise;
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

  const bank = await getSampleBank();
  const familyBank = bank[family];
  const b64 = familyBank ? familyBank[noteName] : null;
  if (!b64) {
    console.warn(`[tunerReferenceAudio] Sample not found for ${family}:${noteName}`);
    return null;
  }

  try {
    const binStr =
      typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    decodedBufferCache.set(cacheKey, buffer);
    return buffer;
  } catch (err) {
    console.warn(`[tunerReferenceAudio] Failed to decode sample for ${family}:${noteName}`, err);
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

  const family = getFamilyForMode(mode);
  try {
    const bank = await getSampleBank();
    const familyBank = bank[family];
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
 * Smoothly stops in-flight reference playback with a fast 25ms anti-click ramp.
 */
export function stopTunerReferenceAudio(): void {
  activePlaybackInfo = null;
  const ctx = playbackAudioCtx;
  const now = ctx ? ctx.currentTime : 0;

  activeGainNodes.forEach((g) => {
    try {
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

  const ctx = audioCtx && audioCtx.state !== 'closed' ? audioCtx : getPlaybackAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  // Smoothly fade out previous string reference
  stopTunerReferenceAudio();

  const family = getFamilyForMode(mode);
  const bank = await getSampleBank();
  const familyBank = bank[family];
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
  if (!buffer) return;

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
    }
  };

  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
  }
  playbackTimeout = setTimeout(() => {
    if (activeSources.length === 0) {
      activePlaybackInfo = null;
    }
  }, (ringDuration + 0.1) * 1000);
}

/**
 * Play a resonant drum reference tone calibrated to the exact fundamental frequency.
 * Integrates with active playback tracking to ensure microphone self-playback rejection.
 */
export function playDrumReferenceSound(
  frequency: number,
  duration: number = 2.0,
  volume: number = 0.35
): void {
  const ctx = getPlaybackAudioContext();
  if (!ctx) return;

  stopTunerReferenceAudio();

  const now = ctx.currentTime;

  // Primary fundamental oscillator (sine wave)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(frequency, now);

  // Body overtone (subtle harmonic simulating cylindrical drumhead mode)
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(frequency * 1.5, now);

  const gain1 = ctx.createGain();
  // Percussive strike envelope (3ms linear attack, natural drum decay)
  gain1.gain.setValueAtTime(0.0001, now);
  gain1.gain.linearRampToValueAtTime(volume, now + 0.004);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const gain2 = ctx.createGain();
  // Overtone decays faster than fundamental
  gain2.gain.setValueAtTime(0.0001, now);
  gain2.gain.linearRampToValueAtTime(volume * 0.22, now + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);

  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(ctx.destination);
  gain2.connect(ctx.destination);

  activeGainNodes.push(gain1, gain2);

  activePlaybackInfo = {
    target: {
      name: 'Drum',
      note: '',
      octave: 0,
      fullName: `${frequency}Hz`,
      frequency,
      stringNumber: 1,
    },
    frequency,
    mode: 'drum',
    startTime: Date.now(),
    duration,
  };

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);

  osc1.onended = () => {
    try {
      osc1.disconnect();
      osc2.disconnect();
      gain1.disconnect();
      gain2.disconnect();
    } catch {}
    activePlaybackInfo = null;
  };

  if (playbackTimeout) clearTimeout(playbackTimeout);
  playbackTimeout = setTimeout(() => {
    activePlaybackInfo = null;
  }, (duration + 0.1) * 1000);
}

