# Version 4.6.8

Release Date: 2026-09-14

### Improved

- Background Power & Resource Efficiency: Permanently eliminated deprecated native background OTA polling worker, reducing idle battery and network consumption across all Android devices while stripping redundant WorkManager and Guava dependencies from the APK.
- Production Security Surface Hardening: Gated internal state dispatcher bindings and test diagnostic APIs on development and authenticated debug flags.
- Audio Asset Parsing Latency: Code-split metronome count-in voice sample table into on-demand dynamic chunks, reducing main-thread parse time on startup.

### Fixed

- Shell Reactivity & Theme Propagation: Fixed non-reactive setting access pattern in SharedAppShell, ensuring AMOLED mode and theme transitions re-render immediately.
- Navigation Store Debug Cleanup: Removed dormant debug reads and vestigial handlers across core navigation state stores.
