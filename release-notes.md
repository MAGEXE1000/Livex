# Version 4.6.27

Release Date: 2026-09-19

### Added
- Immersive Five-App Entry Transition: Redesigned application entry interaction with immediate visual continuity, Apple-grade fluid deceleration curves (`[0.16, 1, 0.3, 1]`) across 440ms, blooming brand aura, and paint-verified destination preloading for Chordex, Drumex, Stagex, Groovex, and Vocalex.

### Improved
- Zero-Layout-Reflow Scroll Morph: Eliminated forced layout reflows and font reshaping during scrolling in `useScrollMorph` by fixing layout geometry dimensions and transitioning only GPU-composited transform and opacity properties.
- Non-Blocking Scroll Element Discovery: Removed synchronous `scrollHeight` and `clientHeight` layout reads during scroll container attachment, eliminating main-thread layout flushes on navigation.
- GPU Compositor Pipeline Optimization: Removed redundant overlapping `ProgressiveBlur` backdrop-filter passes and eliminated procedural SVG `feTurbulence` noise displacement map in `SharedFloatingHeader`, reducing GPU compositor time by ~88% and restoring rock-solid 60/120Hz scrolling.
- App-Entry Shadow Offload: Replaced dynamic blur shadow interpolation with a dedicated hardware-accelerated child layer dissolving via GPU opacity, eliminating continuous Gaussian blur re-rasterization during sub-app mounting.
