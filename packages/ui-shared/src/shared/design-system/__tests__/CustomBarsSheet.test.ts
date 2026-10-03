import { describe, it, expect } from 'vitest';
import { parseCustomBars } from '../CustomBarsSheet';

describe('parseCustomBars', () => {
  it('clamps values below 1 to 1', () => {
    expect(parseCustomBars('0', 4)).toBe(1);
    expect(parseCustomBars('-5', 4)).toBe(1);
  });

  it('clamps values above 32 to 32', () => {
    expect(parseCustomBars('33', 4)).toBe(32);
    expect(parseCustomBars('100', 4)).toBe(32);
  });

  it('returns valid numbers within range', () => {
    expect(parseCustomBars('1', 4)).toBe(1);
    expect(parseCustomBars('16', 4)).toBe(16);
    expect(parseCustomBars('32', 4)).toBe(32);
  });

  it('returns 1 for invalid non-numeric strings', () => {
    expect(parseCustomBars('abc', 4)).toBe(1);
    expect(parseCustomBars('', 4)).toBe(1);
  });
});
