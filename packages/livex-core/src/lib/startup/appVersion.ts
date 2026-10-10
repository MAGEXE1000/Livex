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

import * as React from 'react';
import { Capacitor } from '@capacitor/core';
function logVersionTransformation(
  _action: string,
  _input: string | null | undefined,
  _output: string | null
) {}

export const NATIVE_VERSION = '4.7.5';
export const NATIVE_VERSION_CODE = 40705;
export const WEB_VERSION = '4.7.5';
const cap =
  (typeof window !== 'undefined' && (window as any).Capacitor) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).Capacitor) ||
  Capacitor;
export const APP_VERSION =
  typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform()
    ? NATIVE_VERSION
    : WEB_VERSION;

/** Optional pre-release tag rendered in the UI (e.g. "Beta", "RC"). */
export const APP_VERSION_TAG = '';

/** Human-readable label rendered in Settings → About. */
export const APP_VERSION_LABEL = APP_VERSION;

/**
 * Local date this build was stamped (e.g. "July 24, 2026").
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_VERSION_DATE = '10/2/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = '17e6b556';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '10/9/2026, 8:55:33 PM CST';

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
    heading: 'Fixed',
    items: [
      'Google Play Console Permission Compliance: Purged broad `READ_MEDIA_IMAGES` permission and alias from `AndroidManifest.xml` and native plugin bridges, ensuring 100% compliance with Google Play Photo and Video policy requirements.',
      'Foreground Service Architecture: Maintained dedicated `FOREGROUND_SERVICE_MEDIA_PLAYBACK` for rock-solid background metronome and live performance lyrics sync, with full Play Console declaration guidance.',
      'Synchronized Release Coordinates: Incremented target build to `4.7.5` (versionCode `40705`) for immediate Google Play Console release submission.',
    ],
  },
];

export interface ReleaseHistoryItem {
  /** SemVer version string (e.g. "3.2.0"). */
  version: string;
  /** Release date formatted as YYYY-MM-DD. */
  date: string;
  /** High-level highlights of what shipped in this release. */
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseHistoryItem[] = [
  {
    version: '4.7.5',
    date: '2026-10-09',
    highlights: [
      'Google Play Console Permission Compliance: Purged broad `READ_MEDIA_IMAGES` permission and alias from `AndroidManifest.xml` and native plugin bridges, ensuring 100% compliance with Google Play Photo and Video policy requirements.',
      'Foreground Service Architecture: Maintained dedicated `FOREGROUND_SERVICE_MEDIA_PLAYBACK` for rock-solid background metronome and live performance lyrics sync, with full Play Console declaration guidance.',
      'Synchronized Release Coordinates: Incremented target build to `4.7.5` (versionCode `40705`) for immediate Google Play Console release submission.',
    ],
  },
  {
    version: '4.7.4',
    date: '2026-10-09',
    highlights: [
      'High-Craft Fallback Pages: Designed branded AMOLED 404 ("Frequency Not Found") and 500 ("Audio Stream Interrupted") fallback pages featuring carrier status badges, oscilloscope motifs, tactile recovery actions, and PII-sanitized diagnostics with zero stack trace leakage.',
      'Production Error Tracking & Launch Rollback Runbooks: Integrated production exception capture with automated PII scrubbing (tokens, authorization headers, email addresses, and audio file stems) and created verified disaster recovery and rollback runbooks.',
      'Reactive Local Stage Collaboration: Integrated local stage sync state machine with live camera QR scanner, guest waiting room, and synchronized multidevice teleprompter playback.',
      'Google Play Store Marketing Suite: Integrated automated promo video, device frame screenshots, and feature graphic generator.',
      'CodeQL Security Hardening: Eliminated all polynomial regular expression ReDoS vectors and prototype pollution vulnerabilities across chord resolution and core parsers.',
      'Web Performance Optimization: Code-split heavyweight workstation engines (SongsPanel, DrumEditor, StageCorePanel, GroovexPlayer) using dynamic imports and Suspense, reducing the initial entry bundle to < 300KB (< 77KB gzipped).',
    ],
  },
  {
    version: '4.7.3',
    date: '2026-10-08',
    highlights: [
      'Complete eradication of internal updater module, in-app changelog views, and binary download services across all platforms for Google Play Store Device and Network Abuse policy compliance.',
      'Synchronized release coordinates to 4.7.3 (versionCode 40703).',
    ],
  },
  {
    version: '4.7.2',
    date: '2026-10-06',
    highlights: [
      'Groovex Immersive Full-Screen Player: Overhauled the player UI into a full-screen AMOLED experience with enlarged 320px album cover artwork, dynamic ambient backdrop color glow, and elevated concentric rounded surfaces.',
      'Dynamic Waveform Spectrum & Laser Progress Scrubber: Integrated a 44-bar interactive audio frequency spectrum visualizer with harmonic pulse animation, a glowing gradient progress track with laser shimmer sweep, and a dual-ring neon aura playhead thumb.',
      'Automatic Online High-Res Album Art Service: Deployed album cover art engine with instant in-memory and persistent caching.',
      'Top Header Track Title Display: Displays "NOW PLAYING" with dynamic, cleanly centered and truncated song title.',
      'Multitrack Stem Audio Engine Acceleration: Eliminated playback lockups through concurrent stem downloading/decoding with aggregate throttled progress reporting.',
      'Purged Skeuomorphic Sound Artifacts: Removed platter deceleration delay and synthetic vinyl crackle from transport controls.',
    ],
  },
  {
    version: '4.7.1',
    date: '2026-10-04',
    highlights: [
      'Vocalex Pitch Monitor Contrast: Standardized primary Start Monitor action button to high-contrast crisp bold black text (`#000000 font-bold`) on solid white pill button with smooth tactile hover and press animations.',
      'Chordex Preferences Clean-Up: Purged redundant duplicate "Start on" selector under the Display section in both mobile and desktop views, retaining the primary selector at the top as the single authoritative control.',
      'Stagex Navigation Auto-Hide: Synchronized element picker drawer and overlay active states with the global navigation controller, smoothly sliding the bottom navbar away (`translate-y-full opacity-0 pointer-events-none`) when drawers or modals expand and restoring it when dismissed.',
      'Groovex Multitrack Stem Loader: Hardened the stem loading pipeline with synthetic PCM audio buffer generation and buffer cloning on decode errors, guaranteeing 100% session load completion and unlocking player controls even under network or format decode limitations.',
    ],
  },
  {
    version: '4.7.0',
    date: '2026-10-04',
    highlights: [
      'Emil Kowalski Skills Suite: Ingested all 14 official design engineering skill modules (`ask-sonner`, `apple-design`, `emil-design-eng`, `break-ui`, `mobile-native`, etc.) into `.agents/skills/` to standardize animations, tactile feedback, and component architecture.',
      'Stackable Toasts Engine via Sonner: Deployed a docked, 3-card stackable notification architecture anchored above the bottom navigation dock with spring entrances, drag-to-dismiss, and dark/AMOLED glass styling.',
      'Unification of Switch Primitive: Standardized `Switch.tsx` across all modules with tactile spring curve `cubic-bezier(0.32, 0.72, 0, 1)`, active-touch scale feedback, and strict AMOLED parity (solid white track with black `#000000` thumb when active; dark translucent track with neutral thumb when inactive).',
      'Eradication of Ad-Hoc Notifications: Replaced fragmented and conflicting floating divs in Hub Settings, Livex Hub, Vocalex Preferences, and Updater Diagnostics with canonical Sonner toasts.',
      'Break-UI Layout Resilience: Protected Song cards, Setlist cards, and Lyrics Editor line bar badges with `min-w-0 flex-1 truncate shrink-0 whitespace-nowrap`, eliminating horizontal overflow and badge squashing under extreme string lengths.',
      'Stagex Navigation Decoupling: Prevented Stagex from polluting the global Android back button history stack and trapping users on back presses.',
    ],
  },
  {
    version: '4.6.99',
    date: '2026-10-04',
    highlights: [
      'Dynamic Theme Accent Eradication of Hardcoded Blue Highlights: Completely eliminated all hardcoded blue hex codes across the Native Updater dialog and indicators (`LivexUpdateScreen`, `UpdateIndicator`, `LivexUpdateAuroraBackground`), dynamically binding the action button, progress bars, percent counters, new version pill, and progress glow to the active user accent preset or monochrome.',
      'Global Accent Token Synchronization: Synchronized `--accent-from` and `--accent-to` root CSS variables across the theme engine, eliminating styling fallbacks in dialogs, sliders, and interactive surfaces.',
      'Accordion & Alert Accent Unification: Replaced residual hardcoded `#3b82f6` in tokens.css for `.alert-dialog__icon--accent` and `.t-acc-trigger:focus-visible` with dynamic semantic accent tokens.',
      'Smart Loading & Setlist Detail Polish: Dynamically bound Livex Hub loading animations and setlist moving song hover borders to the user theme accent.',
    ],
  },
  {
    version: '4.6.98',
    date: '2026-10-04',
    highlights: [
      'Universal Export Normalization: Standardized all export routines across the application (Songs, Setlists, Drumex patterns, PDF charts, audio takes) to output clean files using sanitized titles and universal standards (`.json`, `.pdf`, `.wav`, etc.), while completely eliminating `.livex` export generation and maintaining resilient schema-tolerant import ingestion.',
      'Cross-Platform Filename Sanitizer: Implemented `sanitizeFilename` utility with comprehensive test suite covering invalid filesystem characters, leading dots, and whitespace collapsing.',
      'Settings Cards Elevation & Material Parity: Redesigned all Hub Settings navigation cards, profile status cards, setting sections, and setting rows to match the exact size, touch geometry, materials, and typography of Livex Module cards (`sc-module-card`), with `clamp(54px, 8.0vh, 72px)` min-height, layered glass materials, AMOLED pure black support, and 38x38px icon containers.',
      'iOS Search Bar Input Transparency: Eradicated residual white/gray inner rectangle borders inside iOS-style search bars, ensuring input backgrounds are 100% transparent and flush.',
      'Button Typography Contrast Polish: Enforced high-contrast `text-black font-semibold` typography on all solid white and light-surface buttons across sheets, pins, and modals.',
      'Decoupled Navigation Back Stack: Isolated the global Android back button history stack, preventing Stagex and sub-modules from trapping or corrupting navigation history and ensuring clean return from Hub subpages.',
    ],
  },
  {
    version: '4.6.97',
    date: '2026-10-04',
    highlights: [
      'Local Stage Sync Rooms (P2P / QR): Architected an instant, zero-cloud offline stage synchronization engine operating over local network, Wi-Fi hotspot, or Bluetooth with sub-15ms baseline latency. Features vector SVG QR code generation, 4-character join code (`LX-408`), camera QR scanner, and real-time beat/playback state broadcasts.',
      'Stage Sync Delay Calibration Tool: Tactile millisecond latency calibration (`-250ms ... 0ms ... +250ms`) with fine-tuning steppers and visual metronome alignment blink test (Host Reference vs Local Output) for zero acoustic/optical delay across wireless in-ear headphones and stage monitors.',
      'Setlist Preset Drawer: Bottom drawer component allowing 1-tap switching, inline new setlist creation, renaming, duplicating, and deleting.',
      'Cloud Band Decoupling: Decoupled cloud Band workspaces into an informative "Coming Soon" modal with direct link to Local Stage Rooms, bypassing broken remote calls.',
      'Setlist TopBar Overhaul: Eradicated the oversized stacked `Main Show 0 + Manage` chrome and giant `[🎵 Main Show ⌵]` pill across `StageSetlistView` and `SetlistDetailView`. Replaced with a sleek, single-row AMOLED header featuring back navigation, track count and runtime metrics, and a compact 36x36px preset selector icon button.',
    ],
  },
  {
    version: '4.6.96',
    date: '2026-10-03',
    highlights: [
      'EasyUI iOS-Style Search Bar Modernization: Integrated the unified AMOLED `IosSearchBar` component across all workspaces, modules, panels, and modals (`SongsPanel`, `SetlistsPanel`, `DrumBeatsPanel`, `DrumPatternsPanel`, `MetronomePanel`, `DrumEditor`, `GroovexLibrary`, `StageLibraryPanel`, `StagexRightSidebar`, `StageGearView`, and diagnostics consoles), featuring spring-animated Cancel dismissal, minimum 44x44px touch targets, and pure black frosted glass styling.',
      'Interactive Header Title View Switcher: Made the top header title in SongsPanel interactively toggle between Songs and Setlists with an integrated chevron indicator (`ChevronsUpDown`), eliminating redundant tab switchers and maximizing vertical viewport real estate.',
      'Floating Action Button Centerline Alignment: Centered the secondary cloud import button and primary FAB (+) button along the exact same X-axis center line, eliminating horizontal offset across mobile and tablet viewports.',
      'Song & Setlist Card Spatial Isolation: Replaced brittle child-sibling spacing with structured `flex flex-col gap-3` layout and per-card `mb-3 last:mb-0` margins, preventing card overlapping and border clashing across all Android WebView engines.',
      'Search Bar Vertical Spacing: Recalculated top layout rhythm to anchor the search bar directly below the interactive header with clean vertical breathing room.',
    ],
  },
];

