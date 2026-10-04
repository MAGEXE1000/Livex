import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useLocalStageSyncStore,
  clampOffsetMs,
  type LocalStageSyncState,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';

export interface StageSyncOffsetCalibrationProps {
  compact?: boolean;
  showPulseTest?: boolean;
  className?: string;
}

export const StageSyncOffsetCalibration: React.FC<StageSyncOffsetCalibrationProps> = ({
  compact = false,
  showPulseTest = true,
  className = '',
}) => {
  const clientOffsetMs = useLocalStageSyncStore((s: LocalStageSyncState) => s.clientOffsetMs);
  const setClientOffset = useLocalStageSyncStore((s: LocalStageSyncState) => s.setClientOffset);
  const lastBeat = useLocalStageSyncStore((s: LocalStageSyncState) => s.lastBeat);
  const isCalibrating = useLocalStageSyncStore((s: LocalStageSyncState) => s.isCalibrating);
  const setIsCalibrating = useLocalStageSyncStore((s: LocalStageSyncState) => s.setIsCalibrating);

  // Pulse animation states
  const [hostPulse, setHostPulse] = useState(false);
  const [localPulse, setLocalPulse] = useState(false);

  // Internal test loop when isCalibrating is active (simulates 120 BPM downbeats if no live room)
  const testLoopTimerRef = useRef<any>(null);
  const localPulseTimeoutRef = useRef<any>(null);

  // Trigger pulse on real incoming beat or simulated beat
  const triggerPulse = useCallback(
    (offset: number) => {
      // Host pulse fires immediately
      setHostPulse(true);
      setTimeout(() => setHostPulse(false), 120);

      // Local pulse fires after the calibrated offset (clamped to min 0 delay for visual test timeout)
      if (localPulseTimeoutRef.current) {
        clearTimeout(localPulseTimeoutRef.current);
      }

      // If offset is positive (local device is behind/slow), local pulse fires later
      // If offset is negative, in a continuous beat loop it would anticipate; for single pulse test
      // we visualize the relative delay offset
      const visualDelay = Math.max(0, 150 + offset);
      localPulseTimeoutRef.current = setTimeout(() => {
        setLocalPulse(true);
        setTimeout(() => setLocalPulse(false), 120);
      }, visualDelay);
    },
    []
  );

  // Listen to store's lastBeat
  useEffect(() => {
    if (lastBeat) {
      triggerPulse(clientOffsetMs);
    }
  }, [lastBeat, clientOffsetMs, triggerPulse]);

  // Test pulse generator loop when calibration test mode is toggled on
  useEffect(() => {
    if (!isCalibrating) {
      if (testLoopTimerRef.current) {
        clearInterval(testLoopTimerRef.current);
        testLoopTimerRef.current = null;
      }
      return;
    }

    // Pulse every 1000ms (60 BPM) for easy visual alignment
    testLoopTimerRef.current = setInterval(() => {
      triggerPulse(clientOffsetMs);
    }, 1000);

    return () => {
      if (testLoopTimerRef.current) {
        clearInterval(testLoopTimerRef.current);
      }
      if (localPulseTimeoutRef.current) {
        clearTimeout(localPulseTimeoutRef.current);
      }
    };
  }, [isCalibrating, clientOffsetMs, triggerPulse]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setClientOffset(clampOffsetMs(val));
  };

  const adjustOffset = (delta: number) => {
    setClientOffset(clampOffsetMs(clientOffsetMs + delta));
  };

  const formattedOffset =
    clientOffsetMs > 0 ? `+${clientOffsetMs} ms` : clientOffsetMs < 0 ? `${clientOffsetMs} ms` : '0 ms';

  return (
    <div
      data-testid="stage-sync-offset-calibration"
      className={`rounded-2xl border border-white/10 bg-black/40 p-4 flex flex-col gap-3.5 ${className}`}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-neutral-300 text-lg">tune</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Stage Sync Delay Calibration
            </h4>
            {!compact && (
              <p className="text-[11px] text-neutral-400">
                Compensate for Bluetooth/headphone latency and stage acoustics
              </p>
            )}
          </div>
        </div>

        {/* Numeric Readout Badge */}
        <div className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white font-mono text-xs font-extrabold tracking-tight">
          {formattedOffset}
        </div>
      </div>

      {/* Slider Controls */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-medium text-neutral-400 px-0.5">
          <span>-250ms (Earlier)</span>
          <span className="text-neutral-500">0ms</span>
          <span>+250ms (Later)</span>
        </div>
        <input
          type="range"
          min={-250}
          max={250}
          step={5}
          value={clientOffsetMs}
          onChange={handleSliderChange}
          aria-label="Stage sync latency offset in milliseconds"
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10 accent-white active:accent-neutral-200 transition-all"
        />
      </div>

      {/* Fine-Tuning & Quick-Preset Steppers */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="offset-minus-5"
            onClick={() => adjustOffset(-5)}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white font-mono text-xs font-bold transition-colors flex items-center justify-center"
            title="Advance 5ms"
          >
            -5ms
          </button>
          <button
            type="button"
            data-testid="offset-minus-1"
            onClick={() => adjustOffset(-1)}
            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-neutral-300 font-mono text-xs font-medium transition-colors flex items-center justify-center"
            title="Advance 1ms"
          >
            -1ms
          </button>
        </div>

        <button
          type="button"
          data-testid="offset-reset"
          onClick={() => setClientOffset(0)}
          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-neutral-300 font-mono text-xs font-semibold transition-colors flex items-center justify-center"
        >
          Reset (0ms)
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="offset-plus-1"
            onClick={() => adjustOffset(1)}
            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-neutral-300 font-mono text-xs font-medium transition-colors flex items-center justify-center"
            title="Delay 1ms"
          >
            +1ms
          </button>
          <button
            type="button"
            data-testid="offset-plus-5"
            onClick={() => adjustOffset(5)}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white font-mono text-xs font-bold transition-colors flex items-center justify-center"
            title="Delay 5ms"
          >
            +5ms
          </button>
        </div>
      </div>

      {/* Visual Metronome Sync Blink Test */}
      {showPulseTest && (
        <div className="mt-1 pt-3 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-300">
              Visual Alignment Beat Test
            </span>
            <button
              type="button"
              data-testid="toggle-calibration-test"
              onClick={() => setIsCalibrating(!isCalibrating)}
              className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 border ${
                isCalibrating
                  ? 'bg-white text-black border-white'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
              }`}
            >
              <span className="material-symbols-rounded text-sm">
                {isCalibrating ? 'pause' : 'play_arrow'}
              </span>
              <span>{isCalibrating ? 'Stop Test' : 'Start Test Pulse'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Host Reference Pulse */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full transition-all duration-75 shrink-0 ${
                  hostPulse
                    ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] scale-110'
                    : 'bg-white/20 scale-95'
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10.5px] font-bold text-white truncate">
                  Host Reference
                </span>
                <span className="text-[9.5px] font-mono text-neutral-400">0ms Downbeat</span>
              </div>
            </div>

            {/* Local Calibrated Pulse */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full transition-all duration-75 shrink-0 ${
                  localPulse
                    ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] scale-110'
                    : 'bg-white/20 scale-95'
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10.5px] font-bold text-white truncate">
                  Local Output
                </span>
                <span className="text-[9.5px] font-mono text-neutral-400">
                  {formattedOffset}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
