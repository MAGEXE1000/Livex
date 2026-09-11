import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { type DrumSong, type DrumPattern, type KitType, useT } from '@workspace/studio-core';
import { Dialog } from '../../../shared/design-system/dialogs';
import { Button, Input } from '../../../shared/design-system/StudioDesignSystem';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { StaggeredReveal } from '../../../shared/animation';

export interface DrumBeatsPanelProps {
  drumSongs: DrumSong[];
  onSelectSong: (song: DrumSong) => void;
  onCreateSong: () => void;
  onImportSong: () => void;
  onDeleteSong: (id: string) => void;
  onUpdateSong: (id: string, data: { name: string; artist?: string }) => void;
  previewingSongId: string | null;
  onTogglePreview: (song: DrumSong) => void;
  accent: { from: string; to: string; mid?: string };
  isLight: boolean;
  isAmoled: boolean;
  isWebDesktop: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  isCreateOpen?: boolean;
  onOpenCreateChange?: (open: boolean) => void;
  renderCreateForm?: (helpers: { close: () => void }) => React.ReactNode;
  renderImportForm?: (helpers: { close: () => void }) => React.ReactNode;
}

const KIT_NAMES: Record<string, string> = {
  house: 'House Kit',
  ludwig: 'Warm Kit',
  jazz: 'Soft Kit',
  rock: 'Rock Kit',
  vintage: 'Vintage Kit',
  studio: 'Studio Kit',
  r8: 'R8 Kit',
  linn: 'Linn Kit',
  funk: 'Funk Kit',
  cr78: 'CR-78 Kit',
  tr808: 'TR-808 Kit',
  techno: 'Techno Kit',
  stark: 'Stark Kit',
  rmm: 'Punchy Kit',
  chrome: 'Bright Kit',
};

function formatKitName(kitType: KitType | null | undefined): string {
  if (!kitType) return 'House Kit';
  return KIT_NAMES[kitType] || kitType;
}

