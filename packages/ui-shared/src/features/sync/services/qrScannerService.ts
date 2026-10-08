import jsQR from 'jsqr';
import { parseStageRoomToken } from '@workspace/livex-core';

export interface QrScannerOptions {
  intervalMs?: number;
  inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  maxDimension?: number;
}

/**
 * Reusable off-screen canvas context for frame snapshotting.
 */
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvasContext(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!sharedCtx) return null;
  return { canvas: sharedCanvas, ctx: sharedCtx };
}

/**
 * Scans a single video frame for a QR code using jsQR with optional BarcodeDetector fallback.
 */
export function scanFrameFromVideo(
  video: HTMLVideoElement,
  options?: { maxDimension?: number; inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
): string | null {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }

  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (vWidth <= 0 || vHeight <= 0) {
    return null;
  }

  const canvasContext = getSharedCanvasContext();
  if (!canvasContext) return null;

  const { canvas, ctx } = canvasContext;
  const maxDim = options?.maxDimension || 720;

  // Scale down high-res video frames to cap CPU load on mobile WebView
  let targetWidth = vWidth;
  let targetHeight = vHeight;
  if (vWidth > maxDim || vHeight > maxDim) {
    const scale = Math.min(maxDim / vWidth, maxDim / vHeight);
    targetWidth = Math.floor(vWidth * scale);
    targetHeight = Math.floor(vHeight * scale);
  }

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  try {
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const qrResult = jsQR(imageData.data, targetWidth, targetHeight, {
      inversionAttempts: options?.inversionAttempts || 'attemptBoth',
    });

    if (qrResult && qrResult.data) {
      return qrResult.data;
    }
  } catch (err) {
    console.debug('[QRScannerService] Frame grab failed:', err);
  }

  return null;
}

/**
 * Starts a hardware-accelerated scanning loop that analyzes video frames at an optimal interval.
 * Returns a cleanup callback that terminates the scanning loop.
 */
export function startScanningLoop(
  video: HTMLVideoElement,
  onResult: (decodedText: string) => void,
  options?: QrScannerOptions
): () => void {
  let isScanning = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const interval = options?.intervalMs ?? 150;

  const tick = async () => {
    if (!isScanning) return;

    // Fast-path: Native BarcodeDetector if available on Chromium
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0 && barcodes[0]?.rawValue) {
          onResult(barcodes[0].rawValue);
          return;
        }
      } catch (_) {
        // Fall back to software jsQR
      }
    }

    // Standard high-compatibility software decoding with jsQR
    const detected = scanFrameFromVideo(video, options);
    if (detected) {
      onResult(detected);
      return;
    }

    if (isScanning) {
      timerId = setTimeout(tick, interval);
    }
  };

  // Launch initial frame scan
  timerId = setTimeout(tick, interval);

  return () => {
    isScanning = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
}

/**
 * Initializes and binds the hardware camera video stream to a target HTMLVideoElement.
 */
export async function startHardwareCamera(
  videoElement: HTMLVideoElement,
  constraints?: MediaTrackConstraints
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access not supported on this device/browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      ...constraints,
    },
    audio: false,
  });

  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('webkit-playsinline', 'true');
  videoElement.muted = true;
  await videoElement.play().catch(() => {});

  return stream;
}

/**
 * Safely stops all active tracks on a MediaStream and releases video element binding.
 */
export function stopCameraStream(
  stream: MediaStream | null,
  videoElement?: HTMLVideoElement | null
): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (_) {}
    });
  }
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject = null;
  }
}

/**
 * Resolves a scanned or manually entered string into a normalized Livex room code (e.g., "LX-7M8").
 */
export function resolveLivexRoomCode(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const parsed = parseStageRoomToken(input);
  return parsed?.roomId || null;
}
