# Version 4.5.97

Release Date: 2026-09-13

### Added

- Professional Instrument Tuner: Added high-precision acoustic, bass, and electric chromatic tuning engine using normalized square difference pitch detection, harmonic overtone rejection, interactive instrument headstocks, and a canonical SVG tuning fork indicator.
- Drumex Floating Action Dock: Engineered a Liquid Glass floating action surface for one-tap beat creation and multi-format MIDI/JSON file import with safe-area bottom navigation clearances.
- Realistic Acoustic Guitar Sound Engine: Upgraded Chordex chord playback with multi-velocity studio-sampled PCM acoustic guitar buffers, physical wood body resonance filtering, and humanized strumming mechanics.

### Refactored

- Canonical Accordion Expansion: Aligned canonical `Accordion` primitive with Transitions.dev reference using zero-measurement CSS Grid (`0fr` &rarr; `1fr`) row interpolation, optical blur transitions, non-scaling-stroke chevron flip, WAI-ARIA APG keyboard navigation, and inert focus protection.
- Canonical Plus &rarr; Menu Morph: Aligned canonical `MorphMenu` / `PlusMenu` interaction with Transitions.dev reference using asymmetric spring/cubic curves, coordinate vectors, and native Android `BackDispatcher` integration.
- Simplified Chord Detail Surface: Streamlined Chordex chord detail inspect sheet, removing visual bloat, redundant cards, and nested filter layers to maintain 60/120 FPS sheet gestures on Android.
