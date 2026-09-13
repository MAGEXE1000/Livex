# Version 4.5.98

Release Date: 2026-09-13

### Added

- Native Reference Tuner Redesign: Completely redesigned the Android/Capacitor chromatic tuner interface to match the high-end dark reference specification, featuring segmented instrument mode selection (Electric, Acoustic, Bass 4, Bass 5), reference pitch calibration (A4 = 440 Hz), automatic pitch detection toggle, an 11-bar chromatic scale with center emerald hourglass aura, real-time cents deviation pill indicator, and symmetrical string target cards flanking photorealistic instrument headstocks.
- Audible Reference Pitch Tones: Integrated audible pure-tone Web Audio reference pitch generation directly on string target cards via interactive speaker buttons.

### Improved

- Tuner Real-Time Rendering Performance: Isolated high-frequency cents needle and meter updates to GPU-composited direct DOM transforms (`needleRef`, `centsPillRef`, `centsTextRef`) to achieve flawless 60/120 FPS tracking without React reconciliation overhead on mobile WebViews.
