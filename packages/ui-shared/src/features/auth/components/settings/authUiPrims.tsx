import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  BackDispatcher,
  revokeDeviceSession,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';
import { activeOverlaysRegistry } from '../../../../shared/design-system/dialogs';

export const CLOUD_SYNC_FEATURE_ENABLED = false;

export const codeBreakStyle = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
} as const;

export function prettyErr(e: unknown, lang: string): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? 'Unknown error';
  const es = lang === 'es';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return es ? 'Email o contraseña incorrectos' : 'Wrong email or password';
  }
  if (code === 'auth/email-already-in-use')
    return es ? 'Ese email ya está registrado' : 'Email already registered';
  if (code === 'auth/weak-password')
    return es ? 'La contraseña es muy débil (mín. 6)' : 'Password too weak (min 6 chars)';
  if (code === 'auth/invalid-email') return es ? 'Email no válido' : 'Invalid email';
  if (code === 'auth/network-request-failed') return es ? 'Sin conexión' : 'Network error';
  if (code === 'auth/unauthorized-domain')
    return es
      ? 'Este dominio no está autorizado en Firebase'
      : 'This domain is not authorized in Firebase';
  if (code === 'auth/native-developer-error') {
    return es
      ? 'Esta build de la app no está autorizada por Google. La huella SHA-1 de esta APK no está registrada en Firebase. Mientras tanto, regístrate o inicia sesión con email aquí abajo — el sync funciona igual.'
      : "This build is not authorised by Google. The APK's SHA-1 fingerprint is not registered in Firebase. In the meantime, sign in with email below — sync works the same way.";
  }
  if (code === 'auth/native-sign-in-failed') {
    return es
      ? 'Google rechazó el inicio de sesión. Revisa que tengas Google Play Services al día e intenta de nuevo, o usa email.'
      : 'Google rejected the sign-in. Make sure Google Play Services is up to date and retry, or use email.';
  }
  if (code === 'auth/native-internal-error') {
    return es
      ? 'Error interno de Google Sign-In. Intenta de nuevo en un momento.'
      : 'Google Sign-In internal error. Try again in a moment.';
  }
  if (code === 'auth/native-sign-in-currently-in-progress') {
    return es ? 'Ya hay un inicio de sesión en curso.' : 'A sign-in is already in progress.';
  }
  if (/^\s*10[:\s]/.test(msg) || /DEVELOPER_ERROR/i.test(msg)) {
    return es
      ? 'Esta build no está autorizada por Google (SHA-1 no registrado en Firebase). Usa email para entrar — el sync funciona igual.'
      : 'This build is not authorised by Google (SHA-1 not registered in Firebase). Sign in with email — sync works the same way.';
  }
  if (/^\s*12501[:\s]/.test(msg)) {
    return es ? 'Cancelado' : 'Cancelled';
  }
  if (/^\s*12500[:\s]/.test(msg) || /SIGN_IN_FAILED/i.test(msg)) {
    return es
      ? 'Google rechazó el inicio de sesión. Revisa Google Play Services o usa email.'
      : 'Google rejected the sign-in. Check Google Play Services or use email.';
  }
  if (/^\s*7[:\s]/.test(msg)) {
    return es ? 'Sin conexión a Google' : 'Network error reaching Google';
  }
  if (/^\s*8[:\s]/.test(msg) || /INTERNAL_ERROR/i.test(msg)) {
    return es
      ? 'Error interno de Google Sign-In. Intenta de nuevo.'
      : 'Google Sign-In internal error. Try again.';
  }
  if (/^\s*12502[:\s]/.test(msg)) {
    return es ? 'Ya hay un inicio de sesión en curso.' : 'A sign-in is already in progress.';
  }
  return msg;
}

export function SyncAnimations() {
  return (
    <style>{`
      @keyframes sync-pop-kf {
        0%   { transform: scale(0.6); opacity: 0.4; }
        50%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1);   opacity: 1; }
      }
      @keyframes sync-fade-in {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .sync-icon { display: inline-block; transform-origin: center; }
      .sync-pop  { animation: sync-pop-kf 600ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    `}</style>
  );
}

