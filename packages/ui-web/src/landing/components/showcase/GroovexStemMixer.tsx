import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, SlidersHorizontal } from 'lucide-react';
import { GroovexLogo } from '@workspace/ui-shared';

interface StemChannel {
  id: string;
  name: string;
  color: string;
  defaultVolume: number;
}

const STEM_CHANNELS: StemChannel[] = [
  { id: 'vocals', name: 'Lead Vocals', color: '#38bdf8', defaultVolume: 82 },
  { id: 'drums', name: 'Acoustic Drums', color: '#f59e0b', defaultVolume: 88 },
  { id: 'bass', name: 'Electric Bass', color: '#10b981', defaultVolume: 78 },
  { id: 'guitars', name: 'Guitar Stems', color: '#a855f7', defaultVolume: 74 },
  { id: 'click', name: 'Click & Cues', color: '#ec4899', defaultVolume: 65 },
];

function volumeToDb(v: number): string {
  if (v <= 0) return '-inf dB';
  if (v === 80) return '0.0 dB';
  const diff = (v - 80) / 10;
  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} dB`;
}

export function GroovexStemMixer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(STEM_CHANNELS.map((s) => [s.id, s.defaultVolume]))
  );
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [solos, setSolos] = useState<Record<string, boolean>>({});
  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({
    vocals: 0.7,
    drums: 0.85,
    bass: 0.65,
    guitars: 0.6,
    click: 0.45,
  });

  // Animated rhythmic level meters
  useEffect(() => {
    if (!isPlaying) {
      setMeterLevels({ vocals: 0, drums: 0, bass: 0, guitars: 0, click: 0 });
      return;
    }
    const interval = setInterval(() => {
      setMeterLevels({
        vocals: Math.random() * 0.4 + 0.5,
        drums: Math.random() * 0.5 + 0.45,
        bass: Math.random() * 0.35 + 0.55,
        guitars: Math.random() * 0.4 + 0.45,
        click: Math.random() * 0.3 + 0.3,
      });
    }, 180);
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
    <div className="w-full flex flex-col rounded-2xl bg-[#09090b] border border-white/10 p-5 font-sans select-none shadow-2xl">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <GroovexLogo size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Groovex Stem Mixer</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                DSP Engine Live
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Low-latency multitrack rehearsal isolation</p>
          </div>
        </div>

        {/* Master Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isPlaying
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Stems'}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset faders"
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mixer Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        {STEM_CHANNELS.map((channel) => {
          const vol = volumes[channel.id];
          const isMuted = mutes[channel.id];
          const isSolo = solos[channel.id];
          const isEffectivelyMuted = isMuted || (anySoloActive && !isSolo);
          const rawMeter = isEffectivelyMuted ? 0 : meterLevels[channel.id] * (vol / 100);

          return (
            <div
              key={channel.id}
              className={`flex flex-col rounded-xl p-3 border transition-all duration-200 ${
                isSolo
                  ? 'border-sky-500/40 bg-sky-950/20'
                  : isEffectivelyMuted
                  ? 'border-white/5 bg-zinc-950/30 opacity-60'
                  : 'border-white/10 bg-zinc-900/50'
              }`}
            >
              {/* Channel Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-200 truncate">{channel.name}</span>
                <span className="text-[10px] font-mono text-zinc-400">{volumeToDb(vol)}</span>
              </div>

              {/* Fader & Meter Container */}
              <div className="flex items-center gap-3 my-2 h-36">
                {/* Vertical Slider */}
                <div className="relative flex-1 h-full flex items-center justify-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vol}
                    onChange={(e) => handleVolumeChange(channel.id, Number(e.target.value))}
                    className="w-full h-1 appearance-none bg-zinc-800 rounded-lg cursor-pointer accent-white"
                    style={{
                      transform: 'rotate(-90deg)',
                      width: '120px',
                    }}
                  />
                </div>

                {/* LED VU Meter Bar */}
                <div className="w-3 h-full rounded-sm bg-black border border-white/10 p-0.5 flex flex-col justify-end gap-0.5">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const threshold = (12 - idx) / 12;
                    const isLit = rawMeter >= threshold;
                    const isRed = idx < 2;
                    const isYellow = idx >= 2 && idx < 5;
                    const color = isLit
                      ? isRed
                        ? '#ef4444'
                        : isYellow
                        ? '#eab308'
                        : '#22c55e'
                      : 'rgba(255, 255, 255, 0.05)';

                    return (
                      <div
                        key={idx}
                        className="w-full h-1.5 rounded-[1px] transition-colors duration-100"
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Mute & Solo Buttons */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 mt-auto">
                <button
                  type="button"
                  onClick={() => toggleMute(channel.id)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => toggleSolo(channel.id)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    isSolo
                      ? 'bg-sky-400 text-black shadow-xs'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Track Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 mt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <span>Interactive WebAssembly audio routing • 5 lossless tracks</span>
        </div>
        <div className="font-mono text-zinc-400">128 BPM • 4/4 Time Signature</div>
      </div>
    </div>
  );
}

export default GroovexStemMixer;
