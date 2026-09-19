import { getChordByName, normalizeChordName } from '../../data/chords';
import { type SongChart, type SongChartSection, type ChordMarker } from '../../data/songs';
import {
  cleanHtmlToPlainText,
  cleanChordLookupName,
  validateChord,
  decodeHtmlEntities,
  stripHtmlTags,
} from './chordFormatting';
import { LyricsResult } from './lyricsService';

export interface NormalizedChordMarker {
  chord: string;
  offset: number; // character offset in lyrics line
  timestamp?: number; // absolute start time in ms
}

export interface NormalizedLyricsLine {
  lyrics: string;
  chords: NormalizedChordMarker[];
  lineIndex: number;
  timestamp?: number; // start time in ms
  duration?: number; // duration in ms
}

export interface NormalizedSection {
  name: string;
  lines: NormalizedLyricsLine[];
}

export interface NormalizedChordChart {
  songId: string;
  title: string;
  artist: string;
  key: string;
  capo?: number;
  tuning?: string;
  sections: NormalizedSection[];
  source: string; // e.g. 'builtin', 'user', 'lrclib'
  licenseInfo?: string;
  confidence?: number; // 0.0 to 1.0
  chartStatus?: 'verified' | 'user' | 'provider' | 'unavailable';
  importDiagnostics?: string[];
}

// Helper to convert plain/synced lyrics from LRCLIB into normalized lyrics lines
export function mapLyricsResultToSections(result: LyricsResult): NormalizedSection[] {
  let lineCounter = 0;
  if (result.syncedLines && result.syncedLines.length > 0) {
    const lines = result.syncedLines.map((line: any) => ({
      lyrics: line.text || ' ',
      chords: [],
      lineIndex: lineCounter++,
      timestamp: line.timestamp,
      duration: line.duration,
    }));
    return [{ name: 'Lyrics (Synced)', lines }];
  } else if (result.plainLyrics) {
    const lines = result.plainLyrics.split('\n').map((lineText: string) => ({
      lyrics: lineText.trim() || ' ',
      chords: [],
      lineIndex: lineCounter++,
    }));
    return [{ name: 'Lyrics', lines }];
  }
  return [];
}

export function parseCifraStyleHtml(
  preContent: string,
  song: SongChart,
  source: string,
  licenseInfo: string,
  importDiagnostics: string[],
  title: string,
  artist: string,
  key: string,
  capo?: number
): NormalizedChordChart {
  let cleanContent = preContent;
  while (true) {
    const startIdx = cleanContent.toLowerCase().indexOf('<span class="tablatura">');
    if (startIdx === -1) break;
    const endIdx = cleanContent.toLowerCase().indexOf('</span>', startIdx);
    if (endIdx === -1) {
      cleanContent = cleanContent.substring(0, startIdx);
      break;
    }
    cleanContent = cleanContent.substring(0, startIdx) + cleanContent.substring(endIdx + 7);
  }

  const rawLines = cleanContent.split('\n');
  const sections: NormalizedSection[] = [];
  let currentSection: NormalizedSection = { name: 'Intro/Verse', lines: [] };
  let lineCounter = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const lineText = rawLines[i];

    const sectionMatch = lineText.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      let sectionName = sectionMatch[1].trim();
      if (sectionName.toLowerCase() === 'refrão' || sectionName.toLowerCase() === 'coro') {
        sectionName = 'Chorus';
      } else if (sectionName.toLowerCase() === 'ponte') {
        sectionName = 'Bridge';
      } else if (sectionName.toLowerCase() === 'primeira parte') {
        sectionName = 'Verse 1';
      } else if (sectionName.toLowerCase() === 'segunda parte') {
        sectionName = 'Verse 2';
      }
      currentSection = { name: sectionName, lines: [] };
      continue;
    }

    const hasBoldChords = lineText.includes('<b>');
    if (hasBoldChords) {
      const nextLineText = rawLines[i + 1] !== undefined ? rawLines[i + 1] : '';
      const isNextLineSectionOrChords =
        nextLineText.match(/^\[([^\]]+)\]/) || nextLineText.includes('<b>');

      if (isNextLineSectionOrChords || nextLineText.trim() === '') {
        const chords = parseCifraClubChordsFromLine(lineText);
        currentSection.lines.push({
          lyrics: ' ',
          chords,
          lineIndex: lineCounter++,
        });
      } else {
        const chords = parseCifraClubChordsFromLine(lineText);
        const cleanLyrics = decodeHtmlEntities(stripHtmlTags(nextLineText).trimEnd());
        currentSection.lines.push({
          lyrics: cleanLyrics || ' ',
          chords,
          lineIndex: lineCounter++,
        });
        i++;
      }
    } else {
      const cleanLyrics = decodeHtmlEntities(stripHtmlTags(lineText).trim());
      if (
        cleanLyrics &&
        !cleanLyrics.startsWith('E|') &&
        !cleanLyrics.startsWith('B|') &&
        !cleanLyrics.startsWith('G|') &&
        !cleanLyrics.startsWith('D|') &&
        !cleanLyrics.startsWith('A|')
      ) {
        currentSection.lines.push({
          lyrics: cleanLyrics,
          chords: [],
          lineIndex: lineCounter++,
        });
      }
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return {
    songId: song.id,
    title,
    artist,
    key,
    capo,
    sections,
    source,
    licenseInfo,
    confidence: 0.95,
    chartStatus: 'user',
    importDiagnostics,
  };
}

