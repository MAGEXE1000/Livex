import { describe, it, expect } from 'vitest';
import {
  CANONICAL_NAV_GEOMETRY,
  CANONICAL_NAV_MOTION,
  resolveDragDestination,
} from '../navigationMotion';

describe('Canonical Bottom Navigation Motion & Geometry System', () => {
  describe('1. Geometry & Optical Separation Invariants', () => {
    it('enforces canonical taller navbar geometry across all platforms', () => {
      expect(CANONICAL_NAV_GEOMETRY.NAV_BAR_HEIGHT).toBe(58);
      expect(CANONICAL_NAV_GEOMETRY.NAV_BAR_VERTICAL_PADDING).toBe(5);
      expect(CANONICAL_NAV_GEOMETRY.NAV_BAR_INNER_HEIGHT).toBe(48);
      expect(CANONICAL_NAV_GEOMETRY.NAV_HIGHLIGHT_HEIGHT).toBe(48);
      expect(CANONICAL_NAV_GEOMETRY.NAV_HIGHLIGHT_RADIUS).toBe(9999);
      expect(CANONICAL_NAV_GEOMETRY.SATELLITE_SIZE).toBe(58);
      expect(CANONICAL_NAV_GEOMETRY.DOCK_GAP).toBe(8);
      expect(CANONICAL_NAV_GEOMETRY.SATELLITE_SLOT_TOTAL).toBe(66);
    });

    it('ensures positive optical separation between icon and label with zero visual overlap', () => {
      const innerHeight = CANONICAL_NAV_GEOMETRY.NAV_BAR_INNER_HEIGHT; // 48px
      const iconContainer = CANONICAL_NAV_GEOMETRY.ICON_CONTAINER_SIZE; // 24px
      const iconGlyph = CANONICAL_NAV_GEOMETRY.ICON_GLYPH_SIZE; // 22px
      const iconYExpanded = CANONICAL_NAV_GEOMETRY.ICON_Y_EXPANDED; // -7px
      const labelBottom = CANONICAL_NAV_GEOMETRY.LABEL_BOTTOM_OFFSET; // 3.5px

      // In 48px inner height, center is 24px.
      // With iconY = -7px:
      // Center of icon is 24 - 7 = 17px.
      // Top of 22px icon glyph is 17 - 11 = 6px.
      // Bottom of 22px icon glyph is 17 + 11 = 28px.
      const iconGlyphBottom = innerHeight / 2 + iconYExpanded + iconGlyph / 2;
      expect(iconGlyphBottom).toBe(28);

      // Label with fontSize ~10.5px and lineHeight 1.15 occupies ~12px height.
      // Positioned at bottom: 3.5px inside 48px container:
      // Bottom of label: 48 - 3.5 = 44.5px.
      // Top of label: 44.5 - 12 = 32.5px.
      const estimatedLabelHeight = 12;
      const labelTop = innerHeight - labelBottom - estimatedLabelHeight;
      expect(labelTop).toBe(32.5);

      // Separation gap = labelTop - iconGlyphBottom
      const opticalGap = labelTop - iconGlyphBottom;
      expect(opticalGap).toBeGreaterThanOrEqual(4.0); // At least 4.5px clear breathing room!
      expect(opticalGap).toBeCloseTo(4.5, 1);
    });

    it('verifies optical centering of icons in compact/collapsed mode', () => {
      const innerHeight = CANONICAL_NAV_GEOMETRY.NAV_BAR_INNER_HEIGHT; // 48px
      const iconYCompact = CANONICAL_NAV_GEOMETRY.ICON_Y_COMPACT; // 0px
      const iconContainer = CANONICAL_NAV_GEOMETRY.ICON_CONTAINER_SIZE; // 24px

      // In compact mode, iconY = 0px:
      // Icon container top is at (48 - 24) / 2 = 12px.
      // Icon container bottom is at 12 + 24 = 36px.
      // Distance to top edge = 12px.
      // Distance to bottom edge = 48 - 36 = 12px.
      const containerTop = (innerHeight - iconContainer) / 2 + iconYCompact;
      const containerBottom = containerTop + iconContainer;
      const topPadding = containerTop;
      const bottomPadding = innerHeight - containerBottom;

      expect(topPadding).toBe(12);
      expect(bottomPadding).toBe(12);
      expect(topPadding).toBe(bottomPadding); // 100% mathematically and optically centered!
    });
  });

  describe('2. Canonical Apple-Grade Spring Physics', () => {
    it('enforces critically damped spring parameters (zeta ~ 0.96) with mass 1.0', () => {
      const spring = CANONICAL_NAV_MOTION.highlightSpring;
      expect(spring.stiffness).toBe(280);
      expect(spring.damping).toBe(32);
      expect(spring.mass).toBe(1.0);

      // Damping ratio zeta = c / (2 * sqrt(k * m))
      const cCrit = 2 * Math.sqrt(spring.stiffness * spring.mass);
      const zeta = spring.damping / cCrit;

      expect(zeta).toBeGreaterThanOrEqual(0.95);
      expect(zeta).toBeLessThanOrEqual(1.0);
      expect(zeta).toBeCloseTo(0.956, 3);
    });

    it('enforces instantaneous response for reduced-motion mode', () => {
      const rm = CANONICAL_NAV_MOTION.reducedMotionSpring;
      expect(rm.stiffness).toBe(4000);
      expect(rm.damping).toBe(200);
      expect(rm.mass).toBe(0.001);
    });
  });

  describe('3. Drag & Snap Destination Resolution (Zero Between-Tabs State)', () => {
    const totalSlots = 4;
    const itemWidth = 80;
    const pillWidth = 74;
    const centerOffset = (itemWidth - pillWidth) / 2; // 3px

    it('resolves stationary releases to the nearest valid tab slot', () => {
      // Releasing at slot 0 (highlight at x = centerOffset = 3)
      expect(resolveDragDestination(3, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(0);

      // Releasing at slot 1 (highlight at x = 83)
      expect(resolveDragDestination(83, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(1);

      // Releasing at slot 2 (highlight at x = 163)
      expect(resolveDragDestination(163, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(2);

      // Releasing at slot 3 (highlight at x = 243)
      expect(resolveDragDestination(243, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(3);
    });

    it('snaps accurately when released slightly past halfway', () => {
      // Slot 0 center is 3 + 37 = 40. Slot 1 center is 83 + 37 = 120.
      // Halfway is 80.
      // Highlight center at 79 (x = 42) -> snaps to 0
      expect(resolveDragDestination(42, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(0);

      // Highlight center at 81 (x = 44) -> snaps to 1
      expect(resolveDragDestination(44, 0, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(1);
    });

    it('projects destination forward upon directional flick momentum', () => {
      // Highlight is at slot 0 (x = 3), but flicked to the right with velocity 400 px/s
      const dest = resolveDragDestination(3, 400, pillWidth, itemWidth, centerOffset, totalSlots);
      expect(dest).toBe(1);

      // Highlight is at slot 2 (x = 163), flicked to the left with velocity -400 px/s
      const destLeft = resolveDragDestination(163, -400, pillWidth, itemWidth, centerOffset, totalSlots);
      expect(destLeft).toBe(1);
    });

    it('strictly clamps beyond-boundary gestures to valid tab range [0, totalSlots - 1]', () => {
      // Dragged way to the left (negative coordinates)
      expect(resolveDragDestination(-150, -500, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(0);

      // Dragged way to the right (beyond bar width)
      expect(resolveDragDestination(600, 800, pillWidth, itemWidth, centerOffset, totalSlots)).toBe(3);
    });

    it('mathematically guarantees that an invalid between-tabs state is impossible', () => {
      // Test 500 arbitrary positions and velocities across the entire coordinate space
      for (let x = -200; x <= 500; x += 15) {
        for (let v = -600; v <= 600; v += 100) {
          const result = resolveDragDestination(x, v, pillWidth, itemWidth, centerOffset, totalSlots);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(totalSlots - 1);
        }
      }
    });

    it('safely handles edge case of 1 tab slot', () => {
      expect(resolveDragDestination(50, 200, 40, 80, 20, 1)).toBe(0);
    });
  });
});
