# Version 4.6.81

Release Date: 2026-10-02

### Added
- Unified Lyrics & Both Document State: Merged editor canvas render pipelines so character-level formatting (custom colors, bold, italic, underline) renders with 100% visual parity across both Lyrics and Both workspaces.
- Discrete Line-by-Line Live Teleprompter: Parsed multi-line lyrics into distinct individual verse containers with targeted focus highlight boxes advancing line-by-line during playback, rendering stanza breaks as clean layout spacing gaps.

### Improved
- Tab Switch State Preservation: Stabilized workspace container mounting so switching between Chords, Lyrics, and Both modes never unmounts the active document or causes text truncation.

### Fixed
- Tab Switch Text Truncation: Fixed document flattening and race condition where switching out of Both mode previously truncated multi-stanza lyrics to a single line.
- Lyrics Rich-Text Canvas Parity: Eliminated plain HTML textarea restriction in Lyrics mode, restoring colored and styled character ranges without losing editability.
