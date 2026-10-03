/**
 * Livex Chordex Structured Lyrics Data Model
 * 
 * Provides an optional, structured lyrics and chord layer for songs.
 * Preserves sections, lines, text spans, chord associations, formatting,
 * vocal roles, and line-level styling without storing opaque HTML.
 */

/**
 * Standard vocal performer roles
 */
export type StandardVocalRole = 'lead' | 'solo' | 'backing' | 'harmony' | 'all' | 'choir' | 'guest' | 'custom';

export interface VocalRoleAnnotation {
  type: StandardVocalRole;
  label?: string; // Display label (e.g. "Lead", "All", "Lead + Group", "John & Paul")
  color?: string; // Badge accent color (e.g. "#3b82f6", "#10b981", "#f59e0b")
}

export interface LyricSpanFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string; // Hex color code or CSS color string
  backgroundColor?: string; // Hex background highlight color or tint
  vocalRole?: VocalRoleAnnotation; // Vocal role assigned specifically to this span/word
}

export interface LyricTextSpan {
  text: string;
  format?: LyricSpanFormat;
}

/**
 * Chord placement associated with a line
 * Offset represents character position in the line's text
 */
export interface LyricChordPlacement {
  id: string; // Unique marker ID
  chord: string; // Canonical chord ID or symbol (e.g. 'C', 'G/B', 'Am7')
  offset: number; // Character index in the line text (0-based)
}

export const VOCAL_ROLE_PRESETS: { type: StandardVocalRole; label: string; color: string }[] = [
  { type: 'lead', label: 'Lead', color: '#06b6d4' },
  { type: 'harmony', label: 'Harmony', color: '#f59e0b' },
  { type: 'choir', label: 'Choir', color: '#a855f7' },
  { type: 'solo', label: 'Solo', color: '#ec4899' },
  { type: 'backing', label: 'Backing', color: '#3b82f6' },
  { type: 'guest', label: 'Guest', color: '#10b981' },
];

export type SongLyricLineType = 'lyric' | 'interlude';

/**
 * A single line of lyrics with chord attachments, formatting, and annotations
 */
export interface SongLyricLine {
  id: string; // Unique line ID
  type?: SongLyricLineType;
  text: string; // Plain-text content of the line
  explicitDurationMs?: number;
  chords?: LyricChordPlacement[]; // Chords placed at character offsets
  spans?: LyricTextSpan[]; // Optional rich formatted text spans
  format?: LyricSpanFormat; // Line-level formatting (e.g. color override, bold)
  vocalRole?: VocalRoleAnnotation; // Optional line-level vocal role override
  bars?: number; // Variable bars-per-line pacing override for this specific line
}

/**
 * Standard song section types
 */
export type StandardLyricSectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'outro'
  | 'solo'
  | 'interlude'
  | 'custom';

export const LYRIC_SECTION_TYPES: { type: StandardLyricSectionType; defaultName: string }[] = [
  { type: 'intro', defaultName: 'Intro' },
  { type: 'verse', defaultName: 'Verse' },
  { type: 'pre-chorus', defaultName: 'Pre-Chorus' },
  { type: 'chorus', defaultName: 'Chorus' },
  { type: 'bridge', defaultName: 'Bridge' },
  { type: 'outro', defaultName: 'Outro' },
  { type: 'solo', defaultName: 'Solo' },
  { type: 'interlude', defaultName: 'Interlude' },
  { type: 'custom', defaultName: 'Section' },
];

export interface SongLyricSection {
  id: string;
  type: StandardLyricSectionType;
  name: string; // Display name: "Verse 1", "Chorus", etc.
  vocalRole?: VocalRoleAnnotation; // Section-level vocal role
  barsPerLine?: number; // Variable bars-per-line pacing override for this section
  lines: SongLyricLine[];
}

/**
 * Document-wide lyrics styling and settings
 */
export interface SongLyricsFormatting {
  defaultColor?: string; // Document-wide lyric text color (overridden by line.format.color)
  defaultChordColor?: string; // Document-wide chord text color
  fontSize?: 'small' | 'medium' | 'large';
  lineSpacing?: 'compact' | 'normal' | 'relaxed';
  bold?: boolean;
}

/**
 * Complete structured lyrics document attached to a SongPreset
 */
export interface SongLyricsDocument {
  version: 1;
  formatting?: SongLyricsFormatting;
  defaultVocalRole?: VocalRoleAnnotation;
  sections: SongLyricSection[];
}

export interface CapturedSelectionLine {
  sectionId: string;
  lineId: string;
  lineIndex: number;
  start: number;
  end: number;
  isFullLine: boolean;
}

export interface CapturedSelectionData {
  lines: CapturedSelectionLine[];
  sectionIds: string[];
  fullText: string;
}

