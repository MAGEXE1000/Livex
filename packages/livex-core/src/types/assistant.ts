/**
 * Livex Native Music AI Assistant Domain Types
 */

export type AssistantRole = 'user' | 'assistant' | 'system';

export type AssistantState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'solving'
  | 'working'
  | 'composing'
  | 'responding'
  | 'weaving'
  | 'shaping'
  | 'success'
  | 'error'
  | 'interrupted'
  | 'sleeping';

export interface AssistantAttachment {
  id: string;
  name: string;
  size?: number;
  type?: string;
  dataUrl?: string;
}

export interface StagexSongSummary {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  duration: string;
  energy?: number;
  notes?: string;
}

export interface StagexPresetSummary {
  id: string;
  name: string;
  songCount: number;
  isDefault?: boolean;
}

export interface StagexElementSummary {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface StagexSceneSummary {
  id: string;
  name: string;
  elementCount: number;
  elements?: StagexElementSummary[];
}

export interface StagexContextSnapshot {
  setlists: StagexPresetSummary[];
  activePresetId?: string;
  activePresetName?: string;
  activeSongs?: StagexSongSummary[];
  scenes?: StagexSceneSummary[];
  activeScene?: StagexSceneSummary;
  performerCount?: number;
  gearCount?: number;
}

export interface DrumexContextSnapshot {
  activePatternId?: string;
  activePatternName?: string;
  bpm?: number;
  timeSignature?: string;
  swing?: number;
  measuresCount?: number;
  activeKit?: string;
  activeInstruments?: string[];
  patternsCount?: number;
  patternPreview?: {
    kick?: boolean[];
    snare?: boolean[];
    hihat?: boolean[];
  };
}

export interface GroovexContextSnapshot {
  currentSongId?: string | null;
  currentSongTitle?: string;
  currentSongArtist?: string;
  stemVolumes?: Record<string, number>;
  stemMutes?: Record<string, boolean>;
  recentSongsCount?: number;
}

export interface VocalexContextSnapshot {
  exerciseCategories?: string[];
  recentTakesCount?: number;
  activeRoutine?: string;
}

export interface HubContextSnapshot {
  pinnedModules?: string[];
  recentApps?: string[];
}

export interface SettingsContextSnapshot {
  language?: string;
  theme?: string;
  amoledMode?: boolean;
  accentColor?: string;
  instrument?: string;
}

export type AssistantActionType =
  | 'stagex:reorder_setlist'
  | 'stagex:arrange_stage'
  | 'stagex:create_preset'
  | 'drumex:create_pattern'
  | 'chordex:import_progression'
  | 'groovex:configure_stems'
  | 'vocalex:start_exercise';

export interface AssistantActionPayload {
  id: string;
  app: 'stagex' | 'drumex' | 'chordex' | 'groovex' | 'vocalex' | 'hub' | 'settings';
  actionType: AssistantActionType;
  title: string;
  description: string;
  actionLabel: string;
  requiresConfirmation?: boolean;
  params: Record<string, any>;
  preview?: {
    type: 'list_diff' | 'stage_plot' | 'drum_grid' | 'chord_diagrams' | 'stem_faders' | 'exercise_steps';
    data: any;
  };
}

export interface MusicalContextSnapshot {
  activeApp: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex' | 'devtools';
  currentSongTitle?: string;
  activeKey?: string;
  activeBpm?: number;
  activeProgression?: string[];
  instrument?: string;
  tuning?: string;
  stagex?: StagexContextSnapshot;
  drumex?: DrumexContextSnapshot;
  groovex?: GroovexContextSnapshot;
  vocalex?: VocalexContextSnapshot;
  hub?: HubContextSnapshot;
  settings?: SettingsContextSnapshot;
}

import type { GuitarChordData } from '../data/chords';

export interface ChordProgressionRecommendation {
  chords: string[];
  romanNumerals?: string[];
  key: string;
  mode?: string;
  feel?: string;
  description?: string;
  tempo?: number;
  timeSignature?: string;
  voicings?: Array<GuitarChordData | null>;
  repetitions?: number;
  title?: string;
  genre?: string;
  mood?: string;
  harmonicContext?: string;
  referenceContext?: string;
  explanation?: string;
}

export interface ToneRecipeRecommendation {
  title: string;
  targetInstrument: 'electric_guitar' | 'acoustic_guitar' | 'bass' | 'vocals' | 'general';
  ampModel?: string;
  gain?: number; // 0 - 10
  bass?: number; // 0 - 10
  mid?: number; // 0 - 10
  treble?: number; // 0 - 10
  presence?: number; // 0 - 10
  reverb?: number; // 0 - 10
  pedalChain?: Array<{
    name: string;
    type: 'overdrive' | 'distortion' | 'fuzz' | 'delay' | 'reverb' | 'modulation' | 'compressor' | 'eq';
    settings?: Record<string, string | number>;
  }>;
  tips?: string[];
}

export interface DrumGrooveRecommendation {
  name: string;
  genre: string;
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8' | '12/8' | '5/4' | '7/8';
  swing?: number; // 0 - 100
  kitRecommendation?: string;
  patternPreview?: {
    kick: boolean[];
    snare: boolean[];
    hihat: boolean[];
  };
}

export interface PracticeRoutineRecommendation {
  title: string;
  focusArea: 'theory' | 'chords' | 'rhythm' | 'technique' | 'ear_training' | 'vocals';
  durationMinutes: number;
  steps: Array<{
    title: string;
    description: string;
    bpm?: number;
    durationMinutes: number;
  }>;
}

export interface StructuredRecommendation {
  id: string;
  type: 'chord_progression' | 'tone_recipe' | 'drum_groove' | 'practice_routine' | 'app_deep_link' | 'assistant_action';
  title: string;
  data:
    | ChordProgressionRecommendation
    | ToneRecipeRecommendation
    | DrumGrooveRecommendation
    | PracticeRoutineRecommendation
    | AssistantActionPayload
    | Record<string, unknown>;
  actionLabel?: string;
  actionPayload?: {
    app: string;
    action: string;
    params: Record<string, unknown>;
  };
  action?: AssistantActionPayload;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  role: AssistantRole;
  content: string;
  status: 'streaming' | 'complete' | 'error';
  timestamp: number;
  statusLabel?: string;
  activeState?: AssistantState;
  recommendations?: StructuredRecommendation[];
  contextSnapshot?: MusicalContextSnapshot;
  attachments?: AssistantAttachment[];
  sources?: GroundingSource[];
}

export interface AssistantThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AssistantMessage[];
}

export interface AssistantQuickPrompt {
  id: string;
  label: string;
  prompt: string;
  category: 'theory' | 'tone' | 'chords' | 'drums' | 'vocals' | 'livex';
  icon: string;
}
