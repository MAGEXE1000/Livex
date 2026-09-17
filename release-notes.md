# Version 4.6.21

Release Date: 2026-09-17

### Fixed
- Profile & RootApp Runtime Crash Resolved: Eliminated critical production crash (`Minified React error #310: Rendered more hooks than during the previous render`) occurring when navigating to the Profile/Account settings screen.
- Rules of Hooks Architectural Alignment: Hoisted all store selectors, theme attributes, and modal origin geometry hooks to the top level of `AccountSettingsPage` before early returns, ensuring constant hook allocation counts on both unauthenticated mount and authenticated update renders.
- Component Lifecycle & Stability Guard: Extracted `AccountDeviceRow` out of inline JSX IIFE closures into module scope with explicit props, eliminating component type churning and local hook allocation jitter across re-renders.
- Chordex Library Detail Hook Rule Alignment: Hoisted `detailScrollRef` above early return conditions in `LibraryChordDetail`.
