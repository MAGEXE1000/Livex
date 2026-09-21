import {
  ChordexLogo,
  StagexLogoIcon,
  GroovexLogo,
  DrumexLogo,
  VocalexLogo,
} from '@workspace/ui-shared';
import React from 'react';
import { motion } from 'motion/react';

// ===== CHORDEX SKELETON =====
export function ChordexFeatureSkeleton() {
  const tabs = ['Songs', 'Library', 'Chords'];
  const songs = ['Hotel California', 'Wish You Were Here', 'Imagine', 'Let It Be'];

  return (
    <div className="w-full h-full bg-[#050505] p-3 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2 mb-2 flex-shrink-0">
        <div className="flex-shrink-0 text-zinc-500 mr-1.5">
          <ChordexLogo size={14} />
        </div>
        {tabs.map((tab, i) => (
          <div
            key={tab}
            className={`text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider relative ${
              i === 0 ? 'text-white bg-zinc-900 border border-zinc-800' : 'text-zinc-500'
            }`}
          >
            {tab}
            {i === 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            )}
          </div>
        ))}
      </div>

      {/* Main Workspace Split */}
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* Left: Songs List */}
        <div className="w-20 border-r border-zinc-900 pr-2 flex flex-col gap-1 flex-shrink-0">
          <div className="text-[7px] text-zinc-600 font-extrabold uppercase tracking-widest mb-1">
            Setlist
          </div>
          {songs.map((song, idx) => (
            <div
              key={song}
              className={`text-[7px] p-1 rounded font-semibold truncate ${
                idx === 0
                  ? 'bg-zinc-100 text-black'
                  : 'text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300'
              }`}
            >
              {song}
            </div>
          ))}
        </div>

        {/* Center: Chord Sheet Preview */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="text-[7px] text-zinc-600 font-extrabold uppercase tracking-widest">
            Sheet
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/50 rounded-lg p-2 flex-1 flex flex-col gap-1.5 overflow-hidden">
            <div>
              <span className="text-[7.5px] font-extrabold text-blue-400 mr-8">[Am]</span>
              <span className="text-[7.5px] font-extrabold text-blue-400">[E7]</span>
            </div>
            <div className="text-[7.5px] text-zinc-400 font-medium leading-none truncate mb-1.5">
              On a dark desert highway, cool wind in my hair
            </div>

            <div>
              <span className="text-[7.5px] font-extrabold text-blue-400 mr-8">[G]</span>
              <span className="text-[7.5px] font-extrabold text-blue-400">[D]</span>
            </div>
            <div className="text-[7.5px] text-zinc-400 font-medium leading-none truncate">
              Warm smell of colitas, rising up through the air
            </div>
          </div>
        </div>

        {/* Right: Guitar Chord Diagram */}
        <div className="w-[64px] flex flex-col gap-2 flex-shrink-0 items-center justify-center border-l border-zinc-900 pl-2">
          <div className="text-[7px] text-zinc-600 font-extrabold uppercase tracking-widest text-center self-start">
            Diagram
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-white mb-1">Am</span>
            {/* Chord grid */}
            <div className="relative w-8 h-12 border border-zinc-700 grid grid-cols-5 divide-x divide-zinc-800">
              <div className="absolute top-[20%] left-0 right-0 h-[1px] bg-zinc-800" />
              <div className="absolute top-[50%] left-0 right-0 h-[1px] bg-zinc-800" />
              <div className="absolute top-[80%] left-0 right-0 h-[1px] bg-zinc-800" />
              {/* Dots on fretboard */}
              <div className="absolute w-1.5 h-1.5 rounded-full bg-zinc-100 top-[10%] left-[24%]" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-zinc-100 top-[40%] left-[64%]" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-zinc-100 top-[40%] left-[44%]" />
            </div>
            <div className="flex gap-1 mt-1">
              {['X', 'O', '2', '2', '1', 'O'].map((val, i) => (
                <span key={i} className="text-[5px] text-zinc-500 font-bold">
                  {val}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== STAGEX SKELETON =====
export function StagexFeatureSkeleton() {
  return (
    <div className="w-full h-full bg-[#050505] p-3 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top bar controls */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 text-zinc-500">
            <StagexLogoIcon size={14} />
          </div>
          <span className="text-[8.5px] text-white font-bold uppercase tracking-wider">
            Acoustic Setup
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="text-[7px] text-zinc-500 bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded font-bold uppercase">
            vis
          </div>
          <div className="text-[7px] text-zinc-500 bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded font-bold uppercase">
            save
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden relative">
        <div
          className="flex-1 rounded-lg border border-zinc-900 bg-[#020203] relative overflow-hidden flex items-center justify-center"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        >
          {/* Stage Node: Vocal Mic */}
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[20%] left-[50%] -translate-x-1/2 p-1 bg-zinc-900 border border-zinc-800 rounded flex items-center gap-1 shadow-lg"
          >
            <span className="material-symbols-outlined text-[8px] text-zinc-400">mic</span>
            <span className="text-[6px] text-white font-bold uppercase">Vocal Mic</span>
          </motion.div>

          {/* Stage Node: Acoustic DI */}
          <motion.div
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[60%] left-[25%] p-1 bg-zinc-900 border border-zinc-800 rounded flex items-center gap-1 shadow-lg"
          >
            <span className="material-symbols-outlined text-[8px] text-zinc-400">
              settings_input_hdmi
            </span>
            <span className="text-[6px] text-white font-bold uppercase">Acoustic DI</span>
          </motion.div>

          {/* Stage Node: Keyboard */}
          <motion.div
            animate={{ y: [0, -1.5, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-[60%] left-[65%] p-1 bg-zinc-900 border border-zinc-800 rounded flex items-center gap-1 shadow-lg"
          >
            <span className="material-symbols-outlined text-[8px] text-zinc-400">piano</span>
            <span className="text-[6px] text-white font-bold uppercase">Key DI</span>
          </motion.div>

          <div className="absolute bottom-1.5 left-2 text-[5.5px] text-zinc-600 font-extrabold uppercase tracking-widest">
            Grid: 10m x 6m
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[64px] border-l border-zinc-900 pl-2 flex flex-col gap-2 flex-shrink-0">
          <div className="text-[7px] text-zinc-600 font-extrabold uppercase tracking-widest">
            Controls
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[6px] text-zinc-400 uppercase font-bold">Add Item</div>
            <div className="text-[6.5px] p-1 bg-zinc-950 border border-zinc-900 rounded font-semibold text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined text-[8px]">add</span>
              DI Box
            </div>
            <div className="text-[6.5px] p-1 bg-zinc-950 border border-zinc-900 rounded font-semibold text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined text-[8px]">add</span>
              Monitor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== GROOVEX SKELETON =====
export function GroovexFeatureSkeleton() {
  const tracks = [
    { name: 'Drums', color: 'bg-zinc-400' },
    { name: 'Bass', color: 'bg-zinc-500' },
    { name: 'Keys', color: 'bg-zinc-600' },
  ];

  return (
    <div className="w-full h-full bg-[#050505] p-3 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Playback Area */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 text-zinc-500">
            <GroovexLogo size={14} />
          </div>
          <span className="text-[8.5px] text-white font-bold uppercase tracking-wider">
            Groove Mixer
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[10px] text-zinc-500">skip_previous</span>
          <span className="material-symbols-outlined text-[11px] text-blue-400 font-extrabold">
            play_arrow
          </span>
          <span className="material-symbols-outlined text-[10px] text-zinc-500">skip_next</span>
          <div className="text-[7.5px] font-black text-white bg-zinc-900 border border-zinc-850 px-1 py-0.5 rounded ml-1">
            118 BPM
          </div>
        </div>
      </div>

      {/* Mixer channels & Waveforms */}
      <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
        {tracks.map((track) => (
          <div
            key={track.name}
            className="flex items-center gap-2 border border-zinc-900/50 bg-[#020202] rounded-lg p-1.5"
          >
            {/* Track Label */}
            <div className="w-10 text-[8px] font-bold text-white truncate">{track.name}</div>

            {/* Level Slider */}
            <div className="w-12 h-1 bg-zinc-900 rounded relative">
              <div className="absolute left-0 top-0 bottom-0 w-[70%] bg-zinc-400 rounded" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-1/2 -translate-y-1/2 left-[70%] shadow border border-zinc-900" />
            </div>

            {/* Level Meter */}
            <div className="flex gap-0.5 h-4 w-4 bg-zinc-950 p-0.5 rounded border border-zinc-900 flex-shrink-0 items-end justify-center">
              <motion.div
                animate={{ height: ['20%', '80%', '40%', '90%', '20%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-1.5 bg-zinc-400 rounded-sm"
              />
              <motion.div
                animate={{ height: ['40%', '20%', '90%', '50%', '40%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                className="w-1.5 bg-zinc-400 rounded-sm"
              />
            </div>

            {/* Waveform representation */}
            <div className="flex-1 flex gap-0.5 items-center justify-between h-4 px-1.5 border border-zinc-900/40 bg-zinc-950/20 rounded overflow-hidden">
              {[20, 60, 40, 80, 50, 70, 30, 90, 60, 40, 70, 30, 50].map((h, i) => (
                <div
                  key={i}
                  className={`w-[1px] ${track.color} rounded-sm`}
                  style={{ height: `${h}%`, opacity: 0.45 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== DRUMEX SKELETON =====
export function DrumexFeatureSkeleton() {
  const tabs = ['Sequencer', 'Patterns', 'Rudiments'];
  const insts = [
    { name: 'Crash', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'Hi-Hat', pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: 'Snare', pattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    { name: 'Kick', pattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0] },
  ];

  return (
    <div className="w-full h-full bg-[#050505] p-3 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 text-zinc-500 mr-1.5">
            <DrumexLogo size={14} />
          </div>
          {tabs.map((tab, i) => (
            <div
              key={tab}
              className={`text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider relative ${
                i === 0 ? 'text-white bg-zinc-900 border border-zinc-800' : 'text-zinc-500'
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Beat pulse indicator */}
          <div className="flex gap-1 items-center bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">
            {[1, 2, 3, 4].map((b) => (
              <motion.div
                key={b}
                animate={b === 1 ? { opacity: [1, 0.3, 1], scale: [1.2, 0.9, 1.2] } : { opacity: 0.4 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-1 h-1 rounded-full ${b === 1 ? 'bg-blue-400' : 'bg-zinc-600'}`}
              />
            ))}
          </div>
          <div className="text-[7.5px] font-black text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
            120 BPM
          </div>
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="flex-1 flex flex-col border border-zinc-900/60 rounded-lg overflow-hidden bg-[#020203] relative min-h-0">
        {/* Playhead sweep animation */}
        <motion.div
          animate={{ left: ['18%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.6)] z-10 pointer-events-none"
        />

        {insts.map((inst, rowIdx) => (
          <div
            key={inst.name}
            className="flex flex-1 border-b border-zinc-900/40 last:border-none items-center"
          >
            {/* Instrument label */}
            <div className="w-14 pl-2 text-[7px] font-bold text-zinc-400 border-r border-zinc-900/60 flex items-center justify-between pr-1.5 flex-shrink-0">
              <span className="truncate">{inst.name}</span>
              <span className="text-[5.5px] text-zinc-600 uppercase font-mono">M/S</span>
            </div>

            {/* 16 Steps */}
            <div className="flex-1 grid grid-cols-16 h-full">
              {inst.pattern.map((active, stepIdx) => {
                const isGroupQuarter = stepIdx % 4 === 0;
                return (
                  <div
                    key={stepIdx}
                    className={`border-r border-zinc-900/30 last:border-none flex items-center justify-center ${
                      Math.floor(stepIdx / 4) % 2 === 1 ? 'bg-zinc-950/40' : ''
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-sm transition-all ${
                        active === 1
                          ? rowIdx === 2
                            ? 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.5)]'
                            : 'bg-zinc-200 shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                          : isGroupQuarter
                            ? 'bg-zinc-850/60 border border-zinc-800/80'
                            : 'bg-zinc-900/50'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Rudiment strip */}
      <div className="mt-1.5 flex items-center justify-between text-[6.5px] text-zinc-500 px-1">
        <span className="font-semibold text-zinc-400">Preset: Rock Straight 4/4</span>
        <span className="font-mono text-zinc-600">Sync: Internal Clock</span>
      </div>
    </div>
  );
}

// ===== VOCALEX SKELETON =====
export function VocalexFeatureSkeleton() {
  const tabs = ['Pitch Tracker', 'Audio Takes', 'Warmup'];
  const takes = [
    { id: 'Take 03', dur: '0:42', active: true },
    { id: 'Take 02', dur: '0:38', active: false },
    { id: 'Take 01', dur: '0:45', active: false },
  ];

  return (
    <div className="w-full h-full bg-[#050505] p-3 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 text-zinc-500 mr-1.5">
            <VocalexLogo size={14} />
          </div>
          {tabs.map((tab, i) => (
            <div
              key={tab}
              className={`text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider relative ${
                i === 0 ? 'text-white bg-zinc-900 border border-zinc-800' : 'text-zinc-500'
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[7.5px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            +2¢ IN TUNE
          </div>
          <div className="text-[7.5px] font-black text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
            C#4 · 277.2 Hz
          </div>
        </div>
      </div>

      {/* Workspace Split */}
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* Takes column */}
        <div className="w-20 border-r border-zinc-900 pr-2 flex flex-col gap-1 flex-shrink-0">
          <div className="text-[7px] text-zinc-600 font-extrabold uppercase tracking-widest mb-0.5">
            Takes Log
          </div>
          {takes.map((take) => (
            <div
              key={take.id}
              className={`text-[7px] p-1 rounded font-semibold flex items-center justify-between ${
                take.active
                  ? 'bg-zinc-900 border border-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-950'
              }`}
            >
              <div className="flex items-center gap-1 truncate">
                <span
                  className={`w-1 h-1 rounded-full ${
                    take.active ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                <span className="truncate">{take.id}</span>
              </div>
              <span className="text-[5.5px] text-zinc-500 font-mono">{take.dur}</span>
            </div>
          ))}
          <div className="mt-auto pt-1 border-t border-zinc-900 text-[6px] text-zinc-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            REC 48kHz WAV
          </div>
        </div>

        {/* Real-time Pitch Visual Tracing Canvas */}
        <div className="flex-1 rounded-lg border border-zinc-900 bg-[#020203] relative overflow-hidden flex flex-col justify-between p-2">
          {/* Note guide grid */}
          <div className="absolute inset-0 flex flex-col justify-between py-2 px-3 pointer-events-none">
            {['D4', 'C#4', 'C4', 'B3'].map((n) => (
              <div
                key={n}
                className={`w-full flex items-center justify-between border-b ${
                  n === 'C#4'
                    ? 'border-blue-500/30 text-blue-400 font-bold'
                    : 'border-zinc-900/40 text-zinc-600'
                } pb-0.5 text-[6px] font-mono`}
              >
                <span>{n}</span>
                {n === 'C#4' && (
                  <span className="text-[5.5px] bg-blue-500/20 text-blue-300 px-1 rounded uppercase">
                    Target
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Animated Pitch Contour Curve */}
          <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none">
            <motion.path
              d="M 20,80 Q 70,75 110,48 T 200,48 T 280,47"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0.2, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
            {/* Real-time tracker dot */}
            <motion.circle
              cx="280"
              cy="47"
              r="3"
              fill="#ffffff"
              animate={{ r: [2.5, 4, 2.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </svg>

          {/* Bottom Live Meter */}
          <div className="mt-auto pt-1 relative z-10 flex items-center justify-between text-[6px] text-zinc-500 font-mono">
            <span>Latency: 4.2ms</span>
            <span className="text-zinc-400">Confidence: 99.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

