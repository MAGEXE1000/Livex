import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  type Setlist,
  type SongPreset,
  type SetlistLivexBundle,
  parseLivexBundle,
  sanitizeFilename,
  useChordStore,
  useIsWebDesktop,
} from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';
import { Button } from '../../../../shared/design-system/StudioDesignSystem';

type ImportStage = 'idle' | 'preview' | 'success' | 'error';

interface ParsedSetlistImport {
  setlist: Setlist;
  songs: SongPreset[];
  fileName: string;
  fileSizeBytes: number;
}

export interface ImportSetlistContentProps {
  accentColor?: string;
  onImportSuccess?: (setlistId: string) => void;
  onClose?: () => void;
  initialBundle?: SetlistLivexBundle | null;
}

export function ImportSetlistContent({
  accentColor = '#ffffff',
  onImportSuccess,
  onClose,
  initialBundle,
}: ImportSetlistContentProps) {
  const isWebDesktop = useIsWebDesktop();
  const pendingSetlistImport = useChordStore((s) => s.pendingSetlistImport);
  const clearPendingSetlistImport = useChordStore((s) => s.clearPendingSetlistImport);

  const activeBundle = initialBundle || pendingSetlistImport;

  const [stage, setStage] = useState<ImportStage>(activeBundle ? 'preview' : 'idle');
  const [parsed, setParsed] = useState<ParsedSetlistImport | null>(() => {
    if (activeBundle) {
      return {
        setlist: activeBundle.setlist,
        songs: activeBundle.songs || [],
        fileName: `${sanitizeFilename(activeBundle.setlist.title, 'setlist')}.json`,
        fileSizeBytes: 0,
      };
    }
    return null;
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = useChordStore((s) => s.presets || []);
  const createPreset = useChordStore((s) => s.createPreset);
  const createSetlist = useChordStore((s) => s.createSetlist);
  const setActivePreset = useChordStore((s) => s.setActivePreset);

  // Sync if pendingSetlistImport updates
  useEffect(() => {
    if (activeBundle) {
      setParsed({
        setlist: activeBundle.setlist,
        songs: activeBundle.songs || [],
        fileName: `${sanitizeFilename(activeBundle.setlist.title, 'setlist')}.json`,
        fileSizeBytes: 0,
      });
      setStage('preview');
    }
  }, [activeBundle]);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawContent = ev.target?.result as string;
        const result = parseLivexBundle(rawContent);

        if (result.type === 'invalid') {
          throw new Error(result.error);
        }

        if (result.type === 'setlist') {
          setParsed({
            setlist: result.bundle.setlist,
            songs: result.bundle.songs,
            fileName: file.name,
            fileSizeBytes: file.size,
          });
          setStage('preview');
        } else if (result.type === 'song') {
          // Wrapped single song into a 1-song setlist for unified bundle import
          const syntheticSetlist: Setlist = {
            id: `setlist-${Date.now()}`,
            title: `${result.preset.name} Set`,
            sections: [
              {
                id: `sec-${Date.now()}`,
                name: 'Main',
                songIds: [`song-import-${Date.now()}`],
              },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          const syntheticSong: SongPreset = {
            ...result.preset,
            id: syntheticSetlist.sections[0].songIds[0],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          setParsed({
            setlist: syntheticSetlist,
            songs: [syntheticSong],
            fileName: file.name,
            fileSizeBytes: file.size,
          });
          setStage('preview');
        }
      } catch (err: any) {
        setErrorMsg(
          err?.message || 'Failed to parse file. Ensure it is a valid .livex or .json setlist bundle.'
        );
        setStage('error');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Could not read file.');
      setStage('error');
    };

    reader.readAsText(file);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const doImport = () => {
    if (!parsed) return;

    try {
      const { setlist, songs } = parsed;
      const importedSongIdMap = new Map<string, string>();

      // 1. Register or match song presets
      let newlyRegisteredCount = 0;
      for (const song of songs) {
        if (!song || !song.name) continue;

        // Check if matching song already exists in user's library
        const existing = presets.find(
          (p) =>
            p.id === song.id ||
            (p.name.trim().toLowerCase() === song.name.trim().toLowerCase() &&
              (p.artist || '').trim().toLowerCase() === (song.artist || '').trim().toLowerCase())
        );

        if (existing) {
          importedSongIdMap.set(song.id, existing.id);
        } else {
          // Register new song into user's chord library
          const newSongId = createPreset({
            name: song.name,
            artist: song.artist || '',
            bpm: song.bpm || song.speed || 120,
            speed: song.speed || song.bpm || 120,
            barsPerLine: song.barsPerLine,
            key: song.key || 'C',
            notes: song.notes || '',
            chords: song.chords || [],
            sections: song.sections,
            lyrics: song.lyrics,
            targetDurationSeconds: song.targetDurationSeconds,
            coverImage: song.coverImage,
            coverUri: song.coverUri,
          });
          importedSongIdMap.set(song.id, newSongId);
          newlyRegisteredCount++;
        }
      }

      // 2. Reconstruct sections with mapped song IDs
      const mappedSections = (setlist.sections || []).map((sec) => ({
        name: sec.name || 'Set',
        songIds: (sec.songIds || []).map((sId) => importedSongIdMap.get(sId) || sId),
      }));

      // 3. Create the new Setlist
      const newSetlistId = createSetlist({
        title: setlist.title,
        description: setlist.description,
        date: setlist.date,
        color: setlist.color,
        sections: mappedSections,
      });

      // Clear active preset so that activeSetlistId takes priority in mobile view
      setActivePreset(null);
      clearPendingSetlistImport();

      toast.success(
        `Imported setlist "${setlist.title}" with ${songs.length} songs (${newlyRegisteredCount} added to library)!`
      );

      setStage('success');
      setTimeout(() => {
        onImportSuccess?.(newSetlistId);
        onClose?.();
      }, 700);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import setlist package');
      setErrorMsg(err?.message || 'An error occurred while importing setlist.');
      setStage('error');
    }
  };

  return (
    <div className="flex flex-col gap-3 py-1" data-purpose="import-setlist-content">
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.99]"
              style={{
                borderColor: dragOver ? accentColor : 'var(--c-border, rgba(255, 255, 255, 0.15))',
                backgroundColor: dragOver
                  ? `color-mix(in srgb, ${accentColor} 10%, var(--surface-card-bg, transparent))`
                  : 'var(--c-surface-high, rgba(255, 255, 255, 0.03))',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".livex,.json,.bin,application/json,application/octet-stream,text/plain,*/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                data-testid="setlist-file-input"
              />
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border shadow-soft-card"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
                  color: accentColor,
                }}
              >
                <span className="material-symbols-rounded text-2xl">cloud_download</span>
              </div>
              <p className="text-sm font-bold text-[var(--c-text-primary)]">
                {isWebDesktop ? 'Drop a .json or .livex setlist bundle here' : 'Select a .json or .livex setlist bundle'}
              </p>
              <p className="text-xs text-[var(--c-text-secondary)] mt-1 max-w-[240px]">
                Imports full setlist structure, section order, and embeds all included song charts.
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Browse Files
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'preview' && parsed && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Setlist Summary Card */}
            <div
              className="p-3.5 rounded-2xl border flex flex-col gap-2.5"
              style={{
                backgroundColor: 'var(--c-surface-high, rgba(255, 255, 255, 0.04))',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                    color: accentColor,
                  }}
                >
                  <span className="material-symbols-rounded text-xl">queue_music</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[var(--c-text-primary)] truncate">
                    {parsed.setlist.title}
                  </h4>
                  <p className="text-xs text-[var(--c-text-secondary)] truncate">
                    {parsed.setlist.date || 'No performance date'} • {parsed.fileName}
                  </p>
                </div>
              </div>

              {/* Badges / Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accentColor} 18%, transparent)`,
                    color: accentColor,
                  }}
                >
                  {parsed.songs.length} {parsed.songs.length === 1 ? 'Song' : 'Songs'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--c-surface-lowest, rgba(255, 255, 255, 0.08))',
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  {parsed.setlist.sections?.length || 1}{' '}
                  {(parsed.setlist.sections?.length || 1) === 1 ? 'Section' : 'Sections'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--c-surface-lowest, rgba(255, 255, 255, 0.08))',
                    color: 'var(--c-text-muted)',
                  }}
                >
                  .json / .livex bundle
                </span>
              </div>

              {/* Sections & Songs Preview */}
              <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1 mt-1">
                {(parsed.setlist.sections || []).map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl text-xs flex items-center justify-between border"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, rgba(255, 255, 255, 0.02))',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
                    }}
                  >
                    <span className="font-bold text-[var(--c-text-primary)] truncate">
                      {sec.name}
                    </span>
                    <span className="text-[10px] text-[var(--c-text-secondary)]">
                      {sec.songIds?.length || 0} songs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full mt-1">
              <Button
                onClick={() => {
                  clearPendingSetlistImport();
                  setParsed(null);
                  setStage('idle');
                }}
                style={{ flex: 1 }}
              >
                Choose Other
              </Button>
              <Button
                variant="primary"
                onClick={doImport}
                data-testid="confirm-import-setlist-btn"
                style={{ flex: 1.5, backgroundColor: accentColor }}
              >
                Import Setlist
              </Button>
            </div>
          </motion.div>
        )}

        {stage === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-6 text-center gap-2"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
            >
              <span className="material-symbols-rounded text-2xl font-bold">check</span>
            </div>
            <h4 className="text-sm font-bold text-[var(--c-text-primary)]">Setlist Imported!</h4>
            <p className="text-xs text-[var(--c-text-secondary)]">
              All sections and repertoire songs have been loaded.
            </p>
          </motion.div>
        )}

        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-4 text-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}
            >
              <span className="material-symbols-rounded text-xl">error</span>
            </div>
            <p className="text-xs text-red-400 max-w-[260px]">{errorMsg}</p>
            <Button
              onClick={() => {
                setErrorMsg('');
                setStage('idle');
              }}
              style={{ padding: '6px 16px' }}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface ImportSetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  onImportSuccess?: (setlistId: string) => void;
}

export const ImportSetlistModal: React.FC<ImportSetlistModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#ffffff',
  onImportSuccess,
}) => {
  const clearPendingSetlistImport = useChordStore((s) => s.clearPendingSetlistImport);

  const handleClose = () => {
    clearPendingSetlistImport();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Import Setlist (.json / .livex)">
      <ImportSetlistContent
        accentColor={accentColor}
        onImportSuccess={onImportSuccess}
        onClose={handleClose}
      />
    </Dialog>
  );
};
