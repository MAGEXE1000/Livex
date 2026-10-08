import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useBandStore,
  useChordStore,
  useSettingsStore,
  useShallow,
  resolveAccent,
  parseSessionJoinToken,
  validateSessionJoinToken,
  NavigationDispatcher,
  requestCameraPermission,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { startScanningLoop } from '../../sync/services/qrScannerService';

interface PlayTogetherScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayTogetherScannerModal: React.FC<PlayTogetherScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentBand, userBands, joinSession } = useBandStore(
    useShallow((s) => ({
      currentBand: s.currentBand,
      userBands: s.userBands,
      joinSession: s.joinSession,
    }))
  );

  const setActivePreset = useChordStore((s) => s.setActivePreset);

  const { accentColor, language } = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
    }))
  );

  const accent = resolveAccent(accentColor);
  const isSpanish = language === 'es';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      if (typeof scanIntervalRef.current === 'function') {
        scanIntervalRef.current();
      } else {
        clearInterval(scanIntervalRef.current);
      }
      scanIntervalRef.current = null;
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
  }, []);

  const handleSuccessfulTokenScan = useCallback(
    async (rawString: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setErrorMessage(null);

      const parsedToken = parseSessionJoinToken(rawString);
      const userBandIds = userBands.map((b) => b.id);
      if (currentBand?.id && !userBandIds.includes(currentBand.id)) {
        userBandIds.push(currentBand.id);
      }

      const validation = validateSessionJoinToken(parsedToken, userBandIds, Date.now());

      if (!validation.valid) {
        setIsProcessing(false);
        if (validation.error === 'expired') {
          setErrorMessage(
            isSpanish
              ? 'Este código QR ha expirado. Pide al líder que muestre un código nuevo.'
              : 'This QR code has expired. Please ask the leader for a fresh code.'
          );
        } else if (validation.error === 'not_member') {
          setErrorMessage(
            isSpanish
              ? 'Acceso denegado: No eres miembro de esta banda. Solo los miembros pueden unirse a "Tocar Juntos".'
              : 'Access denied: You are not a member of this band. Only band members can join Play Together sessions.'
          );
        } else {
          setErrorMessage(
            isSpanish
              ? 'Código QR no reconocido como sesión de Livex.'
              : 'Unrecognized QR code. Not a valid Livex session token.'
          );
        }
        return;
      }

      // Valid session token: Join via the single canonical joinSession()
      try {
        stopCamera();

        // 1. Resolve local preset if owned
        const targetId = validation.packet.songId;
        const presets = useChordStore.getState().presets;
        const existing = presets.find(
          (p) => p.id === targetId || p.name.toLowerCase() === validation.packet.songTitle.toLowerCase()
        );
        if (existing) {
          setActivePreset(existing.id);
        }

        // 2. Canonical join session invocation
        await joinSession(validation.packet);

        // 3. Dispatch spectator navigation
        try {
          sessionStorage.setItem('livex_auto_open_live', targetId || 'session');
        } catch (_) {}

        window.dispatchEvent(
          new CustomEvent('livex:open-live-spectator', { detail: { songId: targetId } })
        );
        NavigationDispatcher.push({ app: 'chordex', page: 'songs' });

        onClose();
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err?.message || 'Error joining session');
      }
    },
    [isProcessing, userBands, currentBand?.id, isSpanish, stopCamera, setActivePreset, joinSession, onClose]
  );

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraState('idle');
      setErrorMessage(null);
      setIsProcessing(false);
      return;
    }

    let isMounted = true;
    setCameraState('requesting');
    setErrorMessage(null);

    async function initCamera() {
      if (isMounted) setCameraState('requesting');
      setErrorMessage(null);

      // 1. Check and request native camera permission on Android Capacitor
      const hasPermission = await requestCameraPermission();
      if (!isMounted) return;
      if (!hasPermission) {
        setCameraState('denied');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        if (isMounted) setCameraState('unsupported');
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
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }

        setCameraState('active');

        // Setup hardware-accelerated QR scanning loop with jsQR
        if (videoRef.current) {
          scanIntervalRef.current = startScanningLoop(videoRef.current, (detected) => {
            handleSuccessfulTokenScan(detected);
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraState('denied');
        } else {
          setCameraState('unsupported');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, stopCamera, handleSuccessfulTokenScan, retryTrigger]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        data-testid="play-together-scanner-modal"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '380px',
            background: 'var(--c-bg-card, #121826)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: `${accent.from}22`,
                  color: accent.from,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StudioIcon name="qr_code_scanner" size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {isSpanish ? 'Escanear Código de Sesión' : 'Scan Session QR'}
                </h3>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {isSpanish ? 'Apuntar al código del líder' : "Point at the leader's screen"}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="play-together-scanner-close-btn"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <StudioIcon name="close" size={16} />
            </button>
          </div>

          {/* Viewfinder Video / State Surface */}
          <div
            style={{
              width: '100%',
              height: '240px',
              borderRadius: '20px',
              background: '#070a10',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraState === 'active' ? 'block' : 'none',
              }}
              autoPlay
              playsInline
              muted
            />

            {/* Aiming Reticle Overlay */}
            {cameraState === 'active' && (
              <div
                style={{
                  position: 'absolute',
                  width: '160px',
                  height: '160px',
                  border: `2px solid ${accent.from}`,
                  borderRadius: '16px',
                  boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 16px ${accent.from}66`,
                  pointerEvents: 'none',
                }}
              />
            )}

            {cameraState === 'requesting' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded animate-spin" style={{ fontSize: '28px', color: accent.from }}>
                  progress_activity
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {isSpanish ? 'Iniciando cámara...' : 'Starting camera...'}
                </span>
              </div>
            )}

            {cameraState === 'denied' && (
              <div
                data-testid="camera-permission-denied-card"
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StudioIcon name="no_photography" size={22} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                  {isSpanish ? 'Permiso de Cámara Requerido' : 'Camera Permission Required'}
                </span>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                  {isSpanish
                    ? 'Permite el acceso a la cámara para escanear el código QR o ingresa el código manual abajo.'
                    : 'Please allow camera access to scan the QR code or enter the code manually below.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setRetryTrigger((c) => c + 1)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '12px',
                      background: accent.from,
                      color: (accent as any).contrast || 'var(--studio-accent-contrast, #09090b)',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {isSpanish ? 'Reintentar' : 'Retry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => manualInputRef.current?.focus()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                    }}
                  >
                    {isSpanish ? 'Código manual' : 'Manual Code'}
                  </button>
                </div>
              </div>
            )}

            {cameraState === 'unsupported' && (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <StudioIcon name="videocam_off" size={24} />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
                  {isSpanish ? 'Cámara no disponible' : 'Camera unavailable'}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {isSpanish ? 'Usa la entrada de token manual abajo' : 'Use manual token input below'}
                </span>
                <button
                  type="button"
                  onClick={() => manualInputRef.current?.focus()}
                  style={{
                    marginTop: '6px',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                  }}
                >
                  {isSpanish ? 'Ingresar código manual' : 'Enter Code Manually'}
                </button>
              </div>
            )}
          </div>

          {/* Prominent Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '11.5px',
                fontWeight: 600,
                lineHeight: 1.35,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <StudioIcon name="error" size={16} />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Manual Token / Paste Fallback */}
          <div style={{ width: '100%', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={isSpanish ? 'Pegar token o enlace...' : 'Paste token or link...'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                data-testid="play-together-scanner-submit-btn"
                disabled={!manualCode.trim() || isProcessing}
                onClick={() => handleSuccessfulTokenScan(manualCode)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: accent.from,
                  border: 'none',
                  color: accent.contrast || 'var(--studio-accent-contrast, #09090b)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: !manualCode.trim() || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: !manualCode.trim() || isProcessing ? 0.5 : 1,
                }}
              >
                {isSpanish ? 'Unirse' : 'Join'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
