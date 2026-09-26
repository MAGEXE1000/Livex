# Version 4.6.52

Release Date: 2026-09-26

### Improved
- Freeverb IR Web Worker Offloading: Offloaded Freeverb impulse response generation (~1.16M floating-point calculations) to a background Web Worker, eliminating the main-thread freeze on first drum playback with reverb.
- HouseKit Concurrency Cap: Implemented concurrency-capped worker queue for HouseKit audio asset loading, reducing simultaneous `decodeAudioData` operations from ~140 to 6 to eliminate memory pressure and audio thread starvation.
- Audio Clock Sentinel Gate Cleanup: Replaced JavaScript `setTimeout` timers in audio note gate envelopes with audio-clock-accurate `AudioBufferSourceNode` sentinel callbacks, eliminating main-thread timer jitter and graph node accumulation.
- DOM MutationObserver Header Detection: Replaced aggressive 50ms interval polling in navigation scroll observer with `MutationObserver`, completely eliminating idle CPU cycles when DOM elements are mounting.
- Audio Hot-Loop Optimization: Hoisted Zustand store reads out of the per-step audio sequencer tick loop, eliminating repetitive allocations and state queries during playback.
- Sync Engine Debounce & Auto-Backup Guards: Added empty-patch dirty check to `setStatus()`, debounced device registration to 5 minutes, and guarded auto-backup checks to eliminate redundant background sync work.
- Theme Engine Redundant Write Elimination: Removed duplicate pre-dirty-check native storage write in theme manager.
- Console Telemetry Silencing: Wrapped verbose navigation scroll and startup coordinator log calls in `DEV` environment guards, eliminating serialization and bridge overhead in production.
