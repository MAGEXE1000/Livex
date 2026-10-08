import React, { useState, useEffect } from 'react';
import { Radio, Wifi, LogOut, Sliders, ChevronDown, ChevronUp, Music } from 'lucide-react';
import {
  useLocalStageSyncStore,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { StageSyncOffsetCalibration } from '../chordex/components/StageSyncOffsetCalibration';

export interface GuestWaitingRoomViewProps {
  className?: string;
  onLeave?: () => void;
}

export const GuestWaitingRoomView: React.FC<GuestWaitingRoomViewProps> = ({
  className = '',
  onLeave,
}) => {
  const role = useLocalStageSyncStore((s) => s.role);
  const room = useLocalStageSyncStore((s) => s.room);
  const estimatedLatencyMs = useLocalStageSyncStore((s) => s.estimatedLatencyMs);
  const clientOffsetMs = useLocalStageSyncStore((s) => s.clientOffsetMs);
  const leaveRoom = useLocalStageSyncStore((s) => s.leaveRoom);

  const [showCalibration, setShowCalibration] = useState(false);

  // Auto-navigate when host selects a song
  useEffect(() => {
    if (role === 'follower' && room?.status === 'IN_SESSION' && room.activeSongId) {
      try {
        NavigationDispatcher.push({ app: 'chordex', page: 'songs', id: room.activeSongId });
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('livex:open-live-spectator', {
            detail: {
              songId: room.activeSongId,
              songTitle: room.activeSongTitle,
              songPayload: room.songPayload,
            },
          })
        );
      }
    }
  }, [role, room?.status, room?.activeSongId, room?.activeSongTitle, room?.songPayload]);

  if (role !== 'follower' || !room || (room.status === 'IN_SESSION' && room.activeSongId)) {
    return null;
  }

  const handleLeaveRoom = () => {
    leaveRoom();
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div
      data-testid="guest-waiting-room-view"
      role="region"
      aria-label="Stage Session Waiting Room"
      className={`fixed inset-0 z-[100000] flex flex-col justify-between p-6 bg-black text-white select-none animate-in fade-in duration-300 ${className}`}
    >
      {/* ── TOP HEADER ── */}
      <div className="w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {/* Active status pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </div>

          {/* Latency badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-mono">
            <Wifi className="w-3 h-3 text-neutral-400" />
            <span>{estimatedLatencyMs}ms</span>
          </div>
        </div>

        {/* Room Code Badge */}
        <div
          data-testid="waiting-room-code-badge"
          className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 font-mono text-sm font-extrabold tracking-widest text-white shadow-lg shadow-white/5"
        >
          {room.roomId}
        </div>
      </div>

      {/* ── CENTER BROADCAST RADAR & WAITING NOTICE ── */}
      <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto gap-6">
        {/* Pulsing Activity Radar */}
        <div className="relative flex items-center justify-center w-36 h-36">
          {/* Outer radar pulse 1 */}
          <div className="absolute inset-0 rounded-full bg-cyan-500/10 border border-cyan-500/20 animate-ping opacity-60 duration-1000" />

          {/* Outer radar pulse 2 */}
          <div className="absolute w-28 h-28 rounded-full bg-cyan-500/15 border border-cyan-500/30 animate-pulse duration-700" />

          {/* Inner core */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400/40 shadow-xl shadow-cyan-500/20 flex items-center justify-center text-cyan-300">
            <Radio className="w-9 h-9 animate-bounce duration-1000 text-cyan-400" />
          </div>
        </div>

        {/* Host identification */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium">
          <span className="text-neutral-500">Host:</span>
          <span className="text-white font-semibold">{room.hostName || 'Stage Host'}</span>
        </div>

        {/* Informative Waiting Message */}
        <div className="flex flex-col gap-2">
          <h1
            data-testid="waiting-for-song-text"
            className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug"
          >
            Waiting for session leader to select a song...
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed px-4">
            Your screen will automatically transition into live chords and teleprompter lyrics the moment playback begins.
          </p>
        </div>

        {/* Offset info indicator */}
        {clientOffsetMs !== 0 && (
          <div className="text-[11px] font-mono text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
            Acoustic Offset: {clientOffsetMs > 0 ? `+${clientOffsetMs}ms` : `${clientOffsetMs}ms`}
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS & CALIBRATION ── */}
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 pb-2">
        {/* Toggleable Offset Calibration */}
        {showCalibration ? (
          <div className="w-full p-4 rounded-2xl bg-[#0e121a] border border-white/15 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Acoustic Latency Calibration
              </span>
              <button
                type="button"
                onClick={() => setShowCalibration(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <StageSyncOffsetCalibration compact={true} showPulseTest={true} />
          </div>
        ) : (
          <button
            type="button"
            data-testid="btn-toggle-waiting-calibration"
            onClick={() => setShowCalibration(true)}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-2 transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <span>Calibrate Latency Offset</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        )}

        {/* Leave Room Button */}
        <button
          type="button"
          data-testid="btn-leave-waiting-room"
          onClick={handleLeaveRoom}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-98 border border-red-500/25 text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Stage Room</span>
        </button>
      </div>
    </div>
  );
};
export default GuestWaitingRoomView;
