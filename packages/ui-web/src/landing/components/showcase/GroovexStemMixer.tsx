import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';
import { GroovexLogo } from '@workspace/ui-shared';

interface StemChannel {
  id: string;
  ch: string;
  name: string;
  color: string;
  defaultVolume: number;
}

const STEM_CHANNELS: StemChannel[] = [
  { id: 'vocals', ch: 'CH 01', name: 'Lead Vocals', color: '#38bdf8', defaultVolume: 82 },
  { id: 'drums', ch: 'CH 02', name: 'Acoustic Drums', color: '#f59e0b', defaultVolume: 88 },
  { id: 'bass', ch: 'CH 03', name: 'Electric Bass', color: '#10b981', defaultVolume: 78 },
  { id: 'guitars', ch: 'CH 04', name: 'Guitar Stems', color: '#a855f7', defaultVolume: 74 },
  { id: 'click', ch: 'CH 05', name: 'Click & Cues', color: '#ec4899', defaultVolume: 65 },
];

function volumeToDb(v: number): string {
  if (v <= 0) return '-inf dB';
  if (v === 80) return ' 0.0 dB';
  const diff = (v - 80) / 10;
  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} dB`;
}

interface ConsoleFaderProps {
  value: number;
  onChange: (val: number) => void;
  accentColor: string;
  disabled?: boolean;
  label: string;
}

function ConsoleFader({ value, onChange, accentColor, disabled = false, label }: ConsoleFaderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const calculateVolumeFromY = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const height = rect.height;
    const offsetY = clientY - rect.top;
    const clampedY = Math.max(0, Math.min(height, offsetY));
    const percent = 1 - clampedY / height;
    const newVol = Math.round(percent * 100);
    onChange(newVol);
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateVolumeFromY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled) return;
    calculateVolumeFromY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(100, value + 2));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(0, value - 2));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(100);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(0);
    }
  };

  const handleDoubleClick = () => {
    if (!disabled) onChange(80); // Snap to 0.0 dB unity gain
  };

  // Position from bottom in percentage (0 to 100)
  const capBottomPercent = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2.5 h-36 select-none">
      {/* Calibration scale ticks on the left */}
      <div className="flex flex-col justify-between h-full text-[9px] font-mono text-zinc-600 select-none py-1 tabular-nums text-right w-4">
        <span>+6</span>
        <span className="text-zinc-400 font-semibold">0</span>
        <span>-6</span>
        <span>-12</span>
        <span>-24</span>
        <span>-∞</span>
      </div>

      {/* Milled Aluminum Fader Track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={volumeToDb(value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        className={`relative w-8 h-full flex items-center justify-center cursor-ns-resize focus:outline-none ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        {/* The center milled slot */}
        <div className="w-1.5 h-full rounded-full bg-[#0a0a0c] border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] relative flex items-center justify-center">
          {/* Zero dB unity marker line */}
          <div
            className="absolute left-[-6px] right-[-6px] h-[1px] bg-white/20"
            style={{ bottom: '80%' }}
            title="0.0 dB unity gain"
          />
        </div>

        {/* Physical Precision Fader Cap */}
        <div
          className="absolute w-8 h-[22px] rounded-[3px] bg-gradient-to-b from-[#3a3a40] via-[#242428] to-[#141416] border-t border-white/30 border-b border-black/80 shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] flex flex-col items-center justify-center pointer-events-none transition-[bottom] duration-75"
          style={{
            bottom: `calc(${capBottomPercent}% - 11px)`,
          }}
        >
          {/* Top grip ridge */}
          <div className="w-5 h-[1px] bg-black/50 mb-0.5" />
          {/* Center hairline indicator */}
          <div
            className="w-full h-[2px] shadow-[0_0_2px_rgba(255,255,255,0.6)]"
            style={{ backgroundColor: accentColor }}
          />
          {/* Bottom grip ridge */}
          <div className="w-5 h-[1px] bg-black/50 mt-0.5" />
        </div>
      </div>
    </div>
  );
}

