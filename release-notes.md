# Version 4.6.55

Release Date: 2026-09-26

### Added
- Content-Aware Chordex Live: High-performance musician presentation mode that automatically adapts between chords-only, chords-with-lyrics, and lyrics-only layouts with dynamic chord diagram drawers, pitch transposition, and variable-speed teleprompter scrolling.
- Structured Optional Lyrics Workspace: Native lyric writer and teleprompter editor with inline chord markers, vocal role tagging (lead/harmony/backing), and tempo sync without disrupting standard chord progression workflows.
- Stagex Setlist Presets & Custom Ordering: Direct drag-and-drop song reordering, setlist templates, and persistent production stage plan element name preferences.
- Cross-App Assistant Orchestration: Intelligent context sharing and direct action execution across Hub, Chordex, Drumex, and Stagex.

### Improved
- Repository Architecture & Monolith Deconstruction: Extracted DrumEditor panels and drag hooks, SongsPanel, HubSettings pages, and AccountCard authentication sheets into clean modular components.
- Zero Circular Dependencies: Fully decoupled auth UI primitives and settings navigation rows, eliminating circular dependencies across the entire repository.
- Interface & Navigation Performance: Restored branded entrance animations and eliminated navigation transition stutter across internal sub-apps.
