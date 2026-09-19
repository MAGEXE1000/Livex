import { useT, useChordStore, authRepository, useSettingsStore } from '@workspace/livex-core';
import { useEffect, useState } from 'react';
import { Button } from '../../../shared/design-system/StudioDesignSystem';
import { type AccountState, userRepository } from '@workspace/livex-core';

type Props = Extract<AccountState, { phase: 'pending' }>;

export default function PendingDeletionScreen({ user, scheduledAtMs }: Props) {
  const tRoot = useT();
  const t = tRoot.hub.accountSection;
  const lang = useSettingsStore((s) => s.settings.language) ?? 'en';

  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<'restore' | 'signout' | 'finalize' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Tick every 30s so the countdown stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, scheduledAtMs - now);
  const isPastGrace = scheduledAtMs <= now;

  // Auto-finalize when the deadline arrives (or has already passed on sign-in).
  useEffect(() => {
    if (!isPastGrace) {
      const id = setTimeout(
        () => setNow(Date.now()),
        Math.min(60_000, scheduledAtMs - Date.now() + 50)
      );
      return () => clearTimeout(id);
    }
    if (busy) return;
    let cancelled = false;
    (async () => {
      setBusy('finalize');
      setErr(null);
      try {
        await userRepository.finalizeAccountDeletion(user.uid);
        // Auth state will flip to signed-out and App.tsx will leave this screen.
      } catch (e) {
        if (cancelled) return;
        const code = (e as { code?: string })?.code ?? '';
        if (code === 'auth/requires-recent-login') {
          // Force a fresh sign-in so the user can retry; the doc still says
          // pending_deletion, so they'll land back on this screen and we'll
          // auto-retry from a freshly minted session.
          try {
            await authRepository.signOut();
          } catch {
            /* noop */
          }
        } else {
          setErr(prettyErr(e, lang));
          setBusy(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPastGrace, scheduledAtMs, user.uid, busy, lang]);

  async function doRestore() {
    if (busy) return;
    setBusy('restore');
    setErr(null);
    try {
      await userRepository.cancelAccountDeletion(user.uid);
      // The onSnapshot listener will flip phase to 'active' and unmount us.
    } catch (e) {
      setErr(prettyErr(e, lang));
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

  // Pretty countdown
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs / (60 * 60 * 1000)) % 24);
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingLabel = formatRemaining(days, hours, totalHours, lang);
  const deletionDate = formatDate(scheduledAtMs, lang);

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
        {/* Warning glyph */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,107,107,0.12)',
            border: '1px solid rgba(255,107,107,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 38, color: '#ff6b6b' }}>
            schedule
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
          {t.pendingTitle}
        </p>

        {/* Countdown card */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.28)',
            borderRadius: 16,
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--studio-font-display)',
              fontWeight: 800,
              fontSize: 28,
              color: '#ff6b6b',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {remainingLabel}
          </p>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 12,
              color: 'var(--c-text-secondary)',
              margin: 0,
            }}
          >
            {t.pendingUntil} {deletionDate}
          </p>
        </div>

        {/* Body copy */}
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
          {t.pendingBody(user.email ?? '')}
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
            onClick={doRestore}
            disabled={!!busy || isPastGrace}
            loading={busy === 'restore' || busy === 'finalize'}
            icon="restart_alt"
            style={{ width: '100%' }}
          >
            {t.restoreAccount}
          </Button>

          <Button
            onClick={doSignOut}
            disabled={!!busy}
            loading={busy === 'signout'}
            icon="logout"
            style={{ width: '100%' }}
          >
            {t.signOut}
          </Button>
        </div>

        {/* Footer note */}
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 11,
            color: 'var(--c-text-tertiary, var(--c-text-secondary))',
            margin: '4px 0 0',
            textAlign: 'center',
            opacity: 0.7,
            lineHeight: 1.5,
          }}
        >
          {t.pendingFooter(userRepository.ACCOUNT_GRACE_DAYS)}
        </p>
      </div>
    </div>
  );
}

function formatRemaining(days: number, hours: number, totalHours: number, lang: string): string {
  if (totalHours < 1) {
    return lang === 'es' ? 'Menos de 1 hora' : 'Less than 1 hour';
  }
  if (days === 0) {
    return lang === 'es'
      ? `${hours} ${hours === 1 ? 'hora restante' : 'horas restantes'}`
      : `${hours} ${hours === 1 ? 'hour remaining' : 'hours remaining'}`;
  }
  if (lang === 'es') {
    return `${days} ${days === 1 ? 'día restante' : 'días restantes'}`;
  }
  return `${days} ${days === 1 ? 'day remaining' : 'days remaining'}`;
}

function formatDate(ms: number, lang: string): string {
  try {
    return new Date(ms).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return new Date(ms).toDateString();
  }
}

function prettyErr(e: unknown, lang: string): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? '';
  if (code === 'permission-denied') {
    return lang === 'es'
      ? 'Sin permiso para esta acción.'
      : "You don't have permission for this action.";
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return lang === 'es' ? 'Sin conexión. Vuelve a intentarlo.' : 'No connection. Try again.';
  }
  return msg || (lang === 'es' ? 'Algo salió mal.' : 'Something went wrong.');
}
