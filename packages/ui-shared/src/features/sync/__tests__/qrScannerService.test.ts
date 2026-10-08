import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveLivexRoomCode,
  stopCameraStream,
  scanFrameFromVideo,
  startScanningLoop,
} from '../services/qrScannerService';

describe('QR Scanner Service', () => {
  describe('resolveLivexRoomCode', () => {
    it('resolves raw join codes with or without LX- prefix', () => {
      expect(resolveLivexRoomCode('LX-7M8')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('7M8')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('lx-7m8')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('408')).toBe('LX-408');
    });

    it('resolves livex://room/ URL schemes', () => {
      expect(resolveLivexRoomCode('livex://room/LX-7M8')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('livex://room/7M8')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('livex://room/LX-7M8?auth=1')).toBe('LX-7M8');
    });

    it('resolves JSON encoded payloads', () => {
      expect(resolveLivexRoomCode('{"roomId":"LX-7M8"}')).toBe('LX-7M8');
      expect(resolveLivexRoomCode('{"r":"LX-7M8"}')).toBe('LX-7M8');
    });

    it('returns null for empty or invalid strings', () => {
      expect(resolveLivexRoomCode('')).toBeNull();
      expect(resolveLivexRoomCode('random-non-matching-payload-string')).toBeNull();
    });
  });

  describe('stopCameraStream', () => {
    it('stops all tracks and clears video srcObject', () => {
      const stopTrack1 = vi.fn();
      const stopTrack2 = vi.fn();

      const mockStream = {
        getTracks: () => [
          { stop: stopTrack1 },
          { stop: stopTrack2 },
        ],
      } as unknown as MediaStream;

      const mockVideo = {
        srcObject: mockStream,
      } as unknown as HTMLVideoElement;

      stopCameraStream(mockStream, mockVideo);

      expect(stopTrack1).toHaveBeenCalledTimes(1);
      expect(stopTrack2).toHaveBeenCalledTimes(1);
      expect(mockVideo.srcObject).toBeNull();
    });

    it('handles null stream and null video without throwing', () => {
      expect(() => stopCameraStream(null, null)).not.toThrow();
    });
  });

  describe('scanFrameFromVideo', () => {
    it('returns null when video element is not ready or has zero dimensions', () => {
      const mockVideo = {
        readyState: 0, // HAVE_NOTHING
        videoWidth: 0,
        videoHeight: 0,
      } as unknown as HTMLVideoElement;

      expect(scanFrameFromVideo(mockVideo)).toBeNull();
    });
  });

  describe('startScanningLoop', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('invokes callback and terminates cleanly on stop', () => {
      const onResult = vi.fn();
      const mockVideo = {
        readyState: 0,
        videoWidth: 0,
        videoHeight: 0,
      } as unknown as HTMLVideoElement;

      const stop = startScanningLoop(mockVideo, onResult, { intervalMs: 100 });

      vi.advanceTimersByTime(250);
      expect(onResult).not.toHaveBeenCalled();

      stop();
      vi.advanceTimersByTime(500);
      expect(onResult).not.toHaveBeenCalled();
    });
  });
});
