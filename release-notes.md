# Version 4.6.79

Release Date: 2026-10-02

### Added
- Silent Character-Level Selection Formatting: Enforced strict zero-toast policy for all contextual formatting actions (Bold, Italic, Underline, Color Palette swatches, Clear Formatting) with instantaneous visual feedback directly on the highlighted character range.
- Touch & Selection Stability: Attached onPointerDown prevention across all 10 contextual formatting toolbar buttons and swatches to prevent Android WebView from blurring focus or collapsing native selection handles during tap interactions.

### Improved
- Clean Macro-Only Toast Engine: Reserved bottom toast notification system strictly for macro document and system actions (saving presets, deleting songs, band call invitations).

### Fixed
- Multiline Clipboard Paste Integrity: Overhauled clipboard paste handling with CRLF normalization (\r\n / \r -> \n) and seamless multiline text insertion at cursor without corrupting underlying section structures.
