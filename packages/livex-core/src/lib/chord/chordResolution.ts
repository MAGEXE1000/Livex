import {
  getChordByName,
  type Chord,
  type ChordType,
  type GuitarChordData,
} from '../../data/chords';
import type { ChordProgressionRecommendation } from '../../types/assistant';
import { useChordStore } from '../../store/useChordStore';
import { NavigationDispatcher } from '../navigation/NavigationDispatcher';

export interface ResolvedChordItem {
  raw: string;
  name: string;
  chordId?: string;
  root?: string;
  type?: ChordType;
  romanNumeral?: string;
  guitarData: GuitarChordData | null;
  isCustomVoicing: boolean;
  resolved: boolean;
  notes?: string[];
  intervals?: string[];
}

export interface ResolvedChordProgression {
  key: string;
  mode?: string;
  tempo?: number;
  timeSignature?: string;
  feel?: string;
  description?: string;
  repetitions?: number;
  title?: string;
  genre?: string;
  mood?: string;
  harmonicContext?: string;
  referenceContext?: string;
  explanation?: string;
  chords: ResolvedChordItem[];
  allResolved: boolean;
  resolvedCount: number;
  totalCount: number;
}

export interface CreateSongFromProgressionOptions {
  title?: string;
  artist?: string;
}

/**
 * Resolves a single chord symbol into Chordex canonical representation.
 * Supports custom voicings if provided, otherwise looks up canonical Chordex guitar voicing.
 * Degrades gracefully if the chord is not resolvable, never fabricating fake fingerings.
 */
export function resolveChordItem(
  chordSymbol: string,
  romanNumeral?: string,
  customVoicing?: GuitarChordData | null
): ResolvedChordItem {
  if (!chordSymbol || typeof chordSymbol !== 'string') {
    return {
      raw: '',
      name: '—',
      guitarData: null,
      isCustomVoicing: false,
      resolved: false,
      romanNumeral: romanNumeral || undefined,
    };
  }

  const raw = chordSymbol.trim();

  // If a valid custom voicing was provided, respect and use it
  if (
    customVoicing &&
    Array.isArray(customVoicing.frets) &&
    customVoicing.frets.length === 6
  ) {
    const canonical = getChordByName(raw);
    return {
      raw,
      name: canonical?.name || raw,
      chordId: canonical?.id,
      root: canonical?.root,
      type: canonical?.type,
      romanNumeral: romanNumeral || undefined,
      guitarData: customVoicing,
      isCustomVoicing: true,
      resolved: true,
      notes: canonical?.notes,
      intervals: canonical?.intervals,
    };
  }

  // Lookup canonical chord in Chordex database
  const canonical = getChordByName(raw);
  if (canonical && canonical.guitar) {
    return {
      raw,
      name: canonical.name,
      chordId: canonical.id,
      root: canonical.root,
      type: canonical.type,
      romanNumeral: romanNumeral || undefined,
      guitarData: canonical.guitar,
      isCustomVoicing: false,
      resolved: true,
      notes: canonical.notes,
      intervals: canonical.intervals,
    };
  }

  // Graceful fallback for unresolved chords: mark as unresolved without inventing fake frets
  return {
    raw,
    name: raw,
    guitarData: null,
    isCustomVoicing: false,
    resolved: false,
    romanNumeral: romanNumeral || undefined,
  };
}

/**
 * Resolves an entire chord progression recommendation from the AI assistant.
 */
export function resolveChordProgression(
  recommendation: ChordProgressionRecommendation
): ResolvedChordProgression {
  const chords = (recommendation.chords || []).map((chord, idx) => {
    const roman = recommendation.romanNumerals?.[idx];
    const customVoicing = recommendation.voicings?.[idx] || null;
    return resolveChordItem(chord, roman, customVoicing);
  });

  const resolvedCount = chords.filter((c) => c.resolved).length;
  const totalCount = chords.length;

  return {
    key: recommendation.key || 'C',
    mode: recommendation.mode,
    tempo: recommendation.tempo,
    timeSignature: recommendation.timeSignature,
    feel: recommendation.feel,
    description: recommendation.description,
    repetitions: recommendation.repetitions,
    title: recommendation.title,
    genre: recommendation.genre,
    mood: recommendation.mood,
    harmonicContext: recommendation.harmonicContext,
    referenceContext: recommendation.referenceContext,
    explanation: recommendation.explanation,
    chords,
    allResolved: totalCount > 0 && resolvedCount === totalCount,
    resolvedCount,
    totalCount,
  };
}

