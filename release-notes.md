# Version 4.6.87

Release Date: 2026-10-02

### Fixed
- Canvas Touch Focus & Soft Keyboard Activation: Resolved empty canvas collapse on Android WebView by inserting a `<br />` inside the empty `.lyric-line-content` span, establishing a valid DOM caret anchor so tapping empty lyric space immediately focuses and opens the Android virtual keyboard.
- Empty-State Banner Touch Isolation: Isolated the `[NO LYRICS]` banner inside `<main contentEditable>` in Both mode with `contentEditable={false}`, `userSelect: 'none'`, and `select-none` to permanently prevent WebView from targeting banner text nodes or intercepting cursor placement.
- Lyrics & Both Mode Parity: Ensured seamless touch-to-type capability across both Lyrics and Both workspaces with clean caret positioning and zero placeholder interference.
