# Version 4.6.4

Release Date: 2026-09-14

### Added

- Circular Tuner Note Controls: Compact circular string indicator controls displaying target note, octave, and calibrated reference frequency with tactile response.
- Real-Time Download Speed & Size Telemetry: Live byte-level tracking displaying downloaded megabytes against total package size (`X MB / Y MB`) and transfer speed (`MB/s` or `KB/s`) during the update download phase.

### Improved

- Instant Update Autodetection on App Launch: Differentiated app foreground and resume lifecycle events from background polling with a 15-second debounce, immediately discovering new releases when opening the app.
- Tuner Two-Column Spatial Hierarchy: Balanced string card columns flanking the photorealistic headstock graphic to maximize peg alignment and prevent touch target overlap.
- Smooth Tuning Selection Transitions: Fluid modal transition between quick tuning presets and grouped tuning library categories.

### Fixed

- Startup Pipeline Cancellation Race: Resolved issue where concurrent app initialization steps incremented pipeline counters and aborted active update checks with `PipelineCancelledError`.
- Missing APK Download Progress Metrics: Restored `totalBytes` and `downloadedBytes` parameter propagation in `apkDownloader.ts` to populate global update state during downloads.
