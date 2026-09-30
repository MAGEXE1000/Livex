import React, { memo } from 'react';
import { type GuitarChordData } from '@workspace/livex-core';
import { DetailFretboardDiagram } from './DetailFretboardDiagram';

interface Props {
  data: GuitarChordData;
  accentFrom?: string;
  fretsMulti?: number[][];
  maxWidth?: string | number;
  style?: React.CSSProperties;
  displayMode?: 'notes' | 'intervals';
  className?: string;
}

/**
 * Unified ChordDiagram wrapper delegating to canonical DetailFretboardDiagram.
 */
export default memo(function ChordDiagram({
  data,
  accentFrom,
  maxWidth,
  style,
  displayMode = 'notes',
  className,
}: Props) {
  return (
    <DetailFretboardDiagram
      chordData={data}
      accentColor={accentFrom}
      maxWidth={maxWidth ?? '100%'}
      style={style}
      displayMode={displayMode}
      className={className}
      surfaceStyle={{
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        padding: 0,
        boxShadow: 'none',
      }}
    />
  );
});
