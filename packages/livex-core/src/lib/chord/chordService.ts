import { cleanChordLookupName, decodeHtmlEntities, cleanHtmlToPlainText, validateChord } from './chordFormatting';
import { parsePlainChart, parseCifraStyleHtml, isChordProFormat, mapLyricsResultToSections, validateChartChords, type NormalizedSection, type NormalizedChordChart, type NormalizedChordMarker, type NormalizedLyricsLine } from './chordParser';
export * from './chordFormatting';
export * from './chordParser';
export * from './chordTransposer';
import { type SongChart, type SongChartSection, type ChordMarker } from '../../data/songs';
import { AUTHORIZED_CHORD_CHARTS } from '../../data/authorizedChords';
import { getChordByName, normalizeChordName } from '../../data/chords';
import { fetchLyricsOnline, type LyricsResult } from './lyricsService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';


export interface ChordChartProvider {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  licenseInfo?: string;
  searchChart(song: SongChart): Promise<NormalizedChordChart | null>;
}

// ── BUILT-IN CHORD PROVIDER ───────────────────────────────────
export class BuiltInChordProvider implements ChordChartProvider {
  id = 'builtin';
  name = 'Built-in Verified Charts';
  enabled = true;
  priority = 2;
  licenseInfo = 'Authorized / Public Domain';

  async searchChart(song: SongChart): Promise<NormalizedChordChart | null> {
    const sections = AUTHORIZED_CHORD_CHARTS[song.id];
    if (!sections) return null;

    let lineCounter = 0;
    const normalizedSections: NormalizedSection[] = sections.map((sec) => ({
      name: sec.name,
      lines: sec.lines.map((line) => ({
        lyrics: line.lyrics,
        lineIndex: lineCounter++,
        timestamp: line.timestamp,
        duration: line.duration,
        chords: (line.chords || []).map((c) => ({
          chord: c.chord,
          offset: c.offset,
          timestamp: c.timestamp,
        })),
      })),
    }));

    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      capo: song.capo,
      sections: normalizedSections,
      source: this.id,
      licenseInfo: this.licenseInfo,
      confidence: 1.0,
      chartStatus: 'verified',
    };
  }
}

// ── USER IMPORTED CHORD PROVIDER ───────────────────────────────
export class UserImportedChordProvider implements ChordChartProvider {
  id = 'user';
  name = 'User Custom Charts';
  enabled = true;
  priority = 1;
  licenseInfo = 'User Provided';

  async searchChart(song: SongChart): Promise<NormalizedChordChart | null> {
    const saved = localStorage.getItem(`chordex:practice:custom_chart:${song.id}`);
    if (!saved) return null;

    try {
      const parsedSections: SongChartSection[] = JSON.parse(saved);
      let lineCounter = 0;
      const normalizedSections: NormalizedSection[] = parsedSections.map((sec) => ({
        name: sec.name,
        lines: sec.lines.map((line) => ({
          lyrics: line.lyrics,
          lineIndex: lineCounter++,
          timestamp: line.timestamp,
          duration: line.duration,
          chords: (line.chords || []).map((c) => ({
            chord: c.chord,
            offset: c.offset,
            timestamp: c.timestamp,
          })),
        })),
      }));

      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        key: song.key,
        capo: song.capo,
        sections: normalizedSections,
        source: this.id,
        licenseInfo: this.licenseInfo,
        confidence: 1.0,
        chartStatus: 'user',
      };
    } catch (_) {
      return null;
    }
  }
}

// Helper to convert plain/synced lyrics from LRCLIB into normalized lyrics lines
// ── OPEN CHORD PRO API PROVIDER (SEARCH ADAPTER STUB) ─────────
export class OpenChordProApiProvider implements ChordChartProvider {
  id = 'openchordpro';
  name = 'OpenChordPro Repository';
  enabled = true;
  priority = 3;
  licenseInfo = 'Creative Commons / Public Domain';

  async searchChart(song: SongChart): Promise<NormalizedChordChart | null> {
    // Stub search for CC / PD ChordPro repositories online
    return null;
  }
}

