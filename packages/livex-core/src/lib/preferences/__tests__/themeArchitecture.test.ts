import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettingsStore, settingsController } from '../../../store/useSettingsStore';
import { applyThemeTokens, resetThemeEngineCache } from '../themeEngine';

describe('Livex Three-State Theme Architecture', () => {
  let originalDocument: any;
  let mockClasses: Set<string>;

  beforeEach(() => {
    resetThemeEngineCache();
    mockClasses = new Set<string>();
    originalDocument = (globalThis as any).document;

    const mockRoot = {
      classList: {
        add: (...cls: string[]) => cls.forEach((c) => mockClasses.add(c)),
        remove: (...cls: string[]) => cls.forEach((c) => mockClasses.delete(c)),
        contains: (c: string) => mockClasses.has(c),
      },
      style: {
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
        fontSize: '',
        zoom: '',
        width: '',
        height: '',
        minHeight: '',
      },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };

    const mockMeta = {
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
    };

    (globalThis as any).document = {
      documentElement: mockRoot,
      querySelector: vi.fn((sel: string) => {
        if (sel === 'meta[name="theme-color"]') return mockMeta;
        return null;
      }),
      body: {
        classList: mockRoot.classList,
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        style: {
          zoom: '',
          width: '',
          height: '',
          minHeight: '',
        },
      },
    };

    const storageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
    };
    (globalThis as any).localStorage = mockStorage;
    if (typeof window !== 'undefined') {
      (window as any).localStorage = mockStorage;
    }

    // Reset store to a clean state
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings,
        theme: 'light',
        amoledMode: false,
        perApp: {
          hub: { theme: 'light', amoledMode: false },
          chordex: { theme: 'light', amoledMode: false },
          drumex: { theme: 'light', amoledMode: false },
          stagex: { theme: 'light', amoledMode: false },
          vocalex: { theme: 'light', amoledMode: false },
          groovex: { theme: 'light', amoledMode: false },
          devtools: { theme: 'light', amoledMode: false },
        },
      },
    });
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  describe('settingsController.setThemeMode', () => {
    it('sets Light mode cleanly ({ theme: "light", amoledMode: false }) across all apps', () => {
      settingsController.setThemeMode('light');
      const settings = useSettingsStore.getState().settings;

      expect(settings.theme).toBe('light');
      expect(settings.amoledMode).toBe(false);
      expect(settings.perApp.hub.theme).toBe('light');
      expect(settings.perApp.hub.amoledMode).toBe(false);
      expect(settings.perApp.chordex.theme).toBe('light');
      expect(settings.perApp.chordex.amoledMode).toBe(false);
    });

    it('sets Dark mode cleanly ({ theme: "dark", amoledMode: false }) across all apps', () => {
      settingsController.setThemeMode('dark');
      const settings = useSettingsStore.getState().settings;

      expect(settings.theme).toBe('dark');
      expect(settings.amoledMode).toBe(false);
      expect(settings.perApp.hub.theme).toBe('dark');
      expect(settings.perApp.hub.amoledMode).toBe(false);
      expect(settings.perApp.drumex.theme).toBe('dark');
      expect(settings.perApp.drumex.amoledMode).toBe(false);
    });

    it('sets AMOLED mode cleanly ({ theme: "dark", amoledMode: true }) across all apps', () => {
      settingsController.setThemeMode('amoled');
      const settings = useSettingsStore.getState().settings;

      expect(settings.theme).toBe('dark');
      expect(settings.amoledMode).toBe(true);
      expect(settings.perApp.hub.theme).toBe('dark');
      expect(settings.perApp.hub.amoledMode).toBe(true);
      expect(settings.perApp.stagex.theme).toBe('dark');
      expect(settings.perApp.stagex.amoledMode).toBe(true);
    });
  });

  describe('settingsController.cycleNextTheme', () => {
    it('cycles from Light -> Dark -> AMOLED -> Light', () => {
      // Start at Light
      settingsController.setThemeMode('light');
      expect(useSettingsStore.getState().settings.theme).toBe('light');
      expect(useSettingsStore.getState().settings.amoledMode).toBe(false);

      // 1. Light -> Dark
      const step1 = settingsController.cycleNextTheme();
      expect(step1).toEqual({ theme: 'dark', amoledMode: false });
      expect(useSettingsStore.getState().settings.theme).toBe('dark');
      expect(useSettingsStore.getState().settings.amoledMode).toBe(false);

      // 2. Dark -> AMOLED
      const step2 = settingsController.cycleNextTheme();
      expect(step2).toEqual({ theme: 'dark', amoledMode: true });
      expect(useSettingsStore.getState().settings.theme).toBe('dark');
      expect(useSettingsStore.getState().settings.amoledMode).toBe(true);

      // 3. AMOLED -> Light
      const step3 = settingsController.cycleNextTheme();
      expect(step3).toEqual({ theme: 'light', amoledMode: false });
      expect(useSettingsStore.getState().settings.theme).toBe('light');
      expect(useSettingsStore.getState().settings.amoledMode).toBe(false);
    });
  });

  describe('applyThemeTokens DOM class enforcement', () => {
    it('applies .light and removes .dark and .amoled when mode is Light', () => {
      applyThemeTokens({ theme: 'light', amoledMode: false });
      const root = document.documentElement;

      expect(root.classList.contains('light')).toBe(true);
      expect(root.classList.contains('dark')).toBe(false);
      expect(root.classList.contains('amoled')).toBe(false);
    });

    it('applies .dark and removes .light and .amoled when mode is Dark (non-amoled)', () => {
      applyThemeTokens({ theme: 'dark', amoledMode: false });
      const root = document.documentElement;

      expect(root.classList.contains('dark')).toBe(true);
      expect(root.classList.contains('light')).toBe(false);
      expect(root.classList.contains('amoled')).toBe(false);
    });

    it('applies .dark and .amoled and removes .light when mode is AMOLED', () => {
      applyThemeTokens({ theme: 'dark', amoledMode: true });
      const root = document.documentElement;

      expect(root.classList.contains('dark')).toBe(true);
      expect(root.classList.contains('amoled')).toBe(true);
      expect(root.classList.contains('light')).toBe(false);
    });

    it('strictly guards against .amoled contamination in Light mode', () => {
      // Even if amoledMode is somehow passed as true while theme is light, amoled must be stripped
      applyThemeTokens({ theme: 'light', amoledMode: true });
      const root = document.documentElement;

      expect(root.classList.contains('light')).toBe(true);
      expect(root.classList.contains('dark')).toBe(false);
      expect(root.classList.contains('amoled')).toBe(false);
    });

    it('synchronously persists livex-persisted-theme token for frame-0 instant boot in index.html', () => {
      applyThemeTokens({ theme: 'light', amoledMode: false });
      expect(localStorage.getItem('livex-persisted-theme')).toBe('light');

      applyThemeTokens({ theme: 'dark', amoledMode: false });
      expect(localStorage.getItem('livex-persisted-theme')).toBe('dark');

      applyThemeTokens({ theme: 'dark', amoledMode: true });
      expect(localStorage.getItem('livex-persisted-theme')).toBe('amoled');
    });
  });

  describe('AMOLED TopBar Liquid Glass Tokens & Performance Invariants', () => {
    it('verifies :root.amoled defines restrained frosted glass tokens and obsidian material', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const tokensPath = path.resolve(__dirname, '../../../../../ui-shared/src/styles/tokens.css');
      const css = fs.readFileSync(tokensPath, 'utf-8');

      // 1. :root.amoled must enable restrained Liquid Glass blur tier
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--glass-tier:\s*blur;/);
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--glass-blur-radius:\s*8px;/);
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--surface-topbar-blur:\s*var\(--glass-blur\);/);

      // 2. :root.amoled must use obsidian near-black material (not pure flat 0,0,0)
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--surface-topbar-bg:\s*rgba\(10,\s*10,\s*14,\s*0\.75\);/);
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--surface-float-bg:\s*rgba\(10,\s*10,\s*14,\s*0\.75\);/);

      // 3. :root.amoled must use restrained hairline border and elevation shadow with rim highlight
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--surface-topbar-border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.08\);/);
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*inset 0 1px 0 0 rgba\(255,\s*255,\s*255,\s*0\.08\)/);

      // 4. :root.amoled must define valid --surface-topbar-backdrop token
      expect(css).toMatch(/:root\.amoled\s*\{[^}]*--surface-topbar-backdrop:\s*var\(--surface-topbar-blur\)\s*saturate\(140%\);/);

      // 5. AMOLED performance mode & solid tier overrides must drop blur to none and bg to #000000
      expect(css).toMatch(/:root\.amoled\[data-perf-mode="on"\],\s*:root\.amoled\[data-glass-tier="translucent"\],\s*:root\.amoled\[data-glass-tier="none"\],\s*:root\.amoled\[data-glass-tier="solid"\]\s*\{[^}]*--surface-topbar-bg:\s*#000000;/);
      expect(css).toMatch(/:root\.amoled\[data-perf-mode="on"\],\s*:root\.amoled\[data-glass-tier="translucent"\],\s*:root\.amoled\[data-glass-tier="none"\],\s*:root\.amoled\[data-glass-tier="solid"\]\s*\{[^}]*--surface-topbar-blur:\s*none;/);

      // 6. Reduced motion preference must drop AMOLED blur to none and bg to #000000
      const reducedMotionBlocks = Array.from(css.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\n\})/g)).map(m => m[1]).join('\n');
      expect(reducedMotionBlocks).toMatch(/:root\.amoled\s*\{[\s\S]*?--surface-topbar-blur:\s*none;/);
      expect(reducedMotionBlocks).toMatch(/:root\.amoled\s*\{[\s\S]*?--surface-topbar-bg:\s*#000000;/);
    });
  });
});
