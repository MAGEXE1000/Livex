/**
 * Canonical Navigation Motion & Geometry Configuration
 *
 * Single source of truth for bottom navigation motion across all Livex apps:
 * Hub, Chordex, Drumex, Stagex, Groovex, Vocalex.
 *
 * Enforces:
 * - Apple-grade fluid spring physics (critically damped, subtle mass, zeta ~ 0.96)
 * - Single continuous spring model for tap, drag, release, interrupt, and settle
 * - 0ms press response with velocity-preserving redirection on rapid taps
 * - Mathematical impossibility of invalid between-tab states
 * - Proper vertical icon/label separation and optical centering
 */

export interface NavSpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface NavReducedMotionConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const CANONICAL_NAV_GEOMETRY = {
  /** Outer dock height in expanded mode */
  NAV_BAR_HEIGHT: 58,
  /** Vertical padding inside dock (top & bottom) */
  NAV_BAR_VERTICAL_PADDING: 5,
  /** Inner content height (58 - 5*2 = 48) */
  NAV_BAR_INNER_HEIGHT: 48,
  /** Height of the active lens pill */
  NAV_HIGHLIGHT_HEIGHT: 48,
  /** Border radius for full pill capsule */
  NAV_HIGHLIGHT_RADIUS: 9999,
  /** Circular satellite action buttons (App Switcher / Assistant) */
  SATELLITE_SIZE: 58,
  /** Gap between dock and satellite button */
  DOCK_GAP: 8,
  /** Total slot width allocated for satellite in flex row */
  SATELLITE_SLOT_TOTAL: 66,
  /** Minimum screen edge padding */
  SCREEN_PADDING_HORIZONTAL: 16,
  /** Horizontal padding inside dock */
  PADDING_X: 4,
  /** Outer dock border thickness per edge */
  DOCK_BORDER_PX: 1,
  /** Icon container box dimensions */
  ICON_CONTAINER_SIZE: 24,
  /** Icon glyph size in expanded mode */
  ICON_GLYPH_SIZE: 22,
  /** Icon glyph size in switcher mode */
  SWITCHER_ICON_SIZE: 22,
  /** Icon Y offset in expanded mode (-7px ensures 4.5px clearance above label) */
  ICON_Y_EXPANDED: -7,
  /** Icon Y offset in compact mode (0px centers 24px icon in 48px inner height) */
  ICON_Y_COMPACT: 0,
  /** Bottom position of label inside 48px inner container (3.5px) */
  LABEL_BOTTOM_OFFSET: 3.5,
  /** Drag initiation deadzone in pixels */
  DRAG_THRESHOLD_PX: 4,
  /** Velocity threshold (px/s) to classify gesture as flick rather than drop */
  FLICK_VELOCITY_THRESHOLD: 150,
  /** Forward velocity projection factor (seconds) for flick momentum targeting */
  FLICK_PROJECTION_FACTOR: 0.12,
  /** Elastic resistance coefficient when dragging beyond dock bounds */
  EDGE_RESISTANCE: 0.25,
} as const;

export const CANONICAL_NAV_MOTION = {
  /**
   * Authoritative highlight spring parameters.
   * Natural frequency omega_0 = sqrt(280 / 1.0) = 16.73 rad/s.
   * Critical damping c_crit = 2 * sqrt(280 * 1.0) = 33.47.
   * Damping ratio zeta = 32 / 33.47 = 0.956 (~0.96).
   * Settling time ~ 240ms with zero visible overshoot or bounce.
   */
  highlightSpring: {
    stiffness: 280,
    damping: 32,
    mass: 1.0,
  } as const,

  /** Instantaneous transition for reduced-motion preference */
  reducedMotionSpring: {
    stiffness: 4000,
    damping: 200,
    mass: 0.001,
  } as const,

  /** Scroll-driven compact mode compression spring */
  scrollSpring: {
    stiffness: 380,
    damping: 32,
    mass: 0.7,
  } as const,

  /** Profile menu enter/exit spring */
  profileSpring: {
    stiffness: 420,
    damping: 28,
    mass: 0.8,
  } as const,

  /** Tab item enter/exit spring inside tablist */
  itemSpring: {
    type: 'spring' as const,
    stiffness: 360,
    damping: 24,
    mass: 0.6,
  } as const,

  /** Tap press feedback spring */
  pressSpring: {
    type: 'spring' as const,
    stiffness: 450,
    damping: 35,
  } as const,
} as const;

