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

export const NATIVE_VERSION = '4.6.4';
export const NATIVE_VERSION_CODE = 40604;
export const WEB_VERSION = '4.6.4';
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
export const APP_COMMIT_SHA = 'fc5162ac';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/14/2026, 12:52:24 AM CST';

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
      'Circular Tuner Note Controls: Compact circular string indicator controls displaying target note, octave, and calibrated reference frequency with tactile response.',
      'Real-Time Download Speed & Size Telemetry: Live byte-level tracking displaying downloaded megabytes against total package size (`X MB / Y MB`) and transfer speed (`MB/s` or `KB/s`) during the update download phase.',
    ],
  },
  {
    heading: 'Improved',
    items: [
      'Instant Update Autodetection on App Launch: Differentiated app foreground and resume lifecycle events from background polling with a 15-second debounce, immediately discovering new releases when opening the app.',
      'Tuner Two-Column Spatial Hierarchy: Balanced string card columns flanking the photorealistic headstock graphic to maximize peg alignment and prevent touch target overlap.',
      'Smooth Tuning Selection Transitions: Fluid modal transition between quick tuning presets and grouped tuning library categories.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Startup Pipeline Cancellation Race: Resolved issue where concurrent app initialization steps incremented pipeline counters and aborted active update checks with `PipelineCancelledError`.',
      'Missing APK Download Progress Metrics: Restored `totalBytes` and `downloadedBytes` parameter propagation in `apkDownloader.ts` to populate global update state during downloads.',
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
    version: '4.6.4',
    date: '2026-09-14',
    highlights: [
      'Circular Tuner Note Controls: Compact circular string indicator controls displaying target note, octave, and calibrated reference frequency with tactile response.',
      'Real-Time Download Speed & Size Telemetry: Live byte-level tracking displaying downloaded megabytes against total package size (`X MB / Y MB`) and transfer speed (`MB/s` or `KB/s`) during the update download phase.',
      'Instant Update Autodetection on App Launch: Differentiated app foreground and resume lifecycle events from background polling with a 15-second debounce, immediately discovering new releases when opening the app.',
      'Tuner Two-Column Spatial Hierarchy: Balanced string card columns flanking the photorealistic headstock graphic to maximize peg alignment and prevent touch target overlap.',
      'Smooth Tuning Selection Transitions: Fluid modal transition between quick tuning presets and grouped tuning library categories.',
      'Startup Pipeline Cancellation Race: Resolved issue where concurrent app initialization steps incremented pipeline counters and aborted active update checks with `PipelineCancelledError`.',
    ],
  },
  {
    version: '4.6.3',
    date: '2026-09-14',
    highlights: [
      'Bottom-Flush Tuner Presentation: Re-architected the Android Tuner into a full-width bottom sheet extending flush to the bottom bezel (`bottom: 0`, `padding: 0`), anchored below the Library navigation header.',
      'Header-Integrated Instrument Selector: Restructured the Tuner header by replacing the standalone title with a compact segmented selector (`Electric`, `Acoustic`, `Bass`) on the upper-left and close button on the upper-right.',
      'Instrument Scale & Stage Density: Substantially enlarged Electric and Bass headstocks to fill stage height, eliminating unused vertical black space across all device aspect ratios.',
      'Ergonomic String Tap Targets: Expanded string buttons to wide, tactile pills (`w-[154-172px]`, `h-11/h-12`) with larger badges, high-contrast typography, and calibrated horizontal/vertical alignment to physical tuning pegs.',
      'Unified Secondary Controls: Standardized the tuning selector, A4 reference, and Auto mode toggle to a unified `h-11` height with neutral AMOLED dark surfaces (`#141518`), reserving accent blue strictly for active state toggles.',
      'Canonical Bass Labeling: Streamlined all user-facing instrument selectors and tuning menus to strictly "Bass", eliminating deprecated "Bass 4" naming.',
    ],
  },
  {
    version: '4.6.2',
    date: '2026-09-13',
    highlights: [
      'Tuner Audio Graph Isolation: Decoupled reference string audio playback into an independent Web Audio context, completely isolating speaker playback from the microphone capture pipeline.',
      'Self-Playback Rejection: Implemented active playback tracking and real-time rejection in the pitch analyser pipeline to prevent speaker acoustic bleed from registering as user instrument input.',
      'Instrument & Tuning Model Consolidation: Standardized the Tuner on three canonical instrument modes (Electric Guitar, Acoustic Guitar, Bass 4) and completely removed Bass 5 from user-facing surfaces.',
      'Dynamic Tuning-Bound Pitch Detection: Bound pitch detection metrics directly to the selected tuning, ensuring alternate tunings (Drop D, DADGAD, Open G, Half Step Down, etc.) accurately drive target notes, string highlights, and cents deviation.',
    ],
  },
  {
    version: '4.6.1',
    date: '2026-09-13',
    highlights: [
      'Physical Tuning Peg Alignment: Implemented a reusable geometry system aligning string controls with physical tuning pegs across Electric Guitar (6 left), Acoustic Guitar (3+3 symmetrical), Bass 4 (4 cloverleaf left), and Bass 5 (2 left, 3 right).',
      'Directional Spatial Cueing: Subtle directional chevrons (`›` and `‹`) pointing toward the physical pegs without artificial connecting lines.',
      'AMOLED True Black Purity: Eliminated blue/gray background surfaces behind the instrument stage in favor of pure `#000000` AMOLED black.',
      'Streamlined Controls Hierarchy: Structured the top control area with prominent "Tuner" title and close button, full-width segmented instrument selector, and compact secondary controls (`Tuning` trigger and unified `A4 | Auto` capsule).',
      'Simplified Tuning Selection Menu: Removed verbose parenthetical descriptions and redundant pills in favor of clean tuning names, monospace target note previews (`E  A  D  G  B  E`), and checkmarks.',
      'Responsive Headstock Scaling: Enlarged headstock visualization with proportional scaling across small and tall Android displays.',
    ],
  },
  {
    version: '4.6.0',
    date: '2026-09-13',
    highlights: [
      'Refined AMOLED Android Tuner UI: Rebalanced control hierarchy with instrument mode selection (Electric, Acoustic, Bass 4, Bass 5) prominent in the top bar, consolidated secondary tuning trigger and unified A4 reference / Auto detection toggle capsule.',
      'Symmetrical String Cards with Reference Audio: Restored inward-facing interactive speaker icons on string cards flanking the enlarged photorealistic headstock graphic, enabling instant authentic reference audio playback.',
      'Grouped-List Tuning Selection Modal: Overhauled the tuning selection screen into a sleek, typography-led grouped list with clear category headers, unified instrument tabs, and smooth 160ms slide-up/fade motion transitions.',
      'Polished Tuning Transition Animations: Integrated lightweight GPU-composited layout transitions on tuning selection, target note sequence updates, and string card frequency metrics without blocking pitch detection.',
      'Canonical Finder/Tuner Navigation Divider: Added a subtle low-contrast vertical divider and balanced equal-width segments to the canonical Chord Library navigation pill.',
    ],
  },
  {
    version: '4.5.99',
    date: '2026-09-13',
    highlights: [
      'Expanded Tuning Selection System: Integrated a dedicated full-featured tuning selection modal with grouped categories (Standard, Drop / Power, Open, Alternate) across Guitar (Electric and Acoustic), 4-String Bass, and 5-String Bass, complete with string pitch targets and active checkmark badges.',
      'Universal Web Audio Soundfont Resampling: Implemented intelligent nearest-anchor playback resampling across all 24+ alternate and drop tunings, dynamically pitch-shifting recorded string samples without audio artifacts or bundle bloat.',
      'Shared Segmented Finder and Tuner Navigation: Unified chord library and tuner navigation using a synchronized segmented pill control with smooth cross-transitions between Chord Finder and Chromatic Tuner.',
      'Autonomous Tuner Architecture & Preferences Streamlining: Permanently removed obsolete tuning preference options from Livex Settings and Chordex Preferences across Desktop and Mobile surfaces, keeping tuning state management strictly self-contained within the Chromatic Tuner engine.',
    ],
  },
  {
    version: '4.5.98',
    date: '2026-09-13',
    highlights: [
      'Native Reference Tuner Redesign: Completely redesigned the Android/Capacitor chromatic tuner interface to match the high-end dark reference specification, featuring segmented instrument mode selection (Electric, Acoustic, Bass 4, Bass 5), reference pitch calibration (A4 = 440 Hz), automatic pitch detection toggle, an 11-bar chromatic scale with center emerald hourglass aura, real-time cents deviation pill indicator, and symmetrical string target cards flanking photorealistic instrument headstocks.',
      'Audible Reference Pitch Tones: Integrated audible pure-tone Web Audio reference pitch generation directly on string target cards via interactive speaker buttons.',
      'Tuner Real-Time Rendering Performance: Isolated high-frequency cents needle and meter updates to GPU-composited direct DOM transforms (`needleRef`, `centsPillRef`, `centsTextRef`) to achieve flawless 60/120 FPS tracking without React reconciliation overhead on mobile WebViews.',
    ],
  },
  {
    version: '4.5.97',
    date: '2026-09-13',
    highlights: [
      'Professional Instrument Tuner: Added high-precision acoustic, bass, and electric chromatic tuning engine using normalized square difference pitch detection, harmonic overtone rejection, interactive instrument headstocks, and a canonical SVG tuning fork indicator.',
      'Drumex Floating Action Dock: Engineered a Liquid Glass floating action surface for one-tap beat creation and multi-format MIDI/JSON file import with safe-area bottom navigation clearances.',
      'Realistic Acoustic Guitar Sound Engine: Upgraded Chordex chord playback with multi-velocity studio-sampled PCM acoustic guitar buffers, physical wood body resonance filtering, and humanized strumming mechanics.',
      'Canonical Accordion Expansion: Aligned canonical `Accordion` primitive with Transitions.dev reference using zero-measurement CSS Grid (`0fr` &rarr; `1fr`) row interpolation, optical blur transitions, non-scaling-stroke chevron flip, WAI-ARIA APG keyboard navigation, and inert focus protection.',
      'Canonical Plus &rarr; Menu Morph: Aligned canonical `MorphMenu` / `PlusMenu` interaction with Transitions.dev reference using asymmetric spring/cubic curves, coordinate vectors, and native Android `BackDispatcher` integration.',
      'Simplified Chord Detail Surface: Streamlined Chordex chord detail inspect sheet, removing visual bloat, redundant cards, and nested filter layers to maintain 60/120 FPS sheet gestures on Android.',
    ],
  },
  {
    version: '4.5.96',
    date: '2026-09-13',
    highlights: [
      'Canonical Plus &rarr; Menu Morph Primitive (`MorphMenu` / `PlusMenu`): Introduced in-place spatial container morph transitioning from a 40px circle trigger to an expanded contextual menu card with asymmetric cubic-bezier curves, coordinated plus rotation/exit, content entrance, and full Android `BackDispatcher` and `activeOverlaysRegistry` integration.',
      'Canonical Accordion Expand Primitive (`Accordion`): Introduced high-performance compound accordion using CSS Grid `0fr` &rarr; `1fr` row interpolation, zero JavaScript height measurement loops, hardware-accelerated chevron flipping, and complete ARIA linking.',
      'Professional Chromatic Guitar Tuner in Chordex: Integrated high-precision Web Audio engine using hybrid YIN / Autocorrelation pitch detection with cent-deviation needle damping, note recognition, and frequency analysis.',
      'Chordex Setlist Canonical Morph Adoption: Converted Setlist desktop header action controls to the canonical `PlusMenu` morphing trigger, streamlining song creation and JSON import flows.',
      'Restored Drumex Preferences Scrolling: Enforced explicit flex bounding and touch-scrolling constraints on `DrumPrefsPanel` mobile and desktop surfaces, ensuring bottom settings cards and controls are fully scrollable and clear of the bottom navigation dock.',
      'Drumex Navigation & Pin Stack Repair: Simplified Drumex navigation routing and repaired the pin back stack, eliminating dead-end navigation loops on Android.',
    ],
  },
  {
    version: '4.5.95',
    date: '2026-09-12',
    highlights: [
      'Centered & Compact Shared Bottom Navigation: Corrected shared bottom navigation geometry across all Livex applications, eliminating the -33px cluster offset to ensure the navigation bar is strictly horizontally centered relative to the viewport across expanded, scrolling, and collapsed states.',
      'Drumex Compact Navigation Footprint: Restored compact slot width (60px) in Drumex, reducing container width from 304px to 256px for balanced visual parity with Hub and Chordex.',
      'Independent Selected Highlight Geometry: Decoupled tab highlight pill dimensions from the navbar container into an independent content-adaptive calculation that never inflates or shifts the navbar.',
      'Refined Guitar & Bass Chord Finder: Exclusively focused the Chordex Chord Finder on Guitar and Bass fretboard diagrams, removing Piano from the instrument selector, search queries, filter tabs, and detection state machine without touching global instrument preferences.',
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
