# Version 4.6.13

Release Date: 2026-09-15

### Fixed
- Cross-App Canonical Liquid Glass Top Bar Integration: Completed repository-wide unification of the persistent Liquid Glass top bar across Chordex, Stagex, Drumex, Vocalex, Groovex, Hub, and Settings.
- Scroll Morph Engine Wiring: Connected `scrollContainerRef` to `CategoryScreenView`, `LibraryChordDetail`, and `PdfPreviewModal` in Chordex, and `StageSetupDetailLayout` and `StageExportPdfView` in Stagex, activating smooth scroll-driven geometry morphing on all drill-down pages.

### Improved
- Composable ScrollScaffold Architecture: Enhanced `ScrollScaffold` with `React.forwardRef` to support seamless ref forwarding for scroll-driven animations while preserving automated navigation scroll-hide behavior.
- Mobile DAW Transport Bar Material Parity: Elevated DrumEditor mobile sequencer header from legacy styling to the canonical Liquid Glass design tokens with specular highlights and paint containment.
