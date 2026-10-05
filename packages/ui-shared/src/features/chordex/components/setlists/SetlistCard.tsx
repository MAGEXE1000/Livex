import React, { useCallback, useMemo } from 'react';
import {
  type Setlist,
  type SongPreset,
  calculateSetlistStats,
} from '@workspace/livex-core';

export interface SetlistCardProps {
  setlist: Setlist;
  allPresets: SongPreset[];
  accentColor?: string;
  onOpen: (id: string) => void;
  onShare: (setlist: Setlist) => void;
  onEdit: (setlist: Setlist) => void;
  onDelete: (id: string) => void;
  onPlayLive?: (setlist: Setlist) => void;
  onDuplicate?: (id: string) => void;
}

export const SetlistCard: React.FC<SetlistCardProps> = React.memo(
  function SetlistCard({
    setlist,
    allPresets,
    accentColor = '#ffffff',
    onOpen,
    onShare,
    onEdit,
    onDelete,
  }) {
    const stats = useMemo(
      () => calculateSetlistStats(setlist, allPresets),
      [setlist, allPresets]
    );

    const formattedDuration = useMemo(() => {
      if (stats.totalDurationSeconds === 0) return '0:00';
      const mins = Math.floor(stats.totalDurationSeconds / 60);
      const secs = stats.totalDurationSeconds % 60;
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')} min`;
    }, [stats.totalDurationSeconds]);

    const handleMainClick = useCallback(() => {
      onOpen(setlist.id);
    }, [onOpen, setlist.id]);

    const handleShareClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onShare(setlist);
      },
      [onShare, setlist]
    );

    const handleEditClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(setlist);
      },
      [onEdit, setlist]
    );

    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(setlist.id);
      },
      [onDelete, setlist.id]
    );

    return (
      <article
        className="w-full rounded-3xl border shadow-soft-card overflow-hidden transition-all group content-auto-row relative mb-3 last:mb-0"
        style={{
          backgroundColor: 'var(--surface-card-bg, #ffffff)',
          borderColor: 'var(--c-border, #E3E6EB)',
        }}
        data-purpose="setlist-card"
        data-testid={`setlist-card-${setlist.id}`}
      >
        {/* Subtle top ambient accent gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-1 opacity-60 transition-opacity group-hover:opacity-100 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, transparent 80%)`,
          }}
        />

        {/* Clickable main area to navigate to Setlist detail view */}
        <button
          type="button"
          onClick={handleMainClick}
          data-testid={`setlist-${setlist.id}`}
          className="w-full text-left p-3.5 sm:p-4 flex items-center gap-3.5 active:scale-[0.99] transition-transform cursor-pointer"
        >
          {/* Left Thumbnail with Playlist Play Icon */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden relative"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
              borderColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
              color: accentColor,
            }}
          >
            <span
              className="material-symbols-rounded text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              playlist_play
            </span>
          </div>

          {/* Center Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h3
                className="text-base font-extrabold tracking-tight truncate leading-tight min-w-0 flex-1"
                style={{
                  fontFamily: 'var(--font-headline)',
                  color: 'var(--c-text-primary, #FFFFFF)',
                }}
              >
                {setlist.title}
              </h3>
              {setlist.date && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--c-text-secondary, #94A3B8)',
                  }}
                >
                  <span className="material-symbols-rounded text-xs">calendar_today</span>
                  <span>{setlist.date}</span>
                </span>
              )}
            </div>

            {setlist.description && (
              <p
                className="text-xs font-medium mt-0.5 truncate leading-relaxed"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                {setlist.description}
              </p>
            )}

            {/* Refined Metadata Chips: ONLY X Songs and Total Duration */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Song count badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 12%, var(--surface-card-bg, #1e1e24))`,
                  border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
                  color: accentColor,
                }}
              >
                <span className="material-symbols-rounded text-sm">queue_music</span>
                <span>
                  {stats.totalSongs} {stats.totalSongs === 1 ? 'Song' : 'Songs'}
                </span>
              </div>

              {/* Total Duration badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
                  color: 'var(--c-text-secondary, #94A3B8)',
                }}
              >
                <span className="material-symbols-rounded text-sm">schedule</span>
                <span>{formattedDuration}</span>
              </div>
            </div>
          </div>

          {/* Drill-down chevron */}
          <span
            className="material-symbols-rounded text-xl shrink-0 group-hover:translate-x-0.5 transition-transform"
            style={{ color: 'var(--c-text-muted, #8A92A6)' }}
          >
            chevron_right
          </span>
        </button>

        {/* Canonical 3-Action Bottom Strip: Share | Edit | Delete */}
        <div
          className="flex items-center border-t text-xs font-semibold"
          style={{ borderColor: 'var(--c-border, #E3E6EB)' }}
        >
          <button
            type="button"
            onClick={handleShareClick}
            data-testid={`share-${setlist.id}`}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
            style={{
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-accent-from, #ffffff)',
            }}
            title="Share setlist"
            aria-label={`Share ${setlist.title}`}
          >
            <span className="material-symbols-rounded text-base">share</span>
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            data-testid={`edit-${setlist.id}`}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
            style={{
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
            title="Edit setlist metadata"
            aria-label={`Edit ${setlist.title}`}
          >
            <span className="material-symbols-rounded text-base">edit</span>
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            data-testid={`delete-${setlist.id}`}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:opacity-75"
            style={{
              color: '#EF4444',
            }}
            title="Delete setlist"
            aria-label={`Delete ${setlist.title}`}
          >
            <span className="material-symbols-rounded text-base">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </article>
    );
  }
);
