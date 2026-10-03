# Version 4.6.83

Release Date: 2026-10-02

### Added
- Permanent Canvas Focus Ring Immunity: Removed tabIndex={0} and enforced outline: none, border: none, ring-0, and no-focus-ring across the teleprompter writing canvas and global CSS to eliminate the browser engine's blue bounding rectangle during edit focus.
- Unconstrained Dual-Direction Multi-Line Text Selection: Enabled seamless multi-line selection handle dragging downwards and upwards across verses with soft keyboard open.

### Improved
- Immediate Batch Deletion: Instant removal of highlighted multi-line character ranges via Backspace key without leaving ghost lines or UI stutter.

### Fixed
- Global Selection Lockdown: Enforced strict user-select none across all UI chrome, topbar pills, and navigation tabs while keeping editable lyric content selectable.