export function SheetHeader({
  title,
  onClose,
  titleColor,
}: {
  title: string;
  onClose: () => void;
  accent?: { from: string; to: string };
  titleColor?: string;
}) {
  return (
    <div
      style={{
        padding: '14px 22px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--studio-font-body)',
          fontWeight: 800,
          fontSize: 18,
          color: titleColor ?? 'var(--c-text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </p>
      <button
        onClick={onClose}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-secondary)',
          transition: 'all 150ms ease',
        }}
        aria-label="close"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          close
        </span>
      </button>
    </div>
  );
}

interface ProfileMorphModalProps {
  id?: string;
  isOpen: boolean;
  title?: string;
  titleColor?: string;
  onClose: () => void;
  originRect?: DOMRect | null;
  children: React.ReactNode;
  isWebDesktop?: boolean;
  isAmoled?: boolean;
  isLight?: boolean;
  maxWidth?: number | string;
}

export function ProfileMorphModal({
  id = 'profile-sheet',
  isOpen,
  title,
  titleColor,
  onClose,
  originRect,
  children,
  isWebDesktop = false,
  isAmoled = false,
  isLight = false,
  maxWidth,
}: ProfileMorphModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const overlayId = id || Math.random().toString();
    activeOverlaysRegistry.register('sheet', overlayId);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      activeOverlaysRegistry.unregister('sheet', overlayId);
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, id, onClose]);

  if (typeof document === 'undefined') return null;

  const winW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 844;

  let initialX = 0;
  let initialY = isWebDesktop ? 20 : 60;
  let initialScale = isWebDesktop ? 0.95 : 0.92;

  if (originRect && !prefersReduced) {
    const originCenterX = originRect.left + originRect.width / 2;
    const originCenterY = originRect.top + originRect.height / 2;
    const targetCenterX = winW / 2;
    const targetCenterY = isWebDesktop ? winH / 2 : winH * 0.55;

    initialX = Math.round((originCenterX - targetCenterX) * 0.45);
    initialY = Math.round((originCenterY - targetCenterY) * 0.45);
    initialScale = Math.max(0.45, Math.min(0.88, originRect.width / (isWebDesktop ? 540 : winW)));
  }

  const scrimBg = isAmoled
    ? 'rgba(0, 0, 0, 0.88)'
    : isLight
      ? 'rgba(0, 0, 0, 0.42)'
      : 'rgba(0, 0, 0, 0.68)';

  const cardBg = isAmoled
    ? '#000000'
    : isLight
      ? '#ffffff'
      : 'var(--c-background, #141419)';

  const cardBorder = isAmoled
    ? '1px solid rgba(255, 255, 255, 0.14)'
    : isLight
      ? '1px solid rgba(0, 0, 0, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.10)';

  const cardShadow = isAmoled
    ? '0 24px 60px rgba(0, 0, 0, 0.98), 0 4px 16px rgba(0, 0, 0, 0.85)'
    : isLight
      ? '0 24px 60px rgba(0, 0, 0, 0.14), 0 4px 16px rgba(0, 0, 0, 0.06)'
      : '0 24px 60px rgba(0, 0, 0, 0.65), 0 8px 24px rgba(0, 0, 0, 0.35)';

  const resolvedMaxWidth = maxWidth ?? (isWebDesktop ? '540px' : '640px');

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100005,
            display: 'flex',
            alignItems: isWebDesktop ? 'center' : 'flex-end',
            justifyContent: 'center',
          }}
        >
          <motion.div
            key="profile-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: scrimBg,
              backdropFilter: isAmoled ? 'none' : 'blur(16px)',
              WebkitBackdropFilter: isAmoled ? 'none' : 'blur(16px)',
            }}
          />

          <motion.div
            key="profile-modal-panel"
            initial={
              prefersReduced
                ? { opacity: 0 }
                : {
                    opacity: 0.4,
                    scale: initialScale,
                    x: initialX,
                    y: initialY,
                    borderRadius: 24,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              borderRadius: isWebDesktop ? 24 : '24px 24px 0 0',
            }}
            exit={
              prefersReduced
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: initialScale * 0.95,
                    x: initialX * 0.7,
                    y: initialY * 0.7,
                    transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] },
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.15 }
                : { type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }
            }
            className="profile-morph-panel"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: resolvedMaxWidth,
              maxHeight: isWebDesktop ? '88vh' : '92vh',
              background: cardBg,
              border: cardBorder,
              boxShadow: cardShadow,
              backdropFilter: isAmoled ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: isAmoled ? 'none' : 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 16,
                right: 16,
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />

            {!isWebDesktop && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '10px 0 4px',
                  flexShrink: 0,
                  cursor: 'grab',
                }}
                onClick={onClose}
              >
                <div
                  style={{
                    width: 40,
                    height: 4.5,
                    borderRadius: 9999,
                    background: 'rgba(255, 255, 255, 0.22)',
                  }}
                />
              </div>
            )}

            {title && (
              <SheetHeader
                title={title}
                titleColor={titleColor}
                onClose={onClose}
              />
            )}

            <div
              className="no-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingBottom: isWebDesktop ? 20 : 'max(28px, env(safe-area-inset-bottom, 24px))',
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ShieldIconSVG({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIconSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        fill="#FFC107"
      />
      <path
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        fill="#1976D2"
      />
    </svg>
  );
}

