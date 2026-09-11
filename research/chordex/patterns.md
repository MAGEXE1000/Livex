# Chordex Cross-App Design Patterns & Synthesis

> **Pattern Extraction**: Analyzing recurring structural patterns from market-leading creative and notation software, discarding AI-slop anti-patterns.

---

## 1. Universal Design Patterns

### Pattern 1: The Morphing Action Pill (Performance Scrubber)
* **Observed In**: Apple Music (mini-player), Spotify (Now Playing bar), Moises (Track Mixer Pill).
* **The Grammar**: 
  - In passive reading/scrolling mode, the player or tool sits as a compact, floating pill (44–48px height) anchored above the bottom navigation bar.
  - Tapping does NOT open a full navigation push or hard modal cut.
  - The pill *is* the modal: it physically expands (width, height, corner radius) in a single spatial movement.
  - The expanded card displays granular controls (BPM, autoscroll slider, key transpose wheel, chord voicer).
  - Tapping outside or swiping down reverses the transition, morphing the card back down into the resting pill.

### Pattern 2: Multi-Voicing Diagram Carousel / Matrix
* **Observed In**: Ultimate Guitar, GuitarTuna, Fender Play.
* **The Grammar**:
  - Chords are not single static bitmaps. Every chord has 3–8 standard fretboard voicings (open position, barre at 5th fret, barre at 7th fret, drop-2 voicings).
  - High-tier apps render an inline swipeable carousel of voicings with dots indicating difficulty and root string.
  - Voicing cards have an instant audio audition button (plucking strings sequentially or strumming).

### Pattern 3: Liquid Elastic State Controls (Tactile Feedback)
* **Observed In**: High-end iOS and specialized creative apps (e.g., Teenage Engineering apps, Procreate, Moises).
* **The Grammar**:
  - Mechanical static switches feel dead on mobile touchscreens.
  - Engaging a switch applies physical fluid drag: the toggle thumb stretches in the direction of drag velocity, pulling a trailing fluid tail before snapping into the destination track with spring physics.
  - Accompanied by a synchronized haptic impact at the moment of state commit.

### Pattern 4: Dual Fretboard / Keyboard Semantic Layout
* **Observed In**: Logic Remote, GarageBand, Chordify.
* **The Grammar**:
  - Musicians frequently play both piano and guitar/bass.
  - Rather than burying instrument selection in deep settings, the chord detail card features an immediate segmented toggle: **Guitar | Piano | 4-String | Saxophone**.
  - Changing the instrument maintains the active chord root, inversion, and key context, swapping only the diagram visualization and acoustic playback sample.

---

## 2. Patterns Explicitly Rejected (Anti-Patterns / Slop)

1. **Floating Detached Dialogs for Routine Actions**:
   - *Why Rejected*: Standard desktop-style centered popups with dark scrims disrupt performance flow and block visibility of the chord chart.
   - *Solution*: Replaced by inline morphing action surfaces or bottom sheets with 30%/60%/90% detents.

2. **Generic Neon/Purple Mesh Gradients**:
   - *Why Rejected*: Common AI-slop signature that damages readability on bright stages and drains battery on AMOLED screens.
   - *Solution*: True AMOLED black (`#000000`) paired with one unified high-contrast functional accent (Livex Gold / Amber or Cyan) and neutral zinc surfaces.

3. **Multi-Font Chaos in Song Sheets**:
   - *Why Rejected*: Mixing serif headings with monospace tabs and sans-serif lyrics creates visual noise and misaligns chord markers over lyrics.
   - *Solution*: One disciplined typographical ramp (Inter / System Display) with strictly configured tabular figures (`tabular-nums`) and precise baseline tracking.

4. **Hard-Coded Screen Animations**:
   - *Why Rejected*: CSS `@keyframes` with fixed 300ms durations cannot be interrupted mid-touch and feel synthetic.
   - *Solution*: Physical spring models (`dampingRatio: 1`, `stiffness: 300`) driven by gesture velocity.
