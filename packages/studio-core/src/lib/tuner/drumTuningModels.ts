import type { InstrumentStringTarget } from './tunerTypes';

export type DrumPartId = 'snare' | 'tom1' | 'tom2' | 'floorTom' | 'kick';

export type DrumTensionId = 'tight' | 'normal' | 'loose';

export interface DrumTensionTarget {
  frequency: number;
  note: string;
  octave: number;
  fullName: string;
  description: string;
}

export interface DrumPartDefinition {
  id: DrumPartId;
  name: string;
  shortName: string;
  sizeInches: number;
  image: string;
  order: number;
  lugCount: number;
  tensions: Record<DrumTensionId, DrumTensionTarget>;
}

export interface DrumTensionPreset {
  id: DrumTensionId;
  label: string;
  sublabel: string;
  description: string;
}

export interface DrumTuningTip {
  id: number;
  title: string;
  tip: string;
  action: string;
}

/**
 * 5 Standard Drum Kit Parts with calibrated acoustical frequencies (Hz)
 * Snare Normal is anchored at 242 Hz (B3) matching the user reference mockup.
 */
export const DRUM_PARTS: readonly DrumPartDefinition[] = [
  {
    id: 'snare',
    name: 'Tarola',
    shortName: 'Tarola',
    sizeInches: 14,
    image: 'drum-snare.png',
    order: 0,
    lugCount: 10,
    tensions: {
      tight: {
        frequency: 268.0,
        note: 'C',
        octave: 4,
        fullName: 'C4',
        description: 'Tensión alta: ataque cortante, respuesta rápida de bordonera y armónicos controlados.',
      },
      normal: {
        frequency: 242.0,
        note: 'B',
        octave: 3,
        fullName: 'B3',
        description: 'Tensión estándar: tono pleno, punto dulce acústico con pegada y cuerpo balanceado.',
      },
      loose: {
        frequency: 218.0,
        note: 'A',
        octave: 3,
        fullName: 'A3',
        description: 'Tensión baja: sonido gordo y profundo estilo balada/vintage con mayor resonancia de casco.',
      },
    },
  },
  {
    id: 'tom1',
    name: 'Tom 1',
    shortName: 'Tom 1',
    sizeInches: 10,
    image: 'drum-tom1.png',
    order: 1,
    lugCount: 6,
    tensions: {
      tight: {
        frequency: 185.0,
        note: 'F#',
        octave: 3,
        fullName: 'F#3',
        description: 'Afinación alta y percusiva para pasajes rápidos con gran articulación.',
      },
      normal: {
        frequency: 165.0,
        note: 'E',
        octave: 3,
        fullName: 'E3',
        description: 'Tono balanceado de 10 pulgadas: sustain limpio y armónico natural sin zumbidos.',
      },
      loose: {
        frequency: 145.0,
        note: 'D',
        octave: 3,
        fullName: 'D3',
        description: 'Afinación grave y oscura con decay corto y cuerpo redondeado.',
      },
    },
  },
  {
    id: 'tom2',
    name: 'Tom 2',
    shortName: 'Tom 2',
    sizeInches: 12,
    image: 'drum-tom2.png',
    order: 2,
    lugCount: 6,
    tensions: {
      tight: {
        frequency: 148.0,
        note: 'D',
        octave: 3,
        fullName: 'D3',
        description: 'Tensión alta para un intervalo claro de cuarta con el Tom 1.',
      },
      normal: {
        frequency: 130.0,
        note: 'C',
        octave: 3,
        fullName: 'C3',
        description: 'Tono estándar de 12 pulgadas: cuerpo melódico y resonancia controlada.',
      },
      loose: {
        frequency: 110.0,
        note: 'A',
        octave: 2,
        fullName: 'A2',
        description: 'Tensión baja con golpe contundente y graves envolventes.',
      },
    },
  },
  {
    id: 'floorTom',
    name: 'Piso',
    shortName: 'Piso',
    sizeInches: 16,
    image: 'drum-floor-tom.png',
    order: 3,
    lugCount: 8,
    tensions: {
      tight: {
        frequency: 100.0,
        note: 'G',
        octave: 2,
        fullName: 'G2',
        description: 'Respuesta definida para estilos rápidos o ritmos sincopados en el piso.',
      },
      normal: {
        frequency: 87.0,
        note: 'F',
        octave: 2,
        fullName: 'F2',
        description: 'Afinación clásica de tom de piso: pegada en el pecho con decaimiento suave.',
      },
      loose: {
        frequency: 73.0,
        note: 'D',
        octave: 2,
        fullName: 'D2',
        description: 'Grave profundo y retumbante para estilos pesados de rock/metal.',
      },
    },
  },
  {
    id: 'kick',
    name: 'Bombo',
    shortName: 'Bombo',
    sizeInches: 22,
    image: 'drum-kick.png',
    order: 4,
    lugCount: 10,
    tensions: {
      tight: {
        frequency: 65.0,
        note: 'C',
        octave: 2,
        fullName: 'C2',
        description: 'Afinación ágil con rebote firme del mazo, excelente para jazz o funk.',
      },
      normal: {
        frequency: 55.0,
        note: 'A',
        octave: 1,
        fullName: 'A1',
        description: 'El estándar universal de bombo de 22": impacto sólido en el pecho y subgrave limpio.',
      },
      loose: {
        frequency: 48.0,
        note: 'G',
        octave: 1,
        fullName: 'G1',
        description: 'Parche apenas por encima de arrugas: golpe seco y masivo sin rebote excesivo.',
      },
    },
  },
] as const;

