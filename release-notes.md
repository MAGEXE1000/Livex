# Version 4.6.72

Release Date: 2026-10-01

### Added
- Setlist & Repertoire Subsystem: Comprehensive gig repertoire management in Songs with custom sections (Bloque 1, Acoustic, Encore), batch song selector from library, and intuitive drag/reorder handles.
- Sequential Live Setlist Playback: Seamless track advancement controls in Live mode teleprompter ([⏮ Prev: Title] and [Next: Title ⏭]) with live section and position context.
- Cover Image Live Preview & Progress Lock: Added asynchronous JPEG downsampling and instant preview in the song editor dialog with loading spinners during optimization.

### Fixed
- Custom Song Cover Persistence: Resolved race condition where background re-renders wiped selected covers upon save, ensuring persistent local storage across restarts and theme toggles.
- Robust Thumbnail Rendering: Added image error fallbacks and graceful placeholder badges across song library cards, setlist detail rows, and setlist song pickers.
