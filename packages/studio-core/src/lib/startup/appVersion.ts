/**
 * Single source of truth for the Studio app version.
 *
 * Every consumer (Settings UI, Updater checker, debug tools, analytics)
 * MUST import from this module. Never hardcode a version string
 * elsewhere — duplication leads to settings showing one version while
 * the Updater system compares against another, which silently breaks
 * update notifications.
 *
 * The `public/version.json` file shipped alongside the bundle is
 * generated from `APP_VERSION` at build time by
 * `scripts/sync-versions.mjs` (wired in via the `prebuild` npm hook),
 * so the freshly-deployed bundle and its companion manifest are
 * always in lockstep.
 *
 * Bump `APP_VERSION` on every release. Bump `APP_CHANGELOG` to describe
 * what the user just received — that's the text shown in the
 * post-update modal on the first launch after the bundle is updated.
 *
 * Version format: strict semver (`MAJOR.MINOR.PATCH[-PRERELEASE]`).
 * The "Beta" label is presentation only — `APP_VERSION` itself stays
 * pure semver so comparisons are unambiguous.
 */

/**
 * Normalizes Mojibake corrupted character sequences resulting from double-encoding or Windows-1252/ANSI interpretation of UTF-8 strings.
 */
export function sanitizeUTF8String(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/â€¢/g, '•')
    .replace(/â€‹/g, '')
    .replace(/â€¦/g, '…')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€™/g, "'")
    .replace(/â€\x9d/g, '"')
    .replace(/â€\x9c/g, '"')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ');
}

import React from 'react';
import { Capacitor } from '@capacitor/core';
import { logVersionTransformation } from '../updater/versionLogger';

export const NATIVE_VERSION = '4.6.22';
export const NATIVE_VERSION_CODE = 40622;
export const WEB_VERSION = '4.6.22';
const cap =
  (typeof window !== 'undefined' && (window as any).Capacitor) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).Capacitor) ||
  Capacitor;
export const APP_VERSION = cap.isNativePlatform() ? NATIVE_VERSION : WEB_VERSION;

/** Optional pre-release tag rendered in the UI (e.g. "Beta", "RC"). */
export const APP_VERSION_TAG = '';

/** Human-readable label rendered in Settings → About. */
export const APP_VERSION_LABEL = APP_VERSION;

/**
 * Local date this build was stamped (e.g. "July 24, 2026").
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_VERSION_DATE = '8/12/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = '5e296cb1';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/17/2026, 4:07:50 AM CST';

/**
 * Changelog for the CURRENT release — shown to the user the first
 * time they launch the app after pulling this bundle, and from the
 * Settings → About → Changelog row at any time. Each section is a
 * heading + bullet list rendered Metrolist-style in `ChangelogSheet`.
 */
export interface ChangelogSection {
  /** Short uppercase header (e.g. "What's new", "Fixes"). */
  heading: string;
  /** Plain user-facing bullets. Keep each line short. */
  items: string[];
}

export const APP_CHANGELOG_SECTIONS: ChangelogSection[] = [
  {
    heading: 'Improved',
    items: [
      'Decommissioned Obsolete Prototype Packages: Completely removed legacy direct-postgres prototype package `lib/db/` and purged obsolete workspace dependencies and tsconfig references.',
      'Sync Provider Canonicalization: Pruned dead ghost options (`firebase-firestore-legacy`, `supabase-powersync`) in favor of canonical `supabase-realtime` sync engine.',
      'Theme Token & Visual Hierarchy Unification: Consolidated Chordex and Drumex tuner surfaces to canonical Livex theme tokens, guaranteeing true AMOLED pitch black and adaptive light mode backgrounds.',
      'Animation & Motion Performance: Optimized animation lifecycles with CSS compositor offloading and strict reduced-motion accessibility enforcement.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Native Updater State Machine Deadlock Resolution: Corrected unhandled transition paths in updater pipeline that previously left the updater stuck in downloading/verifying states on unhandled transitions.',
      'Updater Download Cancellation Support: Added comprehensive `AbortController` cancellation for in-flight APK downloads when dialogs are closed or dismissed, cleanly terminating connections and resetting state to `INSTALL_CANCELLED`.',
      'Native Android PackageInstaller Callbacks: Connected native Android `PackageInstaller` broadcast events (`STATUS_SUCCESS`, `STATUS_PENDING_USER_ACTION`, `STATUS_FAILURE_*`) to the JavaScript runtime.',
      'Silent Catch Block Remediation: Replaced silent empty catch blocks across metadata retrieval, SHA-256 verification, and installation recovery with structured diagnostic flight recorder telemetry.',
      'Theme Cold-Boot Initialization Flash: Eliminated theme flicker and initialization lag during cold boots and page transitions.',
    ],
  },
];

