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

export const NATIVE_VERSION = '4.6.30';
export const NATIVE_VERSION_CODE = 40630;
export const WEB_VERSION = '4.6.30';
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
export const APP_COMMIT_SHA = '8752a0c4';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/20/2026, 5:47:56 AM CST';

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
      'Drumex Beat-Editor Contextual Action Toolbar: Transformed the top-right hamburger menu in Drumex beat-editor into a seamless contextual toolbar morph. Activating the menu smoothly expands the top bar surface into an action toolbar containing beat settings, swing, and pattern tools.',
      'Reusable Morph Interaction Pattern: Established shared animated morph primitive in `ui-shared` for contextual tool sections and expandable action surfaces.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Bottom Navigation Fixed Geometric Highlight: Enforced strict canonical geometry for the selected-tab highlight indicator across all Livex applications. The highlight maintains identical width, height, border radius, vertical alignment, and visual weight regardless of label length, icon dimensions, or active tab.',
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
    version: '4.6.29',
    date: '2026-09-20',
    highlights: [
      'Drumex Beat-Editor Contextual Action Toolbar: Transformed the top-right hamburger menu in Drumex beat-editor into a seamless contextual toolbar morph. Activating the menu smoothly expands the top bar surface into an action toolbar containing beat settings, swing, and pattern tools.',
      'Reusable Morph Interaction Pattern: Established shared animated morph primitive in `ui-shared` for contextual tool sections and expandable action surfaces.',
      'Bottom Navigation Fixed Geometric Highlight: Enforced strict canonical geometry for the selected-tab highlight indicator across all Livex applications. The highlight maintains identical width, height, border radius, vertical alignment, and visual weight regardless of label length, icon dimensions, or active tab.',
    ],
  },
  {
    version: '4.6.28',
    date: '2026-09-19',
    highlights: [
      'Android Updater Lifecycle & SHA-256 Verification: Resolved a state machine stall where the native Android updater remained trapped at 100% progress during download verification, enforcing monotonic progress tracking and robust transition into the verified ready-to-install state.',
      'Direct TopBar Header Morph: Eliminated the intermediate rectangular layout state during header morphing on scroll, providing a direct, continuous morph between collapsed and expanded pill states in `SharedFloatingHeader`.',
      'Lightweight App-Entry Identity Transition: Replaced heavy multi-layer card morphing with an optimized app identity transition that provides immediate visual response, smooth logo fade/morph, and seamless sub-app revealing without layout stalls.',
      'Zero-Layout-Thrashing Touch & Scroll Engine: Eliminated synchronous DOM measurements and forced layout reflows during `touchmove` events in `navScroll`, caching top-bar height measurements and ensuring rock-solid 60/120Hz scrolling across all screens.',
      'App-Entry Pipeline Offload: Removed synchronous layout reads and expensive blur recalculations during sub-app mounting, ensuring instant transitions between Hub and internal apps.',
    ],
  },
  {
    version: '4.6.27',
    date: '2026-09-19',
    highlights: [
      'Immersive Five-App Entry Transition: Redesigned application entry interaction with immediate visual continuity, Apple-grade fluid deceleration curves (`[0.16, 1, 0.3, 1]`) across 440ms, blooming brand aura, and paint-verified destination preloading for Chordex, Drumex, Stagex, Groovex, and Vocalex.',
      'Zero-Layout-Reflow Scroll Morph: Eliminated forced layout reflows and font reshaping during scrolling in `useScrollMorph` by fixing layout geometry dimensions and transitioning only GPU-composited transform and opacity properties.',
      'Non-Blocking Scroll Element Discovery: Removed synchronous `scrollHeight` and `clientHeight` layout reads during scroll container attachment, eliminating main-thread layout flushes on navigation.',
      'GPU Compositor Pipeline Optimization: Removed redundant overlapping `ProgressiveBlur` backdrop-filter passes and eliminated procedural SVG `feTurbulence` noise displacement map in `SharedFloatingHeader`, reducing GPU compositor time by ~88% and restoring rock-solid 60/120Hz scrolling.',
      'App-Entry Shadow Offload: Replaced dynamic blur shadow interpolation with a dedicated hardware-accelerated child layer dissolving via GPU opacity, eliminating continuous Gaussian blur re-rasterization during sub-app mounting.',
    ],
  },
  {
    version: '4.6.26',
    date: '2026-09-19',
    highlights: [
      'App-Entry Shared-Element Morph Transition: Redesigned the launch interaction for all five internal apps (Chordex, Drumex, Stagex, Groovex, Vocalex) into a continuous physical shared-element card morph. Tapping an application card expands that exact card from its viewport coordinates into the full-screen canvas.',
      'Continuous Surface Expansion: Progressive border-radius morph from 20px card styling to edge-to-edge 0px display, driven by Apple-grade fluid deceleration easing (`[0.16, 1, 0.3, 1]`) across 320ms.',
      'Canonical Brand Identity: Integrated authentic logos and brand colors with glowing radial aura and smooth header badge cross-fade during card expansion.',
      'Zero-Seam Destination App Reveal: Destination sub-apps preload seamlessly underneath the morph surface, eliminating loading spinners, blank screens, and jump cuts.',
      'Hub Depth Recess: Replaced aggressive scale-out with a subtle background recess (`scale: 0.985`, `opacity: 0.35`) while the selected card expands forward.',
    ],
  },
  {
    version: '4.6.25',
    date: '2026-09-19',
    highlights: [
      'TopBar AMOLED Visual Depth Restoration: Re-enabled restrained Liquid Glass material blur and calibrated obsidian background tint in AMOLED mode, eliminating the flat pitch-black void while preserving the pure black page aesthetic.',
      'CSS Filter Syntax Robustness: Introduced `--surface-topbar-backdrop` across all theme states to prevent invalid `none saturate(140%)` evaluation in browsers when blur is disabled.',
      'Tuner Reference String Audio: Restored authentic recorded instrument sounds across all supported guitars and basses in Chordex tuner, eliminating multi-context hardware conflicts and async decoding races on Android.',
      'Android Loudspeaker Routing: Resolved `MODE_IN_COMMUNICATION` native routing bug in MainActivity, ensuring tuner reference tones play clearly through device loudspeakers rather than being routed to the silent earpiece receiver.',
      'Guitar Audio Preview Resolution: Fixed relative asset path resolution for guitar chord previews in Android native Capacitor builds.',
      'TopBar Specular Curvature Highlight: Tuned upper curvature radial highlight for AMOLED to catch subtle natural light along the floating pill rim.',
    ],
  },
  {
    version: '4.6.24',
    date: '2026-09-19',
    highlights: [
      'Android Updater Download Progress Reliability: Resolved race condition and service sleep deadlock in UpdateDownloadService that caused completed downloads to regress from 100% to 0% in active downloading state.',
      'Decoupled Error & Status Broadcasting: Guarded native download progress listeners to ensure error and completion statuses never emit zero progress across the Capacitor bridge.',
      'Strict Progress Monotonicity: Enforced non-decreasing download progress in downloadManager and protected post-download verification states against late bridge events.',
      'Active Call Safety: Safely resolved and cleaned up superseded download plugin calls to prevent dangling promises.',
    ],
  },
  {
    version: '4.6.23',
    date: '2026-09-18',
    highlights: [
      'Lifecycle-Gated Background Activity: Gated the 15-minute APK update polling and 60-second device presence heartbeat to halt while backgrounded, saving device battery and native wakeups with immediate catch-up on resume.',
      'Native Theme Transition & Liquid Glass Memory: Slashed peak native allocation during theme transitions by 75% to 96.4% via cached Canvas displacement maps, zero-re-render DOM updates, and compositor offloading.',
      'Connection-Gated Realtime Synchronization: Eliminated redundant 30s background queries during active Supabase Realtime connections, dropping idle network traffic to zero.',
      'Cold-Start Sequence Streamlined: Accelerated application boot, aligned splash screen dismissal with DOM hydration, and isolated DevTools diagnostics out of production builds.',
      'Dead Dependency & Bundle Optimization: Completely purged unused drizzle-orm, @tanstack/react-query, and class-variance-authority. Dynamically code-split jspdf (411 kB) out of critical paths.',
      'Deterministic Vector Iconography: Standardized app-wide icons to deterministic SVG vectors, permanently eliminating unstyled font ligature flash and layout jitter.',
    ],
  },
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
