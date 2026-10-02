import type {
  SongLyricsDocument,
  SongLyricSection,
  SongLyricLine,
  LyricChordPlacement,
  LyricTextSpan,
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
export function parseVocalRoleFromHeader(headerText: string): {
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
export function detectSectionType(name: string): StandardLyricSectionType {
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

export interface StructuralLineParseResult {
  kind: 'section' | 'interlude' | 'none';
  sectionName?: string;
  sectionType?: StandardLyricSectionType;
  vocalRole?: VocalRoleAnnotation;
  interludeLabel?: string;
  interludeDurationSec?: number;
}

/**
 * Detect if a user-entered line is a structural element (section header or timed interlude)
 * so it can be transformed immediately into a visual component rather than remaining raw text.
 */
export function parseLineStructuralElement(lineText: string): StructuralLineParseResult {
  const trimmed = lineText.trim();
  if (!trimmed) return { kind: 'none' };

  // 1. Interlude patterns:
  // e.g. [Interlude: Solo (15s)], [Solo (20s)], [Interlude (10s)], [Solo], [Interlude], [Guitar Solo]
  // or Interlude:, Solo:, Guitar Solo:
  const bracketInterlude = trimmed.match(
    /^\[(?:Interlude(?::\s*([^(]+?)(?:\s*\((\d+)s?\))?)?|Solo(?:\s*\((\d+)s?\))?|Guitar\s+Solo(?:\s*\((\d+)s?\))?|Piano\s+Solo(?:\s*\((\d+)s?\))?|Instrumental(?:\s*\((\d+)s?\))?)\]$/i
  );
  if (bracketInterlude) {
    const label = (bracketInterlude[1] || 'Solo').trim();
    const durSec = bracketInterlude[2]
      ? parseInt(bracketInterlude[2], 10)
      : bracketInterlude[3]
      ? parseInt(bracketInterlude[3], 10)
      : bracketInterlude[4]
      ? parseInt(bracketInterlude[4], 10)
      : bracketInterlude[5]
      ? parseInt(bracketInterlude[5], 10)
      : bracketInterlude[6]
      ? parseInt(bracketInterlude[6], 10)
      : 15;
    return {
      kind: 'interlude',
      interludeLabel: label,
      interludeDurationSec: isNaN(durSec) ? 15 : durSec,
    };
  }

  const colonInterlude = trimmed.match(
    /^(?:Interlude|Solo|Guitar\s+Solo|Piano\s+Solo|Instrumental):\s*(?:([^(]+?)(?:\s*\((\d+)s?\))?)?$/i
  );
  if (colonInterlude) {
    const label = (colonInterlude[1] || 'Solo').trim();
    const durSec = colonInterlude[2] ? parseInt(colonInterlude[2], 10) : 15;
    return {
      kind: 'interlude',
      interludeLabel: label,
      interludeDurationSec: isNaN(durSec) ? 15 : durSec,
    };
  }

  // 2. Section Header patterns:
  // Bracket: [Verse 1], [Chorus - Lead], [Bridge], [Intro], etc.
  const bracketMatch = trimmed.match(/^\[([^\]]+)\]$/);
  let rawHeaderContent: string | null = null;
  if (bracketMatch) {
    rawHeaderContent = bracketMatch[1].trim();
  } else {
    // Colon: Verse 1:, Chorus:, Bridge:, Intro:, Outro:, Pre-Chorus:, etc.
    const colonMatch = trimmed.match(/^([A-Za-z0-9\s_—–-]+):$/);
    if (colonMatch) {
      rawHeaderContent = colonMatch[1].trim();
    } else {
      // Standalone keyword check: e.g. "Verse 1", "Verse 2", "Chorus", "Bridge", "Intro", "Outro", "Pre-Chorus", "Verso 1", "Coro"
      const keywordMatch = trimmed.match(
        /^(verse(?:\s*\d+)?|chorus(?:\s*\d+)?|bridge(?:\s*\d+)?|intro|outro|pre-?chorus(?:\s*\d+)?|hook|tag|ending|coro(?:\s*\d+)?|verso(?:\s*\d+)?|puente(?:\s*\d+)?|estrofa(?:\s*\d+)?)$/i
      );
      if (keywordMatch) {
        rawHeaderContent = keywordMatch[1].trim();
      }
    }
  }

  if (rawHeaderContent) {
    const { cleanName, vocalRole } = parseVocalRoleFromHeader(rawHeaderContent);
    const secType = detectSectionType(cleanName);
    return {
      kind: 'section',
      sectionName: cleanName,
      sectionType: secType,
      vocalRole,
    };
  }

  return { kind: 'none' };
}

/**
 * Splits a single SongLyricLine containing newlines (\n) into multiple discrete
 * SongLyricLine elements, correctly redistributing character-offset chords and formatting spans.
 */
export function splitLineByNewlines(line: SongLyricLine): SongLyricLine[] {
  if (!line || !line.text || !line.text.includes('\n')) {
    return [line];
  }

  const rawSegments = line.text.split('\n');
  const result: SongLyricLine[] = [];
  let currentStartOffset = 0;

  for (let sIdx = 0; sIdx < rawSegments.length; sIdx++) {
    const segmentText = rawSegments[sIdx];
    const segmentEndOffset = currentStartOffset + segmentText.length;

    // Filter and shift chords
    const segmentChords: LyricChordPlacement[] = [];
    if (line.chords && line.chords.length > 0) {
      for (const chord of line.chords) {
        if (
          chord.offset >= currentStartOffset &&
          (chord.offset < segmentEndOffset || (sIdx === rawSegments.length - 1 && chord.offset <= segmentEndOffset))
        ) {
          segmentChords.push({
            ...chord,
            id: generateLyricId('chord'),
            offset: Math.max(0, chord.offset - currentStartOffset),
          });
        }
      }
    }

    // Filter and slice spans
    let segmentSpans: LyricTextSpan[] | undefined;
    if (line.spans && line.spans.length > 0) {
      const extracted: LyricTextSpan[] = [];
      let spanOffset = 0;
      for (const span of line.spans) {
        const spanEnd = spanOffset + span.text.length;
        const overlapStart = Math.max(currentStartOffset, spanOffset);
        const overlapEnd = Math.min(segmentEndOffset, spanEnd);
        if (overlapStart < overlapEnd) {
          const sliceFrom = overlapStart - spanOffset;
          const sliceTo = overlapEnd - spanOffset;
          extracted.push({
            text: span.text.slice(sliceFrom, sliceTo),
            format: span.format ? { ...span.format } : undefined,
          });
        }
        spanOffset = spanEnd;
      }
      if (extracted.length > 0) {
        segmentSpans = extracted;
      }
    }

    result.push({
      id: sIdx === 0 ? line.id : generateLyricId('line'),
      type: line.type,
      text: segmentText,
      chords: segmentChords.length > 0 ? segmentChords : undefined,
      spans: segmentSpans,
      format: line.format ? { ...line.format } : undefined,
      vocalRole: line.vocalRole ? { ...line.vocalRole } : undefined,
    });

    currentStartOffset = segmentEndOffset + 1; // +1 for the '\n'
  }

  return result;
}

/**
 * Normalizes a SongLyricsDocument, converting any raw section headers or
 * bracketed interludes within line text into proper structured sections and cards,
 * and splitting any multiline strings into discrete line elements.
 */
export function normalizeLyricsDocumentStructure(doc: SongLyricsDocument): SongLyricsDocument {
  if (!doc || !Array.isArray(doc.sections) || doc.sections.length === 0) {
    return {
      version: 1,
      sections: [
        {
          id: generateLyricId('sec'),
          type: 'verse',
          name: '',
          lines: [{ id: generateLyricId('line'), text: '' }],
        },
      ],
    };
  }

  let hasStructuralChanges = false;
  const newSections: SongLyricSection[] = [];

  for (const section of doc.sections) {
    let currentSec: SongLyricSection = {
      ...section,
      lines: [],
    };
    newSections.push(currentSec);

    for (let lIdx = 0; lIdx < section.lines.length; lIdx++) {
      const rawLine = section.lines[lIdx];
      const expandedLines =
        rawLine.text && rawLine.text.includes('\n') ? splitLineByNewlines(rawLine) : [rawLine];
      if (expandedLines.length > 1) {
        hasStructuralChanges = true;
      }

      for (const line of expandedLines) {
        if (line.type === 'interlude') {
          currentSec.lines.push(line);
          continue;
        }

        const parseResult = parseLineStructuralElement(line.text);
        if (parseResult.kind === 'interlude') {
          hasStructuralChanges = true;
          currentSec.lines.push({
            id: line.id || generateLyricId('line'),
            type: 'interlude',
            text: parseResult.interludeLabel || 'Solo',
            explicitDurationMs: (parseResult.interludeDurationSec || 15) * 1000,
          });
        } else if (parseResult.kind === 'section') {
          hasStructuralChanges = true;
          if (
            currentSec.lines.length === 0 &&
            (!currentSec.name || currentSec.name === 'Verse 1' || currentSec.name.trim().length === 0)
          ) {
            currentSec.name = parseResult.sectionName || 'Section';
            currentSec.type = parseResult.sectionType || detectSectionType(currentSec.name);
            if (parseResult.vocalRole) {
              currentSec.vocalRole = parseResult.vocalRole;
            }
          } else {
            currentSec = {
              id: generateLyricId('sec'),
              name: parseResult.sectionName || 'Section',
              type: parseResult.sectionType || detectSectionType(parseResult.sectionName || 'Section'),
              vocalRole: parseResult.vocalRole,
              lines: [],
            };
            newSections.push(currentSec);
          }
        } else {
          currentSec.lines.push(line);
        }
      }
    }

    if (currentSec.lines.length === 0) {
      currentSec.lines.push({ id: generateLyricId('line'), text: '' });
    }
  }

  for (const s of newSections) {
    if (s.lines.length === 0) {
      s.lines.push({ id: generateLyricId('line'), text: '' });
    }
  }

  if (!hasStructuralChanges) {
    return doc;
  }

  return {
    ...doc,
    sections: newSections,
  };
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
  let pendingBlankLines = 0;

  function ensureCurrentSection(name = '', type: StandardLyricSectionType = 'custom'): SongLyricSection {
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

  function flushPendingBlankLines(): void {
    if (pendingBlankLines > 0 && currentSection && currentSection.lines.length > 0) {
      for (let b = 0; b < pendingBlankLines; b++) {
        currentSection.lines.push({
          id: generateLyricId('line'),
          text: '',
        });
      }
    }
    pendingBlankLines = 0;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // 1. Check for blank lines (creates separation between sections if appropriate)
    if (!trimmed) {
      // If we had a pending chord line, push it as a standalone line before blank
      if (pendingChordLine) {
        flushPendingBlankLines();
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: '',
          chords: extractChordsFromLine(pendingChordLine),
        });
        pendingChordLine = null;
      }
      pendingBlankLines++;
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
        flushPendingBlankLines();
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          text: '',
          chords: extractChordsFromLine(pendingChordLine),
        });
        pendingChordLine = null;
      }

      // Discard blank lines that preceded this section header
      pendingBlankLines = 0;

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

    // 2.5 Check for Interlude line: [Interlude: Solo (15s)] or [Interlude] or [Solo (15s)]
    const interludeMatch = trimmed.match(/^\[(?:Interlude(?::\s*([^(]+?)(?:\s*\((\d+)s?\))?)?|Solo(?:\s*\((\d+)s?\))?)\]$/i);
    if (interludeMatch) {
      flushPendingBlankLines();
      const sec = ensureCurrentSection();
      const label = interludeMatch[1]?.trim() || 'Solo';
      const durSec = interludeMatch[2]
        ? parseInt(interludeMatch[2], 10)
        : interludeMatch[3]
        ? parseInt(interludeMatch[3], 10)
        : 15;
      sec.lines.push({
        id: generateLyricId('line'),
        type: 'interlude',
        text: label,
        explicitDurationMs: Math.max(1000, durSec * 1000),
      });
      continue;
    }

    // 3. Check for ChordPro notation inside the line: e.g. [C]When I [G]wake up
    if (trimmed.includes('[') && trimmed.includes(']')) {
      const { text, chords } = parseChordProLine(rawLine);
      if (chords.length > 0) {
        flushPendingBlankLines();
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
        flushPendingBlankLines();
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
    flushPendingBlankLines();
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
    // Section Header with Vocal Role if present (only if named or has vocal role)
    const hasHeader = Boolean(
      (section.name && section.name.trim().length > 0) || section.vocalRole?.label
    );
    if (hasHeader) {
      let header = `[${section.name || 'Section'}`;
      if (section.vocalRole?.label) {
        header += ` — ${section.vocalRole.label}`;
      }
      header += ']';
      output.push(header);
    }

    for (const line of section.lines) {
      if (line.type === 'interlude') {
        const durSec = Math.round((line.explicitDurationMs || 15000) / 1000);
        output.push(`[Interlude: ${line.text || 'Solo'} (${durSec}s)]`);
        continue;
      }

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

    if (hasHeader || doc.sections.length > 1) {
      output.push(''); // Blank line after section if there are multiple sections or named header
    }
  }

  return output.join('\n').trim();
}

/**
 * Convert a continuous text document to a structured SongLyricsDocument
 */
export function continuousTextToLyricsDocument(
  text: string,
  existingDoc?: SongLyricsDocument
): SongLyricsDocument {
  const parsed = parsePastedLyrics(text);
  if (existingDoc) {
    if (existingDoc.formatting) {
      parsed.formatting = { ...existingDoc.formatting };
    }
    if (existingDoc.defaultVocalRole) {
      parsed.defaultVocalRole = { ...existingDoc.defaultVocalRole };
    }
  }
  return parsed;
}

/**
 * Convert a SongLyricsDocument to continuous text for the authoring editor
 */
export function lyricsDocumentToContinuousText(
  doc?: SongLyricsDocument,
  includeChords = false
): string {
  if (!doc) return '';
  return lyricsDocumentToPlainText(doc, includeChords);
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
        name: '',
        lines: [{ id: generateLyricId('line'), text: '' }],
      },
    ],
  };
}
