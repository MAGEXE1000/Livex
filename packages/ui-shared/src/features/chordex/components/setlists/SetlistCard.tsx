import React from 'react';
import { motion } from 'motion/react';
import {
  type Setlist,
  type SongPreset,
  calculateSetlistStats,
  formatDurationMmSs,
} from '@workspace/livex-core';

interface SetlistCardProps {
  setlist: Setlist;
  allPresets: SongPreset[];
  accentColor?: string;
  onOpen: (id: string) => void;
  onPlayLive: (setlist: Setlist) => void;
  onEdit: (setlist: Setlist) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SetlistCard: React.FC<SetlistCardProps> = ({
  setlist,
  allPresets,
  accentColor = '#2563EB',
  onOpen,
  onPlayLive,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const stats = React.useMemo(
    () => calculateSetlistStats(setlist, allPresets),
    [setlist, allPresets]
  );

  const formattedDuration = React.useMemo(() => {
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

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onOpen(setlist.id)}
      className="group relative rounded-3xl p-4 sm:p-5 border shadow-soft-card flex flex-col justify-between transition-all cursor-pointer select-none overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card-bg, #1e1e24)',
        borderColor: 'var(--c-border, rgba(255, 255, 255, 0.09))',
      }}
      data-testid={`setlist-card-${setlist.id}`}
      data-purpose="setlist-card"
    >
      {/* Subtle top ambient accent gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-60 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, transparent 80%)`,
        }}
      />

      <div>
        {/* Header row: Title & quick action menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-base sm:text-lg font-black tracking-tight truncate leading-snug"
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
                className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed"
                style={{ color: 'var(--c-text-secondary, #94A3B8)' }}
              >
                {setlist.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onDuplicate(setlist.id)}
              title="Duplicate setlist"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">content_copy</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(setlist)}
              title="Edit setlist info"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">edit</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(setlist.id)}
              title="Delete setlist"
              className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">delete</span>
            </button>
          </div>
        </div>

        {/* Badges metadata row */}
        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, var(--surface-card-bg, #1e1e24))`,
              border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
              color: accentColor,
            }}
          >
            <span className="material-symbols-rounded text-sm">queue_music</span>
            <span>{stats.totalSongs} {stats.totalSongs === 1 ? 'Song' : 'Songs'}</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold"
            style={{
              backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
              color: 'var(--c-text-secondary, #94A3B8)',
            }}
          >
            <span className="material-symbols-rounded text-sm">layers</span>
            <span>{stats.sectionCount} {stats.sectionCount === 1 ? 'Section' : 'Sections'}</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold"
            style={{
              backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
              color: 'var(--c-text-secondary, #94A3B8)',
            }}
          >
            <span className="material-symbols-rounded text-sm">timer</span>
            <span>{formattedDuration}</span>
          </div>
        </div>

        {/* Section chips preview */}
        {setlist.sections && setlist.sections.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {setlist.sections.slice(0, 4).map((sec) => (
              <span
                key={sec.id}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--c-text-muted, #94A3B8)',
                }}
              >
                {sec.name} ({sec.songIds.length})
              </span>
            ))}
            {setlist.sections.length > 4 && (
              <span className="text-[10px] text-slate-500 font-medium">
                +{setlist.sections.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div
        className="flex items-center justify-between gap-2 mt-4 pt-3 border-t"
        style={{ borderColor: 'var(--c-border, rgba(255, 255, 255, 0.07))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpen(setlist.id)}
          className="text-xs font-bold flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer py-1"
        >
          <span>Open Repertoire</span>
          <span className="material-symbols-rounded text-sm">arrow_forward</span>
        </button>

        {stats.totalSongs > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onPlayLive(setlist)}
            data-testid={`setlist-play-live-${setlist.id}`}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-transform"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 80%, #000))`,
              boxShadow: `0 3px 12px color-mix(in srgb, ${accentColor} 35%, transparent)`,
            }}
          >
            <span className="material-symbols-rounded text-base">play_arrow</span>
            <span>Play Live</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
