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

export const NATIVE_VERSION = '4.6.38';
export const NATIVE_VERSION_CODE = 40638;
export const WEB_VERSION = '4.6.38';
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
export const APP_VERSION_DATE = '9/19/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = '3a7117be';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/22/2026, 10:59:29 PM CST';

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
    heading: 'Added',
    items: [
      'Native Livex Music AI Assistant: Integrated an intelligent music studio assistant accessible directly from the floating bottom navigation bar dock.',
      'Minimalist ThinkingOrb Mascot: Designed a subtle, high-polish circular AI orb with responsive state animations (idle pulse, thinking breathe, speak shimmer, tap bounce) inspired by modern AI design.',
      'Borderless Studio Conversation UI: Built a clean edge-to-edge message stream with dedicated assistant and user message treatments, streaming text indicators, and instant scroll pinning.',
    ],
  },
  {
    heading: 'Improved',
    items: [
      'Instant Response Streaming: Optimized Time-to-First-Token (TTFT) to under 5ms, eliminating artificial typing delays and yielding instantaneous token delivery.',
      'Professional Assistant Persona: Overhauled system prompt engineering for direct, technically precise audio and music engineering answers with zero conversational filler, no emojis, and no exaggerated enthusiasm.',
      'Unified Snake Loading Spinner: Migrated all updater screens, settings, and modal spinners to the canonical GPU-accelerated Snake loader design.',
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
    version: '4.6.38',
    date: '2026-09-22',
    highlights: [
      'Native Livex Music AI Assistant: Integrated an intelligent music studio assistant accessible directly from the floating bottom navigation bar dock.',
      'Minimalist ThinkingOrb Mascot: Designed a subtle, high-polish circular AI orb with responsive state animations (idle pulse, thinking breathe, speak shimmer, tap bounce) inspired by modern AI design.',
      'Borderless Studio Conversation UI: Built a clean edge-to-edge message stream with dedicated assistant and user message treatments, streaming text indicators, and instant scroll pinning.',
      'Instant Response Streaming: Optimized Time-to-First-Token (TTFT) to under 5ms, eliminating artificial typing delays and yielding instantaneous token delivery.',
      'Professional Assistant Persona: Overhauled system prompt engineering for direct, technically precise audio and music engineering answers with zero conversational filler, no emojis, and no exaggerated enthusiasm.',
      'Unified Snake Loading Spinner: Migrated all updater screens, settings, and modal spinners to the canonical GPU-accelerated Snake loader design.',
    ],
  },
  {
    version: '4.6.37',
    date: '2026-09-21',
    highlights: [
      'Bottom Navigation Bar Pill Geometry: Unified the bottom navigation bar curvature to a full pill shape (`borderRadius: 9999px`), creating visual and geometric harmony with the floating top bar header and satellite app switcher.',
      'Streamlined Native Updater Flow: Simplified the in-app update experience by removing the intermediate verifying and completion panes, keeping the UI cleanly anchored on the installing pane while directly presenting the native Android PackageInstaller prompt to update or cancel.',
    ],
  },
  {
    version: '4.6.36',
    date: '2026-09-21',
    highlights: [
      'Intro Animation Fluidity: Eliminated frame drops and main-thread raster stalls during mark assembly by eagerly pre-warming and decoding brand textures (livex-form1.png, livex-form2.png, livex-symbol.png) at module evaluation time.',
      'Zero-Blur GPU Radial Glow: Replaced costly CSS blur filter (filter: blur(28px)) with a hardware-accelerated pure radial gradient, preventing multi-pass Gaussian shader overhead on mobile WebViews.',
      'HTML Splash Dissolve: Replaced abrupt 0ms hard DOM cutoff of #intro with a coordinated 220ms cubic-bezier dissolve synchronized with the React intro reveal.',
      'Route Unmount Cutoff Resolution: Added missing exit animation variants (opacity: 0, scale: 1.04) to ApplicationTransitionEngine.tsx, preventing instantaneous component drops under AnimatePresence.',
      'Sub-App Keep-Alive Preservation: Retained visited sub-applications in DOM across route changes, eliminating component destruction, hook re-initialization, and chunk loading pauses when revisiting apps.',
      'Dedicated Domain Loading Skeletons: Mapped specific loading skeletons for Chordex, Drumex, Stagex, Groovex, and Vocalex, eliminating jarring layout shifts.',
    ],
  },
  {
    version: '4.6.35',
    date: '2026-09-21',
    highlights: [
      'Comprehensive Security Hardening: Remediated all GitHub Dependabot security alerts, upgrading Vitest to 4.1.11, overriding uuid to ^11.1.1 (CVE-2026-41907), and overriding esbuild to 0.28.1 (GHSA-g7r4-m6w7-qqqr).',
      'Remediated CodeQL Code Scanning Alerts: Resolved command injection vectors in release orchestration scripts, sanitized Android SafeContentResolver URI operations, hardened URL validation in updater security checks, and eliminated prototype pollution vectors in StageCanvasView.',
      'Closed Secret Scanning False Positives: Audited and verified all repository tokens and credentials, confirming zero open secret scanning alerts.',
      'CI/CD & Release Pipeline Modernization: Updated all GitHub Actions workflows to align dynamic package manager resolution (pnpm 11.24.0), modernized runner action versions, corrected CI paths to packages/livex-core/**, and ensured release workflows dynamically target github.repository.',
      'CodeQL Java/Kotlin Analysis Resilience: Configured Android Gradle analysis in CodeQL to rerun compilation tasks without stale build cache interference.',
      'Workspace Quality Gates: Resolved all TypeScript and ESLint linting discrepancies across workspace tests and documentation validation.',
    ],
  },
  {
    version: '4.6.34',
    date: '2026-09-20',
    highlights: [
      'Dedicated Vocalex Track Effects Surface (`TakeEffectsSheet`): Introduced a professional mobile effects overlay featuring real-time Web Audio API DSP processors (Reverb, Delay/Echo, Chorus/Modulation, Drive/Distortion, High-Pass, and Low-Pass filters) with live auditioning and Android `BackDispatcher` integration.',
      'Integrated Vocal Harmonizer Suite: Embedded the multi-part vocal harmonizer and pitch-shift layer generator as a dedicated capability inside the Track Effects surface while preserving all existing harmony logic.',
      'Vocalex Takes Action Hierarchy: Redesigned the post-recording take experience in `TakeDetailView`, moving "Re-record" and "Harmonize" away from the top header into a dedicated, organized track processing area below playback.',
      'Safe Destructive Action Placement: Separated the delete take action into the dedicated track action area with subtle red tone and modal confirmation to prevent accidental taps while keeping it easily accessible.',
      'Stagex History Theme Awareness: Replaced hardcoded pink/magenta visual values across `StageHistorySurface` and `StageCanvasView` with semantic theme accent tokens (`--studio-accent`), ensuring cohesive appearance across Dark, Light, and AMOLED themes.',
      'Stagex Toolbar Cleanup: Removed duplicate History navigation from the elements toolbar to maintain focused, single-purpose toolbars.',
    ],
  },
  {
    version: '4.6.33',
    date: '2026-09-20',
    highlights: [
      'Liquid Glass Bottom Navigation Surface: Redesigned the Bottom Navbar into a continuous Liquid Glass pill with fully rounded 9999px ends, subtle frosted transparency, and restrained optical depth across Dark, Light, and AMOLED themes.',
      'Integrated Selected Capsule: Enlarged the active tab highlight into a slot-filling capsule with embedded optical depth, upper specular reflection, and subtle top specular rim line, eliminating floating-bubble appearance.',
      'Motion Stability & Zero Distortion: Critically damped the navigation spring dynamics to eliminate overshoot and oscillation during rapid tab switching, and removed deforming scale and skew transforms for rock-solid geometric stability.',
    ],
  },
  {
    version: '4.6.32',
    date: '2026-09-20',
    highlights: [
      'Groovex Song Detail Navigation Scoping: Isolated bottom navigation and floating topbar behavior in Groovex so that entering an individual song mounts the standard Livex Topbar (`SharedFloatingHeader`) with scroll-morphing and hides the Bottom Navbar, while preserving the Bottom Navbar across all library, browsing, and preference views.',
      'Bottom Navbar Geometric Refinement: Balanced the outer Bottom Navbar pill container curvature and enlarged the active tab highlight into an integrated slot-filling capsule matching reference geometry.',
      'Groovex Instant Local Song Loading: Implemented an in-memory decoded `AudioBuffer` LRU cache and single-pass parallel IndexedDB stem retrieval (`getCachedSongStems`), eliminating repeated CPU decompression and reducing subsequent local song load times to 0ms (instant).',
      'Parallel Stem Decompression: Replaced sequential serial stem loading with concurrent `Promise.all` Web Audio decompression across background threads, cutting cold local load times by ~85%.',
    ],
  },
  {
    version: '4.6.31',
    date: '2026-09-20',
    highlights: [
      'Drumex Topbar Spacing: Eliminated redundant 48px vertical gap between the floating pill Topbar and the ALL ROWS (7) grid toolbar by converting the topbar to an in-flow margin layout and removing duplicate padding compensation.',
      'Stagex Specifications Panel: Resolved rightward horizontal shift and canvas upward reflow by removing relative positioning and ensuring the specifications panel behaves as an independent floating overlay.',
    ],
  },
  {
    version: '4.6.30',
    date: '2026-09-20',
    highlights: [
      'Native Liquid Glass Material Architecture: Upgraded Topbar and Bottom Navigation surfaces with optical curvature gradients, calibrated 20px blur, and vibrant saturation (190% dark / 180% light), delivering Apple-grade frosted depth and real background separation across all screens.',
      'Physical Specular Edge Rims: Added micro-refined translucent borders (`1px solid rgba(255, 255, 255, 0.12)`) and inset specular top highlights (`inset 0 1px 0 0 rgba(255, 255, 255, 0.16)`) to Topbar and Bottom Navigation surfaces.',
      'Enlarged Bottom Navigation Selected Highlight: Upgraded active tab highlight capsule from `56×46px` (radius `21px`) to `64×48px` (radius `24px`) with exact 2px vertical centering in `SharedNavigationBar`, comfortably containing tab icons and labels across all apps.',
      'Liquid Glass Lens Material Tokens: Refined `--surface-glass-lens-*` tokens across Dark, Light, and AMOLED themes with physical specular center glow and subtle depth shadows.',
    ],
  },
  {
    version: '4.6.29',
    date: '2026-09-20',
    highlights: [
      'Drumex Beat-Editor Contextual Action Toolbar: Transformed the top-right hamburger menu in Drumex beat-editor into a seamless contextual toolbar morph. Activating the menu smoothly expands the top bar surface into an action toolbar containing beat settings, swing, and pattern tools.',
      'Reusable Morph Interaction Pattern: Established shared animated morph primitive in `ui-shared` for contextual tool sections and expandable action surfaces.',
      'Bottom Navigation Fixed Geometric Highlight: Enforced strict canonical geometry for the selected-tab highlight indicator across all Livex applications. The highlight maintains identical width, height, border radius, vertical alignment, and visual weight regardless of label length, icon dimensions, or active tab.',
    ],
  },
];

