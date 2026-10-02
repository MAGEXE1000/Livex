import { describe, it, expect } from 'vitest';
import {
  applyFormatToSpans,
  setRoleOnSelection,
  clearFormattingOnSelection,
  getCharacterColor,
  getCharacterBold,
  getCharacterBackgroundColor,
  getCharacterVocalRole,
  toggleBoldOnSelection,
} from '../spanFormatting';
import type { VocalRoleAnnotation } from '../../../types/lyrics';

describe('Span Formatting and Word-Level Vocal Role Highlighting', () => {
  const harmonyRole: VocalRoleAnnotation = {
    type: 'harmony',
    label: 'Harmony',
    color: '#f59e0b',
  };

  it('assigns role and highlight only to the targeted word/character range', () => {
    const text = 'On a dark desert highway';
    // Select "dark desert" (indices 5 to 16)
    const spans = setRoleOnSelection(undefined, text, 5, 16, harmonyRole);

    expect(spans).toHaveLength(3);
    expect(spans[0].text).toBe('On a ');
    expect(spans[0].format).toBeUndefined();

    expect(spans[1].text).toBe('dark desert');
    expect(spans[1].format?.vocalRole).toEqual(harmonyRole);
    expect(spans[1].format?.backgroundColor).toBe('#f59e0b28');
    expect(spans[1].format?.color).toBe('#f59e0b');

    expect(spans[2].text).toBe(' highway');
    expect(spans[2].format).toBeUndefined();
  });

  it('retrieves character-level role and background color correctly', () => {
    const text = 'Lead line (backing vocals)';
    const backingRole: VocalRoleAnnotation = {
      type: 'backing',
      label: 'Backing',
      color: '#3b82f6',
    };

    // Apply backing role only to "(backing vocals)" (indices 10 to 26)
    const spans = setRoleOnSelection(undefined, text, 10, 26, backingRole);

    expect(getCharacterVocalRole(spans, 2)).toBeUndefined();
    expect(getCharacterBackgroundColor(spans, 2)).toBeUndefined();

    expect(getCharacterVocalRole(spans, 12)).toEqual(backingRole);
    expect(getCharacterBackgroundColor(spans, 12)).toBe('#3b82f628');
    expect(getCharacterColor(spans, 12)).toBe('#3b82f6');
  });

  it('allows toggling bold on a specific word without affecting role highlights', () => {
    const text = 'Sing this word loud';
    // Highlight "word" with harmony role (indices 10 to 14)
    let spans = setRoleOnSelection(undefined, text, 10, 14, harmonyRole);
    // Make "word" bold
    spans = toggleBoldOnSelection(spans, text, 10, 14);

    expect(getCharacterBold(spans, 11)).toBe(true);
    expect(getCharacterVocalRole(spans, 11)).toEqual(harmonyRole);
  });

  it('clears formatting only on the specified selection', () => {
    const text = 'Keep this part highlighted and clear this';
    let spans = setRoleOnSelection(undefined, text, 0, text.length, harmonyRole);

    // Clear only "clear this" (indices 31 to 41)
    spans = clearFormattingOnSelection(spans, text, 31, 41);

    expect(getCharacterVocalRole(spans, 5)).toEqual(harmonyRole);
    expect(getCharacterVocalRole(spans, 35)).toBeUndefined();
    expect(getCharacterBackgroundColor(spans, 35)).toBeUndefined();
  });
});