export function parseCifraClubChordsFromLine(lineText: string): NormalizedChordMarker[] {
  const chords: NormalizedChordMarker[] = [];
  let visualIndex = 0;
  let inTag = false;
  let chordStartVisualIndex = 0;

  for (let i = 0; i < lineText.length; i++) {
    const char = lineText[i];
    if (char === '<') {
      inTag = true;
      if (lineText.substring(i, i + 3) === '<b>') {
        chordStartVisualIndex = visualIndex;
      }
      continue;
    }
    if (char === '>') {
      inTag = false;
      continue;
    }
    if (inTag) {
      continue;
    }

    if (i >= 3 && lineText.substring(i - 3, i) === '<b>') {
      let chordText = '';
      let j = i;
      while (j < lineText.length && lineText[j] !== '<') {
        chordText += lineText[j];
        j++;
      }
      const parsedChord = decodeHtmlEntities(chordText.trim());
      const normalizedChord = normalizeChordName(parsedChord);
      chords.push({
        chord: normalizedChord || parsedChord,
        offset: visualIndex,
      });
      i = j - 1;
      visualIndex += chordText.length;
    } else {
      visualIndex++;
    }
  }

  return chords;
}

export function isChordProFormat(text: string): boolean {
  const matches = text.match(/\[[A-G][b#]?(?:maj|min|m|dim|aug|sus)?\d*(?:\/[A-G][b#]?)?\]/g);
  return matches !== null && matches.length > 5;
}

export function parseChordProLine(lineText: string): {
  lyrics: string;
  chords: NormalizedChordMarker[];
} {
  let lyrics = '';
  const chords: NormalizedChordMarker[] = [];
  let i = 0;

  while (i < lineText.length) {
    const char = lineText[i];
    if (char === '[') {
      const closeIdx = lineText.indexOf(']', i);
      if (closeIdx !== -1) {
        const chordName = lineText.substring(i + 1, closeIdx).trim();
        if (chordName && validateChord(chordName)) {
          const normalizedChord = normalizeChordName(chordName);
          chords.push({
            chord: normalizedChord || chordName,
            offset: lyrics.length,
          });
        }
        i = closeIdx + 1;
        continue;
      }
    }
    lyrics += char;
    i++;
  }
  return { lyrics, chords };
}

export function isChordsLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.match(/^[a-gA-G]?\|/)) return false;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;

  let validChords = 0;
  for (const tok of tokens) {
    const cleanTok = tok.replace(/[()\[\]]/g, '').trim();
    if (!cleanTok) continue;
    if (
      validateChord(cleanTok) ||
      cleanTok === '—' ||
      cleanTok.match(/^[I|V|i|v|x|v]+$/) ||
      ['intro', 'verse', 'chorus', 'bridge', 'solo', 'outro', 'refrão'].includes(
        cleanTok.toLowerCase()
      )
    ) {
      validChords++;
    }
  }
  return validChords / tokens.length >= 0.7;
}

export function parseChordsFromLine(lineText: string): NormalizedChordMarker[] {
  const chords: NormalizedChordMarker[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(lineText)) !== null) {
    const chordName = match[0].replace(/[()\[\]]/g, '').trim();
    if (chordName && validateChord(chordName)) {
      const normalizedChord = normalizeChordName(chordName);
      chords.push({
        chord: normalizedChord || chordName,
        offset: match.index,
      });
    }
  }
  return chords;
}

