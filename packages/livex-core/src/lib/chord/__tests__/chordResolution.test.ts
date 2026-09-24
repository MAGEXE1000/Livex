import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveChordItem,
  resolveChordProgression,
  createSongPresetFromProgression,
  importProgressionToChordex,
} from '../chordResolution';
import { normalizeChordName } from '../../../data/chords';
import { useChordStore } from '../../../store/useChordStore';
import { useNavigationStore } from '../../../store/useNavigationStore';
import type { ChordProgressionRecommendation } from '../../../types/assistant';
import type { GuitarChordData } from '../../../data/chords';

describe('Chord Resolution & Progression Architecture', () => {
  beforeEach(() => {
    // Reset stores
    useChordStore.setState({
      presets: [],
      activePresetId: null,
    });
    useNavigationStore.setState({
      history: [{ app: 'hub' }],
    });
  });

  describe('Parentheses alteration preservation in normalizeChordName', () => {
    it('unwraps musical alteration parentheses while preserving alterations', () => {
      expect(normalizeChordName('G7(#9)')).toBe('G7#9');
      expect(normalizeChordName('C(add9)')).toBe('Cadd9');
      expect(normalizeChordName('A7(b9)')).toBe('A7b9');
      expect(normalizeChordName('C7(#11)')).toBe('C7#11');
      expect(normalizeChordName('F#m7(b5)')).toBe('F#ø7');
    });

    it('strips commentary and section headers in parentheses or brackets', () => {
      expect(normalizeChordName('G7(no5)')).toBe('G7');
      expect(normalizeChordName('Em(omit3)')).toBe('Em');
      expect(normalizeChordName('[Verse 1] C')).toBe('C');
      expect(normalizeChordName('Am (chorus)')).toBe('Am');
    });
  });

  describe('resolveChordItem', () => {
    it('resolves standard major and minor chords with authentic guitar fingerings', () => {
      const c = resolveChordItem('C', 'I');
      expect(c.resolved).toBe(true);
      expect(c.name).toBe('C');
      expect(c.romanNumeral).toBe('I');
      expect(c.guitarData).toBeDefined();
      expect(c.guitarData?.frets).toEqual([-1, 3, 2, 0, 1, 0]);

      const am = resolveChordItem('Am', 'vi');
      expect(am.resolved).toBe(true);
      expect(am.name).toBe('Am');
      expect(am.guitarData?.frets).toEqual([-1, 0, 2, 2, 1, 0]);
    });

    it('resolves jazz and extended chords', () => {
      const dm7 = resolveChordItem('Dm7', 'ii');
      expect(dm7.resolved).toBe(true);
      expect(dm7.name).toBe('Dm7');
      expect(dm7.guitarData).toBeDefined();

      const g7 = resolveChordItem('G7', 'V');
      expect(g7.resolved).toBe(true);
      expect(g7.guitarData).toBeDefined();

      const cmaj7 = resolveChordItem('Cmaj7', 'I');
      expect(cmaj7.resolved).toBe(true);
      expect(cmaj7.guitarData).toBeDefined();

      const a7 = resolveChordItem('A7', 'VI');
      expect(a7.resolved).toBe(true);
      expect(a7.guitarData).toBeDefined();
    });

    it('resolves altered and complex chords (G7#9, G7(#9), F#m7b5, B7b9, Cadd9, Dsus4)', () => {
      // G7#9 direct
      const g7sharp9 = resolveChordItem('G7#9');
      expect(g7sharp9.resolved).toBe(true);
      expect(g7sharp9.chordId).toBe('G-7s9');
      expect(g7sharp9.guitarData).toBeDefined();

      // G7(#9) with parentheses notation
      const g7sharp9Paren = resolveChordItem('G7(#9)');
      expect(g7sharp9Paren.resolved).toBe(true);
      expect(g7sharp9Paren.chordId).toBe('G-7s9');
      expect(g7sharp9Paren.guitarData).toBeDefined();

      // Half-diminished
      const fsm7b5 = resolveChordItem('F#m7b5');
      expect(fsm7b5.resolved).toBe(true);
      expect(fsm7b5.guitarData).toBeDefined();

      // Altered flat 9
      const b7b9 = resolveChordItem('B7b9');
      expect(b7b9.resolved).toBe(true);
      expect(b7b9.guitarData).toBeDefined();

      // Added 9th
      const cadd9 = resolveChordItem('Cadd9');
      expect(cadd9.resolved).toBe(true);
      expect(cadd9.guitarData).toBeDefined();

      // Sus4
      const dsus4 = resolveChordItem('Dsus4');
      expect(dsus4.resolved).toBe(true);
      expect(dsus4.guitarData).toBeDefined();
    });

    it('resolves slash chords accurately', () => {
      const gb = resolveChordItem('G/B');
      expect(gb.resolved).toBe(true);
      expect(gb.guitarData?.frets).toEqual([-1, 2, 0, 0, 0, 3]);

      const ce = resolveChordItem('C/E');
      expect(ce.resolved).toBe(true);
      expect(ce.guitarData?.frets).toEqual([0, 3, 2, 0, 1, 0]);
    });

    it('gracefully handles unresolvable or obscure chords without crashing or inventing fake frets', () => {
      const obscure = resolveChordItem('X99UnknownNonexistentChord', 'VII');
      expect(obscure.resolved).toBe(false);
      expect(obscure.guitarData).toBeNull();
      expect(obscure.name).toBe('X99UnknownNonexistentChord');
      expect(obscure.romanNumeral).toBe('VII');
      expect(obscure.isCustomVoicing).toBe(false);
    });

    it('respects and preserves custom voicings when provided', () => {
      const customVoicing: GuitarChordData = {
        frets: [8, 10, 10, 9, 8, 8],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 8, fromString: 6, toString: 1 }],
        baseFret: 8,
      };

      const customC = resolveChordItem('C', 'I', customVoicing);
      expect(customC.resolved).toBe(true);
      expect(customC.isCustomVoicing).toBe(true);
      expect(customC.guitarData).toEqual(customVoicing);
      expect(customC.guitarData?.baseFret).toBe(8);
    });
  });

  describe('resolveChordProgression', () => {
    it('resolves common major progression: C - G - Am - F', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'C',
        mode: 'Major',
        chords: ['C', 'G', 'Am', 'F'],
        romanNumerals: ['I', 'V', 'vi', 'IV'],
      };

      const result = resolveChordProgression(rec);
      expect(result.allResolved).toBe(true);
      expect(result.resolvedCount).toBe(4);
      expect(result.totalCount).toBe(4);
      expect(result.chords.map((c) => c.name)).toEqual(['C', 'G', 'Am', 'F']);
    });

    it('resolves common minor progression: Am - F - C - G', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'A',
        mode: 'Minor',
        chords: ['Am', 'F', 'C', 'G'],
        romanNumerals: ['i', 'VI', 'III', 'VII'],
      };

      const result = resolveChordProgression(rec);
      expect(result.allResolved).toBe(true);
      expect(result.resolvedCount).toBe(4);
    });

    it('resolves jazz extended progression: Dm7 - G7 - Cmaj7 - A7', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'C',
        mode: 'Major',
        chords: ['Dm7', 'G7', 'Cmaj7', 'A7'],
        romanNumerals: ['ii7', 'V7', 'Imaj7', 'VI7'],
        tempo: 128,
        timeSignature: '4/4',
      };

      const result = resolveChordProgression(rec);
      expect(result.allResolved).toBe(true);
      expect(result.tempo).toBe(128);
      expect(result.timeSignature).toBe('4/4');
    });

    it('resolves long progression (8 chords)', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'C',
        chords: ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm7', 'G7'],
        romanNumerals: ['I', 'V6', 'vi', 'iii', 'IV', 'I6', 'ii7', 'V7'],
      };

      const result = resolveChordProgression(rec);
      expect(result.totalCount).toBe(8);
      expect(result.allResolved).toBe(true);
      expect(result.chords.every((c) => c.resolved && c.guitarData !== null)).toBe(true);
    });

    it('handles mixed progressions with one unknown chord gracefully', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'C',
        chords: ['C', 'Am', 'XYZ123', 'F'],
        romanNumerals: ['I', 'vi', '?', 'IV'],
      };

      const result = resolveChordProgression(rec);
      expect(result.totalCount).toBe(4);
      expect(result.resolvedCount).toBe(3);
      expect(result.allResolved).toBe(false);
      expect(result.chords[2].resolved).toBe(false);
      expect(result.chords[2].name).toBe('XYZ123');
      expect(result.chords[2].guitarData).toBeNull();
    });
  });

  describe('Import to Chordex Integration', () => {
    it('creates a valid song preset in Chordex store prepopulated with chords and section', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'C',
        mode: 'Major',
        chords: ['C', 'G', 'Am', 'F'],
        romanNumerals: ['I', 'V', 'vi', 'IV'],
        tempo: 110,
        timeSignature: '4/4',
        feel: 'Pop Ballad',
        description: 'Classic pop emotional ballad progression',
      };

      const presetId = createSongPresetFromProgression(rec, { title: 'Pop Ballad in C' });
      expect(presetId).toBeDefined();

      const store = useChordStore.getState();
      const createdPreset = store.presets.find((p) => p.id === presetId);

      expect(createdPreset).toBeDefined();
      expect(createdPreset?.name).toBe('Pop Ballad in C');
      expect(createdPreset?.artist).toBe('Livex AI');
      expect(createdPreset?.key).toBe('C');
      expect(createdPreset?.bpm).toBe(110);
      expect(createdPreset?.chords).toEqual(['C', 'G', 'Am', 'F']);
      expect(createdPreset?.sections).toHaveLength(1);
      expect(createdPreset?.sections?.[0].name).toBe('Progression');
      expect(createdPreset?.sections?.[0].chords).toEqual(['C', 'G', 'Am', 'F']);
      expect(createdPreset?.notes).toContain('Feel: Pop Ballad');
      expect(createdPreset?.notes).toContain('Time: 4/4');
    });

    it('importProgressionToChordex sets active preset and navigates to Chordex song editor', () => {
      const rec: ChordProgressionRecommendation = {
        key: 'D',
        mode: 'Major',
        chords: ['D', 'A', 'Bm', 'G'],
        tempo: 120,
      };

      const presetId = importProgressionToChordex(rec);
      expect(presetId).toBeDefined();

      // Verifies active preset is set in store
      expect(useChordStore.getState().activePresetId).toBe(presetId);

      // Verifies navigation route was dispatched
      const navHistory = useNavigationStore.getState().history;
      const currentRoute = navHistory[navHistory.length - 1];

      expect(currentRoute.app).toBe('chordex');
      expect(currentRoute.page).toBe('songs');
      expect((currentRoute as any).subView).toBe('editor');
      expect((currentRoute as any).id).toBe(presetId);
    });
  });
});
