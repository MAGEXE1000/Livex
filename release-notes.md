# Version 4.6.45

Release Date: 2026-09-24

### Added
- Chordex New-Song Creation Integration: Connected the AI "Import to Chordex" workflow directly to the canonical song creation dialog (`PresetForm`), prefilling title, key, tempo, and notes while allowing user review before saving.
- Canonical Chord Resolution: Integrated `extractCanonicalChordIds` to map generated chords and jazz extensions to canonical Chordex database IDs and automatic `CustomChord` voicings.

### Fixed
- Empty Progression Section: Fixed chord lookup failure in `SongsPanel` by resolving canonical chord IDs and adding dual fallback lookups for chord names and transposed IDs.
- Technical Song Titles: Eliminated system strings and auto-extracted technical titles in favor of concise, musically descriptive song titles.
