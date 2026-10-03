# Version 4.6.94

Release Date: 2026-10-03

### Added
- Right-Aligned Bar Badges: Rendered unified, persistent timing indicators on every lyric line across all editor views (`1 bar` default, `2 bars`, `4 bars`, `8 bars` high-contrast accent badge), providing instant visual clarity of measure pacing. Outside batch mode, tapping any badge cycles line timing (`auto → 1 → 2 → 4 → 8 → auto`).
- Synchronous Batch Timing & Visual Pulse: Upgraded the bottom dock timing preset chips (`[1 Bar]`, `[2 Bars]`, `[4 Bars]`, `[Custom…]`) with immediate synchronous state dispatch, instant mobile haptic feedback (`navigator.vibrate(20)`), and an animated primary accent flash on all updated lines.

### Fixed
- Touch Drag Line Selection & Android Context Menu Isolation: Completely eliminated WebView text selection callouts, copy/paste context bubbles, and pan gesture locks during multi-line timing assignment by enforcing `user-select: none`, `-webkit-touch-callout: none`, and dynamically disabling canvas `contentEditable` while in batch assignment mode.
- Non-Colliding Gesture vs Tap Engine: Enhanced `useLineRangeSelection` with a 6px movement threshold and RAF-throttled continuous line range expansion, resolving synthetic click collisions and ensuring butter-smooth touch interaction on mobile devices.
- Live Settings Modal Clean-Up: Streamlined the modal header to "Live Settings" and completely purged the obsolete global "BARS PER LINE" card, ensuring playback progression derives authoritatively from song lyric line timing.
