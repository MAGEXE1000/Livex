import type { TrackEffect } from '@workspace/livex-core';

export const EFFECT_ICONS: Record<string, string> = {
  reverb: 'water_drop',
  delay: 'schedule',
  chorus: 'waves',
  distortion: 'electric_bolt',
  highpass: 'filter_alt',
  lowpass: 'filter_alt',
};

export const EFFECT_RANGES: Record<string, [number, number, number]> = {
  mix: [0, 1, 0.05],
  decay: [0.5, 5, 0.1],
  time: [0.05, 1, 0.05],
  feedback: [0, 0.9, 0.05],
  rate: [0.1, 5, 0.1],
  depth: [0, 1, 0.05],
  amount: [0, 1, 0.05],
  frequency: [20, 12000, 10],
  q: [0.1, 10, 0.1],
};

export function getEffectMeta(
  type: string,
  isSpanish = false
): { icon: string; label: string; desc: string } {
  const meta: Record<string, { icon: string; en: string; es: string; descEn: string; descEs: string }> = {
    reverb: {
      icon: 'water_drop',
      en: 'Reverb',
      es: 'Reverberación',
      descEn: 'Acoustic space and depth simulation',
      descEs: 'Simulación de espacio acústico y profundidad',
    },
    delay: {
      icon: 'schedule',
      en: 'Echo / Delay',
      es: 'Eco / Retardo',
      descEn: 'Rhythmic echoes and spatial repeats',
      descEs: 'Ecos rítmicos y repeticiones espaciales',
    },
    chorus: {
      icon: 'waves',
      en: 'Chorus',
      es: 'Coro / Modulación',
      descEn: 'Shimmering multi-voice vocal widening',
      descEs: 'Ensangostamiento vocal y modulación brillante',
    },
    distortion: {
      icon: 'electric_bolt',
      en: 'Drive / Saturation',
      es: 'Saturación / Drive',
      descEn: 'Warm harmonic grit and analog drive',
      descEs: 'Calidez armónica y textura analógica',
    },
    highpass: {
      icon: 'filter_alt',
      en: 'High-Pass Filter',
      es: 'Filtro Pasa-Altos',
      descEn: 'Cuts low-end rumble and proximity boom',
      descEs: 'Elimina frecuencias bajas y ruidos de impacto',
    },
    lowpass: {
      icon: 'filter_alt',
      en: 'Low-Pass Filter',
      es: 'Filtro Pasa-Bajos',
      descEn: 'Tames harsh highs and sibilance',
      descEs: 'Suaviza agudos estridentes y sibilancias',
    },
  };

  const item = meta[type];
  if (!item) {
    return { icon: 'tune', label: type, desc: '' };
  }
  return {
    icon: item.icon,
    label: isSpanish ? item.es : item.en,
    desc: isSpanish ? item.descEs : item.descEn,
  };
}

export function formatParamValue(key: string, val: number): string {
  if (key === 'mix' || key === 'depth' || key === 'amount' || key === 'feedback') {
    return `${Math.round(val * 100)}%`;
  }
  if (key === 'decay' || key === 'time') {
    return `${val.toFixed(2)}s`;
  }
  if (key === 'rate') {
    return `${val.toFixed(1)} Hz`;
  }
  if (key === 'frequency') {
    return val >= 1000 ? `${(val / 1000).toFixed(1)} kHz` : `${Math.round(val)} Hz`;
  }
  if (key === 'q') {
    return val.toFixed(1);
  }
  return String(val);
}

export function generateImpulse(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const len = ctx.sampleRate * Math.max(0.5, Math.min(decay, 5));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

export function connectEffectChain(
  ctx: BaseAudioContext,
  effects: TrackEffect[],
  input: AudioNode,
  output: AudioNode
): AudioNode[] {
  const nodes: AudioNode[] = [];
  let current = input;

  for (const fx of effects) {
    if (!fx.enabled) continue;

    if (fx.type === 'reverb') {
      const convolver = ctx.createConvolver();
      convolver.buffer = generateImpulse(ctx, fx.params.decay ?? 2);
      const dry = ctx.createGain();
      dry.gain.value = 1 - (fx.params.mix ?? 0.3);
      const wet = ctx.createGain();
      wet.gain.value = fx.params.mix ?? 0.3;
      const merge = ctx.createGain();
      current.connect(dry).connect(merge);
      current.connect(convolver).connect(wet).connect(merge);
      nodes.push(convolver, dry, wet, merge);
      current = merge;
    } else if (fx.type === 'delay') {
      const delay = ctx.createDelay(2);
      delay.delayTime.value = fx.params.time ?? 0.3;
      const feedback = ctx.createGain();
      feedback.gain.value = fx.params.feedback ?? 0.3;
      const dry = ctx.createGain();
      dry.gain.value = 1 - (fx.params.mix ?? 0.25);
      const wet = ctx.createGain();
      wet.gain.value = fx.params.mix ?? 0.25;
      const merge = ctx.createGain();
      current.connect(dry).connect(merge);
      current.connect(delay).connect(feedback).connect(delay);
      delay.connect(wet).connect(merge);
      nodes.push(delay, feedback, dry, wet, merge);
      current = merge;
    } else if (fx.type === 'chorus') {
      const delay = ctx.createDelay(0.05);
      delay.delayTime.value = 0.02;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = fx.params.rate ?? 1.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = (fx.params.depth ?? 0.5) * 0.005;
      lfo.connect(lfoGain).connect(delay.delayTime);
      try {
        lfo.start();
      } catch {}
      const dry = ctx.createGain();
      dry.gain.value = 1 - (fx.params.mix ?? 0.3);
      const wet = ctx.createGain();
      wet.gain.value = fx.params.mix ?? 0.3;
      const merge = ctx.createGain();
      current.connect(dry).connect(merge);
      current.connect(delay).connect(wet).connect(merge);
      nodes.push(delay, lfo, lfoGain, dry, wet, merge);
      current = merge;
    } else if (fx.type === 'distortion') {
      const ws = ctx.createWaveShaper();
      const amount = (fx.params.amount ?? 0.3) * 100;
      const samples = 44100;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
      }
      ws.curve = curve;
      ws.oversample = '4x';
      const dry = ctx.createGain();
      dry.gain.value = 1 - (fx.params.mix ?? 0.2);
      const wet = ctx.createGain();
      wet.gain.value = fx.params.mix ?? 0.2;
      const merge = ctx.createGain();
      current.connect(dry).connect(merge);
      current.connect(ws).connect(wet).connect(merge);
      nodes.push(ws, dry, wet, merge);
      current = merge;
    } else if (fx.type === 'highpass') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = fx.params.frequency ?? 200;
      filter.Q.value = fx.params.q ?? 0.7;
      current.connect(filter);
      nodes.push(filter);
      current = filter;
    } else if (fx.type === 'lowpass') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = fx.params.frequency ?? 8000;
      filter.Q.value = fx.params.q ?? 0.7;
      current.connect(filter);
      nodes.push(filter);
      current = filter;
    }
  }

  current.connect(output);
  return nodes;
}

export function disconnectNodes(nodes: AudioNode[]): void {
  for (const n of nodes) {
    try {
      n.disconnect();
    } catch {}
    if (n instanceof OscillatorNode) {
      try {
        n.stop();
      } catch {}
    }
  }
}
