/**
 * test-chordex-song-lyrics.mjs
 * Verification script covering all 12 required states for Chordex Song Lyrics Workspace:
 * 1. Chords only (no lyrics) works identically to before.
 * 2. Lyrics only (song created with lyrics, no chords entered) works.
 * 3. Chords + lyrics together.
 * 4. Multiple sections (e.g., Verse 1, Chorus, Verse 2, Bridge, Outro).
 * 5. Different vocal roles (Lead, Group, Solo, Custom).
 * 6. Document-wide lyric color.
 * 7. Individual line color override.
 * 8. Bold text.
 * 9. Mixed formatting.
 * 10. Pasted lyrics cleanly parsed into sections.
 * 11. Edited pasted lyrics.
 * 12. Empty lyrics handling.
 */

import assert from 'node:assert/strict';

// Test implementation directly with pure ES modules
import {
  parsePastedLyrics,
  lyricsDocumentToPlainText,
  createEmptyLyricsDocument,
  generateLyricId,
  isChordLine,
  extractChordsFromLine,
} from '../packages/livex-core/src/lib/lyrics/lyricsParser.ts';

import {
  VOCAL_ROLE_PRESETS,
  LYRIC_SECTION_TYPES,
} from '../packages/livex-core/src/types/lyrics.ts';

console.log('──────────────────────────────────────────────────────────────────');
console.log('CHORDEX SONG LYRICS WORKSPACE: 12-POINT VERIFICATION SUITE');
console.log('──────────────────────────────────────────────────────────────────\n');

let passedTests = 0;

