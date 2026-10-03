# Version 4.6.91

Release Date: 2026-10-03

### Added
- Compact Full-Featured Live Metronome Morph Pop-Up: Integrated complete Drumex-style native metronome capabilities into the Live mode morph pop-up, featuring an interactive Beat Tracker for setting strong/normal/muted accents per beat, quick-select Time Signature buttons (4/4, 3/4, 6/8, 2/4), Subdivisions (1/4, 1/8, 1/16, 3let), and Tap Tempo.
- Upward Drop-Up Click Sound Picker: Anchored the metronome sound selection menu upwards (`bottom: calc(100% + 8px)`), completely preventing bottom viewport clipping and navigation bar overlap.
- Decoupled Countdown Audio Architecture: Added independent Audio Mode configuration (`[Metronome Click Only] [Voice Count ("1, 2, 3, 4")] [Silent Visual Only]`) alongside Lead-In Length options (`[Off] [1 Bar] [2 Bars] [3s] [5s]`) in Song Live Settings.

### Fixed
- Web Audio Lookahead Master Clock Synchronization: Replaced drifting JavaScript `setTimeout` timer loops in Live mode with an authoritative Web Audio hardware lookahead clock scheduler (`MetronomeAudioEngine.onBeat`), locking teleprompter lyrics, chord progressions, visual beat pulses, and audio clicks into 100% phase-aligned synchronization with zero drift.
- Silent Mode Master Clock Parity: Maintained continuous Web Audio scheduler execution even when the audible metronome is disabled, guaranteeing identical downbeat precision and smooth teleprompter line advances across all playback modes.
- Sample-Accurate Countdown-to-Playback Transition: Fixed count-in transition timing so the final beat interval of the lead-in elapses completely before the teleprompter downbeat triggers, eliminating rushed first-verse entries.
