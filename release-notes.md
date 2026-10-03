# Version 4.6.84

Release Date: 2026-10-02

### Added
- Deterministic Setlist Live Back-Navigation: Enforced stateful setlist origin tracking ensuring the top-left back button and hardware back gestures return directly to the parent Setlist view rather than redirecting into the single-song chord/lyrics editor.
- Canva Toolbar Copy Integration: Added a dedicated Copy button to the floating Canva formatting toolbar allowing one-tap copying of highlighted lyrics directly to the system clipboard.

### Improved
- Transport Control Deduplication: Streamlined Live mode transport bars by eliminating redundant skip controls from auxiliary floating quick action toolbars and displaying next/prev song buttons strictly in the primary bottom dock when actively playing inside a Setlist.
- Plain-Text Clipboard Sanitization: Stripped tabs, non-breaking spaces, and synthetic multi-space padding on copy and paste events to ensure pasted verses always render clean, left-aligned, and line-by-line.

### Fixed
- Live Header Object Serialization: Resolved JSX element string coercion that previously caused setlist subtitles to display as [object Object].
- Dead Code and Bundle Bloat: Safely pruned unreferenced legacy components and orphaned input handlers, reducing bundle size.
