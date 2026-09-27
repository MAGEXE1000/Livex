import type {
  SongLyricsDocument,
  SongLyricSection,
  SongLyricLine,
  LyricChordPlacement,
  StandardLyricSectionType,
  VocalRoleAnnotation,
  StandardVocalRole,
} from '../../types/lyrics';

/**
 * Regex detecting common musical chords (roots A-G with sharps/flats, extensions, and slash basses)
 */
const CHORD_TOKEN_REGEX =
  /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]*(?:(?:maj|min|dim|aug|sus|add)[0-9]*)?(?:\/[A-G][b#]?)?$/;

/**
 * Common section header patterns
 * Examples: [Verse 1], [Chorus], [Bridge - Lead], [Verse — All], [Intro], Verse 1:, Chorus:
 */
const SECTION_HEADER_BRACKET_REGEX = /^\[([^\]]+)\]$/;
const SECTION_HEADER_COLON_REGEX = /^([A-Za-z0-9\s_-]+):$/;

export function generateLyricId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Determine if a line is likely a chord line
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Split line by whitespace
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  // If every token matches a chord pattern, it's a chord line
  let validChordCount = 0;
  for (const token of tokens) {
    // Strip surrounding punctuation like parens if user typed (G)
    const cleanToken = token.replace(/^[()\[\]]/, '').replace(/[()\[\]]$/, '');
    if (CHORD_TOKEN_REGEX.test(cleanToken)) {
      validChordCount++;
    }
  }

  // A chord line typically consists exclusively of chords
  return validChordCount === tokens.length || (tokens.length >= 2 && validChordCount / tokens.length >= 0.8);
}

/**
 * Extract chord placements from a chord line with character offsets
 */
export function extractChordsFromLine(chordLine: string): LyricChordPlacement[] {
  const chords: LyricChordPlacement[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(chordLine)) !== null) {
    const rawChord = match[0];
    const cleanChord = rawChord.replace(/^[()\[\]]/, '').replace(/[()\[\]]$/, '');
    if (CHORD_TOKEN_REGEX.test(cleanChord)) {
      chords.push({
        id: generateLyricId('chord'),
        chord: cleanChord,
        offset: match.index,
      });
    }
  }

  return chords;
}

/**
 * Parse vocal role from section header string
 * E.g. "Verse 1 - Lead", "Chorus — All", "Bridge [Lead + Group]"
 */
function parseVocalRoleFromHeader(headerText: string): {
  cleanName: string;
  vocalRole?: VocalRoleAnnotation;
} {
  // Check for delimiters like "-", "—", or "|"
  const separatorMatch = headerText.match(/\s*(?:[-—|–])\s*(.+)$/);
  if (!separatorMatch) {
    return { cleanName: headerText.trim() };
  }

  const rolePart = separatorMatch[1].trim();
  const namePart = headerText.slice(0, separatorMatch.index).trim();
  const lowerRole = rolePart.toLowerCase();

  let standardRole: StandardVocalRole = 'custom';
  let color = '#8b5cf6';

  if (lowerRole === 'lead' || lowerRole === 'solo') {
    standardRole = 'lead';
    color = '#3b82f6';
  } else if (lowerRole === 'all' || lowerRole === 'group' || lowerRole === 'todos') {
    standardRole = 'all';
    color = '#10b981';
  } else if (lowerRole === 'backing' || lowerRole === 'coro' || lowerRole === 'harmonies') {
    standardRole = 'backing';
    color = '#06b6d4';
  } else if (lowerRole === 'choir') {
    standardRole = 'choir';
    color = '#f59e0b';
  }

  return {
    cleanName: namePart || headerText.trim(),
    vocalRole: {
      type: standardRole,
      label: rolePart,
      color,
    },
  };
}

/**
 * Detect standard section type from section name
 */
function detectSectionType(name: string): StandardLyricSectionType {
  const lower = name.toLowerCase();
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('verse') || lower.includes('verso') || lower.includes('estrofa')) return 'verse';
  if (lower.includes('pre-chorus') || lower.includes('precoro') || lower.includes('pre coro')) return 'pre-chorus';
  if (lower.includes('chorus') || lower.includes('coro') || lower.includes('estribillo')) return 'chorus';
  if (lower.includes('bridge') || lower.includes('puente')) return 'bridge';
  if (lower.includes('outro') || lower.includes('final')) return 'outro';
  if (lower.includes('solo')) return 'solo';
  if (lower.includes('interlude') || lower.includes('interludio')) return 'interlude';
  return 'custom';
}

/**
 * Parse an inline ChordPro line into plain text and chord placements
 * E.g. "[C]When the [G]night has [Am]come"
 */
function parseChordProLine(line: string): { text: string; chords: LyricChordPlacement[] } {
  let text = '';
  const chords: LyricChordPlacement[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '[') {
      const closeIdx = line.indexOf(']', i);
      if (closeIdx !== -1) {
        const chordCandidate = line.slice(i + 1, closeIdx).trim();
        if (CHORD_TOKEN_REGEX.test(chordCandidate)) {
          chords.push({
            id: generateLyricId('chord'),
            chord: chordCandidate,
            offset: text.length,
          });
          i = closeIdx + 1;
          continue;
        }
      }
    }
    text += line[i];
    i++;
  }

  return { text, chords };
}

/**
 * Parse pasted or typed lyrics into a fully structured SongLyricsDocument
 */
