import React from 'react';
import { type GuitarChordData } from '@workspace/livex-core';
import { DetailFretboardDiagram } from '../diagrams/DetailFretboardDiagram';

/* ── Full-size chord diagram ───────────────────────────────── */
export const LiveDiagram = React.memo(function LiveDiagram({
  data,
  accentFrom,
  accentTo,
}: {
  data: GuitarChordData;
  accentFrom: string;
  accentTo?: string;
}) {
  return (
    <DetailFretboardDiagram
      chordData={data}
      accentColor={accentFrom}
      maxWidth="100%"
      displayMode="notes"
    />
  );
});

/* ── Mini chord diagram (used in cards / preview / setlists) ── */
export const MiniLiveDiagram = React.memo(function MiniLiveDiagram({
  data,
  accentFrom,
  accentTo,
}: {
  data: GuitarChordData;
  accentFrom?: string;
  accentTo?: string;
}) {
  return (
    <DetailFretboardDiagram
      chordData={data}
      accentColor={accentFrom}
      maxWidth="120px"
      displayMode="notes"
    />
  );
});

export default LiveDiagram;
