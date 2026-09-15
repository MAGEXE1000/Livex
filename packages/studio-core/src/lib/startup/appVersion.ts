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

export const NATIVE_VERSION = '4.6.9';
export const NATIVE_VERSION_CODE = 40609;
export const WEB_VERSION = '4.6.9';
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
export const APP_COMMIT_SHA = '6b9d4ccb';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/15/2026, 11:39:17 AM CST';

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
      'Drum Tuner in Drumex: Acoustic drum tuning tool calibrated for 5 drum kit parts (Tarola 14", Tom 1 10", Tom 2 12", Piso 16", Bombo 22") with Sweet-Spot fundamental tracking (Tarola at 242 Hz / B3).',
      'Tension Presets: Tight (Alta tensión), Normal (Estándar), and Loose (Baja tensión) calibrated frequency presets.',
      'Photographic Visuals: Realistic photographic drum imagery for each kit part with smooth animated transitions.',
      'High-Precision Chromatic Needle Meter: GPU-composited 60/120 FPS needle, -5 to +5 cent deviation scale, and status indicators.',
      'Acoustic Reference Tone & Self-Playback Rejection: Audible reference tone generator with built-in microphone self-playback suppression to eliminate speaker feedback.',
      'Drum Tuning Guidance: Interactive star/cross lug pattern tightening tips and step-by-step guidance.',
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
    version: '4.6.9',
    date: '2026-09-15',
    highlights: [
      'Drum Tuner in Drumex: Acoustic drum tuning tool calibrated for 5 drum kit parts (Tarola 14", Tom 1 10", Tom 2 12", Piso 16", Bombo 22") with Sweet-Spot fundamental tracking (Tarola at 242 Hz / B3).',
      'Tension Presets: Tight (Alta tensión), Normal (Estándar), and Loose (Baja tensión) calibrated frequency presets.',
      'Photographic Visuals: Realistic photographic drum imagery for each kit part with smooth animated transitions.',
      'High-Precision Chromatic Needle Meter: GPU-composited 60/120 FPS needle, -5 to +5 cent deviation scale, and status indicators.',
      'Acoustic Reference Tone & Self-Playback Rejection: Audible reference tone generator with built-in microphone self-playback suppression to eliminate speaker feedback.',
      'Drum Tuning Guidance: Interactive star/cross lug pattern tightening tips and step-by-step guidance.',
    ],
  },
  {
    version: '4.6.8',
    date: '2026-09-14',
    highlights: [
      'Background Power & Resource Efficiency: Permanently eliminated deprecated native background OTA polling worker, reducing idle battery and network consumption across all Android devices while stripping redundant WorkManager and Guava dependencies from the APK.',
      'Production Security Surface Hardening: Gated internal state dispatcher bindings and test diagnostic APIs on development and authenticated debug flags.',
      'Audio Asset Parsing Latency: Code-split metronome count-in voice sample table into on-demand dynamic chunks, reducing main-thread parse time on startup.',
      'Shell Reactivity & Theme Propagation: Fixed non-reactive setting access pattern in SharedAppShell, ensuring AMOLED mode and theme transitions re-render immediately.',
      'Navigation Store Debug Cleanup: Removed dormant debug reads and vestigial handlers across core navigation state stores.',
    ],
  },
  {
    version: '4.6.7',
    date: '2026-09-14',
    highlights: [
      'Android Runtime Performance & Call-State Optimization: Optimized runtime responsiveness under constrained device conditions, active phone/VoIP calls, and high memory pressure. Migrated the Tuner Morph animation and shared modal morph system to 100% compositor-accelerated transforms (`transform`, `opacity`, `will-change`), eliminating main-thread layout thrashing and reducing Total Blocking Time (TBT) by more than 55%.',
      'Vocalex Section Hierarchy & Layout Alignment: Streamlined Vocalex interface by removing redundant section headers and descriptions in Vocal Monitor and Exercises already provided by top navigation. Aligned Preferences layout, control cards, and typography with canonical Livex design standards.',
      'Drumex Beats Header & Action Controls Alignment: Refined Drumex beats header spacing, typography, and action controls alignment to match canonical Livex UI while maintaining ergonomic touch targets.',
      'Groovex Android Foreground Service Lifecycle: Resolved fatal `ForegroundServiceStartNotAllowedException` on Android 14+ (API 34+) when exiting an active song by enforcing safe lifecycle teardown and background transition guards.',
    ],
  },
  {
    version: '4.6.6',
    date: '2026-09-14',
    highlights: [
      'Canonical Android Launcher Icon Architecture: Standardized launcher icon resources to follow modern Android standards comparable to Google Play distributed applications. Removed legacy duplicate `android:roundIcon` definitions and redundant round mipmap assets, eliminating OEM launcher caching fragmentation (e.g. Samsung One UI Home preserving stale icons across updates). Enforced a single canonical adaptive launcher icon entry point (`android:icon="@mipmap/ic_launcher"`) across API 26-35+.',
      'Launcher Icons Verification Invariants: Updated automated build gates and test suites to validate the unified 15-target asset architecture and prevent regressions in launcher icon declarations.',
    ],
  },
  {
    version: '4.6.5',
    date: '2026-09-14',
    highlights: [
      'Android Audio Routing & Media Volume Control: Resolved issue where opening the Tuner forced Android into call/communication audio mode (`STREAM_VOICE_CALL`). Configured `AudioManager.STREAM_MUSIC` as the window volume control stream, ensured normal audio mode via native bridge, and disabled Web Audio DSP constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`) for uncolored acoustic frequency analysis.',
      'Continuous Instrument Fretboard Layout: Extended the Stratocaster, Acoustic, and Bass fretboard graphic assets with mathematically spaced frets and wood grain, seamlessly filling the bottom viewport stage without empty black space beneath the neck.',
      'Instrument Graphic Vertical Composition: Anchored instrument graphics at the top edge (`object-top`) with a standardized width to maintain strict peg alignment with flanking circular note controls.',
    ],
  },
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
