# Chordex Redesign: Core Screen Architectures

> **Flow Mapping**: Structural blueprints for each major Chordex surface, detailing hierarchy, control placement, gesture model, and state transitions.

---

## Screen 1: Chord Library & Discover (`/chords/library`)

### 1. Hierarchy & Structure
* **Top Navigation Bar**:
  - Brand identity (`Livex / Chordex`) + Active Instrument Indicator (`Guitar · Standard Tuning`).
  - Search trigger icon + Quick Chord Finder CTA.
* **Filter Strip (Horizontal Scroll)**:
  - Pills: `All`, `Major`, `Minor`, `7th`, `Maj7`, `m7`, `Dim`, `Aug`, `Suspended`.
  - Continuous corner pills (height 36px) with single-accent active fill.
* **Primary Content Area (Virtualized Grid / List)**:
  - 2-column card grid on mobile, 4-column on tablet/web.
  - Each Chord Card contains:
    - Chord Symbol (e.g. `Cmaj7`, large bold typography).
    - Compact vector fretboard thumbnail (6 strings, 4 frets).
    - Difficulty pill (`Basic`, `Intermediate`, `Advanced`).
    - Quick Play Audio Button (plucks chord in Karplus-Strong audio).
    - Favorite heart toggle (immediate optimistic state).
* **Empty / Search State**:
  - Composed graphic empty state with clear call to action ("No chords found matching 'D#dim'. Try searching for root 'D#' or 'Eb'").

### 2. Interaction & Gestures
* **Tap on Card**: Triggers smooth shared-element transition or push to **Chord Detail View**.
* **Long Press on Card**: Opens native context menu / compact preview card without navigating.
* **Scroll**: Softly collapses the top filter strip using progressive scroll offset.

---

## Screen 2: Chord Detail & Voicing Studio (`/chords/chord/:id`)

### 1. Hierarchy & Structure
* **Hero Header**:
  - Chord Root & Suffix (`F#m7b5`) with enharmonic alternative (`Gb...`).
  - Theory Formula Pill (`1 - b3 - b5 - b7`).
* **Instrument Selector Segment**:
  - 4-segment pill switch: `Guitar` | `Piano` | `4-String` | `Saxophone`.
* **Main Diagram Stage (Full Width / Optical Center)**:
  - High-resolution SVG rendering of active fretboard or piano keys.
  - Interactive string/key touch: tapping a specific string plays that note's frequency.
  - Toggle layers: `Finger Numbers` | `Note Names` | `Interval Degrees`.
* **Voicings Carousel**:
  - Horizontal swipe through alternate voicings (Position 1 at Nut, Position 2 at 5th fret, Position 3 at 9th fret).
* **Related Chords & Progression Suggestions**:
  - Algorithmic recommendations based on voice leading (`getRelatedChords(id)`, `suggestNextChord(id)`).
* **Persistent Bottom Action Bar**:
  - `Add to Progression` button.
  - `MorphingActionSurface` trigger: `Practice this Chord`.

---

## Screen 3: Song Practice & Lyric Viewer (`/chords/songs/:id`)

### 1. Hierarchy & Structure
* **Header / Song Meta**:
  - Song Title, Artist, Original Key, Current Transposition (`Original: G -> Current: A (+2)`).
  - Song Section Pills (`Intro`, `Verse 1`, `Chorus`, `Bridge`, `Outro`).
* **Main Sheet View (Dual Column or Responsive Flow)**:
  - Chord tags floating directly above lyrics with perfect vertical optical alignment.
  - Tapping any inline chord tag highlights that chord's diagram in a non-modal bottom sheet without interrupting scroll or playback.
* **Floating Performance HUD (`MorphingActionSurface`)**:
  - Resting State: Floating pill at bottom right containing `BPM: 110` | `Key: A (+2)` | `Auto-scroll: OFF`.
  - Expanded State: Morphs into full stage controller with:
    - Continuous auto-scroll speed slider.
    - Transposition wheel (`-6` to `+6`).
    - Chord diagram display toggle (show inline fretboards vs clean lyric text).
    - Audio backing track player / stem sync controls.

---

## Screen 4: Chordex Preferences & Audio Settings (`/chords/settings`)

### 1. Hierarchy & Structure
* **Grouped Settings Scaffold** (iOS/Material 3 hybrid standard):
  - **Playback & Instruments**:
    - Default Instrument (`Guitar`, `Piano`, `Ukulele`, `Saxophone`).
    - Strum Speed Slider (fast stroke vs slow arpeggio).
    - Audio Synthesizer Mode (Physical Karplus-Strong string synthesis vs Sampled wavetable).
  - **Fretboard Display**:
    - Left-Handed Mode (horizontal fretboard flip).
    - Color Dot Scheme (`Accent Color`, `Interval Colors`, `Finger Heatmap`).
    - Show Nut Marker & Fret Numbers.
  - **Stage & Display**:
    - AMOLED True Black Background (Pure `#000000` toggle).
    - Keep Screen Awake during Practice (WakeLock API / Capacitor KeepAwake).
* **Control Unification**:
  - Every boolean toggle is governed by the unified **LiquidSwitch** component.
