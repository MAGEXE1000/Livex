# Version 4.6.54

Release Date: 2026-09-26

### Improved
- Navigation Latency Calibration: Replaced artificial 300ms setTimeout measurement in NavigationDispatcher with frame-accurate nested requestAnimationFrame, capturing real frame paint completion (18ms average latency). Synchronized transition lock duration with canonical 200ms motion specs.
- Hub Settings Monolith Pruning: Eradicated 1,265 lines of dead legacy developer panel code and unused state in HubSettings, eliminating closure allocation overhead and reducing synchronous JS parse latency.
- Component Lifecycle Stabilization: Extracted UpdaterSettingsContent to module scope as an independent React component, eliminating function component identity recreation, rule-of-hooks violations, and catastrophic DOM unmount/remount thrashing on settings renders.
- Developer Panel Lifecycle & Background Polling Teardown: Conditionally unmount DevToolsDashboard when navigating away from developer settings, terminating 5,000ms background polling timers and profiler subscriptions.
- Dual-Instance Hub Settings Elimination: Guarded LivexHub settings and profile tabs to prevent maintaining duplicate concurrent 5,000-line HubSettings component trees in memory.
- Comprehensive Performance Report Generation: Upgraded DevTools Performance "Copy" button to dynamically synthesize a comprehensive, 11-section diagnostic report directly from the live singleton PerformanceProfiler.
