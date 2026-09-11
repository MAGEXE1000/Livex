# Version 4.5.89

Release Date: 2026-09-11

### Fixed

- Three-State Theme Architecture Harmonization: Synchronized Light, Dark, and AMOLED themes across all surfaces, dialogs, modals, and sub-apps (Hub, Chordex, Drumex, Stagex, Groovex, Vocalex), ensuring true black `#000000` is strictly respected without dark gray fallbacks.
- Streamlined Studio Hub Appearance Controls: Removed the redundant segmented control pill from the theme setting row, retaining the compact animated `ThemeToggle` icon as the sole interactive control.
- Instantaneous Theme Transitions: Eliminated thread-blocking `startViewTransition` snapshot delays on Android WebView and mobile runtimes, achieving fluid 120Hz native color transitions.
