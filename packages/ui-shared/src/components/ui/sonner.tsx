import React, { useEffect, useCallback } from 'react';
import { useSonner, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore, useShallow, resolveAccent } from '@workspace/livex-core';
import { StudioIcon } from '../../shared/icons/StudioIcon';

export interface ToastCustomData {
  type?: 'live' | 'member_joined' | 'success' | 'info' | 'error';
  songTitle?: string;
  songId?: string;
  leaderName?: string;
  isCallBand?: boolean;
  memberName?: string;
  memberRole?: string;
  onJoin?: () => void;
  [key: string]: any;
}

export const Toaster: React.FC = () => {
  const { toasts } = useSonner();
  const { accentColor, language, theme, amoledMode } = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
    }))
  );

  const accent = resolveAccent(accentColor);
  const isSpanish = language === 'es';
  const isLight = theme === 'light';
  const isAmoled = !isLight && Boolean(amoledMode);

  // Display the most recent active toast
  const activeToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;

  // Auto-dismiss after 5 seconds (or custom duration)
  useEffect(() => {
    if (!activeToast) return;
    const duration = (activeToast as any).duration || 5000;
    const timer = setTimeout(() => {
      toast.dismiss(activeToast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeToast?.id]);

  const handleDismiss = useCallback(() => {
    if (activeToast) {
      toast.dismiss(activeToast.id);
    }
  }, [activeToast]);

  const rawData = (activeToast as any)?.data;
  const customData = (typeof rawData === 'object' && rawData !== null
    ? { ...(activeToast as any), ...rawData }
    : (activeToast as any)) as ToastCustomData | undefined;

  const isLiveToast = (activeToast as any)?.type === 'live' || customData?.type === 'live' || Boolean(customData?.isCallBand);
  const isMemberJoinedToast = (activeToast as any)?.type === 'member_joined' || customData?.type === 'member_joined';
  const isError = activeToast?.type === 'error' || customData?.type === 'error';
  const isSuccess = activeToast?.type === 'success' || customData?.type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="wait">
        {activeToast && (
          <motion.div
            key={String(activeToast.id)}
            data-testid={
              isLiveToast
                ? 'band-live-sync-top-toast'
                : isMemberJoinedToast
                ? 'band-member-joined-toast'
                : 'canonical-docked-toast'
            }
            role="alert"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (
                Math.abs(info.offset.x) > 60 ||
                info.offset.y > 40 ||
                Math.abs(info.velocity.x) > 400 ||
                info.velocity.y > 300
              ) {
                handleDismiss();
              }
            }}
            style={{
              pointerEvents: 'auto',
              minHeight: '48px',
              borderRadius: '24px',
              padding: '6px 10px 6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              width: '100%',
              background: isLight
                ? 'rgba(255, 255, 255, 0.94)'
                : isAmoled
                ? 'rgba(0, 0, 0, 0.96)'
                : 'rgba(24, 24, 27, 0.92)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.12)'
                : isAmoled
                ? '1px solid rgba(255, 255, 255, 0.22)'
                : '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: isLight
                ? '0 10px 30px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.2)'
                : '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 0, 0, 0.3)',
              boxSizing: 'border-box',
              color: isLight ? '#0f172a' : '#ffffff',
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            {/* Left Content / Icon */}
            {isLiveToast ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    boxShadow: '0 0 10px #22c55e',
                    flexShrink: 0,
                    animation: 'live-dot-pulse 1.2s infinite',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: customData?.isCallBand ? accent.from : '#22c55e',
                    }}
                  >
                    {customData?.isCallBand
                      ? isSpanish
                        ? 'Llamado de Banda'
                        : 'Band Call'
                      : isSpanish
                      ? 'En Vivo • Banda'
                      : 'Live • Band Rehearsal'}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isLight ? '#0f172a' : '#ffffff',
                    }}
                  >
                    {customData?.isCallBand
                      ? isSpanish
                        ? `${customData.leaderName || 'Líder'} llamó para ${customData.songTitle}`
                        : `${customData.leaderName || 'Band Leader'} called for ${customData.songTitle}`
                      : isSpanish
                      ? `Tocando: ${customData?.songTitle}`
                      : `Playing: ${customData?.songTitle}`}
                  </span>
                </div>
              </div>
            ) : isMemberJoinedToast ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: `${accent.from}22`,
                    border: `1px solid ${accent.from}44`,
                    color: accent.from,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StudioIcon name="person_add" size={15} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: accent.from,
                    }}
                  >
                    {isSpanish ? 'Nuevo Integrante' : 'Member Joined'}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isLight ? '#0f172a' : '#ffffff',
                    }}
                  >
                    {isSpanish
                      ? `${customData?.memberName} se unió a la banda`
                      : `${customData?.memberName} joined the band`}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isError
                      ? 'rgba(239, 68, 68, 0.15)'
                      : isSuccess
                      ? 'rgba(34, 197, 94, 0.15)'
                      : `${accent.from}20`,
                    color: isError ? '#ef4444' : isSuccess ? '#22c55e' : accent.from,
                    border: `1px solid ${
                      isError
                        ? 'rgba(239, 68, 68, 0.3)'
                        : isSuccess
                        ? 'rgba(34, 197, 94, 0.3)'
                        : `${accent.from}40`
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StudioIcon
                    name={isError ? 'error' : isSuccess ? 'check_circle' : 'info'}
                    size={15}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isLight ? '#0f172a' : '#ffffff',
                    }}
                  >
                    {String(activeToast.title || activeToast.description || '')}
                  </span>
                </div>
              </div>
            )}

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {isLiveToast && customData?.onJoin && (
                <button
                  type="button"
                  data-testid="band-live-toast-join-btn"
                  onClick={() => {
                    handleDismiss();
                    customData.onJoin?.();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 14px',
                    borderRadius: '16px',
                    background: accent.from,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    boxShadow: `0 2px 10px ${accent.from}44`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <StudioIcon name="play_arrow" size={13} />
                  <span>{isSpanish ? 'Unirse' : 'Join'}</span>
                </button>
              )}

              <button
                type="button"
                data-testid="band-live-toast-dismiss-btn"
                onClick={handleDismiss}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={isSpanish ? 'Descartar' : 'Dismiss'}
              >
                <StudioIcon name="close" size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const showLiveToast = (
  message: string,
  options: {
    duration?: number;
    songTitle?: string;
    songId?: string;
    leaderName?: string;
    isCallBand?: boolean;
    onJoin?: () => void;
  }
) => {
  return (toast as any)(message, {
    duration: options.duration || 5000,
    type: 'live',
    ...options,
    data: {
      type: 'live',
      ...options,
    },
  });
};

export const showMemberJoinedToast = (
  message: string,
  options: {
    duration?: number;
    memberName?: string;
    memberRole?: string;
  }
) => {
  return (toast as any)(message, {
    duration: options.duration || 4000,
    type: 'member_joined',
    ...options,
    data: {
      type: 'member_joined',
      ...options,
    },
  });
};

if (typeof window !== 'undefined') {
  (window as any).__LIVEX_TOAST__ = { toast, showLiveToast, showMemberJoinedToast };
}

export { toast };
