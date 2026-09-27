import { describe, it, expect } from 'vitest';
import {
  parsePastedLyrics,
  lyricsDocumentToPlainText,
  isChordLine,
  extractChordsFromLine,
  createEmptyLyricsDocument,
  continuousTextToLyricsDocument,
  lyricsDocumentToContinuousText,
} from '../lyricsParser';
import type { SongLyricsDocument } from '../../../types/lyrics';

describe('Chordex Song Lyrics Parser & Data Model', () => {
  it('correctly identifies chord lines vs lyric lines', () => {
    expect(isChordLine('C G Am F')).toBe(true);
    expect(isChordLine('D/F#   Em7   A7sus4   G')).toBe(true);
    expect(isChordLine('When the night has come')).toBe(false);
    expect(isChordLine('C')).toBe(true);
    expect(isChordLine('')).toBe(false);
  });

  it('extracts chord placements with accurate character offsets', () => {
    const chordLine = 'C        G        Am       F';
    const chords = extractChordsFromLine(chordLine);
    expect(chords).toHaveLength(4);
    expect(chords[0].chord).toBe('C');
    expect(chords[0].offset).toBe(0);
    expect(chords[1].chord).toBe('G');
    expect(chords[1].offset).toBe(9);
    expect(chords[2].chord).toBe('Am');
    expect(chords[2].offset).toBe(18);
    expect(chords[3].chord).toBe('F');
    expect(chords[3].offset).toBe(27);
  });

  it('parses standard song lyrics with sections and vocal roles', () => {
    const rawText = `
[Verse 1 — Lead]
C                 G
When I look into your eyes
Am                F
I can see a love restrained

[Chorus — All]
Don't you cry tonight
I still love you baby
`;
    const doc = parsePastedLyrics(rawText);
    expect(doc.sections).toHaveLength(2);

    // Verse 1
    const v1 = doc.sections[0];
    expect(v1.name).toBe('Verse 1');
    expect(v1.type).toBe('verse');
    expect(v1.vocalRole?.type).toBe('lead');
    expect(v1.vocalRole?.label).toBe('Lead');
    expect(v1.lines).toHaveLength(2);
    expect(v1.lines[0].text).toBe('When I look into your eyes');
    expect(v1.lines[0].chords).toBeDefined();
    expect(v1.lines[0].chords![0].chord).toBe('C');
    expect(v1.lines[0].chords![1].chord).toBe('G');

    // Chorus
    const ch = doc.sections[1];
    expect(ch.name).toBe('Chorus');
    expect(ch.type).toBe('chorus');
    expect(ch.vocalRole?.type).toBe('all');
    expect(ch.vocalRole?.label).toBe('All');
    expect(ch.lines).toHaveLength(2);
    expect(ch.lines[0].text).toBe("Don't you cry tonight");
  });

  it('parses custom vocal roles like [Bridge — Lead + Group]', () => {
    const rawText = `
[Bridge — Lead + Group]
Give me a whisper
And give me a sigh
`;
    const doc = parsePastedLyrics(rawText);
    expect(doc.sections).toHaveLength(1);
    const b = doc.sections[0];
    expect(b.name).toBe('Bridge');
    expect(b.type).toBe('bridge');
    expect(b.vocalRole?.type).toBe('custom');
    expect(b.vocalRole?.label).toBe('Lead + Group');
  });

  it('parses ChordPro inline notation e.g. [C]When I...', () => {
    const rawText = `
[Verse]
[C]When I find myself in [G]times of trouble
[Am]Mother Mary [F]comes to me
`;
    const doc = parsePastedLyrics(rawText);
    expect(doc.sections).toHaveLength(1);
    const v = doc.sections[0];
    expect(v.lines).toHaveLength(2);

    expect(v.lines[0].text).toBe('When I find myself in times of trouble');
    expect(v.lines[0].chords).toHaveLength(2);
    expect(v.lines[0].chords![0].chord).toBe('C');
    expect(v.lines[0].chords![0].offset).toBe(0);
    expect(v.lines[0].chords![1].chord).toBe('G');
    expect(v.lines[0].chords![1].offset).toBe(22); // 'times of trouble' position
  });

  it('handles continuous lyrics without section headers without forcing a section name', () => {
    const rawText = `
Line one without section
Line two without section
Line three without section
`;
    const doc = parsePastedLyrics(rawText);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].name).toBe('');
    expect(doc.sections[0].lines).toHaveLength(3);
    expect(doc.sections[0].lines[0].text).toBe('Line one without section');
  });

  it('creates an empty document with 0 sections by default', () => {
    const doc = createEmptyLyricsDocument();
    expect(doc.version).toBe(1);
    expect(doc.sections).toEqual([]);
  });

  it('serializes SongLyricsDocument back to plain text for clipboard copy', () => {
    const doc: SongLyricsDocument = {
      version: 1,
      sections: [
        {
          id: 's1',
          name: 'Verse 1',
          type: 'verse',
          vocalRole: { type: 'lead', label: 'Lead' },
          lines: [
            {
              id: 'l1',
              text: 'When I look into your eyes',
              chords: [
                { id: 'c1', chord: 'C', offset: 0 },
                { id: 'c2', chord: 'G', offset: 18 },
              ],
            },
          ],
        },
      ],
    };

    const text = lyricsDocumentToPlainText(doc, true);
    expect(text).toContain('[Verse 1 — Lead]');
    expect(text).toContain('C');
    expect(text).toContain('G');
    expect(text).toContain('When I look into your eyes');
  });

  it('preserves line color overrides independently of document-wide color', () => {
    const doc: SongLyricsDocument = {
      version: 1,
      formatting: {
        defaultColor: '#ffffff',
      },
      sections: [
        {
          id: 's1',
          name: 'Verse',
          type: 'verse',
          lines: [
            { id: 'l1', text: 'Line with custom color', format: { color: '#f59e0b' } },
            { id: 'l2', text: 'Line with document color' },
          ],
        },
      ],
    };

    // Simulated resolution logic
    const resolvedColor1 = doc.sections[0].lines[0].format?.color || doc.formatting?.defaultColor;
    const resolvedColor2 = doc.sections[0].lines[1].format?.color || doc.formatting?.defaultColor;

    expect(resolvedColor1).toBe('#f59e0b');
    expect(resolvedColor2).toBe('#ffffff');

    // Changing document-wide color
    doc.formatting!.defaultColor = '#94a3b8';
    const updatedColor1 = doc.sections[0].lines[0].format?.color || doc.formatting?.defaultColor;
    const updatedColor2 = doc.sections[0].lines[1].format?.color || doc.formatting?.defaultColor;

    expect(updatedColor1).toBe('#f59e0b'); // Line override preserved!
    expect(updatedColor2).toBe('#94a3b8'); // Line inherits new document color!
  });

  describe('Continuous Text Document Round-trip & Invariants', () => {
    it('round-trips pure continuous lyrics without inserting section headers', () => {
      const originalLyrics = `First line of lyrics
Second line of lyrics
Third line with feeling

Chorus without header line 1
Chorus without header line 2`;

      const doc = continuousTextToLyricsDocument(originalLyrics);
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.sections[0].name).toBe('');

      const serialized = lyricsDocumentToContinuousText(doc, false);
      expect(serialized).toBe(originalLyrics);
    });

    it('preserves existing formatting and default vocal role across continuous text updates', () => {
      const initialDoc: SongLyricsDocument = {
        version: 1,
        formatting: {
          fontSize: 24,
          lineSpacing: 1.8,
          defaultColor: '#a855f7',
        },
        defaultVocalRole: {
          type: 'lead',
          label: 'Lead Singer',
        },
        sections: [],
      };

      const updatedText = `Line A\nLine B\nLine C`;
      const doc = continuousTextToLyricsDocument(updatedText, initialDoc);

      expect(doc.formatting?.fontSize).toBe(24);
      expect(doc.formatting?.lineSpacing).toBe(1.8);
      expect(doc.formatting?.defaultColor).toBe('#a855f7');
      expect(doc.defaultVocalRole?.label).toBe('Lead Singer');
      expect(doc.sections[0].lines).toHaveLength(3);
    });

    it('returns empty string when serializing undefined or empty document', () => {
      expect(lyricsDocumentToContinuousText(undefined)).toBe('');
      expect(lyricsDocumentToContinuousText(createEmptyLyricsDocument())).toBe('');
    });
  });
});

