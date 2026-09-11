import { useNavigationStore } from '../navigation/useNavigationStore';
import { Capacitor } from '@capacitor/core';
import { syncStatusBar } from '../platform/useStatusBar';
import { resolveAccent } from './accentUtils';
export interface ThemeConfig {
  theme: 'light' | 'dark' | 'system' | 'dynamic';
  amoledMode: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  displayDensity?: 'compact' | 'comfortable' | 'spacious';
  animationSpeed?: 'fast' | 'normal' | 'reduced';
  dynamicLightStart?: number;
  dynamicLightEnd?: number;
}

let _lastThemeClassKey = '';
let _lastAccentKey = '';
let _lastDensityKey = '';
let _lastTypographyKey = '';
let _lastMotionKey = '';
let _lastPerfKey = '';
let _lastStatusBarKey = '';

export function applyThemeTokens(settings: any) {
  if (typeof document === 'undefined' || !document.documentElement) return;

  const globalTheme = settings?.theme ?? 'light';
  const globalAmoled = settings?.amoledMode ?? false;

  const history = useNavigationStore.getState().history;
  const appMode = history[history.length - 1]?.app ?? 'hub';
  const perAppVis = settings?.perApp?.[appMode];

  const activeVis = {
    theme: perAppVis?.theme ?? globalTheme,
    amoledMode:
      perAppVis?.amoledMode !== undefined ? Boolean(perAppVis.amoledMode) : Boolean(globalAmoled),
  };

  const root = document.documentElement;

  // 1. Resolve Light/Dark Mode
  const systemIsLight =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches;
  let isLightMode = false;
  const theme = activeVis.theme;
  if (theme === 'light') {
    isLightMode = true;
  } else if (theme === 'system') {
    isLightMode = systemIsLight;
  } else if (theme === 'dynamic') {
    const h = new Date().getHours();
    const start = settings?.dynamicLightStart ?? 7;
    const end = settings?.dynamicLightEnd ?? 20;
    isLightMode = h >= start && h < end;
  }

  // Canonical AMOLED resolution: only valid in non-light mode, respects global or per-app
  const isAmoledMode = !isLightMode && (Boolean(activeVis.amoledMode) || Boolean(globalAmoled));

  const themeClassKey = `${activeVis.theme}|${isAmoledMode}|${isLightMode}`;
  if (themeClassKey !== _lastThemeClassKey) {
    _lastThemeClassKey = themeClassKey;

    const effectiveThemeState: VisualThemeState = isLightMode
      ? 'light'
      : isAmoledMode
        ? 'amoled'
        : 'dark';

    // Update HTML theme classes and data-theme attribute
    if (isLightMode) {
      root.classList.add('light');
      root.classList.remove('dark', 'amoled');
      root.setAttribute('data-theme', 'light');
      if (typeof document !== 'undefined' && document.body?.classList) {
        document.body.classList.add('light');
        document.body.classList.remove('dark', 'amoled');
        document.body.setAttribute?.('data-theme', 'light');
      }
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      if (isAmoledMode) {
        root.classList.add('amoled');
        root.setAttribute('data-theme', 'amoled');
        if (typeof document !== 'undefined' && document.body?.classList) {
          document.body.classList.add('dark', 'amoled');
          document.body.classList.remove('light');
          document.body.setAttribute?.('data-theme', 'amoled');
        }
      } else {
        root.classList.remove('amoled');
        root.setAttribute('data-theme', 'dark');
        if (typeof document !== 'undefined' && document.body?.classList) {
          document.body.classList.add('dark');
          document.body.classList.remove('light', 'amoled');
          document.body.setAttribute?.('data-theme', 'dark');
        }
      }
    }

    // Flush any early-boot inline style properties so tokens.css class rules have full precedence
    root.style.removeProperty('--c-background');
    root.style.removeProperty('--app-bg');
    root.style.removeProperty('--c-surface-lowest');
    root.style.removeProperty('--c-surface-low');
    root.style.removeProperty('--c-surface-mid');
    root.style.removeProperty('--c-surface-high');
    root.style.removeProperty('--c-surface-highest');
    root.style.removeProperty('--c-text-primary');
    root.style.removeProperty('--c-text-secondary');
    root.style.removeProperty('--c-text-muted');
    root.style.removeProperty('--c-text-tertiary');
    root.style.removeProperty('--c-border');
  }

  // 2. Global Accent Color Tokens
  const accentKey = String(settings?.accentColor ?? '');
  if (accentKey !== _lastAccentKey) {
    _lastAccentKey = accentKey;
    const accent = resolveAccent(settings?.accentColor);
    root.style.setProperty('--studio-accent-from', accent.from);
    root.style.setProperty('--studio-accent-to', accent.to);
    root.style.setProperty('--studio-accent-mid', accent.mid);
    root.style.setProperty('--studio-accent', accent.to);
    root.style.setProperty('--studio-accent-rgb', accent.rgb);
    root.style.setProperty(
      '--studio-accent-gradient',
      `linear-gradient(135deg, ${accent.from}, ${accent.to})`
    );
    root.style.setProperty('--studio-accent-soft', accent.soft);
    root.style.setProperty('--studio-accent-subtle', accent.subtle);
    root.style.setProperty('--studio-accent-glow', accent.glow);
    root.style.setProperty('--studio-accent-border', accent.border);
    root.style.setProperty('--studio-accent-contrast', accent.contrast);
    root.style.setProperty('--studio-accent-hover', accent.hover);
    root.style.setProperty('--studio-accent-active', accent.active);

    // Sync alias variables
    root.style.setProperty('--c-accent-from', accent.from);
    root.style.setProperty('--c-accent-to', accent.to);
    root.style.setProperty('--c-accent-mid', accent.mid);
    root.style.setProperty('--c-accent-rgb', accent.rgb);
    root.style.setProperty('--c-accent-soft', accent.soft);
    root.style.setProperty('--c-accent-glow', accent.glow);
    root.style.setProperty('--c-accent-border', accent.border);
    root.style.setProperty('--c-brand', accent.from);
    root.setAttribute('data-accent-id', accent.id);
  }

  // 3. Spacing Tokens & Density System
  const densityKey = String(settings?.displayDensity ?? 'comfortable');
  if (densityKey !== _lastDensityKey) {
    _lastDensityKey = densityKey;
    const spacingDefs = {
      compact: { xs: '3px', sm: '6px', md: '12px', lg: '18px', xl: '24px' },
      comfortable: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
      spacious: { xs: '5px', sm: '10px', md: '20px', lg: '28px', xl: '38px' },
    };
    const sp =
      spacingDefs[settings.displayDensity as keyof typeof spacingDefs] || spacingDefs.comfortable;
    root.style.setProperty('--spacing-xs', sp.xs);
    root.style.setProperty('--spacing-sm', sp.sm);
    root.style.setProperty('--spacing-md', sp.md);
    root.style.setProperty('--spacing-lg', sp.lg);
    root.style.setProperty('--spacing-xl', sp.xl);

    // Sync density-aware layout spacing
    const densities = {
      compact: {
        pad: '12px',
        rowPad: '10px 16px',
        gap: '10px',
        cardGap: '8px',
        btnPadding: '8px 14px',
        btnFontSize: '12px',
        iconSize: '20px',
        listItemPadding: '10px 14px',
        listItemGap: '10px',
        sectionGap: '12px',
        cardRadius: '10px',
        sheetPadding: '14px 18px',
        navItemPadding: '8px',
        navGap: '10px',
      },
      comfortable: {
        pad: '16px',
        rowPad: '14px 20px',
        gap: '12px',
        cardGap: '10px',
        btnPadding: '10px 16px',
        btnFontSize: '13px',
        iconSize: '22px',
        listItemPadding: '12px 18px',
        listItemGap: '12px',
        sectionGap: '16px',
        cardRadius: '12px',
        sheetPadding: '16px 20px',
        navItemPadding: '10px',
        navGap: '12px',
      },
      spacious: {
        pad: '18px',
        rowPad: '16px 22px',
        gap: '14px',
        cardGap: '12px',
        btnPadding: '12px 18px',
        btnFontSize: '14px',
        iconSize: '24px',
        listItemPadding: '14px 20px',
        listItemGap: '14px',
        sectionGap: '20px',
        cardRadius: '14px',
        sheetPadding: '18px 22px',
        navItemPadding: '12px',
        navGap: '14px',
      },
    };
    const d = (densities as any)[settings.displayDensity] || densities.comfortable;
    root.style.setProperty('--c-space-pad', d.pad);
    root.style.setProperty('--c-space-row-pad', d.rowPad);
    root.style.setProperty('--c-space-gap', d.gap);
    root.style.setProperty('--c-space-card-gap', d.cardGap);

    root.style.setProperty('--density-pad', d.pad);
    root.style.setProperty('--density-row-pad', d.rowPad);
    root.style.setProperty('--density-gap', d.gap);
    root.style.setProperty('--density-card-gap', d.cardGap);

    // Advanced Density system variables
    root.style.setProperty('--density-button-padding', d.btnPadding);
    root.style.setProperty('--density-button-font-size', d.btnFontSize);
    root.style.setProperty('--density-icon-size', d.iconSize);
    root.style.setProperty('--density-list-item-padding', d.listItemPadding);
    root.style.setProperty('--density-list-item-gap', d.listItemGap);
    root.style.setProperty('--density-section-gap', d.sectionGap);
    root.style.setProperty('--density-card-radius', d.cardRadius);
    root.style.setProperty('--density-bottom-sheet-padding', d.sheetPadding);
    root.style.setProperty('--density-nav-item-padding', d.navItemPadding);
    root.style.setProperty('--density-nav-gap', d.navGap);

    root.setAttribute('data-density', settings.displayDensity);

    // 4. Radius Tokens
    root.style.setProperty('--radius-xs', '0.25rem');
    root.style.setProperty('--radius-sm', '0.375rem');
    root.style.setProperty('--radius-md', '0.75rem');
    root.style.setProperty('--radius-compact', '12px');
    root.style.setProperty('--radius-card', '16px');
    root.style.setProperty('--radius-major', '18px');
    root.style.setProperty('--radius-lg', '16px');
    root.style.setProperty('--radius-xl', '18px');
    root.style.setProperty('--radius-2xl', '20px');
    root.style.setProperty('--radius-3xl', '24px');
    root.style.setProperty('--radius-full', '9999px');
  }

  // 6. Typography Tokens
  const typoKey = `${settings?.fontSize ?? 'medium'}|${settings?.displayDensity ?? 'comfortable'}`;
  if (typoKey !== _lastTypographyKey) {
    _lastTypographyKey = typoKey;
    root.style.setProperty(
      '--font-title',
      "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    );
    root.style.setProperty(
      '--font-headline',
      "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    );
    root.style.setProperty(
      '--font-body',
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    );
    root.style.setProperty(
      '--font-label',
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    );

    const sizes = {
      small: { base: '13px', sm: '11px', xs: '9px', lg: '16px', xl: '20px', hero: '2.2rem' },
      medium: { base: '14px', sm: '12px', xs: '10px', lg: '18px', xl: '24px', hero: '2.8rem' },
      large: { base: '16px', sm: '13px', xs: '11px', lg: '20px', xl: '26px', hero: '3.2rem' },
    };
    const s = (sizes as any)[settings.fontSize] || sizes.medium;
    const densityFontScale = {
      compact: 0.94,
      comfortable: 1.0,
      spacious: 1.06,
    };
    const dfs = densityFontScale[settings.displayDensity as keyof typeof densityFontScale] || 1.0;

    root.style.setProperty('--font-base', `calc(${s.base} * ${dfs})`);
    root.style.setProperty('--font-sm', `calc(${s.sm} * ${dfs})`);
    root.style.setProperty('--font-xs', `calc(${s.xs} * ${dfs})`);
    root.style.setProperty('--font-lg', `calc(${s.lg} * ${dfs})`);
    root.style.setProperty('--font-xl', `calc(${s.xl} * ${dfs})`);
    root.style.setProperty('--font-hero', `calc(${s.hero} * ${dfs})`);
    root.style.fontSize = `calc(${s.base} * ${dfs})`;
    root.setAttribute('data-text-scale', settings.fontSize);

    if (root) {
      (root.style as any).zoom = '';
      root.style.width = '';
      root.style.height = '';
      root.style.minHeight = '';
    }

    if (typeof document !== 'undefined' && document.body) {
      document.body.style.zoom = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
    }
  }

  // 7. Motion Tokens
  const motionKey = String(settings?.animationSpeed ?? 'normal');
  if (motionKey !== _lastMotionKey) {
    _lastMotionKey = motionKey;
    const isReduced = settings.animationSpeed === 'reduced';
    const speedScale = settings.animationSpeed === 'fast' ? 0.6 : 1.0;
    root.style.setProperty('--motion-speed-scale', isReduced ? '0' : String(speedScale));
    root.style.setProperty('--motion-duration', isReduced ? '0s' : '0.3s');
    root.style.setProperty('--motion-easing', 'cubic-bezier(0.25, 1, 0.5, 1)');
    root.setAttribute('data-anim', isReduced ? 'reduced' : settings.animationSpeed);
  }

  // Performance / High refresh
  const perfKey = `${Boolean(settings?.performanceMode)}|${Boolean(settings?.highRefreshRate)}`;
  if (perfKey !== _lastPerfKey) {
    _lastPerfKey = perfKey;
    if (settings.performanceMode) root.setAttribute('data-perf-mode', 'on');
    else root.removeAttribute('data-perf-mode');

    if (settings.highRefreshRate) {
      root.setAttribute('data-hifps', 'on');
    } else {
      root.removeAttribute('data-hifps');
    }
  }

  // StatusBar Sync
  const effectiveTheme = isLightMode ? 'light' : 'dark';
  const effectiveAmoled = !isLightMode && isAmoledMode;
  const statusBarKey = `${effectiveTheme}|${effectiveAmoled}`;
  if (statusBarKey !== _lastStatusBarKey) {
    _lastStatusBarKey = statusBarKey;
    void syncStatusBar(effectiveTheme, effectiveAmoled);
  }
}

export type VisualThemeState = 'light' | 'dark' | 'amoled';

export function getEffectiveThemeState(settings: any, appMode = 'hub'): VisualThemeState {
  const globalTheme = settings?.theme ?? 'light';
  const globalAmoled = settings?.amoledMode ?? false;
  const perAppVis = settings?.perApp?.[appMode];

  const activeVis = {
    theme: perAppVis?.theme ?? globalTheme,
    amoledMode:
      perAppVis?.amoledMode !== undefined ? Boolean(perAppVis.amoledMode) : Boolean(globalAmoled),
  };

  const systemIsLight =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches;

  let isLightMode = false;
  const theme = activeVis.theme;
  if (theme === 'light') {
    isLightMode = true;
  } else if (theme === 'system') {
    isLightMode = systemIsLight;
  } else if (theme === 'dynamic') {
    const h = new Date().getHours();
    const start = settings?.dynamicLightStart ?? 7;
    const end = settings?.dynamicLightEnd ?? 20;
    isLightMode = h >= start && h < end;
  }

  const isAmoled = !isLightMode && (Boolean(activeVis.amoledMode) || Boolean(globalAmoled));

  if (isLightMode) return 'light';
  if (isAmoled) return 'amoled';
  return 'dark';
}

export interface StartupAnimationThemeSpec {
  themeState: VisualThemeState;
  bgColor: string;
  glowGradient: string;
  logoFilter: string;
  logoOpacity: number;
  sheenGradient: string;
  sheenBlendMode: 'screen' | 'normal';
}

export function getStartupAnimationThemeSpec(
  themeState: VisualThemeState
): StartupAnimationThemeSpec {
  if (themeState === 'light') {
    return {
      themeState: 'light',
      bgColor: '#ffffff',
      glowGradient:
        'radial-gradient(circle, rgba(0, 0, 0, 0.025) 0%, rgba(0, 0, 0, 0.008) 45%, transparent 70%)',
      logoFilter: 'none',
      logoOpacity: 1.0,
      sheenGradient:
        'linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.6) 46%, rgba(255, 255, 255, 1.0) 50%, rgba(255, 255, 255, 0.6) 54%, transparent 68%)',
      sheenBlendMode: 'screen',
    };
  }

  if (themeState === 'amoled') {
    return {
      themeState: 'amoled',
      bgColor: '#000000',
      glowGradient:
        'radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.03) 45%, transparent 70%)',
      logoFilter: 'none',
      logoOpacity: 1.0,
      sheenGradient:
        'linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.45) 46%, rgba(255, 255, 255, 1.0) 50%, rgba(255, 255, 255, 0.45) 54%, transparent 68%)',
      sheenBlendMode: 'screen',
    };
  }

  return {
    themeState: 'dark',
    bgColor: '#141418',
    glowGradient:
      'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 70%)',
    logoFilter: 'none',
    logoOpacity: 1.0,
    sheenGradient:
      'linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.45) 46%, rgba(255, 255, 255, 1.0) 50%, rgba(255, 255, 255, 0.45) 54%, transparent 68%)',
    sheenBlendMode: 'screen',
  };
}
