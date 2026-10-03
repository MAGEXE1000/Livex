# Version 4.6.88

Release Date: 2026-10-03

### Fixed
- DOM Placeholder Crash Eradication: Completely eliminated React-managed placeholder elements in `SongLyricsEditor` in favor of CSS-only `:empty` pseudo-elements on the canvas container, resolving `NotFoundError: Failed to execute 'removeChild' on 'Node'` crashes when typing initial characters on new or blank songs.
- Lyric Formatting Span Reconciliation: Implemented `reconcileSpansOnTextEdit` engine to accurately preserve, shift, and adjust formatting spans (bold, italic, underline, vocal colors) across character insertions, deletions, and replacements.
- Scoped Canvas Deletion Interception: Scoped Backspace and `beforeinput` selection event handlers strictly to the active lyric canvas DOM element, preventing accidental deletion interception in the chord picker, modal inputs, and search fields.
- State Synchronization & Echo Guard: Hardened lyrics state synchronization with structural deep equality checks and an echo guard (`lastEmittedRef`) to prevent in-flight typing from being overwritten by pending debounced store updates.
- Schedule-Authoritative Live Timing: Updated Live mode teleprompter timing to synchronize against per-line schedule durations (`timingSchedule.lines`) with drift compensation, and gracefully halting playback on the final line without wrapping.
- Interruptible Smooth Scrolling: Introduced touch- and wheel-interruptible smooth scrolling (`animateScrollTop`) for teleprompter and practice views.
- AMOLED Visual Polish & Formatting Silence: Removed opaque background snap during setlist song drag reordering under AMOLED themes, and eliminated unnecessary toasts during vocal role assignments.
