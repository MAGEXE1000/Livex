import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  Plus,
  Check,
  MoreVertical,
  Trash2,
  Copy,
  Edit2,
  X,
  Music,
} from 'lucide-react';
import { useSettingsStore } from '@workspace/livex-core';

export interface SetlistPresetItem {
  id: string;
  name?: string;
  title?: string;
  songs?: any[];
  sections?: any[];
  date?: string;
}

export interface SetlistPresetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setlists: SetlistPresetItem[];
  activeSetlistId: string;
  onSelectSetlist: (id: string) => void;
  onCreateSetlist?: (name: string) => void;
  onRenameSetlist?: (id: string, name: string) => void;
  onDeleteSetlist?: (id: string) => void;
  onDuplicateSetlist?: (id: string) => void;
}

export const SetlistPresetDrawer: React.FC<SetlistPresetDrawerProps> = ({
  isOpen,
  onClose,
  setlists,
  activeSetlistId,
  onSelectSetlist,
  onCreateSetlist,
  onRenameSetlist,
  onDeleteSetlist,
  onDuplicateSetlist,
}) => {
  const isLight = useSettingsStore((s) => s.settings.theme === 'light');
  const isSpanish = useSettingsStore((s) => s.settings.language === 'es');

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTitle.trim()) return;
    onCreateSetlist?.(newTitle.trim());
    setNewTitle('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (id: string) => {
    if (!editingName.trim()) return;
    onRenameSetlist?.(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            data-testid="setlist-drawer-backdrop"
          />

          {/* Drawer Surface */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg rounded-t-3xl border-t border-x border-white/10 p-5 pb-8 shadow-2xl flex flex-col max-h-[85vh] z-10"
            style={{
              backgroundColor: isLight ? '#ffffff' : '#09090b',
              color: isLight ? '#09090b' : '#ffffff',
            }}
            data-testid="setlist-preset-drawer"
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 opacity-70" />
                <h3 className="font-extrabold text-base tracking-tight" style={{ fontFamily: 'var(--studio-font-display)' }}>
                  {isSpanish ? 'Repertorios de Setlist' : 'Setlist Presets'}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 opacity-70">
                  {setlists.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Setlists List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar my-2">
              {setlists.map((st) => {
                const isActive = st.id === activeSetlistId;
                const name = st.name || st.title || 'Untitled Setlist';
                const songCount =
                  st.songs?.length ??
                  st.sections?.reduce((acc: number, sec: any) => acc + (sec.songs?.length || 0), 0) ??
                  0;

                if (editingId === st.id) {
                  return (
                    <div
                      key={st.id}
                      className="p-3 rounded-2xl border border-white/20 bg-white/5 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(st.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameSubmit(st.id)}
                        className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1.5 rounded-xl text-white/50 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      onSelectSetlist(st.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.98] ${
                      isActive
                        ? 'bg-white/10 border-white/30 shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
                    }`}
                    data-testid={`setlist-preset-item-${st.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {isActive ? <Check className="w-4 h-4 stroke-[3]" /> : <Music className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/90'}`}>
                          {name}
                        </p>
                        <p className="text-[11px] opacity-50 truncate">
                          {songCount} {songCount === 1 ? (isSpanish ? 'canción' : 'track') : (isSpanish ? 'canciones' : 'tracks')}
                        </p>
                      </div>
                    </div>

                    {/* Quick item actions */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onRenameSetlist && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(st.id);
                            setEditingName(name);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDuplicateSetlist && (
                        <button
                          type="button"
                          onClick={() => onDuplicateSetlist(st.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteSetlist && setlists.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSetlist(st.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Setlist Action */}
            <div className="pt-3 border-t border-white/10 mt-2">
              {isCreating ? (
                <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={isSpanish ? 'Nombre del nuevo repertorio...' : 'New setlist name...'}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                  />
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs disabled:opacity-40"
                  >
                    {isSpanish ? 'Crear' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-2.5 rounded-xl text-white/60 hover:text-white text-xs font-semibold"
                  >
                    {isSpanish ? 'Cancelar' : 'Cancel'}
                  </button>
                </form>
              ) : (
                onCreateSetlist && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/10"
                    data-testid="btn-drawer-create-setlist"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSpanish ? 'Crear Nuevo Repertorio' : 'Create New Setlist'}</span>
                  </button>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
