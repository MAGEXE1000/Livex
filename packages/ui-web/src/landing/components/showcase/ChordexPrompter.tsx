import React, { useState } from 'react';
import { ChordexLogo } from '@workspace/ui-shared';
import { ArrowLeftRight, Music, Play, Eye, Layers } from 'lucide-react';

type PrompterMode = 'teleprompter' | 'chords' | 'both';

const CHORDS_IN_SONG = [
  { name: 'G', quality: 'Major', frets: [3, 2, 0, 0, 3, 3], intervals: ['ROOT', '3RD', '5TH'] },
  { name: 'Em7', quality: 'Minor 7th', frets: [0, 2, 2, 0, 3, 3], intervals: ['ROOT', 'b3RD', '5TH', 'b7TH'] },
  { name: 'Cadd9', quality: 'Add 9th', frets: [-1, 3, 2, 0, 3, 3], intervals: ['ROOT', '3RD', '5TH', '9TH'] },
  { name: 'Dsus4', quality: 'Suspended', frets: [-1, -1, 0, 2, 3, 3], intervals: ['ROOT', '4TH', '5TH'] },
];

const SONG_LINES = [
  {
    section: 'Verse 1',
    bars: 2,
    chords: [
      { chord: 'G', pos: '0%' },
      { chord: 'Cadd9', pos: '48%' },
    ],
    lyrics: 'Standing on the edge of the ancient canal',
  },
  {
    section: 'Verse 1',
    bars: 2,
    chords: [
      { chord: 'Em7', pos: '0%' },
      { chord: 'Dsus4', pos: '52%' },
    ],
    lyrics: 'Golden lanterns glow through the midnight mist',
  },
  {
    section: 'Chorus',
    bars: 2,
    chords: [
      { chord: 'Cadd9', pos: '0%' },
      { chord: 'G', pos: '45%' },
    ],
    lyrics: 'Sing it out loud, let the rhythm ignite',
  },
  {
    section: 'Chorus',
    bars: 2,
    chords: [
      { chord: 'Em7', pos: '0%' },
      { chord: 'Dsus4', pos: '50%' },
    ],
    lyrics: 'All across the water till the morning light',
  },
];

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function ChordexPrompter() {
  const [mode, setMode] = useState<PrompterMode>('both');
  const [selectedChordIndex, setSelectedChordIndex] = useState(0);
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [activeLine, setActiveLine] = useState(0);

  const baseKeyIndex = KEYS.indexOf('G');
  const currentKey = KEYS[(baseKeyIndex + transposeOffset + 12) % 12];
  const activeChord = CHORDS_IN_SONG[selectedChordIndex];

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#09090b] border border-white/10 p-5 font-sans select-none shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ChordexLogo size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Chordex & Live Prompter</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Single Web Audio Clock
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Synchronized teleprompter, transposition & fretboard charts</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-white/10">
          <button
            type="button"
            onClick={() => setMode('chords')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              mode === 'chords' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Chords
          </button>
          <button
            type="button"
            onClick={() => setMode('teleprompter')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              mode === 'teleprompter' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lyrics
          </button>
          <button
            type="button"
            onClick={() => setMode('both')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              mode === 'both' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Combined
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left/Main Column: Song & Teleprompter Canvas */}
        <div className={`${mode === 'chords' ? 'lg:col-span-6' : 'lg:col-span-8'} flex flex-col gap-3`}>
          {/* Song Meta Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/5">
            <div>
              <span className="text-xs font-bold text-white">Venezia</span>
              <span className="text-[11px] text-zinc-400 ml-2">• 128 BPM • 4/4</span>
            </div>

            {/* Transpose Stepper */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Key:</span>
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                <button
                  type="button"
                  onClick={() => setTransposeOffset((o) => o - 1)}
                  className="text-xs text-zinc-400 hover:text-white px-1 font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="text-xs font-bold font-mono text-sky-400 px-1">{currentKey}</span>
                <button
                  type="button"
                  onClick={() => setTransposeOffset((o) => o + 1)}
                  className="text-xs text-zinc-400 hover:text-white px-1 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              {transposeOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setTransposeOffset(0)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Interactive Lines Teleprompter */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/50 border border-white/5 min-h-[220px]">
            {SONG_LINES.map((line, idx) => {
              const isActive = activeLine === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveLine(idx)}
                  className={`flex flex-col p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'border-sky-500/40 bg-sky-950/20 shadow-xs'
                      : 'border-white/5 hover:border-white/10 bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">
                      {line.section} • {line.bars} Bars
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-sky-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        Active Live Bar
                      </span>
                    )}
                  </div>

                  {/* Chords row (if mode is chords or both) */}
                  {(mode === 'chords' || mode === 'both') && (
                    <div className="relative h-5 font-mono text-xs font-bold text-sky-400">
                      {line.chords.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          style={{ position: 'absolute', left: c.pos }}
                          className="hover:underline cursor-pointer"
                        >
                          {c.chord}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Lyrics row (if mode is teleprompter or both) */}
                  {(mode === 'teleprompter' || mode === 'both') && (
                    <p
                      className={`text-sm tracking-tight transition-colors ${
                        isActive ? 'text-white font-medium' : 'text-zinc-400'
                      }`}
                    >
                      {line.lyrics}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Fretboard & Chord Chart */}
        <div className={`${mode === 'chords' ? 'lg:col-span-6' : 'lg:col-span-4'} flex flex-col gap-3`}>
          {/* Chord Selector Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CHORDS_IN_SONG.map((chord, idx) => (
              <button
                key={chord.name}
                type="button"
                onClick={() => setSelectedChordIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  selectedChordIndex === idx
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                    : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-white'
                }`}
              >
                {chord.name}
              </button>
            ))}
          </div>

          {/* SVG Fretboard Diagram Card */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900/40 border border-white/5">
            <div className="w-full flex items-center justify-between mb-3">
              <div>
                <span className="text-base font-extrabold text-white">{activeChord.name}</span>
                <span className="text-[11px] text-zinc-400 ml-2">{activeChord.quality}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                Standard Tuning
              </span>
            </div>

            {/* Interactive Fretboard SVG */}
            <div className="w-48 h-36 relative my-1">
              <svg viewBox="0 0 160 120" className="w-full h-full">
                {/* Nut */}
                <rect x="20" y="10" width="120" height="4" fill="#ffffff" rx="1" />

                {/* 5 Frets */}
                {[30, 50, 70, 90, 110].map((y) => (
                  <line key={y} x1="20" y1={y} x2="140" y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                ))}

                {/* 6 Strings */}
                {[20, 44, 68, 92, 116, 140].map((x, i) => (
                  <line key={i} x1={x} y1="10" x2={x} y2="110" stroke="rgba(255,255,255,0.25)" strokeWidth={1 + i * 0.25} />
                ))}

                {/* Dots on frets */}
                {activeChord.frets.map((fret, stringIdx) => {
                  if (fret <= 0) return null;
                  const cx = 20 + stringIdx * 24;
                  const cy = 10 + (fret - 0.5) * 20;
                  return (
                    <g key={stringIdx}>
                      <circle cx={cx} cy={cy} r="6" fill="#38bdf8" />
                      <circle cx={cx} cy={cy} r="2" fill="#ffffff" />
                    </g>
                  );
                })}

                {/* String open/mute markers */}
                {activeChord.frets.map((fret, stringIdx) => {
                  const cx = 20 + stringIdx * 24;
                  if (fret === -1) {
                    return (
                      <text key={stringIdx} x={cx} y="6" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">
                        ×
                      </text>
                    );
                  }
                  if (fret === 0) {
                    return (
                      <circle key={stringIdx} cx={cx} cy="4" r="2.5" fill="none" stroke="#22c55e" strokeWidth="1" />
                    );
                  }
                  return null;
                })}
              </svg>
            </div>

            {/* Intervals Badge Row */}
            <div className="flex flex-wrap gap-1 mt-2">
              {activeChord.intervals.map((int, i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                  {int}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChordexPrompter;
