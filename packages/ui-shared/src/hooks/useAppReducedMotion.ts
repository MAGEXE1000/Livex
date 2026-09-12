import { useSettingsStore } from '@workspace/studio-core';
import { useReducedMotion } from 'motion/react';

/**
 * useAppReducedMotion — Canonical unified hook for reduced-motion preference.
 *
 * Evaluates both:
 * 1. User's in-app preference (`settings.animationSpeed === 'reduced'`)
 * 2. Device OS accessibility setting (`(prefers-reduced-motion: reduce)`)
 *
 * If the user explicitly sets `animationSpeed: 'fast'` or `'normal'` in Livex settings,
 * this returns false. If 'reduced', returns true. Otherwise falls back to OS preference.
 */
export function useAppReducedMotion(): boolean {
  const speed = useSettingsStore((state) => state.settings?.animationSpeed);
  const osReduced = useReducedMotion();

  if (speed === 'reduced') return true;
  if (speed === 'normal' || speed === 'fast') return false;

  return Boolean(osReduced);
}
