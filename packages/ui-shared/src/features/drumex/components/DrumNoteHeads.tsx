import React, { memo } from 'react';
import { type DrumInstrument, type NoteVariation } from '@workspace/livex-core';

const CircleHead = memo(function CircleHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  return (
    <ellipse
      cx={0}
      cy={0}
      rx={r}
      ry={r * 0.82}
      fill={color}
      stroke={strokeColor}
      strokeWidth={strokeColor ? 1 : 0}
    />
  );
});
const XHead = memo(function XHead({
  r,
  color,
  opacity = 1,
  strokeColor,
}: {
  r: number;
  color: string;
  opacity?: number;
  strokeColor?: string;
}) {
  const d = r * 0.85;
  return (
    <g opacity={opacity}>
      <line x1={-d} y1={-d} x2={d} y2={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={d} y1={-d} x2={-d} y2={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
});
const GhostHead = memo(function GhostHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  return (
    <ellipse
      cx={0}
      cy={0}
      rx={r * 0.62}
      ry={r * 0.62 * 0.82}
      fill={color}
      opacity={0.4}
      stroke={strokeColor}
      strokeWidth={strokeColor ? 0.8 : 0}
    />
  );
});
const RimshotHead = memo(function RimshotHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const d = r * 0.6;
  return (
    <>
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.82} fill="none" stroke={color} strokeWidth={1.3} />
      <line x1={-d} y1={-d} x2={d} y2={d} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <line x1={d} y1={-d} x2={-d} y2={d} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </>
  );
});
const FlamHead = memo(function FlamHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const gr = r * 0.5;
  return (
    <>
      <ellipse
        cx={-r * 1.05}
        cy={-r * 0.95}
        rx={gr}
        ry={gr * 0.82}
        fill={color}
        opacity={0.72}
        stroke={strokeColor}
        strokeWidth={strokeColor ? 0.8 : 0}
      />
      <ellipse
        cx={0}
        cy={0}
        rx={r}
        ry={r * 0.82}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeColor ? 1 : 0}
      />
    </>
  );
});
const AccentHead = memo(function AccentHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const oy = r * 2.1;
  return (
    <>
      <polyline
        points={`${-r * 0.58},${-oy} 0,${-oy - r * 0.72} ${r * 0.58},${-oy}`}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx={0}
        cy={0}
        rx={r}
        ry={r * 0.82}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeColor ? 1 : 0}
      />
    </>
  );
});
const OpenHHHead = memo(function OpenHHHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const d = r * 0.62;
  return (
    <>
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.82} fill="none" stroke={color} strokeWidth={1.4} />
      <line x1={-d} y1={-d} x2={d} y2={d} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <line x1={d} y1={-d} x2={-d} y2={d} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </>
  );
});
const BellHead = memo(function BellHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const rx = r * 0.82;
  const ry = r * 0.95;
  return <polygon points={`0,${-ry} ${rx},0 0,${ry} ${-rx},0`} fill={color} />;
});
const ChokeHead = memo(function ChokeHead({
  r,
  color,
  strokeColor,
}: {
  r: number;
  color: string;
  strokeColor?: string;
}) {
  const d = r * 0.62;
  return (
    <>
      <ellipse
        cx={0}
        cy={0}
        rx={r * 1.08}
        ry={r * 0.92}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
      <line x1={-d} y1={-d} x2={d} y2={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={d} y1={-d} x2={-d} y2={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
});

const NoteHead = memo(function NoteHead({
  inst,
  variation,
  r,
  color,
  strokeColor,
}: {
  inst: DrumInstrument;
  variation: NoteVariation;
  r: number;
  color: string;
  strokeColor?: string;
}) {
  // HH-family and cymbals that default to X
  if (inst === 'hihat-closed') {
    if (variation === 'open') return <OpenHHHead r={r} color={color} strokeColor={strokeColor} />;
    if (variation === 'pedal') return <XHead r={r} color={color} strokeColor={strokeColor} />;
    return <XHead r={r} color={color} strokeColor={strokeColor} />;
  }
  if (inst === 'crash') {
    if (variation === 'choke') return <ChokeHead r={r} color={color} strokeColor={strokeColor} />;
    if (variation === 'bell') return <BellHead r={r} color={color} strokeColor={strokeColor} />;
    if (variation === 'ride')
      return <XHead r={r} color={color} strokeColor={strokeColor} opacity={0.65} />;
    return <XHead r={r} color={color} strokeColor={strokeColor} />;
  }
  if (inst === 'ride') {
    if (variation === 'bell') return <BellHead r={r} color={color} strokeColor={strokeColor} />;
    return <XHead r={r} color={color} strokeColor={strokeColor} />;
  }
  // Circle-family instruments
  if (inst === 'snare') {
    if (variation === 'ghost') return <GhostHead r={r} color={color} strokeColor={strokeColor} />;
    if (variation === 'rimshot')
      return <RimshotHead r={r} color={color} strokeColor={strokeColor} />;
    if (variation === 'flam') return <FlamHead r={r} color={color} strokeColor={strokeColor} />;
    return <CircleHead r={r} color={color} strokeColor={strokeColor} />;
  }
  if (variation === 'accent') return <AccentHead r={r} color={color} strokeColor={strokeColor} />;
  return <CircleHead r={r} color={color} strokeColor={strokeColor} />;
});

export {
  CircleHead,
  XHead,
  GhostHead,
  RimshotHead,
  FlamHead,
  AccentHead,
  OpenHHHead,
  BellHead,
  ChokeHead,
  NoteHead,
};
export default NoteHead;
