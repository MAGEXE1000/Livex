import type { GuitarChordData } from '../../data/chords';
import { loadAudioSample } from './audioSampleLoader';

// ── Open String MIDI Constants (Standard Tuning E-A-D-G-B-e) ──────────────────
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

const MIDI_TO_NAME: Record<number, string> = {
  40: 'E2', 41: 'F2', 42: 'Gb2', 43: 'G2', 44: 'Ab2', 45: 'A2', 46: 'Bb2', 47: 'B2',
  48: 'C3', 49: 'Db3', 50: 'D3', 51: 'Eb3', 52: 'E3', 53: 'F3', 54: 'Gb3', 55: 'G3',
  56: 'Ab3', 57: 'A3', 58: 'Bb3', 59: 'B3', 60: 'C4', 61: 'Db4', 62: 'D4', 63: 'Eb4',
  64: 'E4', 65: 'F4', 66: 'Gb4', 67: 'G4', 68: 'Ab4', 69: 'A4', 70: 'Bb4', 71: 'B4',
  72: 'C5', 73: 'Db5', 74: 'D5', 75: 'Eb5', 76: 'E5',
};

const NAME_TO_MIDI: Record<string, number> = {
  E2: 40, F2: 41, Gb2: 42, G2: 43, Ab2: 44, A2: 45, Bb2: 46, B2: 47,
  C3: 48, Db3: 49, D3: 50, Eb3: 51, E3: 52, F3: 53, Gb3: 54, G3: 55,
  Ab3: 56, A3: 57, Bb3: 58, B3: 59, C4: 60, Db4: 61, D4: 62, Eb4: 63,
  E4: 64, F4: 65, Gb4: 66, G4: 67, Ab4: 68, A4: 69, Bb4: 70, B4: 71,
  C5: 72, Db5: 73, D5: 74, Eb5: 75, E5: 76,
};

let audioCtx: AudioContext | null = null;
const decodedBufferCache = new Map<number, AudioBuffer>();

let activeSources: AudioBufferSourceNode[] = [];
let activeGainNodes: GainNode[] = [];
let playbackTimeout: ReturnType<typeof setTimeout> | null = null;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    const CtxClass =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : typeof window !== 'undefined' && typeof (window as any).webkitAudioContext !== 'undefined'
          ? ((window as any).webkitAudioContext as typeof AudioContext)
          : null;
    if (!CtxClass) return null;
    audioCtx = new CtxClass({ sampleRate: 44100 });
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Decodes and caches a note buffer by MIDI pitch.
 * Resolves exact recorded samples in range [40, 76] (E2-E5).
 * Falls back to nearest anchor with pitch resampling outside this range.
 */
async function getOrDecodeNoteBuffer(
  ctx: AudioContext,
  midiNote: number
): Promise<{ buffer: AudioBuffer; playbackRate: number } | null> {
  const clampedMidi = Math.max(40, Math.min(76, midiNote));
  const playbackRate = Math.pow(2, (midiNote - clampedMidi) / 12);

  let buffer = decodedBufferCache.get(clampedMidi);
  if (buffer) {
    return { buffer, playbackRate };
  }

  const noteName = MIDI_TO_NAME[clampedMidi];
  if (!noteName) return null;

  const sample = await loadAudioSample(ctx, `/audio/guitar/${noteName}.mp3`);
  if (!sample) return null;

  decodedBufferCache.set(clampedMidi, sample);
  return { buffer: sample, playbackRate };
}

/**
 * Pre-decodes acoustic guitar sample buffers in the background.
 * Call on Chordex mount to eliminate first-playback decode latency.
 */
export async function preloadGuitarAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx || typeof ctx.decodeAudioData !== 'function') return;

  const notes = Object.keys(NAME_TO_MIDI);
  await Promise.all(
    notes.map(async (noteName) => {
      const midi = NAME_TO_MIDI[noteName];
      if (!midi || decodedBufferCache.has(midi)) return;
      const buf = await loadAudioSample(ctx, `/audio/guitar/${noteName}.mp3`);
      if (buf) {
        decodedBufferCache.set(midi, buf);
      }
    })
  );
}

/**
 * Checks if acoustic guitar samples are pre-decoded in memory.
 */
export function isGuitarAudioLoaded(): boolean {
  return decodedBufferCache.size >= 25;
}

/**
 * Smoothly stops in-flight chord playback with a fast 25ms anti-click ramp.
 */
export function stopChordPlayback(): void {
  const ctx = audioCtx;
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
 * Plays an authentic acoustic guitar chord from fingering data.
 * Features realistic downstrum spread, string balance, high-pass rumble filter,
 * and transparent safety limiter for pristine acoustic realism without clipping.
 */
export function playChord(data: GuitarChordData, volume: number = 0.65): void {
  stopChordPlayback();

  if (!data || !Array.isArray(data.frets)) return;

  const ctx = getCtx();
  if (!ctx) return;

  // Identify strings to sound
  const stringsToPlay: { stringIdx: number; midiNote: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const fret = data.frets[i];
    if (fret === -1 || typeof fret !== 'number') continue;
    stringsToPlay.push({ stringIdx: i, midiNote: OPEN_MIDI[i] + fret });
  }

  if (stringsToPlay.length === 0) return;

  // Asynchronously decode (or retrieve cached) notes and trigger playback
  (async () => {
    try {
      const decodedResults = await Promise.all(
        stringsToPlay.map(async (item) => ({
          stringIdx: item.stringIdx,
          sample: await getOrDecodeNoteBuffer(ctx, item.midiNote),
        }))
      );

      const playable = decodedResults.filter(
        (r): r is { stringIdx: number; sample: { buffer: AudioBuffer; playbackRate: number } } =>
          r.sample !== null
      );

      if (playable.length === 0) return;

      const now = ctx.currentTime;

      // Master Output Chain:
      // Master Gain -> Sub-rumble HPF (40Hz) -> Safety Limiter -> Destination
      const masterGain = ctx.createGain();
      masterGain.gain.value = volume * 1.85;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'highpass';
      rumbleFilter.frequency.value = 40;
      rumbleFilter.Q.value = 0.707;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3.0;
      limiter.knee.value = 4.0;
      limiter.ratio.value = 8.0;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;

      masterGain.connect(rumbleFilter).connect(limiter).connect(ctx.destination);

      // Acoustic strum timing: 16-20 ms spread per string
      const strumBase = 0.016;
      const strumVar = 0.004;

      let strumIdx = 0;
      for (const item of playable) {
        const source = ctx.createBufferSource();
        source.buffer = item.sample.buffer;
        source.playbackRate.value = item.sample.playbackRate;

        // Acoustic string weight: low strings have body mass, plain strings have clarity
        const stringGain = ctx.createGain();
        const baseWeight = item.stringIdx <= 2 ? 0.95 : 0.88;
        const humanizeJitter = 0.96 + Math.random() * 0.08;
        stringGain.gain.value = baseWeight * humanizeJitter;

        source.connect(stringGain).connect(masterGain);

        const startTime = now + strumIdx * (strumBase + Math.random() * strumVar);
        source.start(startTime);

        activeSources.push(source);
        activeGainNodes.push(stringGain);

        strumIdx++;
      }

      playbackTimeout = setTimeout(
        () => {
          activeSources = [];
          activeGainNodes = [];
        },
        3500
      );
    } catch (err) {
      console.warn('[guitarAudio] Playback error:', err);
    }
  })();
}

