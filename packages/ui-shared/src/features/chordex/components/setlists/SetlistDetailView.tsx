import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  type Setlist,
  type SongPreset,
  type SetlistSection,
  useChordStore,
  calculateSetlistStats,
  formatDurationMmSs,
} from '@workspace/livex-core';
import { SharedFloatingHeader } from '../../../../shared/layout/StudioLayoutSystem';
import { SetlistSongPickerModal } from './SetlistSongPickerModal';
import { SetlistCreateModal } from './SetlistCreateModal';
import { Dialog } from '../../../../shared/design-system/dialogs';
import { Button } from '../../../../shared/design-system/StudioDesignSystem';

interface SetlistDetailViewProps {
  setlistId: string;
  allPresets: SongPreset[];
  accentColor?: string;
  onBack: () => void;
  onPlayLiveSetlist: (setlist: Setlist, startingSongIndex?: number) => void;
  onOpenSongInEditor?: (songId: string) => void;
}

export const SetlistDetailView: React.FC<SetlistDetailViewProps> = ({
  setlistId,
  allPresets,
  accentColor = '#2563EB',
  onBack,
  onPlayLiveSetlist,
  onOpenSongInEditor,
}) => {
  const setlist = useChordStore((s) => (s.setlists || []).find((st: Setlist) => st.id === setlistId));
  const updateSetlist = useChordStore((s) => s.updateSetlist);
  const deleteSetlist = useChordStore((s) => s.deleteSetlist);
  const duplicateSetlist = useChordStore((s) => s.duplicateSetlist);
  const addSectionToSetlist = useChordStore((s) => s.addSectionToSetlist);
  const updateSetlistSection = useChordStore((s) => s.updateSetlistSection);
  const deleteSetlistSection = useChordStore((s) => s.deleteSetlistSection);
  const reorderSetlistSections = useChordStore((s) => s.reorderSetlistSections);
  const addSongsToSetlistSection = useChordStore((s) => s.addSongsToSetlistSection);
  const removeSongFromSetlistSection = useChordStore((s) => s.removeSongFromSetlistSection);
  const reorderSongsInSetlistSection = useChordStore((s) => s.reorderSongsInSetlistSection);
  const moveSongBetweenSetlistSections = useChordStore((s) => s.moveSongBetweenSetlistSections);

  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [showNewSectionDialog, setShowNewSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [movingSong, setMovingSong] = useState<{
    sectionId: string;
    songIndex: number;
    songName: string;
  } | null>(null);

  const stats = useMemo(() => {
    if (!setlist) return { totalSongs: 0, totalDurationSeconds: 0, sectionCount: 0, songsBySection: {} };
    return calculateSetlistStats(setlist, allPresets);
  }, [setlist, allPresets]);

  const presetMap = useMemo(() => {
    const map = new Map<string, SongPreset>();
    allPresets.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPresets]);

  if (!setlist) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-400">Setlist not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 px-4 py-2 rounded-full text-xs font-bold bg-white/10 text-white"
        >
          Return to Setlists
        </button>
      </div>
    );
  }

  const handleOpenSongPicker = (sectionId: string) => {
    setPickerSectionId(sectionId);
    setShowPickerModal(true);
  };

  const handleAddSongsToSection = (sectionId: string, songIds: string[]) => {
    addSongsToSetlistSection(setlist.id, sectionId, songIds);
  };

  const handleCreateNewSection = () => {
    if (!newSectionName.trim()) return;
    addSectionToSetlist(setlist.id, newSectionName.trim());
    setNewSectionName('');
    setShowNewSectionDialog(false);
  };

  const formattedTotalDuration = (() => {
    if (stats.totalDurationSeconds === 0) return '0:00';
    const mins = Math.floor(stats.totalDurationSeconds / 60);
    const secs = stats.totalDurationSeconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const rem = mins % 60;
      return `${hours}h ${rem}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  })();

  // Global song numbering tracking
  let globalSongCounter = 0;

  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      data-purpose="setlist-detail-screen"
    >
      <SharedFloatingHeader
        title={setlist.title}
        subtitle={
          <span className="flex items-center gap-1.5 justify-center tracking-normal font-semibold">
            {setlist.date && (
              <>
                <span className="truncate max-w-[100px]">{setlist.date}</span>
                <span className="opacity-40">•</span>
              </>
            )}
            <span>{stats.totalSongs} {stats.totalSongs === 1 ? 'Song' : 'Songs'}</span>
            <span className="opacity-40">•</span>
            <span>{formattedTotalDuration}</span>
          </span>
        }
        onBack={onBack}
        backBtnTestId="setlist-detail-back-btn"
        toolbarActions={
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setShowEditInfoModal(true)}
              title="Edit setlist info"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--c-text-primary, #FFFFFF)',
              }}
            >
              <span className="material-symbols-rounded text-lg">edit</span>
            </motion.button>

            {stats.totalSongs > 0 && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                data-testid="setlist-start-live-btn"
                onClick={() => onPlayLiveSetlist(setlist, 0)}
                title="Start live setlist rehearsal"
                className="h-9 px-3.5 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 80%, #000))`,
                  color: '#FFFFFF',
                  boxShadow: `0 3px 12px color-mix(in srgb, ${accentColor} 35%, transparent)`,
                }}
              >
                <span className="material-symbols-rounded text-xl">play_arrow</span>
                <span className="text-xs font-bold tracking-tight">Play Live</span>
              </motion.button>
            )}
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--app-bg)' }}>
        <main
          className="w-full max-w-md mx-auto pb-36 px-4 space-y-4"
          style={{
            paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 92px)',
          }}
          data-purpose="setlist-detail-content"
        >
          {/* Setlist Summary Card */}
          <div
            className="p-4 rounded-3xl border shadow-soft-card flex flex-col gap-2.5"
            style={{
              backgroundColor: 'var(--surface-card-bg, #1e1e24)',
              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.09))',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-xl" style={{ color: accentColor }}>
                  queue_music
                </span>
                <h2 className="text-sm font-black tracking-tight">{setlist.title}</h2>
              </div>
              {setlist.date && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                  {setlist.date}
                </span>
              )}
            </div>

            {setlist.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{setlist.description}</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
              <span>{stats.sectionCount} {stats.sectionCount === 1 ? 'Section' : 'Sections'} • {stats.totalSongs} Songs</span>
              <span className="font-semibold text-slate-200">Total: {formattedTotalDuration}</span>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4" data-purpose="setlist-sections-container">
            {(setlist.sections || []).map((section, secIdx) => {
              const isFirstSec = secIdx === 0;
              const isLastSec = secIdx === (setlist.sections.length - 1);
              const isEditing = editingSectionId === section.id;
              const sectionSongs = (section.songIds || []).map((sId) => presetMap.get(sId)).filter(Boolean) as SongPreset[];

              let sectionDurationSec = 0;
              sectionSongs.forEach((s) => {
                sectionDurationSec += s.targetDurationSeconds && s.targetDurationSeconds > 0 ? s.targetDurationSeconds : 180;
              });

              return (
                <div
                  key={section.id}
                  className="rounded-3xl border shadow-soft-card p-4 transition-all"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #1e1e24)',
                    borderColor: 'var(--c-border, rgba(255, 255, 255, 0.09))',
                  }}
                  data-purpose="setlist-section"
                  data-testid={`setlist-section-${section.id}`}
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-1.5 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />

                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingSectionName}
                          onChange={(e) => setEditingSectionName(e.target.value)}
                          onBlur={() => {
                            if (editingSectionName.trim()) {
                              updateSetlistSection(setlist.id, section.id, editingSectionName.trim());
                            }
                            setEditingSectionId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingSectionName.trim()) {
                                updateSetlistSection(setlist.id, section.id, editingSectionName.trim());
                              }
                              setEditingSectionId(null);
                            }
                            if (e.key === 'Escape') setEditingSectionId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border outline-none bg-black/40 text-white"
                          style={{ borderColor: accentColor }}
                        />
                      ) : (
                        <div className="min-w-0">
                          <h3
                            className="text-xs font-black tracking-wider uppercase truncate"
                            style={{ color: accentColor }}
                          >
                            {section.name}
                          </h3>
                          <span className="text-[10px] text-slate-400">
                            {sectionSongs.length} {sectionSongs.length === 1 ? 'song' : 'songs'} • {formatDurationMmSs(sectionDurationSec)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Section Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenSongPicker(section.id)}
                        data-testid={`add-songs-sec-${section.id}`}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                          color: accentColor,
                          border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
                        }}
                      >
                        <span className="material-symbols-rounded text-sm">add</span>
                        <span>Add Songs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setEditingSectionName(section.name);
                        }}
                        title="Rename section"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">edit</span>
                      </button>

                      {/* Section order up/down */}
                      <button
                        type="button"
                        disabled={isFirstSec}
                        onClick={() => reorderSetlistSections(setlist.id, secIdx, secIdx - 1)}
                        title="Move section up"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={isLastSec}
                        onClick={() => reorderSetlistSections(setlist.id, secIdx, secIdx + 1)}
                        title="Move section down"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">arrow_downward</span>
                      </button>

                      {/* Delete section (if > 1 section or empty) */}
                      <button
                        type="button"
                        onClick={() => deleteSetlistSection(setlist.id, section.id)}
                        title="Delete section"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Songs in Section */}
                  {section.songIds.length === 0 ? (
                    <div
                      onClick={() => handleOpenSongPicker(section.id)}
                      className="border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 transition-colors"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}
                    >
                      <span className="material-symbols-rounded text-xl mb-1 text-slate-400">
                        playlist_add
                      </span>
                      <p className="text-xs font-semibold text-slate-300">
                        No songs in {section.name} yet
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Tap here to select and add songs from your library
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {section.songIds.map((songId, songIdx) => {
                        globalSongCounter += 1;
                        const currentGlobalIdx = globalSongCounter - 1;
                        const song = presetMap.get(songId);
                        const isFirstSong = songIdx === 0;
                        const isLastSong = songIdx === section.songIds.length - 1;

                        if (!song) {
                          return (
                            <div
                              key={`${songId}-${songIdx}`}
                              className="p-2.5 rounded-xl border border-dashed border-red-500/30 flex items-center justify-between text-xs text-red-400"
                            >
                              <span>Deleted Song (ID: {songId})</span>
                              <button
                                type="button"
                                onClick={() => removeSongFromSetlistSection(setlist.id, section.id, songIdx)}
                                className="text-xs font-bold"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        }

                        const durStr = song.targetDurationSeconds && song.targetDurationSeconds > 0
                          ? formatDurationMmSs(song.targetDurationSeconds)
                          : undefined;

                        return (
                          <div
                            key={`${song.id}-${songIdx}`}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition-all hover:border-white/20 select-none group"
                            style={{
                              backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
                              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
                            }}
                            data-testid={`setlist-song-${song.id}`}
                          >
                            {/* Left: Number + Song Info */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--c-text-primary, #FFFFFF)',
                                }}
                              >
                                {globalSongCounter}
                              </span>

                              <div
                                className="min-w-0 cursor-pointer"
                                onClick={() => onOpenSongInEditor?.(song.id)}
                                title="Open in song editor"
                              >
                                <h4 className="text-xs font-bold truncate leading-tight group-hover:text-blue-400 transition-colors">
                                  {song.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                                  {song.artist && <span className="truncate max-w-[100px]">{song.artist}</span>}
                                  {song.key && (
                                    <span className="px-1 py-0.2 rounded font-bold bg-white/10 text-slate-200">
                                      {song.key}
                                    </span>
                                  )}
                                  <span>{song.bpm || song.speed || 120} BPM</span>
                                  {durStr && (
                                    <span className="text-blue-400 font-medium">{durStr}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Actions: Reorder, Move, Play, Remove */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Quick Play from this song */}
                              <button
                                type="button"
                                onClick={() => onPlayLiveSetlist(setlist, currentGlobalIdx)}
                                title={`Play live starting from "${song.name}"`}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors"
                              >
                                <span className="material-symbols-rounded text-base">play_arrow</span>
                              </button>

                              {/* Song Up / Down */}
                              <button
                                type="button"
                                disabled={isFirstSong}
                                onClick={() => reorderSongsInSetlistSection(setlist.id, section.id, songIdx, songIdx - 1)}
                                title="Move song up"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                              >
                                <span className="material-symbols-rounded text-sm">keyboard_arrow_up</span>
                              </button>
                              <button
                                type="button"
                                disabled={isLastSong}
                                onClick={() => reorderSongsInSetlistSection(setlist.id, section.id, songIdx, songIdx + 1)}
                                title="Move song down"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                              >
                                <span className="material-symbols-rounded text-sm">keyboard_arrow_down</span>
                              </button>

                              {/* Move to another section */}
                              {setlist.sections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setMovingSong({ sectionId: section.id, songIndex: songIdx, songName: song.name })}
                                  title="Move to another section"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                  <span className="material-symbols-rounded text-sm">drive_file_move</span>
                                </button>
                              )}

                              {/* Remove from setlist */}
                              <button
                                type="button"
                                onClick={() => removeSongFromSetlistSection(setlist.id, section.id, songIdx)}
                                title="Remove song from setlist (keeps song in library)"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <span className="material-symbols-rounded text-sm">close</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Section Button */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              data-testid="btn-add-section"
              onClick={() => setShowNewSectionDialog(true)}
              className="w-full py-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.02))',
              }}
            >
              <span className="material-symbols-rounded text-base">add_circle</span>
              <span>Add Custom Section (Set 2, Acoustic, Encore...)</span>
            </motion.button>
          </div>
        </main>
      </div>

      {/* Song Picker Modal */}
      {pickerSectionId && (
        <SetlistSongPickerModal
          isOpen={showPickerModal}
          onClose={() => {
            setShowPickerModal(false);
            setPickerSectionId(null);
          }}
          songs={allPresets}
          sections={setlist.sections}
          targetSectionId={pickerSectionId}
          onAddSongs={handleAddSongsToSection}
          accentColor={accentColor}
        />
      )}

      {/* Edit Setlist Metadata Modal */}
      <SetlistCreateModal
        isOpen={showEditInfoModal}
        onClose={() => setShowEditInfoModal(false)}
        initialSetlist={setlist}
        onSave={(data) => {
          updateSetlist(setlist.id, {
            title: data.title,
            description: data.description,
            date: data.date,
          });
          setShowEditInfoModal(false);
        }}
        accentColor={accentColor}
      />

      {/* Add New Section Modal */}
      {showNewSectionDialog && (
        <Dialog
          open={true}
          onClose={() => setShowNewSectionDialog(false)}
          title="Add Section to Setlist"
          footer={
            <>
              <Button onClick={() => setShowNewSectionDialog(false)}>Cancel</Button>
              <Button
                data-testid="confirm-add-section-btn"
                onClick={handleCreateNewSection}
                style={{
                  backgroundColor: accentColor,
                  color: '#ffffff',
                }}
              >
                Add Section
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-300 m-0">
              Enter a custom section name (e.g. &quot;Set 2&quot;, &quot;Acoustic Break&quot;, &quot;Encore&quot;):
            </p>
            <input
              autoFocus
              type="text"
              data-testid="new-section-name-input"
              placeholder="e.g. Bloque 2, Encore, Medley..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNewSection();
              }}
              className="w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none bg-black/40 text-white mt-1"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
            />
          </div>
        </Dialog>
      )}

      {/* Move Song Between Sections Modal */}
      {movingSong && (
        <Dialog
          open={true}
          onClose={() => setMovingSong(null)}
          title={`Move "${movingSong.songName}"`}
          footer={
            <Button onClick={() => setMovingSong(null)}>Cancel</Button>
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-300 m-0">Select target section:</p>
            <div className="space-y-1.5 mt-2">
              {setlist.sections.map((sec) => {
                if (sec.id === movingSong.sectionId) return null;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      moveSongBetweenSetlistSections(
                        setlist.id,
                        movingSong.sectionId,
                        movingSong.songIndex,
                        sec.id,
                        sec.songIds.length
                      );
                      setMovingSong(null);
                    }}
                    className="w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold text-left hover:border-blue-400 bg-white/5 transition-colors cursor-pointer"
                  >
                    <span>{sec.name}</span>
                    <span className="text-[10px] text-slate-400">{sec.songIds.length} songs</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
