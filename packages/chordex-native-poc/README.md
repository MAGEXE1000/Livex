# Chordex React Native Proof of Concept

> **Scope**: Isolated, production-quality vertical slice validating modern React Native primitives (`View`, `Animated`, `Pressable`, `BackHandler`, `AccessibilityInfo`) for Chordex's future Android interaction architecture.

---

## 1. Components Implemented

### `LiquidSwitch.tsx`
* **Thumb Motion Value**: Primary thumb animated between `0` and `TRAVEL_DISTANCE` (22px).
* **Follower Blob**: Secondary droplet tracking the thumb via a secondary spring (`tension: 90, friction: 11`).
* **Fluid Stretch Ratio**: Real-time velocity delta $\Delta x = \text{thumb} - \text{follower}$ drives horizontal elongation up to 1.38x with reciprocal volume preservation ($S_y = 1 / \sqrt{S_x}$).
* **Solid Opaque Visuals**: Pure vector surfaces with zero muddy goo filters or semi-transparent blurring.
* **Accessibility**: Emits standard `accessibilityRole="switch"` and `accessibilityState={{ checked, disabled }}`.
* **Reduced Motion**: Gracefully drops decorative fluid stretching when system or preference reduced-motion is enabled.

### `MorphingActionSurface.tsx`
* **Single Spatial Surface**: The trigger pill *is* the modal panel. A single `morphProgress` value animates `width` (220 &rarr; 360px), `height` (48 &rarr; 340px), and `borderRadius` (24 &rarr; 20px).
* **Press Acknowledgement**: Sinks to `0.94` scale over 100ms before expansion overlaps the tail of the gesture.
* **Staggered Entry**: Content rows enter with a 45ms offset, sliding up 14px with opacity fade.
* **Backdrop & Outside Tap**: Dismisses cleanly on tapping outside the surface.
* **Android Hardware Back**: Captures `hardwareBackPress` to reverse the morph cleanly without exiting the app.

### `ChordexPreferencesScreen.tsx`
* **Theme Modes**: Real-time switching across `Light`, `Dark`, and `AMOLED` (`#000000`).
* **Live Switches**: Integrates multiple `LiquidSwitch` instances for fretboard settings and stage controls.
* **Tuning Menu**: Hosts the `MorphingActionSurface` embedding quick tuning options and capo steppers.

---

## 2. Automated Verification

Run the test suite:
```bash
node artifacts/chordex-native-poc/test-runner.mjs
```
* **LiquidSwitch stretch calculation**: Verified bounded, volume-preserving, and `NaN`-free.
* **MorphingActionSurface geometry**: Verified unified spatial interpolation.
* **Theme palettes**: Verified AMOLED `#000000` compliance.
