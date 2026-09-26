import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT, useSettingsStore, authRepository, type AuthUser, isFirebaseConfigured, userRepository, useIsWebDesktop } from '@workspace/livex-core';

import { Button, StatefulButton } from '../../../../shared/design-system/StudioDesignSystem';
import { SyncAnimations } from '../AccountCard';

function prettyErr(e: unknown, lang: string): string {
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
  // ── Native Google Sign-In codes (Capacitor plugin → GoogleSignInStatusCodes) ──
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
  // Last-ditch: any bare "<status>:" leaking from a path that bypassed
  // auth.ts's normaliser (older code paths, third-party plugins).
  // Common Google Sign-In status codes: 7, 8, 10, 12500, 12501, 12502.
  if (/^\s*10[:\s]/.test(msg) || /DEVELOPER_ERROR/i.test(msg)) {
    return es
      ? 'Esta build no está autorizada por Google (SHA-1 no registrado en Firebase). Usa email para entrar — el sync funciona igual.'
      : 'This build is not authorised by Google (SHA-1 not registered in Firebase). Sign in with email — sync works the same way.';
  }
  if (/^\s*12501[:\s]/.test(msg)) {
    // User cancelled — silent, but if it leaks, show something neutral.
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

function inputStyle(accent: { from: string }): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(128,128,128,0.08)',
    border: `1px solid rgba(128,128,128,0.15)`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--studio-font-body)',
    outline: 'none',
    transition: 'border-color 200ms ease',
    accentColor: accent.from,
  };
}

type DangerSheet = 'none' | 'signout' | 'delete';

type DangerZoneProps = {
  accent: { from: string; to: string; mid: string };
  cardStyle: React.CSSProperties;
};

