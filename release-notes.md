# Version 4.6.86

Release Date: 2026-10-02

### Fixed
- Decouple Canvas Placeholder & Enforce Clean Buffer Initialization: Replaced pseudo-element data-placeholder and lyric-line-content:empty::before mechanism with a decoupled, non-interactive sibling overlay rendered strictly when the document is empty.
- Clean Document State & Selection Capture: The editable DOM containers never hold synthetic placeholder strings or attributes, preventing selection captures, input desynchronization, and clipboard concatenation errors.
- Pseudo-Element Pruning: Cleaned out obsolete lyric-line-content:empty::before CSS rules across shared tokens, Android, and Web styles to prevent browser caret misalignments and unexpected DOM injections.