// ── OPEN CHORD CHARTS PROVIDER (LRCLIB & METADATA ADAPTER) ──────
export class OpenChordChartsProvider implements ChordChartProvider {
  id = 'openchords';
  name = 'Open Chords Adapter';
  enabled = true;
  priority = 4;
  licenseInfo = 'LRCLIB Terms Compatible';

  async searchChart(song: SongChart): Promise<NormalizedChordChart | null> {
    const enabledProviders = ['lrclib'];
    const preferSynced = true;

    const result = await fetchLyricsOnline(song.title, song.artist, {
      preferSynced,
      enabledProviders,
    });

    if (!result) return null;

    const sections = mapLyricsResultToSections(result);
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      capo: song.capo,
      sections,
      source: result.provider,
      licenseInfo: this.licenseInfo,
      confidence: result.confidence,
      chartStatus: 'unavailable', // No chords in LRCLIB lyrics, marks as unavailable
    };
  }
}

// ── REGISTRY & SEARCH STRATEGY ──────────────────────────────────
export const CHORD_PROVIDERS: ChordChartProvider[] = [
  new UserImportedChordProvider(),
  new BuiltInChordProvider(),
  new OpenChordProApiProvider(),
  new OpenChordChartsProvider(),
];

// Clean a chord name to look up in the library
// Validate that a chord name exists in the Chordex chord database
// Coordinates the provider search strategy, validates and caches results
export async function getChordChart(
  song: SongChart,
  forceRefresh = false
): Promise<NormalizedChordChart | null> {
  // 1. Check User-Imported Provider first (highest priority)
  const userProvider = new UserImportedChordProvider();
  const userChart = await userProvider.searchChart(song);
  if (userChart) {
    validateChartChords(userChart);
    return userChart;
  }

  // 2. Check Built-in Verified Provider second
  const builtinProvider = new BuiltInChordProvider();
  const builtinChart = await builtinProvider.searchChart(song);
  if (builtinChart) {
    validateChartChords(builtinChart);
    return builtinChart;
  }

  // 3. Check Cached Provider Result third (if not forceRefresh)
  const cacheKey = `chordex:chords:cache:${song.id}`;
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (cached === 'none') return null;
      try {
        const cachedChart: NormalizedChordChart = JSON.parse(cached);
        validateChartChords(cachedChart);
        return cachedChart;
      } catch (_) {}
    }
  }

  // 4. Query remaining providers (OpenChordPro, OpenChords)
  const openProProvider = new OpenChordProApiProvider();
  const openProChart = await openProProvider.searchChart(song);
  if (openProChart) {
    validateChartChords(openProChart);
    localStorage.setItem(cacheKey, JSON.stringify(openProChart));
    return openProChart;
  }

  const openProvider = new OpenChordChartsProvider();
  try {
    const chart = await openProvider.searchChart(song);
    if (chart) {
      validateChartChords(chart);
      localStorage.setItem(cacheKey, JSON.stringify(chart));
      return chart;
    } else {
      localStorage.setItem(cacheKey, 'none');
    }
  } catch (e) {
    console.error('[ChordService] Failed to query open provider:', e);
  }

  return null;
}

// Helper to sanitize and validate chord names in a chart
// ── URL IMPORT PARSER ARCHITECTURE ──────────────────────────────

export interface ChartUrlImporter {
  id: string;
  name: string;
  supportedHosts: string[];
  supportStatus: 'supported' | 'limited' | 'blocked' | 'unsupported';
  supportDescription: string;
  canHandle(url: string): boolean;
  importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart>;
}

