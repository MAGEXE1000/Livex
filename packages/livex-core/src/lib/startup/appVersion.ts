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

export const NATIVE_VERSION = '4.6.92';
export const NATIVE_VERSION_CODE = 40692;
export const WEB_VERSION = '4.6.92';
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
export const APP_COMMIT_SHA = '06073143';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '10/3/2026, 1:09:23 PM CST';

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
      'Bar-Based Musical Timing Engine (Bars per Line): Replaced flat linear time division with an authoritative musical progression architecture. Songs now support section-level default durations (`barsPerLine`, e.g. 4 bars for slow intros, 1 bar for rapid verses) alongside granular line-level overrides (`bars`), guaranteeing teleprompter line dwell times match real musical arrangements (such as "Venezia" by Hombres G).',
      'In-App Custom Bars Stepper Sheet: Introduced an AMOLED-styled `CustomBarsSheet` with a tactile `[-] [1-32] [+]` bounded stepper, numeric keypad input, and Confirm/Cancel controls, replacing native browser dialogs.',
      'In-App Text Input Dialog: Integrated `TextInputDialog` for section creation and renaming across `SongLyricsEditor` and `SongsPanel`, preventing Android WebView focus loss and soft-keyboard dismissal glitches.',
      "Dynamic Beat-Dot Visualizer & Quantized Seeking: Live teleprompter active lines now display sequential beat dots (`• • • •`) with `bar k/N` progress labels. Tapping any line in Live mode immediately seeks to that line's downbeat and realigns the metronome phase with zero drift.",
      'Compact Full-Featured Live Metronome Morph Pop-Up: Integrated complete Drumex-style native metronome capabilities into the Live mode morph pop-up, featuring an interactive Beat Tracker for setting strong/normal/muted accents per beat, quick-select Time Signature buttons (4/4, 3/4, 6/8, 2/4), Subdivisions (1/4, 1/8, 1/16, 3let), and Tap Tempo.',
      'Upward Drop-Up Click Sound Picker: Anchored the metronome sound selection menu upwards (`bottom: calc(100% + 8px)`), completely preventing bottom viewport clipping and navigation bar overlap.',
      'Decoupled Countdown Audio Architecture: Added independent Audio Mode configuration (`[Metronome Click Only] [Voice Count ("1, 2, 3, 4")] [Silent Visual Only]`) alongside Lead-In Length options (`[Off] [1 Bar] [2 Bars] [3s] [5s]`) in Song Live Settings.',
    ],
  },
  {
    heading: 'Fixed',
    items: [
      'Single-Clock Master Lead-In Architecture: Eliminated the double countdown glitch (8 clicks instead of 4) by routing count-in strictly through `MetronomeAudioEngine.setCountIn()` without redundant engine start invocations or double audio scheduling.',
      'Strict Cross-Module Metronome Mutex: Added global instance tracking in `MetronomeAudioEngine` so starting any metronome (Live mode, Hub, Settings) automatically silences all other active instances, preventing concurrent audio contexts.',
      'Lookahead Buffer Drain & Ghost Click Elimination: Updated `MetronomeAudioEngine.stop()` to track active `AudioBufferSourceNode`s and immediately cancel and disconnect all in-flight lookahead buffers, eliminating lingering audio clicks on seek or pause.',
      'Line Advancement Off-By-One Resolution: Extracted deterministic `advanceLineClock` logic ensuring lines hold through their complete assigned bars (e.g. 16 clicks for 4-bar intros) and advance cleanly on the downbeat of the next measure.',
      'Web Audio Lookahead Master Clock Synchronization: Replaced drifting JavaScript `setTimeout` timer loops in Live mode with an authoritative Web Audio hardware lookahead clock scheduler (`MetronomeAudioEngine.onBeat`), locking teleprompter lyrics, chord progressions, visual beat pulses, and audio clicks into 100% phase-aligned synchronization with zero drift.',
      'Silent Mode Master Clock Parity: Maintained continuous Web Audio scheduler execution even when the audible metronome is disabled, guaranteeing identical downbeat precision and smooth teleprompter line advances across all playback modes.',
      'Sample-Accurate Countdown-to-Playback Transition: Fixed count-in transition timing so the final beat interval of the lead-in elapses completely before the teleprompter downbeat triggers, eliminating rushed first-verse entries.',
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
    version: '4.6.92',
    date: '2026-10-03',
    highlights: [
      'Bar-Based Musical Timing Engine (Bars per Line): Replaced flat linear time division with an authoritative musical progression architecture. Songs now support section-level default durations (`barsPerLine`, e.g. 4 bars for slow intros, 1 bar for rapid verses) alongside granular line-level overrides (`bars`), guaranteeing teleprompter line dwell times match real musical arrangements (such as "Venezia" by Hombres G).',
      'In-App Custom Bars Stepper Sheet: Introduced an AMOLED-styled `CustomBarsSheet` with a tactile `[-] [1-32] [+]` bounded stepper, numeric keypad input, and Confirm/Cancel controls, replacing native browser dialogs.',
      'In-App Text Input Dialog: Integrated `TextInputDialog` for section creation and renaming across `SongLyricsEditor` and `SongsPanel`, preventing Android WebView focus loss and soft-keyboard dismissal glitches.',
      "Dynamic Beat-Dot Visualizer & Quantized Seeking: Live teleprompter active lines now display sequential beat dots (`• • • •`) with `bar k/N` progress labels. Tapping any line in Live mode immediately seeks to that line's downbeat and realigns the metronome phase with zero drift.",
      'Single-Clock Master Lead-In Architecture: Eliminated the double countdown glitch (8 clicks instead of 4) by routing count-in strictly through `MetronomeAudioEngine.setCountIn()` without redundant engine start invocations or double audio scheduling.',
      'Strict Cross-Module Metronome Mutex: Added global instance tracking in `MetronomeAudioEngine` so starting any metronome (Live mode, Hub, Settings) automatically silences all other active instances, preventing concurrent audio contexts.',
    ],
  },
  {
    version: '4.6.90',
    date: '2026-10-03',
    highlights: [
      'Live Mode Pre-Roll Countdown & Precision Metronome: Introduced configurable count-in lead-in (`[Off] [1 Bar] [2 Bars] [3s] [5s]`) in Song Live Settings with animated visual pulse badge, paired with a synchronized Web Audio API lookahead clock scheduler for drift-free metronome clicks and accented downbeats.',
      'Drumex-Style Live Tempo Morph Pop-Up: Implemented an interactive frosted-glass BPM/tempo adjustment modal in Live mode with tap-tempo interval averaging, incremental steppers, and smooth tempo slider.',
      'Native Android Intent Filters for Direct File Ingestion: Registered `VIEW` and `SEND` intent filters in `AndroidManifest.xml` with deep-link resolution in `MainActivity.kt` and `SharedAppShell.tsx`, allowing users to open and import `.livex` files directly from WhatsApp, file managers, and cloud drives.',
      'Export MIME Type Normalization & .bin Attachment Corruption: Overhauled `.livex` bundle sharing via custom native `LivexFileProvider` mapping `.livex` directly to `application/json`, eliminating Android `application/octet-stream` fallbacks that caused WhatsApp and file managers to rename shared setlists to `DOC-xxxx.bin`.',
      'Resilient & Tolerant Bundle Import Pipeline: Expanded file input criteria and implemented schema-tolerant parser in `livexBundleService` supporting `.livex`, `.json`, `.bin`, and legacy raw arrays with 1-tap instant validation preview and clear error reporting.',
    ],
  },
  {
    version: '4.6.89',
    date: '2026-10-03',
    highlights: [
      'Samsung IME Multi-Line Insert Interception: Added native DOM beforeinput interception in SongLyricsEditor for multi-line text streams, seamlessly normalizing and splicing Samsung Keyboard clipboard pastes into song lyrics and ensuring song content registers immediately for playback.',
      'Synchronous Focus Restoration on Line Deletion: Relocated caret restoration to synchronous useLayoutEffect during line deletion and merge operations, preventing Android WebView focus loss and keeping the virtual keyboard open during rapid Backspace or word deletion.',
    ],
  },
  {
    version: '4.6.88',
    date: '2026-10-03',
    highlights: [
      "DOM Placeholder Crash Eradication: Completely eliminated React-managed placeholder elements in `SongLyricsEditor` in favor of CSS-only `:empty` pseudo-elements on the canvas container, resolving `NotFoundError: Failed to execute 'removeChild' on 'Node'` crashes when typing initial characters on new or blank songs.",
      'Lyric Formatting Span Reconciliation: Implemented `reconcileSpansOnTextEdit` engine to accurately preserve, shift, and adjust formatting spans (bold, italic, underline, vocal colors) across character insertions, deletions, and replacements.',
      'Scoped Canvas Deletion Interception: Scoped Backspace and `beforeinput` selection event handlers strictly to the active lyric canvas DOM element, preventing accidental deletion interception in the chord picker, modal inputs, and search fields.',
      'State Synchronization & Echo Guard: Hardened lyrics state synchronization with structural deep equality checks and an echo guard (`lastEmittedRef`) to prevent in-flight typing from being overwritten by pending debounced store updates.',
      'Schedule-Authoritative Live Timing: Updated Live mode teleprompter timing to synchronize against per-line schedule durations (`timingSchedule.lines`) with drift compensation, and gracefully halting playback on the final line without wrapping.',
      'Interruptible Smooth Scrolling: Introduced touch- and wheel-interruptible smooth scrolling (`animateScrollTop`) for teleprompter and practice views.',
    ],
  },
  {
    version: '4.6.87',
    date: '2026-10-02',
    highlights: [
      'Canvas Touch Focus & Soft Keyboard Activation: Resolved empty canvas collapse on Android WebView by inserting a `<br />` inside the empty `.lyric-line-content` span, establishing a valid DOM caret anchor so tapping empty lyric space immediately focuses and opens the Android virtual keyboard.',
      "Empty-State Banner Touch Isolation: Isolated the `[NO LYRICS]` banner inside `<main contentEditable>` in Both mode with `contentEditable={false}`, `userSelect: 'none'`, and `select-none` to permanently prevent WebView from targeting banner text nodes or intercepting cursor placement.",
      'Lyrics & Both Mode Parity: Ensured seamless touch-to-type capability across both Lyrics and Both workspaces with clean caret positioning and zero placeholder interference.',
    ],
  },
  {
    version: '4.6.86',
    date: '2026-10-02',
    highlights: [
      'Decouple Canvas Placeholder & Enforce Clean Buffer Initialization: Replaced pseudo-element data-placeholder and lyric-line-content:empty::before mechanism with a decoupled, non-interactive sibling overlay rendered strictly when the document is empty.',
      'Clean Document State & Selection Capture: The editable DOM containers never hold synthetic placeholder strings or attributes, preventing selection captures, input desynchronization, and clipboard concatenation errors.',
      'Pseudo-Element Pruning: Cleaned out obsolete lyric-line-content:empty::before CSS rules across shared tokens, Android, and Web styles to prevent browser caret misalignments and unexpected DOM injections.',
    ],
  },
  {
    version: '4.6.85',
    date: '2026-10-02',
    highlights: [
      'DOM Reconciliation Crash Resolution: Resolved fatal NotFoundError insertBefore exception during Clear All Lyrics by isolating contentEditable lifecycle and executing clean Virtual DOM remounts via dynamic reset keys.',
      'Plain-Text Paste Stream Parsing: Enforced continuous single-line rendering in lyrics mode, permanently eliminating erratic multi-column verse splits and horizontal whitespace gaps.',
      'Word Stuttering & Concatenation Elimination: Hardened input event synchronization and selection capture to sanitize DOM text extraction, ignoring chord buttons, badges, and unmanaged elements to prevent duplicate word tokens (e.g. "Estoy Estoy").',
      'Editor Lifecycle Safety: Bound unique song keys to the lyrics canvas to guarantee pristine DOM state transitions when changing active songs in Chordex.',
    ],
  },
  {
    version: '4.6.84',
    date: '2026-10-02',
    highlights: [
      'Deterministic Setlist Live Back-Navigation: Enforced stateful setlist origin tracking ensuring the top-left back button and hardware back gestures return directly to the parent Setlist view rather than redirecting into the single-song chord/lyrics editor.',
      'Canva Toolbar Copy Integration: Added a dedicated Copy button to the floating Canva formatting toolbar allowing one-tap copying of highlighted lyrics directly to the system clipboard.',
      'Transport Control Deduplication: Streamlined Live mode transport bars by eliminating redundant skip controls from auxiliary floating quick action toolbars and displaying next/prev song buttons strictly in the primary bottom dock when actively playing inside a Setlist.',
      'Plain-Text Clipboard Sanitization: Stripped tabs, non-breaking spaces, and synthetic multi-space padding on copy and paste events to ensure pasted verses always render clean, left-aligned, and line-by-line.',
      'Live Header Object Serialization: Resolved JSX element string coercion that previously caused setlist subtitles to display as [object Object].',
      'Dead Code and Bundle Bloat: Safely pruned unreferenced legacy components and orphaned input handlers, reducing bundle size.',
    ],
  },
  {
    version: '4.6.83',
    date: '2026-10-02',
    highlights: [
      "Permanent Canvas Focus Ring Immunity: Removed tabIndex={0} and enforced outline: none, border: none, ring-0, and no-focus-ring across the teleprompter writing canvas and global CSS to eliminate the browser engine's blue bounding rectangle during edit focus.",
      'Unconstrained Dual-Direction Multi-Line Text Selection: Enabled seamless multi-line selection handle dragging downwards and upwards across verses with soft keyboard open.',
      'Immediate Batch Deletion: Instant removal of highlighted multi-line character ranges via Backspace key without leaving ghost lines or UI stutter.',
      'Global Selection Lockdown: Enforced strict user-select none across all UI chrome, topbar pills, and navigation tabs while keeping editable lyric content selectable.',
    ],
  },
  {
    version: '4.6.82',
    date: '2026-10-02',
    highlights: [
      'Unconstrained Multi-Line Selection: Allowed touch selection handles to freely drag across any number of lines both downwards and upwards with the soft keyboard open or closed.',
      'Canva Floating Toolbar Batch Deletion: Added dedicated Delete button to the floating formatting toolbar and unified Backspace key handling to batch delete highlighted text.',
      'Zero-Lag Gesture Handling: Throttled selection change listeners via requestAnimationFrame and enabled hardware acceleration to eliminate touch handle dragging latency.',
      'Keyboard-Focus Selection Collapse: Eliminated single-line textarea encapsulation that previously locked selection handles to a single verse while typing.',
      'Global Selection Lockdown: Enforced strict user-select none across all UI chrome, headers, and navigation tabs to prevent accidental selection highlights.',
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