export interface ReleaseHistoryItem {
  version: string;
  date: string;
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseHistoryItem[] = [
  {
    version: '4.6.22',
    date: '2026-09-17',
    highlights: [
      'Android Manifest Permission Hardening: Stripped legacy `com.google.android.providers.gsf.permission.READ_GSERVICES` injected transitively by reCAPTCHA via manifest merger (`tools:node="remove"`), strictly enforcing a 16-permission whitelist with zero unauthorized permissions.',
      'Scoped FileProvider & Backup Protection: Narrowed `FileProvider` paths strictly to cache directories and configured `data_extraction_rules.xml` and `backup_rules.xml` to completely disable cloud backups and device data transfers.',
      'Strict Authorization & Storage Isolation: Decommissioned unused `firebase/storage` SDK from client runtime, enforced strict 2MB/10MB limits in server rules, and locked Firestore rooms and presence to authenticated user sandboxes.',
      'Native Updater State Machine Deadlock Resolution: Corrected unhandled transition paths in updater pipeline that previously left the updater stuck in downloading/verifying states on unhandled transitions.',
      'Updater Download Cancellation Support: Added comprehensive `AbortController` cancellation for in-flight APK downloads when dialogs are closed or dismissed, cleanly terminating connections and resetting state to `INSTALL_CANCELLED`.',
      'Native Android PackageInstaller Callbacks: Connected native Android `PackageInstaller` broadcast events (`STATUS_SUCCESS`, `STATUS_PENDING_USER_ACTION`, `STATUS_FAILURE_*`) to the JavaScript runtime.',
    ],
  },
  {
    version: '4.6.21',
    date: '2026-09-17',
    highlights: [
      'Profile & RootApp Runtime Crash Resolved: Eliminated critical production crash (`Minified React error #310: Rendered more hooks than during the previous render`) occurring when navigating to the Profile/Account settings screen.',
      'Rules of Hooks Architectural Alignment: Hoisted all store selectors, theme attributes, and modal origin geometry hooks to the top level of `AccountSettingsPage` before early returns, ensuring constant hook allocation counts on both unauthenticated mount and authenticated update renders.',
      'Component Lifecycle & Stability Guard: Extracted `AccountDeviceRow` out of inline JSX IIFE closures into module scope with explicit props, eliminating component type churning and local hook allocation jitter across re-renders.',
      'Chordex Library Detail Hook Rule Alignment: Hoisted `detailScrollRef` above early return conditions in `LibraryChordDetail`.',
    ],
  },
  {
    version: '4.6.20',
    date: '2026-09-17',
    highlights: [
      'Complete Theme Parity for Chordex & Drumex Tuners: Replaced all legacy hardcoded background colors, borders, and text values across Chromatic Tuner, Drum Tuner, and Tuning Selector modals with canonical Livex theme tokens (var(--app-bg), var(--c-surface-low), var(--c-surface-high), var(--c-surface-highest), var(--c-border), and var(--c-text-*)).',
      'Seamless Transparent Instrument Artwork in Light Mode: Introduced shared useTunerArtwork hook executing automated client-side edge flood-fill to eliminate black studio backdrops behind guitar headstocks and drum shells in Light theme, allowing instruments to float naturally on light backgrounds.',
      'Pure Black AMOLED Efficiency: Guaranteed true #000000 pitch black backgrounds and subtle borders in AMOLED mode across all tuner views and modals for optimal display contrast and battery performance.',
      "Dynamic Accent & State Wiring: Replaced static green/blue active states on string selection, Auto toggles, tuning radios, and Reference playback buttons with the user's active theme accent color.",
      'Vocalex Preferences Geometry Alignment: Normalized Vocalex Preferences layout width and margins to canonical settings geometry matching other internal apps.',
    ],
  },
  {
    version: '4.6.19',
    date: '2026-09-16',
    highlights: [
      'Realistic House Kit Drum Samples for Drumex Tuner: Equipped the Drumex Tuner reference sound system with authentic high-definition House Kit room-blend samples (Snare, Tom 1, Tom 2, Floor Tom, Kick) replacing synthetic oscillator tones.',
      'Pitch-Calibrated Shell Resampling: Calibrated Web Audio playback rates dynamically to exact target tension frequencies (Tight, Normal, Loose) in Hz with physical 3ms anti-click attack envelopes and natural room acoustic decay.',
      'Interactive Photographic Drum Graphic: Enabled direct touch interaction on both the center photographic drumhead render and the dedicated Referencia trigger for immediate reference playback.',
      'Complete Multi-Theme Tuner Parity: Upgraded Chordex Chromatic Tuner, Tuning Selector, and Drumex Tuner to be 100% theme-aware across Light, Dark, and AMOLED modes, eliminating hardcoded black backdrops and unreadable text.',
      "Dynamic Accent Resolution in Tuners: Bound Auto toggle switches, tuning selector radio indicators, and state highlights to the user's active theme accent color.",
      'High-Contrast Permissions Banner: Restyled microphone permission failure alerts with WCAG-compliant high contrast across light and dark backdrops.',
    ],
  },
  {
    version: '4.6.18',
    date: '2026-09-16',
    highlights: [
      'Canonical Bounded Overscroll Spring System: Implemented a polished, unified, native-feeling overscroll spring and bounce interaction across Livex scrollable screens via the canonical `useOverscrollSpring` layout hook.',
      'Progressive Rubber-Band Physics: Integrated asymptotic elastic resistance strictly bounding content displacement at 44px ($d(p) = \\text{sign}(p) \\cdot D_{\\max} \\cdot (1 - 1 / (1 + c \\cdot |p| / D_{\\max}))$), preventing runaway stretch and visual dislocation.',
      'Analytical Damped Harmonic Oscillator: Built exact continuous-time spring return settling in ~250–300ms with natural frequency $\\omega_0 = 24\\text{ rad/s}$ and damping ratio $\\zeta = 0.94$, eliminating bounce jitter, oscillation, and overshoot.',
      'Floating Header & Liquid Glass Isolation: Displaced the scroll container via hardware-accelerated `translate3d(0, y, 0)` leaving sibling floating headers rock-solid with 0.0px drift, undistorted backdrop filters, and intact `useScrollMorph` states.',
      'Cross-App Normalization: Deployed overscroll spring interaction across SettingsScaffold, Hub Settings, Groovex Preferences & Library, Stagex Setup & Preferences, Chordex Preferences, Drumex Prefs, Beats & Patterns, and Vocalex Preferences & Takes.',
      'Android WebView Performance & Accessibility: Direct DOM updates with zero React re-renders during active touch dragging; directional lockout for horizontal gestures; full compliance with reduced-motion accessibility.',
    ],
  },
  {
    version: '4.6.17',
    date: '2026-09-16',
    highlights: [
      'Stagex Unified Entrance Transition: Added the established `UNIFIED_NAV_TRANSITION` subtle entrance animation (200ms ease-out, 6px lift, 0.995 to 1.0 scale) when entering the Stage destination (`Editor` view), aligning it with Setup and other core destinations.',
      'Canvas Lifecycle & Compositor Performance: Preserved 100% persistent DOM mounting of `StageCanvasView` across navigation transitions, avoiding canvas reload or flicker, while using compositor-only properties (`transform`, `opacity`) that complete to inert styles.',
      'Preferences Navigation Streamlining: Removed redundant back buttons from the Preferences section across all internal apps (Chordex, Drumex, Stagex, Groovex, Vocalex) as it is directly accessible via primary navigation, reclaiming clean header real estate.',
      'Header Geometry Refinements: Standardized compact top bar height to 56px with a 60px expanded baseline for optimal beUI Pro proportions and safe area clearance.',
      'Motion Accessibility Invariant: Enforced zero-duration, instant state transitions for Stagex and shared navigation when reduced motion is requested by the user or OS.',
    ],
  },
  {
    version: '4.6.16',
    date: '2026-09-16',
    highlights: [
      'Contextual Action Pill Integration: Introduced canonical `ContextualActionPill` modeled after Stagex floating actions, housing compact 32px circular icon buttons with >=44px ergonomic touch hit areas and SpringPresets.soft micro-interactions across Chordex and Drumex.',
      'Reclaimed Vertical Space: Eliminated legacy text shortcut rows and normalized scroll container padding across Chordex (Library, Songs), Drumex (Patterns, Beats), Stagex, and Vocalex, reclaiming ~80px of vertical space.',
      'Canonical 46px Search Bar Standard: Standardized top-level search inputs across Chordex, Drumex, Stagex, and Groovex to 46px height with full pill radius (`rounded-full`), optical icon centering, and responsive theme styling.',
      'Neutral Color Language: Replaced hardcoded blue accent icons on secondary tools with neutral, theme-aware tokens matching the established Studio design language.',
    ],
  },
  {
    version: '4.6.15',
    date: '2026-09-16',
    highlights: [
      'Top-Bar Boundary Distortion Elimination: Decoupled the SVG displacement filter from the outer top-bar container and isolated micro-refraction to an internal clipped plane, eliminating wavy/wiggly edge deformation and boundary ripping.',
      'Top-Bar Content Clearance Normalization: Expanded scroll viewport top padding from `+ 78px` to `+ 92px` across all application scaffolds and detail views, providing 26px breathing room and preventing content from colliding with the floating top bar.',
      'OpenDesign Liquid Glass Morph: Upgraded scroll-reactive header morph with cubic Hermite smoothstep easing and monotonic continuous curvature (18px to 24px to 9999px), delivering fluid physical capsule condensation with zero step discontinuities.',
      'Subtle Optical Refraction Tuning: Standardized turbulence and displacement parameters to `scale="2"` and `baseFrequency="0.04 0.04"`, producing clean, premium neutral Liquid Glass without RGB edge artifacts.',
    ],
  },
  {
    version: '4.6.14',
    date: '2026-09-15',
    highlights: [
      'Immediate Floating Header Elimination: Transformed page headers to render State A (transparent, unformed glass, centered page title resting directly on background) at scroll position 0, eliminating premature floating capsule appearance.',
      'Chromatic Aberration Artifact Removal: Removed hardcoded cyan/rose-red chromatic fringe overlays in favor of pure SVG turbulence glass refraction (`dpawlikowski/liquid-glass`).',
      'Subtitle Clutter Cleanup: Removed all secondary descriptive text beneath page titles across all screens.',
      'Cross-App Canonical Header Unification: Fully standardized centered-title and scroll-formed Liquid Glass top bar across Chordex (Library, Songs, Saxophone Practice, Preferences), Drumex (Beats, Patterns, Preferences), Stagex (Setup Hub, Preferences), Groovex, and Vocalex (Takes, Preferences).',
      'Dead-Center Title Invariant: Relocated contextual quick-actions (Finder/Tuner in Chordex Library, Metronome/Drum Tuner in Drumex Patterns) to dedicated body rows, guaranteeing 100% mathematical dead-centering of titles with zero collision or lateral offset.',
      'Navigation Dispatcher Safety: Standardized on `NavigationDispatcher.canGoBack()` before popping history across all subviews.',
    ],
  },
  {
    version: '4.6.13',
    date: '2026-09-15',
    highlights: [
      'Cross-App Canonical Liquid Glass Top Bar Integration: Completed repository-wide unification of the persistent Liquid Glass top bar across Chordex, Stagex, Drumex, Vocalex, Groovex, Hub, and Settings.',
      'Scroll Morph Engine Wiring: Connected `scrollContainerRef` to `CategoryScreenView`, `LibraryChordDetail`, and `PdfPreviewModal` in Chordex, and `StageSetupDetailLayout` and `StageExportPdfView` in Stagex, activating smooth scroll-driven geometry morphing on all drill-down pages.',
      'Composable ScrollScaffold Architecture: Enhanced `ScrollScaffold` with `React.forwardRef` to support seamless ref forwarding for scroll-driven animations while preserving automated navigation scroll-hide behavior.',
      'Mobile DAW Transport Bar Material Parity: Elevated DrumEditor mobile sequencer header from legacy styling to the canonical Liquid Glass design tokens with specular highlights and paint containment.',
    ],
  },
];

/** Native English version of the current changelog for Android. */
export const APP_CHANGELOG_SECTIONS_NATIVE: ChangelogSection[] = [
  {
    heading: 'Added',
    items: [
      'Chordex Library Bento Redesign: Completely overhauled the Chordex Library section with a modern Bento card layout and ambient glowing accents.',
      'Dynamic Mini Fretboard Recesses: Introduced high-fidelity 6-string dynamic fretboard recess components with realistic gauge lines and glowing finger dots.',
      'Interactive Chord Preview Section: Integrated rich multi-instrument visualizers supporting instant toggles across Guitar, Bass, and Piano.',
      'Harmonic Categories Grid: Expanded category browser to 31 distinct harmonic flavors with signature 3-string mini recesses.',
      'Universal Theme Parity: Full adaptive styling across Dark, Light, and AMOLED modes.',
    ],
  },
];

/** Spanish version of the current changelog — picked at render time
 *  by `ChangelogSheet` based on `settings.language`. */
export const APP_CHANGELOG_SECTIONS_ES: ChangelogSection[] = [
  {
    heading: 'Añadido',
    items: [
      'Rediseño Bento de la Biblioteca Chordex: Renovación completa de la biblioteca con diseño Bento moderno, acentos luminosos y experiencia adaptable.',
      'Cavidades dinámicas de diapasón: Nuevos componentes dinámicos de 6 cuerdas con líneas realistas de calibre y puntos guía luminosos.',
      'Visualizador interactivo de acordes: Visualizadores multi-instrumento para Guitarra, Bajo y Piano con reproducción de audio y acordes sugeridos.',
      'Cuadrícula de categorías armónicas: 31 estilos armónicos con mini cavidades de 3 cuerdas y filtros rápidos por nota fundamental.',
      'Paridad universal de temas: Adaptación visual completa en modos Oscuro, Claro y AMOLED.',
    ],
  },
];

/** German version of the current changelog. */
export const APP_CHANGELOG_SECTIONS_DE: ChangelogSection[] = [
  {
    heading: 'Hinzugefügt',
    items: [
      'Chordex Bibliothek Bento-Neugestaltung: Vollständige Überarbeitung mit modernem Bento-Kartenlayout und responsiver Ansicht.',
      'Dynamische Mini-Griffbrett-Aussparungen: Hochpräzise 6-Saiten-Griffbrettkomponenten mit Bundlinien und leuchtenden Griffpunkten.',
      'Interaktive Akkord-Vorschau: Multi-Instrument-Visualisierungen für Gitarre, Bass und Klavier mit Audio-Wiedergabe.',
      'Harmonisches Kategoriengitter: Erweiterte Kategorieübersicht mit 31 harmonischen Varianten.',
      'Universelle Theme-Parität: Vollständige visuelle Anpassung für Dark-, Light- und AMOLED-Modi.',
    ],
  },
];

/** Returns the changelog sections for the requested language, falling
 *  back to English when no localized version is available. */
export function getChangelogSections(lang: string | undefined | null): ChangelogSection[] {
  if (lang === 'es' && APP_CHANGELOG_SECTIONS_ES && APP_CHANGELOG_SECTIONS_ES.length > 0)
    return APP_CHANGELOG_SECTIONS_ES;
  if (lang === 'de' && APP_CHANGELOG_SECTIONS_DE && APP_CHANGELOG_SECTIONS_DE.length > 0)
    return APP_CHANGELOG_SECTIONS_DE;
  return APP_CHANGELOG_SECTIONS;
}

/** Backwards-compatible flat bullet list (kept so any old caller still
 *  works). New UI should use `APP_CHANGELOG_SECTIONS`. */
export const APP_CHANGELOG = APP_CHANGELOG_SECTIONS.flatMap((s) => s.items);

/**
 * Parsed semver shape. Build metadata (everything after `+`) is
 * discarded — semver §10 says it has no precedence — but pre-release
 * identifiers are preserved so they can be compared per §11.
 */
interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  /** `null` for a release, e.g. "3.0.0". String for a prerelease, e.g. "beta.2". */
  prerelease: string | null;
}

