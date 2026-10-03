---
name: animate-ui
description: ">"
---

# Prototyper UI — Animation Conventions

All animation decisions for Prototyper UI components. Patterns first, then lookup tables, then rules, then per-component details.

---

## 1. Copy-Paste Patterns

These five patterns cover ~95% of animation work. Copy the exact class strings.

### Pattern A: Positioned Overlay

Used by: Popover, Menu, Tooltip, Select, Combobox, Context Menu, HoverCard, Menubar.

```tsx
className={cn(
  // Enter
  "data-open:animate-in data-open:duration-150",
  "data-open:[animation-timing-function:var(--ease-out-fluid)]",
  "data-open:fade-in-0 data-open:zoom-in-95",
  // Exit
  "data-closed:animate-out data-closed:duration-100",
  "data-closed:[animation-timing-function:var(--ease-in-quart)]",
  "data-closed:fade-out-0 data-closed:zoom-out-95",
  // Direction-aware slide (2 = 0.5rem)
  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=top]:slide-in-from-bottom-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  // Origin from trigger position
  "origin-(--transform-origin)",
  // Performance
  "data-entering:will-change-[opacity,transform]",
  "data-exiting:will-change-[opacity,transform]",
  // Accessibility
  "motion-reduce:animate-none motion-reduce:transition-none",
)}
```

### Pattern B: Dialog (Center)

```tsx
// Backdrop
className={cn(
  "data-open:animate-in data-closed:animate-out",
  "data-closed:fade-out-0 data-open:fade-in-0",
  "duration-200",
  "bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
  "motion-reduce:animate-none motion-reduce:transition-none",
)}

// Content — note the slight overshoot scale
className={cn(
  "data-open:animate-in data-closed:animate-out",
  "data-closed:fade-out-0 data-open:fade-in-0",
  "data-closed:zoom-out-[0.98] data-open:zoom-in-[1.02]",
  "duration-200 ease-out-fluid",
  "data-entering:will-change-[opacity,transform]",
  "data-exiting:will-change-[opacity,transform]",
  "motion-reduce:animate-none motion-reduce:transition-none",
)}
```

Dialog uses `zoom-in-[1.02]` (slight overshoot) and `zoom-out-[0.98]` — subtler than overlay's `zoom-in-95`/`zoom-out-95`.

### Pattern C: Sheet (Side-Aware)

```tsx
const sheetVariants = cva(
  // Base: transition + split enter/exit duration
  "transition ease-out-fluid " +
    "data-open:animate-in data-open:duration-300 " +
    "data-closed:animate-out data-closed:duration-200 " +
    "data-entering:will-change-[opacity,transform] " +
    "data-exiting:will-change-[opacity,transform] " +
    "motion-reduce:animate-none motion-reduce:transition-none",
  {
    variants: {
      side: {
        top: "data-open:slide-in-from-top data-closed:slide-out-to-top",
        bottom:
          "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
        left: "data-open:slide-in-from-left data-closed:slide-out-to-left",
        right: "data-open:slide-in-from-right data-closed:slide-out-to-right",
      },
    },
  },
);
```

Sheets slide 100% (full edge-to-edge), not `slide-*-2` like positioned overlays.

### Pattern D: Press Feedback

```tsx
"motion-safe:active:scale-[0.97]"; // Standard interactive elements
"motion-safe:active:scale-[0.98]"; // Menu items, tab triggers
"motion-safe:active:scale-[0.95]"; // Small controls
"motion-safe:active:scale-100"; // Explicitly disabled (ghost/link buttons)
```

Always `motion-safe:` prefix — never bare `active:scale-*`. Checkbox uses `motion-safe:group-active:scale-[0.95]` (group variant).

| Scale          | Components                                                                         |
| -------------- | ---------------------------------------------------------------------------------- |
| `scale-[0.97]` | Button (default), Switch (track), Toggle, Toolbar (Button, Link), Select (trigger) |
| `scale-[0.98]` | Menu items (Item, SubTrigger, CheckboxItem, RadioItem), Tabs (trigger)             |
| `scale-[0.95]` | Checkbox (control), RadioGroup (item), NumberField (Increment, Decrement)          |
| `scale-100`    | Button ghost variant, Button link variant                                          |

### Pattern E: State Transition

```tsx
"transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-smooth";
"motion-reduce:transition-none";
```

Used by: Button, Checkbox, Combobox (input/chips/chip-remove), Field (FieldGroup), Input, InputGroup, Menu items, NumberField, RadioGroup, Select (trigger), Tabs (trigger), TextField, Textarea, Toggle, Toolbar (button/link/input), NavigationMenu (trigger/link), Accordion (trigger).

---

## 2. Easing Tokens

