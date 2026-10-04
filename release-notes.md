# Version 4.6.98

Release Date: 2026-10-04

### Added
- Universal Export Normalization: Standardized all export routines across the application (Songs, Setlists, Drumex patterns, PDF charts, audio takes) to output clean files using sanitized titles and universal standards (`.json`, `.pdf`, `.wav`, etc.), while completely eliminating `.livex` export generation and maintaining resilient schema-tolerant import ingestion.
- Cross-Platform Filename Sanitizer: Implemented `sanitizeFilename` utility with comprehensive test suite covering invalid filesystem characters, leading dots, and whitespace collapsing.

### Improved
- Settings Cards Elevation & Material Parity: Redesigned all Hub Settings navigation cards, profile status cards, setting sections, and setting rows to match the exact size, touch geometry, materials, and typography of Livex Module cards (`sc-module-card`), with `clamp(54px, 8.0vh, 72px)` min-height, layered glass materials, AMOLED pure black support, and 38x38px icon containers.
- iOS Search Bar Input Transparency: Eradicated residual white/gray inner rectangle borders inside iOS-style search bars, ensuring input backgrounds are 100% transparent and flush.
- Button Typography Contrast Polish: Enforced high-contrast `text-black font-semibold` typography on all solid white and light-surface buttons across sheets, pins, and modals.
- Decoupled Navigation Back Stack: Isolated the global Android back button history stack, preventing Stagex and sub-modules from trapping or corrupting navigation history and ensuring clean return from Hub subpages.