/**
 * STRICT semver parser. Rejects leading zeros, missing parts, and
 * malformed input. Accepts a leading `v` (common in tag names) and
 * strips any `+build` metadata. Returns `null` on any parse failure
 * so callers can treat un-parseable input as "no comparison possible".
 *
 * Examples:
 *   "3.0.0"      → { 3, 0, 0, null }
 *   "v3.0.0"     → { 3, 0, 0, null }
 *   "3.0.0-beta" → { 3, 0, 0, "beta" }
 *   "3.0.0+abc"  → { 3, 0, 0, null }   (build metadata stripped)
 *   "01.2.3"     → null                 (leading zero)
 *   "3"          → null                 (incomplete)
 *   "3.0"        → null                 (incomplete)
 *   "garbage"    → null
 */
export function parseAndNormalizeVersion(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') {
    logVersionTransformation('parseAndNormalizeVersion', raw, null);
    return null;
  }
  const match = raw.match(
    /[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/
  );
  if (!match) {
    logVersionTransformation('parseAndNormalizeVersion', raw, null);
    return null;
  }
  let clean = match[0];
  if (clean.startsWith('v') || clean.startsWith('V')) {
    clean = clean.slice(1);
  }
  logVersionTransformation('parseAndNormalizeVersion', raw, clean);
  return clean;
}

