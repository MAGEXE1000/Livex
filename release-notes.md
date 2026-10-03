# Version 4.6.96

Release Date: 2026-10-03

### Added
- EasyUI iOS-Style Search Bar Modernization: Integrated the unified AMOLED `IosSearchBar` component across all workspaces, modules, panels, and modals (`SongsPanel`, `SetlistsPanel`, `DrumBeatsPanel`, `DrumPatternsPanel`, `MetronomePanel`, `DrumEditor`, `GroovexLibrary`, `StageLibraryPanel`, `StagexRightSidebar`, `StageGearView`, and diagnostics consoles), featuring spring-animated Cancel dismissal, minimum 44x44px touch targets, and pure black frosted glass styling.
- Interactive Header Title View Switcher: Made the top header title in SongsPanel interactively toggle between Songs and Setlists with an integrated chevron indicator (`ChevronsUpDown`), eliminating redundant tab switchers and maximizing vertical viewport real estate.

### Improved
- Floating Action Button Centerline Alignment: Centered the secondary cloud import button and primary FAB (+) button along the exact same X-axis center line, eliminating horizontal offset across mobile and tablet viewports.
- Song & Setlist Card Spatial Isolation: Replaced brittle child-sibling spacing with structured `flex flex-col gap-3` layout and per-card `mb-3 last:mb-0` margins, preventing card overlapping and border clashing across all Android WebView engines.
- Search Bar Vertical Spacing: Recalculated top layout rhythm to anchor the search bar directly below the interactive header with clean vertical breathing room.
