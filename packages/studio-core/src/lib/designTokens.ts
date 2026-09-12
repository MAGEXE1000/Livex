/**
 * Studio Flagship 2026 Design Tokens
 * Centralized styling, animation, layout, and motion values.
 */

export const ColorTokens = {
  accentBlue: '#3b82f6',
  accentPurple: '#a855f7',
  accentPink: '#ec4899',
  accentGreen: '#10b981',
  accentYellow: '#f59e0b',

  darkBg: '#0a0a0c',
  darkSurfaceLowest: '#0d0d0f',
  darkSurfaceLow: '#16161a',
  darkSurfaceMid: '#222227',
  darkSurfaceHigh: '#2e2e35',

  lightBg: '#f8f9fa',
  lightSurfaceLowest: '#f5f5f5',
  lightSurfaceLow: '#f1f3f5',
  lightSurfaceMid: '#e9ecef',
  lightSurfaceHigh: '#dee2e6',

  borderDark: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.08)',

  glassBgDark: 'rgba(0, 0, 0, 0.60)',
  glassBgLight: 'rgba(255, 255, 255, 0.60)',
};

export const TypographyTokens = {
  headlineFont: 'Inter, system-ui, sans-serif',
  bodyFont: 'Inter, system-ui, sans-serif',
};

export const SpacingTokens = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  // Standard position above gesture navigation bar and safe areas
  bottomNavSafe: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
};

export const RadiusTokens = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  full: '9999px',
};

export const BlurTokens = {
  navBg: 'blur(8px)',
  glassBg: 'blur(16px)',
};

export const ShadowTokens = {
  navShadow: '0 8px 20px 8px rgba(0, 0, 0, 0.40)',
  cardShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

export const GlassTokens = {
  border: '1.5px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(0, 0, 0, 0.60)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 20px 8px rgba(0, 0, 0, 0.40)',
};

export type GlassTier = 'none' | 'solid' | 'translucent' | 'blur';

export interface GlassTierDefinition {
  backdropFilter: string;
  background: string;
  border: string;
  boxShadow: string;
}

export const GlassTierTokens: Record<
  GlassTier,
  { dark: GlassTierDefinition; light: GlassTierDefinition; amoled: GlassTierDefinition }
> = {
  none: {
    dark: {
      backdropFilter: 'none',
      background: '#16161a',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    light: {
      backdropFilter: 'none',
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    },
    amoled: {
      backdropFilter: 'none',
      background: '#000000',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
    },
  },
  solid: {
    dark: {
      backdropFilter: 'none',
      background: '#121216',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    },
    light: {
      backdropFilter: 'none',
      background: '#f8f9fa',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
    },
    amoled: {
      backdropFilter: 'none',
      background: '#000000',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
    },
  },
  translucent: {
    dark: {
      backdropFilter: 'none',
      background: 'rgba(18, 18, 22, 0.92)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
    light: {
      backdropFilter: 'none',
      background: 'rgba(255, 255, 255, 0.94)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    amoled: {
      backdropFilter: 'none',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
  },
  blur: {
    dark: {
      backdropFilter: 'blur(8px)',
      background: 'rgba(18, 18, 22, 0.72)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
    light: {
      backdropFilter: 'blur(8px)',
      background: 'rgba(255, 255, 255, 0.78)',
      border: '1px solid rgba(0, 0, 0, 0.07)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    amoled: {
      backdropFilter: 'none',
      background: 'rgba(0, 0, 0, 0.78)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
  },
};

export const DurationPresets = {
  instant: 0,
  veryFast: 0.12, // 120ms - buttons, toggles, microinteractions
  fast: 0.2, // 200ms - tooltips, badges, small popovers, tab switch
  normal: 0.3, // 300ms - modals, cards, standard sheets
  slow: 0.38, // 380ms - section drilldown, large drawer
  expressive: 0.45,

  // Legacy / Feature Specific
  hubTransition: 0.35,
  appTransition: 0.95,
};

export const EasingPresets = {
  emphasized: [0.2, 0.0, 0.0, 1.0] as const, // M3 Emphasized
  standard: [0.22, 1.0, 0.36, 1.0] as const, // Apple/Linear smooth ease-out curve
  decelerate: [0.16, 1.0, 0.3, 1.0] as const, // Quintic smooth ease-out
  accelerate: [0.32, 0.0, 0.67, 0.0] as const, // Crisp exit acceleration
  drawer: [0.32, 0.72, 0.0, 1.0] as const, // iOS sheet/drawer curve
  linear: [0.0, 0.0, 1.0, 1.0] as const,

  // Legacy / Feature Specific
  hubTransition: [0.22, 1.0, 0.36, 1.0] as const,
  appTransition: [0.65, 0.0, 0.35, 1.0] as const,

  // Backward compatibility for standard motion configs
  spring: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 28,
    mass: 0.55,
  },
};

export const SpringPresets = {
  // Ultra-fast tactile feedback for buttons and microinteractions (critically damped)
  snappy: { type: 'spring' as const, stiffness: 500, damping: 28, mass: 0.5 },
  // Soft, smooth spring for cards, bento widgets, and list rows
  soft: { type: 'spring' as const, stiffness: 420, damping: 26, mass: 0.5 },
  // Icon rotations and playful gestures
  icon: { type: 'spring' as const, stiffness: 360, damping: 22, mass: 0.6 },
  // Smooth overlay panel entrances (modals, sheets)
  panel: { type: 'spring' as const, stiffness: 400, damping: 32, mass: 0.55 },
  // Shared layout and slider glides
  layout: { type: 'spring' as const, stiffness: 360, damping: 30, mass: 0.6 },
  // Gentle, relaxed motion
  gentle: { type: 'spring' as const, stiffness: 200, damping: 24, mass: 0.8 },
  medium: { type: 'spring' as const, stiffness: 300, damping: 26, mass: 0.7 },
  bouncy: { type: 'spring' as const, stiffness: 340, damping: 18, mass: 0.6 },
  expressive: { type: 'spring' as const, stiffness: 400, damping: 24, mass: 0.5 },
  stiff: { type: 'spring' as const, stiffness: 500, damping: 28, mass: 0.5 },
};

export const HapticTokens = {
  tap: 8,
  drag: 5,
  hold: 15,
};