export function DownloadIconSVG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function TrashIconSVG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function SettingRowUI({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(128,128,128,0.07)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--c-text-primary)',
            fontFamily: 'var(--studio-font-body)',
            margin: 0,
          }}
        >
          {label}
        </p>
        {desc && (
          <p
            style={{
              fontSize: 11,
              marginTop: 2,
              lineHeight: 1.3,
              color: 'var(--c-text-secondary)',
              fontFamily: 'Inter',
              margin: '2px 0 0',
            }}
          >
            {desc}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export function formatLastActive(ms: number, lang: string): string {
  if (!ms) return lang === 'es' ? 'Reciente' : 'Recent';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return lang === 'es' ? 'Activo ahora' : 'Active now';
  if (mins < 60) return lang === 'es' ? `Hace ${mins} m` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'es' ? `Hace ${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'es' ? `Hace ${days} d` : `${days}d ago`;
}

export function AccountDeviceRow({
  device,
  isMe,
  lang,
  userId,
}: {
  device: any;
  isMe: boolean;
  lang: string;
  userId?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  let title = device.displayName || device.shortName || device.name;
  if (
    device.classification === 'legacy' ||
    device.isLegacy ||
    device.isStale
  ) {
    if (
      title === 'Unknown Device' ||
      title === 'Chordex App' ||
      title.includes('Chordex')
    ) {
      title =
        device.platform === 'web'
          ? lang === 'es'
            ? 'Sesión web anterior'
            : 'Previous Web session'
          : lang === 'es'
            ? 'Sesión Android anterior'
            : 'Previous Android session';
    } else {
      title = `${lang === 'es' ? 'Sesión anterior' : 'Previous session'} (${title})`;
    }
  }

  let statusText = '';
  if (!device.signedIn) {
    statusText = lang === 'es' ? 'Sesión cerrada' : 'Signed out';
  } else if (isMe) {
    statusText = `● ${lang === 'es' ? 'Sesión activa' : 'Active session'}`;
  } else if (
    device.classification === 'legacy' ||
    device.isLegacy ||
    device.replacedByDeviceId != null
  ) {
    statusText = lang === 'es' ? 'Sesión anterior' : 'Previous session';
  } else if (device.classification === 'activeRemote') {
    statusText = lang === 'es' ? 'Activo ahora' : 'Active now';
  } else if (device.classification === 'recentRemote') {
    statusText = formatLastActive(device.lastActive, lang);
  } else {
    statusText = lang === 'es' ? 'Inactivo' : 'Idle';
  }

  const showVersion =
    device.appVersion && device.appVersion !== 'Unknown';
  const isPlatformWeb =
    device.platform === 'web' || device.buildType === 'Web';
  const showApk =
    !isPlatformWeb &&
    device.apkVersion &&
    device.apkVersion !== 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          background: 'rgba(128,128,128,0.06)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: isMe
            ? `1px solid color-mix(in srgb, var(--accent-to, #a855f7) 20%, transparent)`
            : '1px solid transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: isMe
                ? 'var(--accent-to, #a855f7)'
                : 'var(--c-text-primary)',
              opacity: isMe ? 1 : 0.7,
            }}
          >
            {device.platform === 'native' || device.platform === 'android'
              ? 'smartphone'
              : 'laptop_mac'}
          </span>
          <div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: 13.5,
                color: 'var(--c-text-primary)',
                margin: 0,
              }}
            >
              {title}{' '}
              {isMe &&
                `(${lang === 'es' ? 'Este dispositivo' : 'This device'})`}
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: 11,
                color: isMe ? '#10b981' : 'var(--c-text-muted)',
                margin: '2px 0 0',
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span>{statusText}</span>
              {showVersion && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es' ? 'Versión' : 'Version'}:{' '}
                    {device.appVersion}
                  </span>
                </>
              )}
              {isPlatformWeb ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es' ? 'Compilación: Web' : 'Build: Web'}
                  </span>
                </>
              ) : (
                <>
                  {showApk && (
                    <>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span>APK: {device.apkVersion}</span>
                    </>
                  )}
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es'
                      ? 'Compilación: Versión Nativa'
                      : 'Build: Native Release'}
                  </span>
                </>
              )}
              <span style={{ opacity: 0.5 }}>•</span>
              <span
                style={{
                  color:
                    device.syncStatus === 'success' ||
                    device.syncStatus === 'idle'
                      ? '#10b981'
                      : device.syncStatus === 'syncing'
                        ? 'var(--accent-to, #a855f7)'
                        : '#ff6b6b',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {device.syncStatus}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(device.classification === 'legacy' ||
            device.isLegacy ||
            device.isStale ||
            device.classification === 'signedOut' ||
            device.classification === 'revoked' ||
            device.classification === 'unknown') && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'rgba(128,128,128,0.08)',
                border: 'none',
                color: 'var(--c-text-primary)',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                fontFamily: 'var(--studio-font-body)',
              }}
            >
              {showDetails
                ? lang === 'es'
                  ? 'Ocultar'
                  : 'Hide'
                : lang === 'es'
                  ? 'Detalles'
                  : 'Details'}
            </button>
          )}
          {!isMe && (
            <button
              onClick={async () => {
                if (
                  confirm(
                    lang === 'es'
                      ? '¿Revocar esta sesión? El dispositivo tendrá que iniciar sesión de nuevo.'
                      : 'Revoke this session? The device will be signed out.'
                  )
                ) {
                  if (userId) {
                    await revokeDeviceSession(userId, device.id);
                  }
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ff6b6b',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                delete
              </span>
            </button>
          )}
        </div>
      </div>
      {showDetails && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(128,128,128,0.03)',
            borderLeft: '2px solid var(--accent-to, #a855f7)',
            fontSize: 11,
            fontFamily: 'Inter',
            color: 'var(--c-text-secondary)',
            marginLeft: 14,
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div>
            <strong>Firestore Doc ID:</strong>{' '}
            <code style={{ wordBreak: 'break-all' }}>{device.id}</code>
          </div>
          <div>
            <strong>Classification:</strong>{' '}
            <code style={{ textTransform: 'capitalize' }}>
              {device.classification || 'unknown'}
            </code>
          </div>
          <div>
            <strong>Reason:</strong>{' '}
            <span>
              {device.classificationReason || 'Stale device session'}
            </span>
          </div>
          <div>
            <strong>Last Active:</strong>{' '}
            <span>
              {device.lastActive
                ? new Date(device.lastActive).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
