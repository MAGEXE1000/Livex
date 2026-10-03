# Version 4.6.89

Release Date: 2026-10-03

### Fixed
- Samsung IME Multi-Line Insert Interception: Added native DOM beforeinput interception in SongLyricsEditor for multi-line text streams, seamlessly normalizing and splicing Samsung Keyboard clipboard pastes into song lyrics and ensuring song content registers immediately for playback.
- Synchronous Focus Restoration on Line Deletion: Relocated caret restoration to synchronous useLayoutEffect during line deletion and merge operations, preventing Android WebView focus loss and keeping the virtual keyboard open during rapid Backspace or word deletion.
