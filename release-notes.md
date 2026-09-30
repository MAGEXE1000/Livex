# Version 4.6.66

Release Date: 2026-09-30

### Added
- Butter-Smooth Sliding Letter Lyric Highlight: Implemented GPU compositor text-clip gradient wipe (`@keyframes lyric-word-wipe`) that fluidly glides across letters in lockstep with the precision timeline clock with 0 lag and 120fps hardware acceleration.
- Luminous Accent Bloom on Sung Words: Enhanced active lyrics in both Teleprompter and Both (Hybrid) modes with glowing leading edges and subtle drop-shadow depth.

### Fixed
- Super-Optimized Live Mode Performance: Streamlined chord and lyric state synchronization in LiveModeUI, eliminating redundant recalculations and layout shifts during auto-play and manual word seek.
