# Version 4.6.2

Release Date: 2026-09-13

### Added

- Tuner Audio Graph Isolation: Decoupled reference string audio playback into an independent Web Audio context, completely isolating speaker playback from the microphone capture pipeline.
- Self-Playback Rejection: Implemented active playback tracking and real-time rejection in the pitch analyser pipeline to prevent speaker acoustic bleed from registering as user instrument input.

### Improved

- Instrument & Tuning Model Consolidation: Standardized the Tuner on three canonical instrument modes (Electric Guitar, Acoustic Guitar, Bass 4) and completely removed Bass 5 from user-facing surfaces.
- Dynamic Tuning-Bound Pitch Detection: Bound pitch detection metrics directly to the selected tuning, ensuring alternate tunings (Drop D, DADGAD, Open G, Half Step Down, etc.) accurately drive target notes, string highlights, and cents deviation.