export function parseSemver(raw: string | null | undefined): ParsedSemver | null {
  const clean = parseAndNormalizeVersion(raw);
  if (!clean) {
    logVersionTransformation('parseSemver', raw, null);
    return null;
  }

  const m = clean.match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
  );
  if (!m) {
    logVersionTransformation('parseSemver', raw, null);
    return null;
  }
  // Per semver §9: a pre-release numeric identifier MUST NOT include
  // leading zeros. Reject e.g. "1.2.3-01" or "1.2.3-alpha.001".
  if (m[4]) {
    for (const id of m[4].split('.')) {
      if (/^\d+$/.test(id) && id.length > 1 && id.startsWith('0')) {
        logVersionTransformation('parseSemver', raw, null);
        return null;
      }
    }
  }
  const resultObj = {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  };
  logVersionTransformation('parseSemver', raw, JSON.stringify(resultObj));
  return resultObj;
}

/**
 * Convenience: returns just the [major, minor, patch] tuple, or `null`.
 * Pre-release info is dropped — callers that care about prerelease
 * precedence should use `parseSemver` + `compareSemver` directly.
 */
export function normalizeSemver(raw: string | null | undefined): [number, number, number] | null {
  const p = parseSemver(raw);
  const resultObj = p ? ([p.major, p.minor, p.patch] as [number, number, number]) : null;
  logVersionTransformation('normalizeSemver', raw, resultObj ? JSON.stringify(resultObj) : null);
  return resultObj;
}

