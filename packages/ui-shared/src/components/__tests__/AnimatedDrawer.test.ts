import { describe, it, expect } from 'vitest';
import { shouldDismissDrawer } from '../AnimatedDrawer';

describe('AnimatedDrawer Dismissal Physics', () => {
  it('dismisses when drag distance exceeds the default threshold (> 80px)', () => {
    expect(shouldDismissDrawer(81, 0)).toBe(true);
    expect(shouldDismissDrawer(150, 0)).toBe(true);
    expect(shouldDismissDrawer(300, -100)).toBe(true);
  });

  it('does not dismiss when drag distance is at or below threshold with neutral velocity', () => {
    expect(shouldDismissDrawer(80, 0)).toBe(false);
    expect(shouldDismissDrawer(50, 0)).toBe(false);
    expect(shouldDismissDrawer(0, 0)).toBe(false);
  });

  it('dismisses when downward velocity exceeds velocity threshold (> 300px/s)', () => {
    expect(shouldDismissDrawer(20, 301)).toBe(true);
    expect(shouldDismissDrawer(0, 500)).toBe(true);
    expect(shouldDismissDrawer(50, 350)).toBe(true);
  });

  it('does not dismiss when velocity is at or below threshold and offset is below distance threshold', () => {
    expect(shouldDismissDrawer(40, 300)).toBe(false);
    expect(shouldDismissDrawer(40, 150)).toBe(false);
    expect(shouldDismissDrawer(40, -200)).toBe(false);
  });

  it('never dismisses when dragged upward (negative offset and negative velocity)', () => {
    expect(shouldDismissDrawer(-50, -400)).toBe(false);
    expect(shouldDismissDrawer(-100, 0)).toBe(false);
  });

  it('respects custom threshold parameters', () => {
    expect(shouldDismissDrawer(60, 0, 50, 200)).toBe(true);
    expect(shouldDismissDrawer(40, 0, 50, 200)).toBe(false);
    expect(shouldDismissDrawer(0, 250, 50, 200)).toBe(true);
  });
});
