import type { InstrumentTuningMode } from '@workspace/studio-core';

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

export const INSTRUMENT_GEOMETRIES: Record<InstrumentTuningMode, InstrumentGeometryDefinition> = {
  electric: {
    mode: 'electric',
    headstockPosition: 'right',
    assetSrc: '/instruments/headstock-stratocaster.webp',
    pegs: [
      { stringNumber: 6, side: 'left', topPct: 13.5 },
      { stringNumber: 5, side: 'left', topPct: 21.5 },
      { stringNumber: 4, side: 'left', topPct: 29.5 },
      { stringNumber: 3, side: 'left', topPct: 37.5 },
      { stringNumber: 2, side: 'left', topPct: 45.5 },
      { stringNumber: 1, side: 'left', topPct: 53.5 },
    ],
  },
  acoustic: {
    mode: 'acoustic',
    headstockPosition: 'center',
    assetSrc: '/instruments/headstock-acoustic.webp',
    pegs: [
      { stringNumber: 6, side: 'left', topPct: 21.0 },
      { stringNumber: 5, side: 'left', topPct: 33.5 },
      { stringNumber: 4, side: 'left', topPct: 46.0 },
      { stringNumber: 3, side: 'right', topPct: 21.0 },
      { stringNumber: 2, side: 'right', topPct: 33.5 },
      { stringNumber: 1, side: 'right', topPct: 46.0 },
    ],
  },
  'bass-4': {
    mode: 'bass-4',
    headstockPosition: 'right',
    assetSrc: '/instruments/headstock-bass.webp',
    pegs: [
      { stringNumber: 4, side: 'left', topPct: 15.0 },
      { stringNumber: 3, side: 'left', topPct: 27.5 },
      { stringNumber: 2, side: 'left', topPct: 41.0 },
      { stringNumber: 1, side: 'left', topPct: 54.0 },
    ],
  },
  'bass-5': {
    mode: 'bass-5',
    headstockPosition: 'center',
    assetSrc: '/instruments/headstock-bass.webp',
    pegs: [
      { stringNumber: 5, side: 'left', topPct: 22.0 },
      { stringNumber: 4, side: 'left', topPct: 42.0 },
      { stringNumber: 3, side: 'right', topPct: 21.0 },
      { stringNumber: 2, side: 'right', topPct: 35.0 },
      { stringNumber: 1, side: 'right', topPct: 50.0 },
    ],
  },
};

export function getInstrumentGeometry(mode: InstrumentTuningMode): InstrumentGeometryDefinition {
  return INSTRUMENT_GEOMETRIES[mode] || INSTRUMENT_GEOMETRIES.electric;
}