/**
 * Compare two semver strings. Returns -1 / 0 / +1 like Array.sort.
 * Returns 0 if either side fails to parse — i.e. an un-parseable
 * remote version is treated as "no update", never as a downgrade.
 *
 * Pre-release precedence per semver §11:
 *   - A version WITHOUT prerelease has HIGHER precedence than one WITH.
 *     ("3.0.0" > "3.0.0-beta" — the release supersedes the beta.)
 *   - Two prereleases compare identifier-by-identifier:
 *     numeric vs numeric → numeric;
 *     numeric vs alphanumeric → numeric is lower;
 *     alphanumeric vs alphanumeric → ASCII;
 *     fewer fields → lower precedence (when all prior fields equal).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    logVersionTransformation('compareSemver', `${a} vs ${b}`, '0 (unparseable)');
    return 0;
  }
  let res: -1 | 0 | 1 = 0;
  if (pa.major !== pb.major) {
    res = pa.major > pb.major ? 1 : -1;
  } else if (pa.minor !== pb.minor) {
    res = pa.minor > pb.minor ? 1 : -1;
  } else if (pa.patch !== pb.patch) {
    res = pa.patch > pb.patch ? 1 : -1;
  } else if (pa.prerelease === null && pb.prerelease === null) {
    res = 0;
  } else if (pa.prerelease === null) {
    res = 1; // release > prerelease
  } else if (pb.prerelease === null) {
    res = -1;
  } else {
    res = comparePrerelease(pa.prerelease, pb.prerelease);
  }
  logVersionTransformation('compareSemver', `${a} vs ${b}`, String(res));
  return res;
}

function comparePrerelease(a: string, b: string): -1 | 0 | 1 {
  const ai = a.split('.');
  const bi = b.split('.');
  const len = Math.max(ai.length, bi.length);
  for (let i = 0; i < len; i++) {
    const xa = ai[i];
    const xb = bi[i];
    // Fewer fields = lower precedence (semver §11.4.4).
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    const na = /^\d+$/.test(xa) ? Number(xa) : null;
    const nb = /^\d+$/.test(xb) ? Number(xb) : null;
    if (na !== null && nb !== null) {
      if (na !== nb) return na > nb ? 1 : -1;
    } else if (na !== null) {
      return -1; // numeric identifier always < alphanumeric
    } else if (nb !== null) {
      return 1;
    } else {
      if (xa !== xb) return xa > xb ? 1 : -1;
    }
  }
  return 0;
}

/**
 * React hook returning the current app version. Memoised because the
 * version is constant for the lifetime of the page — we never want a
 * re-render to look like "the version changed".
 */
export function useAppVersion(): {
  version: string;
  label: string;
  tag: string;
  date: string;
  changelog: string[];
  sections: ChangelogSection[];
} {
  return React.useMemo(
    () => ({
      version: APP_VERSION,
      label: APP_VERSION_LABEL,
      tag: APP_VERSION_TAG,
      date: APP_VERSION_DATE,
      changelog: APP_CHANGELOG,
      sections: APP_CHANGELOG_SECTIONS,
    }),
    []
  );
}

/** Authoritative expected production signing certificate SHA-256 fingerprint. */
export const PRODUCTION_SIGNING_SHA256 =
  (typeof process !== 'undefined' && process.env?.EXPECTED_SIGNATURE_SHA256) ||
  '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';