export function parsePastedLyrics(rawText: string): SongLyricsDocument {
  const lines = rawText.split(/\r?\n/);
  const sections: SongLyricSection[] = [];

  let currentSection: SongLyricSection | null = null;
  let pendingChordLine: string | null = null;

  function ensureCurrentSection(name = 'Verse', type: StandardLyricSectionType = 'verse'): SongLyricSection {
    if (!currentSection) {
      currentSection = {
        id: generateLyricId('sec'),
        type,
        name,
        lines: [],
      };
      sections.push(currentSection);
    }
    return currentSection;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // 1. Check for blank lines (creates separation between sections if appropriate)
    if (!trimmed) {
      // If we had a pending chord line, push it as a standalone line before blank
      if (pendingChordLine) {
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: '',
          chords: extractChordsFromLine(pendingChordLine),
        });
        pendingChordLine = null;
      }
      continue;
    }

    // 2. Check for Section Headers: [Verse 1], [Chorus - Lead], Verse 1:
    let headerMatch = trimmed.match(SECTION_HEADER_BRACKET_REGEX);
    let rawHeaderContent: string | null = null;
    if (headerMatch) {
      rawHeaderContent = headerMatch[1];
    } else {
      const colonMatch = trimmed.match(SECTION_HEADER_COLON_REGEX);
      if (colonMatch) {
        rawHeaderContent = colonMatch[1];
      }
    }

    if (rawHeaderContent) {
      // If there was a pending chord line, flush it
      if (pendingChordLine) {
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: '',
          chords: extractChordsFromLine(pendingChordLine),
        });
        pendingChordLine = null;
      }

      const { cleanName, vocalRole } = parseVocalRoleFromHeader(rawHeaderContent);
      const secType = detectSectionType(cleanName);

      currentSection = {
        id: generateLyricId('sec'),
        type: secType,
        name: cleanName,
        vocalRole,
        lines: [],
      };
      sections.push(currentSection);
      continue;
    }

    // 3. Check for ChordPro notation inside the line: e.g. [C]When I [G]wake up
    if (trimmed.includes('[') && trimmed.includes(']')) {
      const { text, chords } = parseChordProLine(rawLine);
      if (chords.length > 0) {
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: text,
          chords: chords,
        });
        pendingChordLine = null;
        continue;
      }
    }

    // 4. Check for Chord-Only Line
    if (isChordLine(rawLine)) {
      if (pendingChordLine) {
        // Two consecutive chord lines - flush the previous one as chords without lyrics
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: '',
          chords: extractChordsFromLine(pendingChordLine),
        });
      }
      pendingChordLine = rawLine;
      continue;
    }

    // 5. Regular Lyric Line
    const sec = ensureCurrentSection();
    const chords = pendingChordLine ? extractChordsFromLine(pendingChordLine) : undefined;
    pendingChordLine = null;

    sec.lines.push({
      id: generateLyricId('line'),
      text: rawLine,
      chords: chords && chords.length > 0 ? chords : undefined,
    });
  }

  // Flush remaining chord line if any
  if (pendingChordLine) {
    const sec = ensureCurrentSection();
    sec.lines.push({
      id: generateLyricId('line'),
      text: '',
      chords: extractChordsFromLine(pendingChordLine),
    });
  }

  // If no sections were created (e.g. empty string), create an initial empty section
  if (sections.length === 0) {
    return createEmptyLyricsDocument();
  }

  return {
    version: 1,
    sections,
  };
}

/**
 * Convert structured SongLyricsDocument back to plain text for clipboard copying
 */
export function lyricsDocumentToPlainText(
  doc: SongLyricsDocument,
  includeChords = true
): string {
  if (!doc || !Array.isArray(doc.sections) || doc.sections.length === 0) {
    return '';
  }

  // If document contains no lyrics text and no chords, return empty string
  const hasAnyContent = doc.sections.some((s) =>
    s.lines.some((l) => l.text.trim().length > 0 || (includeChords && l.chords && l.chords.length > 0))
  );
  if (!hasAnyContent) {
    return '';
  }

  const output: string[] = [];

  for (const section of doc.sections) {
    // Section Header with Vocal Role if present
    let header = `[${section.name || 'Section'}`;
    if (section.vocalRole?.label) {
      header += ` — ${section.vocalRole.label}`;
    }
    header += ']';
    output.push(header);

    for (const line of section.lines) {
      if (includeChords && line.chords && line.chords.length > 0) {
        // Construct chord line above text
        let chordLine = '';
        const sortedChords = [...line.chords].sort((a, b) => a.offset - b.offset);
        for (const c of sortedChords) {
          const targetOffset = Math.max(0, c.offset);
          if (chordLine.length < targetOffset) {
            chordLine = chordLine.padEnd(targetOffset, ' ');
          } else if (chordLine.length > targetOffset && chordLine.length > 0) {
            chordLine += ' ';
          }
          chordLine += c.chord;
        }
        if (chordLine) {
          output.push(chordLine);
        }
      }

      if (line.text || (!line.chords || line.chords.length === 0)) {
        output.push(line.text);
      }
    }

    output.push(''); // Blank line after section
  }

  return output.join('\n').trim();
}

/**
 * Create a fresh, empty SongLyricsDocument
 */
export function createEmptyLyricsDocument(): SongLyricsDocument {
  return {
    version: 1,
    sections: [
      {
        id: generateLyricId('sec'),
        type: 'verse',
        name: 'Verse 1',
        lines: [
          {
            id: generateLyricId('line'),
            text: '',
          },
        ],
      },
    ],
  };
}
