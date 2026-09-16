# Version 4.6.10

Release Date: 2026-09-15

### Added

- Unified Scroll-Reactive Title → Floating Top Bar Morph: High-performance, compositor-first scroll-linked morph system (`useScrollMorph`, `ScrollMorphHeader`, upgraded `SharedFloatingHeader`). Continuously transforms page heading and top bar from an expanded left-aligned surface into a compact floating glass pill on scroll with synchronized width contraction, corner radius morphing, and constrained backdrop blur.
- Subtle Chromatic Aberration & Spectral Refraction: GPU-composited optical refraction highlight layer and text-shadow spectral dispersion peaking at mid-transition (`progress = 0.5`) via sinusoidal interpolation and settling cleanly at `progress = 1.0` and `progress = 0.0`.
- Drum Tuner Quick Access in Drumex: Added dedicated Drum Tuner button directly adjacent to the Metronome control in both the DrumEditor top transport bar and the DrumPatternsPanel actions toolbar.
- Universal Scaffold Integration: Wired `SettingsScaffold` and `MetronomePanel` to automatically drive the scroll morph engine with zero React re-renders during active scrolling.
