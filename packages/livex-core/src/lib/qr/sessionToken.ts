import type { LiveBandSyncPacket, SessionJoinToken } from '../../types/band';

export interface CreateSessionJoinTokenParams {
  bandId: string;
  sessionId: string;
  leaderId: string;
  leaderName: string;
  songId: string;
  songTitle: string;
  bpm?: number;
  barsPerLine?: number;
  durationMs?: number; // Defaults to 5 minutes (300,000 ms)
}

export type TokenValidationResult =
  | {
      valid: true;
      token: SessionJoinToken;
      packet: LiveBandSyncPacket;
    }
  | {
      valid: false;
      error: 'malformed' | 'expired' | 'not_member';
      message: string;
    };

/**
 * Creates a short-lived Play Together session join token.
 * Security Invariant: Never embeds credentials, passwords, or permanent band join codes.
 */
export function createSessionJoinToken(params: CreateSessionJoinTokenParams): {
  token: SessionJoinToken;
  encodedString: string;
} {
  const now = Date.now();
  const lifespan = params.durationMs || 5 * 60 * 1000; // 5 minutes standard validity

  const token: SessionJoinToken = {
    type: 'livex_session_join',
    version: 1,
    bandId: params.bandId,
    sessionId: params.sessionId,
    leaderId: params.leaderId,
    leaderName: params.leaderName,
    songId: params.songId,
    songTitle: params.songTitle,
    bpm: params.bpm || 120,
    barsPerLine: params.barsPerLine || 2,
    createdAt: now,
    expiresAt: now + lifespan,
  };

  const jsonStr = JSON.stringify(token);
  return {
    token,
    encodedString: `livex://play-together?data=${encodeURIComponent(jsonStr)}`,
  };
}

/**
 * Safely parse a raw string from a scanned QR code into a SessionJoinToken
 */
export function parseSessionJoinToken(rawInput: string): SessionJoinToken | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  let jsonCandidate = rawInput.trim();

  // Handle URL scheme: livex://play-together?data=...
  if (jsonCandidate.startsWith('livex://')) {
    try {
      const url = new URL(jsonCandidate.replace('livex://', 'http://placeholder/'));
      const dataParam = url.searchParams.get('data');
      if (dataParam) {
        jsonCandidate = decodeURIComponent(dataParam);
      }
    } catch (_) {
      // Fallback manual regex extraction
      const match = jsonCandidate.match(/[?&]data=([^&]+)/);
      if (match) {
        jsonCandidate = decodeURIComponent(match[1]);
      }
    }
  }

  // Handle base64 encoded JSON
  if (!jsonCandidate.startsWith('{')) {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(jsonCandidate);
        if (decoded.startsWith('{')) {
          jsonCandidate = decoded;
        }
      }
    } catch (_) {}
  }

  try {
    const parsed = JSON.parse(jsonCandidate);
    if (
      parsed &&
      parsed.type === 'livex_session_join' &&
      parsed.version === 1 &&
      typeof parsed.bandId === 'string' &&
      typeof parsed.sessionId === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as SessionJoinToken;
    }
  } catch (_) {}

  return null;
}

/**
 * Validates a session join token against current time and user band memberships
 */
export function validateSessionJoinToken(
  token: SessionJoinToken | null,
  userBandIds: string[],
  now: number = Date.now()
): TokenValidationResult {
  if (!token) {
    return {
      valid: false,
      error: 'malformed',
      message: 'Invalid QR code. Not a valid Livex session token.',
    };
  }

  // 1. Expiration Verification
  if (now > token.expiresAt) {
    return {
      valid: false,
      error: 'expired',
      message: 'This session QR code has expired. Ask the leader to display a fresh QR code.',
    };
  }

  // 2. Band Membership Enforcement
  const isMember = userBandIds.includes(token.bandId);
  if (!isMember) {
    return {
      valid: false,
      error: 'not_member',
      message: 'Access denied: You are not a member of this band. Join the band first to play together.',
    };
  }

  // 3. Construct canonical LiveBandSyncPacket for joinSession()
  const packet: LiveBandSyncPacket = {
    id: token.sessionId,
    bandId: token.bandId,
    leaderId: token.leaderId,
    leaderName: token.leaderName,
    songId: token.songId,
    songTitle: token.songTitle,
    action: 'START_SESSION',
    timestamp: now,
    currentLineIdx: 0,
    currentWordIdx: 0,
    currentBeat: 0,
    currentBar: 1,
    bpm: token.bpm,
    barsPerLine: token.barsPerLine,
    autoPlay: false,
    version: now,
    status: 'active',
    songPayload: {
      id: token.songId,
      title: token.songTitle,
      bpm: token.bpm,
      barsPerLine: token.barsPerLine,
    },
  };

  return {
    valid: true,
    token,
    packet,
  };
}