export function GroovexStemMixer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(STEM_CHANNELS.map((s) => [s.id, s.defaultVolume]))
  );
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [solos, setSolos] = useState<Record<string, boolean>>({});
  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({
    vocals: 0.72,
    drums: 0.88,
    bass: 0.65,
    guitars: 0.62,
    click: 0.48,
  });

  // Animated rhythmic level meters
  useEffect(() => {
    if (!isPlaying) {
      setMeterLevels({ vocals: 0, drums: 0, bass: 0, guitars: 0, click: 0 });
      return;
    }
    const interval = setInterval(() => {
      setMeterLevels({
        vocals: Math.random() * 0.35 + 0.55,
        drums: Math.random() * 0.4 + 0.55,
        bass: Math.random() * 0.3 + 0.5,
        guitars: Math.random() * 0.35 + 0.45,
        click: Math.random() * 0.25 + 0.35,
      });
    }, 140);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleVolumeChange = (id: string, val: number) => {
    setVolumes((prev) => ({ ...prev, [id]: val }));
  };

  const toggleMute = (id: string) => {
    setMutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolo = (id: string) => {
    setSolos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = () => {
    setVolumes(Object.fromEntries(STEM_CHANNELS.map((s) => [s.id, s.defaultVolume])));
    setMutes({});
    setSolos({});
  };

  const anySoloActive = Object.values(solos).some(Boolean);

  return (
    <div className="w-full flex flex-col rounded-xl bg-[#0a0a0d] border border-white/[0.09] p-4 sm:p-5 font-sans select-none shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative">
      {/* Corner hardware chassis screws */}
      <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full border border-white/20 bg-zinc-800" />
      <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full border border-white/20 bg-zinc-800" />
      <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 rounded-full border border-white/20 bg-zinc-800" />
      <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full border border-white/20 bg-zinc-800" />

      {/* Top Console Rack Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.08] px-1">
        {/* Module ID */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#141418] border border-white/10 flex items-center justify-center text-orange-400">
            <GroovexLogo size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                GROOVEX // STEM ENGINE
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>24-BIT / 48kHz</span>
              </span>
            </div>
          </div>
        </div>

        {/* Master Console Transport & Clock */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* BPM display */}
          <div className="px-2.5 py-1 rounded bg-[#121216] border border-white/10 text-zinc-300 text-[11px] tabular-nums">
            <span className="text-zinc-500 mr-1.5">TEMPO</span>
            <span className="text-white font-medium">128.0</span>
            <span className="text-zinc-500 ml-1">BPM</span>
          </div>

          {/* Time Sig */}
          <div className="px-2 py-1 rounded bg-[#121216] border border-white/10 text-zinc-400 text-[11px]">
            4/4 SIG
          </div>

          {/* Play/Pause Transport Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all active:scale-[0.96] cursor-pointer ${
              isPlaying
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-[#18181c] text-white border border-white/15 hover:border-white/30'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          {/* Reset Unity Gain */}
          <button
            type="button"
            onClick={handleReset}
            title="Recall unity gain (0.0 dB)"
            className="p-1.5 rounded bg-[#141418] border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors active:scale-[0.96] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5-Channel Console Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 px-1">
        {STEM_CHANNELS.map((channel) => {
          const vol = volumes[channel.id];
          const isMuted = mutes[channel.id];
          const isSolo = solos[channel.id];
          const isEffectivelyMuted = isMuted || (anySoloActive && !isSolo);
          const rawMeter = isEffectivelyMuted ? 0 : meterLevels[channel.id] * (vol / 100);

          return (
            <div
              key={channel.id}
              className={`flex flex-col rounded-lg p-2.5 border transition-colors duration-150 ${
                isSolo
                  ? 'border-sky-500/50 bg-[#0f1724]'
                  : isEffectivelyMuted
                  ? 'border-white/[0.04] bg-[#0c0c0e]/40 opacity-55'
                  : 'border-white/[0.07] bg-[#111115]/90'
              }`}
            >
              {/* Channel Strip Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: channel.color }}
                  />
                  <span className="font-mono text-[10px] text-zinc-400 truncate tracking-tight font-medium">
                    {channel.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-300 tabular-nums px-1 py-0.2 rounded bg-black/50 border border-white/5 flex-shrink-0">
                  {volumeToDb(vol)}
                </span>
              </div>

              {/* Fader & 12-Segment LED Meter */}
              <div className="flex items-center justify-center gap-2 my-1">
                {/* Precision Console Fader */}
                <ConsoleFader
                  value={vol}
                  onChange={(val) => handleVolumeChange(channel.id, val)}
                  accentColor={channel.color}
                  disabled={isEffectivelyMuted}
                  label={`${channel.name} fader`}
                />

                {/* 12-Segment Precision LED Peak Meter */}
                <div className="w-2.5 h-36 rounded-[2px] bg-[#070709] border border-white/10 p-[1.5px] flex flex-col justify-end gap-[1.5px]">
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const threshold = (14 - idx) / 14;
                    const isLit = rawMeter >= threshold;
                    const isRed = idx < 2;
                    const isYellow = idx >= 2 && idx < 5;
                    const ledColor = isLit
                      ? isRed
                        ? '#ef4444'
                        : isYellow
                        ? '#eab308'
                        : '#10b981'
                      : 'rgba(255, 255, 255, 0.04)';

                    return (
                      <div
                        key={idx}
                        className="w-full h-2 rounded-[1px] transition-colors duration-75"
                        style={{
                          backgroundColor: ledColor,
                          boxShadow: isLit ? `0 0 3px ${ledColor}` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Channel Mute & Solo Micro Switches with Status LEDs */}
              <div className="grid grid-cols-2 gap-1.5 pt-2.5 border-t border-white/[0.06] mt-2">
                {/* Mute Button */}
                <button
                  type="button"
                  onClick={() => toggleMute(channel.id)}
                  aria-pressed={isMuted}
                  className={`relative flex items-center justify-between px-2 py-1 rounded-[3px] font-mono text-[10px] font-bold tracking-wider transition-all active:scale-[0.95] cursor-pointer border ${
                    isMuted
                      ? 'bg-[#1e1010] border-red-500/40 text-red-200'
                      : 'bg-[#16161a] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>M</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isMuted
                        ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.9)]'
                        : 'bg-zinc-700'
                    }`}
                  />
                </button>

                {/* Solo Button */}
                <button
                  type="button"
                  onClick={() => toggleSolo(channel.id)}
                  aria-pressed={isSolo}
                  className={`relative flex items-center justify-between px-2 py-1 rounded-[3px] font-mono text-[10px] font-bold tracking-wider transition-all active:scale-[0.95] cursor-pointer border ${
                    isSolo
                      ? 'bg-[#1e190e] border-amber-500/40 text-amber-200'
                      : 'bg-[#16161a] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>S</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isSolo
                        ? 'bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.9)]'
                        : 'bg-zinc-700'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rack Bottom Status Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 pt-3 mt-3 border-t border-white/[0.06] px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-zinc-400" />
          <span className="tracking-wide">BUS 01–05 ROUTED // ZERO-LATENCY WORKLET ACTIVE</span>
        </div>
        <div className="text-zinc-600">LIVEX AUDIO CORE V4.0</div>
      </div>
    </div>
  );
}

export default GroovexStemMixer;
