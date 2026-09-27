import type { LyricTextSpan, LyricSpanFormat, SongLyricLine } from '../../types/lyrics';

/**
 * Ensures a line has a valid spans array.
 * If spans are empty or absent, converts line.text into a single unformatted span.
 */
export function getLineSpans(line: SongLyricLine): LyricTextSpan[] {
  if (line.spans && line.spans.length > 0) {
    return line.spans;
  }
  return [{ text: line.text || '' }];
}

/**
 * Checks if two span formats are identical.
 */
export function areFormatsEqual(a?: LyricSpanFormat, b?: LyricSpanFormat): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.italic) === Boolean(b.italic) &&
    Boolean(a.underline) === Boolean(b.underline) &&
    (a.color || '') === (b.color || '')
  );
}

/**
 * Merges adjacent spans with identical formatting to keep the data model minimal and fast.
 */
export function compactSpans(spans: LyricTextSpan[]): LyricTextSpan[] {
  if (spans.length <= 1) return spans.filter((s) => s.text.length > 0);

  const compacted: LyricTextSpan[] = [];
  let current: LyricTextSpan | null = null;

  for (const span of spans) {
    if (!span.text) continue;

    if (!current) {
      current = { ...span };
      continue;
    }

    if (areFormatsEqual(current.format, span.format)) {
      current.text += span.text;
    } else {
      compacted.push(current);
      current = { ...span };
    }
  }

  if (current && current.text.length > 0) {
    compacted.push(current);
  }

  return compacted.length > 0 ? compacted : [{ text: '' }];
}

/**
 * Applies a format patch to a specific character range [startOffset, endOffset] of a line.
 * Supports character, word, phrase, and multi-word granularity.
 */
export function applyFormatToSpans(
  spans: LyricTextSpan[] | undefined,
  fullText: string,
  startOffset: number,
  endOffset: number,
  patch: Partial<LyricSpanFormat>
): LyricTextSpan[] {
  const safeStart = Math.max(0, Math.min(startOffset, endOffset));
  const safeEnd = Math.min(fullText.length, Math.max(startOffset, endOffset));

  if (safeStart === safeEnd) {
    return spans && spans.length > 0 ? spans : [{ text: fullText }];
  }

  const initialSpans: LyricTextSpan[] =
    spans && spans.length > 0 ? spans : [{ text: fullText }];

  const nextSpans: LyricTextSpan[] = [];
  let currentOffset = 0;

  for (const span of initialSpans) {
    const spanLength = span.text.length;
    const spanEnd = currentOffset + spanLength;

    if (spanEnd <= safeStart || currentOffset >= safeEnd) {
      // Entirely outside the selection range
      nextSpans.push(span);
    } else {
      // Span overlaps with [safeStart, safeEnd]
      const overlapStart = Math.max(currentOffset, safeStart);
      const overlapEnd = Math.min(spanEnd, safeEnd);

      const beforeLength = overlapStart - currentOffset;
      const insideLength = overlapEnd - overlapStart;
      const afterLength = spanEnd - overlapEnd;

      // 1. Part before the selection
      if (beforeLength > 0) {
        nextSpans.push({
          text: span.text.slice(0, beforeLength),
          format: span.format ? { ...span.format } : undefined,
        });
      }

      // 2. Part inside the selection (apply the patch)
      if (insideLength > 0) {
        const mergedFormat: LyricSpanFormat = {
          ...(span.format || {}),
          ...patch,
        };

        // Clean up undefined / false / empty values
        if (!mergedFormat.bold) delete mergedFormat.bold;
        if (!mergedFormat.italic) delete mergedFormat.italic;
        if (!mergedFormat.underline) delete mergedFormat.underline;
        if (!mergedFormat.color) delete mergedFormat.color;

        nextSpans.push({
          text: span.text.slice(beforeLength, beforeLength + insideLength),
          format: Object.keys(mergedFormat).length > 0 ? mergedFormat : undefined,
        });
      }

      // 3. Part after the selection
      if (afterLength > 0) {
        nextSpans.push({
          text: span.text.slice(beforeLength + insideLength),
          format: span.format ? { ...span.format } : undefined,
        });
      }
    }

    currentOffset = spanEnd;
  }

  return compactSpans(nextSpans);
}

/**
 * Checks whether the entire selection [startOffset, endOffset] is currently bold.
 */
export function isSelectionBold(
  spans: LyricTextSpan[] | undefined,
  fullText: string,
  startOffset: number,
  endOffset: number
): boolean {
  const safeStart = Math.max(0, Math.min(startOffset, endOffset));
  const safeEnd = Math.min(fullText.length, Math.max(startOffset, endOffset));

  if (safeStart === safeEnd) return false;

  const currentSpans = spans && spans.length > 0 ? spans : [{ text: fullText }];
  let currentOffset = 0;
  let hasAnySelected = false;

  for (const span of currentSpans) {
    const spanEnd = currentOffset + span.text.length;

    if (spanEnd > safeStart && currentOffset < safeEnd) {
      hasAnySelected = true;
      if (!span.format?.bold) {
        return false;
      }
    }
    currentOffset = spanEnd;
  }

  return hasAnySelected;
}

/**
 * Toggles bold formatting on the selected range.
 */
export function toggleBoldOnSelection(
  spans: LyricTextSpan[] | undefined,
  fullText: string,
  startOffset: number,
  endOffset: number
): LyricTextSpan[] {
  const currentlyBold = isSelectionBold(spans, fullText, startOffset, endOffset);
  return applyFormatToSpans(spans, fullText, startOffset, endOffset, { bold: !currentlyBold });
}

/**
 * Sets color formatting on the selected range.
 */
export function setColorOnSelection(
  spans: LyricTextSpan[] | undefined,
  fullText: string,
  startOffset: number,
  endOffset: number,
  color: string
): LyricTextSpan[] {
  return applyFormatToSpans(spans, fullText, startOffset, endOffset, { color });
}