/* ──────────────────── MINI RHYTHMIC TIMELINE ──────────────────── */
function BeatMiniTimeline({
  pattern,
  isPlaying,
  isLight,
}: {
  pattern: DrumPattern | undefined;
  isPlaying: boolean;
  isLight: boolean;
}) {
  const m0 = pattern?.measures?.[0];
  const hits = m0?.hits;

  // Key rhythmic instruments
  const kickHits = useMemo(() => new Set(hits?.kick?.map((h) => h.step) ?? []), [hits]);
  const snareHits = useMemo(() => new Set(hits?.snare?.map((h) => h.step) ?? []), [hits]);
  const hatHits = useMemo(
    () =>
      new Set([
        ...(hits?.['hihat-closed']?.map((h) => h.step) ?? []),
        ...(hits?.['hihat-open']?.map((h) => h.step) ?? []),
      ]),
    [hits]
  );

  const totalSteps = pattern?.subdivision === 8 ? 8 : 16;

  return (
    <div
      className="w-full flex flex-col gap-1 px-2.5 py-2 rounded-xl transition-all"
      style={{
        backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--c-border, rgba(0, 0, 0, 0.06))',
      }}
      data-purpose="beat-rhythm-timeline"
    >
      {/* 3 Tracks: Hi-Hat, Snare, Kick */}
      <div className="flex items-center gap-1.5 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-5 shrink-0 tracking-wider"
          style={{ color: 'var(--c-text-muted, #94A3B8)' }}
        >
          HH
        </span>
        <div className="flex-1 flex gap-0.5 items-center">
          {Array.from({ length: totalSteps }, (_, i) => {
            const isHit = hatHits.has(i);
            const isDownbeat = i % 4 === 0;
            return (
              <div
                key={`hh-${i}`}
                className={`flex-1 rounded-full transition-all ${
                  isPlaying && isHit ? 'animate-pulse' : ''
                }`}
                style={{
                  height: isHit ? 5 : 3,
                  backgroundColor: isHit
                    ? 'var(--c-accent-from, #2563EB)'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.12)'
                        : 'rgba(255,255,255,0.12)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 0.9 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-5 shrink-0 tracking-wider"
          style={{ color: 'var(--c-text-muted, #94A3B8)' }}
        >
          SN
        </span>
        <div className="flex-1 flex gap-0.5 items-center">
          {Array.from({ length: totalSteps }, (_, i) => {
            const isHit = snareHits.has(i);
            const isDownbeat = i % 4 === 0;
            return (
              <div
                key={`sn-${i}`}
                className={`flex-1 rounded-full transition-all ${
                  isPlaying && isHit ? 'animate-pulse' : ''
                }`}
                style={{
                  height: isHit ? 5 : 3,
                  backgroundColor: isHit
                    ? '#38BDF8'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.12)'
                        : 'rgba(255,255,255,0.12)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-5 shrink-0 tracking-wider"
          style={{ color: 'var(--c-text-muted, #94A3B8)' }}
        >
          KD
        </span>
        <div className="flex-1 flex gap-0.5 items-center">
          {Array.from({ length: totalSteps }, (_, i) => {
            const isHit = kickHits.has(i);
            const isDownbeat = i % 4 === 0;
            return (
              <div
                key={`kd-${i}`}
                className={`flex-1 rounded-full transition-all ${
                  isPlaying && isHit ? 'animate-pulse' : ''
                }`}
                style={{
                  height: isHit ? 6 : 3,
                  backgroundColor: isHit
                    ? 'var(--c-text-primary, #111827)'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.12)'
                        : 'rgba(255,255,255,0.12)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── BEAT CARD COMPONENT ──────────────────── */
function BeatCard({
  song,
  isPlaying,
  onPlayToggle,
  onOpen,
  onStartRename,
  onStartDelete,
  isLight,
}: {
  song: DrumSong;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onOpen: () => void;
  onStartRename: () => void;
  onStartDelete: () => void;
  isLight: boolean;
}) {
  const activePat = useMemo(() => {
    return song.patterns.find((p) => p.id === song.activePatternId) ?? song.patterns[0];
  }, [song]);

  const bpm = activePat?.bpm ?? 120;
  const timeSig = activePat?.timeSignature
    ? `${activePat.timeSignature[0]}/${activePat.timeSignature[1]}`
    : '4/4';
  const patternCount = song.patterns.length;
  const kitName = formatKitName(song.kitType);

  return (
    <article
      className="w-full rounded-2xl border shadow-soft-card overflow-hidden transition-all group"
      style={{
        backgroundColor: 'var(--surface-card-bg, #ffffff)',
        borderColor: 'var(--c-border, #E3E6EB)',
      }}
      data-purpose="beat-card"
      data-testid={`beat-card-${song.id}`}
    >
      {/* Clickable Card Header & Information */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          {/* Leading Icon & Preview Play Button */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle();
              }}
              data-testid={`beat-play-btn-${song.id}`}
              aria-label={isPlaying ? 'Stop beat preview' : 'Play beat preview'}
              title={isPlaying ? 'Stop preview' : 'Audition preview'}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all active:scale-90 cursor-pointer shadow-sm"
              style={{
                backgroundColor: isPlaying
                  ? 'var(--c-accent-from, #2563EB)'
                  : 'color-mix(in srgb, var(--c-accent-from, #2563EB) 12%, transparent)',
                borderColor: isPlaying
                  ? 'var(--c-accent-from, #2563EB)'
                  : 'color-mix(in srgb, var(--c-accent-from, #2563EB) 24%, transparent)',
                color: isPlaying ? '#ffffff' : 'var(--c-accent-from, #2563EB)',
              }}
            >
              <span className="material-symbols-outlined text-2xl select-none">
                {isPlaying ? 'stop' : 'play_arrow'}
              </span>
            </button>

            {/* Title & Artist */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={onOpen}
              data-purpose="beat-title-area"
            >
              <h3
                className="text-[16px] font-extrabold tracking-tight truncate leading-tight group-hover:text-blue-600 transition-colors"
                style={{
                  fontFamily: 'var(--font-headline)',
                  color: 'var(--c-text-primary, #111827)',
                }}
              >
                {song.name}
              </h3>
              {song.artist ? (
                <p
                  className="text-xs font-medium truncate mt-0.5"
                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                >
                  {song.artist}
                </p>
              ) : (
                <p
                  className="text-[11px] font-medium truncate mt-0.5"
                  style={{ color: 'var(--c-text-muted, #94A3B8)' }}
                >
                  Drum Arrangement
                </p>
              )}
            </div>
          </div>

          {/* Open chevron */}
          <button
            type="button"
            onClick={onOpen}
            aria-label="Open beat editor"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0"
            style={{ color: 'var(--c-text-muted, #8A92A6)' }}
          >
            <span className="material-symbols-outlined text-xl group-hover:translate-x-0.5 transition-transform">
              chevron_right
            </span>
          </button>
        </div>

        {/* Metadata Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Kit badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1"
            style={{
              backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-primary, #111827)',
            }}
          >
            <span style={{ color: 'var(--c-accent-from, #2563EB)' }}>#</span>
            {kitName}
          </span>

          {/* Tempo BPM badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1"
            style={{
              backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
          >
            <span className="material-symbols-outlined text-[11px]">speed</span>
            {bpm} BPM
          </span>

          {/* Time signature */}
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
            style={{
              backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
          >
            {timeSig}
          </span>

          {/* Patterns count */}
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
            style={{
              backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
          >
            {patternCount} {patternCount === 1 ? 'Pattern' : 'Patterns'}
          </span>
        </div>

        {/* 16-Step Rhythm Timeline Visualizer */}
        <BeatMiniTimeline pattern={activePat} isPlaying={isPlaying} isLight={isLight} />
      </div>

      {/* Quick Action Footer Row: Open/Edit | Rename | Delete */}
      <div
        className="flex items-center border-t text-xs font-semibold"
        style={{ borderColor: 'var(--c-border, #E3E6EB)' }}
      >
        <button
          type="button"
          onClick={onOpen}
          data-testid={`edit-beat-${song.id}`}
          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
          style={{
            borderColor: 'var(--c-border, #E3E6EB)',
            color: 'var(--c-accent-from, #2563EB)',
          }}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={onStartRename}
          data-testid={`rename-beat-${song.id}`}
          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
          style={{
            borderColor: 'var(--c-border, #E3E6EB)',
            color: 'var(--c-text-secondary, #6B7280)',
          }}
        >
          <span className="material-symbols-outlined text-base">edit</span>
          <span>Rename</span>
        </button>

        <button
          type="button"
          onClick={onStartDelete}
          data-testid={`delete-beat-${song.id}`}
          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:opacity-75 text-red-500 hover:text-red-600"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          <span>Delete</span>
        </button>
      </div>
    </article>
  );
}

/* ──────────────────── MAIN DRUM BEATS PANEL ──────────────────── */
export function DrumBeatsPanel({
  drumSongs,
  onSelectSong,
  onCreateSong,
  onImportSong,
  onDeleteSong,
  onUpdateSong,
  previewingSongId,
  onTogglePreview,
  accent,
  isLight,
  isAmoled,
  isWebDesktop,
  onScroll,
  isCreateOpen,
  onOpenCreateChange,
  renderCreateForm,
  renderImportForm,
}: DrumBeatsPanelProps) {
  const t = useT();

  const [searchQuery, setSearchQuery] = useState('');
  const [kitFilter, setKitFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'bpm'>('recent');

  // Rename modal state
  const [renamingSong, setRenamingSong] = useState<DrumSong | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameArtist, setRenameArtist] = useState('');

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter & sort logic
  const filteredSongs = useMemo(() => {
    let list = [...drumSongs];

    // Kit filter
    if (kitFilter !== 'all') {
      list = list.filter((s) => s.kitType === kitFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const artistMatch = s.artist && s.artist.toLowerCase().includes(q);
        const kitMatch = formatKitName(s.kitType).toLowerCase().includes(q);
        const bpmMatch = s.patterns.some((p) => String(p.bpm).includes(q));
        return nameMatch || artistMatch || kitMatch || bpmMatch;
      });
    }

    // Sorting
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'bpm') {
      list.sort((a, b) => {
        const aPat = a.patterns.find((p) => p.id === a.activePatternId) ?? a.patterns[0];
        const bPat = b.patterns.find((p) => p.id === b.activePatternId) ?? b.patterns[0];
        return (bPat?.bpm ?? 120) - (aPat?.bpm ?? 120);
      });
    } else {
      // Recent (newest first)
      list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    }

    return list;
  }, [drumSongs, kitFilter, searchQuery, sortBy]);

  const handleStartRename = (song: DrumSong) => {
    setRenamingSong(song);
    setRenameName(song.name);
    setRenameArtist(song.artist || '');
  };

  const handleSaveRename = () => {
    if (!renamingSong) return;
    onUpdateSong(renamingSong.id, {
      name: renameName.trim() || renamingSong.name,
      artist: renameArtist.trim(),
    });
    setRenamingSong(null);
  };

  return (
    <div
      onScroll={onScroll}
      className="flex-1 overflow-y-auto no-scrollbar"
      style={{ background: 'var(--app-bg)' }}
      data-purpose="beats-screen"
    >
      <main
        className="w-full max-w-md mx-auto pb-32 px-4 pt-3 space-y-4 flex flex-col min-h-[calc(100vh-var(--safe-area-inset-top,0px)-var(--safe-area-inset-bottom,0px)-80px)]"
        style={{
          paddingTop:
            'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px))',
        }}
        data-purpose="mobile-viewport"
      >
        {/* Header Titles */}
        <header className="pt-2 px-1 flex-shrink-0" data-purpose="header-titles">
          <h1
            className="text-3xl font-extrabold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--font-headline)',
              color: 'var(--c-text-primary, #111827)',
            }}
          >
            Beats
          </h1>
          <p
            className="text-xs font-medium tracking-normal mt-0.5"
            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
          >
            Your drum songs &amp; arrangements
          </p>
        </header>

        {/* Capsule Search Bar */}
        <div className="relative flex items-center flex-shrink-0" data-purpose="search-box">
          <span
            className="material-symbols-outlined absolute left-4 pointer-events-none text-lg select-none"
            style={{ color: 'var(--c-text-muted, #94A3B8)' }}
          >
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search beats, kits, tempo..."
            className="w-full pl-10 pr-10 py-3 text-sm rounded-full border shadow-soft-card outline-none transition-all font-inter"
            style={{
              backgroundColor: 'var(--surface-card-bg, #ffffff)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-primary, #111827)',
            }}
            data-testid="beat-search-input"
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-transform cursor-pointer"
              style={{ color: 'var(--c-text-muted, #94A3B8)' }}
              data-testid="clear-search-btn"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Filter & Sort Chips (Visible when beats exist) */}
        {drumSongs.length > 0 && (
          <div
            className="flex items-center justify-between gap-2 px-1 pt-0.5 flex-shrink-0"
            data-purpose="filter-bar"
          >
            {/* Sort pills */}
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-bold uppercase tracking-wider select-none mr-0.5"
                style={{ color: 'var(--c-text-muted, #94A3B8)' }}
              >
                Sort:
              </span>
              {(['recent', 'name', 'bpm'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer ${
                    sortBy === s ? 'shadow-sm' : 'opacity-80'
                  }`}
                  style={{
                    backgroundColor:
                      sortBy === s
                        ? 'color-mix(in srgb, var(--c-accent-from, #2563EB) 14%, var(--surface-card-bg, #ffffff))'
                        : 'var(--surface-card-bg, #ffffff)',
                    borderColor:
                      sortBy === s ? 'var(--c-accent-from, #2563EB)' : 'var(--c-border, #E3E6EB)',
                    color:
                      sortBy === s
                        ? 'var(--c-accent-from, #2563EB)'
                        : 'var(--c-text-secondary, #6B7280)',
                  }}
                  data-testid={`sort-${s}-btn`}
                >
                  {s === 'recent' ? 'Recent' : s === 'name' ? 'Name' : 'BPM'}
                </button>
              ))}
            </div>

            {/* Total count badge */}
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-muted, #94A3B8)',
              }}
            >
              {filteredSongs.length} {filteredSongs.length === 1 ? 'Beat' : 'Beats'}
            </span>
          </div>
        )}

        {/* Content Area: Empty State, Search Empty State, or Beats List */}
        {drumSongs.length === 0 ? (
          /* Canonical Empty State: Balanced & Centered in available content region */
          <section
            className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 my-auto"
            data-purpose="empty-state"
          >
            {/* Musical Drum Icon Container */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 border shadow-soft-card"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, var(--surface-card-bg, #ffffff))',
                borderColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 22%, transparent)',
                color: 'var(--c-accent-from, #2563EB)',
              }}
            >
              <span className="material-symbols-outlined text-4xl select-none">album</span>
            </div>

            <h2
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--c-text-primary, #111827)',
              }}
            >
              No beats yet
            </h2>

            <p
              className="text-sm font-normal max-w-[260px] mt-1.5 leading-relaxed"
              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
            >
              Tap the '+' button to create your first drum beat or import a preset
            </p>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              {renderCreateForm ? (
                <MorphingActionSurface
                  isOpen={isCreateOpen}
                  onOpenChange={onOpenCreateChange}
                  placement="center"
                  maxWidth={380}
                  title="New Beat"
                  subtitle="Create a custom drum pattern"
                  accentColor={accent.from}
                  customTrigger={({ open, surfaceId, triggerProps }) => (
                    <motion.button
                      {...triggerProps}
                      type="button"
                      className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2"
                      style={{
                        backgroundColor: 'var(--c-accent-from, #2563EB)',
                        boxShadow:
                          '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 30%, transparent)',
                      }}
                      data-purpose="empty-create-beat-btn"
                      data-testid="empty-create-beat-btn"
                    >
                      <span className="material-symbols-outlined text-base font-bold">add</span>
                      <span>Create Beat</span>
                    </motion.button>
                  )}
                >
                  {renderCreateForm}
                </MorphingActionSurface>
              ) : (
                <button
                  type="button"
                  onClick={onCreateSong}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--c-accent-from, #2563EB)',
                    boxShadow:
                      '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 30%, transparent)',
                  }}
                  data-purpose="empty-create-beat-btn"
                  data-testid="empty-create-beat-btn"
                >
                  <span className="material-symbols-outlined text-base font-bold">add</span>
                  <span>Create Beat</span>
                </button>
              )}

              {renderImportForm ? (
                <MorphingActionSurface
                  placement="center"
                  maxWidth={380}
                  title="Import Beat"
                  subtitle="Import a Drumex JSON beat file"
                  accentColor={accent.from}
                  customTrigger={({ triggerProps }) => (
                    <motion.button
                      {...triggerProps}
                      type="button"
                      className="px-5 py-2.5 rounded-full text-xs font-semibold border shadow-sm cursor-pointer flex items-center gap-2"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                        color: 'var(--c-text-primary, #111827)',
                      }}
                      data-purpose="empty-import-btn"
                      data-testid="empty-import-btn"
                    >
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <span>Import</span>
                    </motion.button>
                  )}
                >
                  {renderImportForm}
                </MorphingActionSurface>
              ) : (
                <button
                  type="button"
                  onClick={onImportSong}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold border shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-primary, #111827)',
                  }}
                  data-purpose="empty-import-btn"
                  data-testid="empty-import-btn"
                >
                  <span className="material-symbols-outlined text-base">upload_file</span>
                  <span>Import</span>
                </button>
              )}
            </div>
          </section>
        ) : filteredSongs.length === 0 ? (
          /* Search Empty State */
          <section
            className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 my-auto"
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
              <span className="material-symbols-outlined text-2xl select-none">search_off</span>
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--c-text-primary, #111827)',
              }}
            >
              No matching beats found
            </h3>
            <p
              className="text-xs font-normal max-w-[240px] mt-1 leading-relaxed"
              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
            >
              Try refining your search term or kit filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setKitFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-full text-xs font-semibold border shadow-sm active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-primary, #111827)',
              }}
              data-purpose="clear-search-btn"
            >
              Clear Search
            </button>
          </section>
        ) : (
          /* Populated Beats List */
          <div className="space-y-3" data-purpose="beats-list">
            <StaggeredReveal staggerInterval={30}>
              {filteredSongs.map((song) => (
                <BeatCard
                  key={song.id}
                  song={song}
                  isPlaying={previewingSongId === song.id}
                  onPlayToggle={() => onTogglePreview(song)}
                  onOpen={() => onSelectSong(song)}
                  onStartRename={() => handleStartRename(song)}
                  onStartDelete={() => setDeletingId(song.id)}
                  isLight={isLight}
                />
              ))}
            </StaggeredReveal>
          </div>
        )}
      </main>

      {/* Rename Dialog */}
      {renamingSong && (
        <Dialog
          open={true}
          onClose={() => setRenamingSong(null)}
          title="Rename Beat"
          footer={
            <>
              <Button onClick={() => setRenamingSong(null)}>Cancel</Button>
              <Button
                onClick={handleSaveRename}
                style={{
                  backgroundColor: 'var(--c-accent-from, #2563EB)',
                  color: '#ffffff',
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 py-1">
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                Beat Title
              </label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="e.g. Funky Groove"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                Artist (Optional)
              </label>
              <Input
                value={renameArtist}
                onChange={(e) => setRenameArtist(e.target.value)}
                placeholder="e.g. The Beatmakers"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                }}
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <Dialog
          open={true}
          onClose={() => setDeletingId(null)}
          title="Delete Beat"
          footer={
            <>
              <Button onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  onDeleteSong(deletingId);
                  setDeletingId(null);
                }}
                style={{
                  backgroundColor: 'rgba(238,125,119,0.12)',
                  color: '#ee7d77',
                  border: '1px solid rgba(238,125,119,0.3)',
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px' }}>
            Are you sure you want to delete this drum beat? This action cannot be undone.
          </p>
        </Dialog>
      )}

      {/* Floating Action Buttons (FAB Stack) - Rendered when beats exist to prevent visual competition in empty state */}
      {drumSongs.length > 0 && (
        <aside
          className="fixed right-5 flex flex-col items-end gap-3 pointer-events-auto"
          style={{
            bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 86px)',
            zIndex: 40,
          }}
          data-purpose="floating-action-group"
        >
          {/* Secondary FAB: Import Beat JSON */}
          {renderImportForm ? (
            <MorphingActionSurface
              placement="center"
              maxWidth={380}
              title="Import Beat"
              subtitle="Import a Drumex JSON beat file"
              accentColor={accent.from}
              customTrigger={({ triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  type="button"
                  data-testid="import-beat-btn"
                  aria-label="Import Beat File"
                  title="Import Beat File"
                  className="w-11 h-11 rounded-full border shadow-soft-card flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-secondary, #6B7280)',
                  }}
                >
                  <span className="material-symbols-outlined text-xl">upload_file</span>
                </motion.button>
              )}
            >
              {renderImportForm}
            </MorphingActionSurface>
          ) : (
            <button
              type="button"
              onClick={onImportSong}
              data-testid="import-beat-btn"
              aria-label="Import Beat File"
              title="Import Beat File"
              className="w-11 h-11 rounded-full border shadow-soft-card flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-secondary, #6B7280)',
              }}
            >
              <span className="material-symbols-outlined text-xl">upload_file</span>
            </button>
          )}

          {/* Primary FAB: Create New Beat */}
          {renderCreateForm ? (
            <MorphingActionSurface
              isOpen={isCreateOpen}
              onOpenChange={onOpenCreateChange}
              placement="center"
              maxWidth={380}
              title="New Beat"
              subtitle="Create a custom drum pattern"
              accentColor={accent.from}
              customTrigger={({ open, surfaceId, triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  type="button"
                  data-testid="new-beat-btn"
                  aria-label="Create New Beat"
                  title="New Beat"
                  className="rounded-full text-white shadow-lg flex items-center justify-center cursor-pointer"
                  style={{
                    width: '52px',
                    height: '52px',
                    backgroundColor: 'var(--c-accent-from, #2563EB)',
                    boxShadow:
                      '0 8px 24px color-mix(in srgb, var(--c-accent-from, #2563EB) 35%, transparent)',
                  }}
                >
                  <span className="material-symbols-outlined text-2xl font-bold">add</span>
                </motion.button>
              )}
            >
              {renderCreateForm}
            </MorphingActionSurface>
          ) : (
            <motion.button
              type="button"
              onClick={onCreateSong}
              data-testid="new-beat-btn"
              aria-label="Create New Beat"
              title="New Beat"
              whileTap={{ scale: 0.94 }}
              className="rounded-full text-white shadow-lg flex items-center justify-center cursor-pointer"
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: 'var(--c-accent-from, #2563EB)',
                boxShadow:
                  '0 8px 24px color-mix(in srgb, var(--c-accent-from, #2563EB) 35%, transparent)',
              }}
            >
              <span className="material-symbols-outlined text-2xl font-bold">add</span>
            </motion.button>
          )}
        </aside>
      )}
    </div>
  );
}
