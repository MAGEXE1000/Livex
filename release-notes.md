# Version 4.6.5

Release Date: 2026-09-14

### Fixed

- Android Audio Routing & Media Volume Control: Resolved issue where opening the Tuner forced Android into call/communication audio mode (`STREAM_VOICE_CALL`). Configured `AudioManager.STREAM_MUSIC` as the window volume control stream, ensured normal audio mode via native bridge, and disabled Web Audio DSP constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`) for uncolored acoustic frequency analysis.
- Continuous Instrument Fretboard Layout: Extended the Stratocaster, Acoustic, and Bass fretboard graphic assets with mathematically spaced frets and wood grain, seamlessly filling the bottom viewport stage without empty black space beneath the neck.

### Improved

- Instrument Graphic Vertical Composition: Anchored instrument graphics at the top edge (`object-top`) with a standardized width to maintain strict peg alignment with flanking circular note controls.
