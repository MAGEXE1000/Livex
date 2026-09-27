# Version 4.6.58

Release Date: 2026-09-27

### Added
- Distraction-Free Continuous Lyric Composer: Integrated SongLyricsComposer with continuous free-writing canvas, natural line break behavior, optional floating section shortcuts, and real-time word and line count telemetry without musical metadata clutter.
- Dedicated Song Live Preparation View: Introduced SongLivePreparationView with teleprompter typography formatting (A- / A+ font size, line spacing adjustments), view mode toggle (lyrics only vs chords + lyrics), and section vocal role configuration.

### Improved
- Global Bottom Navigation Persistence & Recovery: Robust lifecycle management and self-healing state machine ensuring the canonical bottom navigation bar is reliably preserved and recovered across all route transitions, tab switches, and internal app navigation.
- LiveMode Teleprompter Section Guarding: Prevented empty pill badge artifacts from rendering on continuous songs with unnamed sections.
- Continuous Lyrics Document Round-Trip: Built robust continuous text conversion with blank line buffering and section header suppression for unnamed sections, ensuring 100% roundtrip data fidelity.
