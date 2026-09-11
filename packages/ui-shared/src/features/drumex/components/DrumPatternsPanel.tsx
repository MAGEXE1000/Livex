import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import {
  type LibraryPattern,
  type LibraryCategory,
  type LibraryGenre,
  type DrumMeasure,
  type DrumHit,
  type DrumInstrument,
  type GrooveEntry,
  type GrooveTag,
  GROOVE_TAGS,
  DRUM_LIBRARY,
} from '@workspace/studio-core';
import { Dialog } from '../../../shared/design-system/dialogs';
import { Button, Input } from '../../../shared/design-system/StudioDesignSystem';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { StaggeredReveal } from '../../../shared/animation';
import { StudioHeader } from '../../../shared/layout/StudioHeader';

export interface DrumPatternsPanelProps {
  onPreviewPattern: (lp: LibraryPattern) => void;
  onUsePattern: (lp: LibraryPattern) => void;
  onAppendPattern: (lp: LibraryPattern) => void;

  grooves: GrooveEntry[];
  onPreviewGroove: (g: GrooveEntry) => void;
  onUseGroove: (id: string) => void;
  onAppendGroove: (id: string) => void;
  onSaveCurrentPattern?: () => void;
  onSaveGroove?: (name: string, tag: GrooveTag | '') => void;
  onDeleteGroove: (id: string) => void;
  onRenameGroove: (id: string, name: string, tag: GrooveTag) => void;

  previewingId: string | null;
  activePatternName?: string;

