# Version 4.6.73

Release Date: 2026-10-01

### Added
- Live Header Call Band Integration: Integrated the "Call Band" rehearsal button directly into the Live mode top header for band leaders with clean glass pill styling.
- Polished Setlists Interface: Streamlined Setlist detail view with 34px action controls, dynamic header clearance (140px) preventing title collision, uniform song row badges (#Key, BPM, Duration), and intuitive empty states.

### Fixed
- Live Teleprompter Progression Freeze: Stabilized synchronization state refs, eliminating premature line timer teardowns on musical beat ticks to ensure continuous, automatic lyric advancement during playback.
- Song Deletion Pipeline & Relational Integrity: Repaired delete confirmation dialog actions with active preset reset, setlist section cleanup, and toast notifications.
- Isolated Rehearsal Lobby Lifecycle: Restricted the Rehearsal Lobby strictly to active multi-device call sessions, eliminating intrusive solo lobby popups during playback and pauses.
- Streamlined Band Hub: Removed redundant in-modal repertoire management to focus exclusively on Members (with Join Code) and Gigs/Calendar schedule.
