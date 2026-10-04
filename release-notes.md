# Version 4.6.97

Release Date: 2026-10-04

### Added
- Local Stage Sync Rooms (P2P / QR): Architected an instant, zero-cloud offline stage synchronization engine operating over local network, Wi-Fi hotspot, or Bluetooth with sub-15ms baseline latency. Features vector SVG QR code generation, 4-character join code (`LX-408`), camera QR scanner, and real-time beat/playback state broadcasts.
- Stage Sync Delay Calibration Tool: Tactile millisecond latency calibration (`-250ms ... 0ms ... +250ms`) with fine-tuning steppers and visual metronome alignment blink test (Host Reference vs Local Output) for zero acoustic/optical delay across wireless in-ear headphones and stage monitors.
- Setlist Preset Drawer: Bottom drawer component allowing 1-tap switching, inline new setlist creation, renaming, duplicating, and deleting.
- Cloud Band Decoupling: Decoupled cloud Band workspaces into an informative "Coming Soon" modal with direct link to Local Stage Rooms, bypassing broken remote calls.

### Improved
- Setlist TopBar Overhaul: Eradicated the oversized stacked `Main Show 0 + Manage` chrome and giant `[🎵 Main Show ⌵]` pill across `StageSetlistView` and `SetlistDetailView`. Replaced with a sleek, single-row AMOLED header featuring back navigation, track count and runtime metrics, and a compact 36x36px preset selector icon button.
