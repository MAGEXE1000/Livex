import { describe, it, expect } from 'vitest';
import {
  splitLineIntoSegments,
  findWordBoundaries,
  snapToWordStart,
  getAdjacentWordOffset,
  shiftChordOffsets,
} from '../lyricSegments';
import type { LyricChordPlacement } from '../../../types/lyrics';

describe('lyricSegments', () => {
  describe('splitLineIntoSegments', () => {
    it('returns a single segment when no chords are attached', () => {
      const segs = splitLineIntoSegments('Hello world');
      expect(segs).toHaveLength(1);
      expect(segs[0].text).toBe('Hello world');
      expect(segs[0].chord).toBeUndefined();
    });

    it('handles line with chords at beginning, middle, and end', () => {
      const text = 'Waiting in a car, waiting for a ride in the dark';
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'Bm', offset: 0 },
        { id: 'c2', chord: 'D', offset: 13 },
        { id: 'c3', chord: 'G', offset: 44 },
      ];

      const segs = splitLineIntoSegments(text, chords);
      expect(segs).toHaveLength(3);

      expect(segs[0].chord?.chord).toBe('Bm');
      expect(segs[0].text).toBe('Waiting in a ');
      expect(segs[0].startOffset).toBe(0);

      expect(segs[1].chord?.chord).toBe('D');
      expect(segs[1].text).toBe('car, waiting for a ride in the ');
      expect(segs[1].startOffset).toBe(13);

      expect(segs[2].chord?.chord).toBe('G');
      expect(segs[2].text).toBe('dark');
      expect(segs[2].startOffset).toBe(44);
    });

    it('creates a leading segment if the first chord starts after index 0', () => {
      const text = 'Estoy parado sobre la muralla';
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'Bm', offset: 6 },
      ];

      const segs = splitLineIntoSegments(text, chords);
      expect(segs).toHaveLength(2);

      // Leading segment without chord
      expect(segs[0].chord).toBeUndefined();
      expect(segs[0].text).toBe('Estoy ');
      expect(segs[0].startOffset).toBe(0);

      // Second segment with chord
      expect(segs[1].chord?.chord).toBe('Bm');
      expect(segs[1].text).toBe('parado sobre la muralla');
      expect(segs[1].startOffset).toBe(6);
    });

    it('handles instrumental line with chords and empty text', () => {
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'Bm', offset: 0 },
        { id: 'c2', chord: 'D', offset: 4 },
      ];

      const segs = splitLineIntoSegments('', chords);
      expect(segs).toHaveLength(2);
      expect(segs[0].chord?.chord).toBe('Bm');
      expect(segs[1].chord?.chord).toBe('D');
    });
  });

  describe('findWordBoundaries and navigation', () => {
    it('detects word boundaries correctly', () => {
      const text = 'Estoy parado sobre la muralla';
      const words = findWordBoundaries(text);
      expect(words).toHaveLength(5);
      expect(words[0]).toEqual({ word: 'Estoy', start: 0, end: 5 });
      expect(words[1]).toEqual({ word: 'parado', start: 6, end: 12 });
      expect(words[2]).toEqual({ word: 'sobre', start: 13, end: 18 });
      expect(words[3]).toEqual({ word: 'la', start: 19, end: 21 });
      expect(words[4]).toEqual({ word: 'muralla', start: 22, end: 29 });
    });

    it('snaps offset to word start', () => {
      const text = 'Estoy parado sobre la muralla';
      expect(snapToWordStart(text, 2)).toBe(0); // Inside "Estoy"
      expect(snapToWordStart(text, 8)).toBe(6); // Inside "parado"
      expect(snapToWordStart(text, 6)).toBe(6); // At start of "parado"
      expect(snapToWordStart(text, 25)).toBe(22); // Inside "muralla"
    });

    it('calculates adjacent word offsets for chord repositioning', () => {
      const text = 'Estoy parado sobre la muralla';
      expect(getAdjacentWordOffset(text, 6, 'next')).toBe(13); // From "parado" to "sobre"
      expect(getAdjacentWordOffset(text, 13, 'prev')).toBe(6); // From "sobre" back to "parado"
      expect(getAdjacentWordOffset(text, 6, 'prev')).toBe(0); // From "parado" back to "Estoy"
    });
  });

  describe('shiftChordOffsets', () => {
    it('returns original chords if chords is empty or undefined', () => {
      expect(shiftChordOffsets('old', 'new', undefined)).toBeUndefined();
      expect(shiftChordOffsets('old', 'new', [])).toEqual([]);
    });

    it('returns original chords if text is unchanged', () => {
      const chords: LyricChordPlacement[] = [{ id: 'c1', chord: 'G', offset: 5 }];
      expect(shiftChordOffsets('Hello world', 'Hello world', chords)).toEqual(chords);
    });

    it('preserves chord offsets before the insertion point and shifts chords after', () => {
      const oldText = 'Here we stand';
      const newText = 'Here we all stand'; // inserted " all" (4 chars) at offset 7
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'G', offset: 0 },
        { id: 'c2', chord: 'C', offset: 8 }, // was on 'stand'
      ];

      const shifted = shiftChordOffsets(oldText, newText, chords)!;
      expect(shifted).toHaveLength(2);
      expect(shifted[0].offset).toBe(0); // G remains on 'Here' (0)
      expect(shifted[1].offset).toBe(12); // C shifted to 12 ('stand' in 'Here we all stand')
    });

    it('shifts chords back when characters are deleted/backspaced', () => {
      const oldText = 'Here we all stand';
      const newText = 'Here we stand'; // deleted "all " (4 chars) starting at offset 8
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'G', offset: 0 },
        { id: 'c2', chord: 'C', offset: 12 }, // was on 'stand'
      ];

      const shifted = shiftChordOffsets(oldText, newText, chords)!;
      expect(shifted).toHaveLength(2);
      expect(shifted[0].offset).toBe(0);
      expect(shifted[1].offset).toBe(8); // C shifted back to 8 ('stand')
    });

    it('anchors chord safely if the word it was attached to was deleted', () => {
      const oldText = 'Here we all stand';
      const newText = 'Here we stand'; // deleted "all "
      const chords: LyricChordPlacement[] = [
        { id: 'c-mid', chord: 'Am', offset: 8 }, // was on 'all'
      ];

      const shifted = shiftChordOffsets(oldText, newText, chords)!;
      expect(shifted).toHaveLength(1);
      expect(shifted[0].offset).toBe(8); // Clamped safely to the edit boundary
    });

    it('clamps chords to valid string bounds without crashing on total text replacement', () => {
      const oldText = 'A very long lyric sentence with lots of words';
      const newText = 'Short';
      const chords: LyricChordPlacement[] = [
        { id: 'c1', chord: 'Em', offset: 35 },
      ];

      const shifted = shiftChordOffsets(oldText, newText, chords)!;
      expect(shifted).toHaveLength(1);
      expect(shifted[0].offset).toBeLessThanOrEqual(newText.length);
      expect(shifted[0].offset).toBeGreaterThanOrEqual(0);
    });
  });
});
