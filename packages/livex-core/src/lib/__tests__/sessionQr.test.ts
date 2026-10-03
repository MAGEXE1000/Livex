import { describe, it, expect } from 'vitest';
import { generateQrMatrix, generateQrSvg } from '../qr/qrGenerator';
import {
  createSessionJoinToken,
  parseSessionJoinToken,
  validateSessionJoinToken,
} from '../qr/sessionToken';

describe('QR Code Generation & Play Together Session Tokens', () => {
  describe('Pure TypeScript QR Code Generator', () => {
    it('generates a valid 2D boolean matrix for session payload', () => {
      const text = 'livex://play-together?data=%7B%22type%22%3A%22livex_session_join%22%7D';
      const matrix = generateQrMatrix(text, 'M');

      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBeGreaterThanOrEqual(21);
      expect(matrix[0].length).toBe(matrix.length); // Must be a square

      // Top-left finder pattern center (row 3, col 3) must be dark
      expect(matrix[3][3]).toBe(true);
      // Top-left outer finder border (row 0, col 0) must be dark
      expect(matrix[0][0]).toBe(true);
    });

    it('generates a valid SVG element with custom options', () => {
      const text = 'livex://play-together?sessionId=sess-123';
      const svg = generateQrSvg(text, { size: 200, fgColor: '#000000', bgColor: '#ffffff' });

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 200 200"');
      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="200"');
      expect(svg).toContain('<path d="M');
      expect(svg).toContain('fill="#000000"');
    });
  });

  describe('Session Token Lifecycle & Security', () => {
    it('creates short-lived token with NO credentials and NO permanent band code', () => {
      const now = 1000000;
      const { token, encodedString } = createSessionJoinToken({
        bandId: 'band-omega-9',
        sessionId: 'sess-abc-123',
        leaderId: 'leader-uid-456',
        leaderName: 'Carlos',
        songId: 'song-789',
        songTitle: 'Venezia',
        bpm: 128,
        barsPerLine: 4,
        durationMs: 300000, // 5 minutes
      });

      expect(token.type).toBe('livex_session_join');
      expect(token.version).toBe(1);
      expect(token.bandId).toBe('band-omega-9');
      expect(token.sessionId).toBe('sess-abc-123');
      expect(token.songTitle).toBe('Venezia');

      // Security Invariant: no passwords, no tokens, no auth headers
      expect((token as any).password).toBeUndefined();
      expect((token as any).authToken).toBeUndefined();
      expect((token as any).code).toBeUndefined(); // Permanent 6-char band code is NEVER leaked

      // Token duration is short-lived (default 5 minutes)
      expect(token.expiresAt - token.createdAt).toBe(300000);

      // Encoded string uses livex URL scheme
      expect(encodedString).toContain('livex://play-together?data=');
    });

    it('parses token from URL scheme, raw JSON, and base64', () => {
      const original = {
        type: 'livex_session_join',
        version: 1,
        bandId: 'band-omega-9',
        sessionId: 'sess-abc-123',
        leaderId: 'leader-456',
        leaderName: 'Carlos',
        songId: 'song-789',
        songTitle: 'Venezia',
        bpm: 128,
        barsPerLine: 4,
        createdAt: 1000000,
        expiresAt: 1300000,
      };

      const jsonStr = JSON.stringify(original);
      const urlStr = `livex://play-together?data=${encodeURIComponent(jsonStr)}`;
      const b64Str = btoa(jsonStr);

      const parsedFromUrl = parseSessionJoinToken(urlStr);
      expect(parsedFromUrl).not.toBeNull();
      expect(parsedFromUrl?.sessionId).toBe('sess-abc-123');

      const parsedFromJson = parseSessionJoinToken(jsonStr);
      expect(parsedFromJson).not.toBeNull();
      expect(parsedFromJson?.bandId).toBe('band-omega-9');

      const parsedFromB64 = parseSessionJoinToken(b64Str);
      expect(parsedFromB64).not.toBeNull();
      expect(parsedFromB64?.songTitle).toBe('Venezia');
    });

    it('validates active session token for band member and reconstructs packet', () => {
      const now = 1000000;
      const token = {
        type: 'livex_session_join' as const,
        version: 1 as const,
        bandId: 'band-omega-9',
        sessionId: 'sess-abc-123',
        leaderId: 'leader-456',
        leaderName: 'Carlos',
        songId: 'song-789',
        songTitle: 'Venezia',
        bpm: 128,
        barsPerLine: 4,
        createdAt: now - 60000, // 1 minute ago
        expiresAt: now + 240000, // 4 minutes remaining
      };

      const userBands = ['band-alpha-1', 'band-omega-9'];
      const result = validateSessionJoinToken(token, userBands, now);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.packet.id).toBe('sess-abc-123');
        expect(result.packet.bandId).toBe('band-omega-9');
        expect(result.packet.action).toBe('START_SESSION');
        expect(result.packet.songTitle).toBe('Venezia');
        expect(result.packet.bpm).toBe(128);
      }
    });

    it('rejects expired session token', () => {
      const now = 2000000;
      const expiredToken = {
        type: 'livex_session_join' as const,
        version: 1 as const,
        bandId: 'band-omega-9',
        sessionId: 'sess-abc-123',
        leaderId: 'leader-456',
        leaderName: 'Carlos',
        songId: 'song-789',
        songTitle: 'Venezia',
        bpm: 128,
        barsPerLine: 4,
        createdAt: now - 400000,
        expiresAt: now - 100000, // Expired 100 seconds ago
      };

      const userBands = ['band-omega-9'];
      const result = validateSessionJoinToken(expiredToken, userBands, now);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('expired');
        expect(result.message).toContain('expired');
      }
    });

    it('rejects non-member attempt to join session with clear error', () => {
      const now = 1000000;
      const validTimeToken = {
        type: 'livex_session_join' as const,
        version: 1 as const,
        bandId: 'band-secret-guild',
        sessionId: 'sess-secret-42',
        leaderId: 'leader-alice',
        leaderName: 'Alice',
        songId: 'song-42',
        songTitle: 'Classified Jam',
        bpm: 120,
        barsPerLine: 2,
        createdAt: now - 30000,
        expiresAt: now + 270000,
      };

      // User belongs to other bands, but NOT band-secret-guild
      const userBands = ['band-other-1', 'band-other-2'];
      const result = validateSessionJoinToken(validTimeToken, userBands, now);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('not_member');
        expect(result.message).toContain('not a member of this band');
      }
    });
  });
});
