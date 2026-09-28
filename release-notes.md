# Version 4.6.61

Release Date: 2026-09-27

### Fixed
- Synchronize Lyrics Live Timing to Song BPM: Replaced arbitrary speed multipliers and static fallbacks with exact mathematical timing derivations (`beatDurationMs = 60000 / BPM / playbackSpeed`, `lineDurationMs = beatDurationMs * beatsPerLine`, `wordDurationMs = lineDurationMs / wordCount`).
- Drift-Compensated Auto-Play Scheduling: Implemented three dedicated drift-compensated clocks (musical beat clock, chords auto-play clock, and teleprompter lyrics clock) to eliminate cumulative JavaScript event-loop timer drift.
- Fine-Grained 1-BPM Increment Controls: Converted all BPM controls across Live Mode HUD, Live Settings modal, and elastic sliders from coarse 5-step increments to fine-grained 1-BPM increments (+1/-1), with reactive persistence back to the song preset.
- Immediate Seek Recalibration: Added reactive seek tokens so tapping any word or line resets the auto-play timer immediately with zero latency.
