import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from '../utils';

describe('sanitizeFilename', () => {
  it('preserves clean filenames', () => {
    expect(sanitizeFilename('Venezia')).toBe('Venezia');
    expect(sanitizeFilename('Setlist 2026 - Sunday Worship')).toBe('Setlist 2026 - Sunday Worship');
  });

  it('strips illegal characters on Android and Windows file systems', () => {
    expect(sanitizeFilename('Song: Title / Subtitle? *cool* <wow> | test')).toBe('Song Title Subtitle cool wow test');
    expect(sanitizeFilename('What "A" Wonderful World')).toBe('What A Wonderful World');
  });

  it('collapses multiple whitespace characters and trims boundaries', () => {
    expect(sanitizeFilename('   Too   many    spaces   ')).toBe('Too many spaces');
  });

  it('strips leading dots to prevent unintended hidden files', () => {
    expect(sanitizeFilename('...hidden_song')).toBe('hidden_song');
  });

  it('falls back when title is empty or invalid', () => {
    expect(sanitizeFilename('')).toBe('file');
    expect(sanitizeFilename(null as any)).toBe('file');
    expect(sanitizeFilename(undefined as any)).toBe('file');
    expect(sanitizeFilename('///', 'fallback-name')).toBe('fallback-name');
  });

  it('truncates excessively long titles to 100 characters', () => {
    const longName = 'A'.repeat(150);
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(100);
  });
});
