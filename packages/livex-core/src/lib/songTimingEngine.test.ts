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

  describe('Phase 2: Explicit/Fixed Duration Interludes', () => {
    it('preserves exact interlude duration regardless of pacing/BPM', () => {
      const presetWithInterlude = {
        ...mockSong,
        targetDurationSeconds: 120, // paced to 120s
        bpm: 60, // base bpm
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-1',
              type: 'verse',
              name: 'Verse 1',
              lines: [
                { id: 'l1', text: 'Normal line 1' },
              ]
            },
            {
              id: 'sec-2',
              type: 'interlude',
              name: 'Guitar Solo',
              lines: [
                { id: 'l-interlude', text: '(Solo)', type: 'interlude', explicitDurationMs: 15000 }
              ]
            },
            {
              id: 'sec-3',
              type: 'verse',
              name: 'Verse 2',
              lines: [
                { id: 'l2', text: 'Normal line 2' },
              ]
            }
          ]
        }
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(presetWithInterlude);
      
      const interludeLine = schedule.lines.find(l => l.id === 'l-interlude');
      expect(interludeLine).toBeDefined();
      expect(interludeLine!.isFixedDuration).toBe(true);
      expect(interludeLine!.nominalDurationMs).toBe(15000);
      expect(interludeLine!.durationMs).toBe(15000); // must not be scaled!

      const interludeWord = schedule.words.find(w => w.sectionId === 'sec-2');
      expect(interludeWord).toBeDefined();
      expect(interludeWord!.isFixedDuration).toBe(true);
      expect(interludeWord!.durationMs).toBe(15000);

      // Total target duration should still be respected overall
      expect(schedule.totalTargetDurationMs).toBe(120000);
      expect(schedule.effectiveDurationMs).toBe(120000);

      // Section 2 duration should exactly match the line inside
      const sec2 = schedule.sections.find(s => s.id === 'sec-2');
      expect(sec2!.durationMs).toBe(15000);
    });

    it('stays constant at different BPMs', () => {
      const presetWithInterlude = {
        ...mockSong,
        targetDurationSeconds: 120,
        bpm: 180, // high bpm
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-1',
              type: 'interlude',
              name: 'Guitar Solo',
              lines: [
                { id: 'l-interlude', text: '(Solo)', type: 'interlude', explicitDurationMs: 25000 }
              ]
            }
          ]
        }
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(presetWithInterlude);
      const interludeLine = schedule.lines.find(l => l.id === 'l-interlude');
      expect(interludeLine!.durationMs).toBe(25000);
    });

    it('interlude at beginning of song starts at t=0 and ends at exact duration', () => {
      const preset = {
        ...mockSong,
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-start',
              type: 'interlude',
              name: 'Intro Solo',
              lines: [{ id: 'l-intro-solo', text: '(Intro Solo)', type: 'interlude', explicitDurationMs: 15000 }],
            },
            {
              id: 'sec-v1',
              type: 'verse',
              name: 'Verse 1',
              lines: [{ id: 'l-v1', text: 'First sung line' }],
            },
          ],
        },
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(preset);
      expect(schedule.lines[0].startTimeMs).toBe(0);
      expect(schedule.lines[0].durationMs).toBe(15000);
      expect(schedule.lines[0].endTimeMs).toBe(15000);
      expect(schedule.lines[1].startTimeMs).toBe(15000);
    });

    it('interlude at end of song concludes exactly at total duration', () => {
      const preset = {
        ...mockSong,
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-v1',
              type: 'verse',
              name: 'Verse 1',
              lines: [{ id: 'l-v1', text: 'Last sung line' }],
            },
            {
              id: 'sec-outro',
              type: 'interlude',
              name: 'Outro Jam',
              lines: [{ id: 'l-outro', text: '(Outro Jam)', type: 'interlude', explicitDurationMs: 12000 }],
            },
          ],
        },
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(preset);
      const lastLine = schedule.lines[schedule.lines.length - 1];
      expect(lastLine.id).toBe('l-outro');
      expect(lastLine.durationMs).toBe(12000);
      expect(lastLine.endTimeMs).toBe(schedule.effectiveDurationMs);
    });

    it('multiple consecutive silence events execute independently', () => {
      const preset = {
        ...mockSong,
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-interludes',
              type: 'interlude',
              name: 'Instrumental Break',
              lines: [
                { id: 'solo-1', text: '(Guitar Solo)', type: 'interlude', explicitDurationMs: 15000 },
                { id: 'solo-2', text: '(Keyboard Solo)', type: 'interlude', explicitDurationMs: 8000 },
              ],
            },
          ],
        },
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(preset);
      expect(schedule.lines[0].id).toBe('solo-1');
      expect(schedule.lines[0].startTimeMs).toBe(0);
      expect(schedule.lines[0].durationMs).toBe(15000);
      expect(schedule.lines[0].endTimeMs).toBe(15000);

      expect(schedule.lines[1].id).toBe('solo-2');
      expect(schedule.lines[1].startTimeMs).toBe(15000);
      expect(schedule.lines[1].durationMs).toBe(8000);
      expect(schedule.lines[1].endTimeMs).toBe(23000);
    });

    it('handles zero and missing duration safely without throwing or NaN', () => {
      const preset = {
        ...mockSong,
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-zero',
              type: 'interlude',
              name: 'Zero Interlude',
              lines: [
                { id: 'zero-1', text: '(Zero Solo)', type: 'interlude', explicitDurationMs: 0 },
                { id: 'undef-1', text: '(Undefined Solo)', type: 'interlude' },
              ],
            },
          ],
        },
      } as unknown as SongPreset;

      const schedule = calculateSongTimingSchedule(preset);
      expect(schedule.lines[0].durationMs).toBe(0);
      expect(schedule.lines[1].durationMs).toBe(0);
      expect(isNaN(schedule.lines[0].startTimeMs)).toBe(false);
      expect(isNaN(schedule.lines[1].startTimeMs)).toBe(false);
      expect(isNaN(schedule.effectiveDurationMs)).toBe(false);
    });

    it('surrounding normal lyrics preserve timing ratio when silence duration changes', () => {
      const createPreset = (dur: number) => ({
        ...mockSong,
        bpm: 120,
        lyrics: {
          version: 1,
          sections: [
            { id: 'sec-v1', type: 'verse', name: 'Verse 1', lines: [{ id: 'l1', text: 'Line before' }] },
            { id: 'sec-solo', type: 'interlude', name: 'Solo', lines: [{ id: 'solo', text: '(Solo)', type: 'interlude', explicitDurationMs: dur }] },
            { id: 'sec-v2', type: 'verse', name: 'Verse 2', lines: [{ id: 'l2', text: 'Line after' }] },
          ],
        },
      } as unknown as SongPreset);

      const s10 = calculateSongTimingSchedule(createPreset(10000));
      const s20 = calculateSongTimingSchedule(createPreset(20000));

      // Normal lines before have identical duration
      expect(s10.lines[0].durationMs).toBe(s20.lines[0].durationMs);
      // Normal lines after have identical duration
      expect(s10.lines[2].durationMs).toBe(s20.lines[2].durationMs);
      // Only the interlude duration changes
      expect(s10.lines[1].durationMs).toBe(10000);
      expect(s20.lines[1].durationMs).toBe(20000);
    });
  });

  describe('Teleprompter Speed & Duration Redesign', () => {
    it('supports speed exceeding 300 without artificial clamping', () => {
      const schedule300 = calculateSongTimingSchedule(mockSong, { speedOverride: 300 });
      const schedule600 = calculateSongTimingSchedule(mockSong, { speedOverride: 600 });
      const schedule900 = calculateSongTimingSchedule(mockSong, { speedOverride: 900 });

      expect(schedule300.referenceSpeed).toBe(300);
      expect(schedule600.referenceSpeed).toBe(600);
      expect(schedule900.referenceSpeed).toBe(900);

      // Speed 600 should advance lines in half the time of Speed 300
      expect(schedule600.lines[0].durationMs).toBe(Math.round(schedule300.lines[0].durationMs / 2));
      expect(schedule600.effectiveDurationMs).toBeLessThan(schedule300.effectiveDurationMs);
      expect(schedule900.effectiveDurationMs).toBeLessThan(schedule600.effectiveDurationMs);
    });

    it('parseDurationMmSs handles both colon (:) and dot (.) notations', () => {
      expect(parseDurationMmSs('3:45')).toBe(225);
      expect(parseDurationMmSs('3.45')).toBe(225);
      expect(parseDurationMmSs('0:30')).toBe(30);
      expect(parseDurationMmSs('0.30')).toBe(30);
      expect(parseDurationMmSs('4:00')).toBe(240);
      expect(parseDurationMmSs('4.00')).toBe(240);
      expect(parseDurationMmSs('225')).toBe(225);
    });

    it('preset with speed property uses speed directly', () => {
      const songWithSpeed: SongPreset = {
        ...mockSong,
        speed: 450,
      };
      const schedule = calculateSongTimingSchedule(songWithSpeed);
      expect(schedule.referenceSpeed).toBe(450);
      expect(schedule.effectiveSpeed).toBe(450);
    });

    it('targetDurationOverride: undefined explicitly clears preset targetDurationSeconds and restores speed scaling', () => {
      const songWithDuration: SongPreset = {
        ...mockSong,
        targetDurationSeconds: 180,
      };

      // When target duration is locked, speed changes do not scale duration
      const lockedSpeed60 = calculateSongTimingSchedule(songWithDuration, { speedOverride: 60 });
      const lockedSpeed240 = calculateSongTimingSchedule(songWithDuration, { speedOverride: 240 });
      expect(lockedSpeed60.effectiveDurationMs).toBe(180000);
      expect(lockedSpeed240.effectiveDurationMs).toBe(180000);

      // When explicitly cleared via targetDurationOverride: undefined, speed directly drives progression
      const unlockedSpeed60 = calculateSongTimingSchedule(songWithDuration, {
        speedOverride: 60,
        targetDurationOverride: undefined,
      });
      const unlockedSpeed240 = calculateSongTimingSchedule(songWithDuration, {
        speedOverride: 240,
        targetDurationOverride: undefined,
      });

      // Speed 240 is 4x faster than Speed 60
      expect(unlockedSpeed240.lines[0].durationMs).toBe(Math.round(unlockedSpeed60.lines[0].durationMs / 4));
      expect(unlockedSpeed240.chords[0].durationMs).toBe(Math.round(unlockedSpeed60.chords[0].durationMs / 4));
      expect(unlockedSpeed240.effectiveDurationMs).toBe(Math.round(unlockedSpeed60.effectiveDurationMs / 4));
    });

    it('8-beat musical measure standard: lines advance strictly every 8 beats (2 bars) by default', () => {
      const songWithoutTarget: SongPreset = {
        ...mockSong,
        targetDurationSeconds: undefined,
      };

      // 192 BPM: 8 * (60,000 / 192) = 2,500ms = 2.50s per line
      const sched192 = calculateSongTimingSchedule(songWithoutTarget, { bpmOverride: 192, targetDurationOverride: undefined });
      expect(sched192.lines[0].durationMs).toBe(2500);

      // 152 BPM: 8 * (60,000 / 152) = 3157.89ms -> 3158ms (~3.15s) per line
      const sched152 = calculateSongTimingSchedule(songWithoutTarget, { bpmOverride: 152, targetDurationOverride: undefined });
      expect(sched152.lines[0].durationMs).toBe(3158);

      // 120 BPM: 8 * (60,000 / 120) = 4,000ms = 4.00s per line
      const sched120 = calculateSongTimingSchedule(songWithoutTarget, { bpmOverride: 120, targetDurationOverride: undefined });
      expect(sched120.lines[0].durationMs).toBe(4000);
    });
  });
});

