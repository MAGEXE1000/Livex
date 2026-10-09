import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scrubSensitivePII,
  scrubObjectMetadata,
  createSanitizedErrorEvent,
  initProductionErrorTracker,
  disposeProductionErrorTracker,
  captureException,
  getRecentErrors,
  clearRecentErrors,
  isCrashLoopDetected,
  resetCrashLoopState,
} from '../productionErrorTracker';

describe('Production Error Tracker & Privacy Monitor', () => {
  beforeEach(() => {
    disposeProductionErrorTracker();
    clearRecentErrors();
    resetCrashLoopState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    disposeProductionErrorTracker();
    clearRecentErrors();
    resetCrashLoopState();
    vi.restoreAllMocks();
  });

  describe('PII & Credential Scrubbing (scrubSensitivePII)', () => {
    it('redacts email addresses', () => {
      const input = 'User engineer@livex.studio reported an issue at test.user+stage@band.org';
      const output = scrubSensitivePII(input);
      expect(output).toBe('User [REDACTED_EMAIL] reported an issue at [REDACTED_EMAIL]');
    });

    it('redacts Bearer and standalone JWT tokens', () => {
      const header = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const scrubbedHeader = scrubSensitivePII(header);
      expect(scrubbedHeader).toContain('Bearer [REDACTED_TOKEN]');
      expect(scrubbedHeader).not.toContain('eyJhbGci');

      const standalone = 'Session token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const scrubbedStandalone = scrubSensitivePII(standalone);
      expect(scrubbedStandalone).toContain('[REDACTED_JWT]');
    });

    it('redacts API keys for Firebase, Groq, OpenAI, and Anthropic', () => {
      const firebaseKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
      const groqKey = 'gsk_123456789012345678901234567890123456789012345678';
      const openaiKey = 'sk-proj-abc123xyz78901234567890abcdefgh';
      const anthropicKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890';

      const log = `Keys: ${firebaseKey}, ${groqKey}, ${openaiKey}, ${anthropicKey}`;
      const scrubbed = scrubSensitivePII(log);

      expect(scrubbed).toContain('[REDACTED_FIREBASE_KEY]');
      expect(scrubbed).toContain('[REDACTED_GROQ_KEY]');
      expect(scrubbed).toContain('[REDACTED_SECRET_KEY]');
      expect(scrubbed).not.toContain(firebaseKey);
      expect(scrubbed).not.toContain(groqKey);
      expect(scrubbed).not.toContain(openaiKey);
      expect(scrubbed).not.toContain(anthropicKey);
    });

    it('redacts Windows and Unix local user filesystem paths', () => {
      const windowsPath = 'Error at C:\\Users\\Mauren\\Documents\\Livex\\src\\index.ts:42';
      const unixPath = 'Error at /Users/sarah/Documents/Livex/src/index.ts:15';
      const linuxPath = 'Error at /home/deployer/livex/build.sh:10';

      expect(scrubSensitivePII(windowsPath)).toBe('Error at C:\\Users\\[REDACTED_USER]\\Documents\\Livex\\src\\index.ts:42');
      expect(scrubSensitivePII(unixPath)).toBe('Error at /Users/[REDACTED_USER]/Documents/Livex/src/index.ts:15');
      expect(scrubSensitivePII(linuxPath)).toBe('Error at /home/[REDACTED_USER]/livex/build.sh:10');
    });

    it('redacts audio and image data URLs', () => {
      const audioUrl = 'Playback buffer: data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA= loaded';
      const imageUrl = 'Avatar: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII= loaded';

      expect(scrubSensitivePII(audioUrl)).toBe('Playback buffer: [REDACTED_AUDIO_DATAURL] loaded');
      expect(scrubSensitivePII(imageUrl)).toBe('Avatar: [REDACTED_IMAGE_DATAURL] loaded');
    });

    it('redacts sensitive query parameter values', () => {
      const url = 'https://api.livex.app/sync?token=sec_12345&mode=room&apiKey=ak_98765&other=public';
      const scrubbed = scrubSensitivePII(url);
      expect(scrubbed).toBe('https://api.livex.app/sync?token=[REDACTED]&mode=room&apiKey=[REDACTED]&other=public');
    });
  });

  describe('Object Metadata Sanitization (scrubObjectMetadata)', () => {
    it('recursively scrubs objects and redacts secret field keys', () => {
      const meta = {
        userId: 'usr_123',
        userEmail: 'dev@livex.studio',
        authToken: 'Bearer secret_value',
        credentials: {
          clientSecret: 'super_secret',
          passwordHash: 'hash123',
        },
        payload: {
          audioUrl: 'data:audio/mp3;base64,SUQzBAAAAA...',
          trackName: 'Live Intro',
        },
      };

      const scrubbed = scrubObjectMetadata(meta);

      expect(scrubbed.userId).toBe('usr_123');
      expect(scrubbed.userEmail).toBe('[REDACTED_EMAIL]');
      expect(scrubbed.authToken).toBe('[REDACTED_SECRET_FIELD]');
      expect(scrubbed.credentials).toBe('[REDACTED_SECRET_FIELD]');
      expect(scrubbed.payload.audioUrl).toBe('[REDACTED_AUDIO_DATAURL]');
      expect(scrubbed.payload.trackName).toBe('Live Intro');
    });
  });

  describe('Event Creation and Fingerprinting', () => {
    it('creates structured sanitized error event from Error instance', () => {
      const err = new Error('Database connection to C:\\Users\\Admin\\db failed for test@band.com');
      const event = createSanitizedErrorEvent(err, 'manual', { room: 'alpha' }, { platform: 'web' });

      expect(event.name).toBe('Error');
      expect(event.message).toBe('Database connection to C:\\Users\\[REDACTED_USER]\\db failed for [REDACTED_EMAIL]');
      expect(event.platform).toBe('web');
      expect(event.fingerprint).toBeDefined();
      expect(event.fingerprint.length).toBe(8);
      expect(event.source).toBe('manual');
      expect(event.context?.room).toBe('alpha');
    });

    it('handles non-Error objects gracefully', () => {
      const stringErr = createSanitizedErrorEvent('Raw error message', 'server');
      expect(stringErr.message).toBe('Raw error message');

      const objErr = createSanitizedErrorEvent({ code: 500, detail: 'Failed' }, 'server');
      expect(objErr.message).toContain('Failed');
    });
  });

  describe('Crash Loop Protection & Safe Mode', () => {
    it('detects crash loops after 3 errors within the window and triggers callback', () => {
      const onCrashLoopSpy = vi.fn();
      initProductionErrorTracker({ onCrashLoop: onCrashLoopSpy });

      expect(isCrashLoopDetected()).toBe(false);

      captureException(new Error('Crash 1'));
      expect(isCrashLoopDetected()).toBe(false);

      captureException(new Error('Crash 2'));
      expect(isCrashLoopDetected()).toBe(false);

      captureException(new Error('Crash 3'));
      expect(isCrashLoopDetected()).toBe(true);
      expect(onCrashLoopSpy).toHaveBeenCalledTimes(1);

      // Verify global safe-mode flags are set
      if (typeof window !== 'undefined') {
        expect((window as any).studioTransitionActive).toBe(false);
        expect((window as any).__livex_crash_loop_detected).toBe(true);
      }

      // Reset works cleanly
      resetCrashLoopState();
      expect(isCrashLoopDetected()).toBe(false);
    });
  });

  describe('Ring Buffer Capacity & Local Diagnostics', () => {
    it('caps in-memory buffer at 20 items and maintains FIFO order', () => {
      for (let i = 0; i < 25; i++) {
        captureException(new Error(`Error ${i}`));
      }

      const recent = getRecentErrors();
      expect(recent.length).toBe(20);
      // Most recent should be at the head
      expect(recent[0].message).toBe('Error 24');
      expect(recent[19].message).toBe('Error 5');

      clearRecentErrors();
      expect(getRecentErrors().length).toBe(0);
    });
  });

  describe('Offline & Network Resilience', () => {
    it('does not throw or produce unhandled rejections when fetch rejects', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline / DNS resolution failed'));
      globalThis.fetch = mockFetch;

      initProductionErrorTracker({ endpointUrl: 'https://telemetry.livex.app/errors' });

      // Should complete synchronously without throwing
      expect(() => {
        captureException(new Error('Test offline resilience'));
      }).not.toThrow();

      // Buffer still recorded event
      expect(getRecentErrors().length).toBe(1);
    });
  });
});
