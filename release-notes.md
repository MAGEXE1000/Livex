# Version 4.6.82

Release Date: 2026-10-02

### Added
- Unconstrained Multi-Line Selection: Allowed touch selection handles to freely drag across any number of lines both downwards and upwards with the soft keyboard open or closed.
- Canva Floating Toolbar Batch Deletion: Added dedicated Delete button to the floating formatting toolbar and unified Backspace key handling to batch delete highlighted text.

### Improved
- Zero-Lag Gesture Handling: Throttled selection change listeners via requestAnimationFrame and enabled hardware acceleration to eliminate touch handle dragging latency.

### Fixed
- Keyboard-Focus Selection Collapse: Eliminated single-line textarea encapsulation that previously locked selection handles to a single verse while typing.
- Global Selection Lockdown: Enforced strict user-select none across all UI chrome, headers, and navigation tabs to prevent accidental selection highlights.
