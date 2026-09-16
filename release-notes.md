# Version 4.6.18

Release Date: 2026-09-16

### Improved
- Canonical Bounded Overscroll Spring System: Implemented a polished, unified, native-feeling overscroll spring and bounce interaction across Livex scrollable screens via the canonical `useOverscrollSpring` layout hook.
- Progressive Rubber-Band Physics: Integrated asymptotic elastic resistance strictly bounding content displacement at 44px ($d(p) = \text{sign}(p) \cdot D_{\max} \cdot (1 - 1 / (1 + c \cdot |p| / D_{\max}))$), preventing runaway stretch and visual dislocation.
- Analytical Damped Harmonic Oscillator: Built exact continuous-time spring return settling in ~250–300ms with natural frequency $\omega_0 = 24\text{ rad/s}$ and damping ratio $\zeta = 0.94$, eliminating bounce jitter, oscillation, and overshoot.
- Floating Header & Liquid Glass Isolation: Displaced the scroll container via hardware-accelerated `translate3d(0, y, 0)` leaving sibling floating headers rock-solid with 0.0px drift, undistorted backdrop filters, and intact `useScrollMorph` states.
- Cross-App Normalization: Deployed overscroll spring interaction across SettingsScaffold, Hub Settings, Groovex Preferences & Library, Stagex Setup & Preferences, Chordex Preferences, Drumex Prefs, Beats & Patterns, and Vocalex Preferences & Takes.
- Android WebView Performance & Accessibility: Direct DOM updates with zero React re-renders during active touch dragging; directional lockout for horizontal gestures; full compliance with reduced-motion accessibility.
