/**
 * Groovex Album Art Service
 * Fetches high-resolution (1000x1000) authentic album artwork from iTunes Search API
 * with persistent localStorage caching and instant in-memory cache.
 */

const MEMORY_COVER_CACHE = new Map<string, string>();
const STORAGE_PREFIX = 'groovex_cover_';

const PRESEEDED_COVERS: Record<string, string> = {
  '4nonblondes-whats-up':
    'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d2/aa/44/d2aa4418-7e74-7e6d-4247-9b9c1cba9e64/06UMGIM01654.rgb.jpg/1000x1000bb.jpg',
  'queen-bohemian-rhapsody':
    'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/80/7e/d3/807ed33f-9176-0f8b-3024-e885cfa186d6/00602547202758.rgb.jpg/1000x1000bb.jpg',
};

// Seed initial memory cache
for (const [id, url] of Object.entries(PRESEEDED_COVERS)) {
  MEMORY_COVER_CACHE.set(id, url);
}

export function sanitizeQuery(str: string): string {
  return str
    .replace(/\s*[\(\[][^\)\]]*(?:remaster|live|acoustic|mono|stereo|official|video|stems?|multitrack)[^\)\]]*[\)\]]/gi, '')
    .replace(/[^\w\s'-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCachedSongCoverArt(songId: string): string | null {
  if (MEMORY_COVER_CACHE.has(songId)) {
    return MEMORY_COVER_CACHE.get(songId)!;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + songId);
      if (stored) {
        MEMORY_COVER_CACHE.set(songId, stored);
        return stored;
      }
    } catch {
      // Storage unavailable
    }
  }
  return null;
}

export function setCachedSongCoverArt(songId: string, url: string): void {
  MEMORY_COVER_CACHE.set(songId, url);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + songId, url);
    } catch {
      // Quota exceeded or private browsing
    }
  }
}

export async function fetchSongCoverArt(
  songId: string,
  title: string,
  artist?: string
): Promise<string | null> {
  // 1. Instant check from cache
  const cached = getCachedSongCoverArt(songId);
  if (cached) return cached;

  if (!title) return null;

  const cleanTitle = sanitizeQuery(title);
  const cleanArtist = artist ? sanitizeQuery(artist) : '';
  const term = `${cleanTitle} ${cleanArtist}`.trim();

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(itunesUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      const rawArt = item.artworkUrl100 || item.artworkUrl60;
      if (rawArt && typeof rawArt === 'string') {
        // Upgrade to ultra-crisp 1000x1000 resolution
        const highResArt = rawArt.replace(/\/\d+x\d+bb\./, '/1000x1000bb.');
        setCachedSongCoverArt(songId, highResArt);
        return highResArt;
      }
    }
  } catch (err) {
    // Network/timeout error — gracefully fail to fallback without interrupting playback
    console.warn(`[Groovex AlbumArt] Failed to fetch cover for "${title}":`, err);
  }

  // Secondary fallback: search solely by title if artist combined query returned 0 results
  if (cleanArtist) {
    try {
      const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=song&limit=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(fallbackUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          const rawArt = item.artworkUrl100 || item.artworkUrl60;
          if (rawArt && typeof rawArt === 'string') {
            const highResArt = rawArt.replace(/\/\d+x\d+bb\./, '/1000x1000bb.');
            setCachedSongCoverArt(songId, highResArt);
            return highResArt;
          }
        }
      }
    } catch {}
  }

  return null;
}
