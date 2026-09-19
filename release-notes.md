# Version 4.6.25

Release Date: 2026-09-19

### Fixed
- TopBar AMOLED Visual Depth Restoration: Re-enabled restrained Liquid Glass material blur and calibrated obsidian background tint in AMOLED mode, eliminating the flat pitch-black void while preserving the pure black page aesthetic.
- CSS Filter Syntax Robustness: Introduced `--surface-topbar-backdrop` across all theme states to prevent invalid `none saturate(140%)` evaluation in browsers when blur is disabled.
- Tuner Reference String Audio: Restored authentic recorded instrument sounds across all supported guitars and basses in Chordex tuner, eliminating multi-context hardware conflicts and async decoding races on Android.
- Android Loudspeaker Routing: Resolved `MODE_IN_COMMUNICATION` native routing bug in MainActivity, ensuring tuner reference tones play clearly through device loudspeakers rather than being routed to the silent earpiece receiver.
- Guitar Audio Preview Resolution: Fixed relative asset path resolution for guitar chord previews in Android native Capacitor builds.

### Improved
- TopBar Specular Curvature Highlight: Tuned upper curvature radial highlight for AMOLED to catch subtle natural light along the floating pill rim.
- Fail-Safe Performance Safeguards: Enforced zero blur passes and solid black rendering in AMOLED under performance mode and prefers-reduced-motion.
