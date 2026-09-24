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

export interface MusicalContextSnapshot {
  activeApp: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex' | 'devtools';
  currentSongTitle?: string;
  activeKey?: string;
  activeBpm?: number;
  activeProgression?: string[];
  instrument?: string;
  tuning?: string;
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
  type: 'chord_progression' | 'tone_recipe' | 'drum_groove' | 'practice_routine' | 'app_deep_link';
  title: string;
  data:
    | ChordProgressionRecommendation
    | ToneRecipeRecommendation
    | DrumGrooveRecommendation
    | PracticeRoutineRecommendation
    | Record<string, unknown>;
  actionLabel?: string;
  actionPayload?: {
    app: string;
    action: string;
    params: Record<string, unknown>;
  };
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
