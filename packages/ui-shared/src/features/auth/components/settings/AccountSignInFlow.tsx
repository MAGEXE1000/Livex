import React from 'react';
import StudioAuthCard from '../StudioAuthCard';
import { authRepository } from '@workspace/livex-core';
import { prettyErr } from './authUiPrims';
import { useT } from '@workspace/livex-core';

type AccountSignInFlowProps = {
  accent: { from: string; to: string; mid: string };
  lang: string;
  t: ReturnType<typeof useT>['hub']['accountSection'];
  busy: boolean;
  setBusy: (b: boolean) => void;
  err: string | null;
  setErr: (e: string | null) => void;
};

export function AccountSignInFlow({
  accent,
  lang,
  t,
  busy,
  setBusy,
  err,
  setErr,
}: AccountSignInFlowProps) {
  async function doGoogle() {
    setBusy(true);
    setErr(null);
    try {
      await authRepository.signInGoogle();
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doEmailSubmit(
    submitMode: 'email-signin' | 'email-register',
    submitEmail: string,
    submitPassword: string,
    submitName?: string
  ) {
    if (!submitEmail.trim() || !submitPassword) {
      setErr(t.errMissing);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (submitMode === 'email-signin') {
        await authRepository.signInEmail(submitEmail, submitPassword);
      } else {
        await authRepository.registerEmail(submitEmail, submitPassword, submitName || '');
      }
    } catch (e) {
      setErr(prettyErr(e, lang));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioAuthCard
      accent={accent}
      t={t}
      busy={busy}
      err={err}
      setErr={setErr}
      doGoogle={doGoogle}
      doEmailSubmit={doEmailSubmit}
    />
  );
}
