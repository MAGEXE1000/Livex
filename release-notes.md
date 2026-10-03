# Version 4.6.95

Release Date: 2026-10-03

### Added
- Sample-Accurate Web Audio Visual Synchronization: Synchronized teleprompter visual beat pulses directly with Web Audio hardware DAC buffer output timing via `startVisualSyncLoop` lookahead clock alignment, eliminating the ~200ms perceptual lag between acoustic clicks and on-screen indicator illumination.
- Repositioned Active Line Beat Indicator: Shifted teleprompter beat dots (`• • • •`) and bar progress counter (`bar X/Y`) into a dedicated in-flow sub-container directly beneath the lyric baseline with clean vertical breathing room (`marginTop: 8px`), eliminating overlap collisions with text, chords, and vocal badges.

### Fixed
- "MNOME" Brand & Ligature Artifact Eradication: Purged unmapped Material Symbols icon glyphs across Live Topbar tempo pills, Tempo & Metronome Morph modal headers, and Audible Metronome toggle switches, removing fallback text string corruptions.
- Topbar Chrome Sanitization: Removed the pulsing circular indicator dot beside the song title in Live Mode, presenting a clean, focused header layout.
- Instantaneous Beat Dot Lighting: Set immediate CSS activation transitions (`transition: none !important`) on active beat dots to guarantee zero animation delay when downbeats strike.