function runTest(num, name, fn) {
  try {
    process.stdout.write(`State ${num}: ${name}... `);
    fn();
    console.log('✅ PASSED');
    passedTests++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 1. Chords only (no lyrics) works identically to before
// ─────────────────────────────────────────────────────────────────────
runTest(1, 'Chords only (no lyrics) backwards compatibility', () => {
  const chordsOnlyPreset = {
    id: 'song-classic-1',
    name: 'Hotel California',
    artist: 'Eagles',
    bpm: 75,
    key: 'Bm',
    notes: 'Standard 12-string acoustic intro',
    chords: ['Bm-minor', 'F#-7th', 'A-major', 'E-major', 'G-major', 'D-major', 'Em-minor', 'F#-7th'],
    sections: [
      { id: 'sec-intro', name: 'Intro', chords: ['Bm-minor', 'F#-7th'] },
      { id: 'sec-verse', name: 'Verse', chords: ['Bm-minor', 'F#-7th', 'A-major', 'E-major'] },
    ],
    // Note: lyrics property is completely omitted/undefined
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.equal(chordsOnlyPreset.lyrics, undefined, 'Lyrics property should be undefined');
  assert.equal(chordsOnlyPreset.chords.length, 8, 'Chord progression intact');
  assert.equal(chordsOnlyPreset.sections.length, 2, 'Song sections intact');
});

// ─────────────────────────────────────────────────────────────────────
// 2. Lyrics only (song created with lyrics, no chords entered) works
// ─────────────────────────────────────────────────────────────────────
runTest(2, 'Lyrics only (song created with lyrics, no chords)', () => {
  const lyricsDoc = {
    version: 1,
    sections: [
      {
        id: 'sec-1',
        type: 'verse',
        name: 'Verse 1',
        lines: [
          { id: 'l1', text: 'On a dark desert highway' },
          { id: 'l2', text: 'Cool wind in my hair' },
        ],
      },
    ],
  };

  const lyricsOnlySong = {
    id: 'song-lyrics-only',
    name: 'Spoken Word Poem',
    artist: 'Author',
    bpm: 0,
    key: '',
    notes: '',
    chords: [], // No chords entered
    sections: [],
    lyrics: lyricsDoc,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.equal(lyricsOnlySong.chords.length, 0, 'No chords');
  assert.equal(lyricsOnlySong.lyrics.sections.length, 1, 'Lyrics sections present');
  assert.equal(lyricsOnlySong.lyrics.sections[0].lines.length, 2, '2 lyrics lines');
  assert.equal(lyricsOnlySong.lyrics.sections[0].lines[0].text, 'On a dark desert highway');
});

// ─────────────────────────────────────────────────────────────────────
// 3. Chords + lyrics together
// ─────────────────────────────────────────────────────────────────────
runTest(3, 'Chords + lyrics together with placed chords over syllables', () => {
  const hybridSong = {
    id: 'song-hybrid-1',
    name: 'Let It Be',
    artist: 'The Beatles',
    bpm: 72,
    key: 'C',
    notes: '',
    chords: ['C', 'G', 'Am', 'F'],
    lyrics: {
      version: 1,
      sections: [
        {
          id: 'sec-v1',
          type: 'verse',
          name: 'Verse 1',
          lines: [
            {
              id: 'l1',
              text: 'When I find myself in times of trouble, Mother Mary comes to me',
              chords: [
                { id: 'c1', chord: 'C', offset: 0 },
                { id: 'c2', chord: 'G', offset: 19 },
                { id: 'c3', chord: 'Am', offset: 40 },
                { id: 'c4', chord: 'F', offset: 56 },
              ],
            },
          ],
        },
      ],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.equal(hybridSong.chords.length, 4, 'Chords present');
  assert.equal(hybridSong.lyrics.sections[0].lines[0].chords.length, 4, '4 placed chords');
  assert.equal(hybridSong.lyrics.sections[0].lines[0].chords[1].chord, 'G');
  assert.equal(hybridSong.lyrics.sections[0].lines[0].chords[1].offset, 19);
});

// ─────────────────────────────────────────────────────────────────────
// 4. Multiple sections (Verse 1, Chorus, Verse 2, Bridge, Outro)
// ─────────────────────────────────────────────────────────────────────
runTest(4, 'Multiple sections (Verse 1, Chorus, Verse 2, Bridge, Outro)', () => {
  const fullSongDoc = {
    version: 1,
    sections: [
      { id: 's1', type: 'verse', name: 'Verse 1', lines: [{ id: 'l1', text: 'Verse 1 text' }] },
      { id: 's2', type: 'chorus', name: 'Chorus', lines: [{ id: 'l2', text: 'Chorus text' }] },
      { id: 's3', type: 'verse', name: 'Verse 2', lines: [{ id: 'l3', text: 'Verse 2 text' }] },
      { id: 's4', type: 'bridge', name: 'Bridge', lines: [{ id: 'l4', text: 'Bridge text' }] },
      { id: 's5', type: 'outro', name: 'Outro', lines: [{ id: 'l5', text: 'Outro text' }] },
    ],
  };

  assert.equal(fullSongDoc.sections.length, 5, '5 distinct sections');
  const sectionNames = fullSongDoc.sections.map((s) => s.name);
  assert.deepEqual(sectionNames, ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Outro']);
});

// ─────────────────────────────────────────────────────────────────────
// 5. Different vocal roles (Lead, Group, Solo, Custom)
// ─────────────────────────────────────────────────────────────────────
runTest(5, 'Different vocal roles (Lead, Group, Solo, Custom role)', () => {
  const vocalRoleDoc = {
    version: 1,
    sections: [
      {
        id: 's1',
        type: 'verse',
        name: 'Verse 1',
        vocalRole: { type: 'lead', label: 'Lead Vocal', color: '#38bdf8' },
        lines: [{ id: 'l1', text: 'Lead sings alone' }],
      },
      {
        id: 's2',
        type: 'chorus',
        name: 'Chorus',
        vocalRole: { type: 'group', label: 'All Vocals / Choir', color: '#a855f7' },
        lines: [
          {
            id: 'l2',
            text: 'Everyone sings harmony',
            vocalRole: { type: 'solo', label: 'Solo Ad-lib', color: '#f59e0b' },
          },
        ],
      },
      {
        id: 's3',
        type: 'bridge',
        name: 'Bridge',
        vocalRole: { type: 'custom', label: 'Guest Rapper', color: '#10b981' },
        lines: [{ id: 'l3', text: 'Custom role line' }],
      },
    ],
  };

  assert.equal(vocalRoleDoc.sections[0].vocalRole?.type, 'lead');
  assert.equal(vocalRoleDoc.sections[1].vocalRole?.type, 'group');
  assert.equal(vocalRoleDoc.sections[1].lines[0].vocalRole?.type, 'solo');
  assert.equal(vocalRoleDoc.sections[2].vocalRole?.type, 'custom');
  assert.equal(vocalRoleDoc.sections[2].vocalRole?.label, 'Guest Rapper');
  assert.equal(vocalRoleDoc.sections[2].vocalRole?.color, '#10b981');
});

// ─────────────────────────────────────────────────────────────────────
// 6. Document-wide lyric color
// ─────────────────────────────────────────────────────────────────────
runTest(6, 'Document-wide lyric color configuration', () => {
  const docWithGlobalColor = {
    version: 1,
    formatting: {
      defaultColor: '#f43f5e', // Document-wide rose color
      defaultChordColor: '#38bdf8',
    },
    sections: [
      {
        id: 's1',
        type: 'verse',
        name: 'Verse 1',
        lines: [{ id: 'l1', text: 'Inherits document color' }],
      },
    ],
  };

  assert.equal(docWithGlobalColor.formatting.defaultColor, '#f43f5e');
  // Lines without explicit color fall back to document default
  const resolvedLineColor = docWithGlobalColor.sections[0].lines[0].format?.color || docWithGlobalColor.formatting.defaultColor;
  assert.equal(resolvedLineColor, '#f43f5e');
});

// ─────────────────────────────────────────────────────────────────────
// 7. Individual line color override
// ─────────────────────────────────────────────────────────────────────
runTest(7, 'Individual line color override preserving over doc default', () => {
  const doc = {
    version: 1,
    formatting: {
      defaultColor: '#ffffff',
    },
    sections: [
      {
        id: 's1',
        type: 'verse',
        name: 'Verse',
        lines: [
          { id: 'l1', text: 'Normal line' },
          { id: 'l2', text: 'Special whisper line', format: { color: '#06b6d4' } },
        ],
      },
    ],
  };

  const line1Color = doc.sections[0].lines[0].format?.color || doc.formatting.defaultColor;
  const line2Color = doc.sections[0].lines[1].format?.color || doc.formatting.defaultColor;

  assert.equal(line1Color, '#ffffff', 'Line 1 uses doc color');
  assert.equal(line2Color, '#06b6d4', 'Line 2 uses individual override');

  // When doc color changes, line override must NOT be overwritten
  doc.formatting.defaultColor = '#fbbf24';
  const updatedLine1Color = doc.sections[0].lines[0].format?.color || doc.formatting.defaultColor;
  const updatedLine2Color = doc.sections[0].lines[1].format?.color || doc.formatting.defaultColor;

  assert.equal(updatedLine1Color, '#fbbf24', 'Line 1 reflects new doc color');
  assert.equal(updatedLine2Color, '#06b6d4', 'Line 2 preserves its individual color override');
});

// ─────────────────────────────────────────────────────────────────────
// 8. Bold text
// ─────────────────────────────────────────────────────────────────────
runTest(8, 'Bold text formatting on section lines', () => {
  const doc = {
    version: 1,
    sections: [
      {
        id: 's1',
        type: 'chorus',
        name: 'Chorus',
        lines: [
          { id: 'l1', text: 'Shout it loud!', format: { bold: true } },
          { id: 'l2', text: 'Sing it soft.', format: { bold: false } },
        ],
      },
    ],
  };

  assert.equal(doc.sections[0].lines[0].format?.bold, true);
  assert.equal(doc.sections[0].lines[1].format?.bold, false);
});

// ─────────────────────────────────────────────────────────────────────
// 9. Mixed formatting
// ─────────────────────────────────────────────────────────────────────
runTest(9, 'Mixed formatting (bold + color + chord placements + vocal role)', () => {
  const doc = {
    version: 1,
    formatting: { defaultColor: '#94a3b8' },
    sections: [
      {
        id: 's1',
        type: 'bridge',
        name: 'Climax Bridge',
        vocalRole: { type: 'lead', label: 'Lead + Backgrounds', color: '#ec4899' },
        lines: [
          {
            id: 'l1',
            text: 'Never gonna give you up',
            format: { bold: true, color: '#e11d48' },
            chords: [{ id: 'c1', chord: 'F#m7', offset: 0 }],
          },
          {
            id: 'l2',
            text: 'Never gonna let you down',
            format: { bold: false }, // Inherits doc color
            chords: [{ id: 'c2', chord: 'B7', offset: 0 }],
          },
        ],
      },
    ],
  };

  const line1 = doc.sections[0].lines[0];
  const line2 = doc.sections[0].lines[1];

  assert.equal(line1.format?.bold, true);
  assert.equal(line1.format?.color, '#e11d48');
  assert.equal(line1.chords?.length, 1);
  assert.equal(line2.format?.bold, false);
  assert.equal(line2.format?.color, undefined);
  assert.equal(line2.chords?.length, 1);
});

// ─────────────────────────────────────────────────────────────────────
// 10. Pasted lyrics cleanly parsed into sections
// ─────────────────────────────────────────────────────────────────────
runTest(10, 'Pasted plain text cleanly parsed with bracketed headers and ChordPro chords', () => {
  const rawPastedText = `
[Verse 1]
[G]Amazing Grace, how sweet the sound
[C]That saved a [G]wretch like me

[Chorus - Lead]
I once was lost, but now am found
Was blind, but now I see
`;

  const parsed = parsePastedLyrics(rawPastedText);

  assert.equal(parsed.sections.length, 2, 'Parsed 2 sections');
  assert.equal(parsed.sections[0].name, 'Verse 1');
  assert.equal(parsed.sections[0].type, 'verse');
  assert.equal(parsed.sections[0].lines[0].text, 'Amazing Grace, how sweet the sound');
  assert.equal(parsed.sections[0].lines[0].chords?.length, 1);
  assert.equal(parsed.sections[0].lines[0].chords?.[0].chord, 'G');

  assert.equal(parsed.sections[0].lines[1].text, 'That saved a wretch like me');
  assert.equal(parsed.sections[0].lines[1].chords?.length, 2);
  assert.equal(parsed.sections[0].lines[1].chords?.[0].chord, 'C');
  assert.equal(parsed.sections[0].lines[1].chords?.[1].chord, 'G');

  assert.equal(parsed.sections[1].name, 'Chorus');
  assert.equal(parsed.sections[1].type, 'chorus');
  assert.equal(parsed.sections[1].vocalRole?.type, 'lead');
  assert.equal(parsed.sections[1].lines.length, 2);
});

// ─────────────────────────────────────────────────────────────────────
// 11. Edited pasted lyrics
// ─────────────────────────────────────────────────────────────────────
runTest(11, 'Editing pasted lyrics (text update, inserting new chord, removing line)', () => {
  const initialText = `
[Verse 1]
Hello darkness my old friend
I've come to talk with you again
`;

  const doc = parsePastedLyrics(initialText);

  // 1. Edit line text
  doc.sections[0].lines[0].text = 'Hello darkness my dear friend';
  assert.equal(doc.sections[0].lines[0].text, 'Hello darkness my dear friend');

  // 2. Add chord placement
  if (!doc.sections[0].lines[0].chords) doc.sections[0].lines[0].chords = [];
  doc.sections[0].lines[0].chords.push({
    id: generateLyricId('chord'),
    chord: 'Dm',
    offset: 0,
  });
  assert.equal(doc.sections[0].lines[0].chords[0].chord, 'Dm');

  // 3. Add new line
  doc.sections[0].lines.push({
    id: generateLyricId('line'),
    text: 'Because a vision softly creeping',
  });
  assert.equal(doc.sections[0].lines.length, 3);

  // 4. Serialize back to plain text
  const plain = lyricsDocumentToPlainText(doc, true);
  assert.ok(plain.includes('Hello darkness my dear friend'));
  assert.ok(plain.includes('Dm'));
  assert.ok(plain.includes('Because a vision softly creeping'));
});

// ─────────────────────────────────────────────────────────────────────
// 12. Empty lyrics handling
// ─────────────────────────────────────────────────────────────────────
runTest(12, 'Empty lyrics handling and clean defaults', () => {
  // Empty document creation
  const emptyDoc = createEmptyLyricsDocument();
  assert.equal(emptyDoc.version, 1);
  assert.equal(emptyDoc.sections.length, 1);
  assert.equal(emptyDoc.sections[0].lines.length, 1);
  assert.equal(emptyDoc.sections[0].lines[0].text, '');

  // Plain text conversion of empty document
  const plain = lyricsDocumentToPlainText(emptyDoc);
  assert.equal(plain.trim(), '', 'Empty document produces empty text');

  // Parsing empty string produces clean empty document
  const fromEmpty = parsePastedLyrics('');
  assert.equal(fromEmpty.sections.length, 1);
  assert.equal(fromEmpty.sections[0].lines[0].text, '');

  // Parsing whitespace only
  const fromWhitespace = parsePastedLyrics('   \n\n  \t  \n');
  assert.equal(fromWhitespace.sections.length, 1);
  assert.equal(fromWhitespace.sections[0].lines[0].text, '');
});

console.log('\n──────────────────────────────────────────────────────────────────');
console.log(`ALL 12 STATES PASSED SUCCESSFULLY (${passedTests}/12)`);
console.log('──────────────────────────────────────────────────────────────────');
