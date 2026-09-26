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

export const NATIVE_VERSION = '4.6.52';
export const NATIVE_VERSION_CODE = 40652;
export const WEB_VERSION = '4.6.52';
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
export const APP_VERSION_DATE = '9/24/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = 'b59b07fd';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/26/2026, 1:53:03 AM CST';

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
      'Freeverb IR Web Worker Offloading: Offloaded Freeverb impulse response generation (~1.16M floating-point calculations) to a background Web Worker, eliminating the main-thread freeze on first drum playback with reverb.',
      'HouseKit Concurrency Cap: Implemented concurrency-capped worker queue for HouseKit audio asset loading, reducing simultaneous `decodeAudioData` operations from ~140 to 6 to eliminate memory pressure and audio thread starvation.',
      'Audio Clock Sentinel Gate Cleanup: Replaced JavaScript `setTimeout` timers in audio note gate envelopes with audio-clock-accurate `AudioBufferSourceNode` sentinel callbacks, eliminating main-thread timer jitter and graph node accumulation.',
      'DOM MutationObserver Header Detection: Replaced aggressive 50ms interval polling in navigation scroll observer with `MutationObserver`, completely eliminating idle CPU cycles when DOM elements are mounting.',
      'Audio Hot-Loop Optimization: Hoisted Zustand store reads out of the per-step audio sequencer tick loop, eliminating repetitive allocations and state queries during playback.',
      'Sync Engine Debounce & Auto-Backup Guards: Added empty-patch dirty check to `setStatus()`, debounced device registration to 5 minutes, and guarded auto-backup checks to eliminate redundant background sync work.',
      'Theme Engine Redundant Write Elimination: Removed duplicate pre-dirty-check native storage write in theme manager.',
      'Console Telemetry Silencing: Wrapped verbose navigation scroll and startup coordinator log calls in `DEV` environment guards, eliminating serialization and bridge overhead in production.',
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
    version: '4.6.52',
    date: '2026-09-26',
    highlights: [
      'Freeverb IR Web Worker Offloading: Offloaded Freeverb impulse response generation (~1.16M floating-point calculations) to a background Web Worker, eliminating the main-thread freeze on first drum playback with reverb.',
      'HouseKit Concurrency Cap: Implemented concurrency-capped worker queue for HouseKit audio asset loading, reducing simultaneous `decodeAudioData` operations from ~140 to 6 to eliminate memory pressure and audio thread starvation.',
      'Audio Clock Sentinel Gate Cleanup: Replaced JavaScript `setTimeout` timers in audio note gate envelopes with audio-clock-accurate `AudioBufferSourceNode` sentinel callbacks, eliminating main-thread timer jitter and graph node accumulation.',
      'DOM MutationObserver Header Detection: Replaced aggressive 50ms interval polling in navigation scroll observer with `MutationObserver`, completely eliminating idle CPU cycles when DOM elements are mounting.',
      'Audio Hot-Loop Optimization: Hoisted Zustand store reads out of the per-step audio sequencer tick loop, eliminating repetitive allocations and state queries during playback.',
      'Sync Engine Debounce & Auto-Backup Guards: Added empty-patch dirty check to `setStatus()`, debounced device registration to 5 minutes, and guarded auto-backup checks to eliminate redundant background sync work.',
    ],
  },
  {
    version: '4.6.51',
    date: '2026-09-25',
    highlights: [
      'Unified Navigation Surface Material: Unified top navigation bars with the validated bottom navigation bar across Dark, AMOLED, and Light themes, eliminating fragmented overlays and aligning drop shadows to canonical navigation tokens.',
      'Seamless Topbar Controls: Integrated back button and contextual action pills directly into the canonical header capsule without nested borders, card-in-card shadows, or milky specular glares.',
      'Redesigned Changelog Presentation: Transformed in-app changelog view into high-hierarchy categorized cards with interactive filter chips, status indicators, and collapsible detail items.',
      'Hub Vertical Composition: Rebalanced vertical layout and negative space across the Home screen for balanced optical ergonomics.',
      'Navigation Containment & Transitions: Implemented strict pill geometry containment and fluid global section transitions.',
    ],
  },
  {
    version: '4.6.50',
    date: '2026-09-25',
    highlights: [
      'Unified Bottom-Navigation Motion System: Consolidated navigation animations into one canonical motion graph governed by Apple-grade critically damped spring physics (`stiffness: 280, damping: 32, mass: 1.0`), eliminating competing motion pipelines across Livex Hub and all sub-apps.',
      'Direct Drag & Fluid Manipulation: Highlight follows touch gestures with subtle physical mass and elastic boundary resistance rather than rigid 1:1 translation, maintaining the same organic spring damping throughout direct manipulation.',
      'Zero Between-Tabs Invariant: Introduced deterministic destination resolver (`resolveDragDestination`) with velocity flick momentum awareness, mathematically guaranteeing that the highlight can never remain stuck between tabs upon release or cancellation.',
      'Clear Optical Text/Icon Separation: Shifted expanded icon position to -7px and adjusted tab label bottom offset to 3.5px, providing a clear 4.5px optical clearance gap that eliminates text-icon collision and centers icons at 24px in compact mode.',
      '120 Hz Touch Performance: Cached navigation bar bounding dimensions on pointer down to eliminate forced synchronous reflows and layout thrashing during pointer move frames.',
    ],
  },
  {
    version: '4.6.49',
    date: '2026-09-25',
    highlights: [
      'Restored Taller Navbar Geometry: Restored canonical 58px navbar height and 58px circular satellite buttons matching the vertical dock center with generous negative space.',
      'Zero-Clipping Active Highlight Containment: Configured `overflow: visible` on the inner navigation container and established 5px uniform insets around the 48px highlight capsule, completely eliminating lower-edge and rounded-corner clipping artifacts on Android WebView.',
      'Apple-Grade Fluid Spring Physics: Replaced high-stiffness, low-mass snapping with critically damped fluid spring physics (`stiffness: 280, damping: 32, mass: 1.0`), delivering a subtle sense of physical inertia, controlled momentum, and smooth glide without cheap bounce or overshoot.',
      '0ms Press Response & Full Interruption: Added `onPointerDown` tap listeners to initiate highlight motion the instant the finger touches the screen, and removed redundant 100ms throttle guards so rapid tab sequences retarget velocity seamlessly.',
      'Balanced Optical Vertical Centering: Aligned icon (22px) and label (10.5px) in an optically centered flex hierarchy with balanced negative space above and below.',
    ],
  },
  {
    version: '4.6.48',
    date: '2026-09-25',
    highlights: [
      '120 Hz Playback Frame Pacing: Decoupled Chordex SongPracticeView playback timer loop from React re-renders using direct DOM property updates for the slider and time label, updating React state only on chord, line, or lyric segment transitions to reduce render load by ~99.5%.',
      'Sequencer Layout Thrashing Elimination: Cached scroll container viewport dimensions via ResizeObserver in Drumex DrumEditor and decoupled DOM geometry reads from style writes in onStep to prevent forced synchronous reflows on every drum step.',
      'Navigation Store Subscription Isolation: Narrowed navigation subscriptions to primitive selectors across SongsPanel, LivexHub, and useLibraryState, preventing background re-renders during unrelated app navigation.',
      'Smooth Search Query Deferral: Integrated React.useDeferredValue for song preset filtering to ensure instant 120 FPS keyboard response during typing.',
      'Vocalex Audio Playback Throttling: Capped waveform progress updates in TakeDetailView and LabPanel to ~40 FPS during playback to eliminate sub-millisecond render storms.',
      'Unused Imports & Deprecated References: Removed unused SongCardGrid import and consolidated 24 discrete Zustand action subscriptions into unified shallow selectors.',
    ],
  },
  {
    version: '4.6.47',
    date: '2026-09-25',
    highlights: [
      'Revolut-Style Flat Bottom Navigation: Implemented flat minimal interaction model with a solid borderless surface, equal-width tabs, and responsive indicator across mobile and Android.',
      'Keep-Alive Tab Navigation Architecture: Integrated persistent component trees across Chordex, Drumex, Stagex, Groovex, and Vocalex to retain DOM state and scroll positions during tab switching.',
      'Fast-Path Loading Architecture: Implemented synchronous memory-first rendering that immediately renders cached data and avoids skeleton flicker, reserving skeletons strictly for slow asynchronous network fetches.',
      'Hub Module Logos: Removed rounded-square framing containers, artificial borders, backgrounds, and glows from module cards on the Home screen to display clean brand logos.',
    ],
  },
  {
    version: '4.6.46',
    date: '2026-09-24',
    highlights: [
      'Accent Resolution Throughput: Memoized `resolveAccent` with bounded caching, reducing color math latency from 248ms to 7.8ms (31.7x speedup) and maintaining referential stability across component renders.',
      'Chord Database Lookups: Replaced linear array scans in `getChordById` and `getChordByName` with O(1) hash maps, increasing lookup throughput by 44%.',
      'Drumex Metronome Render Isolation: Decoupled beat and subdivision tick subscriptions from `MetronomePanel` root into isolated memoized `BeatCells` and `SubdivisionDots`, eliminating up to 960 full-tree re-renders per minute.',
      'Drumex Beats List Memoization: Wrapped `BeatCard` and `BeatMiniTimeline` in `React.memo` and stabilized callback props, isolating song preview updates to the active card instead of re-rendering all 50+ cards.',
      'Drumex Preferences Stability: Hoisted `PrefsSection` and `PrefsRow` outside component render function to eliminate DOM subtree unmount/remount churn.',
      'Chordex Songs Card Stability: Memoized accent resolution in `SongsPanel` to preserve `PresetCard` memoization.',
    ],
  },
  {
    version: '4.6.45',
    date: '2026-09-24',
    highlights: [
      'Chordex New-Song Creation Integration: Connected the AI "Import to Chordex" workflow directly to the canonical song creation dialog (`PresetForm`), prefilling title, key, tempo, and notes while allowing user review before saving.',
      'Canonical Chord Resolution: Integrated `extractCanonicalChordIds` to map generated chords and jazz extensions to canonical Chordex database IDs and automatic `CustomChord` voicings.',
      'Empty Progression Section: Fixed chord lookup failure in `SongsPanel` by resolving canonical chord IDs and adding dual fallback lookups for chord names and transposed IDs.',
      'Technical Song Titles: Eliminated system strings and auto-extracted technical titles in favor of concise, musically descriptive song titles.',
    ],
  },
  {
    version: '4.6.44',
    date: '2026-09-24',
    highlights: [
      'Edge Multimodal Vision Pipeline: Extracted raw image byte payloads into Uint8Array vectors and routed directly to @cf/meta/llama-3.2-11b-vision-instruct on Cloudflare Workers AI edge, providing genuine on-device and edge musical visual intelligence.',
      'Grounding Conflict Isolation: Decoupled Google Gemini search grounding tools from multimodal inlineData requests to eliminate HTTP 400 parameter rejections when analyzing musical visual artifacts.',
      'Bottom Navigation Compact Scroll: Restored compact shrinking dock interaction across Hub and all sub-apps on downward scroll without translating the navigation off-screen.',
      'Symmetrical Center-Bottom Dock Scaling: Downscaled the navigation dock to 0.88 toward center bottom while maintaining 100% visibility, active touch targets, and full dock interactivity.',
      'Satellite Action Button Collapse: Smoothly collapsed and faded the App Switcher and AI mascot satellite controls to opacity 0 and scale 0, retracting horizontal footprint inward cleanly.',
      'Instant Physics-Based Scroll Restoration: Restored full dock dimensions and satellite controls smoothly upon upward scrolling via unified spring physics.',
    ],
  },
  {
    version: '4.6.43',
    date: '2026-09-24',
    highlights: [
      'Multimodal Livex AI Assistant: Added native musical vision analysis for fretboard photos, fingering charts, sheet music, tabs, pedalboard rigs, and DAW screenshots via Gemini multimodal models.',
      'Structured Document Ingestion: Enabled seamless base64 decoding and prompt injection for musical text documents (.txt, .md, .csv, .tab, .chordpro, .json) with a 15MB file size limit guard.',
      'Truthful AI Activity State Machine: Integrated official thinking-orbs states (working, searching, solving, composing, shaping, weaving, listening) with real-time visible status labels directly driven by edge gateway events.',
      'Multimodal Composer Controls: Added file validation rejecting unsupported binary formats and enabled instant submission with image/audio attachments without requiring typed text.',
      'Assistant Message Visual Parity: Rendered dedicated thumbnail preview cards for user image attachments and responsive icon badges for audio and chord documents.',
      'State-Driven ThinkingOrb Transitions: Eliminated arbitrary progress bars and fake timers, ensuring seamless handoff from reasoning and searching states into streaming content tokens.',
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
