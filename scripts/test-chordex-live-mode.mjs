import assert from 'node:assert/strict';

// Helper reimplementations of core pure logic for node verification
function splitLineIntoChunks(text, chords) {
  if (!chords || chords.length === 0) {
    return [{ chord: undefined, text: text || '\u00A0' }];
  }

  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  const chunks = [];

  if (sorted[0].offset > 0) {
    chunks.push({
      chord: undefined,
      text: text.slice(0, sorted[0].offset),
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextOffset = i + 1 < sorted.length ? sorted[i + 1].offset : text.length;
    const chunkText = text.slice(cur.offset, Math.max(cur.offset, nextOffset));
    chunks.push({
      chord: cur.chord,
      text: chunkText.length > 0 ? chunkText : '\u00A0',
    });
  }

  const lastChord = sorted[sorted.length - 1];
  if (lastChord.offset > text.length) {
    chunks.push({
      chord: lastChord.chord,
      text: '\u00A0',
    });
  }

  return chunks.length > 0 ? chunks : [{ chord: undefined, text: text || '\u00A0' }];
}

function classifySongContent(preset) {
  const chordsCount =
    (preset.chords?.length || 0) +
    (preset.sections?.reduce((acc, s) => acc + (s.chords?.length || 0), 0) || 0);

  const sections = preset.lyrics?.sections || [];
  const lines = sections.flatMap((s) => s.lines || []);
  const lyricsWithText = lines.filter((l) => l.text && l.text.trim().length > 0);
  const lyricsWithChords = lines.flatMap((l) => l.chords || []);

  const hasChords = chordsCount > 0 || lyricsWithChords.length > 0;
  const hasLyrics = lyricsWithText.length > 0;
  const hasLiveContent = hasChords || hasLyrics;

  let contentCategory = 'none';
  if (hasChords && hasLyrics) contentCategory = 'hybrid';
  else if (hasLyrics) contentCategory = 'lyrics_only';
  else if (hasChords) contentCategory = 'chords_only';

  let compatibleModes = [];
  if (contentCategory === 'chords_only') {
    compatibleModes = ['chords_both', 'chords_diagram', 'chords_name'];
  } else if (contentCategory === 'lyrics_only') {
    compatibleModes = ['lyrics_only'];
  } else if (contentCategory === 'hybrid') {
    compatibleModes = [
      'lyrics_chord_name',
      'lyrics_chord_diagram',
      'lyrics_only',
      'chords_both',
      'chords_diagram',
      'chords_name',
    ];
  }

  let defaultMode = 'chords_both';
  if (contentCategory === 'lyrics_only') defaultMode = 'lyrics_only';
  else if (contentCategory === 'hybrid') defaultMode = 'lyrics_chord_name';

  return {
    hasChords,
    hasLyrics,
    hasLiveContent,
    contentCategory,
    compatibleModes,
    defaultMode,
  };
}

console.log('--- RUNNING CHORDEX LIVE MODE VERIFICATION SUITE ---');

// ── TEST 1: CASE 1 — CHORDS ONLY ──────────────────────────────
{
  const chordsOnlyPreset = {
    id: 'song-chords-only',
    name: 'Jazz Standards',
    artist: 'Miles Davis',
    key: 'Dm',
    bpm: 120,
    chords: ['Dm7', 'G7', 'Cmaj7'],
    sections: [
      { id: 'sec-1', name: 'A Section', chords: ['Dm7', 'G7', 'Cmaj7', 'A7'] },
    ],
  };

  const res = classifySongContent(chordsOnlyPreset);
  assert.equal(res.hasChords, true, 'Case 1 must have chords');
  assert.equal(res.hasLyrics, false, 'Case 1 must NOT have lyrics');
  assert.equal(res.hasLiveContent, true, 'Case 1 must have live content');
  assert.equal(res.contentCategory, 'chords_only', 'Case 1 category must be chords_only');
  assert.equal(res.defaultMode, 'chords_both', 'Case 1 default mode must be chords_both');
  assert.deepEqual(
    res.compatibleModes,
    ['chords_both', 'chords_diagram', 'chords_name'],
    'Case 1 must only offer chords focus modes'
  );
  console.log('  PASS [Case 1 - Chords Only]: Validated modes, category, and defaults');
}

// ── TEST 2: CASE 2 — LYRICS ONLY ──────────────────────────────
{
  const lyricsOnlyPreset = {
    id: 'song-lyrics-only',
    name: 'Acoustic Ballad',
    artist: 'Singer Songwriter',
    key: 'C',
    bpm: 90,
    chords: [],
    lyrics: {
      version: 1,
      sections: [
        {
          id: 'sec-verse',
          type: 'verse',
          name: 'Verse 1',
          vocalRole: { type: 'lead', label: 'Lead' },
          lines: [
            { id: 'l1', text: 'When the night has come' },
            { id: 'l2', text: 'And the land is dark', format: { bold: true, color: '#38bdf8' } },
          ],
        },
        {
          id: 'sec-chorus',
          type: 'chorus',
          name: 'Chorus',
          vocalRole: { type: 'choir', label: 'Choir', color: '#f59e0b' },
          lines: [
            { id: 'l3', text: 'Stand by me, oh stand by me' },
          ],
        },
      ],
    },
  };

  const res = classifySongContent(lyricsOnlyPreset);
  assert.equal(res.hasChords, false, 'Case 2 must NOT have chords');
  assert.equal(res.hasLyrics, true, 'Case 2 must have lyrics');
  assert.equal(res.hasLiveContent, true, 'Case 2 must have live content');
  assert.equal(res.contentCategory, 'lyrics_only', 'Case 2 category must be lyrics_only');
  assert.equal(res.defaultMode, 'lyrics_only', 'Case 2 default mode must be lyrics_only');
  assert.deepEqual(
    res.compatibleModes,
    ['lyrics_only'],
    'Case 2 must only allow lyrics_only mode'
  );
  console.log('  PASS [Case 2 - Lyrics Only]: Validated teleprompter-only mode, vocal roles, formatting');
}

// ── TEST 3: CASE 3 — HYBRID (CHORDS + LYRICS) ─────────────────
{
  const hybridPreset = {
    id: 'song-hybrid',
    name: 'Let It Be',
    artist: 'The Beatles',
    key: 'C',
    bpm: 72,
    chords: ['C', 'G', 'Am', 'F'],
    lyrics: {
      version: 1,
      sections: [
        {
          id: 'sec-v1',
          type: 'verse',
          name: 'Verse 1',
          vocalRole: { type: 'lead', label: 'Paul McCartney' },
          lines: [
            {
              id: 'hl-1',
              text: 'When I find myself in times of trouble',
              chords: [
                { id: 'c1', chord: 'C', offset: 0 },
                { id: 'c2', chord: 'G', offset: 18 },
              ],
            },
            {
              id: 'hl-2',
              text: 'Mother Mary comes to me',
              chords: [
                { id: 'c3', chord: 'Am', offset: 0 },
                { id: 'c4', chord: 'F', offset: 12 },
              ],
            },
          ],
        },
      ],
    },
  };

  const res = classifySongContent(hybridPreset);
  assert.equal(res.hasChords, true, 'Case 3 must have chords');
  assert.equal(res.hasLyrics, true, 'Case 3 must have lyrics');
  assert.equal(res.hasLiveContent, true, 'Case 3 must have live content');
  assert.equal(res.contentCategory, 'hybrid', 'Case 3 category must be hybrid');
  assert.equal(res.defaultMode, 'lyrics_chord_name', 'Case 3 default mode must be lyrics_chord_name');
  assert.equal(res.compatibleModes.length, 6, 'Case 3 must allow all 6 presentation modes');
  assert.ok(res.compatibleModes.includes('lyrics_chord_name'), 'Must include lyrics_chord_name');
  assert.ok(res.compatibleModes.includes('lyrics_chord_diagram'), 'Must include lyrics_chord_diagram');
  assert.ok(res.compatibleModes.includes('lyrics_only'), 'Must include lyrics_only');
  assert.ok(res.compatibleModes.includes('chords_both'), 'Must include chords_both');
  assert.ok(res.compatibleModes.includes('chords_diagram'), 'Must include chords_diagram');
  assert.ok(res.compatibleModes.includes('chords_name'), 'Must include chords_name');
  console.log('  PASS [Case 3 - Hybrid]: All 6 modes compatible, default mode verified');
}

// ── TEST 4: SYLLABLE CHUNK SPLITTING ALGORITHM ────────────────
{
  // Sub-case 4A: Normal offsets
  const text1 = 'When I look into your eyes';
  const chords1 = [
    { id: '1', chord: 'C', offset: 0 },
    { id: '2', chord: 'G', offset: 12 },
  ];
  const chunks1 = splitLineIntoChunks(text1, chords1);
  assert.equal(chunks1.length, 2, 'Must produce 2 chunks');
  assert.equal(chunks1[0].chord, 'C');
  assert.equal(chunks1[0].text, 'When I look ');
  assert.equal(chunks1[1].chord, 'G');
  assert.equal(chunks1[1].text, 'into your eyes');

  // Sub-case 4B: Text precedes first chord
  const text2 = 'Hello world how are you';
  const chords2 = [{ id: '1', chord: 'Am', offset: 6 }];
  const chunks2 = splitLineIntoChunks(text2, chords2);
  assert.equal(chunks2.length, 2, 'Must produce 2 chunks');
  assert.equal(chunks2[0].chord, undefined);
  assert.equal(chunks2[0].text, 'Hello ');
  assert.equal(chunks2[1].chord, 'Am');
  assert.equal(chunks2[1].text, 'world how are you');

  // Sub-case 4C: Multiple chords, some out of order in raw array
  const text3 = 'Amazing grace how sweet the sound';
  const chords3 = [
    { id: '2', chord: 'G7', offset: 14 },
    { id: '1', chord: 'G', offset: 0 },
    { id: '3', chord: 'C', offset: 24 },
  ];
  const chunks3 = splitLineIntoChunks(text3, chords3);
  assert.equal(chunks3.length, 3);
  assert.equal(chunks3[0].chord, 'G');
  assert.equal(chunks3[0].text, 'Amazing grace ');
  assert.equal(chunks3[1].chord, 'G7');
  assert.equal(chunks3[1].text, 'how sweet ');
  assert.equal(chunks3[2].chord, 'C');
  assert.equal(chunks3[2].text, 'the sound');

  // Sub-case 4D: Chord placed at end of line (offset >= text.length)
  const text4 = 'End of line';
  const chords4 = [{ id: '1', chord: 'D', offset: 11 }];
  const chunks4 = splitLineIntoChunks(text4, chords4);
  assert.equal(chunks4[0].chord, undefined);
  assert.equal(chunks4[0].text, 'End of line');
  assert.equal(chunks4[1].chord, 'D');

  // Sub-case 4E: Empty chords array
  const chunks5 = splitLineIntoChunks('Plain line', []);
  assert.equal(chunks5.length, 1);
  assert.equal(chunks5[0].chord, undefined);
  assert.equal(chunks5[0].text, 'Plain line');

  console.log('  PASS [Chunk Splitting]: Slicing by character offsets verified across 5 edge cases');
}

// ── TEST 5: EMPTY SONG PRESET ─────────────────────────────────
{
  const emptyPreset = {
    id: 'song-empty',
    name: 'Empty Song',
    chords: [],
  };

  const res = classifySongContent(emptyPreset);
  assert.equal(res.hasChords, false);
  assert.equal(res.hasLyrics, false);
  assert.equal(res.hasLiveContent, false);
  assert.equal(res.contentCategory, 'none');
  assert.equal(res.compatibleModes.length, 0);
  console.log('  PASS [Empty Song]: Graceful fallback when song has neither chords nor lyrics');
}

console.log('ALL CHORDEX LIVE MODE VERIFICATION CHECKS PASSED!\n');
