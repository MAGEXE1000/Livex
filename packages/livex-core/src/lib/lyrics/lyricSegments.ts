import type { LyricChordPlacement } from '../../types/lyrics';

export interface LyricLineSegment {
  id: string;
  chord?: LyricChordPlacement;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface WordBoundary {
  word: string;
  start: number;
  end: number;
}

/**
 * Split a lyric line's text and attached chords into semantic segments.
 * Each segment contains the text fragment and its associated chord (if any).
 * This enables responsive, wrap-safe, ruby-style chord-above-text alignment.
 */
export function splitLineIntoSegments(
  text: string,
  chords?: LyricChordPlacement[]
): LyricLineSegment[] {
  // If no chords exist, the entire line is a single segment
  if (!chords || chords.length === 0) {
    return [
      {
        id: 'seg-full',
        chord: undefined,
        text,
        startOffset: 0,
        endOffset: text.length,
      },
    ];
  }

  // If line has chords but no text (e.g. instrumental intro)
  if (!text) {
    return chords.map((chord, idx) => ({
      id: chord.id || `seg-chord-${idx}`,
      chord,
      text: '',
      startOffset: 0,
      endOffset: 0,
    }));
  }

  // Sort chords ascending by character offset
  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  const segments: LyricLineSegment[] = [];

  // Check for leading text before the first chord
  const firstOffset = Math.min(Math.max(0, sorted[0].offset), text.length);
  if (firstOffset > 0) {
    segments.push({
      id: 'seg-lead',
      chord: undefined,
      text: text.slice(0, firstOffset),
      startOffset: 0,
      endOffset: firstOffset,
    });
  }

  // Build a segment for each chord
  for (let i = 0; i < sorted.length; i++) {
    const currentChord = sorted[i];
    const currentStart = Math.min(Math.max(0, currentChord.offset), text.length);

    let nextStart = text.length;
    if (i + 1 < sorted.length) {
      nextStart = Math.min(Math.max(currentStart, sorted[i + 1].offset), text.length);
    }

    segments.push({
      id: currentChord.id ? `seg-${currentChord.id}` : `seg-chord-${i}`,
      chord: currentChord,
      text: text.slice(currentStart, nextStart),
      startOffset: currentStart,
      endOffset: nextStart,
    });
  }

  return segments;
}

/**
 * Extract all word boundaries with start and end character offsets.
 */
export function findWordBoundaries(text: string): WordBoundary[] {
  const boundaries: WordBoundary[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    boundaries.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return boundaries;
}

/**
 * Snap a character offset to the start of the word enclosing it (or nearest word).
 */
export function snapToWordStart(text: string, offset: number): number {
  if (!text || offset <= 0) return 0;
  if (offset >= text.length) return text.length;

  const words = findWordBoundaries(text);
  if (words.length === 0) return 0;

  for (const w of words) {
    if (offset >= w.start && offset <= w.end) {
      return w.start;
    }
  }

  // If in whitespace between words, snap to next word or nearest word
  for (let i = 0; i < words.length; i++) {
    if (words[i].start > offset) {
      return words[i].start;
    }
  }

  return words[words.length - 1].start;
}

/**
 * Calculate the previous or next word's start offset relative to a current offset.
 */
export function getAdjacentWordOffset(
  text: string,
  currentOffset: number,
  direction: 'prev' | 'next'
): number {
  const words = findWordBoundaries(text);
  if (words.length === 0) return 0;

  if (direction === 'prev') {
    const prevWords = words.filter((w) => w.start < currentOffset);
    if (prevWords.length > 0) {
      return prevWords[prevWords.length - 1].start;
    }
    return 0;
  } else {
    const nextWords = words.filter((w) => w.start > currentOffset);
    if (nextWords.length > 0) {
      return nextWords[0].start;
    }
    return Math.max(0, text.length - 1);
  }
}
