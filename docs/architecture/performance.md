import { DurationPresets, EasingPresets } from '@workspace/livex-core';
# Performance Architecture

## Overview

Studio employs multiple performance strategies across rendering, animation, lazy loading, state management, and startup optimization. This document catalogs the patterns in use.

## Startup Pipeline

The startup coordinator (`startupCoordinator.ts`, 888 lines) orchestrates a 7-phase boot sequence:

| Phase | Name                      | Timeout | Purpose                                                 |
| ----- | ------------------------- | ------- | ------------------------------------------------------- |
| 1     | Native initialization     | 5s      | Capacitor platform detection, boot timings              |
| 2     | Theme initialization      | 5s      | Apply theme tokens, start store sync subscription       |
| 3     | Navigation initialization | 5s      | Restore last session or set default app                 |
| —     | Intro splash              | 2.5s    | Waits for `studio-intro-done` custom DOM event          |
| 5     | Hub initialization        | 5s      | Mount Hub DOM, await 2× rAF for paint                   |
| 4     | Updater initialization    | 10s     | Post-hub updater setup                                  |
| 6     | Background services       | 15s     | Supabase auth, UI preloading, audio seeds, temp cleanup |
| 7     | Developer tools           | 5s      | Failsafe recovery handlers                              |

### Startup Safety Features

- **Phase retries**: Each phase has configurable `maxRetries`
- **Timeout enforcement**: Hard timeout per phase with error logging
- **Run ID cancellation**: Prevents stale phases from completing after restart
- **Watchdog timer**: 2s interval detects stalled phases (>1.5× budget) and missing Hub DOM
- **Lifecycle debouncing**: 200ms coalescing prevents visibility/focus trigger storms
- **`__studioStartupComplete`**: Global flag set after Hub paints, used by diagnostics

### Native Boot Timings

Injected from Android into WebView:

```javascript
window.__nativeBootTimings = {
  processStart, // Process.getStartElapsedRealtime()
  onCreate, // SystemClock.elapsedRealtime() at onCreate
  webViewInit, // SystemClock.elapsedRealtime() at WebView init
};
```

JS records `performance.now()` for each phase, stored in `__bootTimings`.

## Rendering Optimization

### Lazy Loading

- **Feature modules**: All sub-components in Groovex, Vocalex, and Drumex use `React.lazy()`
- **Android entry**: `UpdateIndicator` and `EmergencyDebugOverlay` are lazy-loaded
- **Web entry**: Minimal — uses `TolgeeProvider` wrapping
- **Background services phase**: Uses `requestIdleCallback` for eager UI module preloading after startup

### Keep-Alive Panel Pattern

`SharedNavigationContainer` keeps visited panels mounted in the DOM rather than unmounting/remounting:

```
m3-nav-active    → visible, interactive
m3-nav-hidden    → hidden (display: none), but DOM-retained
m3-nav-exit-*    → animating out
m3-nav-enter-*   → animating in
```

This eliminates re-render costs for panel switches at the expense of memory.

### Zustand Selective Subscriptions

```typescript
import { useShallow } from 'zustand';

// Only re-renders when selectedChordId or favorites change
const { selectedChordId, favorites } = useChordStore(
  useShallow((state) => ({
    selectedChordId: state.selectedChordId,
    favorites: state.favorites,
  }))
);
```

`useShallow` is re-exported from `studio-core` and used throughout for selective store subscriptions.

### State Partitioning

Both `useChordStore` and `useDrumStore` use `partialize` to exclude volatile state from persistence:

```typescript
persist(stateCreator, {
  partialize: (state) => ({
    // Only persist essential fields
    selectedChordId: state.selectedChordId,
    settings: state.settings,
    favorites: state.favorites,
    // Exclude: functions, volatile UI state, instFX
  }),
});
```

## Animation Performance

Animations are optimized to run smoothly on mobile WebViews by prioritizing GPU-accelerated properties, hardware layer promotion, and centralized scheduling.

### Centralized Easing & Token Mapping

By moving to centralized M3 tokens in the `AppAnimationSystem` (e.g., `DurationPresets` and `EasingPresets`), we ensure the browser's style calculation cache is highly hit, avoiding layout recalculation during transitions.

