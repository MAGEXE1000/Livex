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
    chords,
    allResolved: totalCount > 0 && resolvedCount === totalCount,
    resolvedCount,
    totalCount,
  };
}

/**
 * Creates a new song preset in Chordex store prepopulated with the progression.
 */
export function createSongPresetFromProgression(
  recommendation: ChordProgressionRecommendation,
  options?: CreateSongFromProgressionOptions
): string {
  const resolved = resolveChordProgression(recommendation);
  const keyLabel = resolved.key ? `${resolved.key}${resolved.mode ? ' ' + resolved.mode : ''}` : 'C Major';
  const name =
    options?.title ||
    (recommendation.description
      ? recommendation.description.slice(0, 32).trim()
      : `AI Progression (${keyLabel})`);

  const notesArray = [
    recommendation.description,
    recommendation.feel ? `Feel: ${recommendation.feel}` : '',
    recommendation.timeSignature ? `Time: ${recommendation.timeSignature}` : '',
    recommendation.tempo ? `Tempo: ${recommendation.tempo} BPM` : '',
    recommendation.repetitions ? `Repetitions: ${recommendation.repetitions}` : '',
  ].filter(Boolean);

  const chordNames = resolved.chords.map((c) => c.name);

  const presetId = useChordStore.getState().createPreset({
    name,
    artist: options?.artist || 'Livex AI',
    bpm: recommendation.tempo || 120,
    key: recommendation.key || 'C',
    notes: notesArray.join('\n'),
    chords: chordNames,
    sections: [
      {
        id: `sec-${Date.now()}`,
        name: 'Progression',
        chords: chordNames,
      },
    ],
  });

  return presetId;
}

/**
 * Imports progression into Chordex and navigates directly to the Chordex song editor.
 */
export function importProgressionToChordex(
  recommendation: ChordProgressionRecommendation,
  options?: CreateSongFromProgressionOptions
): string {
  const presetId = createSongPresetFromProgression(recommendation, options);

  // Set active preset in Chordex store
  useChordStore.getState().setActivePreset(presetId);

  // Sync key and progression to practice store if supported
  try {
    const store = useChordStore.getState() as any;
    if (store.setSelectedKey && recommendation.key) {
      store.setSelectedKey(recommendation.key);
    }
    if (store.setActiveProgression && recommendation.chords) {
      store.setActiveProgression(recommendation.chords);
    }
  } catch (err) {
    console.warn('[importProgressionToChordex] store sync warning:', err);
  }

  // Navigate to Chordex songs page in editor view
  NavigationDispatcher.push({
    app: 'chordex',
    page: 'songs',
    subView: 'editor',
    id: presetId,
  });

  return presetId;
}
