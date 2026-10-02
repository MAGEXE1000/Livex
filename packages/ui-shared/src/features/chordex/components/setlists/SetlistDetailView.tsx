import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import {
  type Setlist,
  type SongPreset,
  type SetlistSection,
  useChordStore,
  useSettingsStore,
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

interface SetlistSongRowProps {
  songId: string;
  songIdx: number;
  song?: SongPreset;
  globalSongCounter: number;
  totalSections: number;
  onOpenSongInEditor?: (songId: string) => void;
  onPlayLiveFromHere: () => void;
  onMoveToSection: () => void;
  onRemove: () => void;
}

const SetlistSongRow: React.FC<SetlistSongRowProps> = ({
  songId,
  songIdx,
  song,
  globalSongCounter,
  totalSections,
  onOpenSongInEditor,
  onPlayLiveFromHere,
  onMoveToSection,
  onRemove,
}) => {
  const dragControls = useDragControls();

  if (!song) {
    return (
      <Reorder.Item
        value={songId}
        id={songId}
        className="p-2.5 rounded-xl border border-dashed border-red-500/30 flex items-center justify-between text-xs text-red-400"
      >
        <span>Deleted Song (ID: {songId})</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-bold"
        >
          Remove
        </button>
      </Reorder.Item>
    );
  }

  const durStr =
    song.targetDurationSeconds && song.targetDurationSeconds > 0
      ? formatDurationMmSs(song.targetDurationSeconds)
      : undefined;

  return (
    <Reorder.Item
      value={songId}
      id={songId}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition-all hover:border-white/20 select-none group"
      style={{
        backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
        borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
        position: 'relative',
      }}
      whileDrag={{
        scale: 1.025,
        boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'var(--surface-container-high, rgba(30, 35, 45, 0.98))',
        borderColor: 'var(--c-accent-from, rgba(59, 130, 246, 0.6))',
        zIndex: 50,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      data-testid={`setlist-song-${song.id}`}
    >
      {/* Left: Drag Handle + Number / Cover Thumbnail + Song Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag Grip Handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-white transition-colors shrink-0 flex items-center justify-center rounded-lg hover:bg-white/5"
          style={{ touchAction: 'none' }}
          title="Drag to reorder"
          data-testid={`drag-handle-${song.id}`}
        >
          <span
            className="material-symbols-rounded text-lg opacity-40 group-hover:opacity-80 transition-opacity"
            style={{ userSelect: 'none' }}
          >
            drag_indicator
          </span>
        </div>

        {/* Thumbnail / Song Number */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden relative"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          {song.coverImage ? (
            <img
              src={song.coverImage}
              alt={song.name}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
            />
          ) : (
            <span
              className="text-[10px] font-black"
              style={{ color: 'var(--c-text-primary, #FFFFFF)' }}
            >
              {globalSongCounter}
            </span>
          )}
        </div>

        {/* Details */}
        <div
          className="min-w-0 cursor-pointer flex-1"
          onClick={() => onOpenSongInEditor?.(song.id)}
          title="Open in song editor"
        >
          <h4 className="text-xs font-bold truncate leading-tight group-hover:text-blue-400 transition-colors">
            {song.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
            {song.artist && <span className="truncate max-w-[100px]">{song.artist}</span>}
            {song.key && (
              <span className="px-1 py-0.5 rounded font-bold bg-white/10 text-slate-200">
                #{song.key}
              </span>
            )}
            <span className="px-1 py-0.5 rounded font-bold bg-white/10 text-slate-200">
              {song.bpm || song.speed || 120} BPM
            </span>
            {durStr && (
              <span className="px-1 py-0.5 rounded font-bold bg-white/10 text-blue-400">
                {durStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions: Play, Move, Remove */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Quick Play from this song */}
        <button
          type="button"
          onClick={onPlayLiveFromHere}
          title={`Play live starting from "${song.name}"`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors"
        >
          <span className="material-symbols-rounded text-base">play_arrow</span>
        </button>

        {/* Move to another section */}
        {totalSections > 1 && (
          <button
            type="button"
            onClick={onMoveToSection}
            title="Move to another section"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-rounded text-sm">drive_file_move</span>
          </button>
        )}

        {/* Remove from setlist */}
        <button
          type="button"
          onClick={onRemove}
          title="Remove song from setlist (keeps song in library)"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span className="material-symbols-rounded text-sm">close</span>
        </button>
      </div>
    </Reorder.Item>
  );
};

export const SetlistDetailView: React.FC<SetlistDetailViewProps> = ({
  setlistId,
  allPresets,
  accentColor = '#2563EB',
  onBack,
  onPlayLiveSetlist,
  onOpenSongInEditor,
}) => {
  const setlist = useChordStore((s) => (s.setlists || []).find((st: Setlist) => st.id === setlistId));
  const isLight = useSettingsStore((s) => s.settings.theme === 'light');
  const updateSetlist = useChordStore((s) => s.updateSetlist);
  const deleteSetlist = useChordStore((s) => s.deleteSetlist);
  const duplicateSetlist = useChordStore((s) => s.duplicateSetlist);
  const addSectionToSetlist = useChordStore((s) => s.addSectionToSetlist);
  const updateSetlistSection = useChordStore((s) => s.updateSetlistSection);
  const deleteSetlistSection = useChordStore((s) => s.deleteSetlistSection);
  const reorderSetlistSections = useChordStore((s) => s.reorderSetlistSections);
  const addSongsToSetlistSection = useChordStore((s) => s.addSongsToSetlistSection);
  const removeSongFromSetlistSection = useChordStore((s) => s.removeSongFromSetlistSection);
  const updateSectionSongsOrder = useChordStore((s) => s.updateSectionSongsOrder);
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

  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      data-purpose="setlist-detail-screen"
    >
      <SharedFloatingHeader
        title={
          <button
            type="button"
            onClick={() => setShowEditInfoModal(true)}
            title="Edit setlist info"
            className="truncate font-extrabold text-[17px] tracking-tight hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent p-0 pointer-events-auto text-center"
            style={{
              fontFamily: 'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
              color: 'var(--c-text-primary)',
            }}
          >
            {setlist.title}
          </button>
        }
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
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              data-testid="setlist-edit-info-btn"
              onClick={() => setShowEditInfoModal(true)}
              title="Edit setlist info"
              aria-label="Edit setlist info"
              className="w-9 h-9 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: 'transparent',
                border: 'none',
                color: isLight ? '#000000' : '#FFFFFF',
              }}
            >
              <span className="material-symbols-rounded text-[20px]">edit</span>
            </motion.button>

            {stats.totalSongs > 0 && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                data-testid="setlist-start-live-btn"
                onClick={() => onPlayLiveSetlist(setlist, 0)}
                title="Start live setlist rehearsal"
                aria-label="Start live rehearsal"
                className="w-9 h-9 flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#000000' : '#FFFFFF',
                }}
              >
                <span
                  className="material-symbols-rounded text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </motion.button>
            )}
          </div>
        }
        sideClearance={stats.totalSongs > 0 ? 80 : 52}
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
          {/* Sections List */}
          <div className="space-y-4" data-purpose="setlist-sections-container">
            {(!setlist.sections || setlist.sections.length === 0 || stats.totalSongs === 0) && (
              <div
                className="p-8 rounded-3xl border flex flex-col items-center justify-center text-center gap-4 mt-4"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.02))',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
                }}
              >
                <span className="material-symbols-rounded text-[40px] text-slate-500 mb-1 opacity-80">
                  queue_music
                </span>
                <div>
                  <p className="text-[15px] font-bold text-slate-200">Your setlist is empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                    Start building your setlist by adding a section or dropping in your first songs.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto flex-col sm:flex-row mt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setShowNewSectionDialog(true)}
                    className="w-full h-10 px-4 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold shadow-md transition-colors"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}
                  >
                    <span className="material-symbols-rounded text-sm">view_agenda</span>
                    <span>Add First Section</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => {
                      if (!setlist.sections || setlist.sections.length === 0) {
                        addSectionToSetlist(setlist.id, 'Main Set');
                        // Small delay to let the store update before opening picker, or just open picker for the new section
                        setTimeout(() => handleOpenSongPicker(setlist.sections?.[0]?.id || 'default'), 100);
                      } else {
                        handleOpenSongPicker(setlist.sections[0].id);
                      }
                    }}
                    className="w-full h-10 px-4 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold text-white shadow-md transition-colors"
                    style={{ background: accentColor }}
                  >
                    <span className="material-symbols-rounded text-sm">library_music</span>
                    <span>Add Songs</span>
                  </motion.button>
                </div>
              </div>
            )}
            {(setlist.sections || []).map((section, secIdx) => {
              const isFirstSec = secIdx === 0;
              const isLastSec = secIdx === (setlist.sections.length - 1);
              const isEditing = editingSectionId === section.id;
              const sectionSongs = (section.songIds || []).map((sId) => presetMap.get(sId)).filter(Boolean) as SongPreset[];

              let precedingSongsCount = 0;
              for (let i = 0; i < secIdx; i++) {
                precedingSongsCount += (setlist.sections[i]?.songIds || []).length;
              }

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
                    <Reorder.Group
                      axis="y"
                      values={section.songIds || []}
                      onReorder={(newSongIds) => updateSectionSongsOrder(setlist.id, section.id, newSongIds)}
                      className="space-y-2"
                      style={{ listStyle: 'none', padding: 0, margin: 0 }}
                    >
                      {(section.songIds || []).map((songId, songIdx) => {
                        const globalSongNumber = precedingSongsCount + songIdx + 1;
                        const currentGlobalIdx = precedingSongsCount + songIdx;
                        const song = presetMap.get(songId);

                        return (
                          <SetlistSongRow
                            key={songId}
                            songId={songId}
                            songIdx={songIdx}
                            song={song}
                            globalSongCounter={globalSongNumber}
                            totalSections={setlist.sections.length}
                            onOpenSongInEditor={onOpenSongInEditor}
                            onPlayLiveFromHere={() => onPlayLiveSetlist(setlist, currentGlobalIdx)}
                            onMoveToSection={() =>
                              setMovingSong({
                                sectionId: section.id,
                                songIndex: songIdx,
                                songName: song?.name || 'Song',
                              })
                            }
                            onRemove={() => removeSongFromSetlistSection(setlist.id, section.id, songIdx)}
                          />
                        );
                      })}
                    </Reorder.Group>
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

      {/* Floating Action Button (Universal Black FAB) */}
      <aside
        className="fixed pointer-events-auto select-none"
        style={{
          bottom:
            'calc(var(--bottom-nav-height, 64px) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
          right: '16px',
          zIndex: 60,
        }}
        data-purpose="setlist-action-button"
      >
        <motion.button
          whileTap={{ scale: 0.90 }}
          type="button"
          data-testid="setlist-fab-add-songs"
          aria-label="Add Songs to Setlist"
          title="Add Songs to Setlist"
          onClick={() => {
            if (!setlist.sections || setlist.sections.length === 0) {
              addSectionToSetlist(setlist.id, 'Set 1');
              setTimeout(() => {
                const currentStore = useChordStore.getState();
                const currentSetlist = (currentStore.setlists || []).find((st) => st.id === setlist.id);
                const firstSecId = currentSetlist?.sections?.[0]?.id || 'sec-1';
                setPickerSectionId(firstSecId);
                setShowPickerModal(true);
              }, 50);
            } else {
              setPickerSectionId(setlist.sections[0].id);
              setShowPickerModal(true);
            }
          }}
          className="rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all select-none"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            background: 'rgba(18, 18, 18, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            color: '#ffffff',
          }}
        >
          <span className="material-symbols-rounded text-2xl font-bold">add</span>
        </motion.button>
      </aside>
    </div>
  );
};