Defined in `apps/docs/registry/prototyper-tokens.css`:

| Token              | Value                                     | When to use                                              |
| ------------------ | ----------------------------------------- | -------------------------------------------------------- |
| `ease-smooth`      | `cubic-bezier(0.4, 0, 0.2, 1)`            | State transitions, on-screen changes                     |
| `ease-out-fluid`   | `cubic-bezier(0.32, 0.72, 0, 1)`          | Elements entering: overlays, sheets, switch/slider thumb |
| `ease-in-quart`    | `cubic-bezier(0.895, 0.03, 0.685, 0.22)`  | Elements exiting: overlay dismiss                        |
| `ease-out-quad`    | `cubic-bezier(0.25, 0.46, 0.45, 0.94)`    | Available, currently unused                              |
| `ease-out-quart`   | `cubic-bezier(0.165, 0.84, 0.44, 1)`      | Available, currently unused                              |
| `ease-in-quad`     | `cubic-bezier(0.55, 0.085, 0.68, 0.53)`   | Available, currently unused                              |
| `ease-in-out-quad` | `cubic-bezier(0.455, 0.03, 0.515, 0.955)` | Available, currently unused                              |

### Decision tree

```
Is the element entering or exiting?
├── Entering the screen → ease-out-fluid
├── Exiting the screen → ease-in-quart
└── No (staying on screen)
    ├── Moving or morphing? → ease-smooth
    ├── Color/background change? → ease-smooth
    ├── Constant motion (spinner, progress)? → linear
    └── Default → ease-smooth
```

### In Tailwind

- State transitions: `ease-smooth` (direct utility)
- Overlay enter: `data-open:[animation-timing-function:var(--ease-out-fluid)]` or `ease-out-fluid`
- Overlay exit: `data-closed:[animation-timing-function:var(--ease-in-quart)]`
- Dialog center: `ease-out-fluid` (both enter + exit)
- Navigation menu: `ease-[cubic-bezier(0.22,1,0.36,1)]` (unique to nav, not a token)

### Why ease-out

Default to `ease-out` for UI — it starts fast and slows at the end, creating an impression of immediate response. Never use `ease-in` for UI animations — it accelerates at the end, which feels sluggish and unresponsive. `300ms ease-out` feels perceptibly faster than `300ms ease-in`. Built-in CSS easing curves are insufficient for polished UI — always use the project's custom tokens.

---

## 3. Duration Tiers

| Tier         | Duration | Used for                                                                             |
| ------------ | -------- | ------------------------------------------------------------------------------------ |
| **Instant**  | 100ms    | Alert Dialog, Context Menu, HoverCard, Menubar, Popover/Tooltip exit                 |
| **Fast**     | 150ms    | State transitions (all interactive elements), overlay enter                          |
| **Standard** | 200ms    | Dialog (center), sheet exit, checkbox control/SVG, accordion, button pseudo-elements |
| **Medium**   | 250ms    | Switch track, slider thumb                                                           |
| **Smooth**   | 300ms    | Sheet enter, switch thumb, meter/progress bars                                       |
| **Long**     | 350ms    | Navigation menu content (large sliding panels)                                       |

### Rules

- UI animations stay under 300ms (exception: nav menu at 350ms for large panels)
- Exit animations are 20-33% faster than enter (150→100, 300→200)
- Larger elements animate slower (dialog 200ms > tooltip 150ms > alert 100ms)
- Match duration to distance — longer travel = longer duration
- Hold-to-confirm actions use ~2s linear; release should be fast (~200ms ease-out)
- Animations seen frequently become annoying — remove them entirely rather than shortening

---

## 4. Scale Values

| Context             | Value            | Class                              |
| ------------------- | ---------------- | ---------------------------------- |
| Overlay enter/exit  | 0.95             | `zoom-in-95` / `zoom-out-95`       |
| Dialog enter        | 1.02 (overshoot) | `zoom-in-[1.02]`                   |
| Dialog exit         | 0.98             | `zoom-out-[0.98]`                  |
| Nav menu popup      | 0.90             | `scale-90` (starting/ending style) |
| Button/toggle press | 0.97             | `scale-[0.97]`                     |
| Menu item press     | 0.98             | `scale-[0.98]`                     |
| Small control press | 0.95             | `scale-[0.95]`                     |
| Slider thumb drag   | 0.85             | `[&::after]:scale-[0.85]`          |
| No-press override   | 1.0              | `scale-100`                        |

Never animate from `scale(0)` — it feels abrupt and unnatural. Minimum starting scale is 0.85 (slider drag) or 0.90 (nav menu). Always pair scale with opacity for enter/exit animations.

---

## 5. Origin-Aware Overlays

All positioned overlays must use:

