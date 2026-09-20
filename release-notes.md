# Version 4.6.32

Release Date: 2026-09-20

### Fixed
- Groovex Song Detail Navigation Scoping: Isolated bottom navigation and floating topbar behavior in Groovex so that entering an individual song mounts the standard Livex Topbar (`SharedFloatingHeader`) with scroll-morphing and hides the Bottom Navbar, while preserving the Bottom Navbar across all library, browsing, and preference views.
- Bottom Navbar Geometric Refinement: Balanced the outer Bottom Navbar pill container curvature and enlarged the active tab highlight into an integrated slot-filling capsule matching reference geometry.

### Improved
- Groovex Instant Local Song Loading: Implemented an in-memory decoded `AudioBuffer` LRU cache and single-pass parallel IndexedDB stem retrieval (`getCachedSongStems`), eliminating repeated CPU decompression and reducing subsequent local song load times to 0ms (instant).
- Parallel Stem Decompression: Replaced sequential serial stem loading with concurrent `Promise.all` Web Audio decompression across background threads, cutting cold local load times by ~85%.
