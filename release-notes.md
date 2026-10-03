# Version 4.6.93

Release Date: 2026-10-03

### Added
- Batch Bars-per-Line Assignment Dock: Integrated a dedicated "Set Bars per Line" action in the editor Floating Action Button (+) menu with multi-line tap and drag selection, enabling instant bulk bar allocation via `[1 Bar]`, `[2 Bars]`, `[4 Bars]`, and `[Custom…]` preset chips.
- Multi-Line Range Selection Engine: Implemented `useLineRangeSelection` with drag-to-select support, requestAnimationFrame frame coalescing, and non-blocking canvas interactions.
- Bulk Timing Pacing Allocator: Added `applyBarsToLines` immutable helper to assign measures to multiple lines in a single atomic undoable document change, skipping timed interludes and cleaning redundant section overrides.

### Fixed
- Automated Navigation Test Debounce Stabilization: Resolved a 280ms back-dispatcher debounce collision in `run-navigation-core-tests.mjs`, ensuring repeatable clean passes across automated test and CI suites.
