import type { LyricSpanFormat, LyricTextSpan } from '../../types/lyrics';

const sameFormat = (a?: LyricSpanFormat, b?: LyricSpanFormat): boolean =>
  a?.bold === b?.bold &&
  a?.italic === b?.italic &&
  a?.underline === b?.underline &&
  a?.color === b?.color &&
  a?.backgroundColor === b?.backgroundColor &&
  a?.vocalRole?.type === b?.vocalRole?.type &&
  a?.vocalRole?.label === b?.vocalRole?.label &&
  a?.vocalRole?.color === b?.vocalRole?.color;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/**
 * Re-aligns text-segmented spans after a plain-text edit.
 *
 * Invariant on return: `spans.map(s => s.text).join('') === newText`.
 * Typing at a span boundary extends the span that ends there (so bold continues
 * when typing at the end of a bold word). Downstream spans keep their formatting
 * and shift automatically because they are text-segmented.
 */
export function reconcileSpansOnTextEdit(
  spans: LyricTextSpan[] | undefined,
  oldText: string,
  newText: string,
): LyricTextSpan[] | undefined {
  if (!spans || spans.length === 0 || oldText === newText) return spans;

  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length);
  while (prefix < maxPrefix && oldText.charCodeAt(prefix) === newText.charCodeAt(prefix)) prefix++;

  let suffix = 0;
  const maxSuffix = Math.min(oldText.length - prefix, newText.length - prefix);
  while (
    suffix < maxSuffix &&
    oldText.charCodeAt(oldText.length - 1 - suffix) === newText.charCodeAt(newText.length - 1 - suffix)
  ) {
    suffix++;
  }

  const delStart = prefix;
  const delEnd = oldText.length - suffix;
  const inserted = newText.slice(prefix, newText.length - suffix);

  // The span that receives the insertion: first span whose end >= delStart.
  let cursor = 0;
  let host = spans.length - 1;
  for (let i = 0; i < spans.length; i++) {
    cursor += spans[i].text.length;
    if (delStart <= cursor) {
      host = i;
      break;
    }
  }

  const out: LyricTextSpan[] = [];
  let start = 0;
  spans.forEach((span, i) => {
    const len = span.text.length;
    const before = span.text.slice(0, clamp(delStart - start, 0, len));
    const after = span.text.slice(clamp(delEnd - start, 0, len));
    start += len;
    const text = i === host ? before + inserted + after : before + after;
    if (text.length > 0) out.push({ text, format: span.format });
  });

  // Merge adjacent spans with identical formatting.
  const merged: LyricTextSpan[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && sameFormat(last.format, s.format)) {
      last.text += s.text;
    } else {
      merged.push({ text: s.text, format: s.format });
    }
  }

  // Defensive: never persist spans that disagree with line.text.
  if (merged.map((s) => s.text).join('') !== newText) {
    return newText.length > 0 ? [{ text: newText, format: spans[0].format }] : undefined;
  }
  return merged.length > 0 ? merged : undefined;
}
