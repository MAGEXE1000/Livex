import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveChordItem,
  resolveChordProgression,
  createSongPresetFromProgression,
  importProgressionToChordex,
  extractChordProgressionFromText,
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

  describe('extractChordProgressionFromText - Musical Context & Structured Generation', () => {
    it('Case 1: extracts melancholic progression in C major with Roman numerals and explanation', () => {
      const prompt = 'Give me a melancholic progression in C major.';
      const responseText = `### Melancholic C Major Progression

**Key:** C Major | **Tempo:** 72 BPM | **Feel:** Bittersweet, reflective

**Progression:**
\`C\` → \`Em\` → \`F\` → \`Fm\`

**Harmonic Analysis:**
\`I\` → \`iii\` → \`IV\` → \`iv\`

**Why It Works:**
The shift from IV (\`F\`) to minor iv (\`Fm\`) introduces the minor sixth degree (Ab), creating a classic minor plagal cadence that resolves gently down to the fifth (G) of the tonic \`C\`.`;

      const rec = extractChordProgressionFromText(responseText, prompt);
      expect(rec).not.toBeNull();
      expect(rec?.key).toBe('C');
      expect(rec?.mode).toBe('Major');
      expect(rec?.mood).toBe('Melancholic');
      expect(rec?.tempo).toBe(72);
      expect(rec?.chords).toEqual(['C', 'Em', 'F', 'Fm']);
      expect(rec?.romanNumerals).toEqual(['I', 'iii', 'IV', 'iv']);
      expect(rec?.harmonicContext).toBe('I → iii → IV → iv');
      expect(rec?.explanation).toContain('minor plagal cadence');
      expect(rec?.title).toBe('Melancholic C Major Progression');

      // Verify that canonical Chordex resolution resolves all chords
      const resolved = resolveChordProgression(rec!);
      expect(resolved.allResolved).toBe(true);
      expect(resolved.resolvedCount).toBe(4);
      expect(resolved.chords[3].name).toBe('Fm');
      expect(resolved.chords[3].guitarData).not.toBeNull();
    });

    it('Case 2: extracts neo-soul progression in D with jazz extensions and secondary dominant', () => {
      const prompt = 'Give me a neo-soul progression in D.';
      const responseText = `### Lush Neo-Soul Progression in D

**Key:** D | **Mode:** Major | **Tempo:** 84 BPM | **Feel:** Laid-back swing

**Progression:**
\`Em9\` → \`A13\` → \`F#m7\` → \`B7b9\`

**Harmonic Analysis:**
\`ii9\` → \`V13\` → \`iii7\` → \`VI7(b9)\`

**Why It Works:**
A smooth jazz turnaround with 9th and 13th extensions, using \`B7b9\` as an altered secondary dominant to resolve cyclically back into the \`Em9\` tonic minor.`;

      const rec = extractChordProgressionFromText(responseText, prompt);
      expect(rec).not.toBeNull();
      expect(rec?.key).toBe('D');
      expect(rec?.mode).toBe('Major');
      expect(rec?.genre).toBe('Neo-Soul');
      expect(rec?.tempo).toBe(84);
      expect(rec?.chords).toEqual(['Em9', 'A13', 'F#m7', 'B7b9']);
      expect(rec?.romanNumerals).toEqual(['ii9', 'V13', 'iii7', 'VI7(b9)']);
      expect(rec?.explanation).toContain('smooth jazz turnaround');

      const resolved = resolveChordProgression(rec!);
      expect(resolved.allResolved).toBe(true);
      expect(resolved.resolvedCount).toBe(4);
      expect(resolved.chords[0].name).toBe('Em9');
      expect(resolved.chords[0].guitarData).toBeDefined();
      expect(resolved.chords[1].name).toBe('A13');
      expect(resolved.chords[1].guitarData).toBeDefined();
    });

    it('Case 3: extracts reference-inspired original progression without copying copyrighted work', () => {
      const prompt = 'Analyze the harmonic characteristics of Radiohead / Pyramid Song and create a new progression inspired by those characteristics without copying it.';
      const responseText = `### Modal Tension Progression (Inspired by Radiohead)

**Harmonic Characteristics of Reference:**
Radiohead's "Pyramid Song" famously avoids clear functional cadence by hovering in F# minor / Phrygian with swing phrasing, using dark modal color chords like \`F#m\`, \`Gmaj7\`, and \`A\`, leaning heavily on the flattened second degree (Phrygian) and pedal ambiguity.

**New Inspired Progression:**
Here is an original progression inspired by that modal tension and dark harmonic oscillation, without reproducing the composition:

**Key:** F# | **Mode:** Phrygian | **Tempo:** 68 BPM | **Feel:** Haunting, suspended

**Progression:**
\`F#m\` → \`Gmaj7\` → \`Em\` → \`F#m\`

**Harmonic Analysis:**
\`i\` → \`bIImaj7\` → \`vii\` → \`i\`

**Why It Works:**
The \`bIImaj7\` (\`Gmaj7\`) provides the quintessential Phrygian half-step contrast against the tonic \`F#m\`, creating immediate harmonic mystery without resolving in a standard functional V-i manner.`;

      const rec = extractChordProgressionFromText(responseText, prompt);
      expect(rec).not.toBeNull();
      expect(rec?.key).toBe('F#');
      expect(rec?.mode).toBe('Phrygian');
      expect(rec?.tempo).toBe(68);
      expect(rec?.chords).toEqual(['F#m', 'Gmaj7', 'Em', 'F#m']);
      expect(rec?.romanNumerals).toEqual(['i', 'bIImaj7', 'vii', 'i']);
      expect(rec?.referenceContext).toContain('Radiohead');
      expect(rec?.explanation).toContain('Phrygian half-step contrast');

      const resolved = resolveChordProgression(rec!);
      expect(resolved.allResolved).toBe(true);
      expect(resolved.referenceContext).toBeDefined();
    });

    it('Case 4: non-music AI question returns null and does not false-positive', () => {
      const prompt = 'What is the difference between a stack and a queue?';
      const responseText = `A stack is a Last-In, First-Out (LIFO) data structure, whereas a queue is a First-In, First-Out (FIFO) data structure.
For example, in a stack, elements are added and removed from the top using push and pop. In a queue, elements are enqueued at the back and dequeued from the front.`;

      const rec = extractChordProgressionFromText(responseText, prompt);
      expect(rec).toBeNull();
    });

    it('Case 5: parses explicit JSON chord-progression block when emitted by model', () => {
      const prompt = 'Suggest a jazz ballad progression in Bb';
      const responseText = `Here is a sophisticated jazz progression:

\`\`\`chord-progression
{
  "title": "Jazz Ballad in Bb",
  "key": "Bb",
  "mode": "Major",
  "tempo": 64,
  "timeSignature": "4/4",
  "genre": "Jazz",
  "mood": "Romantic",
  "chords": ["Bbmaj7", "G7", "Cm7", "F7"],
  "romanNumerals": ["Imaj7", "VI7", "ii7", "V7"],
  "harmonicContext": "Imaj7 → VI7 → ii7 → V7",
  "explanation": "Standard jazz circle of fifths turnaround."
}
\`\`\``;

      const rec = extractChordProgressionFromText(responseText, prompt);
      expect(rec).not.toBeNull();
      expect(rec?.title).toBe('Jazz Ballad in Bb');
      expect(rec?.key).toBe('Bb');
      expect(rec?.chords).toEqual(['Bbmaj7', 'G7', 'Cm7', 'F7']);
      expect(rec?.romanNumerals).toEqual(['Imaj7', 'VI7', 'ii7', 'V7']);
      expect(rec?.tempo).toBe(64);
      expect(rec?.explanation).toBe('Standard jazz circle of fifths turnaround.');
    });
  });
});