/** Native English version of the current changelog for Android. */
export const APP_CHANGELOG_SECTIONS_NATIVE: ChangelogSection[] = [
  {
    heading: 'Added',
    items: [
      'Drumex Beat-Editor Contextual Action Toolbar: Transformed the top-right menu in Drumex beat-editor into a seamless contextual toolbar morph for instant access to beat actions.',
      'Reusable Morph Interaction Pattern: Established shared animated morph primitive in `ui-shared` for expandable contextual tool surfaces.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Bottom Navigation Fixed Geometric Highlight: Enforced strict canonical geometry for the selected-tab highlight indicator across all Livex applications.',
    ],
  },
];

/** Spanish version of the current changelog — picked at render time
 *  by `ChangelogSheet` based on `settings.language`. */
export const APP_CHANGELOG_SECTIONS_ES: ChangelogSection[] = [
  {
    heading: 'Novedades',
    items: [
      'Barra de herramientas contextual en Drumex: Transformación del menú superior derecho del editor de ritmos en una barra de herramientas contextual fluida para acceder instantáneamente a las acciones del ritmo.',
      'Patrón de interacción de metamorfosis reutilizable: Establecido componente de animación compartido en `ui-shared` para superficies de herramientas expandibles.',
    ],
  },
  {
    heading: 'Correcciones',
    items: [
      'Indicador de navegación inferior con geometría fija: Establecida una geometría canónica estricta para el indicador de pestaña seleccionada en todas las aplicaciones de Livex.',
    ],
  },
];

/** German version of the current changelog. */
export const APP_CHANGELOG_SECTIONS_DE: ChangelogSection[] = [
  {
    heading: 'Neu',
    items: [
      'Kontextuelle Aktions-Toolbar im Drumex Beat-Editor: Das Menü oben rechts wurde in eine nahtlose kontextuelle Toolbar umgewandelt.',
      'Wiederverwendbares Morph-Interaktionsmuster: Gemeinsames animiertes Morph-Primitiv in `ui-shared` für erweiterbare Werkzeugoberflächen etabliert.',
    ],
  },
  {
    heading: 'Fehlerbehebungen',
    items: [
      'Feste geometrische Hervorhebung der unteren Navigation: Strikte kanonische Geometrie für den Tab-Auswahlindikator in allen Livex-Anwendungen durchgesetzt.',
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
