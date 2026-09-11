# Chordex Interaction Architecture: MorphingActionSurface & LiquidSwitch

> **Motion & Interaction Specification**: Detailed technical models, spring physics parameters, coordinate transforms, and state machines for the two signature interaction primitives requested by the user.

---

## 1. Interaction Primitive: `MorphingActionSurface`

### A. The User-Provided Reference Motion Model
The user reference demonstrates a spatial transformation where a trigger button does not spawn an isolated, detached dialog or fade in a separate overlay. Instead:
1. **Trigger Resting State**: A compact pill-shaped button sits anchored in the layout.
2. **Press Acknowledgement**: On press-in (touch start), the pill sinks slightly (`scale: 0.96`, opacity drops to `0.92`, duration ~120ms).
3. **Spatial Expansion**: Upon release/trigger, the exact same spatial object begins expanding. `width`, `height`, and `borderRadius` transform as **ONE single coordinated movement**.
4. **Content Entry Choreography**: The background shell expands first; content rows/controls enter shortly after the shell begins expanding (staggered delay ~40ms, translating up from `+8px` to `0px` with opacity `0 -> 1`).
5. **Stage Centering**: The opened surface smoothly aligns itself to the optical center of the viewport or container.
6. **Outside Press Dismissal**: Tapping any backdrop area outside the visible surface initiates closure.
7. **Coordinated Reverse Morph**: Closing reverses the transformation: the panel's content quickly fades out (~100ms) while the shell contracts back in width, height, and border radius directly into the resting pill.

### B. State Machine Definition
```
[ CLOSED_PILL ] 
       │  (onPointerDown)
       ▼
[ PRESSED_SINK ] 
       │  (onPointerUp / trigger)
       ▼
[ MORPHING_OPEN ] ──── (Spring complete ~280ms) ────► [ OPEN_PANEL ]
       ▲                                                    │
       │                                                    │ (onDismiss / outsideClick / escape)
       └────────────── [ MORPHING_CLOSE ] ◄─────────────────┘
                               │ (Reverse complete ~240ms)
                               ▼
                        [ CLOSED_PILL ]
```

### C. Physical Parameter Specifications
| Parameter | Opening Spring | Closing Spring | Press Feedback |
| :--- | :--- | :--- | :--- |
| **Animation Model** | Damped Harmonic Spring | Overdamped Spring | Linear Ease-Out |
| **Stiffness / Tension** | `340` | `400` | `500` |
| **Damping Ratio** | `0.82` (slight organic overshoot) | `1.0` (zero bounce on exit) | `0.9` |
| **Duration (equivalent)** | `~280ms` | `~220ms` | `~100ms` |
| **Content Stagger** | `+40ms` offset, `30ms` per row | N/A (instant synchronous exit) | N/A |
| **Corner Radius Transform** | `9999px` (pill) &rarr; `20px` (card) | `20px` &rarr; `9999px` (pill) | Maintained (`9999px`) |

### D. Accessibility & Reduced Motion Contract
* **Keyboard Navigation**: Pressing `Escape` triggers `MORPHING_CLOSE`. Initial focus is trapped within the opened surface; focus restores to the trigger pill on close.
* **Reduced Motion (`prefers-reduced-motion: reduce`)**:
  - The geometric dimension morph (width/height/radius interpolation) is bypassed.
  - The trigger pill fades out (`opacity: 0`, 100ms), and the centered panel fades in (`opacity: 1`, 150ms).
  - No motion sickness or vestibular disorientation.

---

## 2. Interaction Primitive: `LiquidSwitch`

### A. The Visual & Physical Phenomenon
Standard native switches (iOS UISwitch or Android Material Switch) move a rigid circular thumb along a horizontal track.
The **LiquidSwitch** creates a physical fluid-droplet sensation:
1. **Motion Value Thumb**: The primary thumb follows the user's touch or toggle target via a continuous spring.
2. **Trailing Secondary Blob (Drop Blob)**: A secondary droplet follows the primary thumb through a looser, delayed spring system.
3. **Velocity-Dependent Distance & Stretch**:
   - When toggled slowly or gently, the secondary blob stays tightly nested inside the primary thumb, appearing as a clean, compact circle.
   - When flicked or dragged rapidly, the velocity difference between the primary thumb and the secondary follower causes the shape to stretch horizontally into an elongated viscous liquid drop.
4. **Viscous Bridge & Snap-Release**:
   - As the thumb crosses the halfway point of the track, the liquid droplet contracts back into a solid circle with a snappy rubber-band retraction.
   - Releasing the switch settles all motion values through the spring system without artificial animation jumps or frame pops.
5. **Material Uniformity**: The surface is 100% opaque solid (no semi-transparent artifacts or muddy blends), rendering with razor-sharp vector/canvas contours in both Light Mode and AMOLED Dark Mode.

### B. Mathematical Model & Motion Coordinates
Let $x_{\text{thumb}}(t)$ be the position of the primary thumb ($0 \le x \le L_{\text{track}}$).
Let $x_{\text{follower}}(t)$ be the position of the secondary trailing droplet governed by:
$$\ddot{x}_{\text{follower}} + 2\zeta\omega_n \dot{x}_{\text{follower}} + \omega_n^2 (x_{\text{follower}} - x_{\text{thumb}}) = 0$$
Where:
- Natural frequency $\omega_n = 28$
- Damping ratio $\zeta = 0.76$

The stretch factor $S(t)$ and elongation $\Delta x(t)$ are derived from instantaneous velocity $v(t)$:
$$\Delta x(t) = x_{\text{thumb}}(t) - x_{\text{follower}}(t)$$
$$S_x(t) = 1 + \min\left(0.45, \frac{|\Delta x(t)|}{W_{\text{thumb}}} \times 0.6\right)$$
$$S_y(t) = \frac{1}{\sqrt{S_x(t)}} \quad \text{(Volume Preservation)}$$

### C. Color Token Integration
| State | Track Background | Thumb Color | Follower Droplet |
| :--- | :--- | :--- | :--- |
| **OFF (Dark / AMOLED)** | `#1c1c21` (1px border `#2a2a32`) | `#71717a` (Zinc 500) | Matches Thumb |
| **ON (Dark / AMOLED)** | `var(--c-accent)` (Livex Accent) | `#ffffff` (Pure White) | Matches Thumb |
| **OFF (Light Mode)** | `#e4e4e7` (Zinc 200) | `#ffffff` (Pure White) | Matches Thumb |
| **ON (Light Mode)** | `var(--c-accent)` | `#ffffff` (Pure White) | Matches Thumb |

### D. Repository-Wide Component Consolidation
* Every toggle switch across Chordex:
  - `ChordexPreferencesPanel.tsx` (Instrument voicings, left-handed mode, AMOLED toggle)
  - `SongsPanel.tsx` (Autoscroll toggle, metronome click, chord highlight)
  - `LiveModeUI.tsx` (Practice timers, notation display)
  will import and consume this **exact same single-source-of-truth component**:
  `packages/ui-shared/src/shared/design-system/LiquidSwitch.tsx`.