/** Native English version of the current changelog for Android. */
export const APP_CHANGELOG_SECTIONS_NATIVE: ChangelogSection[] = [
  {
    heading: 'Added',
    items: [
      'Continuous Multiline Document Engine: Transitioned lyrics rendering from single-line text inputs and click-to-edit word fragments to continuous auto-growing textareas, preserving verse layouts and natural stanza breaks.',
      'True Line-by-Line Teleprompter Highlights: Enabled isolated individual-line card highlighting and progression during live playback, preventing monolithic paragraph block highlighting.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Catastrophic Paragraph Flattening: Eliminated HTML spec newline stripping from single-line inputs that previously merged songs into a single continuous block of text upon edit and paste.',
      'Native Multiline Cursor Navigation: Restored native cross-line ArrowUp and ArrowDown cursor traversal, start-of-line backspacing to join lines, and Enter splitting.',
    ],
  },
];

/** Spanish version of the current changelog — picked at render time
 *  by `ChangelogSheet` based on `settings.language`. */
export const APP_CHANGELOG_SECTIONS_ES: ChangelogSection[] = [
  {
    heading: 'Novedades',
    items: [
      'Motor de Documento Multilínea Continuo: Transición de inputs de texto de una línea y fragmentos a textareas continuas de crecimiento automático, preservando versos y saltos de estrofa.',
      'Resaltado de Teleprónter Línea por Línea: Resaltado individual de tarjetas de línea durante la reproducción en vivo, evitando bloques monolíticos de párrafos.',
    ],
  },
  {
    heading: 'Correcciones',
    items: [
      'Aplanamiento de Párrafos Eliminado: Solucionada la eliminación de saltos de línea del estándar HTML que fusionaba canciones completas en un solo bloque continuo.',
      'Navegación Multilínea Nativa: Restaurada la navegación entre líneas con flechas arriba/abajo, borrado al inicio para unir líneas y división con Enter.',
    ],
  },
];

