import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { type Setlist, type SongPreset, useChordStore } from '@workspace/livex-core';
import { SetlistCard } from './SetlistCard';
import { SetlistCreateModal } from './SetlistCreateModal';
import { SetlistShareModal } from './SetlistShareModal';
import { ImportSetlistModal } from './ImportSetlistModal';
import { Dialog } from '../../../../shared/design-system/dialogs';
import { Button } from '../../../../shared/design-system/StudioDesignSystem';

interface SetlistLibraryViewProps {
  setlists: Setlist[];
  allPresets: SongPreset[];
  accentColor?: string;
  onOpenSetlist: (id: string) => void;
  onPlayLiveSetlist: (setlist: Setlist) => void;
}

export const SetlistLibraryView: React.FC<SetlistLibraryViewProps> = ({
  setlists,
  allPresets,
  accentColor = '#2563EB',
  onOpenSetlist,
  onPlayLiveSetlist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [sharingSetlist, setSharingSetlist] = useState<Setlist | null>(null);
  const [deletingSetlistId, setDeletingSetlistId] = useState<string | null>(null);

  const createSetlist = useChordStore((s) => s.createSetlist);
  const updateSetlist = useChordStore((s) => s.updateSetlist);
  const deleteSetlist = useChordStore((s) => s.deleteSetlist);
  const duplicateSetlist = useChordStore((s) => s.duplicateSetlist);
  const pendingSetlistImport = useChordStore((s) => s.pendingSetlistImport);
  const clearPendingSetlistImport = useChordStore((s) => s.clearPendingSetlistImport);

  const filteredSetlists = useMemo(() => {
    if (!searchQuery.trim()) return setlists;
    const q = searchQuery.toLowerCase().trim();
    return setlists.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.date && s.date.toLowerCase().includes(q)) ||
        (s.sections && s.sections.some((sec) => sec.name.toLowerCase().includes(q)))
    );
  }, [setlists, searchQuery]);

  const handleSaveModal = (data: {
    title: string;
    description?: string;
    date?: string;
    initialSectionName?: string;
  }) => {
    if (editingSetlist) {
      updateSetlist(editingSetlist.id, {
        title: data.title,
        description: data.description,
        date: data.date,
      });
      setEditingSetlist(null);
    } else {
      const newId = createSetlist({
        title: data.title,
        description: data.description,
        date: data.date,
        sections: data.initialSectionName
          ? [{ name: data.initialSectionName, songIds: [] }]
          : [{ name: 'Set 1', songIds: [] }],
      });
      onOpenSetlist(newId);
    }
  };

  return (
    <div className="w-full space-y-3" data-purpose="setlists-library-view">
      {/* Search Bar */}
      <div className="relative flex items-center" data-purpose="search-bar">
        <span
          className="material-symbols-rounded absolute left-4 pointer-events-none text-lg select-none"
          style={{ color: 'var(--c-text-muted, #94A3B8)' }}
        >
          search
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search setlists, dates, sections..."
          className="w-full h-[46px] pl-10 pr-10 text-sm rounded-full border shadow-soft-card outline-none transition-all font-inter"
          style={{
            backgroundColor: 'var(--surface-card-bg, #ffffff)',
            borderColor: 'var(--c-border, #E3E6EB)',
            color: 'var(--c-text-primary, #111827)',
          }}
        />
        {searchQuery && (
          <button
            aria-label="Clear search"
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-transform cursor-pointer"
            style={{ color: 'var(--c-text-muted, #94A3B8)' }}
          >
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        )}
      </div>

      {/* Setlists Content or Empty States */}
      {filteredSetlists.length === 0 ? (
        setlists.length === 0 ? (
          /* Empty state: No setlists exist yet */
          <section
            className="flex flex-col items-center justify-center text-center px-4 py-16"
            data-purpose="setlists-empty-state"
          >
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-soft-card"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 10%, var(--surface-card-bg, #ffffff))`,
                borderColor: `color-mix(in srgb, ${accentColor} 22%, transparent)`,
                color: accentColor,
              }}
            >
              <span className="material-symbols-rounded text-3xl">queue_music</span>
            </div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--c-text-primary, #111827)',
              }}
            >
              No setlists yet
            </h2>
            <p
              className="text-xs font-normal max-w-[260px] mt-1.5 leading-relaxed"
              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
            >
              Organize 100+ songs into custom sections (e.g. Set 1, Acoustic Break, Encore) for sequential live rehearsal & gig playback.
            </p>
            <div className="flex items-center gap-2.5 mt-6 flex-wrap justify-center">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                data-testid="empty-create-setlist-btn"
                onClick={() => {
                  setEditingSetlist(null);
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 14px color-mix(in srgb, ${accentColor} 30%, transparent)`,
                }}
              >
                <span className="material-symbols-rounded text-base">add</span>
                <span>Create First Setlist</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                data-testid="empty-import-setlist-btn"
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 rounded-full text-xs font-bold border shadow-soft-card cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                style={{
                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                  color: 'var(--c-text-primary, #111827)',
                }}
              >
                <span className="material-symbols-rounded text-base text-[var(--c-text-secondary)]">
                  cloud_download
                </span>
                <span>Import .livex Bundle</span>
              </motion.button>
            </div>
          </section>
        ) : (
          /* Search yielded no results */
          <section
            className="flex flex-col items-center justify-center text-center px-4 py-16"
            data-purpose="search-empty-state"
          >
            <div
              className="w-14 h-14 rounded-3xl flex items-center justify-center mb-4 border shadow-soft-card"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-muted, #8A92A6)',
              }}
            >
              <span className="material-symbols-rounded text-2xl">search_off</span>
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--c-text-primary, #111827)',
              }}
            >
              No matching setlists
            </h3>
            <p
              className="text-xs font-medium mt-1 max-w-[240px]"
              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
            >
              No setlists found for &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3.5 py-1.5 rounded-full border text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-primary, #111827)',
              }}
            >
              Clear Search
            </button>
          </section>
        )
      ) : (
        /* List of Setlist Cards */
        <div className="space-y-3" data-purpose="setlist-list">
          {filteredSetlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              allPresets={allPresets}
              accentColor={accentColor}
              onOpen={onOpenSetlist}
              onShare={(s) => setSharingSetlist(s)}
              onEdit={(s) => {
                setEditingSetlist(s);
                setShowCreateModal(true);
              }}
              onDelete={(id) => setDeletingSetlistId(id)}
            />
          ))}
        </div>
      )}

      {/* Dedicated Setlist Share Modal */}
      <SetlistShareModal
        isOpen={Boolean(sharingSetlist)}
        setlist={sharingSetlist}
        allPresets={allPresets}
        onClose={() => setSharingSetlist(null)}
      />

      {/* Setlist Create / Edit Modal */}
      <SetlistCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSetlist(null);
        }}
        onSave={handleSaveModal}
        initialSetlist={editingSetlist}
        accentColor={accentColor}
      />

      {/* Import Setlist Modal */}
      <ImportSetlistModal
        isOpen={showImportModal || Boolean(pendingSetlistImport)}
        onClose={() => {
          setShowImportModal(false);
          clearPendingSetlistImport();
        }}
        accentColor={accentColor}
        onImportSuccess={(newId) => onOpenSetlist(newId)}
      />

      {/* Delete confirmation dialog */}
      {deletingSetlistId && (
        <Dialog
          open={true}
          onClose={() => setDeletingSetlistId(null)}
          title="Delete Setlist"
          footer={
            <>
              <Button onClick={() => setDeletingSetlistId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  deleteSetlist(deletingSetlistId);
                  setDeletingSetlistId(null);
                }}
                style={{
                  backgroundColor: 'rgba(238,125,119,0.12)',
                  color: '#ee7d77',
                  border: '1px solid rgba(238,125,119,0.3)',
                }}
              >
                Delete Setlist
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px' }}>
            Are you sure you want to delete this setlist? Individual songs in your library will NOT be deleted.
          </p>
        </Dialog>
      )}
    </div>
  );
};