export function parsePlainChart(text: string, song: SongChart): NormalizedChordChart {
  const cleanText = cleanHtmlToPlainText(text);
  const rawLines = cleanText.split('\n');
  const sections: NormalizedSection[] = [];
  let currentSection: NormalizedSection = { name: 'Intro/Verse', lines: [] };
  let lineCounter = 0;

  let title = song.title;
  let artist = song.artist;
  let key = song.key || 'C';
  let capo: number | undefined = undefined;

  if (isChordProFormat(cleanText)) {
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const content = trimmed.substring(1, trimmed.length - 1).trim();
        const colonIdx = content.indexOf(':');
        if (colonIdx !== -1) {
          const directive = content.substring(0, colonIdx).trim().toLowerCase();
          const val = content.substring(colonIdx + 1).trim();
          if (directive === 'title' || directive === 't') title = val;
          else if (directive === 'artist' || directive === 'a') artist = val;
          else if (directive === 'key' || directive === 'k') key = val;
          else if (directive === 'capo') {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed)) capo = parsed;
          }
        }
        continue;
      }

      if (trimmed.startsWith('{start_of_chorus}') || trimmed.startsWith('{soc}')) {
        if (currentSection.lines.length > 0) sections.push(currentSection);
        currentSection = { name: 'Chorus', lines: [] };
        continue;
      }
      if (trimmed.startsWith('{end_of_chorus}') || trimmed.startsWith('{eoc}')) {
        continue;
      }

      const { lyrics, chords } = parseChordProLine(rawLine);
      currentSection.lines.push({
        lyrics: lyrics || ' ',
        chords,
        lineIndex: lineCounter++,
      });
    }
  } else {
    for (let i = 0; i < rawLines.length; i++) {
      const lineText = rawLines[i];
      const trimmed = lineText.trim();
      if (!trimmed) continue;

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]/);
      if (sectionMatch) {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { name: sectionMatch[1].trim(), lines: [] };
        continue;
      }

      if (isChordsLine(lineText)) {
        const nextLineText = rawLines[i + 1] !== undefined ? rawLines[i + 1] : '';
        const isNextLineSectionOrChords =
          nextLineText.trim().match(/^\[([^\]]+)\]/) || isChordsLine(nextLineText);

        if (isNextLineSectionOrChords || nextLineText.trim() === '') {
          const chords = parseChordsFromLine(lineText);
          currentSection.lines.push({
            lyrics: ' ',
            chords,
            lineIndex: lineCounter++,
          });
        } else {
          const chords = parseChordsFromLine(lineText);
          currentSection.lines.push({
            lyrics: nextLineText.trimEnd() || ' ',
            chords,
            lineIndex: lineCounter++,
          });
          i++;
        }
      } else {
        if (
          !trimmed.startsWith('E|') &&
          !trimmed.startsWith('B|') &&
          !trimmed.startsWith('G|') &&
          !trimmed.startsWith('D|') &&
          !trimmed.startsWith('A|')
        ) {
          currentSection.lines.push({
            lyrics: lineText.trimEnd() || ' ',
            chords: [],
            lineIndex: lineCounter++,
          });
        }
      }
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return {
    songId: song.id,
    title,
    artist,
    key,
    capo,
    sections,
    source: 'imported',
    licenseInfo: 'User imported raw text / ChordPro',
    confidence: 0.8,
    chartStatus: 'user',
  };
}

// Helper to sanitize and validate chord names in a chart
export function validateChartChords(chart: NormalizedChordChart): void {
  chart.sections.forEach((sec) => {
    sec.lines.forEach((line) => {
      line.chords.forEach((c) => {
        c.chord = c.chord.trim();
        if (!validateChord(c.chord)) {
        }
      });
    });
  });
}
