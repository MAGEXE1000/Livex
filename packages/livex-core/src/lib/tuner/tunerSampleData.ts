// FluidR3_GM Realistic Reference Instrument Samples for Livex Tuner
// Note: Audio data has been decoupled into static binary assets at /audio/tuner/{family}/{note}.mp3.
// This metadata manifest preserves note keys and origin descriptors.

const DESCRIPTOR = (family: string, note: string) =>
  `static:/audio/tuner/${family}/${note}.mp3#FluidR3_GM_${family}_Frank_Wen_Creative_Commons_3.0_Benjamin_Gleitzman_MP3_Sample`;

export const TUNER_SAMPLE_DATA: Record<string, Record<string, string>> = {
  acoustic: {
    E2: DESCRIPTOR('acoustic', 'E2'),
    A2: DESCRIPTOR('acoustic', 'A2'),
    D3: DESCRIPTOR('acoustic', 'D3'),
    G3: DESCRIPTOR('acoustic', 'G3'),
    B3: DESCRIPTOR('acoustic', 'B3'),
    E4: DESCRIPTOR('acoustic', 'E4'),
  },
  electric: {
    E2: DESCRIPTOR('electric', 'E2'),
    A2: DESCRIPTOR('electric', 'A2'),
    D3: DESCRIPTOR('electric', 'D3'),
    G3: DESCRIPTOR('electric', 'G3'),
    B3: DESCRIPTOR('electric', 'B3'),
    E4: DESCRIPTOR('electric', 'E4'),
  },
  bass: {
    B0: DESCRIPTOR('bass', 'B0'),
    E1: DESCRIPTOR('bass', 'E1'),
    A1: DESCRIPTOR('bass', 'A1'),
    D2: DESCRIPTOR('bass', 'D2'),
    G2: DESCRIPTOR('bass', 'G2'),
  },
};
