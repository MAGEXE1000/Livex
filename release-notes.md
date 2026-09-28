# Version 4.6.64

Release Date: 2026-09-28

### Added
- Colored Lyrics in Live Modes: Preserved inline text span colors, line formatting colors, and vocal role colors across both Lyrics Live mode (LyricsLiveView) and Both Live mode (HybridLiveView), enabling performers to visually differentiate vocal parts and performers in real-time with drop-shadow bloom on active words.

### Fixed
- Floating Viewport Bottom Toolbar in Both Mode: Re-architected HybridLiveView layout with dedicated scroll isolation, ensuring the transport and HUD controls remain persistently anchored at the viewport bottom above the safe area, matching bottom navbar behavior across all scrolling states.
- Clean Line Editing in Song Lyrics Editor: Polished inline lyric editing by removing word selection highlight rectangles, eliminating the explicit Done button, adding clean baseline indicators, and auto-committing edits on blur or clicking away.
- Unified Live Display Mode Guard: Fixed mode-synchronization in useLiveModeState to prevent initialMode from overriding manual user mode switches in the Live Settings sheet.
