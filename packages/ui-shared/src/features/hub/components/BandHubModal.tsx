import React, { useState } from 'react';
import {
  useBandStore,
  useChordStore,
  type Band,
  type BandMember,
  type SharedSong,
  type SongPreset,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { Dialog } from '../../../shared/design-system/dialogs';

export interface BandHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  isAmoled: boolean;
  accent: { from: string; to: string };
  lang: string;
  currentUserName?: string;
  currentUserId?: string;
}

export const BandHubModal: React.FC<BandHubModalProps> = ({
  isOpen,
  onClose,
  isLight,
  isAmoled,
  accent,
  lang,
  currentUserName = 'Musician',
  currentUserId = 'local-user',
}) => {
  const isSpanish = lang === 'es';
  const {
    currentBand,
    members,
    sharedSongs,
    createBand,
    joinBandByCode,
    leaveBand,
    shareSongFromPreset,
    importSharedSongToLibrary,
    removeSharedSong,
    isLoading,
    error,
    setError,
  } = useBandStore();

  const presets = useChordStore((s) => s.presets);
  const createPreset = useChordStore((s) => s.createPreset);
  const setActivePreset = useChordStore((s) => s.setActivePreset);

  const [noBandTab, setNoBandTab] = useState<'create' | 'join'>('create');
  const [bandTab, setBandTab] = useState<'repertoire' | 'members'>('repertoire');
  const [bandNameInput, setBandNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = bandNameInput.trim();
    if (!name) return;

    createBand(name, currentUserId, currentUserName);
    setBandNameInput('');
    setBandTab('repertoire');
    showToast(isSpanish ? '¡Banda creada exitosamente!' : 'Band created successfully!');
  };

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    const res = await joinBandByCode(code, currentUserId, currentUserName);
    if (res.success) {
      setJoinCodeInput('');
      setBandTab('repertoire');
      showToast(isSpanish ? '¡Te has unido a la banda!' : 'Joined band successfully!');
    }
  };

  const handleCopyCode = () => {
    if (!currentBand?.code) return;
    try {
      navigator.clipboard.writeText(currentBand.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {}
  };

  const handleSharePreset = (preset: SongPreset) => {
    if (!currentBand) return;
    shareSongFromPreset(preset, currentBand.id, currentUserId, currentUserName);
    setShowSongPicker(false);
    showToast(
      isSpanish
        ? `Canción "${preset.name}" compartida con la banda`
        : `Song "${preset.name}" shared with band`
    );
  };

  const handleImportToLibrary = (song: SharedSong) => {
    const existing = presets.find(
      (p) => p.name.toLowerCase() === song.title.toLowerCase() || p.id === song.songId
    );
    if (existing) {
      showToast(
        isSpanish
          ? `"${song.title}" ya está en tu biblioteca`
          : `"${song.title}" is already in your library`
      );
      return;
    }

    importSharedSongToLibrary(song, (data) => createPreset(data));
    showToast(
      isSpanish
        ? `"${song.title}" guardada en tu biblioteca local (Offline)`
        : `"${song.title}" saved to local library (Offline)`
    );
  };

  const handleOpenSong = (song: SharedSong) => {
    let targetId = song.songId;
    const existing = presets.find((p) => p.id === song.songId || p.name === song.title);
    if (existing) {
      targetId = existing.id;
    } else {
      targetId = importSharedSongToLibrary(song, (data) => createPreset(data));
    }

    setActivePreset(targetId);
    onClose();
    NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
  };

  const isLeader = currentBand?.leaderId === currentUserId;

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setError(null);
        setShowLeaveConfirm(false);
        setShowSongPicker(false);
        onClose();
      }}
      size="md"
      hideCloseButton={false}
      className="max-w-md"
    >
      <div
        data-testid="band-hub-modal"
        className="flex flex-col gap-3.5 p-1 select-none"
        style={{ color: 'var(--c-text-primary)' }}
      >
        {/* Header Title with Dual-Person / Team Icon */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accent.from}24, ${accent.to}14)`,
              border: `1px solid ${accent.from}40`,
              color: accent.from,
            }}
          >
            <StudioIcon name="groups" size={22} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
              {currentBand
                ? currentBand.name
                : isSpanish
                  ? 'Banda y Equipo'
                  : 'Band & Team Hub'}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {currentBand
                ? isSpanish
                  ? `${members.length} miembros • ${sharedSongs.length} canciones • Código: ${currentBand.code}`
                  : `${members.length} members • ${sharedSongs.length} songs • Code: ${currentBand.code}`
                : isSpanish
                  ? 'Sincroniza canciones y ensayos en tiempo real'
                  : 'Sync songs, setlists, and stage plots with your team'}
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {feedbackToast && (
          <div
            data-testid="band-feedback-toast"
            className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold shadow-md animate-fade-in"
            style={{
              background: `${accent.from}20`,
              border: `1px solid ${accent.from}50`,
              color: accent.from,
            }}
          >
            <StudioIcon name="check_circle" size={16} />
            <span className="flex-1">{feedbackToast}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <StudioIcon name="error" size={16} />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              <StudioIcon name="close" size={14} />
            </button>
          </div>
        )}

        {/* ── VIEW 1: ACTIVE BAND PRESENTATION ── */}
        {currentBand ? (
          <div className="flex flex-col gap-3">
            {/* Join Code Card with 1-Tap Copy */}
            <div
              className="flex items-center justify-between p-3 rounded-2xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {isSpanish ? 'Código de Invitación' : 'Band Join Code'}
                </span>
                <span
                  data-testid="band-code-display"
                  className="text-xl font-black font-mono tracking-widest mt-0.5"
                  style={{ color: accent.from }}
                >
                  {currentBand.code}
                </span>
              </div>
              <button
                type="button"
                data-testid="band-copy-code-btn"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer"
                style={{
                  background: copiedCode ? `${accent.from}22` : 'rgba(255, 255, 255, 0.08)',
                  borderColor: copiedCode ? accent.from : 'rgba(255, 255, 255, 0.15)',
                  color: copiedCode ? accent.from : 'var(--c-text-primary)',
                }}
              >
                <StudioIcon name={copiedCode ? 'check' : 'content_copy'} size={15} />
                <span>{copiedCode ? (isSpanish ? 'Copiado' : 'Copied') : (isSpanish ? 'Copiar' : 'Copy')}</span>
              </button>
            </div>

            {/* Segmented Sub-Navigation (Repertoire / Members) */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              <button
                type="button"
                data-testid="band-tab-songs"
                onClick={() => {
                  setBandTab('repertoire');
                  setShowSongPicker(false);
                }}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
                style={{
                  background: bandTab === 'repertoire' ? accent.from : 'transparent',
                  color: bandTab === 'repertoire' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: bandTab === 'repertoire' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                <StudioIcon name="library_music" size={14} />
                <span>{isSpanish ? 'Canciones' : 'Songs'} ({sharedSongs.length})</span>
              </button>
              <button
                type="button"
                data-testid="band-tab-members"
                onClick={() => {
                  setBandTab('members');
                  setShowSongPicker(false);
                }}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
                style={{
                  background: bandTab === 'members' ? accent.from : 'transparent',
                  color: bandTab === 'members' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: bandTab === 'members' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                <StudioIcon name="groups" size={14} />
                <span>{isSpanish ? 'Miembros' : 'Members'} ({members.length})</span>
              </button>
            </div>

            {/* ── SUB-VIEW: REPERTOIRE / SHARED SONGS ── */}
            {bandTab === 'repertoire' && (
              <div className="flex flex-col gap-2.5">
                {/* Repertoire Header Action */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {isSpanish ? 'Repertorio de la Banda' : 'Band Repertoire'}
                  </span>
                  <button
                    type="button"
                    data-testid="band-share-song-btn"
                    onClick={() => setShowSongPicker((v) => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                    style={{
                      background: showSongPicker ? `${accent.from}22` : 'rgba(255, 255, 255, 0.08)',
                      borderColor: showSongPicker ? accent.from : 'rgba(255, 255, 255, 0.12)',
                      borderWidth: '1px',
                      color: showSongPicker ? accent.from : 'var(--c-text-primary)',
                    }}
                  >
                    <StudioIcon name={showSongPicker ? 'close' : 'add'} size={14} />
                    <span>{showSongPicker ? (isSpanish ? 'Cerrar' : 'Close') : (isSpanish ? '+ Compartir' : '+ Share Song')}</span>
                  </button>
                </div>

                {/* Song Picker: Share from user's local presets */}
                {showSongPicker && (
                  <div
                    data-testid="band-song-picker"
                    className="p-2.5 rounded-xl border flex flex-col gap-2"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                    }}
                  >
                    <span className="text-[11px] font-semibold text-zinc-400">
                      {isSpanish ? 'Selecciona una canción de tu biblioteca:' : 'Select a song from your library to publish:'}
                    </span>
                    {presets.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-2 text-center">
                        {isSpanish ? 'No tienes canciones en tu biblioteca.' : 'No local songs found in library.'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {presets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            data-testid={`pick-song-${preset.id}`}
                            onClick={() => handleSharePreset(preset)}
                            className="flex items-center justify-between p-2 rounded-lg border text-left transition active:scale-[0.98] cursor-pointer"
                            style={{
                              background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
                            }}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {preset.key || 'C'} • {preset.bpm || 120} BPM
                              </span>
                            </div>
                            <span
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: `${accent.from}22`, color: accent.from }}
                            >
                              {isSpanish ? 'Compartir' : 'Share'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Shared Songs List */}
                {sharedSongs.length === 0 ? (
                  <div
                    data-testid="band-empty-songs"
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border text-center"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--c-text-tertiary)' }}
                    >
                      <StudioIcon name="music_note" size={20} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: 'var(--c-text-secondary)' }}>
                      {isSpanish ? 'Sin canciones compartidas todavía' : 'No shared band songs yet'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {isSpanish
                        ? 'Publica una canción desde tu biblioteca para que todos puedan ensayar.'
                        : 'Publish a song from your library so the band can rehearse in sync.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {sharedSongs.map((song) => {
                      const isLocal = presets.some(
                        (p) => p.name.toLowerCase() === song.title.toLowerCase() || p.id === song.songId
                      );
                      const canDelete = isLeader || song.updatedBy === currentUserId;

                      return (
                        <div
                          key={song.id}
                          data-testid={`band-shared-song-${song.id}`}
                          className="flex flex-col gap-2 p-2.5 rounded-xl border"
                          style={{
                            background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
                                {song.title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                                  style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--c-text-secondary)' }}
                                >
                                  #{song.key}
                                </span>
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                                  style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--c-text-secondary)' }}
                                >
                                  {song.bpm} BPM
                                </span>
                                {song.barsPerLine && (
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                                    style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--c-text-secondary)' }}
                                  >
                                    {song.barsPerLine} Bars
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Open in Live Mode or Chordex */}
                            <button
                              type="button"
                              data-testid={`open-shared-song-${song.id}`}
                              onClick={() => handleOpenSong(song)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1"
                              style={{ background: accent.from }}
                              title={isSpanish ? 'Abrir en Vivo' : 'Open in Live Mode'}
                            >
                              <StudioIcon name="play_arrow" size={14} />
                              <span>{isSpanish ? 'Abrir' : 'Open'}</span>
                            </button>
                          </div>

                          {/* Footer: Caching State & Delete */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-zinc-400">
                            <span className="truncate">
                              {song.uploaderName ? `${isSpanish ? 'Por' : 'By'} ${song.uploaderName}` : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              {!isLocal && (
                                <button
                                  type="button"
                                  data-testid={`cache-song-${song.id}`}
                                  onClick={() => handleImportToLibrary(song)}
                                  className="text-zinc-300 hover:text-white font-semibold cursor-pointer underline"
                                >
                                  {isSpanish ? 'Guardar Copia' : 'Save Offline'}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  data-testid={`delete-shared-song-${song.id}`}
                                  onClick={() => removeSharedSong(song.id)}
                                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                                  title={isSpanish ? 'Eliminar del repertorio' : 'Remove from band'}
                                >
                                  <StudioIcon name="delete" size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-VIEW: MEMBERS / ROSTER ── */}
            {bandTab === 'members' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {isSpanish ? 'Miembros del Grupo' : 'Band Members'} ({members.length})
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const isLeaderMember = member.role === 'leader';
                    return (
                      <div
                        key={member.id}
                        data-testid={`band-member-${member.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{
                          background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: isLeaderMember ? `${accent.from}30` : 'rgba(255, 255, 255, 0.1)',
                              color: isLeaderMember ? accent.from : 'var(--c-text-primary)',
                            }}
                          >
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>
                              {member.displayName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {member.userId === currentUserId
                                ? isSpanish ? '(Tú)' : '(You)'
                                : isLeaderMember ? (isSpanish ? 'Líder' : 'Leader') : (isSpanish ? 'Miembro' : 'Member')}
                            </span>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                          style={{
                            background: isLeaderMember ? `${accent.from}20` : 'rgba(255, 255, 255, 0.06)',
                            color: isLeaderMember ? accent.from : 'var(--c-text-secondary)',
                            border: isLeaderMember ? `1px solid ${accent.from}35` : '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          {isLeaderMember ? (isSpanish ? 'Líder' : 'Leader') : (isSpanish ? 'Miembro' : 'Member')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leave / Manage Band Footer */}
            <div className="pt-2 border-t border-white/10">
              {showLeaveConfirm ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-xs font-semibold text-rose-400">
                    {isSpanish ? '¿Salir de esta banda?' : 'Leave this band?'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-leave-band-btn"
                      onClick={() => {
                        leaveBand();
                        setShowLeaveConfirm(false);
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {isSpanish ? 'Salir' : 'Leave'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="leave-band-btn"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <StudioIcon name="logout" size={15} />
                  <span>{isSpanish ? 'Salir de la Banda' : 'Leave Band'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── VIEW 2: NO ACTIVE BAND (CREATE OR JOIN) ── */
          <div className="flex flex-col gap-3.5">
            {/* Segmented Control: Create vs Join */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              <button
                type="button"
                data-testid="tab-create-band"
                onClick={() => setNoBandTab('create')}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center"
                style={{
                  background: noBandTab === 'create' ? accent.from : 'transparent',
                  color: noBandTab === 'create' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: noBandTab === 'create' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                {isSpanish ? 'Crear Banda' : 'Create Band'}
              </button>
              <button
                type="button"
                data-testid="tab-join-band"
                onClick={() => setNoBandTab('join')}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center"
                style={{
                  background: noBandTab === 'join' ? accent.from : 'transparent',
                  color: noBandTab === 'join' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: noBandTab === 'join' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                {isSpanish ? 'Unirse con Código' : 'Join with Code'}
              </button>
            </div>

            {/* CREATE BAND FORM */}
            {noBandTab === 'create' && (
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    {isSpanish ? 'Nombre de la Banda / Grupo' : 'Band or Group Name'}
                  </label>
                  <input
                    type="text"
                    data-testid="band-name-input"
                    value={bandNameInput}
                    onChange={(e) => setBandNameInput(e.target.value)}
                    placeholder={isSpanish ? 'Ej. The Midnight Echoes' : 'e.g. The Midnight Echoes'}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                      color: 'var(--c-text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  data-testid="create-band-submit-btn"
                  disabled={!bandNameInput.trim()}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md"
                  style={{
                    background: accent.from,
                    boxShadow: `0 4px 14px ${accent.from}40`,
                  }}
                >
                  {isSpanish ? 'Crear Banda y Generar Código' : 'Create Band & Generate Code'}
                </button>
              </form>
            )}

            {/* JOIN BAND FORM */}
            {noBandTab === 'join' && (
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    {isSpanish ? 'Código de 6 Caracteres' : '6-Character Join Code'}
                  </label>
                  <input
                    type="text"
                    data-testid="band-join-input"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="LVX702"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest uppercase focus:outline-none transition"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                      color: 'var(--c-text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  data-testid="join-band-submit-btn"
                  disabled={joinCodeInput.trim().length < 4 || isLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md"
                  style={{
                    background: accent.from,
                    boxShadow: `0 4px 14px ${accent.from}40`,
                  }}
                >
                  {isLoading
                    ? (isSpanish ? 'Conectando...' : 'Joining...')
                    : (isSpanish ? 'Unirse a la Banda' : 'Join Band')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