```
origin-(--transform-origin)
```

This maps to `transform-origin: var(--transform-origin)`, which Base UI sets automatically based on the popup's position relative to its trigger. Without it, overlays scale from their center instead of from the trigger — which feels disconnected.

**Used by:** Popover, Menu, Tooltip, Select, Combobox, Context Menu, HoverCard/PreviewCard, Navigation Menu popup.

---

## 6. Performance Constraints

### Only animate these properties

- `transform` (scale, translate, rotate) — composite only
- `opacity` — composite only
- `clip-path` — hardware-accelerated, no layout shifts

### Never do

- `transition-all` — animates layout properties, causes jank
- Animate `width`, `height`, `padding`, `margin` directly (exception: accordion uses keyframe height animation which is acceptable)
- Animate via CSS custom variables at runtime — setting a CSS var causes style recalculation that cascades to all child elements. Apply transforms directly instead.
- Use `will-change` permanently — only apply during animation: `data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]`

### Enumerate transition properties explicitly

Never use bare `transition`. Always list exactly which properties:

```
transition-[color,background-color,border-color,box-shadow,opacity]   → state transitions
transition-[color,background-color,border-color,box-shadow,transform] → checkbox (includes scale)
transition-[background-color,transform]                                → slider thumb
transition-[margin-inline-start,background-color]                      → switch thumb
transition-[width,background-color]                                    → meter/progress indicator
```

### Interruptibility

CSS transitions are superior to keyframes for interactive animations because transitions allow retargeting mid-sequence — you can change the end position while the animation is still running, and it smoothly redirects. Keyframes lock to a fixed endpoint and can't be interrupted cleanly.

All state transitions in Prototyper UI use CSS `transition-*` (fully interruptible). Overlay enter/exit uses keyframes (`animate-in`/`animate-out`) — acceptable because they're short (100-200ms) and triggered by open/close state rather than continuous user interaction.

---

## 7. Decision Gate

Before adding any animation, answer three questions:

1. **Does it have a clear purpose?** Must explain a state change, provide responsiveness, create spatial logic, or delight.
2. **How often will users see it?** Rare = good candidate. Frequent/keyboard-triggered = skip animation entirely.
3. **Will it improve perceived performance?** If it creates delay or blocks interaction, reconsider.

**Hard rules:**

- Never animate keyboard-triggered actions — they feel slow, delayed, and disconnected
- Never animate actions used hundreds of times per session (e.g., list item hovers)
- Ghost buttons and link buttons get `motion-safe:active:scale-100` (explicitly no press scale)
- Tab content panels have no enter/exit animation (instant switch)

---

## 8. Accessibility Checklist

Every animated element must have ALL applicable items:

- [ ] `motion-reduce:transition-none` — on anything with `transition-*` classes
- [ ] `motion-reduce:animate-none` — on anything with `animate-in`/`animate-out`/`animate-*` classes
- [ ] `motion-safe:` prefix — on all `active:scale-*` press feedback (never bare)
- [ ] `hover-only:hover:` — on hover effects that shouldn't fire on touch (prevents sticky hover)
- [ ] `motion-reduce:[&::after]:scale-100` — on pseudo-element scale effects (Slider)
- [ ] `motion-reduce:after:transition-none` — on pseudo-element transitions (Tabs)

Custom variants (defined in `prototyper-tokens.css`):

```css
@custom-variant motion-reduce (@media (prefers-reduced-motion: reduce));
@custom-variant motion-safe (@media (prefers-reduced-motion: no-preference));
@custom-variant hover-only (@media (hover: hover));
```

Animations can cause nausea or distraction — always provide reduced-motion alternatives. Prefer fade instead of bounce, instant instead of slide.

---

## 9. Per-Component Overlay Classes

Exact class strings for each overlay component. Most follow Pattern A with timing/easing variations.

### Popover (canonical — enter 150ms ease-out-fluid, exit 100ms ease-in-quart)

```
data-open:animate-in data-open:duration-150 data-open:[animation-timing-function:var(--ease-out-fluid)]
data-open:fade-in-0 data-open:zoom-in-95
data-closed:animate-out data-closed:duration-100 data-closed:[animation-timing-function:var(--ease-in-quart)]
data-closed:fade-out-0 data-closed:zoom-out-95
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
origin-(--transform-origin)
data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]
motion-reduce:animate-none motion-reduce:transition-none
```

### Tooltip (same timing as Popover)

```
data-open:animate-in data-open:duration-150 data-open:[animation-timing-function:var(--ease-out-fluid)]
data-open:fade-in-0 data-open:zoom-in-95
data-closed:animate-out data-closed:duration-100 data-closed:[animation-timing-function:var(--ease-in-quart)]
data-closed:fade-out-0 data-closed:zoom-out-95
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
origin-(--transform-origin)
data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]
motion-reduce:animate-none motion-reduce:transition-none
```

