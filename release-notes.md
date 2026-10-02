# Version 4.6.75

Release Date: 2026-10-01

### Added
- Centered Add Songs Morph Modal: Added a centered spring-animated morph modal triggered from a dedicated bottom FAB (+) in the Setlist detail view with live search filtering, section assignment, and multi-song selection.
- Universal Black Floating Action Button: Standardized all floating Add (+) action buttons across the entire app (All Songs library, Setlists collection, Setlist detail, Chords editor, Lyrics editor, Both editor) to match the canonical 56x56px circular translucent frosted black glass FAB.

### Improved
- Clean Monochrome Setlist Controls: Stripped all solid blue circular fills, halos, and background housings from the Setlist Play button, converting it to a theme-aware bare vector glyph with tactile spring press feedback.
- Setlist Topbar Control Layout: Positioned the Edit metadata pencil icon to the immediate left of the Play action button in the right-aligned header cluster.

### Fixed
- Intrusive Section Header Buttons: Removed cluttered inline "+ Add Songs" buttons from setlist section rows, routing all additive actions cleanly to the unified bottom FAB.
- FAB Safe Area Positioning: Fixed bottom floating action button positioning to account for bottom navigation height and safe area insets across all viewport modes.
