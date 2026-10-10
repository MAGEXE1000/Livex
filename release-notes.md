# Version 4.7.4

Release Date: 2026-10-09

### Added
- High-Craft Fallback Pages: Designed branded AMOLED 404 ("Frequency Not Found") and 500 ("Audio Stream Interrupted") fallback pages featuring carrier status badges, oscilloscope motifs, tactile recovery actions, and PII-sanitized diagnostics with zero stack trace leakage.
- Production Error Tracking & Launch Rollback Runbooks: Integrated production exception capture with automated PII scrubbing (tokens, authorization headers, email addresses, and audio file stems) and created verified disaster recovery and rollback runbooks.
- Reactive Local Stage Collaboration: Integrated local stage sync state machine with live camera QR scanner, guest waiting room, and synchronized multidevice teleprompter playback.
- Google Play Store Marketing Suite: Integrated automated promo video, device frame screenshots, and feature graphic generator.

### Fixed
- CodeQL Security Hardening: Eliminated all polynomial regular expression ReDoS vectors and prototype pollution vulnerabilities across chord resolution and core parsers.
- Web Performance Optimization: Code-split heavyweight workstation engines (SongsPanel, DrumEditor, StageCorePanel, GroovexPlayer) using dynamic imports and Suspense, reducing the initial entry bundle to < 300KB (< 77KB gzipped).
- Android Startup Hardening: Eliminated startup white screens, secured ContentResolver provider permissions, and configured full debug symbol extraction for compileSdkVersion 36.
