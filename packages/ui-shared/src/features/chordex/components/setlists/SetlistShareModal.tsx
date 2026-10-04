import React from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import {
  type Setlist,
  type SongPreset,
  useBandStore,
  useSessionStore,
} from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';

export interface SetlistLivexBundle {
  _app: 'Livex';
  _type: 'setlist';
  _version: 2;
  setlist: Setlist;
  songs: SongPreset[];
  exportedAt: number;
}

/**
 * Export setlist and all referenced song presets recursively into a .livex bundle.
 */
export async function exportSetlistToLivex(
  setlist: Setlist,
  allPresets: SongPreset[],
  mode: 'save' | 'share' = 'share'
): Promise<boolean> {
  const songIdSet = new Set<string>();
  if (setlist.sections) {
    for (const sec of setlist.sections) {
      if (Array.isArray(sec.songIds)) {
        for (const sId of sec.songIds) {
          songIdSet.add(sId);
        }
      }
    }
  }

  const containedSongs = allPresets.filter((p) => songIdSet.has(p.id));
  const bundle: SetlistLivexBundle = {
    _app: 'Livex',
    _type: 'setlist',
    _version: 2,
    setlist: {
      ...setlist,
      updatedAt: Date.now(),
    },
    songs: containedSongs,
    exportedAt: Date.now(),
  };

  const content = JSON.stringify(bundle, null, 2);
  const baseSlug = setlist.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'setlist';
  const fileName = `${baseSlug}.livex`;

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const bytes = new TextEncoder().encode(content);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);

    if (mode === 'save') {
      let savedOk = false;
      try {
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: base64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        savedOk = true;
      } catch {
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.External,
            recursive: true,
          });
          savedOk = true;
        } catch {
          /* ignore error */
        }
      }
      return savedOk;
    } else {
      try {
        const { Share } = await import('@capacitor/share');
        const cacheResult = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: fileName,
          url: cacheResult.uri,
          dialogTitle: `Share Setlist: ${setlist.title}`,
        });
      } catch {
        /* User cancelled or share cancelled */
      }
      return true;
    }
  }

  // Web fallback: anchor download
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export interface SetlistShareModalProps {
  isOpen: boolean;
  setlist: Setlist | null;
  allPresets: SongPreset[];
  onClose: () => void;
}

export const SetlistShareModal: React.FC<SetlistShareModalProps> = ({
  isOpen,
  setlist,
  allPresets,
  onClose,
}) => {
  const currentBand = useBandStore((s) => s.currentBand);
  const currentUserId = useBandStore((s) => s.currentUserId);
  const currentUserName = useBandStore((s) => s.currentUserName);
  const shareSongFromPreset = useBandStore((s) => s.shareSongFromPreset);
  const addEvent = useBandStore((s) => s.addEvent);

  if (!setlist) return null;

  const songIdSet = new Set<string>();
  if (setlist.sections) {
    for (const sec of setlist.sections) {
      if (Array.isArray(sec.songIds)) {
        for (const sId of sec.songIds) {
          songIdSet.add(sId);
        }
      }
    }
  }
  const containedSongs = allPresets.filter((p) => songIdSet.has(p.id));

  const handleShareWithBand = () => {
    if (!currentBand) {
      toast.error('No active band selected. Join or create a band first.');
      return;
    }

    try {
      const sharedSongIds: string[] = [];
      for (const preset of containedSongs) {
        const shared = shareSongFromPreset(
          preset,
          currentBand.id,
          currentUserId || 'local-user',
          currentUserName || 'Band Member'
        );
        if (shared?.id) {
          sharedSongIds.push(shared.id);
        }
      }

      addEvent({
        bandId: currentBand.id,
        title: setlist.title,
        type: 'rehearsal',
        date: setlist.date || new Date().toISOString().split('T')[0],
        notes: setlist.description || `Setlist with ${containedSongs.length} songs`,
        setlistSongIds: sharedSongIds,
        createdBy: currentUserId || 'local-user',
      });

      toast.success(
        `Setlist "${setlist.title}" and ${containedSongs.length} songs shared to ${currentBand.name}!`
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to share setlist with band');
    }
  };

  const handleExportLivex = async () => {
    onClose();
    try {
      await exportSetlistToLivex(setlist, allPresets, 'share');
      toast.success(`Exported ${setlist.title} bundle (.livex)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export setlist bundle');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`Share Setlist - ${setlist.title}`}
    >
      <div className="flex flex-col gap-2.5 py-1">
        <p className="text-xs font-medium text-[var(--c-text-secondary)] mb-1">
          Choose how you want to share{' '}
          <span className="font-bold text-[var(--c-text-primary)]">{setlist.title}</span>:
        </p>

        {/* Option 1: Share with Band */}
        <button
          type="button"
          data-testid="setlist-share-option-band"
          onClick={handleShareWithBand}
          className="flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--c-surface-high, rgba(255, 255, 255, 0.05))',
            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--c-accent-from, #ffffff)',
            }}
          >
            <span className="material-symbols-rounded text-xl">groups</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight text-[var(--c-text-primary)]">
              Share with Band
            </div>
            <div className="text-xs text-[var(--c-text-secondary)] truncate">
              {currentBand
                ? `Sync ${containedSongs.length} songs to ${currentBand.name}`
                : 'Send setlist & songs to active band repertoire'}
            </div>
          </div>
          <span className="material-symbols-rounded text-lg text-[var(--c-text-muted)]">
            chevron_right
          </span>
        </button>

        {/* Option 2: Export as .livex */}
        <button
          type="button"
          data-testid="setlist-share-option-export"
          onClick={handleExportLivex}
          className="flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--c-surface-high, rgba(255, 255, 255, 0.05))',
            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
            }}
          >
            <span className="material-symbols-rounded text-xl">ios_share</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight text-[var(--c-text-primary)]">
              Export as .livex
            </div>
            <div className="text-xs text-[var(--c-text-secondary)] truncate">
              Complete multi-song setlist bundle ({containedSongs.length} songs)
            </div>
          </div>
          <span className="material-symbols-rounded text-lg text-[var(--c-text-muted)]">
            chevron_right
          </span>
        </button>
      </div>
    </Dialog>
  );
};
