# Version 4.6.36

Release Date: 2026-09-21

### Fixed
- Intro Animation Fluidity: Eliminated frame drops and main-thread raster stalls during mark assembly by eagerly pre-warming and decoding brand textures (livex-form1.png, livex-form2.png, livex-symbol.png) at module evaluation time.
- Zero-Blur GPU Radial Glow: Replaced costly CSS blur filter (filter: blur(28px)) with a hardware-accelerated pure radial gradient, preventing multi-pass Gaussian shader overhead on mobile WebViews.
- HTML Splash Dissolve: Replaced abrupt 0ms hard DOM cutoff of #intro with a coordinated 220ms cubic-bezier dissolve synchronized with the React intro reveal.
- Route Unmount Cutoff Resolution: Added missing exit animation variants (opacity: 0, scale: 1.04) to ApplicationTransitionEngine.tsx, preventing instantaneous component drops under AnimatePresence.
- Sub-App Keep-Alive Preservation: Retained visited sub-applications in DOM across route changes, eliminating component destruction, hook re-initialization, and chunk loading pauses when revisiting apps.
- Dedicated Domain Loading Skeletons: Mapped specific loading skeletons for Chordex, Drumex, Stagex, Groovex, and Vocalex, eliminating jarring layout shifts.

### Improved
- Coordinated Hub Reveal: Synchronized Hub entrance depth (scale 0.988 to 1.0, opacity 0.88 to 1.0) directly with the intro exit dissolve, eliminating static pauses.
- Mobile Web Preview Parity: Aligned cold-boot intro presentation between dev preview and native Android APK, honoring single source of truth mobile UI behavior.
