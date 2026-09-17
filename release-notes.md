# Version 4.6.20

Release Date: 2026-09-17

### Improved
- Complete Theme Parity for Chordex & Drumex Tuners: Replaced all legacy hardcoded background colors, borders, and text values across Chromatic Tuner, Drum Tuner, and Tuning Selector modals with canonical Livex theme tokens (var(--app-bg), var(--c-surface-low), var(--c-surface-high), var(--c-surface-highest), var(--c-border), and var(--c-text-*)).
- Seamless Transparent Instrument Artwork in Light Mode: Introduced shared useTunerArtwork hook executing automated client-side edge flood-fill to eliminate black studio backdrops behind guitar headstocks and drum shells in Light theme, allowing instruments to float naturally on light backgrounds.
- Pure Black AMOLED Efficiency: Guaranteed true #000000 pitch black backgrounds and subtle borders in AMOLED mode across all tuner views and modals for optimal display contrast and battery performance.
- Dynamic Accent & State Wiring: Replaced static green/blue active states on string selection, Auto toggles, tuning radios, and Reference playback buttons with the user's active theme accent color.
- Vocalex Preferences Geometry Alignment: Normalized Vocalex Preferences layout width and margins to canonical settings geometry matching other internal apps.
