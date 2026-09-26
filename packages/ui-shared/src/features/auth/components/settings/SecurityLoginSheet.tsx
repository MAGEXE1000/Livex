import React from 'react';
import { type AuthUser } from '@workspace/livex-core';
import { ProfileMorphModal } from '../AccountCard';

export interface SecurityLoginSheetProps {
  sheet: string | null;
  lang: string;
  closeSheet: () => void;
  originRect: DOMRect | null;
  isWebDesktop: boolean;
  isAmoled: boolean;
  isLight: boolean;
  isGoogleUser: boolean;
  user: AuthUser;
  emailVerified: boolean;
  isEmailUser: boolean;
  openSheet: (sheetName: string, e: React.MouseEvent) => void;
  accent: { from: string; to: string; mid?: string; border?: string; bg?: string };
  L: Record<string, any>;
}

export function SecurityLoginSheet({
  sheet,
  lang,
  closeSheet,
  originRect,
  isWebDesktop,
  isAmoled,
  isLight,
  isGoogleUser,
  user,
  emailVerified,
  isEmailUser,
  openSheet,
  accent,
  L,
}: SecurityLoginSheetProps) {
  return (
    <ProfileMorphModal
      id="profile-sheet-security-login"
      isOpen={sheet === 'security-login'}
      title={lang === 'es' ? 'Seguridad y acceso' : 'Security & Login'}
      onClose={closeSheet}
      originRect={originRect}
      isWebDesktop={isWebDesktop}
      isAmoled={isAmoled}
      isLight={isLight}
    >
      <div style={{ padding: '6px 22px 0' }}>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 11,
            color: 'var(--c-text-secondary)',
            margin: '0 0 8px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
          }}
        >
          {lang === 'es' ? 'Método de inicio de sesión' : 'Sign-in method'}
        </p>
        <div
          style={{
            background: 'rgba(128,128,128,0.06)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: 'var(--c-text-primary)',
              opacity: 0.7,
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {isGoogleUser ? 'account_circle' : 'mail'}
          </span>
          <div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--c-text-primary)',
                margin: 0,
              }}
            >
              {isGoogleUser ? 'Google' : L.emailPass}
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: 11.5,
                color: 'var(--c-text-secondary)',
                margin: '2px 0 0',
              }}
            >
              {user.email}
            </p>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 22px 0' }}>
        <div
          style={{
            background: 'rgba(128,128,128,0.06)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 16,
              color: emailVerified ? '#10b981' : '#f59e0b',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {emailVerified ? 'check_circle' : 'warning'}
          </span>
          <p
            style={{
              flex: 1,
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--c-text-primary)',
              margin: 0,
            }}
          >
            {emailVerified
              ? lang === 'es'
                ? 'Email verificado'
                : 'Email verified'
              : lang === 'es'
                ? 'Email sin verificar'
                : 'Email not verified'}
          </p>
          {!emailVerified && isEmailUser && (
            <button
              onClick={(e) => openSheet('verifyemail', e)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                background: `${accent.from}18`,
                border: `1px solid ${accent.from}30`,
                color: accent.from,
                fontFamily: 'var(--studio-font-body)',
                cursor: 'pointer',
              }}
            >
              {lang === 'es' ? 'Verificar' : 'Verify'}
            </button>
          )}
        </div>
      </div>
      {isEmailUser && (
        <button
          onClick={(e) => openSheet('password', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '15px 22px',
            background: 'none',
            border: 'none',
            borderTop: '1px solid rgba(128,128,128,0.07)',
            marginTop: 10,
            cursor: 'pointer',
            textAlign: 'left' as const,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: 'var(--c-text-primary)', opacity: 0.65 }}
          >
            lock_reset
          </span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--c-text-primary)',
                margin: 0,
              }}
            >
              {L.changePassword}
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: 11.5,
                color: 'var(--c-text-secondary)',
                margin: '2px 0 0',
              }}
            >
              {L.changePasswordDesc}
            </p>
          </div>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: 'var(--c-text-secondary)', opacity: 0.35 }}
          >
            chevron_right
          </span>
        </button>
      )}
      {/* ── Account actions pill ── */}
      <div style={{ padding: '14px 22px 28px' }}>
        <p
          style={{
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 700,
            fontSize: 11,
            color: 'var(--c-text-secondary)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            margin: '0 0 8px',
          }}
        >
          {lang === 'es' ? 'Zona de riesgo' : 'Danger zone'}
        </p>
        <div
          style={{
            background: 'rgba(128,128,128,0.06)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* Disable account */}
          <button
            onClick={(e) => openSheet('disable', e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              width: '100%',
              padding: '13px 16px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid rgba(128,128,128,0.08)',
              cursor: 'pointer',
              textAlign: 'left' as const,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: 'var(--c-text-secondary)',
                opacity: 0.65,
                flexShrink: 0,
                width: 22,
                textAlign: 'center' as const,
              }}
            >
              block
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 600,
                  fontSize: 14.5,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                }}
              >
                {L.disableAccount}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontSize: 11.5,
                  color: 'var(--c-text-secondary)',
                  margin: '2px 0 0',
                }}
              >
                {L.disableAccountDesc}
              </p>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 17, color: 'var(--c-text-secondary)', opacity: 0.3 }}
            >
              chevron_right
            </span>
          </button>
          {/* Delete account */}
          <button
            onClick={(e) => openSheet('delete', e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              width: '100%',
              padding: '13px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left' as const,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: '#ff6b6b',
                opacity: 0.8,
                flexShrink: 0,
                width: 22,
                textAlign: 'center' as const,
              }}
            >
              delete_forever
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 600,
                  fontSize: 14.5,
                  color: '#ff6b6b',
                  margin: 0,
                }}
              >
                {L.deleteAccount}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontSize: 11.5,
                  color: 'var(--c-text-secondary)',
                  margin: '2px 0 0',
                }}
              >
                {lang === 'es'
                  ? 'Eliminar permanentemente tu cuenta'
                  : 'Permanently remove your account'}
              </p>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 17, color: 'var(--c-text-secondary)', opacity: 0.3 }}
            >
              chevron_right
            </span>
          </button>
        </div>
      </div>
    </ProfileMorphModal>
  );
}
