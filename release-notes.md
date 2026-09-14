# Version 4.6.6

Release Date: 2026-09-14

### Improved

- Canonical Android Launcher Icon Architecture: Standardized launcher icon resources to follow modern Android standards comparable to Google Play distributed applications. Removed legacy duplicate `android:roundIcon` definitions and redundant round mipmap assets, eliminating OEM launcher caching fragmentation (e.g. Samsung One UI Home preserving stale icons across updates). Enforced a single canonical adaptive launcher icon entry point (`android:icon="@mipmap/ic_launcher"`) across API 26-35+.

### Fixed

- Launcher Icons Verification Invariants: Updated automated build gates and test suites to validate the unified 15-target asset architecture and prevent regressions in launcher icon declarations.
