# Version 4.6.41

Release Date: 2026-09-23

### Added
- Ecosystem Module Cards Memoization: Extracted and memoized Hub ecosystem module cards and greetings header to prevent unnecessary Virtual DOM reconciliations during state transitions.

### Improved
- Android WebView Performance Pass: Eliminated continuous 60–120Hz React re-render storms during scrolling by removing unused scroll subscriptions from the bottom navigation controller.
- GPU Compositor & Shader Optimization: Streamlined design token surface backdrops from 4 filter passes to 2 passes and eliminated nested backdrop-filter allocation on active lens pills to prevent dual FBO ping-pong.
- Sub-App Bottom Navigation Parity: Aligned Hub bottom navigation behavior, back-stack popping, and active indicator transitions with canonical sub-app interaction models.
- PaceUI Native Updater Checking Popup: Integrated smooth morph expansion into checking state and eliminated telemetry storage lock contention.
