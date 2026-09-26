# Version 4.6.50

Release Date: 2026-09-25

### Improved
- Unified Bottom-Navigation Motion System: Consolidated navigation animations into one canonical motion graph governed by Apple-grade critically damped spring physics (`stiffness: 280, damping: 32, mass: 1.0`), eliminating competing motion pipelines across Livex Hub and all sub-apps.
- Direct Drag & Fluid Manipulation: Highlight follows touch gestures with subtle physical mass and elastic boundary resistance rather than rigid 1:1 translation, maintaining the same organic spring damping throughout direct manipulation.
- Zero Between-Tabs Invariant: Introduced deterministic destination resolver (`resolveDragDestination`) with velocity flick momentum awareness, mathematically guaranteeing that the highlight can never remain stuck between tabs upon release or cancellation.
- Clear Optical Text/Icon Separation: Shifted expanded icon position to -7px and adjusted tab label bottom offset to 3.5px, providing a clear 4.5px optical clearance gap that eliminates text-icon collision and centers icons at 24px in compact mode.
- 120 Hz Touch Performance: Cached navigation bar bounding dimensions on pointer down to eliminate forced synchronous reflows and layout thrashing during pointer move frames.