export function AccountDangerZone({ accent, cardStyle }: DangerZoneProps) {
  const isWebDesktop = useIsWebDesktop();
  const tRoot = useT();
  const t = tRoot.hub.accountSection;
  const lang = useSettingsStore((s) => s.settings.language) ?? 'en';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sheet, setSheet] = useState<DangerSheet>('none');
  const [closing, setClosing] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => authRepository.subscribeAuth(setUser), []);

  if (!isFirebaseConfigured || !user) return null;

  const emailToConfirm = (user.email ?? '').trim().toLowerCase();
  const canDelete =
    !deleting && deleteEmail.trim().toLowerCase() === emailToConfirm && !!emailToConfirm;

  function openSheet(s: DangerSheet) {
    setErr(null);
    setDeleteEmail('');
    setClosing(false);
    setSheet(s);
  }

  function closeSheet() {
    setClosing(true);
    setTimeout(() => {
      setSheet('none');
      setClosing(false);
      setDeleteEmail('');
      setErr(null);
    }, 280);
  }

  async function doSignOut() {
    try {
      await authRepository.signOut();
    } catch {
      /* noop */
    }
  }

  async function doDeleteAccount() {
    if (!user || deleting) return;
    setDeleting(true);
    setErr(null);
    try {
      // Soft-delete: schedule removal, keep all data intact for 7 days,
      // then sign the user out. Re-signing in shows the lockdown / restore
      // screen with a countdown.
      await userRepository.scheduleAccountDeletion(user.uid);
      closeSheet();
      try {
        await authRepository.signOut();
      } catch {
        /* noop */
      }
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setDeleting(false);
    }
  }

  const sheetAnim = closing
    ? isWebDesktop
      ? 'modal-scale-out 250ms ease both'
      : 'sheet-down 300ms cubic-bezier(0.16, 1, 0.3, 1) both'
    : isWebDesktop
      ? 'modal-scale-in 250ms ease both'
      : 'sheet-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both';

  const overlayAnim = closing ? 'fade-out 280ms ease both' : 'sync-fade-in 200ms ease both';

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100005,
    animation: overlayAnim,
    display: isWebDesktop ? 'flex' : 'block',
    alignItems: isWebDesktop ? 'center' : 'stretch',
    justifyContent: isWebDesktop ? 'center' : 'stretch',
  };

  const backdropStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  };

  const sheetStyle: React.CSSProperties = isWebDesktop
    ? {
        position: 'relative',
        background: 'var(--c-background)',
        borderRadius: '16px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
        border: '1px solid rgba(128, 128, 128, 0.15)',
        width: '460px',
        maxWidth: '90vw',
        maxHeight: '85vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        animation: sheetAnim,
      }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--c-background)',
        borderRadius: '1.5rem 1.5rem 0 0',
        padding: '0 0 max(28px, env(safe-area-inset-bottom)) 0',
        animation: sheetAnim,
      };

  const dragPill = !isWebDesktop ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
      <div
        style={{ width: 36, height: 4, borderRadius: 9999, background: 'rgba(128,128,128,0.3)' }}
      />
    </div>
  ) : null;

  return (
    <>
      <SyncAnimations />

      {/* Red section header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ff6b6b' }}>
          warning
        </span>
        <p
          style={{
            color: '#ff6b6b',
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 700,
            fontSize: 'var(--font-xs)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {t.dangerZone}
        </p>
      </div>

      {/* Card */}
      <div style={cardStyle}>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--c-text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {t.dangerZoneNote}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              onClick={() => openSheet('signout')}
              style={{ flex: 1, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.35)' }}
              icon="logout"
            >
              {t.signOut}
            </Button>
            <Button
              variant="danger"
              onClick={() => openSheet('delete')}
              style={{ flex: 1 }}
              icon="delete_forever"
            >
              {t.deleteAccount}
            </Button>
          </div>
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: 0 }}>{err}</p>}
        </div>
      </div>

      {/* ── Sign-out bottom sheet ── */}
      {sheet === 'signout' &&
        createPortal(
          <div style={overlayStyle}>
            <div style={backdropStyle} onClick={closeSheet} />
            <div className="profile-panel-sheet" style={sheetStyle}>
              {dragPill}
              <div
                style={{
                  padding: '8px 22px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 800,
                    fontSize: 18,
                    color: 'var(--c-text-primary)',
                    margin: 0,
                  }}
                >
                  {t.signOutConfirmTitle}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSheet}
                  style={{ color: 'var(--c-text-secondary)', minWidth: 32 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    close
                  </span>
                </Button>
              </div>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: 'var(--c-text-secondary)',
                  lineHeight: 1.5,
                  margin: '8px 22px 20px',
                }}
              >
                {t.signOutConfirmBody}
              </p>
              <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
                <Button variant="secondary" onClick={closeSheet} style={{ flex: 1 }}>
                  {t.cancel}
                </Button>
                <Button
                  variant="outline"
                  onClick={doSignOut}
                  style={{ flex: 1, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.35)' }}
                  icon="logout"
                >
                  {t.signOut}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Delete-account bottom sheet ── */}
      {sheet === 'delete' &&
        createPortal(
          <div style={overlayStyle}>
            <div style={backdropStyle} onClick={closeSheet} />
            <div className="profile-panel-sheet" style={sheetStyle}>
              {dragPill}
              <div
                style={{
                  padding: '8px 22px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#ff6b6b',
                    margin: 0,
                  }}
                >
                  {t.deleteAccountConfirmTitle}
                </p>
                <button
                  onClick={closeSheet}
                  aria-label={(t as any).close || t.cancel || 'Close'}
                  className="btn-smooth"
                  style={{
                    color: 'var(--c-text-secondary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <div
                style={{
                  padding: '8px 22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: 'var(--c-text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {t.deleteAccountConfirmBody}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: 'var(--c-text-secondary)',
                    margin: 0,
                  }}
                >
                  {t.deleteAccountTypeEmail}:{' '}
                  <strong style={{ color: 'var(--c-text-primary)' }}>{user.email}</strong>
                </p>
                <input
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder={user.email ?? ''}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    ...inputStyle(accent),
                    borderColor: canDelete ? '#ff6b6b' : 'rgba(255,107,107,0.3)',
                  }}
                />
                {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: 0 }}>{err}</p>}
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
                <Button
                  variant="secondary"
                  onClick={closeSheet}
                  disabled={deleting}
                  style={{ flex: 1 }}
                >
                  {t.cancel}
                </Button>
                <StatefulButton
                  state={deleting ? 'loading' : 'idle'}
                  onClick={doDeleteAccount}
                  disabled={!canDelete}
                  variant="danger"
                  style={{ flex: 1 }}
                  icon="delete_forever"
                >
                  {t.deleteAccountFinal}
                </StatefulButton>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