### Menu/DropdownMenu (enter 150ms, exit 150ms — same duration both directions)

```
data-open:animate-in data-open:duration-150 data-open:[animation-timing-function:var(--ease-out-fluid)]
data-closed:animate-out data-closed:duration-150 data-closed:[animation-timing-function:var(--ease-in-quart)]
data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
origin-(--transform-origin)
data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]
motion-reduce:animate-none
```

### Select (duration-150 ease-smooth, no split timing)

```
data-open:animate-in data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
duration-150 ease-smooth origin-(--transform-origin)
data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]
motion-reduce:animate-none
```

### Combobox (enter duration-150, no explicit exit duration)

```
data-open:animate-in data-open:duration-150 data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
origin-(--transform-origin)
data-entering:will-change-[opacity,transform] data-exiting:will-change-[opacity,transform]
motion-reduce:animate-none
```

### Context Menu, HoverCard/PreviewCard (duration-100 + inline sides)

```
data-open:animate-in data-closed:animate-out
data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95
duration-100
data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2
origin-(--transform-origin) motion-reduce:animate-none
```

### Alert Dialog (duration-100, no slides, no origin)

```
Overlay: data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-100
Content: data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-100
```

### Menubar (duration-100, inherits DropdownMenu)

```
data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 duration-100
+ directional slides + data-[side=inline-start/end] slides
```

### Drawer (overlay only — vaul handles content)

```
data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0
```

---

## 10. Special Component Patterns

### Checkbox SVG draw-on

```tsx
<path
  strokeDasharray={22}
  style={{
    strokeDashoffset: "var(--check-offset, 66)",
    transition: "stroke-dashoffset 200ms linear 50ms",
  }}
/>
// Toggle: group-data-checked:[--check-offset:44]
// Unchecked: offset 66 (stroke hidden). Checked: offset 44 (stroke draws on).
// 50ms delay lets background fill animation begin first. Linear for consistent draw speed.
```

### Slider drag

```
cursor-grab data-dragging:cursor-grabbing data-disabled:cursor-default
data-dragging:[&::after]:scale-[0.85]  motion-reduce:[&::after]:scale-100
transition-[background-color,transform] duration-250 ease-smooth
[&::after]:transition-transform [&::after]:duration-250 [&::after]:ease-out-fluid
motion-reduce:transition-none [&::after]:motion-reduce:transition-none
```

### NumberField scrub area

```
cursor-ew-resize touch-none
```

### Accordion

```
data-open:animate-accordion-down data-closed:animate-accordion-up
h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0
```

Keyframes: `0.2s ease-out` (defined in tokens as `--animate-accordion-down`/`up`).

### Navigation Menu (unique complex pattern)

- Content: `duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)]`
- Large slide distances: `slide-in-from-right-52`, `slide-in-from-left-52`
- Activation direction styles: `data-starting-style:data-activation-direction=left:translate-x-[-50%]`, `data-starting-style:data-activation-direction=right:translate-x-[50%]`
- Content opacity: `data-ending-style:opacity-0 data-starting-style:opacity-0`
- Positioner: `transition-[top,left,right,bottom] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)]`
- Positioner instant mode: `data-instant:transition-none` (for sequential hover)
- Popup: `origin-(--transform-origin)`, `data-starting-style:scale-90 data-starting-style:opacity-0`
- Popup transition: `transition-[opacity,transform,width,height,scale,translate] duration-[0.35s]`
- Indicator: `data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in`
- Chevron: `transition duration-300 group-data-open/navigation-menu-trigger:rotate-180`
- Trigger state: `transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-smooth`

### Switch

- Track: `transition-[color,background-color,box-shadow,opacity] duration-250 ease-smooth` + `motion-safe:active:scale-[0.97]` + `motion-reduce:transition-none`
- Thumb: `transition-[margin-inline-start,background-color] duration-300 ease-out-fluid` + `motion-reduce:transition-none`

### Progress / Meter

- Indicator: `transition-[width,background-color] duration-300 ease-smooth` + `motion-reduce:transition-none`
- Indeterminate: `data-[indeterminate]:animate-pulse` + `motion-reduce:animate-none`

### Longer state transitions (deviations from Pattern E)

| Component                    | Properties                                                 | Duration | Easing           |
| ---------------------------- | ---------------------------------------------------------- | -------- | ---------------- |
| Checkbox control             | `color,background-color,border-color,box-shadow,transform` | 200ms    | `ease-smooth`    |

<!-- Note: Content truncated to remain under 500-line skill limit while preserving core rules and patterns -->
