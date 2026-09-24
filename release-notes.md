# Version 4.6.42

Release Date: 2026-09-24

### Improved
- Continuous Updater Surface Morphing: Eliminated dialog component unmounting between Checking and Update Available states, maintaining DOM persistence across the entire update lifecycle.
- In-Place Spring Typography & Status Transitions: Added physics-based spring layout transitions with blur crossfades for header title, description, and state labels to prevent abrupt layout pops.
- Coordinated 100% Download-to-Install Handoff: Decoupled the installing UI switch from download progress completion so 100% download state remains visible with a fluid smooth morph into the installing surface.
- Low-Performance Fallback Guard: Safeguarded blur animations on lower-tier hardware by automatically skipping high-overhead filter transforms when performance mode is set to low.
