# Version 4.6.15

Release Date: 2026-09-16

### Fixed
- Top-Bar Boundary Distortion Elimination: Decoupled the SVG displacement filter from the outer top-bar container and isolated micro-refraction to an internal clipped plane, eliminating wavy/wiggly edge deformation and boundary ripping.
- Top-Bar Content Clearance Normalization: Expanded scroll viewport top padding from `+ 78px` to `+ 92px` across all application scaffolds and detail views, providing 26px breathing room and preventing content from colliding with the floating top bar.

### Improved
- OpenDesign Liquid Glass Morph: Upgraded scroll-reactive header morph with cubic Hermite smoothstep easing and monotonic continuous curvature (18px to 24px to 9999px), delivering fluid physical capsule condensation with zero step discontinuities.
- Subtle Optical Refraction Tuning: Standardized turbulence and displacement parameters to `scale="2"` and `baseFrequency="0.04 0.04"`, producing clean, premium neutral Liquid Glass without RGB edge artifacts.