  accent: { from: string; to: string; mid?: string };
  isLight: boolean;
  isAmoled: boolean;
  isWebDesktop: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const CATEGORY_ITEMS: ('All' | LibraryCategory | 'My Grooves')[] = [
  'All',
  'Grooves',
  'Fills',
  'Basic Beats',
  'My Grooves',
];

const GENRE_ITEMS: ('' | LibraryGenre)[] = [
  '',
  'Rock',
  'Pop',
  'Funk',
  'Jazz',
  'Latin',
  'Electronic',
  'Hip Hop',
  'Metal',
];

/* ──────────────────── RHYTHMIC MINI TIMELINE ──────────────────── */
const PatternMiniTimeline = memo(function PatternMiniTimeline({
  measures,
  subdivision,
  isLight,
  isPlaying,
}: {
  measures: DrumMeasure[];
  subdivision: 8 | 16;
  isLight: boolean;
  isPlaying?: boolean;
}) {
  const totalSteps = subdivision === 8 ? 8 : 16;
  const m0 = measures[0];

  const { hatHits, snareHits, kickHits } = useMemo(() => {
    const hh = new Set<number>();
    const sn = new Set<number>();
    const kd = new Set<number>();

    if (m0 && m0.hits) {
      const hTracks = m0.hits['hihat-closed'] || m0.hits['hihat-open'] || m0.hits['crash'] || [];
      hTracks.forEach((h: DrumHit) => hh.add(h.step % totalSteps));

      const sTracks = m0.hits['snare'] || [];
      sTracks.forEach((h: DrumHit) => sn.add(h.step % totalSteps));

      const kTracks = m0.hits['kick'] || [];
      kTracks.forEach((h: DrumHit) => kd.add(h.step % totalSteps));
    }

    return { hatHits: hh, snareHits: sn, kickHits: kd };
  }, [m0, totalSteps]);

  return (
    <div
      className="w-full rounded-xl px-2.5 py-1.5 flex flex-col gap-1 transition-colors"
      style={{
        backgroundColor: isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)',
        border: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)',
      }}
      data-purpose="rhythm-timeline"
    >
      {/* Track 1: Hi-Hat */}
      <div className="flex items-center gap-2 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-4 shrink-0 tracking-wider select-none"
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
                key={'hh-' + i}
                className={
                  'flex-1 rounded-full transition-all ' +
                  (isPlaying && isHit ? 'animate-pulse' : '')
                }
                style={{
                  height: isHit ? 5 : 3,
                  backgroundColor: isHit
                    ? 'var(--c-accent-from, #2563EB)'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.14)'
                        : 'rgba(255,255,255,0.14)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 0.95 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Track 2: Snare */}
      <div className="flex items-center gap-2 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-4 shrink-0 tracking-wider select-none"
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
                key={'sn-' + i}
                className={
                  'flex-1 rounded-full transition-all ' +
                  (isPlaying && isHit ? 'animate-pulse' : '')
                }
                style={{
                  height: isHit ? 5 : 3,
                  backgroundColor: isHit
                    ? isLight
                      ? '#1E293B'
                      : '#F1F5F9'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.14)'
                        : 'rgba(255,255,255,0.14)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 0.95 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Track 3: Kick */}
      <div className="flex items-center gap-2 w-full">
        <span
          className="text-[9px] font-extrabold uppercase w-4 shrink-0 tracking-wider select-none"
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
                key={'kd-' + i}
                className={
                  'flex-1 rounded-full transition-all ' +
                  (isPlaying && isHit ? 'animate-pulse' : '')
                }
                style={{
                  height: isHit ? 5 : 3,
                  backgroundColor: isHit
                    ? 'var(--c-accent-from, #2563EB)'
                    : isDownbeat
                      ? isLight
                        ? 'rgba(0,0,0,0.14)'
                        : 'rgba(255,255,255,0.14)'
                      : isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  opacity: isHit ? 0.95 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

/* ──────────────────── BUILT-IN PATTERN CARD ──────────────────── */
const PatternCard = memo(function PatternCard({
  lp,
  isPlaying,
  isLight,
  onPreview,
  onUse,
  onAppend,
}: {
  lp: LibraryPattern;
  isPlaying: boolean;
  isLight: boolean;
  onPreview: () => void;
  onUse: () => void;
  onAppend: () => void;
}) {
  return (
    <article
      className="w-full rounded-2xl border shadow-soft-card overflow-hidden transition-all group flex flex-col p-3 gap-2.5"
      style={{
        backgroundColor: 'var(--surface-card-bg, #ffffff)',
        borderColor: 'var(--c-border, #E3E6EB)',
      }}
      data-purpose="pattern-card"
      data-testid={'pattern-card-' + lp.id}
    >
      {/* Header Row: Title + Metadata on left, Audition Preview on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="font-headline font-bold uppercase truncate"
            style={{
              fontFamily: 'var(--studio-font-display, var(--font-headline))',
              fontSize: 'var(--type-button-size, 13.5px)',
              lineHeight: '17px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'var(--c-text-primary, #111827)',
              margin: 0,
            }}
          >
            {lp.name}
          </h3>
          <p
            className="text-[11px] font-semibold tracking-wider uppercase truncate"
            style={{
              fontFamily: 'var(--studio-font-body, var(--font-body))',
              color: 'var(--c-text-muted, #94A3B8)',
              marginTop: '2px',
              marginBottom: 0,
            }}
          >
            {lp.category} · {lp.genre} · {lp.bpm} BPM · 4/4
          </p>
        </div>

        {/* Audition Button */}
        <button
          type="button"
          onClick={onPreview}
          data-testid={'preview-btn-' + lp.id}
          aria-label={isPlaying ? 'Stop ' + lp.name : 'Preview ' + lp.name}
          title={isPlaying ? 'Stop Preview' : 'Audition Preview'}
          className="w-8.5 h-8.5 rounded-full flex items-center justify-center shrink-0 border transition-all active:scale-90 cursor-pointer shadow-sm"
          style={{
            backgroundColor: isPlaying
              ? 'var(--c-accent-from, #2563EB)'
              : isLight
                ? 'rgba(0,0,0,0.04)'
                : 'rgba(255,255,255,0.06)',
            borderColor: isPlaying ? 'var(--c-accent-from, #2563EB)' : 'var(--c-border, #E3E6EB)',
            color: isPlaying ? '#ffffff' : 'var(--c-text-primary, #111827)',
            boxShadow: isPlaying
              ? '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)'
              : 'none',
          }}
        >
          <span className="material-symbols-outlined text-lg">
            {isPlaying ? 'stop' : 'play_arrow'}
          </span>
        </button>
      </div>

      {/* Rhythmic Timeline */}
      <PatternMiniTimeline
        measures={lp.measures}
        subdivision={lp.subdivision}
        isLight={isLight}
        isPlaying={isPlaying}
      />

      {/* Actions: USE (Primary) and APPEND (Secondary) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          type="button"
          onClick={onUse}
          data-testid={'use-btn-' + lp.id}
          className="py-1.5 px-3 rounded-full border border-transparent font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm"
          style={{
            backgroundColor: 'var(--c-accent-from, #2563EB)',
            color: '#ffffff',
          }}
        >
          <span className="material-symbols-outlined text-base">download</span>
          <span>USE</span>
        </button>

        <button
          type="button"
          onClick={onAppend}
          data-testid={'append-btn-' + lp.id}
          className="py-1.5 px-3 rounded-full border font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
            borderColor: 'var(--c-border, #E3E6EB)',
            color: 'var(--c-text-primary, #111827)',
          }}
        >
          <span className="material-symbols-outlined text-base">playlist_add</span>
          <span>APPEND</span>
        </button>
      </div>
    </article>
  );
});

/* ──────────────────── USER GROOVE CARD ──────────────────── */
const MyGrooveCard = memo(function MyGrooveCard({
  groove,
  isPlaying,
  isLight,
  onPreview,
  onUse,
  onAppend,
  onStartRename,
  onStartDelete,
}: {
  groove: GrooveEntry;
  isPlaying: boolean;
  isLight: boolean;
  onPreview: () => void;
  onUse: () => void;
  onAppend: () => void;
  onStartRename: () => void;
  onStartDelete: () => void;
}) {
  return (
    <article
      className="w-full rounded-2xl border shadow-soft-card overflow-hidden transition-all group flex flex-col p-3 gap-2.5 relative"
      style={{
        backgroundColor: 'var(--surface-card-bg, #ffffff)',
        borderColor: 'var(--c-border, #E3E6EB)',
      }}
      data-purpose="pattern-card"
      data-testid={'groove-card-' + groove.id}
    >
      {/* Header Row: Title + Tag + Metadata on left, Audition & Menu on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="font-headline font-bold uppercase truncate"
              style={{
                fontFamily: 'var(--studio-font-display, var(--font-headline))',
                fontSize: 'var(--type-button-size, 13.5px)',
                lineHeight: '17px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: 'var(--c-text-primary, #111827)',
                margin: 0,
              }}
            >
              {groove.name}
            </h3>
            {groove.tag && (
              <span
                className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--c-accent-from, #2563EB)',
                  color: '#ffffff',
                }}
              >
                {groove.tag}
              </span>
            )}
          </div>
          <p
            className="text-[11px] font-semibold tracking-wider uppercase truncate"
            style={{
              fontFamily: 'var(--studio-font-body, var(--font-body))',
              color: 'var(--c-text-muted, #94A3B8)',
              marginTop: '2px',
              marginBottom: 0,
            }}
          >
            Custom Groove · {groove.bpm} BPM · 4/4
          </p>
        </div>

        {/* Audition & Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPreview}
            data-testid={'preview-groove-' + groove.id}
            aria-label={isPlaying ? 'Stop ' + groove.name : 'Preview ' + groove.name}
            title={isPlaying ? 'Stop Preview' : 'Audition Preview'}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center border transition-all active:scale-90 cursor-pointer shadow-sm"
            style={{
              backgroundColor: isPlaying
                ? 'var(--c-accent-from, #2563EB)'
                : isLight
                  ? 'rgba(0,0,0,0.04)'
                  : 'rgba(255,255,255,0.06)',
              borderColor: isPlaying ? 'var(--c-accent-from, #2563EB)' : 'var(--c-border, #E3E6EB)',
              color: isPlaying ? '#ffffff' : 'var(--c-text-primary, #111827)',
              boxShadow: isPlaying
                ? '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)'
                : 'none',
            }}
          >
            <span className="material-symbols-outlined text-lg">
              {isPlaying ? 'stop' : 'play_arrow'}
            </span>
          </button>

          {/* Kebab Morphing Action Surface */}
          <MorphingActionSurface
            triggerVariant="icon"
            buttonIcon="more_vert"
            title={groove.name}
            subtitle="Groove Options"
            accentColor="var(--c-accent-from, #2563EB)"
            style={{
              width: 32,
              height: 32,
              minHeight: 32,
              borderRadius: 16,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
            rows={[
              {
                id: 'rename',
                label: 'Rename',
                sublabel: 'Change groove name or style tag',
                icon: 'edit',
                onPress: onStartRename,
              },
              {
                id: 'delete',
                label: 'Delete',
                sublabel: 'Permanently remove this custom groove',
                icon: 'delete',
                badge: 'Danger',
                destructive: true,
                onPress: onStartDelete,
              },
            ]}
          />
        </div>
      </div>

      {/* Rhythmic Timeline */}
      <PatternMiniTimeline
        measures={groove.measures}
        subdivision={groove.subdivision}
        isLight={isLight}
        isPlaying={isPlaying}
      />

      {/* Actions: USE (Primary) and APPEND (Secondary) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          type="button"
          onClick={onUse}
          data-testid={'use-groove-' + groove.id}
          className="py-1.5 px-3 rounded-full border border-transparent font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm"
          style={{
            backgroundColor: 'var(--c-accent-from, #2563EB)',
            color: '#ffffff',
          }}
        >
          <span className="material-symbols-outlined text-base">download</span>
          <span>USE</span>
        </button>

        <button
          type="button"
          onClick={onAppend}
          data-testid={'append-groove-' + groove.id}
          className="py-1.5 px-3 rounded-full border font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
            borderColor: 'var(--c-border, #E3E6EB)',
            color: 'var(--c-text-primary, #111827)',
          }}
        >
          <span className="material-symbols-outlined text-base">playlist_add</span>
          <span>APPEND</span>
        </button>
      </div>
    </article>
  );
});

/* ──────────────────── SAVE GROOVE FORM ──────────────────── */
export function SaveGrooveForm({
  defaultName = '',
  accent,
  onSave,
  onClose,
}: {
  defaultName?: string;
  accent: { from: string; to: string; mid?: string };
  onSave: (name: string, tag: GrooveTag | '') => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [tag, setTag] = useState<GrooveTag | ''>('');

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 14px 14px' }}>
      <div>
        <label
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--c-text-secondary)',
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: 6,
          }}
        >
          NAME
        </label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Groove name…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onSave(name.trim(), tag);
              onClose?.();
            }
          }}
        />
      </div>
      <div>
        <label
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--c-text-secondary)',
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          TAG
        </label>
        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: '4px' }}
        >
          {(['', ...GROOVE_TAGS] as (GrooveTag | '')[]).map((t) => {
            const label = t === '' ? 'None' : t;
            const active = tag === t;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTag(t as GrooveTag)}
                className="btn-smooth"
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-headline)',
                  cursor: 'pointer',
                  border: active
                    ? `1.5px solid ${accent.from}`
                    : '1.5px solid var(--c-border)',
                  background: active ? `${accent.from}18` : 'transparent',
                  color: active ? accent.from : 'var(--c-text-secondary)',
                  transition: 'all 140ms',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <Button
        variant="primary"
        disabled={!name.trim()}
        onClick={() => {
          if (!name.trim()) return;
          onSave(name.trim(), tag);
          onClose?.();
        }}
        style={{ width: '100%' }}
      >
        Save Groove
      </Button>
    </div>
  );
}

/* ──────────────────── MAIN DRUM PATTERNS PANEL ──────────────────── */
export function DrumPatternsPanel({
  onPreviewPattern,
  onUsePattern,
  onAppendPattern,
  grooves,
  onPreviewGroove,
  onUseGroove,
  onAppendGroove,
  onSaveCurrentPattern,
  onSaveGroove,
  onDeleteGroove,
  onRenameGroove,
  previewingId,
  activePatternName,
  accent,
  isLight,
  isAmoled,
  isWebDesktop,
  onScroll,
}: DrumPatternsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | LibraryCategory | 'My Grooves'>(
    'All'
  );
  const [selectedGenre, setSelectedGenre] = useState<'' | LibraryGenre>('');
  const [grooveTagFilter, setGrooveTagFilter] = useState<'' | GrooveTag>('');
  const [visibleBatch, setVisibleBatch] = useState(20);

  // User groove rename dialog state
  const [renamingGroove, setRenamingGroove] = useState<GrooveEntry | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameTag, setRenameTag] = useState<GrooveTag>('');

  // User groove delete dialog state
  const [deletingGrooveId, setDeletingGrooveId] = useState<string | null>(null);

  // Filter built-in library patterns
  const filteredLibrary = useMemo(() => {
    let items = DRUM_LIBRARY;

    if (selectedCategory !== 'All' && selectedCategory !== 'My Grooves') {
      items = items.filter((p) => p.category === selectedCategory);
    }

    if (selectedGenre) {
      items = items.filter((p) => p.genre === selectedGenre);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.genre.toLowerCase().includes(q) ||
          String(p.bpm).includes(q)
      );
    }

    return items;
  }, [selectedCategory, selectedGenre, searchQuery]);

  // Filter user grooves
  const filteredGrooves = useMemo(() => {
    let items = [...grooves];

    if (grooveTagFilter) {
      items = items.filter((g) => g.tag === grooveTagFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.tag && g.tag.toLowerCase().includes(q)) ||
          String(g.bpm).includes(q)
      );
    }

    return items;
  }, [grooves, grooveTagFilter, searchQuery]);

  const handleStartRename = (g: GrooveEntry) => {
    setRenamingGroove(g);
    setRenameName(g.name);
    setRenameTag(g.tag);
  };

  const handleSaveRename = () => {
    if (!renamingGroove) return;
    onRenameGroove(renamingGroove.id, renameName.trim() || renamingGroove.name, renameTag);
    setRenamingGroove(null);
  };

  const isMyGroovesActive = selectedCategory === 'My Grooves';

  return (
    <div
      onScroll={onScroll}
      className="no-scrollbar flex flex-col w-full h-full relative app-bg"
      style={{
        backgroundColor: 'var(--app-bg)',
        overflowY: 'auto',
      }}
      data-purpose="patterns-view-container"
    >
      <div
        className={
          'w-full flex flex-col pb-28 ' +
          (isWebDesktop ? 'max-w-5xl mx-auto px-6 pt-6' : 'max-w-md mx-auto px-4')
        }
      >
        {/* Header Section */}
        <StudioHeader
          title="Patterns"
          subtitle="Pattern & groove library"
          disableHorizontalPadding={true}
          disableTopInset={isWebDesktop}
        />

        {/* Filter & Search Controls */}
        <div className="pb-2 flex flex-col gap-2">
          {/* Capsule Search Bar */}
          <div className="relative flex items-center" data-purpose="search-box">
            <span
              className="material-symbols-outlined absolute left-3.5 pointer-events-none text-lg select-none"
              style={{ color: 'var(--c-text-muted, #94A3B8)' }}
            >
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleBatch(20);
              }}
              placeholder="Search patterns, genres, or moods..."
              className="w-full pl-9 pr-9 py-2 text-xs rounded-full border shadow-soft-card outline-none transition-all font-inter"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-primary, #111827)',
              }}
              data-testid="pattern-search-input"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-transform cursor-pointer"
                style={{ color: 'var(--c-text-muted, #94A3B8)' }}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Filter Row 1: Pattern Types / Categories */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4"
            data-purpose="category-chips"
          >
            {CATEGORY_ITEMS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setVisibleBatch(20);
                  }}
                  data-testid={'cat-btn-' + cat.toLowerCase().replace(/\s+/g, '-')}
                  className="shrink-0 px-3.5 py-1 text-[11px] font-bold rounded-full transition-all active:scale-95 cursor-pointer border"
                  style={{
                    backgroundColor: active
                      ? 'var(--c-accent-from, #2563EB)'
                      : isLight
                        ? 'rgba(0,0,0,0.04)'
                        : 'rgba(255,255,255,0.06)',
                    borderColor: active
                      ? 'var(--c-accent-from, #2563EB)'
                      : 'var(--c-border, #E3E6EB)',
                    color: active ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                    boxShadow: active
                      ? '0 2px 8px color-mix(in srgb, var(--c-accent-from, #2563EB) 30%, transparent)'
                      : 'none',
                  }}
                >
                  {cat.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Filter Row 2: Genre Pills (or Groove Tags when My Grooves is active) */}
          {!isMyGroovesActive ? (
            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4"
              data-purpose="genre-chips"
            >
              {GENRE_ITEMS.map((genre) => {
                const label = genre === '' ? 'ALL GENRES' : genre.toUpperCase();
                const active = selectedGenre === genre;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(genre);
                      setVisibleBatch(20);
                    }}
                    data-testid={'genre-btn-' + (genre === '' ? 'all' : genre.toLowerCase())}
                    className="shrink-0 px-3 py-0.5 text-[11px] font-bold rounded-full transition-all active:scale-95 cursor-pointer border"
                    style={{
                      backgroundColor: active
                        ? 'var(--c-accent-from, #2563EB)'
                        : isLight
                          ? 'rgba(0,0,0,0.03)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor: active
                        ? 'var(--c-accent-from, #2563EB)'
                        : 'var(--c-border, #E3E6EB)',
                      color: active ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4"
              data-purpose="tag-chips"
            >
              {(['', ...GROOVE_TAGS] as const).map((tag) => {
                const label = tag === '' ? 'ALL TAGS' : tag.toUpperCase();
                const active = grooveTagFilter === tag;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setGrooveTagFilter(tag);
                      setVisibleBatch(20);
                    }}
                    data-testid={'tag-btn-' + (tag === '' ? 'all' : tag.toLowerCase())}
                    className="shrink-0 px-3 py-0.5 text-[11px] font-bold rounded-full transition-all active:scale-95 cursor-pointer border"
                    style={{
                      backgroundColor: active
                        ? 'var(--c-accent-from, #2563EB)'
                        : isLight
                          ? 'rgba(0,0,0,0.03)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor: active
                        ? 'var(--c-accent-from, #2563EB)'
                        : 'var(--c-border, #E3E6EB)',
                      color: active ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* My Grooves: Save Current Pattern Action Banner */}
        {isMyGroovesActive && (
          <div className="pb-3">
            {onSaveGroove ? (
              <MorphingActionSurface
                placement="center"
                maxWidth={380}
                title="Save to Groove Library"
                subtitle={`Store "${activePatternName || 'Current Pattern'}" to your library`}
                accentColor={accent.from}
                customTrigger={({ triggerProps }) => (
                  <motion.button
                    {...triggerProps}
                    type="button"
                    data-testid="save-groove-banner-btn"
                    className="w-full p-3.5 rounded-2xl border shadow-soft-card flex items-center gap-3 cursor-pointer text-left"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: 'var(--c-accent-from, #2563EB)' }}
                    >
                      <span className="material-symbols-outlined text-xl">bookmark_add</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-extrabold font-headline uppercase tracking-wide truncate"
                        style={{ color: 'var(--c-text-primary, #111827)' }}
                      >
                        Save as Groove
                      </div>
                      <div
                        className="text-[11px] font-medium tracking-normal truncate mt-0.5"
                        style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                      >
                        Store "{activePatternName || 'Current Pattern'}" to your library
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-xl text-slate-400">
                      chevron_right
                    </span>
                  </motion.button>
                )}
              >
                {({ close }) => (
                  <SaveGrooveForm
                    defaultName={activePatternName || ''}
                    accent={accent}
                    onSave={(name, tag) => {
                      onSaveGroove(name, tag);
                      close();
                    }}
                    onClose={close}
                  />
                )}
              </MorphingActionSurface>
            ) : (
              <button
                type="button"
                onClick={onSaveCurrentPattern}
                data-testid="save-groove-banner-btn"
                className="w-full p-3.5 rounded-2xl border shadow-soft-card flex items-center gap-3 transition-all active:scale-98 cursor-pointer text-left"
                style={{
                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                  style={{ backgroundColor: 'var(--c-accent-from, #2563EB)' }}
                >
                  <span className="material-symbols-outlined text-xl">bookmark_add</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-extrabold font-headline uppercase tracking-wide truncate"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                  >
                    Save as Groove
                  </div>
                  <div
                    className="text-[11px] font-medium tracking-normal truncate mt-0.5"
                    style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                  >
                    Store "{activePatternName || 'Current Pattern'}" to your library
                  </div>
                </div>
                <span className="material-symbols-outlined text-xl text-slate-400">
                  chevron_right
                </span>
              </button>
            )}
          </div>
        )}

        {/* Pattern List Content */}
        <main aria-label="Pattern list" className="flex-1 flex flex-col gap-3 mt-1" role="feed">
          {!isMyGroovesActive ? (
            /* Built-in Patterns List */
            filteredLibrary.length === 0 ? (
              <div
                className="p-10 border rounded-2xl flex flex-col items-center justify-center gap-3 text-center my-4"
                style={{
                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-soft-card"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--c-accent-from, #2563EB) 25%, transparent)',
                    color: 'var(--c-accent-from, #2563EB)',
                  }}
                >
                  <span className="material-symbols-outlined text-2xl">search_off</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3
                    className="font-headline font-bold text-sm tracking-wide"
                    style={{
                      fontFamily: 'var(--studio-font-display, var(--font-headline))',
                      fontSize: 'var(--type-body-size, 14.5px)',
                      lineHeight: '20px',
                      fontWeight: 700,
                      color: 'var(--c-text-primary, #111827)',
                      margin: 0,
                    }}
                  >
                    No patterns found
                  </h3>
                  <p
                    className="text-xs font-normal"
                    style={{
                      color: 'var(--c-text-secondary, #6B7280)',
                      margin: 0,
                      marginTop: '2px',
                    }}
                  >
                    Try adjusting your search terms or genre filter.
                  </p>
                </div>
              </div>
            ) : (
              <StaggeredReveal staggerInterval={20}>
                {filteredLibrary.slice(0, visibleBatch).map((lp) => (
                  <PatternCard
                    key={lp.id}
                    lp={lp}
                    isPlaying={previewingId === lp.id}
                    isLight={isLight}
                    onPreview={() => onPreviewPattern(lp)}
                    onUse={() => onUsePattern(lp)}
                    onAppend={() => onAppendPattern(lp)}
                  />
                ))}
              </StaggeredReveal>
            )
          ) : /* User Grooves List */
          filteredGrooves.length === 0 ? (
            <div
              className="p-10 border rounded-2xl flex flex-col items-center justify-center gap-3 text-center my-4"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-soft-card"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 25%, transparent)',
                  color: 'var(--c-accent-from, #2563EB)',
                }}
              >
                <span className="material-symbols-outlined text-2xl">bookmark_border</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3
                  className="font-headline font-bold text-sm tracking-wide"
                  style={{
                    fontFamily: 'var(--studio-font-display, var(--font-headline))',
                    fontSize: 'var(--type-body-size, 14.5px)',
                    lineHeight: '20px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, #111827)',
                    margin: 0,
                  }}
                >
                  No grooves saved yet
                </h3>
                <p
                  className="text-xs font-normal"
                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                >
                  Tap "Save as Groove" above to build your personal groove library.
                </p>
              </div>
            </div>
          ) : (
            <StaggeredReveal staggerInterval={20}>
              {filteredGrooves.map((g) => (
                <MyGrooveCard
                  key={g.id}
                  groove={g}
                  isPlaying={previewingId === g.id}
                  isLight={isLight}
                  onPreview={() => onPreviewGroove(g)}
                  onUse={() => onUseGroove(g.id)}
                  onAppend={() => onAppendGroove(g.id)}
                  onStartRename={() => handleStartRename(g)}
                  onStartDelete={() => setDeletingGrooveId(g.id)}
                />
              ))}
            </StaggeredReveal>
          )}

          {/* Show More Pagination Button for Built-in Library */}
          {!isMyGroovesActive && visibleBatch < filteredLibrary.length && (
            <div className="pt-2 pb-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleBatch((prev) => prev + 20)}
                data-testid="show-more-patterns-btn"
                className="py-2.5 px-6 rounded-full border text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-soft-card"
                style={{
                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                  color: 'var(--c-accent-from, #2563EB)',
                }}
              >
                Show more ({filteredLibrary.length - visibleBatch} remaining)
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Rename Groove Dialog */}
      {renamingGroove && (
        <Dialog
          open={true}
          onClose={() => setRenamingGroove(null)}
          title="Rename Groove"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRenamingGroove(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveRename}>
                Save
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3.5 py-1">
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                Groove Name
              </label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Groove name"
                autoFocus
              />
            </div>
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                Style Tag
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['', ...GROOVE_TAGS] as ('' | GrooveTag)[]).map((tag) => {
                  const label = tag === '' ? 'None' : tag;
                  const active = renameTag === tag;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRenameTag(tag)}
                      className="px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer"
                      style={{
                        backgroundColor: active
                          ? 'var(--c-accent-from, #2563EB)'
                          : isLight
                            ? 'rgba(0,0,0,0.03)'
                            : 'rgba(255,255,255,0.05)',
                        borderColor: active
                          ? 'var(--c-accent-from, #2563EB)'
                          : 'var(--c-border, #E3E6EB)',
                        color: active ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Groove Confirmation Dialog */}
      {deletingGrooveId && (
        <Dialog
          open={true}
          onClose={() => setDeletingGrooveId(null)}
          title="Delete Groove"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeletingGrooveId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onDeleteGroove(deletingGrooveId);
                  setDeletingGrooveId(null);
                }}
                style={{
                  backgroundColor: '#EF4444',
                  borderColor: '#EF4444',
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px' }}>
            Are you sure you want to delete this groove? This action cannot be undone.
          </p>
        </Dialog>
      )}
    </div>
  );
}
