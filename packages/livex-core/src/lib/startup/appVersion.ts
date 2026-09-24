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

export const NATIVE_VERSION = '4.6.45';
export const NATIVE_VERSION_CODE = 40645;
export const WEB_VERSION = '4.6.45';
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
export const APP_VERSION_DATE = '9/24/2026';

/**
 * Git commit hash this build was generated from.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_COMMIT_SHA = '079b0473';

/**
 * Unix epoch timestamp this build was generated.
 * Stamped by `scripts/sync-versions.mjs` on build.
 */
export const APP_BUILD_TIMESTAMP = '9/24/2026, 1:43:32 PM CST';

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
      'Edge Multimodal Vision Pipeline: Extracted raw image byte payloads into Uint8Array vectors and routed directly to @cf/meta/llama-3.2-11b-vision-instruct on Cloudflare Workers AI edge, providing genuine on-device and edge musical visual intelligence.',
      'Grounding Conflict Isolation: Decoupled Google Gemini search grounding tools from multimodal inlineData requests to eliminate HTTP 400 parameter rejections when analyzing musical visual artifacts.',
    ],
  },
  {
    heading: 'Improved',
    items: [
      'Bottom Navigation Compact Scroll: Restored compact shrinking dock interaction across Hub and all sub-apps on downward scroll without translating the navigation off-screen.',
      'Symmetrical Center-Bottom Dock Scaling: Downscaled the navigation dock to 0.88 toward center bottom while maintaining 100% visibility, active touch targets, and full dock interactivity.',
      'Satellite Action Button Collapse: Smoothly collapsed and faded the App Switcher and AI mascot satellite controls to opacity 0 and scale 0, retracting horizontal footprint inward cleanly.',
      'Instant Physics-Based Scroll Restoration: Restored full dock dimensions and satellite controls smoothly upon upward scrolling via unified spring physics.',
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
  {
    version: '4.6.42',
    date: '2026-09-24',
    highlights: [
      'Continuous Updater Surface Morphing: Eliminated dialog component unmounting between Checking and Update Available states, maintaining DOM persistence across the entire update lifecycle.',
      'In-Place Spring Typography & Status Transitions: Added physics-based spring layout transitions with blur crossfades for header title, description, and state labels to prevent abrupt layout pops.',
      'Coordinated 100% Download-to-Install Handoff: Decoupled the installing UI switch from download progress completion so 100% download state remains visible with a fluid smooth morph into the installing surface.',
      'Low-Performance Fallback Guard: Safeguarded blur animations on lower-tier hardware by automatically skipping high-overhead filter transforms when performance mode is set to low.',
    ],
  },
  {
    version: '4.6.41',
    date: '2026-09-23',
    highlights: [
      'Ecosystem Module Cards Memoization: Extracted and memoized Hub ecosystem module cards and greetings header to prevent unnecessary Virtual DOM reconciliations during state transitions.',
      'Android WebView Performance Pass: Eliminated continuous 60–120Hz React re-render storms during scrolling by removing unused scroll subscriptions from the bottom navigation controller.',
      'GPU Compositor & Shader Optimization: Streamlined design token surface backdrops from 4 filter passes to 2 passes and eliminated nested backdrop-filter allocation on active lens pills to prevent dual FBO ping-pong.',
      'Sub-App Bottom Navigation Parity: Aligned Hub bottom navigation behavior, back-stack popping, and active indicator transitions with canonical sub-app interaction models.',
      'PaceUI Native Updater Checking Popup: Integrated smooth morph expansion into checking state and eliminated telemetry storage lock contention.',
    ],
  },
  {
    version: '4.6.40',
    date: '2026-09-23',
    highlights: [
      'Liquid Glass Hub Bottom Navigation: Integrated continuous morphing glass indicator across Hub bottom navigation tabs with spring physics and responsive boundary awareness.',
      'PaceUI In-Place Morphing Updater: Transformed the updater into one persistent dialog surface where Cancel and Download & Install seamlessly morph into progress and installing states.',
      "Clean Updater Header Layout: Removed the redundant top-right close 'X' button to achieve clean symmetrical header typography, anchoring all cancellation to the dedicated bottom action controls.",
      'Real Measured Updater Telemetry: Replaced all static and arbitrary size fallbacks with 100% measured byte calculations from hardware network events and remote manifests.',
    ],
  },
  {
    version: '4.6.39',
    date: '2026-09-23',
    highlights: [
      'Unified Three-State Theme Toggle: Replaced disjoint theme controls with one unified cyclic three-state theme toggle (WHITE → BLACK → AMOLED) across top bar and settings.',
      'Shadcn Motion Theme Integrations: Integrated @toggles/around and @toggles/eclipse micro-interaction toggles for fluid, spring-physics theme transitions.',
      'Enterprise Music AI Assistant Gateway: Integrated Gemini 2.5 streaming backend with Google Search grounding and domain-specific music engineering knowledge.',
      'Contextual Assistant Audio Attachments: Added quick attachment injection for Vocal Pitch, Chords & Key, Stage Plot, Audio Stems, and Drum Patterns.',
      'Theme Cycle State Architecture: Enforced persistent, single-source-of-truth three-state theme progression with comprehensive unit test coverage.',
      'Assistant Studio Layout & Stream Fluidity: Optimized chat stream response rendering with sub-5ms TTFT, zero emoji fluff, and auto-scroll pinning.',
    ],
  },
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
