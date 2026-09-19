import {
  SAX_SAMPLE_ANCHORS,
  generateRecordedSampleBuffer,
  type SaxSampleReference,
} from './saxophoneSamples';
import { getConcertFrequency, type SaxophoneVariant } from '../instruments/saxophoneEngine';

let audioCtx: AudioContext | null = null;
const sampleBufferCache = new Map<string, AudioBuffer>();
const activeSampleSources = new Set<AudioBufferSourceNode>();
let roundRobinIndex = 0;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : typeof (window as any).webkitAudioContext !== 'undefined'
          ? (window as any).webkitAudioContext
          : null;

    if (!AudioCtxClass) throw new Error('WebAudio API not supported');
    audioCtx = new AudioCtxClass({ sampleRate: 44100 });
  }

  const ctx = audioCtx;
  if (!ctx) throw new Error('AudioContext failed to initialize');

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  return ctx;
}

function findNearestSampleAnchor(targetFreq: number): SaxSampleReference {
  let closest = SAX_SAMPLE_ANCHORS[0];
  let minDiff = Math.abs(targetFreq - closest.baseFreq);

  for (let i = 1; i < SAX_SAMPLE_ANCHORS.length; i++) {
    const diff = Math.abs(targetFreq - SAX_SAMPLE_ANCHORS[i].baseFreq);
    if (diff < minDiff) {
      minDiff = diff;
      closest = SAX_SAMPLE_ANCHORS[i];
    }
  }

  return closest;
}

/**
 * Mechanical key click noise transient generator.
 */
function playKeyClickTransient(ctx: AudioContext, gain: number = 0.15) {
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.015; // 15ms click
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 2.0;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain * 0.35, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start(now);
}

/**
 * Acoustic key release tail generator.
 */
function playReleaseTail(ctx: AudioContext, targetFreq: number, gain: number = 0.1) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(targetFreq, now);

  gainNode.gain.setValueAtTime(gain * 0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

export interface PlaySaxSampleOptions {
  writtenNote: string;
  variant?: SaxophoneVariant;
  duration?: number;
  gain?: number;
  velocity?: number; // 0.0 to 1.0 dynamic velocity layer
}

export function playRecordedSaxophoneSample(options: PlaySaxSampleOptions): () => void {
  const { writtenNote, variant = 'alto', duration = 2.5, gain = 0.85, velocity = 0.8 } = options;

  try {
    const ctx = getAudioContext();
    const targetFreq = getConcertFrequency(writtenNote, variant);
    const anchor = findNearestSampleAnchor(targetFreq);

    // Trigger mechanical key click transient
    playKeyClickTransient(ctx, gain * velocity);

    // Round-Robin sample detune variation (±1.5 cents) to simulate real acoustic variation
    roundRobinIndex = (roundRobinIndex + 1) % 4;
    const rrDetuneCents = (roundRobinIndex - 1.5) * 1.2;
    const rrFactor = Math.pow(2, rrDetuneCents / 1200);

    // Fetch or generate recorded sample buffer for anchor note
    let buffer = sampleBufferCache.get(anchor.note);
    if (!buffer) {
      buffer = generateRecordedSampleBuffer(ctx, anchor, 3.2);
      sampleBufferCache.set(anchor.note, buffer);
    }

    const now = ctx.currentTime;

    // Primary sample source node with exact pitch playback rate shift + Round Robin detune
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime((targetFreq / anchor.baseFreq) * rrFactor, now);

    // Velocity layer crossfading & dynamic gain curve
    const velocityScale = Math.pow(velocity, 1.4);
    const masterGain = gain * velocityScale;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(masterGain * 0.85, now + 0.025);
    gainNode.gain.exponentialRampToValueAtTime(masterGain * 0.65, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Saxophone body acoustic resonance filter
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(Math.min(14000, targetFreq * (4 + velocity * 3)), now);
    bodyFilter.Q.setValueAtTime(1.5, now);

    source.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    activeSampleSources.add(source);

    const stopFn = () => {
      try {
        const stopTime = ctx.currentTime;

        // Trigger acoustic key release tail
        playReleaseTail(ctx, targetFreq, masterGain);

        gainNode.gain.cancelScheduledValues(stopTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.09);

        setTimeout(() => {
          try {
            source.stop();
            source.disconnect();
            bodyFilter.disconnect();
            gainNode.disconnect();
            activeSampleSources.delete(source);
          } catch (_) {}
        }, 110);
      } catch (_) {}
    };

    setTimeout(stopFn, duration * 1000);
    return stopFn;
  } catch (err) {
    console.error('Failed to play recorded saxophone sample:', err);
    return () => {};
  }
}

export function stopAllSaxophoneSamples() {
  activeSampleSources.forEach((src) => {
    try {
      src.stop();
      src.disconnect();
    } catch (_) {}
  });
  activeSampleSources.clear();
}
