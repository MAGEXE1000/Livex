import type {
  SongLyricsDocument,
  SongLyricSection,
  SongLyricLine,
  LyricChordPlacement,
  LyricTextSpan,
  StandardLyricSectionType,
  VocalRoleAnnotation,
  StandardVocalRole,
  CapturedSelectionData,
  CapturedSelectionLine,
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
  const sepIndex = headerText.search(/[-—|–]/);
  if (sepIndex === -1) {
    return { cleanName: headerText.trim() };
  }

  const rolePart = headerText.slice(sepIndex + 1).trim();
  const namePart = headerText.slice(0, sepIndex).trim();
  if (!rolePart) {
    return { cleanName: headerText.trim() };
  }
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
 * Safely parse interlude content without polynomial backtracking ReDoS vulnerabilities
 */
export function parseInterludeTokens(raw: string): { label: string; durSec: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  if (!text) return null;

  // Extract optional trailing duration: e.g. (15s) or (15)
  let durSec = 15;
  const durationMatch = text.match(/\((\d{1,4})s?\)$/i);
  if (durationMatch && durationMatch.index !== undefined) {
    durSec = parseInt(durationMatch[1], 10);
    text = text.slice(0, durationMatch.index).trim();
  }

  // Check for colon separation: e.g. "Interlude: Solo" or "Solo: Electric"
  let keyword = text;
  let subLabel = '';
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    keyword = text.slice(0, colonIndex).trim();
    subLabel = text.slice(colonIndex + 1).trim();
  }

  // Validate keyword against supported categories
  const validKeywordRegex = /^(?:interlude|solo|guitar\s+solo|piano\s+solo|instrumental)$/i;
  if (!validKeywordRegex.test(keyword)) {
    return null;
  }

  const label = subLabel || (keyword.toLowerCase() === 'interlude' ? 'Solo' : keyword);
  return {
    label: label.trim() || 'Solo',
    durSec: isNaN(durSec) || durSec <= 0 ? 15 : Math.min(durSec, 3600),
  };
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
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const interlude = parseInterludeTokens(trimmed.slice(1, -1).trim());
    if (interlude) {
      return {
        kind: 'interlude',
        interludeLabel: interlude.label,
        interludeDurationSec: interlude.durSec,
      };
    }
  }

  // Colon interlude pattern: Interlude:, Solo:, Guitar Solo:
  if (trimmed.includes(':') && !trimmed.startsWith('[')) {
    const interlude = parseInterludeTokens(trimmed);
    if (interlude) {
      return {
        kind: 'interlude',
        interludeLabel: interlude.label,
        interludeDurationSec: interlude.durSec,
      };
    }
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
      bars: sIdx === 0 ? line.bars : undefined,
      explicitDurationMs: sIdx === 0 ? line.explicitDurationMs : undefined,
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
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const interlude = parseInterludeTokens(trimmed.slice(1, -1).trim());
      if (interlude) {
        flushPendingBlankLines();
        const sec = ensureCurrentSection();
        sec.lines.push({
          id: generateLyricId('line'),
          type: 'interlude',
          text: interlude.label,
          explicitDurationMs: Math.max(1000, interlude.durSec * 1000),
        });
        continue;
      }
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

/**
 * Helper to adjust/slice formatting spans when a character range [start, end) is deleted
 */
function sliceSpansOnDelete(
  spans: LyricTextSpan[] | undefined,
  start: number,
  end: number
): LyricTextSpan[] | undefined {
  if (!spans || spans.length === 0) return spans;
  let currOffset = 0;
  const result: LyricTextSpan[] = [];

  for (const span of spans) {
    const spanStart = currOffset;
    const spanEnd = currOffset + span.text.length;
    currOffset = spanEnd;

    // Span entirely before delete range
    if (spanEnd <= start) {
      result.push({ ...span });
      continue;
    }
    // Span entirely after delete range
    if (spanStart >= end) {
      result.push({ ...span });
      continue;
    }
    // Span overlaps delete range
    const keepHead = spanStart < start ? span.text.slice(0, start - spanStart) : '';
    const keepTail = spanEnd > end ? span.text.slice(end - spanStart) : '';
    const remaining = keepHead + keepTail;
    if (remaining.length > 0) {
      result.push({
        ...span,
        text: remaining,
      });
    }
  }

  return result.length > 0 ? result : undefined;
}

/**
 * Cleanly removes a captured multi-line selection range from a SongLyricsDocument,
 * collapsing surrounding lines, shifting chords and formatting spans, and removing
 * empty orphan lines/sections.
 */
export function batchDeleteLyricsSelection(
  doc: SongLyricsDocument,
  selection: CapturedSelectionData
): SongLyricsDocument {
  if (!selection || selection.lines.length === 0) return doc;

  const selLinesMap = new Map<string, CapturedSelectionLine>();
  for (const line of selection.lines) {
    selLinesMap.set(line.lineId, line);
  }

  const newSections: SongLyricSection[] = [];

  for (const section of doc.sections) {
    const updatedLines: SongLyricLine[] = [];
    const secSelLines = section.lines.filter((l) => selLinesMap.has(l.id));

    if (secSelLines.length === 0) {
      // No lines in this section were selected
      newSections.push({
        ...section,
        lines: section.lines.map((l) => ({ ...l })),
      });
      continue;
    }

    const firstSelLine = secSelLines[0];
    const lastSelLine = secSelLines[secSelLines.length - 1];
    const isMultiLineInSec = secSelLines.length > 1;

    for (let i = 0; i < section.lines.length; i++) {
      const line = section.lines[i];
      const sel = selLinesMap.get(line.id);

      if (!sel) {
        // Line was not selected at all
        updatedLines.push({ ...line });
        continue;
      }

      // Check if full line is selected
      const isEntireLine = sel.isFullLine || (sel.start === 0 && sel.end >= line.text.length);

      if (isEntireLine) {
        // Completely removed
        continue;
      }

      // Partial line selection
      if (!isMultiLineInSec) {
        // Single partial line selected: slice out [start, end)
        const newText = line.text.slice(0, sel.start) + line.text.slice(sel.end);
        const deleteLen = sel.end - sel.start;

        // Shift chords: remove if within [start, end), shift backward if >= end
        const newChords = (line.chords || [])
          .filter((c) => c.offset < sel.start || c.offset >= sel.end)
          .map((c) => (c.offset >= sel.end ? { ...c, offset: Math.max(0, c.offset - deleteLen) } : { ...c }));

        // Adjust spans
        const newSpans = sliceSpansOnDelete(line.spans, sel.start, sel.end);

        updatedLines.push({
          ...line,
          text: newText,
          chords: newChords.length > 0 ? newChords : undefined,
          spans: newSpans && newSpans.length > 0 ? newSpans : undefined,
        });
      } else {
        // Multi-line selection spanning this line
        if (line.id === firstSelLine.id) {
          // First line: keep text before start
          const headText = line.text.slice(0, sel.start);
          const firstSpans = sliceSpansOnDelete(line.spans, sel.start, line.text.length);
          const firstChords = (line.chords || []).filter((c) => c.offset < sel.start);

          // If last line is also in this section and partially deleted at end, merge tail of last line
          const lastSel = selLinesMap.get(lastSelLine.id);
          let tailText = '';
          let tailChords: LyricChordPlacement[] = [];
          let tailSpans: LyricTextSpan[] = [];

          if (lastSel && !lastSel.isFullLine && lastSel.end < lastSelLine.text.length) {
            tailText = lastSelLine.text.slice(lastSel.end);
            const tailDeleteLen = lastSel.end;
            tailChords = (lastSelLine.chords || [])
              .filter((c) => c.offset >= lastSel.end)
              .map((c) => ({
                ...c,
                offset: headText.length + Math.max(0, c.offset - tailDeleteLen),
              }));
            tailSpans = sliceSpansOnDelete(lastSelLine.spans, 0, lastSel.end) || [];
          }

          const mergedText = headText + tailText;
          const mergedChords = [...firstChords, ...tailChords];
          const mergedSpans = [...(firstSpans || []), ...tailSpans];

          updatedLines.push({
            ...line,
            text: mergedText,
            chords: mergedChords.length > 0 ? mergedChords : undefined,
            spans: mergedSpans.length > 0 ? mergedSpans : undefined,
          });
        } else if (line.id === lastSelLine.id) {
          // Handled by merge into firstSelLine above
          continue;
        } else {
          // Middle line completely consumed
          continue;
        }
      }
    }

    if (updatedLines.length > 0) {
      newSections.push({
        ...section,
        lines: updatedLines,
      });
    }
  }

  // Failsafe: if all sections/lines were wiped out, return single empty line
  if (newSections.length === 0 || newSections.every((s) => s.lines.length === 0)) {
    return createEmptyLyricsDocument();
  }

  return {
    ...doc,
    sections: newSections,
  };
}

