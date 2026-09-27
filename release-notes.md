# Version 4.6.59

Release Date: 2026-09-27

### Improved
- Android Back Navigation Containment (Option A1): Enforced strict intra-app domain containment across all sub-apps (Chordex, Drumex, StageX, Groovex, Vocalex) on system back gesture and edge swipe.
- Chordex Filter & Search Back Interception: Back gesture now clears active search queries in SongsPanel and resets chord/category filters in LibraryPanel before unwinding, preventing premature fallthrough to Hub.
- Sub-App Coordinator Back Handlers: Integrated coordinator panel handlers in StageCorePanel, DrumEditor, GroovexApp, and VocalexApp to cleanly unwind sub-views to root without crossing app boundaries.
- Hub Shell & Settings Navigation: Maintained Settings root navigation popping to Hub Home tab, allowing native application backgrounding only from the Hub Home tab.