### Hardware Acceleration (GPU Layer Promotion)

To prevent repaints on heavy page loads, animated components (such as buttons, cards, and floating action buttons) explicitly promote themselves to their own compositor layer:

- Utilizes `willChange: 'transform'` or `willChange: 'transform, opacity'`.
- Leverages hardware-accelerated CSS properties (`transform`, `opacity`, `scale`) rather than animating properties that trigger layout flow (`top`, `margin`, `width`, `height`).

### Layout Projection Optimization

The `SegmentedControl` sliding background utilizes Framer Motion's `layoutId` layout projection:

- Animating layout boundaries is typically expensive, but using `layoutId` ensures the browser runs FLIP calculations (First, Last, Invert, Play).
- This calculates start/end states once, applying translation and scale adjustments on the GPU without triggering costly layout reflows for neighboring grid/flex elements.
- Unique `layoutId` values are assigned per control instance to segment layout projection recalculations and avoid cross-contamination.

### Reduced Motion Support

All animated elements centrally respect accessibility flags via `usePrefersReducedMotion()`. When active:

- Standard motion curves are disabled.
- Transitions either execute instantly (0ms) or switch directly to simple opacity changes to prevent motion-induced discomfort.

### Animation Speed Scaling

Dynamic speed scaling allows the user to accelerate UI transitions.

```typescript
function useAnimationSpeed(): number {
  // Returns multiplier: 0.6 for fast (animates 40% faster), 1.0 for normal
  const { animationSpeed } = useChordStore((s) => s.settings);
  return animationSpeed === 'fast' ? 0.6 : 1.0;
}
```

All duration tokens are dynamically multiplied by this coefficient before evaluation in Framer Motion wrappers.

### Transition Coordination

`AnimationCoordinator` (singleton) dispatches custom events to prevent overlapping transitions and thrashing:

```typescript
AnimationCoordinator.startTransition('page-change');
// → dispatches 'studio:transition-start' on window
// → after duration, dispatches 'studio:transition-end'
```

This is used to defer expensive audio engine actions until the current animation frame completes.

## Scroll-Hide Navigation

`navScroll.ts` (354 lines) manages navigation bar visibility during scrolling:

- **Auto-hide**: Programmatic show/hide based on scroll direction
- **Auto-show timeout**: 4000ms timer re-shows hidden nav
- **Lock mechanism**: Prevents unlocking during modal/sheet states
- **Pill collapse**: Compact navigation bar state for content-focused views

## Performance Profiler

A `PerformanceProfiler` module exists in `studio-core/src/lib/performance/`:

- Tracks phase durations during startup
- Measures render timings
- Records visual repaint logs in localStorage
- High refresh rate RAF tick (`startHiFpsTick`/`stopHiFpsTick`)

## Encrypted Storage Performance

All Zustand stores use encrypted localStorage via `secureReadLocal`/`secureWriteLocal` from `lib/security`. This adds encryption/decryption overhead on every persist cycle, which is a conscious security-over-performance tradeoff.

## Service Worker Cleanup

Both Android and Web entry points clean up service workers on version change:

```typescript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
// Clear cache storage
caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
```

This prevents stale cached assets from interfering with OTA updates.

## Memory Considerations

| Pattern            | Memory Impact                           |
| ------------------ | --------------------------------------- |
| Keep-alive panels  | Higher — all visited panels stay in DOM |
| Lazy loading       | Lower — components load on demand       |
| Zustand partialize | Lower — only essential state persisted  |
| Encrypted storage  | Higher — encryption buffers             |
| Lottie animations  | Higher — JSON animation data in memory  |
| Audio sample pool  | Higher — decoded audio buffers cached   |

## Known Performance Risks

1. **Large component files**: `StudioHub.tsx` (262 KB), `DrumEditor.tsx` (363 KB), `AccountCard.tsx` (249 KB) — parsing/compilation cost
2. **Keep-alive accumulation**: All visited panels remain mounted, increasing DOM node count
3. **Encrypted storage I/O**: Every state change triggers encrypt → serialize → write
4. **Audio buffer caching**: Decoded samples held in memory across kit switches
5. **Lottie in components**: 8 Lottie JSON files loaded for various loading/empty states