export const DRUM_TENSION_PRESETS: readonly DrumTensionPreset[] = [
  {
    id: 'tight',
    label: 'Tight',
    sublabel: 'Alta tensión',
    description: 'Ataque brillante, proyección articulada y respuesta rápida.',
  },
  {
    id: 'normal',
    label: 'Normal',
    sublabel: 'Estándar',
    description: 'Afinación versátil y equilibrada con tono pleno y resonancia óptima.',
  },
  {
    id: 'loose',
    label: 'Loose',
    sublabel: 'Baja tensión',
    description: 'Tono profundo, sustain cálido con cuerpo y pegada en frecuencias bajas.',
  },
] as const;

export const DRUM_TIPS: readonly DrumTuningTip[] = [
  {
    id: 1,
    title: 'Medición junto al tornillo',
    tip: 'Golpea suavemente con la baqueta a unos 3 cm del borde junto a cada tornillo para medir su tono específico.',
    action: 'Mantén el dedo suavemente en el centro del parche para silenciar el sobretono fundamental.',
  },
  {
    id: 2,
    title: 'Patrón de afinación en cruz',
    tip: 'Si el tono está bajo o alto, ajusta siempre los tornillos opuestos en cruz de 1/8 a 1/4 de vuelta.',
    action: 'Evita ajustar en sentido circular continuo para prevenir deformaciones en el aro.',
  },
  {
    id: 3,
    title: 'Silenciar parche opuesto',
    tip: 'Coloca el tambor sobre una alfombrilla o apoya tu palma para aislar el parche que estás afinando.',
    action: 'Esto evita que el parche resonante interfiera en la lectura de frecuencia del afinador.',
  },
] as const;

/**
 * Converts a Drum Part and Tension into an InstrumentStringTarget compatible with TunerAudioEngine.
 */
export function getDrumStringTarget(
  part: DrumPartDefinition,
  tensionId: DrumTensionId
): InstrumentStringTarget {
  const t = part.tensions[tensionId];
  return {
    name: part.name,
    note: t.note,
    octave: t.octave,
    fullName: `${part.name} (${t.fullName})`,
    frequency: t.frequency,
    stringNumber: part.order + 1,
  };
}

/**
 * Returns all drum targets for a given tension preset.
 */
export function getAllDrumTargetsForTension(
  tensionId: DrumTensionId
): readonly InstrumentStringTarget[] {
  return DRUM_PARTS.map((p) => getDrumStringTarget(p, tensionId));
}

/**
 * Finds the nearest drum part to a detected frequency at a given tension.
 */
export function findNearestDrumPart(
  frequency: number,
  tensionId: DrumTensionId
): { part: DrumPartDefinition; target: DrumTensionTarget; diffHz: number } {
  let closestPart = DRUM_PARTS[0];
  let minDiff = Math.abs(frequency - closestPart.tensions[tensionId].frequency);

  for (let i = 1; i < DRUM_PARTS.length; i++) {
    const p = DRUM_PARTS[i];
    const diff = Math.abs(frequency - p.tensions[tensionId].frequency);
    if (diff < minDiff) {
      minDiff = diff;
      closestPart = p;
    }
  }

  return {
    part: closestPart,
    target: closestPart.tensions[tensionId],
    diffHz: minDiff,
  };
}
