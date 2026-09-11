# Version 4.5.90

Release Date: 2026-09-11

### Added

- Native Jetpack Compose Hub Architecture: Implemented the first genuinely native Android UI vertical slice for Hub (`NativeHubView.kt`) in Jetpack Compose, featuring hardware-accelerated RenderThread execution, zero DOM tree overhead, and native 90/120 Hz display synchronization.
- Native Morphing Quick Actions & Bottom Dock: Built an in-place morphing Quick Actions surface expanding via native spring physics, alongside a native bottom navigation dock with animated pill selection.
- Native LivexTheme Engine: Added native Compose theme tokens with dedicated support for Light, Dark, and pure `#000000` AMOLED rendering with zero GPU blur fill-rate overhead.

### Fixed

- Global Navigation Latency: Removed full-DOM MutationObserver on document.body and redundant touch listeners in BottomNavigationController, reducing idle script execution and interaction jitter.
- CSS and Transition Optimization: Replaced clipPath inset transitions with GPU-composited transform/opacity animations in StudioPageTransition, and enabled CSS list virtualization containment across long chord and pattern lists.