/**
 * Calculates the destination tab index upon drag release or flick.
 * Guaranteed to return an integer in [0, totalSlots - 1].
 *
 * @param currentPillX Current visual coordinate of the highlight (from spring.get())
 * @param velocity Current velocity of the highlight (from spring.getVelocity())
 * @param pillWidth Width of the highlight pill
 * @param itemWidth Width of each tab slot
 * @param centerOffset Inset of the pill inside its slot
 * @param totalSlots Total number of tab slots
 */
export function resolveDragDestination(
  currentPillX: number,
  velocity: number,
  pillWidth: number,
  itemWidth: number,
  centerOffset: number,
  totalSlots: number
): number {
  if (totalSlots <= 1) return 0;

  const highlightCenter = currentPillX + pillWidth / 2;

  let projectedCenter: number;
  if (Math.abs(velocity) > CANONICAL_NAV_GEOMETRY.FLICK_VELOCITY_THRESHOLD) {
    // Flick gesture: project center forward in velocity direction (clamped to max 0.6 of an item)
    const maxProjection = itemWidth * 0.6;
    const rawProjection = velocity * CANONICAL_NAV_GEOMETRY.FLICK_PROJECTION_FACTOR;
    const clampedProjection =
      Math.sign(velocity) * Math.min(maxProjection, Math.abs(rawProjection));
    projectedCenter = highlightCenter + clampedProjection;
  } else {
    // Stationary release: snap to nearest slot
    projectedCenter = highlightCenter;
  }

  // Calculate nearest slot index based on slot centers
  const rawIndex = Math.round((projectedCenter - centerOffset - pillWidth / 2) / itemWidth);
  return Math.max(0, Math.min(totalSlots - 1, rawIndex));
}

/**
 * Canonical Content Transition Configuration
 *
 * Single authoritative source of truth for all screen, section, tab, and app content transitions
 * across the entire Livex ecosystem (Hub, Chordex, Drumex, Stagex, Groovex, Vocalex, Settings).
 *
 * Enforces:
 * - Pure GPU compositor properties (transform: translate3d and opacity only)
 * - Zero layout recalculation or reflow (contain: strict)
 * - Apple-grade fluid quintic deceleration curve
 * - Fast, responsive 200ms entry / 150ms exit timing to eliminate double-exposure muddiness
 * - Direction-aware subtle spatial displacement (14px horizontal, 8px elevation)
 * - Micro-scale depth cue (0.992 -> 1.0)
 * - Instantaneous / zero-motion fallback under prefers-reduced-motion
 */
export const CANONICAL_CONTENT_TRANSITION = {
  /** Entry duration in ms */
  ENTER_DURATION_MS: 200,
  /** Exit duration in ms (clears stage before entry settles) */
  EXIT_DURATION_MS: 150,
  /** Apple-grade fluid decelerate easing */
  ENTER_EASING: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Smooth exit easing */
  EXIT_EASING: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Horizontal displacement in px for sequential tab/section navigation */
  HORIZONTAL_OFFSET_PX: 14,
  /** Horizontal exit displacement in px */
  HORIZONTAL_EXIT_OFFSET_PX: 10,
  /** Vertical displacement in px for hierarchical / app transitions */
  VERTICAL_OFFSET_PX: 8,
  /** Vertical exit displacement in px */
  VERTICAL_EXIT_OFFSET_PX: 6,
  /** Entry initial scale */
  SCALE_INCOMING: 0.992,
  /** Exit target scale */
  SCALE_OUTGOING: 0.995,
  /** Reduced motion duration in ms */
  REDUCED_DURATION_MS: 0,
} as const;

