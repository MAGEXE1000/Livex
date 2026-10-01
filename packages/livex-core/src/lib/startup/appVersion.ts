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

export const NATIVE_VERSION = '4.6.71';
export const NATIVE_VERSION_CODE = 40671;
export const WEB_VERSION = '4.6.71';
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
export const APP_VERSION_DATE = '9/30/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = 'bd63ea59';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/30/2026, 11:07:25 PM CST';

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
      "Live Band Stage Teleprompter Sync: Real-time dual-transport synchronization for band members to lock onto the band leader's Live session with sub-100ms cueing, play/pause synchronization, and drift compensation.",
      'Band & Team Collaboration Hub: Create bands with 6-character join codes, manage member rosters, and share song repertoires with automatic offline caching.',
      'Live Session Broadcast & Follow Capsules: Integrated live broadcast and synced follower capsules directly into the Live mode top header and Live Settings sheet.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'StageX Topbar Navigation Streamlining: Cleaned up redundant collaboration controls in favor of the canonical Band Hub access point on the Home screen.',
      'Independent Stage Display Synchronization: Ensured follower teleprompters preserve independent visual layouts (Lyrics only, Chords only, Both) while locking musical timing to the leader.',
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
    version: '4.6.70',
    date: '2026-09-30',
    highlights: [
      "Live Band Stage Teleprompter Sync: Real-time dual-transport synchronization for band members to lock onto the band leader's Live session with sub-100ms cueing, play/pause synchronization, and drift compensation.",
      'Band & Team Collaboration Hub: Create bands with 6-character join codes, manage member rosters, and share song repertoires with automatic offline caching.',
      'Live Session Broadcast & Follow Capsules: Integrated live broadcast and synced follower capsules directly into the Live mode top header and Live Settings sheet.',
      'StageX Topbar Navigation Streamlining: Cleaned up redundant collaboration controls in favor of the canonical Band Hub access point on the Home screen.',
      'Independent Stage Display Synchronization: Ensured follower teleprompters preserve independent visual layouts (Lyrics only, Chords only, Both) while locking musical timing to the leader.',
    ],
  },
  {
    version: '4.6.69',
    date: '2026-09-30',
    highlights: [
      'Always-Editable Lyrics and Both Workspaces: Enabled immediate, direct text editing and deletion across Lyrics and Both workspaces upon tap without requiring prior unlock actions.',
      'Dynamic Chord Offset Shifting Engine: Implemented `shiftChordOffsets` to cleanly and automatically preserve above-word anchored chords when writing, backspacing, or inserting words in Both mode.',
      'Configurable Bars-per-Line Pacing Controls: Added fine-grained measures-per-line pacing settings (1–4 bars / 4–16 beats) in Song Live Settings for metronomic teleprompter alignment.',
      'Seamless Scroll-Aware Live Topbar: Auto-hides top navigation during active teleprompter playback and downward scrolling, restoring instantly on pause or upward scroll.',
      'Enhanced Active Lyric Highlight Contrast: Optimized high-contrast white lyric highlighting and border accents across Dark and AMOLED themes.',
      'Clean Live Lyrics Floating Toolbar: Streamlined secondary capsule toolbar and eliminated redundant view mode settings.',
    ],
  },
  {
    version: '4.6.68',
    date: '2026-09-30',
    highlights: [
      'Above-Word Inline Chord Badges in Both Mode: Replaced the vertical stacked chord list with compact inline chord chips anchored directly above specific lyrics/words with character-offset synchronization.',
      'Canonical Fretboard Diagram Preview in Song Editor: Tapping any inline chord tag displays the full-fidelity DetailFretboardDiagram showing guitar fingerings, muted strings, and note positions.',
      'Clean View Mode & Floating Edit Button: In view mode, the bottom toolbar is hidden and a single floating Pencil FAB is rendered in the bottom right, with lyrics protected against accidental touch/keyboard editing.',
      'Reorganized Both-Mode Edit Toolbar: Placed Undo and Redo on the left, a neutral standard Chord tool in the center, Text Styling/Color tool and clean More menu on the right-center, and anchored the primary Done action all the way to the far right.',
      'Cleaned More Action Menu: Removed redundant "Enter edit mode" and "Add lyric line" items, retaining "+ Add Section" (with layers icon), "+ Add Timed Interlude", and essential song actions.',
      'Unobscured Viewport Docking: Removed intrusive mode toggle toasts and anchored the bottom dock persistently as a mobile floating navbar.',
    ],
  },
  {
    version: '4.6.67',
    date: '2026-09-30',
    highlights: [
      'Modern PDF Export Screen: Streamlined PDF export interface with instant header action, unobscured bottom drawer with paper format (A4, Letter), orientation (Portrait, Landscape), and theme toggles.',
      'Enhanced Song Library Experience: Modernized song cards with single-line metadata badges, custom song cover picker and local persistence, and clean full song export.',
      'First-Class Timed Interludes in Song Editor: Added support for inserting timed interlude/solo segments anywhere in song lyrics with custom explicit duration and live teleprompter countdown.',
      'Global Floating Navbar Suppression during PDF Export: Completely suppressed application bottom navigation bar during PDF preview, restoring smoothly upon closing.',
      'Clean PDF Document Template: Removed lyrics and vocal roles section from the chord chart PDF export layout, providing centered, well-proportioned diagrams.',
      'Restored Canonical BPM Engine: Reinstated metronomic BPM progression capped at 400 BPM while completely decoupling BPM adjustments from song duration mutations.',
    ],
  },
  {
    version: '4.6.66',
    date: '2026-09-30',
    highlights: [
      'Butter-Smooth Sliding Letter Lyric Highlight: Implemented GPU compositor text-clip gradient wipe (`@keyframes lyric-word-wipe`) that fluidly glides across letters in lockstep with the precision timeline clock with 0 lag and 120fps hardware acceleration.',
      'Luminous Accent Bloom on Sung Words: Enhanced active lyrics in both Teleprompter and Both (Hybrid) modes with glowing leading edges and subtle drop-shadow depth.',
      'Super-Optimized Live Mode Performance: Streamlined chord and lyric state synchronization in LiveModeUI, eliminating redundant recalculations and layout shifts during auto-play and manual word seek.',
    ],
  },
  {
    version: '4.6.65',
    date: '2026-09-29',
    highlights: [
      'Next Chord Modern Diagram in Live Mode: Displayed the canonical DetailFretboardDiagram for the upcoming chord in Chords Live mode (ChordsLiveView) with high-fidelity fretboard markers and interactive advance tap target.',
      'Teleprompter Speed & Precise Duration Controls: Added real-time Speed slider (0.5x–2.0x) and MM:SS duration modal with automatic pacing computation and countdown timers.',
      'First-Class Timed Silence & Interlude Events: Added support for dedicated interlude lines (e.g. solos or spoken segments) with independent explicit duration in seconds, unaffected by song BPM.',
      'Floating Viewport Bottom Toolbar in Both Mode: Portaled the Both-mode editing toolbar to document.body, floating persistently at the viewport bottom as a mobile navbar with safe-area insets while reserving full scroll padding for the final lyric lines.',
    ],
  },
  {
    version: '4.6.64',
    date: '2026-09-28',
    highlights: [
      'Colored Lyrics in Live Modes: Preserved inline text span colors, line formatting colors, and vocal role colors across both Lyrics Live mode (LyricsLiveView) and Both Live mode (HybridLiveView), enabling performers to visually differentiate vocal parts and performers in real-time with drop-shadow bloom on active words.',
      'Floating Viewport Bottom Toolbar in Both Mode: Re-architected HybridLiveView layout with dedicated scroll isolation, ensuring the transport and HUD controls remain persistently anchored at the viewport bottom above the safe area, matching bottom navbar behavior across all scrolling states.',
      'Clean Line Editing in Song Lyrics Editor: Polished inline lyric editing by removing word selection highlight rectangles, eliminating the explicit Done button, adding clean baseline indicators, and auto-committing edits on blur or clicking away.',
      'Unified Live Display Mode Guard: Fixed mode-synchronization in useLiveModeState to prevent initialMode from overriding manual user mode switches in the Live Settings sheet.',
    ],
  },
  {
    version: '4.6.63',
    date: '2026-09-28',
    highlights: [
      'Canonical Library Fretboard in Both Live Mode: Integrated the full-fidelity DetailFretboardDiagram directly from the Chordex Library into Both Live mode, featuring realistic vector strings, fret wires, base fret indicators, nut bar, barre pills, and finger dots with note labels.',
      'Large Stage-Ready Chord Diagram: Generously sized the live chord diagram (max-w-[360px], 312px × 304px SVG surface) for maximum stage and music stand visibility.',
      'Centered Stage Presentation: Centered the live chord card and synchronized teleprompter with auto margins, eliminating crowding against the top header and establishing balanced vertical alignment.',
      'Harmonized Vertical Layout: Unified vertical rhythm and eliminated dead gaps across Chords, Lyrics, Both, and Live modes.',
    ],
  },
  {
    version: '4.6.62',
    date: '2026-09-28',
    highlights: [
      'Precise Word-Level Chord Placement: Integrated semantic lyric segmentation allowing chords to be targeted, inserted, repositioned, or replaced directly at word-level positions anywhere within lyric lines rather than restricted to line starts.',
      'Word Repositioning Actions: Direct navigation controls ("← Prev Word", "Next Word →") within the chord adjustment modal to shift chords across lyrics with instant visual preview.',
      'Ergonomic Floating Bottom Toolbar: Redesigned Song Both view to a compact, non-intrusive floating transport capsule docked at the exact baseline height matching Drumex beats, eliminating overlapping and vertical clutter.',
      'Full-Height Screen Teleprompter Canvas: Reclaimed vertical canvas space by eliminating redundant stacking bottom padding, allowing lyrics to occupy the entire viewport height down to the bottom.',
      'View Mode Transitions: Unified mode selector transitions across Chords, Lyrics, and Both modes with smooth directional spring animations.',
    ],
  },
  {
    version: '4.6.61',
    date: '2026-09-27',
    highlights: [
      'Synchronize Lyrics Live Timing to Song BPM: Replaced arbitrary speed multipliers and static fallbacks with exact mathematical timing derivations (`beatDurationMs = 60000 / BPM / playbackSpeed`, `lineDurationMs = beatDurationMs * beatsPerLine`, `wordDurationMs = lineDurationMs / wordCount`).',
      'Drift-Compensated Auto-Play Scheduling: Implemented three dedicated drift-compensated clocks (musical beat clock, chords auto-play clock, and teleprompter lyrics clock) to eliminate cumulative JavaScript event-loop timer drift.',
      'Fine-Grained 1-BPM Increment Controls: Converted all BPM controls across Live Mode HUD, Live Settings modal, and elastic sliders from coarse 5-step increments to fine-grained 1-BPM increments (+1/-1), with reactive persistence back to the song preset.',
      'Immediate Seek Recalibration: Added reactive seek tokens so tapping any word or line resets the auto-play timer immediately with zero latency.',
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
