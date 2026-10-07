import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchSongCoverArt,
  getCachedSongCoverArt,
  setCachedSongCoverArt,
  sanitizeQuery,
} from '../albumArtService';

describe('albumArtService Unit Tests', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('correctly retrieves null when no cached art is stored', () => {
    expect(getCachedSongCoverArt('nonexistent-song')).toBeNull();
  });

  it('persists and retrieves cached art from memory and localStorage', () => {
    const url = 'https://example.com/cover1000x1000.jpg';
    setCachedSongCoverArt('test-song-1', url);
    expect(getCachedSongCoverArt('test-song-1')).toBe(url);
  });

  it('properly sanitizes search query strings by stripping metadata noise', () => {
    expect(sanitizeQuery("What's Up? (Remastered)")).toBe("What's Up");
    expect(sanitizeQuery('Smells Like Teen Spirit [Official Video]')).toBe('Smells Like Teen Spirit');
    expect(sanitizeQuery('Hotel California [Stems]')).toBe('Hotel California');
  });

  it('fetches artwork from iTunes and upgrades to 1000x1000 resolution', async () => {
    const fakeRawUrl = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/00/100x100bb.jpg';
    const expectedHighRes = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/00/1000x1000bb.jpg';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            artworkUrl100: fakeRawUrl,
          },
        ],
      }),
    });
    globalThis.fetch = mockFetch as any;

    const result = await fetchSongCoverArt('test-song-2', "What's Up?", '4 Non Blondes');
    expect(result).toBe(expectedHighRes);
    expect(getCachedSongCoverArt('test-song-2')).toBe(expectedHighRes);
  });

  it('gracefully returns null if network fails or returns 0 results', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });
    globalThis.fetch = mockFetch as any;

    const result = await fetchSongCoverArt('unknown-song', 'Nonexistent Song Title 12345');
    expect(result).toBeNull();
  });
});
