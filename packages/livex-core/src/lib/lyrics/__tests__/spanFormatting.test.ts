import { describe, it, expect } from 'vitest';
import {
  applyFormatToSpans,
  compactSpans,
  isSelectionBold,
  toggleBoldOnSelection,
  setColorOnSelection,
  getCharacterColor,
  getCharacterBold,
} from '../spanFormatting';
import type { LyricTextSpan } from '../../../types/lyrics';

describe('Lyrics Span Formatting Utilities', () => {
  it('correctly resolves character color and bold across formatted spans', () => {
    const spans: LyricTextSpan[] = [
      { text: 'Lead: ', format: { bold: true, color: '#3b82f6' } },
      { text: 'I see a silhouette' },
      { text: ' of a man', format: { color: '#ec4899' } },
    ];

    // Character 0 ('L') is inside the first span
    expect(getCharacterColor(spans, 0)).toBe('#3b82f6');
    expect(getCharacterBold(spans, 0)).toBe(true);

    // Character 8 ('s' in silhouette) is inside the unformatted second span
    expect(getCharacterColor(spans, 8)).toBeUndefined();
    expect(getCharacterBold(spans, 8)).toBe(false);

    // Character 26 ('f' in of a man) is inside the third span
    expect(getCharacterColor(spans, 26)).toBe('#ec4899');
    expect(getCharacterBold(spans, 26)).toBe(false);

    // Negative or beyond bounds returns undefined / false
    expect(getCharacterColor(spans, 999)).toBeUndefined();
    expect(getCharacterBold(spans, 999)).toBe(false);
  });

  it('applies bold to a single word in a line', () => {
    const text = 'This is important text';
    const start = text.indexOf('important');
    const end = start + 'important'.length;

    const result = applyFormatToSpans(undefined, text, start, end, { bold: true });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: 'This is ' });
    expect(result[1]).toEqual({ text: 'important', format: { bold: true } });
    expect(result[2]).toEqual({ text: ' text' });
  });

  it('applies color to a sub-word character range', () => {
    const text = 'Highlighting words';
    // Select "light" inside "Highlighting"
    const start = 4;
    const end = 9;

    const result = setColorOnSelection(undefined, text, start, end, '#3b82f6');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: 'High' });
    expect(result[1]).toEqual({ text: 'light', format: { color: '#3b82f6' } });
    expect(result[2]).toEqual({ text: 'ing words' });
  });

  it('toggles bold off when an already bold range is selected', () => {
    const initialSpans: LyricTextSpan[] = [
      { text: 'Hello ' },
      { text: 'World', format: { bold: true } },
    ];
    const fullText = 'Hello World';
    const start = 6;
    const end = 11;

    expect(isSelectionBold(initialSpans, fullText, start, end)).toBe(true);

    const toggled = toggleBoldOnSelection(initialSpans, fullText, start, end);
    expect(toggled).toHaveLength(1);
    expect(toggled[0]).toEqual({ text: 'Hello World' }); // Compacted together!
  });

  it('preserves surrounding formatting and merges adjacent identical spans', () => {
    const initialSpans: LyricTextSpan[] = [
      { text: 'Start ', format: { bold: true } },
      { text: 'Middle' },
      { text: ' End', format: { color: '#10b981' } },
    ];
    const fullText = 'Start Middle End';

    // Apply color to Middle
    const start = 6;
    const end = 12;
    const result = setColorOnSelection(initialSpans, fullText, start, end, '#10b981');

    // Middle and End now both have color: #10b981, so they should compact together!
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ text: 'Start ', format: { bold: true } });
    expect(result[1]).toEqual({ text: 'Middle End', format: { color: '#10b981' } });
  });
});
