import type { InstrumentStringTarget, InstrumentTuningMode } from './tunerTypes';
import { createAudioContext } from '../audioContextOptions';

let internalAudioCtx: AudioContext | null = null;
const decodedBufferCache = new Map<string, AudioBuffer>();
let sampleBankPromise: Promise<Record<string, Record<string, string>>> | null = null;

let activeSources: AudioBufferSourceNode[] = [];
let activeGainNodes: GainNode[] = [];
let playbackTimeout: ReturnType<typeof setTimeout> | null = null;

function getFallbackCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!internalAudioCtx || internalAudioCtx.state === 'closed') {
    try {
      internalAudioCtx = createAudioContext();
    } catch {
      internalAudioCtx = null;
    }
  }
  if (internalAudioCtx && internalAudioCtx.state === 'suspended') {
    internalAudioCtx.resume().catch(() => {});
  }
  return internalAudioCtx;
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
  if (mode === 'bass-4' || mode === 'bass-5') return 'bass';
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
  const ctx = audioCtx && audioCtx.state !== 'closed' ? audioCtx : getFallbackCtx();
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
  const ctx = internalAudioCtx;
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
 * - 4-string bass & 5-string bass (fingerstyle bass recordings)
 * - Pitch adjustment matching reference A4 (e.g. 440, 442, 432 Hz) via playbackRate
 * - Anti-click attack and smooth crossfade stopping previous tones
 */
export async function playTunerReferenceString(
  options: PlayTunerReferenceOptions
): Promise<void> {
  const { target, mode, refA4 = 440, volume = 0.8, audioCtx } = options;
  if (!target || !target.fullName) return;

  const ctx = audioCtx && audioCtx.state !== 'closed' ? audioCtx : getFallbackCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  // Smoothly fade out previous string reference
  stopTunerReferenceAudio();

  const family = getFamilyForMode(mode);
  const buffer = await getOrDecodeNoteBuffer(ctx, family, target.fullName);
  if (!buffer) return;

  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Exact pitch adjustment relative to A4 (recorded samples are at A4=440Hz)
  const playbackRate = Math.max(0.5, Math.min(2.0, (refA4 || 440) / 440));
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

  source.start(now);
  source.stop(now + ringDuration);

  source.onended = () => {
    try {
      source.disconnect();
      gain.disconnect();
    } catch {}
    activeSources = activeSources.filter((s) => s !== source);
    activeGainNodes = activeGainNodes.filter((g) => g !== gain);
  };
}
