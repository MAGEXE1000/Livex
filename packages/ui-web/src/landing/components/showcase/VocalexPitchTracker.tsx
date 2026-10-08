import React, { useState, useEffect } from 'react';
import { VocalexLogo } from '@workspace/ui-shared';
import { Play, Pause, Mic, Radio, Music, Volume2, Sparkles, Activity } from 'lucide-react';

interface VocalTake {
  id: string;
  title: string;
  note: string;
  cents: number;
  freq: number;
  scale: string;
  points: number[];
}

const TAKES: VocalTake[] = [
  {
    id: 'take3',
    title: 'Chorus Lead Harmony — Take 3',
    note: 'C#4',
    cents: 2,
    freq: 277.2,
    scale: 'A Major / F# Minor',
    points: [48, 50, 49, 52, 51, 50, 52, 51, 49, 50, 51, 50, 49, 51, 50],
  },
  {
    id: 'take1',
    title: 'Verse 1 Falsetto Float — Take 1',
    note: 'E4',
    cents: -4,
    freq: 329.6,
    scale: 'E Major Pentatonic',
    points: [44, 46, 45, 47, 46, 45, 46, 47, 45, 46, 44, 46, 47, 45, 46],
  },
  {
    id: 'liveMic',
    title: 'Live Stage Dynamic Mic (XLR 1)',
    note: 'A3',
    cents: 1,
    freq: 220.0,
    scale: 'Chromatic Tracker',
    points: [50, 51, 50, 50, 51, 49, 50, 52, 51, 50, 50, 49, 50, 51, 50],
  },
];

export function VocalexPitchTracker() {
  const [activeTakeIndex, setActiveTakeIndex] = useState(0);
  const [isTracking, setIsTracking] = useState(true);
  const [liveOffset, setLiveOffset] = useState(0);
  const [tick, setTick] = useState(0);

  const activeTake = TAKES[activeTakeIndex];

  // Subtle real-time pitch fluctuation simulation
  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Small vibrato flutter around base cents
      const flutter = Math.sin(Date.now() / 250) * 3 + (Math.random() * 2 - 1);
      setLiveOffset(Math.round(flutter));
    }, 120);
    return () => clearInterval(interval);
  }, [isTracking]);

  const currentCents = isTracking ? activeTake.cents + liveOffset : activeTake.cents;
  const inTune = Math.abs(currentCents) <= 5;

  // Build SVG path coordinates for the pitch contour curve
  const width = 640;
  const height = 150;
  const stepX = width / (activeTake.points.length - 1);
  const pathD = activeTake.points
    .map((val, idx) => {
      const x = idx * stepX;
      // Oscillate slightly with tick
      const wobble = isTracking ? Math.sin((tick + idx) * 0.6) * 4 : 0;
      const y = (100 - (val + wobble)) * (height / 100);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#09090b] border border-white/10 p-5 font-sans select-none shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <VocalexLogo size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Vocalex Pitch Engine</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                48 kHz Lossless
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Zero-latency sub-cent pitch contour & vocal calibration</p>
          </div>
        </div>

        {/* Live Tracking Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTracking(!isTracking)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isTracking
                ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isTracking ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-pulse text-pink-400" />
                <span>Tracking Live</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Tracking</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Pitch Status Readout Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        {/* Detected Target Note */}
        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Target Note</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">{activeTake.note}</span>
            <span className="text-xs text-zinc-400 font-mono">{(activeTake.freq).toFixed(1)} Hz</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1">{activeTake.scale}</span>
        </div>

        {/* Cent Deviation Meter */}
        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex flex-col justify-between sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Pitch Calibration</span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                inTune
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : currentCents > 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
              }`}
            >
              {inTune ? 'Perfect Pitch' : currentCents > 0 ? 'Sharp' : 'Flat'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-1">
              <span>-50c</span>
              <span className={`font-bold ${inTune ? 'text-emerald-400' : 'text-zinc-200'}`}>
                {currentCents > 0 ? `+${currentCents}` : currentCents} cents
              </span>
              <span>+50c</span>
            </div>
            {/* Visual Cent Bar Indicator */}
            <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 -translate-x-1/2 z-10" />
              <div
                className={`absolute top-0 bottom-0 transition-all duration-100 ${
                  inTune ? 'bg-emerald-500' : currentCents > 0 ? 'bg-amber-400' : 'bg-sky-400'
                }`}
                style={{
                  left: `${Math.max(5, Math.min(95, 50 + currentCents))}%`,
                  width: '6px',
                  borderRadius: '9999px',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Center = 440 Hz standard</span>
            <span>Vibrato: 5.4 Hz</span>
          </div>
        </div>

        {/* Dynamic Mic Sensitivity */}
        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Accuracy</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-white">98.4%</span>
            <span className="text-[11px] text-emerald-400">Stable</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1">Tolerance: ±5 cents</span>
        </div>
      </div>

      {/* SVG Pitch Contour Canvas */}
      <div className="relative w-full h-36 rounded-xl bg-black/60 border border-white/10 overflow-hidden p-2 flex flex-col justify-between">
        {/* Background Grid Guide Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-3 opacity-30">
          <div className="border-b border-dashed border-white/20 text-[9px] text-zinc-400 font-mono flex justify-between">
            <span>+50 cents</span>
            <span>Upper Tolerance</span>
          </div>
          <div className="border-b border-pink-500/40 text-[9px] text-pink-400 font-mono flex justify-between">
            <span>0 c (Center Target: {activeTake.note})</span>
            <span>In Tune</span>
          </div>
          <div className="border-t border-dashed border-white/20 text-[9px] text-zinc-400 font-mono flex justify-between">
            <span>-50 cents</span>
            <span>Lower Tolerance</span>
          </div>
        </div>

        {/* Target Note Range Pill */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] font-semibold text-pink-300 font-mono">
            TARGET WINDOW • {activeTake.note}
          </span>
        </div>

        {/* Vector Curve */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full relative z-10 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="vocalContourGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke="url(#vocalContourGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </svg>

        {/* Scanning Cursor Line */}
        {isTracking && (
          <div className="absolute top-0 bottom-0 right-16 w-0.5 bg-pink-400 shadow-[0_0_8px_#ec4899] z-20 pointer-events-none">
            <div className="absolute top-2 -left-2 w-4 h-4 rounded-full bg-pink-500/20 border border-pink-400 animate-ping" />
          </div>
        )}
      </div>

      {/* Vocal Take Selector Switcher */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-medium">Audio Source:</span>
          <div className="flex flex-wrap gap-1.5">
            {TAKES.map((take, idx) => (
              <button
                key={take.id}
                onClick={() => setActiveTakeIndex(idx)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTakeIndex === idx
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {take.title}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 font-mono">
          DSP: <span className="text-zinc-200">Autocorrelation + YIN algorithm</span>
        </div>
      </div>
    </div>
  );
}
