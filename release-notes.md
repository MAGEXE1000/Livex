# Version 4.6.23

Release Date: 2026-09-18

### Performance
- Lifecycle-Gated Background Activity: Gated the 15-minute APK update polling and 60-second device presence heartbeat to halt while backgrounded, saving device battery and native wakeups with immediate catch-up on resume.
- Native Theme Transition & Liquid Glass Memory: Slashed peak native allocation during theme transitions by 75% to 96.4% via cached Canvas displacement maps, zero-re-render DOM updates, and compositor offloading.
- Connection-Gated Realtime Synchronization: Eliminated redundant 30s background queries during active Supabase Realtime connections, dropping idle network traffic to zero.
- Cold-Start Sequence Streamlined: Accelerated application boot, aligned splash screen dismissal with DOM hydration, and isolated DevTools diagnostics out of production builds.

### Improved
- Dead Dependency & Bundle Optimization: Completely purged unused drizzle-orm, @tanstack/react-query, and class-variance-authority. Dynamically code-split jspdf (411 kB) out of critical paths.
- Deterministic Vector Iconography: Standardized app-wide icons to deterministic SVG vectors, permanently eliminating unstyled font ligature flash and layout jitter.
