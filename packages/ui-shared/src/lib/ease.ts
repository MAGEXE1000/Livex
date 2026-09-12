import { EasingPresets, SpringPresets } from '@workspace/studio-core';

export const EASE_OUT = EasingPresets.decelerate;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = EasingPresets.drawer;
export const EASE_SMOOTH = EasingPresets.standard;
export const EASE_EXIT = EasingPresets.accelerate;

/** CSS string forms for inline style transitions. */
export const EASE_OUT_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_SMOOTH_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const EASE_EXIT_CSS = 'cubic-bezier(0.32, 0, 0.67, 0)';
export const EASE_DRAWER_CSS = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Press feedback on buttons and other tappable surfaces. */
export const SPRING_PRESS = SpringPresets.snappy;

/** Content swaps — label/icon slots trading places inside a control. */
export const SPRING_SWAP = {
  type: 'spring',
  stiffness: 460,
  damping: 28,
  mass: 0.55,
} as const;

/** Overlay panel entrances — modals and sheets summoned by pointer. */
export const SPRING_PANEL = SpringPresets.panel;

/** Shared-layout glides — pills, indicators and panels morphing between positions. */
export const SPRING_LAYOUT = SpringPresets.layout;

/** Cursor-follow physics for decorative mouse tracking (magnetic, tilt, dock). */
export const SPRING_MOUSE = {
  stiffness: 200,
  damping: 18,
  mass: 0.4,
} as const;

/** Dragged handles and fills (sliders) — critically damped `useSpring` config,
 * so the value follows the pointer butterily and never rebounds off an end. */
export const SPRING_GLIDE = {
  stiffness: 700,
  damping: 50,
  mass: 0.5,
} as const;
