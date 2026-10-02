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

export const NATIVE_VERSION = '4.6.74';
export const NATIVE_VERSION_CODE = 40674;
export const WEB_VERSION = '4.6.74';
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
export const APP_VERSION_DATE = '10/1/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = '10fc935e';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '10/1/2026, 6:02:47 PM CST';

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
      'Docked Floating Toast Manager: Unified notification system anchored directly above the bottom navbar with frosted-glass styling, spring animations, and multi-theme support (Light, Dark, AMOLED).',
      'Synchronized Rehearsal Lobby: Multi-device synchronized waiting lobby mode triggered via "Call Band" header action with automatic spectator lock and synchronized start.',
      'Drag-and-Drop Song Reordering: Smooth reordering for song setlists and song repertoire with direct drag-and-drop handles.',
      'Icon-Only Live Action: Streamlined Live Mode floating transport with minimalist icon-only play button and centralized action layout.',
    ],
  },
  {
    heading: 'Improved',
    items: [
      'Streamlined Band Hub: Focused Band Hub modal retaining exclusively Members (with quick-copy Join Code) and Calendar/Gigs schedule.',
      'Setlist & Song Modals: Standardized monochrome action icons, centered library headers, and consolidated minimalist song cards with sticky mode switcher.',
      'Repertoire & Editor Canvas: Borderless chord editor canvas with unified floating action button and letter-anchored chord placement.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Leader Self-Toast Echo: Enforced unconditional filter preventing band session leaders from receiving self-invitation toasts during band calls.',
      'Solo Lobby Card Suppression: Eliminated persistent solo lobby bar popups during paused playback in solo live sessions.',
      'Song Deletion & Preset Sync: Repaired active preset reset on song deletion and prevented stale references in setlist sections.',
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
    version: '4.6.74',
    date: '2026-10-01',
    highlights: [
      'Docked Floating Toast Manager: Unified notification system anchored directly above the bottom navbar with frosted-glass styling, spring animations, and multi-theme support (Light, Dark, AMOLED).',
      'Synchronized Rehearsal Lobby: Multi-device synchronized waiting lobby mode triggered via "Call Band" header action with automatic spectator lock and synchronized start.',
      'Drag-and-Drop Song Reordering: Smooth reordering for song setlists and song repertoire with direct drag-and-drop handles.',
      'Icon-Only Live Action: Streamlined Live Mode floating transport with minimalist icon-only play button and centralized action layout.',
      'Streamlined Band Hub: Focused Band Hub modal retaining exclusively Members (with quick-copy Join Code) and Calendar/Gigs schedule.',
      'Setlist & Song Modals: Standardized monochrome action icons, centered library headers, and consolidated minimalist song cards with sticky mode switcher.',
    ],
  },
  {
    version: '4.6.73',
    date: '2026-10-01',
    highlights: [
      'Live Header Call Band Integration: Integrated the "Call Band" rehearsal button directly into the Live mode top header for band leaders with clean glass pill styling.',
      'Polished Setlists Interface: Streamlined Setlist detail view with 34px action controls, dynamic header clearance (140px) preventing title collision, uniform song row badges (#Key, BPM, Duration), and intuitive empty states.',
      'Live Teleprompter Progression Freeze: Stabilized synchronization state refs, eliminating premature line timer teardowns on musical beat ticks to ensure continuous, automatic lyric advancement during playback.',
      'Song Deletion Pipeline & Relational Integrity: Repaired delete confirmation dialog actions with active preset reset, setlist section cleanup, and toast notifications.',
      'Isolated Rehearsal Lobby Lifecycle: Restricted the Rehearsal Lobby strictly to active multi-device call sessions, eliminating intrusive solo lobby popups during playback and pauses.',
      'Streamlined Band Hub: Removed redundant in-modal repertoire management to focus exclusively on Members (with Join Code) and Gigs/Calendar schedule.',
    ],
  },
  {
    version: '4.6.72',
    date: '2026-10-01',
    highlights: [
      'Setlist & Repertoire Subsystem: Comprehensive gig repertoire management in Songs with custom sections (Bloque 1, Acoustic, Encore), batch song selector from library, and intuitive drag/reorder handles.',
      'Sequential Live Setlist Playback: Seamless track advancement controls in Live mode teleprompter ([⏮ Prev: Title] and [Next: Title ⏭]) with live section and position context.',
      'Cover Image Live Preview & Progress Lock: Added asynchronous JPEG downsampling and instant preview in the song editor dialog with loading spinners during optimization.',
      'Custom Song Cover Persistence: Resolved race condition where background re-renders wiped selected covers upon save, ensuring persistent local storage across restarts and theme toggles.',
      'Robust Thumbnail Rendering: Added image error fallbacks and graceful placeholder badges across song library cards, setlist detail rows, and setlist song pickers.',
    ],
  },
  {
    version: '4.6.71',
    date: '2026-09-30',
    highlights: [
      'Unified Canonical Floating Glass Topbar in Live Mode: Restyled the Live mode top navigation capsule across Chords, Lyrics, and Both modes using the canonical `SharedFloatingHeader` design system tokens, responsive backdrop blur, and SVG back navigation chevron.',
      'Icon-Only Live Spectator Sync Indicator: Streamlined the spectator follow pill into a sleek circular link icon button on the right header boundary, eliminating header clutter while preserving instant tap-to-unlock behavior.',
      'Line-Level Teleprompter Focus: Transitioned active lyric line emphasis from character/syllable breaks to unified full-line focus framing with high-contrast active text and smooth verse transitions.',
      'Live Mode Topbar Mathematical Center Alignment: Centered song titles and live playback subtitles with symmetric horizontal clearance across all screen sizes and mobile aspect ratios.',
      'Compact Live Topbar Height: Reduced header height across all Live modes to an unobtrusive 48px profile, optimizing screen real estate for chords, teleprompter lyrics, and stage performance.',
      'Live Topbar Settings De-Cluttering: Removed the redundant tune/preferences button from the top header in favor of primary dock controls in the bottom action bar.',
    ],
  },
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
];

