import { DurationPresets, EasingPresets, SpringPresets } from '@workspace/livex-core';
# Material 3 Motion System

The Studio application implements a unified, premium motion system based on the **Material 3 (M3) Design Guidelines**. All animations are managed centrally by the Motion Engine to ensure visual consistency, performance optimization, and full accessibility support across platforms.

## Core Motion Tokens

Centralized motion tokens are defined in [AppAnimationSystem.tsx](file:///C:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/packages/ui-shared/src/navigation/AppAnimationSystem.tsx). These consist of durations, easing curves, and spring presets.

### 1. Duration Tokens (`DurationPresets`)

M3 durations are tuned to feel fast and responsive on mobile devices while allowing complex transitions to complete naturally.

| Token Name | Value   | M3 Equivalent      | Recommended Use Cases                                                  |
| ---------- | ------- | ------------------ | ---------------------------------------------------------------------- |
| `veryFast` | `0.10s` | Short 1 / Short 2  | Simple micro-interactions, icon state switches, toggle selections      |
| `fast`     | `0.20s` | Short 3 / Medium 1 | Button hover/taps, small card transitions, tooltips, selection changes |
| `normal`   | `0.30s` | Medium 2 / Long 1  | Standard page/screen transitions, sheet expansions, dialog entry       |
| `slow`     | `0.40s` | Long 2 / Long 3    | Complex container transformations, multi-stage animations              |

### 2. Easing Curves (`EasingPresets`)

Easings control acceleration and deceleration to make UI movements mimic physical objects.

- **`emphasized`** `[0.2, 0.0, 0.0, 1.0]`: The default M3 curve. Used for elements that transition between states, drawing focus.
- **`standard`** `[0.2, 0.0, 0.0, 1.0]`: Clean, responsive ease-out. Used for standard page entries and sheet reveal animations.
- **`accelerate`** `[0.3, 0.0, 0.8, 0.15]`: Pure ease-in. Used for elements exiting the viewport.
- **`decelerate`** `[0.0, 0.0, 0.15, 1.0]`: Pure ease-out. Used for elements entering the viewport.
- **`linear`** `[0.0, 0.0, 1.0, 1.0]`: Linear transition for color sweeps or opacities.

### 3. Spring Presets (`SpringPresets`)

Spring animations provide natural bounce and elasticity for drag, touch, and sheet gestures.

```typescript
export const SpringPresets = {
  soft: {
    type: 'spring',
    stiffness: 150,
    damping: 25,
    mass: 1.0,
  },
  medium: {
    type: 'spring',
    stiffness: 220,
    damping: 22,
    mass: 0.85,
  },
  expressive: {
    type: 'spring',
    stiffness: 320,
    damping: 18,
    mass: 0.7,
  },
};
```

- **`soft`**: High damping, minimal bounce. Used for list items drag-reordering, slider tracks, and light volume-control feedback.
- **`medium`**: Standard bounce. Used for bottom sheets, toast notices, and native updates.
- **`expressive`**: Low damping, noticeable bounce. Used for dialog reveals and custom settings switches.

---

## Centralized Transition Helpers

The motion system exports reusable React components to standardize standard transition types without writing inline Framer Motion configurations:

### 1. `FadeThroughTransition`

Used for transitions between peer views of equal hierarchy (e.g., swapping panels in the Hub or switching instruments).

- **Behavior**: Outgoing screen fades out completely; incoming screen scales from 92% to 100% while fading in.

### 2. `SharedAxisTransition`

Used for directional transitions (e.g., Wizard setups, next/back step flows).

- **Behavior**: Translates on the X or Y axis depending on navigation direction, combining translation with fade.

### 3. `ContainerTransform`

Used for transitioning a small element (like a card or FAB) into a full panel.

- **Behavior**: Uses Framer Motion's `layoutId` layout-projection to smoothly morph bounds and content.

### 4. Segmented Control Sliding Backgrounds

Used for transitioning active selection tabs in segmented controls.

- **Behavior**: Employs Framer Motion's `layoutId` layout projection within a shared layout group. A physical capsule background slides fluidly behind the active text label, rather than fading instantly, reinforcing directional movement.

### 5. Animated SVG Toggle Crossfades

Used for toggle controls and switches.

- **Behavior**: Employs high-fidelity SVG paths that morph or crossfade dynamically (e.g. checkmark and cross symbols) in response to toggle state changes, paired with spring-driven thumb displacement.

### 6. Interactive Press Springs (whileTap)

Used for Bento setting cards, rows, auth inputs, and button components.

- **Behavior**: Promotes tactile feedback via Framer Motion `whileTap={{ scale: 0.97 }}` or similar spring scaling. A micro-scale contraction provides immediate confirmation of user interaction prior to navigation or action dispatch.

### 7. Touch-Screen Sticking Hover Prevention

Used for cards, FABs, updates, benefits lists, and custom interactive targets.

- **Behavior**: Mobile WebViews on Android devices interpret touch taps as sticky "hover" events, keeping buttons or cards in a hovered (enlarged or offset) visual state after the tap is completed.
- **Resolution**: The motion system utilizes a media-query utility check (`matchMedia('(hover: hover)')`) to verify if the physical pointer supports true hover. Interactive cards, buttons, and list components dynamically disable `whileHover` animations if hover is not supported, ensuring clean, bounce-free touchscreen interactions.

---

## Accessibility & User Configuration

The Motion Engine guarantees that animations adapt automatically based on system capabilities and user preference:

1.  **System Prefers Reduced Motion**: Listens to CSS media query `(prefers-reduced-motion: reduce)`. If enabled, all motion transitions are completely bypassed (replaced instantly or simple opacity-only).
2.  **User Preferences Setting**: The app's settings allow selecting `animationSpeed` (`Fast`, `Normal`, `None`).
    - `None` completely disables animations.
    - `Fast` applies a `0.6` multiplier to all duration tokens, providing swift, responsive feedback.
3.  **Performance Stagger Limit**: Entrance staggering automatically limits total visible steps to prevent thread lock-ups during intensive audio engine initializations.
