# Version 4.6.12

Release Date: 2026-09-15

### Fixed & Improved

- Permanent Capsule Pill Curvature: Completely eliminated intermediate square/rectangular card states during scroll-linked morphing. The floating top bar maintains an intrinsic, continuous pill curvature (`border-radius: 9999px`) across all scroll frames with zero intermediate card artifacts.
- Inner Title Metrics Precision: Hardened `updateMetrics` in `useScrollMorph` to resolve inner typography bounds, ensuring accurate left-to-center mathematical alignment during scroll morph.
- Compositor-Only Layout Protection: Removed per-frame padding mutations in the morph loop to eliminate layout recalculations, sustaining 120 FPS fluid motion on Android WebView.
