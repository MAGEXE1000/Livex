import { getConcertFrequency, type SaxophoneVariant } from '../instruments/saxophoneEngine';

let audioCtx: AudioContext | null = null;

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

export interface PlaySaxOptions {
  writtenNote: string;
  variant?: SaxophoneVariant;
  duration?: number;
  gain?: number;
}

let activeNotes: Map<string, { stop: () => void }> = new Map();

export function playSaxophoneNote(options: PlaySaxOptions): () => void {
  const { writtenNote, variant = 'alto', duration = 2.5, gain = 0.8 } = options;

  try {
    const ctx = getAudioContext();
    const freq = getConcertFrequency(writtenNote, variant);

    const now = ctx.currentTime;

    // Master Note Output Node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(gain * 0.7, now + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(gain * 0.5, now + 0.3);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // 1. Primary Reed Oscillators (Sawtooth + Pulse)
    const sawOsc = ctx.createOscillator();
    sawOsc.type = 'sawtooth';
    sawOsc.frequency.setValueAtTime(freq, now);

    const squareOsc = ctx.createOscillator();
    squareOsc.type = 'square';
    squareOsc.frequency.setValueAtTime(freq * 1.0015, now);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    const oscMix = ctx.createGain();
    oscMix.gain.setValueAtTime(0.55, now);

    const squareGain = ctx.createGain();
    squareGain.gain.setValueAtTime(0.25, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);

    sawOsc.connect(oscMix);
    squareOsc.connect(squareGain);
    squareGain.connect(oscMix);
    subOsc.connect(subGain);
    subGain.connect(oscMix);

    // 2. Physical Acoustic Formant Filters (Tube / Horn Resonance)
    // Saxophone body has strong formants around 900Hz and 2400Hz
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(880, now);
    formant1.Q.setValueAtTime(2.5, now);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(2350, now);
    formant2.Q.setValueAtTime(3.0, now);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    const cutoff = Math.min(12000, Math.max(800, freq * 6));
    lowpass.frequency.setValueAtTime(cutoff, now);
    lowpass.frequency.exponentialRampToValueAtTime(cutoff * 0.7, now + duration);
    lowpass.Q.setValueAtTime(1.8, now);

    // 3. Vibrato LFO (Natural Saxophone Expression)
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.5, now); // 5.5 Hz vibrato rate
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(freq * 0.008, now); // subtle pitch modulation

    lfo.connect(lfoGain);
    lfoGain.connect(sawOsc.frequency);
    lfoGain.connect(squareOsc.frequency);

    // Delay vibrato onset (starts after 0.25s)
    lfoGain.gain.setValueAtTime(0, now);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.009, now + 0.4);

    // 4. Breath Noise Layer (Air Embouchure Noise)
    const bufferSize = ctx.sampleRate * 0.1;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.Q.setValueAtTime(1.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // 5. Connect Signal Chain
    oscMix.connect(lowpass);
    lowpass.connect(formant1);
    lowpass.connect(formant2);

    formant1.connect(masterGain);
    formant2.connect(masterGain);
    noiseGain.connect(masterGain);

    masterGain.connect(ctx.destination);

    // Start Oscillators
    sawOsc.start(now);
    squareOsc.start(now);
    subOsc.start(now);
    lfo.start(now);
    noiseNode.start(now);

    const stopNode = () => {
      try {
        const stopTime = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(stopTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);

        setTimeout(() => {
          try {
            sawOsc.stop();
            squareOsc.stop();
            subOsc.stop();
            lfo.stop();
            noiseNode.stop();
            sawOsc.disconnect();
            squareOsc.disconnect();
            subOsc.disconnect();
            lfo.disconnect();
            noiseNode.disconnect();
            masterGain.disconnect();
          } catch (_) {}
        }, 100);
      } catch (_) {}
    };

    activeNotes.set(writtenNote, { stop: stopNode });
    setTimeout(stopNode, duration * 1000);

    return stopNode;
  } catch (err) {
    console.error('Failed to play saxophone audio:', err);
    return () => {};
  }
}

export function stopAllSaxophoneAudio() {
  activeNotes.forEach((item) => {
    try {
      item.stop();
    } catch (_) {}
  });
  activeNotes.clear();
}
