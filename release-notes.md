# Version 4.6.3

Release Date: 2026-09-14

### Added

- Bottom-Flush Tuner Presentation: Re-architected the Android Tuner into a full-width bottom sheet extending flush to the bottom bezel (`bottom: 0`, `padding: 0`), anchored below the Library navigation header.
- Header-Integrated Instrument Selector: Restructured the Tuner header by replacing the standalone title with a compact segmented selector (`Electric`, `Acoustic`, `Bass`) on the upper-left and close button on the upper-right.

### Improved

- Instrument Scale & Stage Density: Substantially enlarged Electric and Bass headstocks to fill stage height, eliminating unused vertical black space across all device aspect ratios.
- Ergonomic String Tap Targets: Expanded string buttons to wide, tactile pills (`w-[154-172px]`, `h-11/h-12`) with larger badges, high-contrast typography, and calibrated horizontal/vertical alignment to physical tuning pegs.
- Unified Secondary Controls: Standardized the tuning selector, A4 reference, and Auto mode toggle to a unified `h-11` height with neutral AMOLED dark surfaces (`#141518`), reserving accent blue strictly for active state toggles.
- Canonical Bass Labeling: Streamlined all user-facing instrument selectors and tuning menus to strictly "Bass", eliminating deprecated "Bass 4" naming.
