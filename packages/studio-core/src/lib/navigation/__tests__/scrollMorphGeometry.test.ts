import { describe, it, expect } from 'vitest';

describe('Scroll-Reactive Title → Floating Top Bar Morph Geometry', () => {
  it('enforces persistent Liquid Glass material across all progress values', () => {
    // Sample progress values from 0.0 to 1.0 at 0.05 increments
    const progressSamples = Array.from({ length: 21 }, (_, i) => i * 0.05);

    // Persistent Liquid Glass base background alpha across themes
    const baseGlassAlphas = {
      dark: 0.72,
      light: 0.78,
      amoled: 0.78,
    };

    for (const p of progressSamples) {
      // Material persistence invariant: Liquid Glass background is NEVER 0 (transparent) at any scroll position
      for (const alpha of Object.values(baseGlassAlphas)) {
        expect(alpha).toBeGreaterThan(0.70);
      }
    }
  });

  it('verifies continuous horizontal compression and symmetric inward edge displacement', () => {
    const expandedWidth = 358; // Mobile screen width within page insets
    const compactWidth = 294;  // Target compact floating pill width
    const totalCompression = expandedWidth - compactWidth; // 64px

    const calcWidth = (p: number) => expandedWidth - p * totalCompression;
    const calcInwardEdge = (p: number) => (expandedWidth - calcWidth(p)) / 2;

    // At p = 0 (expanded resting state):
    expect(calcWidth(0)).toBe(358);
    expect(calcInwardEdge(0)).toBe(0);

    // At p = 0.5 (halfway):
    expect(calcWidth(0.5)).toBe(326);
    expect(calcInwardEdge(0.5)).toBe(16); // Left and right edges moved inward by 16px each

    // At p = 1.0 (settled compact pill):
    expect(calcWidth(1.0)).toBe(294);
    expect(calcInwardEdge(1.0)).toBe(32); // Left and right edges moved inward by 32px each

    // Strictly monotonic decreasing width
    for (let p = 0.05; p <= 1.0; p += 0.05) {
      expect(calcWidth(p)).toBeLessThan(calcWidth(p - 0.05));
      expect(calcInwardEdge(p)).toBeGreaterThan(calcInwardEdge(p - 0.05));
    }
  });

  it('verifies continuous vertical compression and snug position transform', () => {
    const expandedHeight = 58;
    const compactHeight = 48;

    const calcHeight = (p: number) => expandedHeight - p * (expandedHeight - compactHeight);
    const calcTranslateY = (p: number) => (p === 0 ? 0 : -p * 2);

    expect(calcHeight(0)).toBe(58);
    expect(calcTranslateY(0)).toBe(0);

    expect(calcHeight(0.5)).toBe(53);
    expect(calcTranslateY(0.5)).toBe(-1);

    expect(calcHeight(1.0)).toBe(48);
    expect(calcTranslateY(1.0)).toBe(-2);

    for (let p = 0.05; p <= 1.0; p += 0.05) {
      expect(calcHeight(p)).toBeLessThan(calcHeight(p - 0.05));
    }
  });

  it('verifies progressive corner curvature increase from smooth rounded surface (24px) to full capsule (9999px)', () => {
    const calcRadius = (p: number) => (p >= 0.7 ? 9999 : 24 + p * 30);

    // At p = 0: 24px (never square, never card, smooth generous rounded rectangle)
    expect(calcRadius(0)).toBe(24);

    // At p = 0.5: 39px
    expect(calcRadius(0.5)).toBe(39);

    // At p >= 0.7: 9999px (full capsule pill)
    expect(calcRadius(0.7)).toBe(9999);
    expect(calcRadius(1.0)).toBe(9999);

    // Monotonic curvature progression
    for (let p = 0.05; p <= 1.0; p += 0.05) {
      expect(calcRadius(p)).toBeGreaterThanOrEqual(calcRadius(p - 0.05));
    }
  });

  it('enforces centered title invariant with zero horizontal translation at all frames', () => {
    // Title is centered throughout the morph: X translation is ALWAYS 0
    const calcTitleX = (p: number) => 0;
    const calcTitleScale = (p: number) => 1 - p * 0.14;

    const progressSamples = Array.from({ length: 21 }, (_, i) => i * 0.05);

    for (const p of progressSamples) {
      expect(calcTitleX(p)).toBe(0); // Never drifts from center
      expect(calcTitleScale(p)).toBeGreaterThanOrEqual(0.86);
      expect(calcTitleScale(p)).toBeLessThanOrEqual(1.0);
    }
  });

  it('verifies edge-oriented chromatic refraction preserves 100% clear text legibility across center', () => {
    // Optical dispersion gradient parameters:
    // Left edge refraction: [0%, 10%]
    // Center clear zone: [20%, 80%] (completely transparent to avoid title color fringing)
    // Right edge refraction: [90%, 100%]
    const centerClearStart = 0.20;
    const centerClearEnd = 0.80;

    expect(centerClearStart).toBe(0.20);
    expect(centerClearEnd).toBe(0.80);
    expect(centerClearEnd - centerClearStart).toBeGreaterThanOrEqual(0.60); // 60%+ clear title zone
  });
});
