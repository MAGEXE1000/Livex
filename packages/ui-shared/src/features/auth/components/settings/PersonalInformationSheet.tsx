import React from 'react';
import { type AuthUser, type AvatarIcon } from '@workspace/livex-core';
import { ProfileMorphModal } from './authUiPrims';

export interface PersonalInformationSheetProps {
  sheet: string | null;
  lang: string;
  closeSheet: () => void;
  originRect: DOMRect | null;
  isWebDesktop: boolean;
  isAmoled: boolean;
  isLight: boolean;
  effectivePhoto: string | null;
  avatarIcon: AvatarIcon | null;
  accent: { from: string; to: string; mid?: string; border?: string; bg?: string };
  initial: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setPickerClosing: (v: boolean) => void;
  setPickerOpen: (v: boolean) => void;
  customPhoto: string | null;
  clearCustomPhoto: () => void;
  selectAvatarIcon: (user: AuthUser, icon: AvatarIcon | null) => void;
  user: AuthUser;
  openSheet: (sheetName: string, e: React.MouseEvent) => void;
  emailVerified: boolean;
}

export function PersonalInformationSheet({
  sheet,
  lang,
  closeSheet,
  originRect,
  isWebDesktop,
  isAmoled,
  isLight,
  effectivePhoto,
  avatarIcon,
  accent,
  initial,
  fileInputRef,
  setPickerClosing,
  setPickerOpen,
  customPhoto,
  clearCustomPhoto,
  selectAvatarIcon,
  user,
  openSheet,
  emailVerified,
}: PersonalInformationSheetProps) {
  return (
    <ProfileMorphModal
      id="profile-sheet-personal-info"
      isOpen={sheet === 'personal-info'}
      title={lang === 'es' ? 'Información personal' : 'Personal Information'}
      onClose={closeSheet}
      originRect={originRect}
      isWebDesktop={isWebDesktop}
      isAmoled={isAmoled}
      isLight={isLight}
    >
      {/* Avatar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 22px 20px',
          borderBottom: '1px solid rgba(128,128,128,0.08)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background:
              effectivePhoto && !avatarIcon
                ? 'transparent'
                : `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 28,
            overflow: 'hidden',
            border: `2px solid ${accent.from}40`,
          }}
        >
          {avatarIcon ? (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 38, color: '#fff' }}
            >
              {avatarIcon}
            </span>
          ) : effectivePhoto ? (
            <img
              src={effectivePhoto}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: `${accent.from}18`,
              border: `1px solid ${accent.from}30`,
              color: accent.from,
              fontFamily: 'var(--studio-font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              photo_camera
            </span>
            {lang === 'es' ? 'Subir foto' : 'Upload photo'}
          </button>
          <button
            onClick={() => {
              setPickerClosing(false);
              setPickerOpen(true);
              closeSheet();
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(128,128,128,0.10)',
              border: '1px solid rgba(128,128,128,0.18)',
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              emoji_emotions
            </span>
            {lang === 'es' ? 'Elegir icono' : 'Choose icon'}
          </button>
          {(customPhoto || avatarIcon) && (
            <button
              onClick={() => {
                clearCustomPhoto();
                selectAvatarIcon(user, null);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(255,107,107,0.08)',
                border: '1px solid rgba(255,107,107,0.25)',
                color: '#ff6b6b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Reset photo"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                close
              </span>
            </button>
          )}
        </div>
      </div>
      {/* Display name row */}
      <button
        onClick={(e) => openSheet('editname', e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '15px 22px',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(128,128,128,0.07)',
          cursor: 'pointer',
          textAlign: 'left' as const,
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 11,
              color: 'var(--c-text-secondary)',
              margin: 0,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}
          >
            {lang === 'es' ? 'Nombre' : 'Display name'}
          </p>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--c-text-primary)',
              margin: '3px 0 0',
            }}
          >
            {user.displayName || '—'}
          </p>
        </div>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: 'var(--c-text-secondary)', opacity: 0.35 }}
        >
          chevron_right
        </span>
      </button>
      {/* Email row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '15px 22px' }}>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 11,
              color: 'var(--c-text-secondary)',
              margin: 0,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}
          >
            Email
          </p>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--c-text-primary)',
              margin: '3px 0 0',
            }}
          >
            {user.email || '—'}
          </p>
        </div>
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
      </div>
    </ProfileMorphModal>
  );
}
