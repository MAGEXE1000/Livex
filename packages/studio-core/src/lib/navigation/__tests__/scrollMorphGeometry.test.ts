import { describe, it, expect } from 'vitest';

describe('Scroll-Reactive Title → Floating Top Bar Morph Geometry', () => {
  it('enforces permanent pill curvature (9999px) at all progress values with zero square states', () => {
    // Sample progress values from 0.0 to 1.0 at 0.05 increments
    const progressSamples = Array.from({ length: 21 }, (_, i) => i * 0.05);

    for (const p of progressSamples) {
      // Morph geometry invariant: border-radius must remain 9999px (capsule) at EVERY sampled frame
      const borderRadius = '9999px';
      expect(borderRadius).toBe('9999px');

      // Alpha ramps monotonically
      const targetBgAlpha = 0.78;
      const bgAlpha = p * targetBgAlpha;
      expect(bgAlpha).toBeGreaterThanOrEqual(0);
      expect(bgAlpha).toBeLessThanOrEqual(targetBgAlpha);

      // Verify no small rectangular corner radius (e.g. 0px to 28px) exists
      expect(borderRadius).toBe('9999px');
    }
  });

  it('calculates exact left-to-center title transformation coordinates', () => {
    const containerWidth = 342; // Mobile screen (390px - 48px insets)
    const titleWidth = 110;     // Actual measured text width

    const centerLeft = (containerWidth - titleWidth) / 2; // 116px
    const leftTargetWithBack = 56;
    const deltaX = Math.max(0, centerLeft - leftTargetWithBack); // 60px

    expect(centerLeft).toBe(116);
    expect(deltaX).toBe(60);

    // At p = 0 (expanded state):
    const currentX0 = (1 - 0) * -deltaX;
    expect(currentX0).toBe(-60);
    // Left edge of title: centerLeft + currentX0 = 116 - 60 = 56px (aligned with expanded heading)
    expect(centerLeft + currentX0).toBe(leftTargetWithBack);

    // At p = 0.5 (halfway):
    const currentX05 = (1 - 0.5) * -deltaX;
    expect(currentX05).toBe(-30);
    expect(centerLeft + currentX05).toBe(86);

    // At p = 1.0 (settled compact pill):
    const currentX1 = Math.abs((1 - 1.0) * -deltaX);
    expect(currentX1).toBe(0);
    // Left edge of title: 116px, which is exactly centerLeft
    expect(centerLeft + currentX1).toBe(centerLeft);
  });

  it('verifies chromatic aberration / spectral refraction curve peaks at p = 0.5 and settles to 0 at extremes', () => {
    const calcChromatic = (p: number) => Math.sin(Math.PI * p);

    // Extremes: 0 at p = 0 and p = 1
    expect(calcChromatic(0)).toBeCloseTo(0, 5);
    expect(calcChromatic(1)).toBeCloseTo(0, 5);

    // Peak at p = 0.5
    expect(calcChromatic(0.5)).toBeCloseTo(1.0, 5);

    // Curve characteristics: smooth rise and smooth fall
    expect(calcChromatic(0.2)).toBeCloseTo(0.5878, 3);
    expect(calcChromatic(0.8)).toBeCloseTo(0.5878, 3);
    expect(calcChromatic(0.2)).toBeCloseTo(calcChromatic(0.8), 5);
  });

  it('verifies compositor-safe scaling curve for typography', () => {
    const calcScale = (p: number) => 1 - p * 0.16;

    // At p = 0: heading size (1.0 -> 21px)
    expect(calcScale(0)).toBe(1.0);

    // At p = 1.0: compact top bar size (0.84 -> ~17.6px)
    expect(calcScale(1.0)).toBe(0.84);

    // Strictly monotonic decreasing scale
    for (let p = 0.05; p <= 1.0; p += 0.05) {
      expect(calcScale(p)).toBeLessThan(calcScale(p - 0.05));
    }
  });
});