/** Native English version of the current changelog for Android. */
export const APP_CHANGELOG_SECTIONS_NATIVE: ChangelogSection[] = [
  {
    heading: 'Added',
    items: [
      'Live Header Call Band Integration: Integrated the "Call Band" rehearsal button directly into the Live mode top header for band leaders with clean glass pill styling.',
      'Polished Setlists Interface: Streamlined Setlist detail view with 34px action controls, dynamic header clearance (140px) preventing title collision, uniform song row badges (#Key, BPM, Duration), and intuitive empty states.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Live Teleprompter Progression Freeze: Stabilized synchronization state refs, eliminating premature line timer teardowns on musical beat ticks to ensure continuous, automatic lyric advancement during playback.',
      'Song Deletion Pipeline & Relational Integrity: Repaired delete confirmation dialog actions with active preset reset, setlist section cleanup, and toast notifications.',
      'Isolated Rehearsal Lobby Lifecycle: Restricted the Rehearsal Lobby strictly to active multi-device call sessions, eliminating intrusive solo lobby popups during playback and pauses.',
      'Streamlined Band Hub: Removed redundant in-modal repertoire management to focus exclusively on Members (with Join Code) and Gigs/Calendar schedule.',
    ],
  },
];

/** Spanish version of the current changelog — picked at render time
 *  by `ChangelogSheet` based on `settings.language`. */
export const APP_CHANGELOG_SECTIONS_ES: ChangelogSection[] = [
  {
    heading: 'Novedades',
    items: [
      'Integración de Llamar Banda en Cabecera: Botón de ensayo "Llamar Banda" integrado directamente en la cabecera superior de Modo En Vivo para líderes de banda con diseño de cristal.',
      'Interfaz de Repertorios Pulida: Vista de repertorio optimizada con controles de 34px, holgura de cabecera dinámica (140px) que previene colisiones de texto, insignias uniformes (#Tonalidad, BPM, Duración) y estados vacíos intuitivos.',
    ],
  },
  {
    heading: 'Correcciones',
    items: [
      'Bloqueo de Progresión del Teleprónter: Referencias de sincronización estabilizadas, eliminando reinicios prematuros del temporizador para garantizar el avance continuo y automático de letras.',
      'Canal de Eliminación de Canciones e Integridad Relacional: Reparada acción de confirmación de eliminación con restablecimiento de canción activa, limpieza en repertorios y notificaciones toast.',
      'Ciclo de Vida de Sala de Espera Aislado: Sala de espera restringida estrictamente a sesiones de llamada multidispositivo activas, eliminando ventanas emergentes en modo individual o pausas.',
      'Hub de Banda Simplificado: Eliminada gestión redundante de repertorios en el modal para enfocarse exclusivamente en Miembros (con Código de Unión) y Calendario de Gigs.',
    ],
  },
];

/** German version of the current changelog. */
export const APP_CHANGELOG_SECTIONS_DE: ChangelogSection[] = [
  {
    heading: 'Neu',
    items: [
      'Live-Header-Band-Aufruf: "Band anrufen"-Button direkt in den oberen Live-Modus-Header für Bandleiter integriert.',
      'Optimierte Setlist-Oberfläche: Optimierte Setlist-Detailansicht mit 34-px-Bedienelementen, dynamischem Header-Abstand (140 px) zur Vermeidung von Titelkollisionen und einheitlichen Song-Badges.',
    ],
  },
  {
    heading: 'Fehlerbehebungen',
    items: [
      'Teleprompter-Fortschritts-Fix: Stabilisierte Synchronisations-Refs für kontinuierliches automatisches Weiterschalten der Songtexte.',
      'Song-Löschungs-Pipeline: Zuverlässiges Löschen mit Bereinigung in Setlists und Toast-Benachrichtigung.',
      'Isolierte Proberaum-Lobby: Keine störenden Solo-Lobby-Popups mehr bei Pausen.',
      'Optimierter Band-Hub: Fokussierung auf Mitglieder und Gigs/Kalender.',
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
