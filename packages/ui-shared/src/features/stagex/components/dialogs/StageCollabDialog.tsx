import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavigationDispatcher, useT, useSettingsStore, SpringPresets, BackDispatcher } from '@workspace/studio-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';
import { activeOverlaysRegistry } from '../../../../shared/design-system/dialogs';

import { Loader } from '../../../../components/motion/loader';
import { ShareMenu } from '../../../../components/share-menu';
import { SegmentedOtpInput } from '../SegmentedOtpInput';

export interface StageCollabDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: any;
  collabState: string;
  collabRoom: any;
  collabParticipants: any[];
  collabLoading: boolean;
  collabError: string | null;
  collabErrorTimestamp: string | null;
  collabDiagExpanded: boolean;
  setCollabDiagExpanded: (val: boolean) => void;
  pendingOpsCount: number;
  shortCodeInput: string;
  setShortCodeInput: (val: string) => void;
  onHostSession: () => void;
  onJoinSession: () => void;
  onLeaveSession: () => void;
  generateDiagnosticsReport: () => string;
}

export const StageCollabDialog: React.FC<StageCollabDialogProps> = ({
  open,
  onClose,
  currentUser,
  collabState,
  collabRoom,
  collabParticipants,
  collabLoading,
  collabError,
  collabErrorTimestamp,
  collabDiagExpanded,
  setCollabDiagExpanded,
  pendingOpsCount,
  shortCodeInput,
  setShortCodeInput,
  onHostSession,
  onJoinSession,
  onLeaveSession,
  generateDiagnosticsReport,
}) => {
  const [collabCopied, setCollabCopied] = useState(false);
  const t = useT();
  const tr = t as any;
  const language = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = language === 'es';

  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const id = 'stagex:collab-dialog';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      if (!collabLoading) {
        onClose();
      }
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [open, collabLoading, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={() => !collabLoading && onClose()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.panel}
            className="relative w-full max-w-lg overflow-hidden rounded-[28px] shadow-2xl border flex flex-col max-h-[90vh]"
          style={{
            background: 'var(--c-surface-mid)',
            borderColor: 'var(--c-border)',
            boxShadow: 'var(--elevation-high)',
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                  color: 'var(--color-on-tertiary, #ffffff)',
                  boxShadow: 'var(--studio-accent-glow)',
                }}
              >
                <span className="material-symbols-outlined text-xl">groups</span>
              </div>
              <div>
                <h3
                  className="font-headline-sm text-lg font-bold"
                  style={{ color: 'var(--c-text-primary)' }}
                >
                  {tr.stagex?.collab?.title || 'Live Collaboration'}
                </h3>
                <p className="font-body-sm text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                  {isSpanish
                    ? 'Trabaja en este escenario en tiempo real'
                    : 'Work together on this stage layout in real-time'}
                </p>
              </div>
            </div>
            <button
              onClick={() => !collabLoading && onClose()}
              className="p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              style={{ background: 'var(--c-surface-low)' }}
            >
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {collabError && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/25 text-[#ffb4ab] text-sm overflow-hidden">
                <div className="p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
                  <span className="font-medium flex-1">
                    {collabError.includes('(Raw:')
                      ? collabError.split('(Raw:')[0].trim()
                      : collabError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCollabDiagExpanded(!collabDiagExpanded)}
                    className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#ffb4ab]/70 hover:text-[#ffb4ab] transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    {collabDiagExpanded
                      ? isSpanish
                        ? 'Ocultar'
                        : 'Hide'
                      : isSpanish
                        ? 'Detalles'
                        : 'Details'}
                  </button>
                </div>
                {collabDiagExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-red-500/15 space-y-2">
                    <div className="mt-2 text-[11px] font-mono text-[#ffb4ab]/60 leading-relaxed space-y-1">
                      {collabError.includes('(Raw:') && (
                        <div>
                          <span className="text-[#ffb4ab]/40">Raw: </span>
                          {collabError.match(/\(Raw:\s*(.+)\)$/)?.[1] || 'N/A'}
                        </div>
                      )}
                      {collabErrorTimestamp && (
                        <div>
                          <span className="text-[#ffb4ab]/40">Time: </span>
                          {collabErrorTimestamp}
                        </div>
                      )}
                      <div>
                        <span className="text-[#ffb4ab]/40">State: </span>
                        {collabState || 'disconnected'}
                      </div>
                      {collabRoom?.shortCode && (
                        <div>
                          <span className="text-[#ffb4ab]/40">Room: </span>
                          {collabRoom.shortCode}
                        </div>
                      )}
                      {currentUser?.uid && (
                        <div>
                          <span className="text-[#ffb4ab]/40">User: </span>
                          {currentUser.uid.slice(0, 8)}…
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const diagText = generateDiagnosticsReport();
                        navigator.clipboard.writeText(diagText).catch(() => {});
                      }}
                      className="w-full text-[11px] font-semibold text-[#ffb4ab]/50 hover:text-[#ffb4ab]/80 border border-red-500/15 hover:border-red-500/30 rounded-lg py-1.5 flex items-center justify-center gap-1.5 transition-all hover:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      {isSpanish ? 'Copiar Diagnóstico' : 'Copy Diagnostics'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!currentUser ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                  {isSpanish
                    ? 'Debes iniciar sesión para crear o unirte a sesiones colaborativas.'
                    : 'You must be signed in to host or join collaborative sessions.'}
                </p>
                <button
                  onClick={() => {
                    onClose();
                    NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
                  }}
                  className="w-full font-label-lg text-base h-12 rounded-full flex items-center justify-center font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                    color: 'var(--color-on-tertiary, #ffffff)',
                    border: '1px solid var(--studio-accent-border)',
                    boxShadow: 'var(--studio-accent-glow)',
                  }}
                >
                  {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
                </button>
              </div>
            ) : collabState === 'connected' && collabRoom ? (
              <div className="space-y-6">
                <section className="space-y-4">
                  <label
                    className="font-label-md text-xs uppercase tracking-widest font-semibold block"
                    style={{ color: 'var(--c-text-secondary)' }}
                  >
                    {isSpanish ? 'Tu Código de Invitación' : 'Your Invite Code'}
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-16 rounded-2xl flex items-center justify-center font-code-display text-2xl font-bold"
                        style={{
                          background: 'var(--c-surface-low)',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-accent-from)',
                          boxShadow: 'var(--elevation-low)',
                        }}
                      >
                        {collabRoom.shortCode[idx] || ''}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(collabRoom.shortCode);
                        setCollabCopied(true);
                        setTimeout(() => setCollabCopied(false), 2000);
                      }}
                      className="flex-1 font-label-lg text-sm font-bold h-12 rounded-full flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                        color: 'var(--color-on-tertiary, #ffffff)',
                        border: '1px solid var(--studio-accent-border)',
                        boxShadow: 'var(--studio-accent-glow)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {collabCopied ? 'check' : 'content_copy'}
                      </span>
                      {collabCopied
                        ? isSpanish
                          ? '¡Copiado!'
                          : 'Copied!'
                        : tr.stagex?.collab?.copyCode ||
                          (isSpanish ? 'Copiar Código de Invitación' : 'Copy Invite Code')}
                    </button>
                    <ShareMenu title="StageX Collaborative Session" url={window.location.href}>
                      <button
                        className="px-6 font-label-lg text-sm font-bold h-12 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: 'var(--c-surface-low)',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-text-primary)',
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">share</span>
                        {isSpanish ? 'Compartir' : 'Share'}
                      </button>
                    </ShareMenu>
                  </div>
                </section>

                <section className="flex flex-col items-center gap-2 pt-2">
                  <label
                    className="font-label-md text-xs uppercase tracking-widest font-semibold block"
                    style={{ color: 'var(--c-text-secondary)' }}
                  >
                    {isSpanish ? 'Escanear para Unirse' : 'Scan to Join'}
                  </label>
                  <div
                    className="p-3 rounded-2xl shadow-lg"
                    style={{ background: '#ffffff', border: '1px solid var(--c-border)' }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${collabRoom.shortCode}`}
                      alt="Room QR Code"
                      className="w-[120px] h-[120px] rounded-lg"
                    />
                  </div>
                </section>

                <div className="h-px w-full" style={{ backgroundColor: 'var(--c-border)' }} />

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                      <label
                        className="font-label-md text-sm font-semibold"
                        style={{ color: 'var(--c-text-primary)' }}
                      >
                        {tr.stagex?.collab?.connected || (isSpanish ? 'Conectado' : 'Connected')} (
                        {collabParticipants.length})
                      </label>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: 'var(--c-surface-low)',
                        border: '1px solid var(--c-border)',
                        color: 'var(--c-text-secondary)',
                      }}
                    >
                      {pendingOpsCount > 0 ? (
                        <Loader variant="comet" size={14} />
                      ) : (
                        <span className="material-symbols-outlined text-[14px] text-green-400">
                          check_circle
                        </span>
                      )}
                      {pendingOpsCount > 0
                        ? isSpanish
                          ? `${pendingOpsCount} pendientes`
                          : `${pendingOpsCount} pending`
                        : isSpanish
                          ? 'Sincronizado'
                          : 'In sync'}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {collabParticipants.map((p) => (
                      <div
                        key={p.userId}
                        className="p-3 rounded-2xl flex items-center justify-between"
                        style={{
                          background: 'var(--c-surface-low)',
                          border: '1px solid var(--c-border)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                              backgroundColor: p.color || '#3b82f6',
                              boxShadow: `0 0 8px ${p.color || '#3b82f6'}80`,
                            }}
                          />
                          <span
                            className="font-body-md text-sm font-semibold"
                            style={{ color: 'var(--c-text-primary)' }}
                          >
                            {p.displayName || (isSpanish ? 'Usuario Anónimo' : 'Anonymous User')}
                          </span>
                          {p.userId === currentUser.uid && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{
                                background: 'var(--c-surface-mid)',
                                color: 'var(--c-text-secondary)',
                              }}
                            >
                              {isSpanish ? 'Tú' : 'You'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={onLeaveSession}
                    disabled={collabLoading}
                    className="w-full mt-4 h-12 rounded-full border border-red-500/30 text-red-400 font-label-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    {tr.stagex?.collab?.leave ||
                      (isSpanish ? 'Salir de la sesión' : 'Leave Session')}
                  </button>
                </section>
              </div>
            ) : (
              /* Host or Join Landing View */
              <div className="space-y-6">
                <section
                  className="p-5 rounded-2xl space-y-4"
                  style={{
                    background: 'var(--c-surface-low)',
                    border: '1px solid var(--c-border)',
                  }}
                >
                  <div>
                    <h4
                      className="font-label-lg text-base font-bold"
                      style={{ color: 'var(--c-text-primary)' }}
                    >
                      {isSpanish ? 'Iniciar una Nueva Sesión' : 'Start a New Session'}
                    </h4>
                    <p
                      className="font-body-sm text-xs mt-1"
                      style={{ color: 'var(--c-text-secondary)' }}
                    >
                      {isSpanish
                        ? 'Crea una sala colaborativa e invita a otros a editar contigo.'
                        : 'Create a collaborative room and invite others to edit with you.'}
                    </p>
                  </div>
                  <button
                    onClick={onHostSession}
                    disabled={collabLoading}
                    className="w-full font-label-lg text-sm font-bold h-12 rounded-full flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))',
                      color: 'var(--color-on-tertiary, #ffffff)',
                      border: '1px solid var(--studio-accent-border)',
                      boxShadow: 'var(--studio-accent-glow)',
                    }}
                  >
                    {collabLoading ? (
                      <Loader variant="comet" size={20} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        {tr.stagex?.collab?.host ||
                          (isSpanish ? 'Crear Sesión' : 'Host New Session')}
                      </>
                    )}
                  </button>
                </section>

                <div className="relative flex items-center justify-center">
                  <div className="h-px w-full" style={{ backgroundColor: 'var(--c-border)' }} />
                  <span
                    className="absolute px-3 font-label-sm text-[11px] font-bold uppercase tracking-widest"
                    style={{
                      background: 'var(--c-surface-mid)',
                      color: 'var(--c-text-secondary)',
                    }}
                  >
                    {isSpanish ? 'O Unirse' : 'Or Join'}
                  </span>
                </div>

                <section
                  className="p-5 rounded-2xl space-y-4"
                  style={{
                    background: 'var(--c-surface-low)',
                    border: '1px solid var(--c-border)',
                  }}
                >
                  <div>
                    <h4
                      className="font-label-lg text-base font-bold"
                      style={{ color: 'var(--c-text-primary)' }}
                    >
                      {isSpanish ? 'Unirse con Código de Invitación' : 'Join with an Invite Code'}
                    </h4>
                    <p
                      className="font-body-sm text-xs mt-1"
                      style={{ color: 'var(--c-text-secondary)' }}
                    >
                      {tr.stagex?.collab?.enterCode ||
                        (isSpanish
                          ? 'Ingresa el código de 6 caracteres compartido por el anfitrión.'
                          : 'Enter the 6-character code shared by the session host.')}
                    </p>
                  </div>

                  <SegmentedOtpInput
                    value={shortCodeInput}
                    onChange={(val) => setShortCodeInput(val.toUpperCase())}
                    disabled={collabLoading}
                  />

                  <button
                    onClick={onJoinSession}
                    disabled={collabLoading || shortCodeInput.length !== 6}
                    className="w-full font-label-lg text-sm font-bold h-12 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        shortCodeInput.length === 6
                          ? 'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))'
                          : 'var(--c-surface-mid)',
                      color:
                        shortCodeInput.length === 6
                          ? 'var(--color-on-tertiary, #ffffff)'
                          : 'var(--c-text-secondary)',
                      border: '1px solid var(--c-border)',
                    }}
                  >
                    {collabLoading ? (
                      <Loader variant="comet" size={20} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">login</span>
                        {tr.stagex?.collab?.join ||
                          (isSpanish ? 'Unirse a Sesión' : 'Join Session')}
                      </>
                    )}
                  </button>
                </section>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

