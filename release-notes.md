# Version 4.6.47

Release Date: 2026-09-25

### Added
- Revolut-Style Flat Bottom Navigation: Implemented flat minimal interaction model with a solid borderless surface, equal-width tabs, and responsive indicator across mobile and Android.
- Keep-Alive Tab Navigation Architecture: Integrated persistent component trees across Chordex, Drumex, Stagex, Groovex, and Vocalex to retain DOM state and scroll positions during tab switching.

### Improved
- Fast-Path Loading Architecture: Implemented synchronous memory-first rendering that immediately renders cached data and avoids skeleton flicker, reserving skeletons strictly for slow asynchronous network fetches.

### Fixed
- Hub Module Logos: Removed rounded-square framing containers, artificial borders, backgrounds, and glows from module cards on the Home screen to display clean brand logos.
