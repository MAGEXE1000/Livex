export type InstrumentFamily = 'guitar' | 'bass' | 'drum';

export type InstrumentTuningMode = 'acoustic' | 'electric' | 'bass-4' | 'drum';

export type TuningStatus = 'flat' | 'in_tune' | 'sharp' | 'silent' | 'weak';

export type TuningCategory = 'Standard' | 'Drop' | 'Down-Tuned' | 'Open';

export interface InstrumentStringTarget {
  name: string; // e.g. "Low E", "A", "D", "G", "B", "High E"
  note: string; // e.g. "E"
  octave: number; // e.g. 2
  fullName: string; // e.g. "E2"
  frequency: number; // e.g. 82.41
  stringNumber: number; // 6, 5, 4, 3, 2, 1 (or 4, 3, 2, 1 for bass)
}

export interface InstrumentTuningDefinition {
  id: string;
  name: string;
  shortName?: string;
  instrumentCompatibility: readonly InstrumentTuningMode[];
  instrumentFamily: InstrumentFamily;
  category: TuningCategory;
  strings: readonly InstrumentStringTarget[];
  description?: string;
}

/** Backward compatibility alias for guitar-only consumers */
export type GuitarStringTarget = InstrumentStringTarget;

export interface PitchMetrics {
  frequency: number;
  targetFrequency: number;
  noteName: string;
  octave: number;
  fullName: string; // e.g. "E2"
  cents: number;
  confidence: number;
  rms: number;
  tuningStatus: TuningStatus;
  nearestString: InstrumentStringTarget | null;
  nearestGuitarString: InstrumentStringTarget | null; // backward compatibility alias
  midiNote: number;
  targetStringLocked?: boolean;
}

export type TunerLifecycleState =
  | 'initial'
  | 'requesting_permission'
  | 'permission_granted'
  | 'permission_denied'
  | 'permission_permanently_denied'
  | 'no_microphone'
  | 'no_signal'
  | 'weak_signal'
  | 'stable_pitch'
  | 'in_tune';

export interface TunerFramePayload {
  state: TunerLifecycleState;
  metrics: PitchMetrics | null;
  error?: string;
}

export interface TunerEngineOptions {
  instrumentMode: InstrumentTuningMode;
  tuningId?: string;
  activeTuning?: InstrumentTuningDefinition;
  referenceA4?: number; // default: 440
  inTuneToleranceCents?: number; // default: 3.5
  exitTuneToleranceCents?: number; // default: 4.5 (hysteresis)
  noiseFilter?: boolean; // default: true
  manualTargetString?: InstrumentStringTarget | null; // When AUTO is false
  onFrame?: (payload: TunerFramePayload) => void;
  onStateChange?: (state: TunerLifecycleState) => void;
}