async function fetchHtmlContent(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.get({
        url,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
      });
      return response.data;
    } catch (err: any) {
      throw new Error(`Native fetch failed: ${err.message || err}`);
    }
  } else {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP fetch failed with status ${response.status}`);
    }
    return await response.text();
  }
}

export class CifraClubImporter implements ChartUrlImporter {
  id = 'cifraclub';
  name = 'Cifra Club';
  supportedHosts = [
    'cifraclub.com.br',
    'www.cifraclub.com.br',
    'cifraclub.com',
    'www.cifraclub.com',
  ];
  supportStatus = 'supported' as const;
  supportDescription = 'Full chord-over-lyrics import';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    const html = await fetchHtmlContent(url);

    let title = song.title;
    const titleMatch =
      html.match(/<h1 class="t1">([\s\S]+?)<\/h1>/) ||
      html.match(/<title>([\s\S]+?) - Cifra Club<\/title>/);
    if (titleMatch) {
      title = decodeHtmlEntities(titleMatch[1].split(' - ')[0].trim());
    }

    let artist = song.artist;
    const artistMatch =
      html.match(/<a class="t3"[\s\S]*?>([\s\S]+?)<\/a>/) ||
      html.match(/<title>[\s\S]+? - ([\s\S]+?) - Cifra Club<\/title>/);
    if (artistMatch) {
      artist = decodeHtmlEntities(artistMatch[1].trim());
    }

    let key = song.key || 'C';
    const keyMatch =
      html.match(/Tom:\s*<b>([^<]+)<\/b>/) ||
      html.match(/id="cifra_tom"[\s\S]*?>[\s\S]*?<b>([^<]+)<\/b>/);
    if (keyMatch) {
      key = keyMatch[1].trim();
    }

    let capo: number | undefined = undefined;
    const capoMatch =
      html.match(/Capo:\s*<b>(?:sem|no|na)?\s*(\d+)/i) ||
      html.match(/class="cifra-capo"[\s\S]*?>[\s\S]*?<b>([^<]+)<\/b>/);
    if (capoMatch) {
      const parsed = parseInt(capoMatch[1] || capoMatch[2] || '', 10);
      if (!isNaN(parsed)) capo = parsed;
    }

    let preContent = '';
    const importDiagnostics: string[] = ['Detected Cifra Club URL'];

    // Strategy 1: Apollo State JSON
    try {
      const contentRegex = /"content"\s*:\s*"([\s\S]+?)"/g;
      let match;
      while ((match = contentRegex.exec(html)) !== null) {
        const escapedVal = match[1];
        if (
          escapedVal.includes('[Intro]') ||
          escapedVal.includes('Parte') ||
          escapedVal.includes('\\u003cb\\u003e')
        ) {
          try {
            preContent = JSON.parse('"' + escapedVal + '"');
            importDiagnostics.push('Succeeded using Strategy: Cifra Club Apollo State JSON');
            break;
          } catch (_) {
            preContent = escapedVal.replace(/\\(?:n|"|\\|u003[cde])/gi, (match) => {
              if (match === '\\n') return '\n';
              if (match === '\\"') return '"';
              if (match === '\\\\') return '\\';
              if (match.toLowerCase() === '\\u003c') return '<';
              if (match.toLowerCase() === '\\u003e') return '>';
              if (match.toLowerCase() === '\\u003d') return '=';
              return match;
            });
            importDiagnostics.push(
              'Succeeded using Strategy: Cifra Club Apollo State JSON (Manual Decode)'
            );
            break;
          }
        }
      }
      if (!preContent) {
        importDiagnostics.push(
          'Failed Strategy: Cifra Club Apollo State JSON (Target content not found in state)'
        );
      }
    } catch (e: any) {
      importDiagnostics.push(
        `Failed Strategy: Cifra Club Apollo State JSON (Error: ${e.message || e})`
      );
    }

    // Strategy 2: Resilient Pre Tag
    if (!preContent) {
      try {
        const preMatch = html.match(/<pre[^>]*>([\s\S]+?)<\/pre>/i);
        if (preMatch) {
          preContent = preMatch[1];
          importDiagnostics.push('Succeeded using Strategy: Cifra Club Resilient Pre Tag');
        } else {
          importDiagnostics.push(
            'Failed Strategy: Cifra Club Resilient Pre Tag (No pre tag matches found)'
          );
        }
      } catch (e: any) {
        importDiagnostics.push(
          `Failed Strategy: Cifra Club Resilient Pre Tag (Error: ${e.message || e})`
        );
      }
    }

    // Strategy 3: Cifra Container Div fallback
    if (!preContent) {
      try {
        const divMatch = html.match(/class="[^"]*?cifra_cnt[^"]*"[^>]*>([\s\S]+?)<\/div>/i);
        if (divMatch && divMatch[1].includes('<b>')) {
          preContent = divMatch[1];
          importDiagnostics.push('Succeeded using Strategy: Cifra Container Div');
        } else {
          importDiagnostics.push(
            'Failed Strategy: Cifra Container Div (No cifra_cnt class containing bold tags found)'
          );
        }
      } catch (e: any) {
        importDiagnostics.push(`Failed Strategy: Cifra Container Div (Error: ${e.message || e})`);
      }
    }

    if (!preContent) {
      const errorMsg =
        'Failed to extract chords and lyrics from Cifra Club page. Tried multiple extraction strategies:\n' +
        importDiagnostics.join('\n');
      throw new Error(errorMsg);
    }

    return parseCifraStyleHtml(
      preContent,
      song,
      'cifraclub',
      'User-imported from Cifra Club',
      importDiagnostics,
      title,
      artist,
      key,
      capo
    );
  }
}

export class EChordsImporter implements ChartUrlImporter {
  id = 'echords';
  name = 'E-Chords';
  supportedHosts = ['e-chords.com', 'www.e-chords.com'];
  supportStatus = 'supported' as const;
  supportDescription = 'Full chord-over-lyrics import';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    const html = await fetchHtmlContent(url);
    const importDiagnostics: string[] = ['Detected E-Chords URL'];

    let title = song.title;
    const titleMatch =
      html.match(/<h1>([\s\S]+?)<\/h1>/i) || html.match(/<title>([\s\S]+?)<\/title>/i);
    if (titleMatch) {
      title = decodeHtmlEntities(titleMatch[1].split(' chords')[0].split(' Chords')[0].trim());
    }

    let artist = song.artist;
    const artistMatch = html.match(/<h2><a[^>]*>([\s\S]+?)<\/a>/i);
    if (artistMatch) {
      artist = decodeHtmlEntities(artistMatch[1].trim());
    }

    let key = song.key || 'C';
    const keyMatch =
      html.match(/Key:\s*<span[^>]*>([^<]+)<\/span>/i) ||
      html.match(/Tom:\s*<span[^>]*>([^<]+)<\/span>/i);
    if (keyMatch) {
      key = keyMatch[1].trim();
    }

    let preContent = '';

    // Strategy 1: Find <pre id="core">
    const preCoreMatch = html.match(/<pre[^>]*id="core"[^>]*>([\s\S]+?)<\/pre>/i);
    if (preCoreMatch) {
      preContent = preCoreMatch[1];
      importDiagnostics.push('Succeeded using Strategy: E-Chords Pre Core');
    }

    // Strategy 2: Fall back to standard pre tags
    if (!preContent) {
      const preMatch = html.match(/<pre[^>]*>([\s\S]+?)<\/pre>/i);
      if (preMatch) {
        preContent = preMatch[1];
        importDiagnostics.push('Succeeded using Strategy: Generic Pre Tag');
      }
    }

    if (!preContent) {
      throw new Error(
        'E-Chords page loaded, but no preformatted chords block was found. Try copying and pasting manually.'
      );
    }

    let normalizedContent = preContent
      .replace(/<u>([\s\S]+?)<\/u>/gi, '<b>$1</b>')
      .replace(/<span>([\s\S]+?)<\/span>/gi, '<b>$1</b>');

    return parseCifraStyleHtml(
      normalizedContent,
      song,
      'echords',
      'User-imported from E-Chords',
      importDiagnostics,
      title,
      artist,
      key
    );
  }
}

export class GenericChordProImporter implements ChartUrlImporter {
  id = 'chordpro';
  name = 'Generic ChordPro';
  supportedHosts = [];
  supportStatus = 'supported' as const;
  supportDescription = 'Supported via raw .chordpro / .pro text import';

  canHandle(url: string): boolean {
    try {
      const lower = url.toLowerCase().split('?')[0];
      return lower.endsWith('.chordpro') || lower.endsWith('.pro') || lower.endsWith('.chopro');
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    const text = await fetchHtmlContent(url);
    const importDiagnostics = ['Succeeded using Strategy: Generic ChordPro File'];
    const chart = parsePlainChart(text, song);
    chart.source = 'chordpro';
    chart.importDiagnostics = importDiagnostics;
    return chart;
  }
}

export class GenericPreformattedImporter implements ChartUrlImporter {
  id = 'generic';
  name = 'Generic Plain Text';
  supportedHosts = ['*'];
  supportStatus = 'supported' as const;
  supportDescription = 'Supported for plain text chord sheets';

  canHandle(url: string): boolean {
    return true; // Fallback
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    const text = await fetchHtmlContent(url);
    const importDiagnostics = ['Succeeded using Strategy: Generic Preformatted/Text Parser'];
    const chart = parsePlainChart(text, song);
    chart.source = 'imported';
    chart.importDiagnostics = importDiagnostics;
    return chart;
  }
}

export class SongsterrImporter implements ChartUrlImporter {
  id = 'songsterr';
  name = 'Songsterr';
  supportedHosts = ['songsterr.com', 'www.songsterr.com'];
  supportStatus = 'limited' as const;
  supportDescription = 'Tab/progression only, no lyric-aligned import';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    throw new Error(
      'Songsterr does not provide lyric-aligned chord sheets for this page. It is a tab and playback tracking site. Please try a manual paste or another source.'
    );
  }
}

export class ChordifyImporter implements ChartUrlImporter {
  id = 'chordify';
  name = 'Chordify';
  supportedHosts = ['chordify.net', 'www.chordify.net'];
  supportStatus = 'limited' as const;
  supportDescription = 'Progression-grid only, no lyric-aligned import';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    throw new Error(
      'Chordify is a progression-grid only site. It does not provide lyric-aligned chord sheets. Please try a manual paste or another source.'
    );
  }
}

export class ChordUImporter implements ChartUrlImporter {
  id = 'chordu';
  name = 'ChordU';
  supportedHosts = ['chordu.com', 'www.chordu.com'];
  supportStatus = 'limited' as const;
  supportDescription = 'Progression-grid only, no lyric-aligned import';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    throw new Error(
      'ChordU is a progression-grid only site. It does not provide lyric-aligned chord sheets. Please try a manual paste or another source.'
    );
  }
}

export class UltimateGuitarImporter implements ChartUrlImporter {
  id = 'ultimateguitar';
  name = 'Ultimate Guitar';
  supportedHosts = ['ultimate-guitar.com', 'www.ultimate-guitar.com'];
  supportStatus = 'blocked' as const;
  supportDescription = 'Often blocked by Cloudflare anti-bot protection';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.supportedHosts.some((h) => hostname === h || hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    throw new Error(
      'Ultimate Guitar is currently blocked for direct import due to Cloudflare anti-bot protection. Please open the page in your browser, copy the chart, and use Paste Manually.'
    );
  }
}

export class GuitarTunaImporter implements ChartUrlImporter {
  id = 'guitartuna';
  name = 'GuitarTuna';
  supportedHosts = ['guitartuna.com', 'www.guitartuna.com'];
  supportStatus = 'unsupported' as const;
  supportDescription = 'No public chart importer available';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return (
        hostname === 'guitartuna.com' ||
        hostname.endsWith('.guitartuna.com') ||
        url.includes('guitartuna')
      );
    } catch (_) {
      return false;
    }
  }

  async importFromUrl(url: string, song: SongChart): Promise<NormalizedChordChart> {
    throw new Error(
      'GuitarTuna does not have a public chart page or parser available. Please try a manual paste or another source.'
    );
  }
}

export const URL_IMPORTERS: ChartUrlImporter[] = [
  new CifraClubImporter(),
  new EChordsImporter(),
  new GenericChordProImporter(),
  new SongsterrImporter(),
  new ChordifyImporter(),
  new ChordUImporter(),
  new UltimateGuitarImporter(),
  new GuitarTunaImporter(),
  new GenericPreformattedImporter(),
];

export async function importChartFromUrl(
  url: string,
  song: SongChart
): Promise<NormalizedChordChart> {
  try {
    new URL(url);
  } catch (_) {
    throw new Error('Invalid URL format. Please paste a valid web address.');
  }

  const parser = URL_IMPORTERS.find((p) => p.canHandle(url));
  if (!parser) {
    throw new Error('No compatible importer found for this website.');
  }

  return await parser.importFromUrl(url, song);
}
