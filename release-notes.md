# Version 4.7.0

Release Date: 2026-10-04

### Added
- Emil Kowalski Skills Suite: Ingested all 14 official design engineering skill modules (`ask-sonner`, `apple-design`, `emil-design-eng`, `break-ui`, `mobile-native`, etc.) into `.agents/skills/` to standardize animations, tactile feedback, and component architecture.
- Stackable Toasts Engine via Sonner: Deployed a docked, 3-card stackable notification architecture anchored above the bottom navigation dock with spring entrances, drag-to-dismiss, and dark/AMOLED glass styling.

### Fixed
- Unification of Switch Primitive: Standardized `Switch.tsx` across all modules with tactile spring curve `cubic-bezier(0.32, 0.72, 0, 1)`, active-touch scale feedback, and strict AMOLED parity (solid white track with black `#000000` thumb when active; dark translucent track with neutral thumb when inactive).
- Eradication of Ad-Hoc Notifications: Replaced fragmented and conflicting floating divs in Hub Settings, Livex Hub, Vocalex Preferences, and Updater Diagnostics with canonical Sonner toasts.
- Break-UI Layout Resilience: Protected Song cards, Setlist cards, and Lyrics Editor line bar badges with `min-w-0 flex-1 truncate shrink-0 whitespace-nowrap`, eliminating horizontal overflow and badge squashing under extreme string lengths.
- Stagex Navigation Decoupling: Prevented Stagex from polluting the global Android back button history stack and trapping users on back presses.
