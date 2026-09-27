import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { useStagexStore, type SetlistSong, type SetlistPreset } from '../../state/useStagexStore';
import { StageSetupDetailLayout } from './StageSetupDetailLayout';
import { useSettingsStore, useT, useShallow } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';

interface StageSetlistViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

interface SetlistSongCardProps {
  song: SetlistSong;
  idx: number;
  isSortActive: boolean;
  isSpanish: boolean;
  textPrimary: string;
  textSecondary: string;
  innerBg: string;
  innerBorder: string;
  onRemove: () => void;
}

const SetlistSongCard: React.FC<SetlistSongCardProps> = ({
  song,
  idx,
  isSortActive,
  isSpanish,
  textPrimary,
  textSecondary,
  innerBg,
  innerBorder,
  onRemove,
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={song.id}
      value={song}
      dragListener={false}
      dragControls={dragControls}
      style={{
        backgroundColor: innerBg,
        borderColor: innerBorder,
        userSelect: 'none',
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        backgroundColor: 'var(--app-surface-bright, var(--app-surface))',
        cursor: 'grabbing',
        zIndex: 20,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex items-center justify-between p-3.5 rounded-2xl border transition-colors duration-150 relative"
      data-testid={`setlist-song-${song.id}`}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {/* Direct Drag Grip Handle */}
        <div
          onPointerDown={(e) => {
            if (isSortActive) return;
            dragControls.start(e);
          }}
          style={{
            touchAction: 'none',
            cursor: isSortActive ? 'default' : 'grab',
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center -ml-1 text-zinc-400 hover:text-zinc-200 active:cursor-grabbing shrink-0 transition-colors"
          title={
            isSortActive
              ? isSpanish
                ? 'Reordenamiento bloqueado en modo filtro'
                : 'Reordering disabled while sorted'
              : isSpanish
                ? 'Arrastra para reordenar'
                : 'Drag to reorder'
          }
          aria-label={isSpanish ? 'Arrastra para reordenar' : 'Drag to reorder'}
          data-testid={`drag-handle-${song.id}`}
        >
          <svg className="w-4 h-4 opacity-50 hover:opacity-100" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>

        <span
          className="text-xs font-mono font-bold w-5 text-right shrink-0"
          style={{ color: textSecondary }}
        >
          {idx + 1}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
              {song.title}
            </p>
            {song.key && (
              <span
                className="px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                }}
              >
                {song.key}
              </span>
            )}
            {song.bpm && (
              <span
                className="px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                }}
              >
                {song.bpm} BPM
              </span>
            )}
          </div>
          {song.artist && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: textSecondary }}>
              {song.artist}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-mono mr-1" style={{ color: textSecondary }}>
          {song.duration}
        </span>

        {/* Delete Song */}
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer opacity-60 hover:opacity-100 active:scale-95"
          style={{ color: textSecondary }}
          title={isSpanish ? 'Eliminar canción' : 'Delete Song'}
          data-testid={`btn-delete-song-${song.id}`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </Reorder.Item>
  );
};

interface SetlistPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: SetlistPreset[];
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  onCreatePreset: (name: string, initialSongs?: SetlistSong[]) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDeletePreset: (id: string) => void;
  onDuplicatePreset: (id: string) => void;
  currentSongs: SetlistSong[];
  isSpanish: boolean;
  isLight: boolean;
  cardBg: string;
  cardBorder: string;
  innerBg: string;
  innerBorder: string;
  textPrimary: string;
  textSecondary: string;
}

const SetlistPresetModal: React.FC<SetlistPresetModalProps> = ({
  isOpen,
  onClose,
  presets,
  activePresetId,
  onSelectPreset,
  onCreatePreset,
  onRenamePreset,
  onDeletePreset,
  onDuplicatePreset,
  currentSongs,
  isSpanish,
  isLight,
  cardBg,
  cardBorder,
  innerBg,
  innerBorder,
  textPrimary,
  textSecondary,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [copyCurrentSongs, setCopyCurrentSongs] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestions = isSpanish
    ? ['Show Principal', 'Acústico', 'Festival', 'Ensayo', 'Encore']
    : ['Main Show', 'Acoustic', 'Festival', 'Practice', 'Encore'];

  const handleStartRename = (preset: SetlistPreset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onRenamePreset(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const initialSongs = copyCurrentSongs ? [...currentSongs] : [];
    onCreatePreset(newPresetName.trim(), initialSongs);
    setNewPresetName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="modal-preset-manager"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl p-6 border shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textPrimary,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: innerBg,
                border: innerBorder,
              }}
            >
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold" style={{ fontFamily: 'var(--studio-font-display)' }}>
                {isSpanish ? 'Repertorios de Setlist' : 'Setlist Presets'}
              </h3>
              <p className="text-[11px]" style={{ color: textSecondary }}>
                {isSpanish
                  ? 'Gestiona repertorios independientes para cada tipo de show'
                  : 'Manage independent setlists for each show format'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 active:scale-95"
            style={{ backgroundColor: innerBg, color: textSecondary }}
            data-testid="btn-close-preset-modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Existing Presets List */}
        <div className="space-y-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: textSecondary }}>
            {isSpanish ? 'Repertorios Guardados' : 'Saved Presets'} ({presets.length})
          </span>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {presets.map((preset) => {
              const isActive = preset.id === activePresetId;
              const isEditing = editingId === preset.id;
              const isDeleting = deleteConfirmId === preset.id;

              return (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--app-surface-bright, var(--app-surface-low))' : innerBg,
                    borderColor: isActive ? 'var(--c-text-primary)' : innerBorder,
                    boxShadow: isActive ? '0 0 0 1px var(--c-text-primary)' : 'none',
                  }}
                  data-testid={`preset-item-${preset.id}`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(preset.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: innerBorder,
                          color: textPrimary,
                        }}
                        data-testid="input-rename-preset"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(preset.id)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        title={isSpanish ? 'Guardar' : 'Save'}
                        data-testid="btn-save-rename-preset"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-500/10 cursor-pointer"
                        title={isSpanish ? 'Cancelar' : 'Cancel'}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-rose-400 font-semibold truncate pr-2">
                        {isSpanish ? `¿Eliminar "${preset.name}"?` : `Delete "${preset.name}"?`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePreset(preset.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500 text-white cursor-pointer active:scale-95"
                          data-testid="btn-confirm-delete-preset"
                        >
                          {isSpanish ? 'Sí, eliminar' : 'Yes, delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer"
                          style={{ borderColor: innerBorder, color: textSecondary }}
                        >
                          {isSpanish ? 'Cancelar' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectPreset(preset.id)}
                        className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
                        data-testid={`btn-select-preset-${preset.id}`}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                          style={{
                            borderColor: isActive ? 'var(--c-text-primary)' : 'var(--c-border)',
                            backgroundColor: isActive ? 'var(--c-text-primary)' : 'transparent',
                            color: isActive ? 'var(--app-bg)' : 'transparent',
                          }}
                        >
                          {isActive && (
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                            {preset.name}
                          </p>
                          <p className="text-[10.5px]" style={{ color: textSecondary }}>
                            {preset.songs?.length || 0}{' '}
                            {isSpanish
                              ? (preset.songs?.length === 1 ? 'canción' : 'canciones')
                              : (preset.songs?.length === 1 ? 'song' : 'songs')}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Rename */}
                        <button
                          type="button"
                          onClick={() => handleStartRename(preset)}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-100 opacity-60"
                          style={{ color: textSecondary }}
                          title={isSpanish ? 'Renombrar' : 'Rename'}
                          data-testid={`btn-rename-preset-${preset.id}`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => onDuplicatePreset(preset.id)}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-100 opacity-60"
                          style={{ color: textSecondary }}
                          title={isSpanish ? 'Duplicar' : 'Duplicate'}
                          data-testid={`btn-duplicate-preset-${preset.id}`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(preset.id)}
                          disabled={presets.length <= 1}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-100 opacity-60 disabled:opacity-20"
                          style={{ color: textSecondary }}
                          title={
                            presets.length <= 1
                              ? isSpanish
                                ? 'Se requiere al menos un repertorio'
                                : 'At least one preset required'
                              : isSpanish
                                ? 'Eliminar'
                                : 'Delete'
                          }
                          data-testid={`btn-delete-preset-${preset.id}`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Create New Preset Section */}
        <form onSubmit={handleCreate} className="space-y-3 pt-2 border-t" style={{ borderColor: innerBorder }}>
          <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: textSecondary }}>
            {isSpanish ? 'Crear Nuevo Repertorio' : 'Create New Preset'}
          </span>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setNewPresetName(sug)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer hover:opacity-100 opacity-70 active:scale-95"
                style={{
                  backgroundColor: innerBg,
                  borderColor: innerBorder,
                  color: textPrimary,
                }}
              >
                + {sug}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={isSpanish ? 'p.ej. Gira Festivales 2026' : 'e.g. Festival Tour 2026'}
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none"
              style={{
                backgroundColor: innerBg,
                borderColor: innerBorder,
                color: textPrimary,
              }}
              data-testid="input-new-preset-name"
            />

            <button
              type="submit"
              disabled={!newPresetName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95 shrink-0"
              style={{
                backgroundColor: 'var(--c-text-primary)',
                color: 'var(--app-bg)',
              }}
              data-testid="btn-create-preset-submit"
            >
              {isSpanish ? 'Crear' : 'Create'}
            </button>
          </div>

          {currentSongs.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={copyCurrentSongs}
                onChange={(e) => setCopyCurrentSongs(e.target.checked)}
                className="rounded accent-purple-500 w-3.5 h-3.5"
                data-testid="checkbox-copy-songs"
              />
              <span className="text-[11px]" style={{ color: textSecondary }}>
                {isSpanish
                  ? `Copiar las ${currentSongs.length} canciones actuales al nuevo repertorio`
                  : `Copy current ${currentSongs.length} songs to the new preset`}
              </span>
            </label>
          )}
        </form>
      </div>
    </div>
  );
};

export const StageSetlistView: React.FC<StageSetlistViewProps> = ({
  onBack,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const t = useT();
  const tr = t as any;
  const setlistTr = tr.stagex?.setup?.setlist;
  const settings = useSettingsStore(
    useShallow((s) => ({
      language: s.settings.language,
      perApp: s.settings.perApp,
      amoledMode: s.settings.amoledMode,
    }))
  );
  const isSpanish = (settings.language ?? 'en') === 'es';
  const {
    setlist,
    setlistPresets,
    activePresetId,
    selectPreset,
    createPreset,
    renamePreset,
    deletePreset,
    duplicatePreset,
    addSong,
    removeSong,
    reorderSongs,
    setSetlistSongs,
    preferences,
  } = useStagexStore(
    useShallow((s) => ({
      setlist: s.setlist,
      setlistPresets: s.setlistPresets,
      activePresetId: s.activePresetId,
      selectPreset: s.selectPreset,
      createPreset: s.createPreset,
      renamePreset: s.renamePreset,
      deletePreset: s.deletePreset,
      duplicatePreset: s.duplicatePreset,
      addSong: s.addSong,
      removeSong: s.removeSong,
      reorderSongs: s.reorderSongs,
      setSetlistSongs: s.setSetlistSongs,
      preferences: s.preferences,
    }))
  );
  const activeVis = settings.perApp?.stagex;
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && Boolean(settings.amoledMode || activeVis?.amoledMode || preferences?.amoled);

  const prefersReducedMotion = useAppReducedMotion();

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const activePreset = useMemo(
    () => setlistPresets.find((p) => p.id === activePresetId) || setlistPresets[0],
    [setlistPresets, activePresetId]
  );

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songKey, setSongKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [duration, setDuration] = useState('3:30');
  const [energy, setEnergy] = useState('75');

  const [sortBy, setSortBy] = useState<'default' | 'title' | 'bpm' | 'key'>('default');
  const [showSections, setShowSections] = useState(false);

  // Compute stats
  const totalDuration = useMemo(() => {
    let totalSecs = 0;
    for (const song of setlist) {
      if (!song.duration) continue;
      const parts = song.duration.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        totalSecs += parts[0] * 60 + parts[1];
      }
    }
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [setlist]);

  const avgEnergy = useMemo(() => {
    if (!setlist.length) return null;
    const total = setlist.reduce((acc, s) => acc + (s.energy || 50), 0);
    return Math.round(total / setlist.length);
  }, [setlist]);

  // Computed Setlist Insights (Stitch Parity)
  const tempoStability = useMemo(() => {
    if (setlist.length === 0) return '—';
    const bpmList = setlist
      .map((s) => s.bpm)
      .filter((b): b is number => typeof b === 'number' && !isNaN(b) && b > 0);

    if (bpmList.length === 0) return '—';
    if (bpmList.length === 1) return `${bpmList[0]} BPM`;

    const min = Math.min(...bpmList);
    const max = Math.max(...bpmList);
    const diff = max - min;

    if (diff <= 10) return isSpanish ? `Consistente (±${diff} BPM)` : `Consistent (±${diff} BPM)`;
    if (diff <= 25)
      return isSpanish ? `Moderado (${min}–${max} BPM)` : `Moderate (${min}–${max} BPM)`;
    return isSpanish ? `Dinámico (${min}–${max} BPM)` : `Dynamic (${min}–${max} BPM)`;
  }, [setlist, isSpanish]);

  const keyVariety = useMemo(() => {
    if (setlist.length === 0) return '—';
    const keys = setlist.map((s) => s.key?.trim().toUpperCase()).filter((k): k is string => !!k);

    if (keys.length === 0) return '—';
    const unique = Array.from(new Set(keys));
    if (unique.length === 1)
      return isSpanish ? `Tono Único (${unique[0]})` : `Single Key (${unique[0]})`;
    return isSpanish ? `${unique.length} Tonos Distintos` : `${unique.length} Distinct Keys`;
  }, [setlist, isSpanish]);

  const transitionFluidity = useMemo(() => {
    if (setlist.length < 2) return '—';
    let totalDelta = 0;
    let comparisons = 0;

    for (let i = 1; i < setlist.length; i++) {
      const prevE = setlist[i - 1].energy || 50;
      const currE = setlist[i].energy || 50;
      totalDelta += Math.abs(currE - prevE);
      comparisons++;
    }

    const avgDelta = comparisons > 0 ? Math.round(totalDelta / comparisons) : 0;
    if (avgDelta <= 15) return isSpanish ? 'Flujo Armónico Suave' : 'Smooth Harmonic Flow';
    if (avgDelta <= 30) return isSpanish ? 'Impulso Equilibrado' : 'Balanced Momentum';
    return isSpanish ? 'Alto Contraste Dinámico' : 'High Dynamic Contrast';
  }, [setlist, isSpanish]);

  // Filtered/Sorted list for display
  const displayList = useMemo(() => {
    if (sortBy === 'default') return setlist;
    const copy = [...setlist];
    if (sortBy === 'title') {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'bpm') {
      copy.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
    } else if (sortBy === 'key') {
      copy.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
    }
    return copy;
  }, [setlist, sortBy]);

  const handleCycleSort = () => {
    setSortBy((prev) => {
      if (prev === 'default') return 'title';
      if (prev === 'title') return 'bpm';
      if (prev === 'bpm') return 'key';
      return 'default';
    });
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addSong({
      title: title.trim(),
      artist: artist.trim() || undefined,
      key: songKey.trim() || undefined,
      bpm: bpm ? parseInt(bpm, 10) : undefined,
      duration: duration.trim() || '3:30',
      energy: energy ? parseInt(energy, 10) : 75,
    });
    setTitle('');
    setArtist('');
    setSongKey('');
    setBpm('');
    setDuration('3:30');
    setEnergy('75');
    setIsAdding(false);
  };

  // Theme Design Tokens
  const cardBg = 'var(--c-bg-card)';
  const cardBorder = '1px solid var(--c-border)';
  const innerBg = 'var(--app-surface-low)';
  const innerBorder = '1px solid var(--c-border)';
  const dividerColor = 'var(--c-border)';
  const textPrimary = 'var(--c-text-primary)';
  const textSecondary = 'var(--c-text-secondary)';
  const textMuted = 'var(--c-text-muted)';

  return (
    <StageSetupDetailLayout
      title={setlistTr?.title || tr.stagex?.setlistTitle || 'Setlist'}
      onBack={onBack}
      isLight={isLight}
      isAmoled={isAmoled}
      toolbarActions={
        <div className="flex items-center gap-2">
          {/* Preset Selector Pill */}
          <button
            type="button"
            onClick={() => setIsPresetModalOpen(true)}
            className="h-9 px-3 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border"
            style={{
              backgroundColor: innerBg,
              borderColor: innerBorder,
              color: textPrimary,
            }}
            title={isSpanish ? 'Gestionar repertorios' : 'Manage setlist presets'}
            aria-label={isSpanish ? 'Gestionar repertorios' : 'Manage setlist presets'}
            data-testid="btn-preset-selector"
          >
            <svg className="w-3.5 h-3.5 opacity-70 shrink-0 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-xs font-bold max-w-[95px] sm:max-w-[140px] truncate">
              {activePreset?.name || (isSpanish ? 'Show Principal' : 'Main Show')}
            </span>
            <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Add Track Button */}
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 hover:opacity-90"
            style={{
              backgroundColor: 'var(--c-text-primary)',
              color: 'var(--app-bg)',
            }}
            title={isAdding ? setlistTr?.cancel || 'Cancel' : setlistTr?.addTrack || 'Add Track'}
            aria-label={isAdding ? setlistTr?.cancel || 'Cancel' : setlistTr?.addTrack || 'Add Track'}
            data-testid="btn-toggle-add-track"
          >
            <svg
              className="w-5 h-5 transition-transform duration-200"
              style={{ transform: isAdding ? 'rotate(45deg)' : 'rotate(0deg)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      }
    >
      <div className="space-y-3.5 pb-8">
        {/* ── 1. CURRENT ARRANGEMENT SUBHEADER (STITCH PARITY) ────────── */}
        <section
          className="flex flex-col gap-2.5 px-1 pt-1"
          data-testid="arrangement-header"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2
                className="font-extrabold text-[22px] tracking-tight leading-none"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {activePreset?.name || setlistTr?.currentArrangement || (isSpanish ? 'Repertorio Actual' : 'Current Arrangement')}
              </h2>
            </div>

          <div className="flex items-center space-x-2">
            {/* Sort / Filter Button */}
            <button
              type="button"
              onClick={handleCycleSort}
              aria-label={setlistTr?.filterArrangement || 'Filter arrangement'}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{
                color: sortBy !== 'default' ? (isLight ? '#09090b' : '#ffffff') : textSecondary,
                backgroundColor:
                  sortBy !== 'default'
                    ? isLight
                      ? 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
              }}
              title={
                sortBy === 'default'
                  ? setlistTr?.sortFilter || 'Sort / Filter'
                  : isSpanish
                    ? `Ordenado por ${sortBy.toUpperCase()}`
                    : `Sorted by ${sortBy.toUpperCase()}`
              }
              data-testid="btn-filter-arrangement"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>

            {/* Sections Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSections((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: showSections
                  ? isLight
                    ? 'rgba(0, 0, 0, 0.06)'
                    : 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
                color: showSections ? textPrimary : textSecondary,
              }}
              title={isSpanish ? 'Alternar Secciones' : 'Toggle Sections'}
              data-testid="btn-toggle-sections"
            >
              <svg
                className="w-4 h-4 stroke-[2]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect height="6" rx="1.5" width="18" x="3" y="4" />
                <rect height="6" rx="1.5" width="18" x="3" y="14" />
              </svg>
              <span
                className="text-xs font-bold tracking-wider uppercase"
                style={{ fontFamily: 'var(--studio-font-display)' }}
              >
                {isSpanish ? 'SECCIONES' : 'SECTIONS'}
              </span>
            </button>
          </div>
        </div>

        {/* Preset Fast Tabs for Instant 1-Tap Switching */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {setlistPresets.map((preset) => {
            const isSelected = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95"
                style={{
                  backgroundColor: isSelected ? 'var(--c-text-primary)' : innerBg,
                  color: isSelected ? 'var(--app-bg)' : textSecondary,
                  border: isSelected ? 'none' : `1px solid var(--c-border)`,
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
                data-testid={`preset-tab-${preset.id}`}
              >
                <span>{preset.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                  style={{
                    backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'var(--c-border)',
                    color: isSelected ? 'var(--app-bg)' : textSecondary,
                  }}
                >
                  {preset.songs?.length || 0}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsPresetModalOpen(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100 border"
            style={{
              backgroundColor: innerBg,
              borderColor: innerBorder,
              color: textSecondary,
            }}
            title={isSpanish ? 'Gestionar Repertorios' : 'Manage Presets'}
            data-testid="btn-manage-presets"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{isSpanish ? 'Gestionar' : 'Manage'}</span>
          </button>
        </div>
      </section>

        {/* ── 2. INLINE ADD TRACK FORM ─────────────────────────────────── */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleAddSong}
              className="p-5 rounded-[24px] border shadow-card flex flex-col gap-3.5"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              data-testid="form-add-track"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: textSecondary, fontFamily: 'var(--studio-font-display)' }}
                >
                  Add New Track
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: textSecondary }}
                  aria-label="Close"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={setlistTr?.formSongTitle || 'Song Title *'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  autoFocus
                  required
                  data-testid="input-song-title"
                />
                <input
                  type="text"
                  placeholder="Artist / Composer (optional)"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="input-song-artist"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Am"
                    value={songKey}
                    onChange={(e) => setSongKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-key"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    BPM
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-bpm"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3:45"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-duration"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Energy (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 75"
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-energy"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer opacity-70 hover:opacity-100"
                  style={{ color: textSecondary }}
                >
                  {setlistTr?.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95"
                  style={{
                    backgroundColor: 'var(--c-text-primary)',
                    color: 'var(--app-bg)',
                  }}
                  data-testid="btn-submit-track"
                >
                  Add to Setlist
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── 3. EMPTY STATE OR POPULATED ARRANGEMENT ─────────────────── */}
        {setlist.length === 0 ? (
          /* Empty Setlist Card matching Stitch Reference */
          <section
            className="w-full rounded-3xl p-7 shadow-card border text-center flex flex-col items-center justify-center min-h-[175px]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="setlist-empty-state"
          >
            <p
              className="text-[12px] font-extrabold tracking-[0.08em] max-w-[270px] leading-relaxed uppercase mb-4"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {isSpanish
                ? 'NO HAY CANCIONES — TOCA AÑADIR CANCIÓN PARA INICIAR TU REPERTORIO.'
                : 'NO SONGS YET — TAP ADD NEW TRACK TO START YOUR SETLIST.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="group inline-flex items-center space-x-2 text-xs font-bold tracking-wider uppercase active:scale-95 transition-all py-1.5 px-4 rounded-full cursor-pointer border"
              style={{
                backgroundColor: innerBg,
                borderColor: innerBorder,
                color: textSecondary,
              }}
              data-testid="btn-empty-add-track"
            >
              <svg
                className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                <path
                  d="M12 8v8m-4-4h8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span
                className="tracking-[0.06em]"
                style={{ fontFamily: 'var(--studio-font-display)' }}
              >
                {isSpanish ? 'AÑADIR CANCIÓN' : 'ADD NEW TRACK'}
              </span>
            </button>
          </section>
        ) : (
          /* Populated Arrangement Tracks Container */
          <div
            className="p-4 rounded-3xl border shadow-card flex flex-col gap-2.5"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="setlist-populated-container"
          >
            {showSections && (
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: textSecondary, fontFamily: 'var(--studio-font-display)' }}
                >
                  SET 1 — MAIN PERFORMANCE ({displayList.length})
                </span>
                <span className="text-[10.5px] font-mono" style={{ color: textMuted }}>
                  {totalDuration}
                </span>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={displayList}
              onReorder={(newOrder) => {
                if (sortBy !== 'default') {
                  setSortBy('default');
                }
                setSetlistSongs(newOrder);
              }}
              className="flex flex-col gap-2.5"
              style={{ listStyle: 'none', padding: 0, margin: 0 }}
            >
              {displayList.map((song, idx) => (
                <SetlistSongCard
                  key={song.id}
                  song={song}
                  idx={idx}
                  isSortActive={sortBy !== 'default'}
                  isSpanish={isSpanish}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  innerBg={innerBg}
                  innerBorder={innerBorder}
                  onRemove={() => removeSong(song.id)}
                />
              ))}
            </Reorder.Group>
          </div>
        )}

        {/* ── 4. METRIC CARDS STACK (STITCH PARITY) ────────────────────── */}
        <div className="space-y-3" data-testid="metrics-summary">
          {/* Card 1: Songs Count */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-songs-count"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statTracks || (isSpanish ? 'CANCIONES' : 'SONGS COUNT')}
            </span>
            <span
              className="block font-black text-4xl mt-1 leading-none"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {setlist.length}
            </span>
          </article>

          {/* Card 2: Total Duration */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-total-duration"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statTotalRuntime || (isSpanish ? 'DURACIÓN TOTAL' : 'TOTAL DURATION')}
            </span>
            <span
              className="block font-black text-4xl mt-1 leading-none tracking-tight"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {totalDuration}
            </span>
          </article>

          {/* Card 3: Average Energy */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-avg-energy"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statEnergy || (isSpanish ? 'ENERGÍA PROMEDIO' : 'AVG ENERGY')}
            </span>
            <div className="mt-2.5 h-6 flex items-center justify-between">
              {avgEnergy !== null ? (
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: innerBorder }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, avgEnergy))}%`,
                        backgroundColor:
                          avgEnergy >= 75 ? '#ef4444' : avgEnergy >= 50 ? '#f97316' : '#10b981',
                      }}
                    />
                  </div>
                  <span
                    className="font-black text-base"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    {avgEnergy}%
                  </span>
                </div>
              ) : (
                <span
                  className="inline-block w-8 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--c-text-primary)' }}
                />
              )}
            </div>
          </article>
        </div>

        {/* ── 5. SETLIST INSIGHTS CARD (STITCH PARITY) ────────────────── */}
        <section
          className="rounded-3xl px-6 py-5 shadow-card border mt-1"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-testid="card-setlist-insights"
        >
          <h3
            className="text-[11px] font-extrabold tracking-wider uppercase mb-4"
            style={{
              color: textPrimary,
              fontFamily: 'var(--studio-font-display)',
              letterSpacing: '0.08em',
            }}
          >
            {isSpanish ? 'ANÁLISIS DEL REPERTORIO' : 'SETLIST INSIGHTS'}
          </h3>

          <div className="space-y-4">
            {/* Tempo Stability */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightTempoDynamics ||
                  (isSpanish ? 'Estabilidad de Tempo' : 'Tempo Stability')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-tempo-stability"
              >
                {tempoStability}
              </span>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />

            {/* Key Variety */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightKeyHarmony || (isSpanish ? 'Variedad Tonal' : 'Key Variety')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-key-variety"
              >
                {keyVariety}
              </span>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />

            {/* Transition Fluidity */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightShowFlow ||
                  (isSpanish ? 'Fluidez de Transición' : 'Transition Fluidity')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-transition-fluidity"
              >
                {transitionFluidity}
              </span>
            </div>
          </div>
        </section>
      </div>

      <SetlistPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={setlistPresets}
        activePresetId={activePresetId}
        onSelectPreset={(id) => {
          selectPreset(id);
          setIsPresetModalOpen(false);
        }}
        onCreatePreset={(name, initialSongs) => {
          createPreset(name, initialSongs);
          setIsPresetModalOpen(false);
        }}
        onRenamePreset={renamePreset}
        onDeletePreset={deletePreset}
        onDuplicatePreset={duplicatePreset}
        currentSongs={setlist}
        isSpanish={isSpanish}
        isLight={isLight}
        cardBg={cardBg}
        cardBorder={cardBorder}
        innerBg={innerBg}
        innerBorder={innerBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </StageSetupDetailLayout>
  );
};
