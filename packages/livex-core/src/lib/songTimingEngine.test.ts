import { describe, it, expect } from 'vitest';
import { calculateSongTimingSchedule } from './songTimingEngine';
import { SongPreset } from '../index'; // Need correct imports

describe('songTimingEngine pacing', () => {
  it('Venezia pacing', () => {
    // 172 BPM, 4/4, Intro barsPerLine 4 with 2 lines, Verse barsPerLine 1 with 2 lines
    // 60000 / 172 = 348.837 ms per beat
    // 4/4 = 4 beats per bar
    // 4 bars = 16 beats = 5581.39 ms
    // 1 bar = 4 beats = 1395.35 ms
    const preset = {
      bpm: 172,
      lyrics: {
        sections: [
          {
            type: 'intro',
            barsPerLine: 4,
            lines: [
              { id: '1', text: 'Intro 1' },
              { id: '2', text: 'Intro 2' }
            ]
          },
          {
            type: 'verse',
            barsPerLine: 1,
            lines: [
              { id: '3', text: 'Verse 1' },
              { id: '4', text: 'Verse 2' }
            ]
          }
        ]
      }
    };
    
    // We mock calculateSongTimingSchedule output or just call it if it exists.
    // Given the prompt, calculateSongTimingSchedule is already there.
    const schedule = calculateSongTimingSchedule(preset as any, { bpmOverride: 172, timeSignature: { numerator: 4, denominator: 4 } as any });
    
    expect(schedule.lines[0].durationMs).toBeCloseTo(5581.4, 0);
    expect(schedule.lines[1].durationMs).toBeCloseTo(5581.4, 0);
    expect(schedule.lines[2].durationMs).toBeCloseTo(1395.3, 0);
    expect(schedule.lines[3].durationMs).toBeCloseTo(1395.3, 0);
  });
});
