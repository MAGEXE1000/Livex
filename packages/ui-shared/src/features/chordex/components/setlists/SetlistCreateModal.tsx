import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Setlist } from '@workspace/livex-core';

interface SetlistCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    date?: string;
    initialSectionName?: string;
  }) => void;
  initialSetlist?: Setlist | null;
  accentColor?: string;
}

export const SetlistCreateModal: React.FC<SetlistCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSetlist,
  accentColor = '#2563EB',
}) => {
  const isEditing = Boolean(initialSetlist);
  const [title, setTitle] = useState(initialSetlist?.title || '');
  const [date, setDate] = useState(initialSetlist?.date || '');
  const [description, setDescription] = useState(initialSetlist?.description || '');
  const [initialSectionName, setInitialSectionName] = useState('Set 1');

  React.useEffect(() => {
    if (initialSetlist) {
      setTitle(initialSetlist.title || '');
      setDate(initialSetlist.date || '');
      setDescription(initialSetlist.description || '');
    } else {
      setTitle('');
      setDate('');
      setDescription('');
      setInitialSectionName('Set 1');
    }
  }, [initialSetlist, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date: date.trim() || undefined,
      description: description.trim() || undefined,
      initialSectionName: !isEditing ? initialSectionName.trim() || 'Set 1' : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="w-full max-w-md rounded-3xl p-6 shadow-2xl border flex flex-col gap-4 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card-bg, #16161a)',
            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
            color: 'var(--c-text-primary, #FFFFFF)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                  color: accentColor,
                }}
              >
                <span className="material-symbols-rounded text-xl">
                  {isEditing ? 'edit_note' : 'playlist_add'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">
                  {isEditing ? 'Edit Setlist' : 'New Setlist'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isEditing
                    ? 'Update repertoire details and performance info'
                    : 'Create a structured repertoire for rehearsal or live gig'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">
                Setlist Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                data-testid="setlist-title-input"
                placeholder="e.g. Repertorio 1, Festival Set 2026..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none transition-all"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                  color: 'var(--c-text-primary, #FFFFFF)',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Target Performance Date</label>
              <input
                type="text"
                data-testid="setlist-date-input"
                placeholder="e.g. Oct 15, 2026 or 2026-10-15"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none transition-all"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                  color: 'var(--c-text-primary, #FFFFFF)',
                }}
              />
            </div>

            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">First Section Name</label>
                <input
                  type="text"
                  data-testid="setlist-section-input"
                  placeholder="e.g. Set 1, Bloque 1, Acoustic..."
                  value={initialSectionName}
                  onChange={(e) => setInitialSectionName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                    borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                    color: 'var(--c-text-primary, #FFFFFF)',
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Description / Notes</label>
              <textarea
                rows={2}
                data-testid="setlist-desc-input"
                placeholder="Optional notes, venue details, or gig guidelines..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all resize-none"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                  color: 'var(--c-text-primary, #FFFFFF)',
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                data-testid="save-setlist-btn"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 14px color-mix(in srgb, ${accentColor} 40%, transparent)`,
                }}
              >
                {isEditing ? 'Save Changes' : 'Create Setlist'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
