# Version 4.6.99

Release Date: 2026-10-04

### Fixed
- Dynamic Theme Accent Eradication of Hardcoded Blue Highlights: Completely eliminated all hardcoded blue hex codes across the Native Updater dialog and indicators (`LivexUpdateScreen`, `UpdateIndicator`, `LivexUpdateAuroraBackground`), dynamically binding the action button, progress bars, percent counters, new version pill, and progress glow to the active user accent preset or monochrome.
- Global Accent Token Synchronization: Synchronized `--accent-from` and `--accent-to` root CSS variables across the theme engine, eliminating styling fallbacks in dialogs, sliders, and interactive surfaces.
- Accordion & Alert Accent Unification: Replaced residual hardcoded `#3b82f6` in tokens.css for `.alert-dialog__icon--accent` and `.t-acc-trigger:focus-visible` with dynamic semantic accent tokens.
- Smart Loading & Setlist Detail Polish: Dynamically bound Livex Hub loading animations and setlist moving song hover borders to the user theme accent.
