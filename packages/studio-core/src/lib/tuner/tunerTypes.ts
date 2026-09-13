export type InstrumentTuningMode = 'acoustic' | 'electric';

export type TuningStatus = 'flat' | 'in_tune' | 'sharp' | 'silent' | 'weak';

export interface GuitarStringTarget {
  name: string; // e.g. "Low E", "A", "D", "G", "B", "High E"
  note: string; // e.g. "E"
  octave: number; // e.g. 2
  fullName: string; // e.g. "E2"
  frequency: number; // e.g. 82.41
  stringNumber: number; // 6, 5, 4, 3, 2, 1
}

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
  nearestGuitarString: GuitarStringTarget | null;
  midiNote: number;
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
  referenceA4?: number; // default: 440
  inTuneToleranceCents?: number; // default: 3.5
  exitTuneToleranceCents?: number; // default: 4.5 (hysteresis)
  onFrame?: (payload: TunerFramePayload) => void;
  onStateChange?: (state: TunerLifecycleState) => void;
}
