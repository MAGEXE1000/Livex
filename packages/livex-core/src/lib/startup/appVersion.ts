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

export const NATIVE_VERSION = '4.6.62';
export const NATIVE_VERSION_CODE = 40662;
export const WEB_VERSION = '4.6.62';
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
export const APP_VERSION_DATE = '9/28/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = 'f47e9ea8';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/28/2026, 12:00:00 AM CST';

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
      'Precise Word-Level Chord Placement: Integrated semantic lyric segmentation allowing chords to be targeted, inserted, repositioned, or replaced directly at word-level positions anywhere within lyric lines rather than restricted to line starts.',
      'Word Repositioning Actions: Direct navigation controls ("← Prev Word", "Next Word →") within the chord adjustment modal to shift chords across lyrics with instant visual preview.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Ergonomic Floating Bottom Toolbar: Redesigned Song Both view to a compact, non-intrusive floating transport capsule docked at the exact baseline height matching Drumex beats, eliminating overlapping and vertical clutter.',
      'Full-Height Screen Teleprompter Canvas: Reclaimed vertical canvas space by eliminating redundant stacking bottom padding, allowing lyrics to occupy the entire viewport height down to the bottom.',
      'View Mode Transitions: Unified mode selector transitions across Chords, Lyrics, and Both modes with smooth directional spring animations.',
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
  {
    version: '4.6.60',
    date: '2026-09-27',
    highlights: [
      'Hub Profile Back-Navigation Canonical Restoration: Resolved the navigation regression where entering Profile from the Hub broke Android hardware back and predictive swipe-back gesture unwinding.',
      'De-coupled Sheet and Domain Priority: Removed artificial root-level back interception in AccountCard, ensuring active sheets (Avatar Picker, Account Details, Danger Zone) cleanly close without altering route history, while Profile root delegates to canonical BackDispatcher pop.',
      'Elimination of Forward Push on Back: Corrected goBack in HubSettings and pageProps to cleanly pop the navigation history stack rather than pushing duplicate Home routes, eliminating navigation ping-pong loops and preserving cross-app domain containment.',
    ],
  },
  {
    version: '4.6.59',
    date: '2026-09-27',
    highlights: [
      'Android Back Navigation Containment (Option A1): Enforced strict intra-app domain containment across all sub-apps (Chordex, Drumex, StageX, Groovex, Vocalex) on system back gesture and edge swipe.',
      'Chordex Filter & Search Back Interception: Back gesture now clears active search queries in SongsPanel and resets chord/category filters in LibraryPanel before unwinding, preventing premature fallthrough to Hub.',
      'Sub-App Coordinator Back Handlers: Integrated coordinator panel handlers in StageCorePanel, DrumEditor, GroovexApp, and VocalexApp to cleanly unwind sub-views to root without crossing app boundaries.',
      'Hub Shell & Settings Navigation: Maintained Settings root navigation popping to Hub Home tab, allowing native application backgrounding only from the Hub Home tab.',
    ],
  },
  {
    version: '4.6.58',
    date: '2026-09-27',
    highlights: [
      'Distraction-Free Continuous Lyric Composer: Integrated SongLyricsComposer with continuous free-writing canvas, natural line break behavior, optional floating section shortcuts, and real-time word and line count telemetry without musical metadata clutter.',
      'Dedicated Song Live Preparation View: Introduced SongLivePreparationView with teleprompter typography formatting (A- / A+ font size, line spacing adjustments), view mode toggle (lyrics only vs chords + lyrics), and section vocal role configuration.',
      'Global Bottom Navigation Persistence & Recovery: Robust lifecycle management and self-healing state machine ensuring the canonical bottom navigation bar is reliably preserved and recovered across all route transitions, tab switches, and internal app navigation.',
      'LiveMode Teleprompter Section Guarding: Prevented empty pill badge artifacts from rendering on continuous songs with unnamed sections.',
      'Continuous Lyrics Document Round-Trip: Built robust continuous text conversion with blank line buffering and section header suppression for unnamed sections, ensuring 100% roundtrip data fidelity.',
    ],
  },
  {
    version: '4.6.57',
    date: '2026-09-27',
    highlights: [
      'Redesigned Stitch Live Experience: Full production integration of 3 specialized live presentation interfaces across Chordex: Mode 1 (Chords Live with ambient glows and audio synthesis), Mode 2 (Lyrics Live with Quick Actions HUD, auto-scroll speed controls, and karaoke word sync), and Mode 3 (Hybrid Lyrics + Chords with Hero Stage Chord card, timing pulse BAR/BEAT counter, and Apple Music lyric bloom).',
      'Canonical Live Header Integration: SharedFloatingHeader adopted as the universal 58px glass capsule header with live pulsing status indicator, dynamic section/BPM subtitles, and hardware back button priority.',
      'Android Back Navigation Containment: Fixed sub-app back navigation containment across all internal apps, resolved bottom nav disappearance upon rotation, and refined landscape toolbar alignment.',
    ],
  },
  {
    version: '4.6.56',
    date: '2026-09-27',
    highlights: [
      'Chordex Custom Vocal Roles & Action Dock: Support for custom vocal roles and badge cues (lead, harmony, backing) directly within the lyrics editor, paired with an ergonomic bottom action dock for formatting, chord insertion, and playback markers.',
      'Unified Android Back Navigation: Consolidated hardware back button and predictive swipe-back gesture handling through priority-ranked back stack dispatch with a 280ms debounce window to eliminate accidental double-pop route skipping.',
      'Bottom Navigation State Synchronization: Calibrated active tab state synchronization with canonical router history, ensuring accurate section highlighting, self-healing overlay registry state, and deterministic icon entrance motion without re-render loops.',
    ],
  },
  {
    version: '4.6.55',
    date: '2026-09-26',
    highlights: [
      'Content-Aware Chordex Live: High-performance musician presentation mode that automatically adapts between chords-only, chords-with-lyrics, and lyrics-only layouts with dynamic chord diagram drawers, pitch transposition, and variable-speed teleprompter scrolling.',
      'Structured Optional Lyrics Workspace: Native lyric writer and teleprompter editor with inline chord markers, vocal role tagging (lead/harmony/backing), and tempo sync without disrupting standard chord progression workflows.',
      'Stagex Setlist Presets & Custom Ordering: Direct drag-and-drop song reordering, setlist templates, and persistent production stage plan element name preferences.',
      'Cross-App Assistant Orchestration: Intelligent context sharing and direct action execution across Hub, Chordex, Drumex, and Stagex.',
      'Repository Architecture & Monolith Deconstruction: Extracted DrumEditor panels and drag hooks, SongsPanel, HubSettings pages, and AccountCard authentication sheets into clean modular components.',
      'Zero Circular Dependencies: Fully decoupled auth UI primitives and settings navigation rows, eliminating circular dependencies across the entire repository.',
    ],
  },
  {
    version: '4.6.54',
    date: '2026-09-26',
    highlights: [
      'Navigation Latency Calibration: Replaced artificial 300ms setTimeout measurement in NavigationDispatcher with frame-accurate nested requestAnimationFrame, capturing real frame paint completion (18ms average latency). Synchronized transition lock duration with canonical 200ms motion specs.',
      'Hub Settings Monolith Pruning: Eradicated 1,265 lines of dead legacy developer panel code and unused state in HubSettings, eliminating closure allocation overhead and reducing synchronous JS parse latency.',
      'Component Lifecycle Stabilization: Extracted UpdaterSettingsContent to module scope as an independent React component, eliminating function component identity recreation, rule-of-hooks violations, and catastrophic DOM unmount/remount thrashing on settings renders.',
      'Developer Panel Lifecycle & Background Polling Teardown: Conditionally unmount DevToolsDashboard when navigating away from developer settings, terminating 5,000ms background polling timers and profiler subscriptions.',
      'Dual-Instance Hub Settings Elimination: Guarded LivexHub settings and profile tabs to prevent maintaining duplicate concurrent 5,000-line HubSettings component trees in memory.',
      'Comprehensive Performance Report Generation: Upgraded DevTools Performance "Copy" button to dynamically synthesize a comprehensive, 11-section diagnostic report directly from the live singleton PerformanceProfiler.',
    ],
  },
  {
    version: '4.6.53',
    date: '2026-09-26',
    highlights: [
      'Stagex Controls Interactivity: Resolved a stacking-context collision where an invisible `SharedNavigationContainer` overlay pane at `z-index: 2` blocked all touch/click pointer events to the stage canvas at `z-index: 1`. Elevated Stage canvas viewport to `z-index: 10`, disabled pointer events on empty sub-navigation containers, and eliminated ghost panes for views returning null.',
      'Restored All Stage Controls: Restored complete interactivity to all 11 Stage controls (Stage "+", eye/visibility mode, PDF export, scene "+" and scene switcher in `#sc-scenes-bar`, layers popup, ruler/measure, cloud collaboration, undo/redo history drawer, focus/reset view, clear stage trash, and portrait/landscape rotation).',
      'Performance Diagnostics Layout: Fixed character-by-character vertical text splitting on narrow mobile Android screens by restructuring the Top Banner Row to a vertical flex column and replacing aggressive `wordBreak: break-word` with `overflowWrap: break-word, wordBreak: normal`.',
      'Compact Diagnostics Presentation: Rebalanced 6 core telemetry cards into an ergonomic 2-column mobile grid, compacted actionable performance warning badges, and implemented single-line ellipsis truncation on long tasks, routes, and component profiler metrics.',
      'Hub Navigation Performance: Eliminated 220ms synchronous navigation transition blocking task by removing eager sub-page pre-mounting in Hub Settings, and replaced layout projection reflows with GPU-accelerated CSS transforms on hub cards.',
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
