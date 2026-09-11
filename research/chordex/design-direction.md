# Chordex Redesign: Design System & Visual Direction

> **Design Engineering Blueprint**: Grounded in the Appllama Anti-Slop Discipline and Apple Human Interface Guidelines, tailored specifically for the Livex/Chordex brand and musical performance context.

---

## 1. The Anti-Slop Foundations

1. **One Accent Strategy, Locked**:
   - Primary Accent: **Livex Amber Gold** (`#F59E0B` in Light / `#FBBF24` in Dark).
   - Dynamic Custom Hue: User-selected custom accent from `useChordStore` flows into a single unified CSS variable `var(--c-accent)` and RGB token `var(--c-accent-rgb)`.
   - The accent is strictly rationed: only applied to primary CTAs, active tab/filter indicators, chord root badges, and engaged toggle states. 90% of the screen is rendered in the neutral palette.
2. **One Neutral Family, Locked**:
   - We lock strictly to **Neutral Zinc** (`#09090b` to `#fafafa`).
   - No mixing warm browns with cool slates.
   - Deepest Layer (AMOLED): Pure `#000000` with 0% backlight emissions on OLED displays.
3. **Shape Lock (Corner-Radius Hierarchy)**:
   - **Pill (`rounded-full`, 9999px)**: Reserved exclusively for action buttons, badge chips, filter tags, and the `MorphingActionSurface` resting pill.
   - **Container (`rounded-2xl`, 16px)**: Reserved for chord cards, song cards, and modal sheets.
   - **Control (`rounded-lg`, 8px)**: Reserved for input fields and segmented control buttons.
   - Every radius uses continuous curve smoothing (`borderCurve: 'continuous'` / Apple squircle standard).

---

## 2. Token & Metric Ramp

### A. Spacing Rhythm (Strict 4pt / 8pt Grid)
| Token | Dimension | Intended Purpose |
| :--- | :--- | :--- |
| `space-1` | `4px` | Micro gaps (icon-to-badge, indicator dots) |
| `space-2` | `8px` | Tight inline padding, button internal gap |
| `space-3` | `12px` | Card internal item separation |
| `space-4` | `16px` | Screen gutters, standard container padding |
| `space-6` | `24px` | Section margins, hero element separation |
| `space-8` | `32px` | Major group dividers |
| `space-12` | `48px` | Screen bottom padding to clear safe area & navigation bar |

### B. Control Height Scale (Touch Target Compliance)
* **Hero / Action Pill**: `52px` (optimal one-handed stage reach).
* **Standard Button / Input**: `44px` (satisfies Apple HIG / Material tap target minimum).
* **Filter Chip / Pill**: `36px` (compact density with 44px hit-box padding).
* **Micro Control**: `28px` (inline fret indicator / stepper buttons).

### C. Typography Hierarchy (Inter & Display Sans)
* **Hero Title (Large Display)**: `28px` (weight: 800, tracking: `-0.03em`, leading: `1.15`).
* **Section Title / Chord Heading**: `20px` (weight: 700, tracking: `-0.02em`, leading: `1.25`).
* **Body / Song Lyrics**: `16px` (weight: 500, tracking: `0`, leading: `1.5`).
* **Metadata / Sub-labels**: `13px` (weight: 500, tracking: `0.01em`, color: `var(--c-text-secondary)`).
* **Tabular Figures**: `font-variant-numeric: tabular-nums` applied unconditionally to:
  - BPM counters
  - Song duration timers
  - Fret numbers
  - Transposition offset steppers (`+1`, `-2`)

---

## 3. Surface Hierarchy & Elevation Model

```
Level 0: Canvas Base (AMOLED #000000 / Light #FFFFFF)
   │
   ▼
Level 1: Recessed Surface (#121215 / Light #F4F4F5, border: 1px solid rgba(255,255,255,0.06))
   │     [Chord Cards, Song Card Grid, Settings Group Scaffolds]
   │
   ▼
Level 2: Floating Action Layer (#18181B / Light #FFFFFF, shadow: 0 8px 32px rgba(0,0,0,0.4))
   │     [MorphingActionSurface Expanded, Bottom Sheets, LiquidSwitch Track]
   │
   ▼
Level 3: Active Focus / Tactile Thumb (Accent or #FFFFFF)
         [LiquidSwitch Thumb, Drag Handles, Active Segment Indicator]
```

---

## 4. Theme Modes & AMOLED Optimization

* **Dark Mode**:
  - Background: `#09090b` (Deep Zinc).
  - Card Fill: `#141417` (Subtle 1px border `#27272a`).
  - Text Primary: `#fafafa` (100% white with slight optical soften).
  - Text Secondary: `#a1a1aa` (Zinc 400).
* **AMOLED Mode (Performance / Battery Saving)**:
  - Background: `#000000` (Zero pixel power).
  - Cards: `#0b0b0d` with crisp 1px borders (`#1f1f23`).
  - Maximizes contrast for dim stage and night rehearsal settings.
* **Light Mode**:
  - Background: `#fcfcfd`.
  - Card Fill: `#ffffff` (Shadow: `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)`).
  - Text Primary: `#09090b` (Deep charcoal, never pure harsh `#000000`).
  - Text Secondary: `#71717a` (Zinc 500).

---

## 5. State Representation Contracts

* **Pressed State**: Instant scale reduction to `0.97` + background brightness shift within 100ms.
* **Selected / Active State**: Single accent stroke or solid accent background with high-contrast text.
* **Disabled State**: Opacity reduced to `0.38`, pointer events disabled (`pointer-events: none`), cursor set to `not-allowed`. Zero layout shifting when toggling disabled state.
* **Loading State**: Shimmer skeleton layout matching the EXACT geometry of the resolved chord/song card. No generic spinning circular loaders for partial content.
