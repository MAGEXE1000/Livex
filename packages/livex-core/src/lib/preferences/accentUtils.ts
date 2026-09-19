/**
 * accentUtils.ts
 *
 * Canonical color mathematics and preset definitions for the Studio/Livex
 * Global Accent Color system.
 */

export interface AccentDefinition {
  id: string;
  label: string;
  from: string;
  to: string;
  mid: string;
  rgb?: string;
  isCustom?: boolean;
}

export interface ResolvedAccent {
  id: string;
  from: string;
  to: string;
  mid: string;
  rgb: string;
  contrast: '#ffffff' | '#09090b';
  soft: string;
  subtle: string;
  glow: string;
  border: string;
  hover: string;
  active: string;
}

export const ACCENT_PRESETS: AccentDefinition[] = [
  { id: 'blue', label: 'Classic Blue', from: '#679cff', to: '#007aff', mid: '#4d8ef7' },
  { id: 'purple', label: 'Violet', from: '#c084fc', to: '#9333ea', mid: '#a855f7' },
  { id: 'pink', label: 'Rose Pink', from: '#f472b6', to: '#db2777', mid: '#ec4899' },
  { id: 'red', label: 'Crimson', from: '#fb7185', to: '#e11d48', mid: '#f43f5e' },
  { id: 'orange', label: 'Sunset Orange', from: '#fb923c', to: '#ea580c', mid: '#f97316' },
  { id: 'amber', label: 'Warm Amber', from: '#fbbf24', to: '#d97706', mid: '#f59e0b' },
  { id: 'green', label: 'Emerald', from: '#34d399', to: '#059669', mid: '#10b981' },
  { id: 'teal', label: 'Teal', from: '#2dd4bf', to: '#0d9488', mid: '#14b8a6' },
  { id: 'cyan', label: 'Cyan / Sky', from: '#38bdf8', to: '#0284c7', mid: '#0ea5e9' },
];

export const DEFAULT_ACCENT_ID = 'blue';

/**
 * App-specific brand identity colors (STRICTLY for Hub cards, logos, and branding).
 * These colors NEVER change when the user selects a different global UI accent color.
 */
export const APP_IDENTITY_COLORS: Record<
  string,
  { from: string; to: string; mid: string; primary: string }
> = {
  chordex: { from: '#c084fc', to: '#9333ea', mid: '#a855f7', primary: '#a855f7' },
  drumex: { from: '#f472b6', to: '#db2777', mid: '#ec4899', primary: '#ec4899' },
  stagex: { from: '#60a5fa', to: '#2563eb', mid: '#3b82f6', primary: '#3b82f6' },
  groovex: { from: '#34d399', to: '#059669', mid: '#10b981', primary: '#10b981' },
  vocalex: { from: '#fbbf24', to: '#d97706', mid: '#f59e0b', primary: '#f59e0b' },
  hub: { from: '#679cff', to: '#007aff', mid: '#4d8ef7', primary: '#007aff' },
  devtools: { from: '#a1a1aa', to: '#71717a', mid: '#52525b', primary: '#71717a' },
};

/**
 * Parse 3, 6, or 8-character hex code to RGB tuple.
 */
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean.substring(0, 6), 16);
  if (isNaN(num)) return [0, 122, 255]; // fallback to classic blue
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Convert RGB to 6-character hex code.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return '#' + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate WCAG relative luminance.
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Adjust color brightness by factor.
 */
export function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Lighten color towards white.
 */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/**
 * Resolve any preset ID or custom hex code into complete semantic accent tokens.
 */
export function resolveAccent(accentColor?: string): ResolvedAccent {
  const input = (accentColor || DEFAULT_ACCENT_ID).trim();

  // 1. Check if it's a known preset ID
  const preset = ACCENT_PRESETS.find((p) => p.id.toLowerCase() === input.toLowerCase());
  if (preset) {
    const [r, g, b] = hexToRgb(preset.to);
    const lum = calculateLuminance(r, g, b);
    return {
      id: preset.id,
      from: preset.from,
      to: preset.to,
      mid: preset.mid,
      rgb: `${r}, ${g}, ${b}`,
      contrast: lum > 0.55 ? '#09090b' : '#ffffff',
      soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
      subtle: `rgba(${r}, ${g}, ${b}, 0.07)`,
      glow: `0 4px 20px rgba(${r}, ${g}, ${b}, 0.28)`,
      border: `rgba(${r}, ${g}, ${b}, 0.35)`,
      hover: lighten(preset.to, 0.15),
      active: adjustBrightness(preset.to, 0.9),
    };
  }

  // 2. Otherwise treat as a custom hex color
  const baseHex = input.startsWith('#') ? input : `#${input}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(baseHex)) {
    // If not a valid 6-char hex, fallback to default blue
    const defaultPreset = ACCENT_PRESETS[0];
    const [r, g, b] = hexToRgb(defaultPreset.to);
    return {
      id: defaultPreset.id,
      from: defaultPreset.from,
      to: defaultPreset.to,
      mid: defaultPreset.mid,
      rgb: `${r}, ${g}, ${b}`,
      contrast: '#ffffff',
      soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
      subtle: `rgba(${r}, ${g}, ${b}, 0.07)`,
      glow: `0 4px 20px rgba(${r}, ${g}, ${b}, 0.28)`,
      border: `rgba(${r}, ${g}, ${b}, 0.35)`,
      hover: lighten(defaultPreset.to, 0.15),
      active: adjustBrightness(defaultPreset.to, 0.9),
    };
  }

  const [r, g, b] = hexToRgb(baseHex);
  const fromHex = lighten(baseHex, 0.28);
  const midHex = lighten(baseHex, 0.12);
  const lum = calculateLuminance(r, g, b);

  return {
    id: 'custom',
    from: fromHex,
    to: baseHex,
    mid: midHex,
    rgb: `${r}, ${g}, ${b}`,
    contrast: lum > 0.55 ? '#09090b' : '#ffffff',
    soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
    subtle: `rgba(${r}, ${g}, ${b}, 0.07)`,
    glow: `0 4px 20px rgba(${r}, ${g}, ${b}, 0.28)`,
    border: `rgba(${r}, ${g}, ${b}, 0.35)`,
    hover: lighten(baseHex, 0.15),
    active: adjustBrightness(baseHex, 0.9),
  };
}
