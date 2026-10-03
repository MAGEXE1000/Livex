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
