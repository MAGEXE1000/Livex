import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { SongPreset, SetlistSection } from '@workspace/livex-core';

interface SetlistSongPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: SongPreset[];
  sections: SetlistSection[];
  targetSectionId: string;
  onAddSongs: (sectionId: string, songIds: string[]) => void;
  accentColor?: string;
}

export const SetlistSongPickerModal: React.FC<SetlistSongPickerModalProps> = ({
  isOpen,
  onClose,
  songs,
  sections,
  targetSectionId,
  onAddSongs,
  accentColor = '#2563EB',
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(targetSectionId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  React.useEffect(() => {
    setSelectedSectionId(targetSectionId);
    setSelectedSongIds([]);
    setSearchQuery('');
  }, [targetSectionId, isOpen]);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase().trim();
    return songs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.artist && s.artist.toLowerCase().includes(q)) ||
        (s.key && s.key.toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  if (!isOpen) return null;

  const toggleSelectSong = (id: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSongIds.length === filteredSongs.length) {
      setSelectedSongIds([]);
    } else {
      setSelectedSongIds(filteredSongs.map((s) => s.id));
    }
  };

  const handleAdd = () => {
    if (!selectedSongIds.length || !selectedSectionId) return;
    onAddSongs(selectedSectionId, selectedSongIds);
    onClose();
  };

  const targetSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
          className="w-full max-w-lg rounded-3xl shadow-2xl border flex flex-col overflow-hidden max-h-[85vh]"
          style={{
            backgroundColor: 'var(--surface-card-bg, #16161a)',
            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
            color: 'var(--c-text-primary, #FFFFFF)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                  color: accentColor,
                }}
              >
                <span className="material-symbols-rounded text-xl">playlist_add</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Add Songs to Setlist</h3>
                <p className="text-xs text-slate-400">
                  Target: <span className="font-bold text-slate-200">{targetSection?.name || 'Section'}</span>
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

          {/* Controls: Section selector (if multi) + Search */}
          <div className="p-4 flex flex-col gap-2.5 border-b" style={{ borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))' }}>
            {sections.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Add to:</span>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                    borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                    color: 'var(--c-text-primary, #FFFFFF)',
                  }}
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id} style={{ background: '#1e1e24', color: '#fff' }}>
                      {sec.name} ({sec.songIds.length} songs)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative flex items-center">
              <span className="material-symbols-rounded absolute left-3.5 text-lg text-slate-400 pointer-events-none">
                search
              </span>
              <input
                type="search"
                autoFocus
                placeholder="Search songs by title, artist, key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-xl border text-xs font-medium outline-none transition-all"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                  color: 'var(--c-text-primary, #FFFFFF)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400 font-medium">
                {filteredSongs.length} available songs • {selectedSongIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="font-bold text-xs hover:underline cursor-pointer"
                style={{ color: accentColor }}
              >
                {selectedSongIds.length === filteredSongs.length && filteredSongs.length > 0
                  ? 'Clear All'
                  : 'Select All'}
              </button>
            </div>
          </div>

          {/* Songs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[360px]">
            {filteredSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <span className="material-symbols-rounded text-3xl mb-2 opacity-50">search_off</span>
                <p className="text-xs font-semibold">No songs match your search</p>
              </div>
            ) : (
              filteredSongs.map((song) => {
                const isSelected = selectedSongIds.includes(song.id);
                return (
                  <div
                    key={song.id}
                    data-testid={`picker-song-${song.id}`}
                    onClick={() => toggleSelectSong(song.id)}
                    className="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99]"
                    style={{
                      backgroundColor: isSelected
                        ? `color-mix(in srgb, ${accentColor} 12%, var(--surface-card-bg, #16161a))`
                        : 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
                      borderColor: isSelected
                        ? `color-mix(in srgb, ${accentColor} 40%, transparent)`
                        : 'var(--c-border, rgba(255, 255, 255, 0.08))',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0"
                        style={{
                          backgroundColor: isSelected ? accentColor : 'transparent',
                          borderColor: isSelected
                            ? accentColor
                            : 'var(--c-border, rgba(255, 255, 255, 0.3))',
                        }}
                      >
                        {isSelected && (
                          <span className="material-symbols-rounded text-sm text-white font-bold">
                            check
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate leading-tight">{song.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {song.artist && <span className="truncate max-w-[120px]">{song.artist}</span>}
                          {song.key && (
                            <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-white/10 text-slate-200">
                              {song.key}
                            </span>
                          )}
                          <span className="font-semibold text-[10px]">
                            {song.bpm || song.speed || 120} BPM
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-[11px] font-mono opacity-60">
                        {song.chords?.length || 0} chords
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Footer */}
          <div
            className="p-4 border-t flex items-center justify-between"
            style={{
              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.02))',
            }}
          >
            <span className="text-xs font-medium text-slate-400">
              {selectedSongIds.length} song{selectedSongIds.length !== 1 ? 's' : ''} chosen
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSongIds.length}
                onClick={handleAdd}
                data-testid="picker-add-selected-btn"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 14px color-mix(in srgb, ${accentColor} 40%, transparent)`,
                }}
              >
                <span className="material-symbols-rounded text-base">add</span>
                <span>Add {selectedSongIds.length > 0 ? `${selectedSongIds.length} Songs` : 'Songs'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
