import {
  useT,
  useChordStore,
  authRepository,
  userRepository,
  useSettingsStore,
} from '@workspace/livex-core';
import { useState } from 'react';
import { Button } from '../../../shared/design-system/StudioDesignSystem';

type Props = {
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null };
};

export default function DisabledAccountScreen({ user }: Props) {
  const tRoot = useT();
  const t = tRoot.hub.accountSection;
  const lang = useSettingsStore((s) => s.settings.language) ?? 'en';
  const [busy, setBusy] = useState<'enable' | 'signout' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const L =
    lang === 'es'
      ? {
          title: 'Cuenta deshabilitada',
          body: 'Tu cuenta ha sido deshabilitada. Puedes reactivarla o eliminar tu cuenta.',
          enable: 'Reactivar cuenta',
          signOut: t.signOut,
        }
      : {
          title: 'Account disabled',
          body: 'Your account has been disabled. You can re-enable it or sign out.',
          enable: 'Re-enable account',
          signOut: t.signOut,
        };

  async function doEnable() {
    if (busy) return;
    setBusy('enable');
    setErr(null);
    try {
      await userRepository.enableAccount(user.uid);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Something went wrong.';
      setErr(msg);
      setBusy(null);
    }
  }

  async function doSignOut() {
    if (busy) return;
    setBusy('signout');
    try {
      await authRepository.signOut();
    } catch {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--app-bg, #0e0e0e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'sync-fade-in 280ms ease both',
      }}
    >
      <style>{`@keyframes sync-fade-in { from { opacity:0; transform:translateY(-4px);} to { opacity:1; transform:translateY(0); } }`}</style>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 38, color: '#f59e0b' }}>
            block
          </span>
        </div>

        {/* Title */}
        <p
          style={{
            fontFamily: 'var(--studio-font-display)',
            fontWeight: 800,
            fontSize: 22,
            color: 'var(--c-text-primary)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {L.title}
        </p>

        {/* Email badge */}
        {user.email && (
          <div
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 10,
              padding: '8px 14px',
            }}
          >
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#f59e0b', margin: 0 }}>
              {user.email}
            </p>
          </div>
        )}

        {/* Body */}
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 13,
            color: 'var(--c-text-secondary)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {L.body}
        </p>

        {err && (
          <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0, textAlign: 'center' }}>{err}</p>
        )}

        {/* Buttons */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 4 }}
        >
          <Button
            variant="primary"
            onClick={doEnable}
            disabled={!!busy}
            loading={busy === 'enable'}
            icon="restart_alt"
            style={{ width: '100%' }}
          >
            {L.enable}
          </Button>

          <Button
            onClick={doSignOut}
            disabled={!!busy}
            loading={busy === 'signout'}
            icon="logout"
            style={{ width: '100%' }}
          >
            {L.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
}
