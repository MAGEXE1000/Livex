# Version 4.5.92

Release Date: 2026-09-12

### Performance

- Complete Android Sub-App Code-Splitting Isolation: Converted DrumEditor, StageCorePanel, VocalexApp, GroovexApp, DevToolsApp, and UpdateIndicator to code-split dynamic imports across shared feature barrels and ui-shared root, completely eliminating all INEFFECTIVE_DYNAMIC_IMPORT warnings.
- Android Initial Bundle Reduction: Reduced the initial Android JavaScript entry chunk (index.js) by 53.4% (from 1,551.87 kB to 722.59 kB raw, and by 55.1% gzipped from 357.32 kB to 160.37 kB), dramatically lowering cold-start parsing and JavaScript evaluation overhead on Android WebView.
- Cold-Start Import Decoupling: Decoupled EmergencyDebugOverlay, MobileDevicePreviewFrame, and ui-android to use direct subpaths, preventing accidental evaluation of the root ui-shared barrel during application boot.
- Phase 7A–7J Baseline Consolidations:Decoupled GSAP/SplitText, strengthened reduced-motion accessibility, aligned Metronome and global Dialog/Sheet with native BackDispatcher, narrowed Zustand subscriptions, and pruned stale motion build configurations.
