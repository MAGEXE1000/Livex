# Version 4.6.34

Release Date: 2026-09-20

### Added
- Dedicated Vocalex Track Effects Surface (`TakeEffectsSheet`): Introduced a professional mobile effects overlay featuring real-time Web Audio API DSP processors (Reverb, Delay/Echo, Chorus/Modulation, Drive/Distortion, High-Pass, and Low-Pass filters) with live auditioning and Android `BackDispatcher` integration.
- Integrated Vocal Harmonizer Suite: Embedded the multi-part vocal harmonizer and pitch-shift layer generator as a dedicated capability inside the Track Effects surface while preserving all existing harmony logic.

### Improved
- Vocalex Takes Action Hierarchy: Redesigned the post-recording take experience in `TakeDetailView`, moving "Re-record" and "Harmonize" away from the top header into a dedicated, organized track processing area below playback.
- Safe Destructive Action Placement: Separated the delete take action into the dedicated track action area with subtle red tone and modal confirmation to prevent accidental taps while keeping it easily accessible.
- Stagex History Theme Awareness: Replaced hardcoded pink/magenta visual values across `StageHistorySurface` and `StageCanvasView` with semantic theme accent tokens (`--studio-accent`), ensuring cohesive appearance across Dark, Light, and AMOLED themes.
- Stagex Toolbar Cleanup: Removed duplicate History navigation from the elements toolbar to maintain focused, single-purpose toolbars.
- Profile Privacy & Data Controls: Revamped the Privacy & Data section with actionable local data controls, privacy guarantee banners, and streamlined diagnostics.
