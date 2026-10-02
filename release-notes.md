# Version 4.6.77

Release Date: 2026-10-02

### Added
- Clear All Assigned Roles Modal Action: Added an instant reset button inside the Vocal Roles modal with destructive confirmation styling to strip all assigned vocal roles across all lines in a song at once with real-time UI synchronization.
- Line-Level Role & Section Dismissal: Direct tap-to-manage dialog on inline role chips (`CHOIR`, `Lead`, etc.) and section badges (`[Verse]`, `[Chorus]`), allowing quick single-line role removal or section clearance without navigating away.

### Improved
- Natural Document Flow Mode Switcher: Embedded the `Chords | Lyrics | Both` segmented controller as a static block within the lyrics canvas scroll container, allowing it to smoothly scroll off-screen as the reader scrolls down verses, maximizing active viewing area.

### Fixed
- Stale Live Mode Vocal Role Teleprompter Purge: Purged legacy role fallback and lingering cached role metadata (`• Lead`, `• Harmony`) from the Live mode teleprompter, guaranteeing plain, clean lyric line rendering when vocal roles are cleared or unassigned.
