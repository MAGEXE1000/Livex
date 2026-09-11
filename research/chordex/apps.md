# Chordex Benchmark App Research & Category Analysis

> **Study Before You Draw**: Analysis of top shipping music, instrument learning, and notation apps.  
> Grounded in the Appllama design methodology to extract layout skeletons, information hierarchy, and interaction rhythm.

---

## 1. Benchmark Apps Studied

| App Name | Category | Primary Interaction Model | Key Design Strengths | Weaknesses / Slop to Avoid |
| :--- | :--- | :--- | :--- | :--- |
| **Ultimate Guitar: Chords & Tabs** | Sheet Music / Tabs | Dense scrollable chord charts with floating transpose & autoscroll pill | Massive catalog discoverability; clear chord diagram popovers | Cluttered visual hierarchy; aggressive paywalls; inconsistent modal models |
| **GuitarTuna / Yousician** | Tuner / Instrument Learning | High-contrast visualizer + game-like interactive fretboard | Immediate tactile feedback; razor-sharp typography; physical metaphor | Heavy cartoon gamification; lack of stage/rehearsal focus |
| **Chordify** | Song Chord Extraction | Horizontal chord progression timeline synced to audio stream | Spatial continuity of chords moving across playback cursor | Rigid beat grid; sluggish scroll synchronization on Android WebView |
| **Moises: The Musician's App** | Stem Player & Audio AI | Dark AMOLED interface with high-density precision sliders | Exceptional dark-mode contrast; micro-interactions on track controls; professional studio feel | Heavy bottom navigation stack; hidden secondary menus |
| **Songsterr** | Guitar Tablature | Multi-track score viewer with sticky tempo/loop controls | Zero-distraction reading mode; clean SVG rendering of notation | Minimal gesture support; utilitarian aesthetic |
| **Apple Music / Spotify** | Streaming & Audio | Standard mini-player to full-screen modal morph with lyrics sync | Flawless sheet drag-to-dismiss; spring-based cover art scaling; continuous corners | Overly simplified controls for performing musicians |

---

## 2. Deep App Journey Breakdowns

### A. Ultimate Guitar (Chord & Notation Flow)
* **Entry Point**: Instant search with typeahead filters (Chords, Tabs, Bass, Ukulele).
* **Information Density**: High. The chord sheet puts lyrics and chord tags on adjacent lines.
* **Control Placement**: Sticky bottom bar with 4 crucial tools:
  1. **Transpose**: Stepper pill (`-1` / `+1` / Key indicator).
  2. **Autoscroll**: Toggle switch + speed stepper.
  3. **Instrument**: Dropdown selector (Guitar, Ukulele, Piano).
  4. **Font Size**: Quick zoom stepper.
* **Key Learning for Chordex**: Performing musicians cannot hunt through multi-level menus while holding an instrument. The primary performance controls (Transpose, Autoscroll, Instrument Voicing) must live in a persistent, one-tap floating action surface.

### B. Moises (Dark Mode & Studio Precision)
* **Surface Materials**: True AMOLED black background (`#000000`) with subtle 1px border cards (`rgba(255, 255, 255, 0.08)`).
* **Control Tactility**: Sliders and toggle switches respond with immediate visual deformation and haptic impact on engagement.
* **Color Restraint**: A single vibrant accent color (electric cyan or gold) reserved strictly for active states, transport playheads, and primary CTAs. Neutrals carry 90% of the screen.
* **Key Learning for Chordex**: Chordex is a stage and practice companion used in dark rehearsal rooms and stages. Dark/AMOLED mode must be first-class, with high optical contrast between chord diagrams and background surfaces.

### C. Yousician / GuitarTuna (Fretboard Visualization)
* **Fretboard Rendering**: Clear string hierarchy (wound strings heavier than unwound strings), distinct finger placement dots with finger numbers (1, 2, 3, 4) and note names.
* **Responsive Scaling**: Diagram maintains aspect ratio across mobile widths, switching to horizontal split-view on wider screens.
* **Key Learning for Chordex**: Chord diagrams must be SVG-based, vector-crisp, and dynamically switchable between:
  - Fret numbers
  - Note names (E, A, D, G, B, E)
  - Scale degrees / intervals (R, 3, 5, b7)

---

## 3. Structural Synthesis

Top-grossing music apps converge on three non-negotiable architectural principles:

1. **The "Instrument in Hand" Touch Law**: Every vital control must have a minimum 48pt tap target and be operable with one hand without shifting phone grip.
2. **Zero Jarring Navigation**: Musicians must never lose their place in a song chart. Dialogs and setting sheets must either morph smoothly from their trigger or present as non-disruptive bottom sheets.
3. **Typography as Structure**: Fixed-width / tabular numbers for tempos, offsets, and timing. Monospaced or cleanly aligned lyric-to-chord mappings to prevent rhythmic misalignment.
