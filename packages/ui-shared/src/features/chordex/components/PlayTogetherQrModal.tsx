import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useBandStore,
  useSettingsStore,
  useShallow,
  resolveAccent,
  createSessionJoinToken,
  generateQrSvg,
  type SongPreset,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';

interface PlayTogetherQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset?: SongPreset | null;
}

export const PlayTogetherQrModal: React.FC<PlayTogetherQrModalProps> = ({
  isOpen,
  onClose,
  preset,
}) => {
  const { currentBand, currentUserId, currentUserName, activeLiveSession, inviteBandToSession } =
    useBandStore(
      useShallow((s) => ({
        currentBand: s.currentBand,
        currentUserId: s.currentUserId,
        currentUserName: s.currentUserName,
        activeLiveSession: s.activeLiveSession,
        inviteBandToSession: s.inviteBandToSession,
      }))
    );

  const { accentColor, language } = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
    }))
  );

  const accent = resolveAccent(accentColor);
  const isSpanish = language === 'es';

  const [refreshTokenKey, setRefreshTokenKey] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [inviteSent, setInviteSent] = useState<boolean>(false);

  // Generate short-lived join token (5 minutes validity)
  const tokenData = useMemo(() => {
    if (!currentBand?.id) return null;
    const effectiveSessionId = activeLiveSession?.id || `sess-${currentBand.id}`;
    const effectiveSongId = preset?.id || activeLiveSession?.songId || 'session-song';
    const effectiveSongTitle = preset?.name || activeLiveSession?.songTitle || 'Live Rehearsal';

    return createSessionJoinToken({
      bandId: currentBand.id,
      sessionId: effectiveSessionId,
      leaderId: currentUserId || currentBand.leaderId || 'local-leader',
      leaderName: currentUserName || 'Band Leader',
      songId: effectiveSongId,
      songTitle: effectiveSongTitle,
      bpm: preset?.bpm || preset?.speed || activeLiveSession?.bpm || 120,
      barsPerLine: preset?.barsPerLine || activeLiveSession?.barsPerLine || 2,
      durationMs: 300 * 1000, // 5 minutes
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBand?.id, activeLiveSession?.id, preset?.id, preset?.name, refreshTokenKey]);

  // Live countdown timer
  useEffect(() => {
    if (!isOpen || !tokenData) return;
    setSecondsRemaining(300);

    const timer = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((tokenData.token.expiresAt - now) / 1000));
      setSecondsRemaining(diffSec);
      if (diffSec <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, tokenData]);

  const handleRefresh = useCallback(() => {
    setRefreshTokenKey((k) => k + 1);
  }, []);

  const handleSendInvite = useCallback(async () => {
    try {
      await inviteBandToSession(preset || undefined);
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    } catch (_) {}
  }, [inviteBandToSession, preset]);

  if (!isOpen || !tokenData) return null;

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const qrSvg = generateQrSvg(tokenData.encodedString, {
    size: 220,
    margin: 3,
    fgColor: '#090d16',
    bgColor: '#ffffff',
  });

  return (
    <AnimatePresence>
      <div
        data-testid="play-together-qr-modal"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
                <StudioIcon name="qr_code" size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {isSpanish ? 'Código QR de Sesión' : 'Session QR Code'}
                </h3>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {currentBand?.name || 'Live Rehearsal'}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="play-together-qr-close-btn"
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

          {/* QR Code Canvas Card */}
          <div
            style={{
              position: 'relative',
              padding: '12px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              style={{ display: 'block', width: '220px', height: '220px' }}
            />

            {/* Expired Overlay */}
            {isExpired && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(9, 13, 22, 0.92)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  textAlign: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
                  {isSpanish ? 'Código QR Expirado' : 'QR Code Expired'}
                </span>
                <button
                  type="button"
                  data-testid="play-together-qr-refresh-btn"
                  onClick={handleRefresh}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: accent.from,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isSpanish ? 'Generar Nuevo' : 'Generate Fresh'}
                </button>
              </div>
            )}
          </div>

          {/* Validity Countdown Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '14px',
              padding: '4px 12px',
              borderRadius: '12px',
              background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              fontSize: '11.5px',
              fontWeight: 700,
              color: isExpired ? '#f87171' : 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <StudioIcon name={isExpired ? 'timer_off' : 'timer'} size={14} />
            <span>
              {isExpired
                ? isSpanish
                  ? 'Expirado'
                  : 'Expired'
                : isSpanish
                ? `Válido por ${timeFormatted}`
                : `Valid for ${timeFormatted}`}
            </span>
          </div>

          {/* Song info summary */}
          <div
            style={{
              marginTop: '12px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              {tokenData.token.songTitle}
            </span>
            <div
              style={{
                fontSize: '10.5px',
                color: 'rgba(255, 255, 255, 0.45)',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{tokenData.token.bpm} BPM</span>
              <span>•</span>
              <span>{tokenData.token.barsPerLine} b/line</span>
            </div>
          </div>

          {/* Secondary Action: Send in-app toast invite */}
          <button
            type="button"
            data-testid="play-together-qr-send-invite-btn"
            onClick={handleSendInvite}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: inviteSent ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${inviteSent ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <StudioIcon name={inviteSent ? 'check_circle' : 'notifications_active'} size={14} />
            <span>
              {inviteSent
                ? isSpanish
                  ? '¡Invitación Enviada!'
                  : 'Invitation Sent!'
                : isSpanish
                ? 'Enviar Notificación a la Banda'
                : 'Send In-App Invite to Band'}
            </span>
          </button>

          {/* Honest UI & Security note */}
          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: '10px',
              lineHeight: 1.4,
              color: 'rgba(255, 255, 255, 0.38)',
              textAlign: 'center',
            }}
          >
            {isSpanish
              ? 'Token seguro de sesión única. Solo los miembros de la banda pueden unirse. Las notificaciones llegan a quienes tengan la app abierta.'
              : 'Secure single-session token. Only band members can join. In-app notifications reach members who have the app open.'}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
