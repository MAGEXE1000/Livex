import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraOff, X, QrCode, ArrowRight } from 'lucide-react';
import {
  useLocalStageSyncStore,
  requestCameraPermission,
} from '@workspace/livex-core';
import {
  startScanningLoop,
  resolveLivexRoomCode,
} from './services/qrScannerService';

export interface ScanSessionQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (roomId: string) => void;
}

export const ScanSessionQRModal: React.FC<ScanSessionQRModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const joinRoom = useLocalStageSyncStore((s) => s.joinRoom);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanningLoopRef = useRef<(() => void) | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  // Helper to release camera hardware tracks immediately
  const releaseCamera = useCallback(() => {
    if (stopScanningLoopRef.current) {
      stopScanningLoopRef.current();
      stopScanningLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Handle successful resolution of room code from QR or manual input
  const handleJoinResolvedCode = useCallback(
    (targetRoomId: string) => {
      if (isJoining) return;
      setIsJoining(true);
      setJoinErrorMessage(null);

      // Trigger tactile haptic feedback pulse
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (_) {}

      // Release camera hardware prior to transition
      releaseCamera();

      const success = joinRoom(targetRoomId);
      if (success) {
        if (onSuccess) {
          onSuccess(targetRoomId);
        }
        onClose();
      } else {
        setIsJoining(false);
        setJoinErrorMessage(`Could not connect to stage room "${targetRoomId}".`);
      }
    },
    [isJoining, joinRoom, onSuccess, onClose, releaseCamera]
  );

  // Handle QR detection from scanning loop
  const handleDetectedQr = useCallback(
    (decodedText: string) => {
      const resolvedRoomId = resolveLivexRoomCode(decodedText);
      if (resolvedRoomId) {
        handleJoinResolvedCode(resolvedRoomId);
      }
    },
    [handleJoinResolvedCode]
  );

  // Camera stream lifecycle
  useEffect(() => {
    if (!isOpen) {
      releaseCamera();
      setManualCode('');
      setJoinErrorMessage(null);
      setCameraErrorMessage(null);
      setIsJoining(false);
      return;
    }

    let isMounted = true;

    async function initCameraHardware() {
      setIsCameraActive(false);
      setCameraErrorMessage(null);

      const hasPermission = await requestCameraPermission();
      if (!isMounted) return;

      if (!hasPermission) {
        setCameraErrorMessage('Camera permission denied. Use manual room code below.');
        setIsCameraActive(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraErrorMessage('Camera hardware not supported on this device.');
        setIsCameraActive(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});

          if (!isMounted) return;
          setIsCameraActive(true);

          stopScanningLoopRef.current = startScanningLoop(videoRef.current, (payload) => {
            handleDetectedQr(payload);
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setCameraErrorMessage('Camera permission denied. Use manual room code below.');
        setIsCameraActive(false);
      }
    }

    initCameraHardware();

    return () => {
      isMounted = false;
      releaseCamera();
    };
  }, [isOpen, releaseCamera, handleDetectedQr]);

  if (!isOpen) return null;

  const isManualCodeValid = manualCode.trim().length >= 6;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManualCodeValid || isJoining) return;

    const resolved = resolveLivexRoomCode(manualCode.trim());
    if (resolved) {
      handleJoinResolvedCode(resolved);
    } else {
      setJoinErrorMessage(`Invalid room code pattern: "${manualCode.trim()}".`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-session-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0a0d14] border border-white/15 shadow-2xl p-5 flex flex-col gap-4 text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 id="scan-session-qr-title" className="text-sm font-bold text-white tracking-tight">
                Scan Session QR
              </h2>
              <p className="text-[11px] text-neutral-400">Point at the stage host's QR code</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-qr-scanner"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Viewfinder */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            autoPlay
            playsInline
            muted
          />

          {!isCameraActive && (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <CameraOff className="w-8 h-8 text-neutral-500" />
              <p className="text-xs text-neutral-400">
                {cameraErrorMessage || 'Initializing camera...'}
              </p>
            </div>
          )}

          <div className="absolute inset-0 border-2 border-white/30 rounded-xl m-6 pointer-events-none animate-pulse" />
        </div>

        {/* Join Error Banner */}
        {joinErrorMessage && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs text-center font-medium">
            {joinErrorMessage}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
            or enter code
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Manual Code Input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            data-testid="input-manual-room-token"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="Paste token or link..."
            maxLength={32}
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white/5 border border-white/15 font-mono text-xs uppercase font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
          />
          <button
            type="submit"
            data-testid="btn-manual-join-submit"
            disabled={!isManualCodeValid || isJoining}
            className={`min-h-[44px] px-5 rounded-xl font-semibold text-xs tracking-tight transition-all shrink-0 flex items-center gap-1.5 ${
              isManualCodeValid && !isJoining
                ? 'bg-white text-black hover:bg-neutral-200 active:scale-95'
                : 'bg-white/10 text-neutral-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>{isJoining ? 'Joining...' : 'Join'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
