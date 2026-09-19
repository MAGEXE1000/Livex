# Version 4.6.24

Release Date: 2026-09-19

### Fixed
- Android Updater Download Progress Reliability: Resolved race condition and service sleep deadlock in UpdateDownloadService that caused completed downloads to regress from 100% to 0% in active downloading state.
- Decoupled Error & Status Broadcasting: Guarded native download progress listeners to ensure error and completion statuses never emit zero progress across the Capacitor bridge.
- Strict Progress Monotonicity: Enforced non-decreasing download progress in downloadManager and protected post-download verification states against late bridge events.
- Active Call Safety: Safely resolved and cleaned up superseded download plugin calls to prevent dangling promises.
