import { type SongLyricLine, type SongLyricSection } from '../../types/lyrics';

export function resolveLineBars(
  line: SongLyricLine,
  section: SongLyricSection,
  globalBarsPerLine: number
): number {
  return line.bars ?? section.barsPerLine ?? globalBarsPerLine;
}

export function mapSongBeatToLine(
  cumulativeSongBeatIndex: number,
  sections: SongLyricSection[],
  globalBarsPerLine: number,
  beatsPerMeasure: number
): { lineIndex: number; beatInLine: number; totalLineBeats: number } | null {
  let elapsedBeats = 0;
  let globalLineIndex = 0;

  for (const section of sections) {
    for (const line of section.lines) {
      const lineBars = resolveLineBars(line, section, globalBarsPerLine);
      const totalLineBeats = lineBars * beatsPerMeasure;
      
      if (cumulativeSongBeatIndex >= elapsedBeats && cumulativeSongBeatIndex < elapsedBeats + totalLineBeats) {
        return {
          lineIndex: globalLineIndex,
          beatInLine: cumulativeSongBeatIndex - elapsedBeats,
          totalLineBeats
        };
      }
      
      elapsedBeats += totalLineBeats;
      globalLineIndex++;
    }
  }

  return null;
}

export function advanceLineClock(
  currentElapsed: number,
  totalLineBeats: number
): { nextElapsed: number; shouldAdvanceLine: boolean } {
  if (currentElapsed >= totalLineBeats) {
    return { nextElapsed: 1, shouldAdvanceLine: true };
  } else {
    return { nextElapsed: currentElapsed + 1, shouldAdvanceLine: false };
  }
}

export function applyBarsToLines(
  sections: SongLyricSection[],
  lineIds: ReadonlySet<string> | string[],
  bars: number | null,
  globalBarsPerLine: number
): SongLyricSection[] {
  const lineIdSet = new Set(lineIds);
  let changed = false;

  const newSections = sections.map(section => {
    let sectionChanged = false;
    const newLines = section.lines.map(line => {
      if (!lineIdSet.has(line.id)) return line;
      if (line.type === 'interlude') return line;

      const defaultBars = section.barsPerLine ?? globalBarsPerLine;
      let newBarsValue = bars;

      if (bars === defaultBars) {
        newBarsValue = null;
      } else if (bars !== null) {
        newBarsValue = Math.max(1, Math.min(32, Math.round(bars)));
      }

      if (line.bars !== newBarsValue && !(line.bars === undefined && newBarsValue === null)) {
        sectionChanged = true;
        changed = true;
        const newLine = { ...line };
        if (newBarsValue === null) {
          delete newLine.bars;
        } else {
          newLine.bars = newBarsValue;
        }
        return newLine;
      }
      return line;
    });

    if (sectionChanged) {
      return { ...section, lines: newLines };
    }
    return section;
  });

  return changed ? newSections : sections;
}
