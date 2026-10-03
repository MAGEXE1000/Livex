# Version 4.6.85

Release Date: 2026-10-02

### Fixed
- DOM Reconciliation Crash Resolution: Resolved fatal NotFoundError insertBefore exception during Clear All Lyrics by isolating contentEditable lifecycle and executing clean Virtual DOM remounts via dynamic reset keys.
- Plain-Text Paste Stream Parsing: Enforced continuous single-line rendering in lyrics mode, permanently eliminating erratic multi-column verse splits and horizontal whitespace gaps.
- Word Stuttering & Concatenation Elimination: Hardened input event synchronization and selection capture to sanitize DOM text extraction, ignoring chord buttons, badges, and unmanaged elements to prevent duplicate word tokens (e.g. "Estoy Estoy").
- Editor Lifecycle Safety: Bound unique song keys to the lyrics canvas to guarantee pristine DOM state transitions when changing active songs in Chordex.
