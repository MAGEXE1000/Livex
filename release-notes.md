# Version 4.6.43

Release Date: 2026-09-24

### Added
- Multimodal Livex AI Assistant: Added native musical vision analysis for fretboard photos, fingering charts, sheet music, tabs, pedalboard rigs, and DAW screenshots via Gemini multimodal models.
- Structured Document Ingestion: Enabled seamless base64 decoding and prompt injection for musical text documents (.txt, .md, .csv, .tab, .chordpro, .json) with a 15MB file size limit guard.
- Truthful AI Activity State Machine: Integrated official thinking-orbs states (working, searching, solving, composing, shaping, weaving, listening) with real-time visible status labels directly driven by edge gateway events.
- Multimodal Composer Controls: Added file validation rejecting unsupported binary formats and enabled instant submission with image/audio attachments without requiring typed text.

### Improved
- Assistant Message Visual Parity: Rendered dedicated thumbnail preview cards for user image attachments and responsive icon badges for audio and chord documents.
- State-Driven ThinkingOrb Transitions: Eliminated arbitrary progress bars and fake timers, ensuring seamless handoff from reasoning and searching states into streaming content tokens.
- Dynamic Sub-State Badging: Added live indicator badges during streaming to surface ongoing grounding or recommendation synthesis without blocking chat flow.
