import { describe, it, expect } from 'vitest';
import {
  calculateSongTimingSchedule,
  findActiveScheduleItem,
  formatDurationMmSs,
  parseDurationMmSs,
} from './songTimingEngine';
import type { SongPreset } from '../store/slices/songSlice';

describe('SongTimingEngine Verification Suite', () => {
  const mockSong: SongPreset = {
    id: 'test-song-timing',
    name: 'Live Performance Anthem',
    artist: 'Antigravity Studio',
    bpm: 120,
    key: 'G',
    notes: 'Test notes',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    chords: ['G', 'C', 'D', 'Em'],
    sections: [
      { id: 's1', name: 'Verse 1', chords: ['G', 'Em', 'C', 'D'] },
      { id: 's2', name: 'Chorus', chords: ['C', 'D', 'G', 'Em'] },
    ],
    lyrics: {
      version: 1,
      defaultVocalRole: { type: 'lead', label: 'Lead' },
      sections: [
        {
          id: 'sec-intro',
          name: 'Intro',
          type: 'intro',
          lines: [
            {
              id: 'l1',
              text: 'Here we stand in the light',
              chords: [{ id: 'c1', chord: 'G', offset: 0 }, { id: 'c2', chord: 'Em', offset: 12 }],
            },
          ],
        },
        {
          id: 'sec-verse',
          name: 'Verse 1',
          type: 'verse',
          lines: [
            {
              id: 'l2',
              text: 'Every note playing true to the rhythm',
              chords: [{ id: 'c3', chord: 'C', offset: 0 }, { id: 'c4', chord: 'D', offset: 15 }],
            },
            {
              id: 'l3',
              text: 'Lifting up every voice in the room',
              chords: [{ id: 'c5', chord: 'G', offset: 0 }],
            },
          ],
        },
        {
          id: 'sec-chorus',
          name: 'Chorus',
          type: 'chorus',
          lines: [
            {
              id: 'l4',
              text: 'Shine forever, boundless melody',
              chords: [{ id: 'c6', chord: 'C', offset: 0 }, { id: 'c7', chord: 'D', offset: 14 }],
            },
            {
              id: 'l5',
              text: 'Singing out loud across the stage tonight',
              chords: [{ id: 'c8', chord: 'G', offset: 0 }, { id: 'c9', chord: 'Em', offset: 16 }],
            },
          ],
        },
      ],
    },
  };

  it('Duration Unset: matches nominal duration derived from BPM', () => {
    const schedule = calculateSongTimingSchedule(mockSong);
    expect(schedule.isDurationPaced).toBe(false);
    expect(schedule.pacingFactor).toBe(1.0);
    expect(schedule.effectiveBpm).toBe(120);
    expect(schedule.effectiveDurationMs).toBe(schedule.totalNominalDurationMs);
    expect(schedule.lines[0].startTimeMs).toBe(0);
    expect(schedule.lines[schedule.lines.length - 1].endTimeMs).toBe(schedule.effectiveDurationMs);
  });

  it('Target Duration = 2:00 (120s): exact total duration, first item t=0, proportional scaling', () => {
    const schedule = calculateSongTimingSchedule(mockSong, { targetDurationOverride: 120 });
    expect(schedule.isDurationPaced).toBe(true);
    expect(schedule.effectiveDurationMs).toBe(120000);
    expect(schedule.totalTargetDurationMs).toBe(120000);

    // Invariant 1: First event starts at 0
    expect(schedule.lines[0].startTimeMs).toBe(0);
    expect(schedule.sections[0].startTimeMs).toBe(0);

    // Invariant 2: Final event ends at exact target duration
    expect(schedule.lines[schedule.lines.length - 1].endTimeMs).toBe(120000);
    expect(schedule.sections[schedule.sections.length - 1].endTimeMs).toBe(120000);

    // Invariant 3: Line durations sum to total target duration
    const lineSum = schedule.lines.reduce((acc, l) => acc + l.durationMs, 0);
    expect(lineSum).toBe(120000);
  });

  it('Target Duration = 4:00 (240s): doubles interval lengths relative to 2:00', () => {
    const s120 = calculateSongTimingSchedule(mockSong, { targetDurationOverride: 120 });
    const s240 = calculateSongTimingSchedule(mockSong, { targetDurationOverride: 240 });

    expect(s240.effectiveDurationMs).toBe(240000);
    expect(s240.pacingFactor).toBeCloseTo(s120.pacingFactor * 2, 2);
    expect(s240.lines[s240.lines.length - 1].endTimeMs).toBe(240000);

    // Each line in 4:00 should be roughly double line in 2:00
    for (let i = 0; i < s120.lines.length; i++) {
      expect(s240.lines[i].durationMs).toBeCloseTo(s120.lines[i].durationMs * 2, -1);
    }
  });

  it('Target Duration = 5:00 (300s): intervals scale accordingly and end at 300,000 ms', () => {
    const schedule = calculateSongTimingSchedule(mockSong, { targetDurationOverride: 300 });
    expect(schedule.effectiveDurationMs).toBe(300000);
    expect(schedule.lines[0].startTimeMs).toBe(0);
    expect(schedule.lines[schedule.lines.length - 1].endTimeMs).toBe(300000);
  });

  it('BPM change with fixed Target Duration: preserves duration and adjusts relative pacing', () => {
    const sBpm100 = calculateSongTimingSchedule(mockSong, { bpmOverride: 100, targetDurationOverride: 180 });
    const sBpm140 = calculateSongTimingSchedule(mockSong, { bpmOverride: 140, targetDurationOverride: 180 });

    // Both remain locked to configured 180s duration
    expect(sBpm100.effectiveDurationMs).toBe(180000);
    expect(sBpm140.effectiveDurationMs).toBe(180000);

    expect(sBpm100.lines[sBpm100.lines.length - 1].endTimeMs).toBe(180000);
    expect(sBpm140.lines[sBpm140.lines.length - 1].endTimeMs).toBe(180000);
  });

  it('findActiveScheduleItem accurately resolves active element over monotonic time', () => {
    const schedule = calculateSongTimingSchedule(mockSong, { targetDurationOverride: 120 });

    // At t=0 -> Line 0
    const at0 = findActiveScheduleItem(schedule.lines, 0);
    expect(at0.index).toBe(0);
    expect(at0.activeItem?.id).toBe('l1');

    // At middle of Line 1
    const l1Mid = schedule.lines[1].startTimeMs + Math.round(schedule.lines[1].durationMs / 2);
    const atL1 = findActiveScheduleItem(schedule.lines, l1Mid);
    expect(atL1.index).toBe(1);
    expect(atL1.activeItem?.id).toBe('l2');

    // At end of song
    const atEnd = findActiveScheduleItem(schedule.lines, 120000);
    expect(atEnd.index).toBe(schedule.lines.length - 1);
  });

  it('formatDurationMmSs and parseDurationMmSs handle conversions seamlessly', () => {
    expect(formatDurationMmSs(120)).toBe('2:00');
    expect(formatDurationMmSs(155)).toBe('2:35');
    expect(formatDurationMmSs(240)).toBe('4:00');
    expect(formatDurationMmSs(0)).toBe('0:00');

    expect(parseDurationMmSs('2:30')).toBe(150);
    expect(parseDurationMmSs('4:00')).toBe(240);
    expect(parseDurationMmSs('120')).toBe(120);
    expect(parseDurationMmSs('')).toBeNull();
  });
});