/**
 * Intelligently extracts a structured chord progression from AI assistant response text and prompt context.
 * Parses:
 * - Explicit JSON or code blocks (```chord-progression / ```json)
 * - Structured markdown sections (Progression, Harmonic Analysis, Key, Mode, Tempo, Feel, Why It Works)
 * - Contextual attributes (mood, genre, reference artist/song inspiration)
 * Returns null for non-music queries or text without coherent harmonic progression data.
 */
export function extractChordProgressionFromText(
  text: string,
  prompt?: string
): ChordProgressionRecommendation | null {
  if (!text || typeof text !== 'string') return null;

  const combinedContext = `${prompt || ''}\n${text}`;

  // 1. Check for explicit JSON or chord-progression block
  const jsonBlockMatch = text.match(/```(?:chord-progression|json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed && Array.isArray(parsed.chords) && parsed.chords.length >= 2) {
        return {
          chords: parsed.chords.map((c: any) => String(c).trim()).filter(Boolean),
          romanNumerals: Array.isArray(parsed.romanNumerals) ? parsed.romanNumerals.map(String) : undefined,
          key: String(parsed.key || 'C').trim(),
          mode: parsed.mode ? String(parsed.mode).trim() : undefined,
          tempo: typeof parsed.tempo === 'number' ? parsed.tempo : undefined,
          timeSignature: parsed.timeSignature ? String(parsed.timeSignature).trim() : undefined,
          feel: parsed.feel ? String(parsed.feel).trim() : undefined,
          genre: parsed.genre ? String(parsed.genre).trim() : undefined,
          mood: parsed.mood ? String(parsed.mood).trim() : undefined,
          title: parsed.title ? String(parsed.title).trim() : undefined,
          harmonicContext: parsed.harmonicContext ? String(parsed.harmonicContext).trim() : undefined,
          referenceContext: parsed.referenceContext || parsed.inspiredBy ? String(parsed.referenceContext || parsed.inspiredBy).trim() : undefined,
          explanation: parsed.explanation || parsed.whyItWorks ? String(parsed.explanation || parsed.whyItWorks).trim() : undefined,
          description: parsed.description ? String(parsed.description).trim() : undefined,
        };
      }
    } catch {
      // Continue to markdown heuristic parser
    }
  }

  // 2. Gate check: Must have musical context
  const isMusicContext =
    /(?:progression|progresi[oó]n|chord|acorde|harmoni[ac]|cadence|tonalidad|key of|tonalidad de|tempo|bpm|ii-V|I-IV|i-iv|modal|voicing|triad|arpeggio)/i.test(
      combinedContext
    );
  if (!isMusicContext) return null;

  // 3. Extract Chords Sequence
  // Priority A: Look for dedicated Progression / Chords line: e.g. "Progression: `C` -> `Em` -> `F` -> `Fm`"
  let chords: string[] = [];
  const cleanText = text.replace(/[*_]/g, '');
  const cleanContext = combinedContext.replace(/[*_]/g, '');

  const progressionLineMatch = cleanText.match(
    /(?:^|\n)[ \t]*(?:Progression|Chords|Acordes|Secuencia):?[ \t]*(?:\r?\n[ \t]*)?(`[A-G][b#]?[^\n]+)/i
  );

  const chordTokenRegex =
    /`([A-G][b#]?[a-zA-Z0-9#b()\/+ø°^-]*)`|(?:\b([A-G][b#]?(?:maj|min|m|M|dim|aug|sus|add)[0-9]*(?:[#b][0-9]+)*(?:\([^)]+\))?(?:\/[A-G][b#]?)?)\b)/g;

  if (progressionLineMatch) {
    const lineChords = [...progressionLineMatch[1].matchAll(chordTokenRegex)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (lineChords.length >= 2) {
      chords = lineChords;
    }
  }

  // Priority B: If no dedicated progression line, look for sequence of backticked chords
  if (chords.length < 2) {
    const backtickedRegex = /`([A-G][b#]?[a-zA-Z0-9#b()\/+ø°^-]*)`/g;
    const allMatches = [...text.matchAll(backtickedRegex)].map((m) => m[1]);
    if (allMatches.length >= 2) {
      chords = allMatches.slice(0, 8);
    }
  }

  if (chords.length < 2) return null;

  // 4. Extract Key and Mode
  let key = 'C';
  let mode: string | undefined;

  // Check explicit Mode line / token: e.g. "**Mode:** Major" or "**Mode:** Phrygian"
  const explicitModeMatch = cleanContext.match(
    /(?:^|\n|\|)[ \t]*(?:Mode|Modo):?[ \t]*([A-Za-z]+)/i
  );
  if (explicitModeMatch) {
    const rawMode = explicitModeMatch[1].toLowerCase();
    mode =
      rawMode === 'mayor'
        ? 'Major'
        : rawMode === 'menor'
          ? 'Minor'
          : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
  }

  // Check explicit Key line / token: e.g. "**Key:** C Major", "**Key:** D", "key of C"
  const keyHeaderMatch = cleanContext.match(
    /(?:^|\n|\|)[ \t]*(?:Key(?:\s*of)?|Tonalidad(?:\s*de)?):?[ \t]*([A-G][b#]?)(?:[ \t]+(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|locrian|mayor|menor))?/i
  );

  if (keyHeaderMatch) {
    key = keyHeaderMatch[1].trim().toUpperCase();
    if (keyHeaderMatch[2] && !mode) {
      const rawMode = keyHeaderMatch[2].toLowerCase();
      mode =
        rawMode === 'mayor'
          ? 'Major'
          : rawMode === 'menor'
            ? 'Minor'
            : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
    }
  } else {
    // Check prompt pattern: e.g. "in C major", "in D", "en Sol mayor"
    const promptKeyMatch = (prompt || '').match(
      /\bin\s+([A-G][b#]?)(?:[ \t]+(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|locrian|mayor|menor))?/i
    );
    if (promptKeyMatch) {
      key = promptKeyMatch[1].trim().toUpperCase();
      if (promptKeyMatch[2] && !mode) {
        const rawMode = promptKeyMatch[2].toLowerCase();
        mode =
          rawMode === 'mayor'
            ? 'Major'
            : rawMode === 'menor'
              ? 'Minor'
              : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
      }
    } else {
      const rootMatch = chords[0].match(/^[A-G][b#]?/);
      if (rootMatch) {
        key = rootMatch[0].toUpperCase();
      }
    }
  }

  if (!mode) {
    if (/\b(?:minor|menor)\b/i.test(prompt || '')) {
      mode = 'Minor';
    } else if (/\b(?:major|mayor)\b/i.test(prompt || '')) {
      mode = 'Major';
    } else if (/m(?:aj|in)?\b/.test(chords[0])) {
      mode = chords[0].startsWith(key + 'm') && !chords[0].startsWith(key + 'maj') ? 'Minor' : 'Major';
    } else {
      mode = 'Major';
    }
  }

  // 5. Extract Roman Numerals / Harmonic Analysis
  let romanNumerals: string[] | undefined;
  const analysisLineMatch = cleanText.match(
    /(?:^|\n)[ \t]*(?:Harmonic Analysis|Analysis|An[aá]lisis|Roman Numerals):?[ \t]*(?:\r?\n[ \t]*)?(`?[b#]?[ivIV]+[^\n]+)/i
  );

  const romanTokenRegex =
    /`([b#]?[ivIV]+[a-zA-Z0-9#b()\/+ø°^-]*)`|(?:\b([b#]?[ivIV]+(?:[0-9]|maj|min|m|M|dim|aug|sus|#|b)*(?:\([^)]+\))?)\b)/g;

  if (analysisLineMatch) {
    const lineRomans = [...analysisLineMatch[1].matchAll(romanTokenRegex)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (lineRomans.length >= 2) {
      romanNumerals = lineRomans.slice(0, chords.length);
    }
  }

  if (!romanNumerals) {
    const allRomans = [...text.matchAll(romanTokenRegex)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (allRomans.length >= chords.length) {
      romanNumerals = allRomans.slice(0, chords.length);
    }
  }

  // 6. Extract Tempo / BPM
  let tempo: number | undefined;
  const tempoMatch = combinedContext.match(/(?:tempo|bpm)\s*:?\s*(\d{2,3})|(\d{2,3})\s*(?:bpm|BPM)/i);
  if (tempoMatch) {
    const val = parseInt(tempoMatch[1] || tempoMatch[2], 10);
    if (val >= 40 && val <= 240) {
      tempo = val;
    }
  }

  // 7. Extract Time Signature
  let timeSignature: string | undefined;
  const timeSigMatch = combinedContext.match(/(?:time signature|comp[aá]s)\s*:?\s*([23456789]\/[248])|\b([346]\/4|6\/8|12\/8)\b/i);
  if (timeSigMatch) {
    timeSignature = timeSigMatch[1] || timeSigMatch[2];
  }

  // 8. Extract Feel / Genre / Mood
  let feel: string | undefined;
  let genre: string | undefined;
  let mood: string | undefined;

  const feelMatch = text.match(/(?:feel|sensaci[oó]n|groove)\s*:?\s*([^\n.,]+)/i);
  if (feelMatch) {
    feel = feelMatch[1].replace(/[*_]/g, '').trim();
  }

  const moodMatches = combinedContext.match(/\b(melancholic|melanc[oó]lic[ao]|sad|dark|nostalgic|bittersweet|uplifting|happy|bright|dreamy|tense|chill|relaxed|energetic|emotional)\b/i);
  if (moodMatches) {
    const m = moodMatches[1].toLowerCase();
    mood = m.startsWith('melanc') ? 'Melancholic' : m.charAt(0).toUpperCase() + m.slice(1);
  }

  const genreMatches = combinedContext.match(/\b(neo-soul|jazz|bossa nova|r&b|indie rock|blues|gospel|folk|ambient|city pop|rock en espa[nñ]ol|latin jazz|pop|shoegaze|funk)\b/i);
  if (genreMatches) {
    genre = genreMatches[1]
      .split(/([ -])/)
      .map((w) => (w === '-' || w === ' ' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('');
  }

  // 9. Extract Reference / Inspired By Context
  let referenceContext: string | undefined;
  const refPromptMatch = combinedContext.match(/(?:analyze(?: the)? harmonic characteristics of|characteristics of|inspired by|in the style of|al estilo de|inspirado en)\s+([^,.\n]+?)(?:and create|and write|without copying|\.|\n|$)/i);
  if (refPromptMatch) {
    const refTarget = refPromptMatch[1].replace(/[*_]/g, '').trim();
    if (refTarget && refTarget.length > 2 && refTarget.length < 60) {
      referenceContext = `Inspired by the harmonic characteristics of ${refTarget} (original progression)`;
    }
  }

  // 10. Extract Explanation ("Why it works" / voice leading)
  let explanation: string | undefined;
  const whyMatch = text.match(/(?:(?:\*{1,2})?(?:Why It Works|Por qu[eé] funciona|Harmonic Movement|Voice Leading)(?:\*{1,2})?:?[ \t]*)([\s\S]*?)(?:\n\s*\n|\n###|\n\*\*|$)/i);
  if (whyMatch) {
    const cleanWhy = whyMatch[1].replace(/[*_`]/g, '').replace(/\n+/g, ' ').trim();
    if (cleanWhy.length > 10) {
      explanation = cleanWhy.length > 240 ? cleanWhy.slice(0, 237) + '…' : cleanWhy;
    }
  }

  // 11. Compose Title
  let title = 'Harmonic Progression';
  const titleHeaderMatch = text.match(/(?:^|\n)###\s+([^\n]+)/);
  if (titleHeaderMatch && titleHeaderMatch[1].trim()) {
    title = titleHeaderMatch[1].replace(/[*_#]/g, '').trim();
  } else if (mood && genre) {
    title = `${mood} ${genre} Progression`;
  } else if (mood) {
    title = `${mood} ${key}${mode ? ' ' + mode : ''} Progression`;
  } else if (genre) {
    title = `${genre} Progression in ${key}`;
  } else if (key) {
    title = `${key}${mode ? ' ' + mode : ''} Progression`;
  }

  const harmonicContext = romanNumerals ? romanNumerals.join(' → ') : undefined;

  return {
    chords,
    romanNumerals,
    key,
    mode,
    tempo,
    timeSignature: timeSignature || '4/4',
    feel: feel || mood || genre,
    genre,
    mood,
    title,
    harmonicContext,
    referenceContext,
    explanation,
    description: explanation || `${title} (${chords.join(' - ')})`,
  };
}

/**
 * Helper to extract canonical Chordex chord IDs from resolved progression.
 */
function extractCanonicalChordIds(resolved: ResolvedChordProgression): string[] {
  const chordIds: string[] = [];
  for (let i = 0; i < resolved.chords.length; i++) {
    const item = resolved.chords[i];
    if (item.chordId) {
      chordIds.push(item.chordId);
    } else {
      const byName = getChordByName(item.name);
      if (byName) {
        chordIds.push(byName.id);
      } else if (item.guitarData) {
        const customId = `custom-ai-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
        try {
          useChordStore.getState().saveCustomChord({
            id: customId,
            name: item.name,
            instrument: 'guitar',
            frets: item.guitarData.frets,
            barres: item.guitarData.barres || [],
            notes: item.notes || [],
            createdAt: Date.now(),
          });
          chordIds.push(customId);
        } catch {
          chordIds.push(item.name);
        }
      } else {
        chordIds.push(item.name);
      }
    }
  }
  return chordIds;
}

/**
 * Helper to format a concise, musically meaningful song title.
 */
function formatConciseSongTitle(
  recommendation: ChordProgressionRecommendation,
  options?: CreateSongFromProgressionOptions
): string {
  const keyLabel = recommendation.key
    ? `${recommendation.key}${recommendation.mode ? ' ' + recommendation.mode : ''}`
    : 'C Major';

  const rawTitle = options?.title || recommendation.title;
  if (rawTitle && !rawTitle.toLowerCase().includes('auto-extracted') && rawTitle.length <= 48) {
    return rawTitle.trim();
  }

  if (recommendation.mood && recommendation.genre) {
    return `${recommendation.mood} ${recommendation.genre} (${keyLabel})`;
  }
  if (recommendation.genre) {
    return `${recommendation.genre} Progression (${keyLabel})`;
  }
  if (recommendation.mood) {
    return `${recommendation.mood} Progression (${keyLabel})`;
  }
  return `Progression in ${keyLabel}`;
}

/**
 * Creates a new song preset in Chordex store prepopulated with the progression.
 */
export function createSongPresetFromProgression(
  recommendation: ChordProgressionRecommendation,
  options?: CreateSongFromProgressionOptions
): string {
  const resolved = resolveChordProgression(recommendation);
  const name = formatConciseSongTitle(recommendation, options);

  const notesArray = [
    recommendation.feel ? `Feel: ${recommendation.feel}` : '',
    recommendation.timeSignature ? `Time: ${recommendation.timeSignature}` : '',
    recommendation.tempo ? `Tempo: ${recommendation.tempo} BPM` : '',
    recommendation.harmonicContext ? `Harmonic: ${recommendation.harmonicContext}` : '',
    recommendation.referenceContext ? recommendation.referenceContext : '',
    recommendation.explanation ? recommendation.explanation : '',
  ].filter(Boolean);

  const chordIds = extractCanonicalChordIds(resolved);

  const presetId = useChordStore.getState().createPreset({
    name,
    artist: options?.artist || 'Livex AI',
    bpm: recommendation.tempo || 120,
    key: recommendation.key || 'C',
    notes: notesArray.join('\n'),
    chords: chordIds,
    sections: [
      {
        id: `sec-${Date.now()}`,
        name: 'Progression',
        chords: chordIds,
      },
    ],
  });

  return presetId;
}

/**
 * Stages progression import and navigates to Chordex, opening the real new-song creation popup.
 */
export function importProgressionToChordex(
  recommendation: ChordProgressionRecommendation,
  options?: CreateSongFromProgressionOptions
): void {
  const resolved = resolveChordProgression(recommendation);
  const title = formatConciseSongTitle(recommendation, options);

  const notesArray = [
    recommendation.feel ? `Feel: ${recommendation.feel}` : '',
    recommendation.timeSignature ? `Time: ${recommendation.timeSignature}` : '',
    recommendation.tempo ? `Tempo: ${recommendation.tempo} BPM` : '',
    recommendation.harmonicContext ? `Harmonic: ${recommendation.harmonicContext}` : '',
    recommendation.referenceContext ? recommendation.referenceContext : '',
    recommendation.explanation ? recommendation.explanation : '',
  ].filter(Boolean);

  const chordIds = extractCanonicalChordIds(resolved);
  const chordNames = resolved.chords.map((c) => c.name);

  // Set pending import in Chordex store
  useChordStore.getState().setPendingImport({
    title,
    artist: options?.artist || 'Livex AI',
    bpm: recommendation.tempo || 120,
    key: recommendation.key || 'C',
    notes: notesArray.join('\n'),
    chordIds,
    chordNames,
    recommendation,
  });

  // Clear active preset so Chordex opens to the songs list rather than an old editor
  useChordStore.getState().setActivePreset(null);

  // Navigate to Chordex songs page with form subview
  NavigationDispatcher.push({
    app: 'chordex',
    page: 'songs',
    subView: 'form',
  });
}