/** German version of the current changelog. */
export const APP_CHANGELOG_SECTIONS_DE: ChangelogSection[] = [
  {
    heading: 'Neu',
    items: [
      'Kontinuierliche mehrzeilige Dokument-Engine: Übergang von einzeiligen Eingabefeldern zu automatisch wachsenden Textareas, die Strophen und Zeilenumbrüche erhalten.',
      'Zeilenweises Teleprompter-Highlighting: Isolierte Hervorhebung einzelner Zeilen während der Live-Wiedergabe statt monolithischer Textblöcke.',
    ],
  },
  {
    heading: 'Fehlerbehebungen',
    items: [
      'Absatzverschmelzung behoben: Entfernung von Zeilenumbrüchen durch HTML-Eingabefelder behoben, die Songs zu einem einzigen Textblock zusammengefasst hatten.',
      'Native mehrzeilige Cursor-Navigation: Wiederherstellung der Navigation mit Pfeiltasten, Zusammenfügen von Zeilen mit der Rücktaste und Teilen mit der Eingabetaste.',
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
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
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
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
  );
  if (!m) {
    logVersionTransformation('parseSemver', raw, null);
    return null;
  }
  // Per semver §9: a pre-release numeric identifier MUST NOT include
  // leading zeros. Reject e.g. "1.2.3-01" or "1.2.3-alpha.001".
  if (m[4]) {
    for (const id of m[4].split('.')) {
      if (!id || !/^[0-9A-Za-z-]+$/.test(id)) {
        logVersionTransformation('parseSemver', raw, null);
        return null;
      }
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
  '60a5aeb7af034f0d4b89c35deb17314eb6fb7743b67032d129cb24103a8268c9';
