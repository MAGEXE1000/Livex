import { describe, it, expect } from 'vitest';
import { resolveLineBars, mapSongBeatToLine } from './pacing';
import { type SongLyricLine, type SongLyricSection } from '../../types/lyrics';

describe('pacing helpers', () => {
  const introSec: SongLyricSection = {
    id: 'intro',
    type: 'intro',
    name: 'Intro',
    barsPerLine: 4,
    lines: [
      { id: 'l1', text: 'line 0' },
      { id: 'l2', text: 'line 1' },
    ] as SongLyricLine[],
  };

  const verseSec: SongLyricSection = {
    id: 'verse',
    type: 'verse',
    name: 'Verse',
    lines: [
      { id: 'v1', text: 'line 2', bars: 1 },
      { id: 'v2', text: 'line 3', bars: 1 },
    ] as SongLyricLine[],
  };

  const sections = [introSec, verseSec];

  it('Venezia case: intro 2 lines x4 bars, verse lines x1 bar, 4/4', () => {
    // intro: line0 (0-15), line1 (16-31)
    // verse: line2 (32-35), line3 (36-39)

    expect(mapSongBeatToLine(0, sections, 2, 4)).toEqual({ lineIndex: 0, beatInLine: 0, totalLineBeats: 16 });
    expect(mapSongBeatToLine(15, sections, 2, 4)).toEqual({ lineIndex: 0, beatInLine: 15, totalLineBeats: 16 });
    
    expect(mapSongBeatToLine(16, sections, 2, 4)).toEqual({ lineIndex: 1, beatInLine: 0, totalLineBeats: 16 });
    expect(mapSongBeatToLine(31, sections, 2, 4)).toEqual({ lineIndex: 1, beatInLine: 15, totalLineBeats: 16 });
    
    expect(mapSongBeatToLine(32, sections, 2, 4)).toEqual({ lineIndex: 2, beatInLine: 0, totalLineBeats: 4 });
    expect(mapSongBeatToLine(35, sections, 2, 4)).toEqual({ lineIndex: 2, beatInLine: 3, totalLineBeats: 4 });
    
    expect(mapSongBeatToLine(36, sections, 2, 4)).toEqual({ lineIndex: 3, beatInLine: 0, totalLineBeats: 4 });
    expect(mapSongBeatToLine(39, sections, 2, 4)).toEqual({ lineIndex: 3, beatInLine: 3, totalLineBeats: 4 });
    
    // Out of bounds
    expect(mapSongBeatToLine(40, sections, 2, 4)).toBeNull();
  });
});
