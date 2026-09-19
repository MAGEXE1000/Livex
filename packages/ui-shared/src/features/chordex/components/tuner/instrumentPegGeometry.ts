import type { InstrumentTuningMode } from '@workspace/livex-core';

export interface PegTargetDefinition {
  readonly stringNumber: number;
  readonly side: 'left' | 'right';
  readonly topPct: number;
}

export interface InstrumentGeometryDefinition {
  readonly mode: InstrumentTuningMode;
  readonly headstockPosition: 'right' | 'center';
  readonly assetSrc: string;
  readonly pegs: readonly PegTargetDefinition[];
}

export const INSTRUMENT_GEOMETRIES: Record<string, InstrumentGeometryDefinition> = {
  electric: {
    mode: 'electric',
    headstockPosition: 'right',
    assetSrc: '/instruments/headstock-stratocaster.webp',
    pegs: [
      { stringNumber: 6, side: 'left', topPct: 18.0 },
      { stringNumber: 5, side: 'left', topPct: 27.4 },
      { stringNumber: 4, side: 'left', topPct: 36.8 },
      { stringNumber: 3, side: 'left', topPct: 46.2 },
      { stringNumber: 2, side: 'left', topPct: 55.6 },
      { stringNumber: 1, side: 'left', topPct: 65.0 },
    ],
  },
  acoustic: {
    mode: 'acoustic',
    headstockPosition: 'center',
    assetSrc: '/instruments/headstock-acoustic.webp',
    pegs: [
      { stringNumber: 6, side: 'left', topPct: 20.5 },
      { stringNumber: 5, side: 'left', topPct: 33.5 },
      { stringNumber: 4, side: 'left', topPct: 46.5 },
      { stringNumber: 3, side: 'right', topPct: 20.5 },
      { stringNumber: 2, side: 'right', topPct: 33.5 },
      { stringNumber: 1, side: 'right', topPct: 46.5 },
    ],
  },
  'bass-4': {
    mode: 'bass-4',
    headstockPosition: 'right',
    assetSrc: '/instruments/headstock-bass.webp',
    pegs: [
      { stringNumber: 4, side: 'left', topPct: 18.5 },
      { stringNumber: 3, side: 'left', topPct: 32.0 },
      { stringNumber: 2, side: 'left', topPct: 45.5 },
      { stringNumber: 1, side: 'left', topPct: 59.0 },
    ],
  },
};

export function getInstrumentGeometry(mode: InstrumentTuningMode): InstrumentGeometryDefinition {
  return INSTRUMENT_GEOMETRIES[mode] || INSTRUMENT_GEOMETRIES.electric;
}
