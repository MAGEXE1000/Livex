import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore, settingsController } from '../../../store/useSettingsStore';
import { getEffectiveThemeState, getStartupAnimationThemeSpec } from '../themeEngine';

describe('Livex Startup Animation Three-Theme Architecture', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings,
        theme: 'light',
        amoledMode: false,
        perApp: {
          hub: { theme: 'light', amoledMode: false },
        },
      },
    });
  });

  describe('getEffectiveThemeState', () => {
    it('resolves light mode when theme is light regardless of amoledMode flag', () => {
      const state1 = getEffectiveThemeState({ theme: 'light', amoledMode: false });
      expect(state1).toBe('light');

      // Even if amoledMode is true, light theme takes precedence (no light-amoled paradox)
      const state2 = getEffectiveThemeState({ theme: 'light', amoledMode: true });
      expect(state2).toBe('light');
    });

    it('resolves dark mode when theme is dark and amoledMode is false', () => {
      const state = getEffectiveThemeState({ theme: 'dark', amoledMode: false });
      expect(state).toBe('dark');
    });

    it('resolves amoled mode when theme is dark and amoledMode is true', () => {
      const state = getEffectiveThemeState({ theme: 'dark', amoledMode: true });
      expect(state).toBe('amoled');
    });

    it('respects perApp.hub override when present', () => {
      const state = getEffectiveThemeState({
        theme: 'dark',
        amoledMode: false,
        perApp: {
          hub: { theme: 'dark', amoledMode: true },
        },
      });
      expect(state).toBe('amoled');
    });
  });

  describe('getStartupAnimationThemeSpec', () => {
    it('returns pure white canvas and clean emblem spec for LIGHT mode', () => {
      const spec = getStartupAnimationThemeSpec('light');

      expect(spec.themeState).toBe('light');
      expect(spec.bgColor).toBe('#ffffff');
      expect(spec.logoFilter).toBe('none');
      expect(spec.logoOpacity).toBe(1.0);
      expect(spec.glowGradient).toContain('rgba(0, 0, 0, 0.025)');
      expect(spec.sheenBlendMode).toBe('screen');
    });

    it('returns canonical dark canvas and white metallic emblem for DARK mode', () => {
      const spec = getStartupAnimationThemeSpec('dark');

      expect(spec.themeState).toBe('dark');
      expect(spec.bgColor).toBe('#141418');
      expect(spec.logoFilter).toBe('none');
      expect(spec.logoOpacity).toBe(1.0);
      expect(spec.glowGradient).toContain('rgba(255, 255, 255, 0.12)');
      expect(spec.sheenBlendMode).toBe('screen');
    });

    it('returns pure black #000000 canvas and white metallic emblem for AMOLED mode', () => {
      const spec = getStartupAnimationThemeSpec('amoled');

      expect(spec.themeState).toBe('amoled');
      expect(spec.bgColor).toBe('#000000');
      expect(spec.logoFilter).toBe('none');
      expect(spec.logoOpacity).toBe(1.0);
      expect(spec.glowGradient).toContain('rgba(255, 255, 255, 0.16)');
      expect(spec.sheenBlendMode).toBe('screen');
    });
  });

  describe('Theme Controller Cycle Integration', () => {
    it('cycles from Light -> Dark -> AMOLED -> Light and computes exact startup animation specs', () => {
      // 1. Initial: Light
      settingsController.setThemeMode('light');
      let current = useSettingsStore.getState().settings;
      let state = getEffectiveThemeState(current);
      let spec = getStartupAnimationThemeSpec(state);
      expect(spec.themeState).toBe('light');
      expect(spec.bgColor).toBe('#ffffff');
      expect(spec.logoFilter).toBe('none');

      // 2. Cycle to Dark
      settingsController.cycleNextTheme();
      current = useSettingsStore.getState().settings;
      state = getEffectiveThemeState(current);
      spec = getStartupAnimationThemeSpec(state);
      expect(spec.themeState).toBe('dark');
      expect(spec.bgColor).toBe('#141418');
      expect(spec.logoFilter).toBe('none');

      // 3. Cycle to AMOLED
      settingsController.cycleNextTheme();
      current = useSettingsStore.getState().settings;
      state = getEffectiveThemeState(current);
      spec = getStartupAnimationThemeSpec(state);
      expect(spec.themeState).toBe('amoled');
      expect(spec.bgColor).toBe('#000000');
      expect(spec.logoFilter).toBe('none');

      // 4. Cycle back to Light
      settingsController.cycleNextTheme();
      current = useSettingsStore.getState().settings;
      state = getEffectiveThemeState(current);
      spec = getStartupAnimationThemeSpec(state);
      expect(spec.themeState).toBe('light');
      expect(spec.bgColor).toBe('#ffffff');
      expect(spec.logoFilter).toBe('none');
    });
  });
});
