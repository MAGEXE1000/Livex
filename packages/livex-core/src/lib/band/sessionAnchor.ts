import type { PlaybackPositionAnchor } from '../../types/band';
import type { SongTimingSchedule } from '../songTimingEngine';

export interface ResolvedPlaybackPosition {
  positionMs: number;
  lineIndex: number;
  lineProgressMs: number;
  totalLineDurationMs: number;
  isCompleted: boolean;
  isInLeadIn: boolean;
}

/**
 * Computes the elapsed playback position in milliseconds from a leader's position anchor.
 *
 * If playing: positionMs advances with (currentServerTimeMs - anchor.serverTimeMs).
 * If paused or stopped: positionMs remains fixed at anchor.positionMs.
 */
export function computeCurrentPlaybackPositionMs(
  anchor: PlaybackPositionAnchor,
  status: 'playing' | 'paused' | 'stopped',
  currentServerTimeMs: number
): number {
  if (status === 'paused' || status === 'stopped') {
    return Math.max(0, anchor.positionMs);
  }

  const elapsedSinceAnchor = currentServerTimeMs - anchor.serverTimeMs;
  return Math.max(0, anchor.positionMs + elapsedSinceAnchor);
}

/**
 * Resolves a global playback position in milliseconds into exact line, beat, and progress
 * within a song's timing schedule.
 */
export function resolveSchedulePosition(
  schedule: SongTimingSchedule | null | undefined,
  positionMs: number
): ResolvedPlaybackPosition {
  if (!schedule || !schedule.lines || schedule.lines.length === 0) {
    return {
      positionMs,
      lineIndex: 0,
      lineProgressMs: 0,
      totalLineDurationMs: 0,
      isCompleted: false,
      isInLeadIn: positionMs < 0,
    };
  }

  // Handle lead-in / negative position
  if (positionMs < 0) {
    return {
      positionMs,
      lineIndex: 0,
      lineProgressMs: 0,
      totalLineDurationMs: schedule.lines[0]?.durationMs || 0,
      isCompleted: false,
      isInLeadIn: true,
    };
  }

  let accumulatedMs = 0;
  for (let i = 0; i < schedule.lines.length; i++) {
    const line = schedule.lines[i];
    const duration = Math.max(1, line.durationMs);

    if (positionMs < accumulatedMs + duration) {
      return {
        positionMs,
        lineIndex: i,
        lineProgressMs: positionMs - accumulatedMs,
        totalLineDurationMs: duration,
        isCompleted: false,
        isInLeadIn: false,
      };
    }
    accumulatedMs += duration;
  }

  // If past the end of the song
  const lastIdx = schedule.lines.length - 1;
  const lastLine = schedule.lines[lastIdx];
  return {
    positionMs,
    lineIndex: lastIdx,
    lineProgressMs: lastLine?.durationMs || 0,
    totalLineDurationMs: lastLine?.durationMs || 0,
    isCompleted: true,
    isInLeadIn: false,
  };
}

/**
 * Calculates a future scheduled start anchor with a lookahead buffer (e.g. 1200ms)
 * to absorb network transit latency.
 */
export function createScheduledPlayAnchor(
  currentPositionMs: number,
  nowServerTimeMs: number = Date.now(),
  leadTimeMs: number = 1200
): { anchor: PlaybackPositionAnchor; scheduledStartServerTimeMs: number } {
  const scheduledStartServerTimeMs = nowServerTimeMs + leadTimeMs;
  return {
    anchor: {
      positionMs: currentPositionMs,
      serverTimeMs: scheduledStartServerTimeMs,
    },
    scheduledStartServerTimeMs,
  };
}
