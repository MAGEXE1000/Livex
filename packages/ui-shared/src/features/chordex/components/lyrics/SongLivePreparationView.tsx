import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  type SongPreset,
  type SongLyricsDocument,
  type SongLyricSection,
  type VocalRoleAnnotation,
  type StandardVocalRole,
  VOCAL_ROLE_PRESETS,
  LYRIC_SECTION_TYPES,
  generateLyricId,
  getCombinedVocalRoles,
  splitLineIntoSegments,
} from '@workspace/livex-core';
import { toast } from 'sonner';
import { MorphingActionSurface } from '../../../../shared/design-system/MorphingActionSurface';

export interface SongLivePreparationViewProps {
  preset: SongPreset;
  accent: { from: string; to: string; mid?: string };
  transposeOffset: number;
  preferFlats: boolean;
  onEditLyrics: () => void;
  onLaunchLive: () => void;
  onUpdateLyrics: (lyrics: SongLyricsDocument) => void;
  onEditDetails?: () => void;
}

export const SongLivePreparationView: React.FC<SongLivePreparationViewProps> = ({
  preset,
  accent,
  transposeOffset,
  preferFlats,
  onEditLyrics,
  onLaunchLive,
  onUpdateLyrics,
  onEditDetails,
}) => {
  const lyricsDoc = preset.lyrics;
  const sections = lyricsDoc?.sections ?? [];

  // Presentation & teleprompter display state
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords_lyrics'>('lyrics');
  const [fontSize, setFontSize] = useState<number>(() => {
    const f = lyricsDoc?.formatting?.fontSize;
    if (f === 'small') return 16;
    if (f === 'large') return 24;
    return 19;
  });
  const [lineSpacing, setLineSpacing] = useState<number>(() => {
    const s = lyricsDoc?.formatting?.lineSpacing;
    if (s === 'compact') return 1.4;
    if (s === 'relaxed') return 1.9;
    return 1.6;
  });
  const [isBold, setIsBold] = useState<boolean>(() => Boolean(lyricsDoc?.formatting?.bold));
  const [textColor, setTextColor] = useState<string>(() => {
    const c = lyricsDoc?.formatting?.defaultColor;
    if (!c || c === '#FFFFFF' || c === '#111827' || c === 'default') {
      return 'default';
    }
    return c;
  });

  const [showSectionMorph, setShowSectionMorph] = useState(false);
  const [showTextMorph, setShowTextMorph] = useState(false);
  const [selectedSectionForRole, setSelectedSectionForRole] = useState<string | null>(null);

  // Available vocal roles (presets + custom saved)
  const combinedVocalRoles = useMemo(() => getCombinedVocalRoles(), []);
  const availableVocalRoles = useMemo(
    () => [...combinedVocalRoles.defaults, ...combinedVocalRoles.customs],
    [combinedVocalRoles]
  );

  // Update document formatting settings
  const handleUpdateFormatting = useCallback(
    (opts: {
      fontSize?: number;
      lineSpacing?: number;
      bold?: boolean;
      defaultColor?: string;
    }) => {
      const nextFontSize = opts.fontSize ?? fontSize;
      const nextLineSpacing = opts.lineSpacing ?? lineSpacing;
      const nextBold = opts.bold !== undefined ? opts.bold : isBold;
      const nextColor = opts.defaultColor ?? textColor;

      if (opts.fontSize !== undefined) setFontSize(opts.fontSize);
      if (opts.lineSpacing !== undefined) setLineSpacing(opts.lineSpacing);
      if (opts.bold !== undefined) setIsBold(opts.bold);
      if (opts.defaultColor !== undefined) setTextColor(opts.defaultColor);

      if (!lyricsDoc) return;
      const fontSizeName: 'small' | 'medium' | 'large' =
        nextFontSize <= 16 ? 'small' : nextFontSize >= 24 ? 'large' : 'medium';
      const lineSpacingName: 'compact' | 'normal' | 'relaxed' =
        nextLineSpacing <= 1.45 ? 'compact' : nextLineSpacing >= 1.8 ? 'relaxed' : 'normal';

      onUpdateLyrics({
        ...lyricsDoc,
        formatting: {
          ...lyricsDoc.formatting,
          fontSize: fontSizeName,
          lineSpacing: lineSpacingName,
          bold: nextBold,
          defaultColor: nextColor,
        },
      });
    },
    [fontSize, lineSpacing, isBold, textColor, lyricsDoc, onUpdateLyrics]
  );

  // Assign vocal role to a section
  const handleSetSectionVocalRole = useCallback(
    (sectionId: string, role?: VocalRoleAnnotation) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          vocalRole: role,
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
      setSelectedSectionForRole(null);
      toast.success(role ? `Vocal role set to ${role.label}` : 'Vocal role cleared');
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  // Append a new empty section with a specified type/name
  const handleAddSection = useCallback(
    (name: string, type: any = 'verse') => {
      if (!lyricsDoc) return;
      const newSection: SongLyricSection = {
        id: generateLyricId('sec'),
        name,
        type,
        lines: [
          {
            id: generateLyricId('line'),
            text: '',
          },
        ],
      };
      onUpdateLyrics({
        ...lyricsDoc,
        sections: [...sections, newSection],
      });
      setShowSectionMorph(false);
      toast.success(`Added [${name}] section`);
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const isEmpty =
    sections.length === 0 ||
    sections.every(
      (s) => s.lines.length === 0 || s.lines.every((l) => !l.text.trim() && (!l.chords || l.chords.length === 0))
    );

  const resolvedColor =
    textColor && textColor !== 'default' ? textColor : 'var(--c-text-primary, #111827)';

  return (
    <div
      className="w-full flex flex-col relative"
      data-purpose="song-live-preparation-view"
    >
      {/* ── Document Content Area ── */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
            style={{
              backgroundColor: 'var(--surface-card-bg, #ffffff)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: accent.from,
            }}
          >
            <span className="material-symbols-rounded text-3xl">edit_note</span>
          </div>
          <h3
            className="text-base font-bold mb-1"
            style={{
              fontFamily: 'var(--font-headline)',
              color: 'var(--c-text-primary, #111827)',
            }}
          >
            No Lyrics Composed
          </h3>
          <p
            className="text-xs max-w-xs mb-6 leading-relaxed"
            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
          >
            Write your lyrics in the distraction-free continuous composer, then return here to configure your live performance.
          </p>
          <button
            type="button"
            onClick={onEditLyrics}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              boxShadow: `0 3px 12px ${accent.to}44`,
            }}
          >
            <span className="material-symbols-rounded text-base">draw</span>
            <span>Open Lyric Composer</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {sections.map((section, sIdx) => {
            const hasName = Boolean(section.name && section.name.trim().length > 0);
            const vocalRole = section.vocalRole;

            return (
              <div key={section.id || `sec-${sIdx}`} className="flex flex-col">
                {/* Section Badge with Vocal Role (Only if named or has vocal role) */}
                {(hasName || vocalRole) && (
                  <div className="flex items-center gap-2 mb-2.5 select-none">
                    {hasName && (
                      <span
                        className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border shadow-2xs"
                        style={{
                          backgroundColor: `${accent.from}14`,
                          borderColor: `${accent.from}38`,
                          color: accent.from,
                          fontFamily: 'var(--font-headline, system-ui, sans-serif)',
                        }}
                      >
                        {section.name}
                      </span>
                    )}

                    {/* Vocal Role Chip (tap to change) */}
                    <button
                      type="button"
                      onClick={() => setSelectedSectionForRole(section.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs active:scale-95 transition-all cursor-pointer"
                      style={{
                        backgroundColor: vocalRole ? `${vocalRole.color}22` : 'var(--surface-container-low, rgba(0, 0, 0, 0.04))',
                        borderColor: vocalRole ? `${vocalRole.color}55` : 'var(--c-border, #E3E6EB)',
                        color: vocalRole ? vocalRole.color : 'var(--c-text-muted, #8A92A6)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: vocalRole?.color || 'currentColor' }}
                      />
                      <span>{vocalRole?.label || '+ Role'}</span>
                    </button>
                  </div>
                )}

                {/* Section Lines */}
                <div
                  className="flex flex-col select-text"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineSpacing,
                    fontFamily: 'var(--font-body, system-ui, sans-serif)',
                  }}
                >
                  {section.lines.map((line, lIdx) => {
                    const showChords = displayMode === 'chords_lyrics' && line.chords && line.chords.length > 0;
                    const isBlank = !line.text.trim() && (!line.chords || line.chords.length === 0);

                    if (isBlank) {
                      return <div key={line.id || `blank-${lIdx}`} className="h-4" />;
                    }

                    const lineTextColor = line.format?.color || resolvedColor;

                    return (
                      <div key={line.id || `line-${lIdx}`} className="flex flex-col py-1">
                        {showChords ? (
                          <div className="flex flex-wrap items-end gap-x-1 gap-y-1 select-text">
                            {splitLineIntoSegments(line.text, line.chords).map((seg) => (
                              <div
                                key={seg.id}
                                className="inline-flex flex-col items-start align-bottom"
                              >
                                {seg.chord ? (
                                  <span
                                    className="font-mono text-xs font-black tracking-tight select-none mb-0.5 px-1 py-0.2 rounded"
                                    style={{
                                      backgroundColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 12%, transparent)',
                                      color: 'var(--c-accent-from, #2563EB)',
                                    }}
                                  >
                                    {seg.chord.chord}
                                  </span>
                                ) : (
                                  <span className="h-5 mb-0.5 select-none pointer-events-none" />
                                )}
                                <span
                                  style={{
                                    fontWeight: (line.format?.bold ?? isBold) ? 700 : 400,
                                    color: lineTextColor,
                                  }}
                                  className="whitespace-pre"
                                >
                                  {seg.text || '\u00A0'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontWeight: (line.format?.bold ?? isBold) ? 700 : 400,
                              color: lineTextColor,
                            }}
                          >
                            {line.text || '\u00A0'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Canonical Floating Bottom Toolbar (Lyrics Mode Parity) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <aside
            aria-label="Song Lyrics preparation toolbar"
            data-testid="lyrics-editing-bottom-dock"
            data-purpose="lyrics-editing-bottom-dock"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto select-none"
            style={{
              position: 'fixed',
              bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
              left: '50%',
              transform: 'translateX(-50%) translateZ(0)',
              willChange: 'transform, backdrop-filter',
              zIndex: 45,
              width: 'fit-content',
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: 'var(--surface-float-bg, rgba(20, 20, 26, 0.75))',
              borderColor: 'var(--surface-topbar-border, rgba(255, 255, 255, 0.12))',
              boxShadow: 'var(--surface-topbar-shadow, 0 10px 30px rgba(0, 0, 0, 0.35))',
              backdropFilter: 'var(--surface-topbar-backdrop)',
              WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
              pointerEvents: 'auto',
            }}
          >
            {/* ── LEFT CLUSTER: Edit Composer & Add Sections ── */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="lyrics-toolbar-edit-btn"
                onClick={onEditLyrics}
                aria-label="Open Lyric Composer"
                title="Open Lyric Composer"
                className="px-2.5 h-9 rounded-full flex items-center justify-center gap-1 transition active:scale-90 cursor-pointer font-bold text-xs"
                style={{
                  backgroundColor:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                  color: 'var(--c-text-primary, #ffffff)',
                  border: '1px solid var(--c-border, transparent)',
                }}
              >
                <span className="material-symbols-rounded text-base">edit</span>
                <span>Edit</span>
              </button>

              <button
                type="button"
                data-testid="lyrics-toolbar-sections-btn"
                onClick={() => setShowSectionMorph(true)}
                aria-label="Add Section"
                title="Add Section"
                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
                style={{
                  backgroundColor:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                  color: accent.from,
                }}
              >
                <span className="material-symbols-rounded text-lg">layers</span>
              </button>
            </div>

            {/* Vertical Divider */}
            <div
              className="w-[1px] h-5 mx-0.5"
              style={{
                backgroundColor:
                  typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                    ? 'rgba(0,0,0,0.10)'
                    : 'rgba(255,255,255,0.12)',
              }}
            />

            {/* ── CENTER SECTION: Live Playback FAB ── */}
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                data-testid="lyrics-toolbar-live-btn"
                onClick={onLaunchLive}
                aria-label="Launch Live Playback"
                title="Launch Live"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white transition active:scale-95 cursor-pointer shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  boxShadow: `0 4px 16px ${accent.to}66, 0 0 0 1px rgba(255,255,255,0.25)`,
                }}
              >
                <span className="material-symbols-rounded text-2xl font-bold">play_arrow</span>
              </button>
            </div>

            {/* Vertical Divider */}
            <div
              className="w-[1px] h-5 mx-0.5"
              style={{
                backgroundColor:
                  typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                    ? 'rgba(0,0,0,0.10)'
                    : 'rgba(255,255,255,0.12)',
              }}
            />

            {/* ── RIGHT CLUSTER: Text Presentation & Song Details ── */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="lyrics-toolbar-text-btn"
                onClick={() => setShowTextMorph(true)}
                aria-label="Text Presentation & Formatting"
                title="Typography & Styling"
                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
                style={{
                  backgroundColor:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                  color:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? '#334155'
                      : '#cbd5e1',
                }}
              >
                <span className="material-symbols-rounded text-lg">text_fields</span>
              </button>

              {onEditDetails && (
                <button
                  type="button"
                  data-testid="lyrics-toolbar-details-btn"
                  onClick={onEditDetails}
                  aria-label="Song Details"
                  title="Song Details"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
                  style={{
                    backgroundColor:
                      typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                        ? 'rgba(0,0,0,0.04)'
                        : 'rgba(255,255,255,0.06)',
                    color:
                      typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                        ? '#334155'
                        : '#cbd5e1',
                  }}
                >
                  <span className="material-symbols-rounded text-lg">tune</span>
                </button>
              )}
            </div>
          </aside>,
          document.body
        )}

      {/* ── Morphing Section Picker (Triggered from + Menu) ── */}
      <MorphingActionSurface
        isOpen={showSectionMorph}
        onOpenChange={setShowSectionMorph}
        placement="center"
        compact
        maxWidth={240}
        title="Add Section"
        accentColor={accent.from}
        rows={[
          ...[
            { name: 'Verse', type: 'verse' },
            { name: 'Chorus', type: 'chorus' },
            { name: 'Bridge', type: 'bridge' },
            { name: 'Pre-Chorus', type: 'pre-chorus' },
            { name: 'Intro', type: 'intro' },
            { name: 'Outro', type: 'outro' },
            { name: 'Solo', type: 'solo' },
            { name: 'Interlude', type: 'interlude' },
          ].map((sec) => ({
            id: sec.name.toLowerCase(),
            label: sec.name,
            icon: 'layers',
            onPress: () => {
              handleAddSection(sec.name, sec.type);
            },
          })),
          {
            id: 'custom',
            label: 'Custom...',
            icon: 'edit',
            onPress: () => {
              const name = window.prompt('Section name:');
              if (name && name.trim()) {
                handleAddSection(name.trim(), 'custom');
              }
            },
          },
        ]}
      />

      {/* ── Morphing Text Formatting Surface ── */}
      <MorphingActionSurface
        isOpen={showTextMorph}
        onOpenChange={setShowTextMorph}
        placement="center"
        maxWidth={340}
        title="Text Presentation"
        subtitle="Format lyrics display & teleprompter"
        accentColor={accent.from}
      >
        {({ close }) => (
          <div className="flex flex-col gap-4 py-1" data-purpose="lyrics-text-formatting-controls">
            {/* View Mode */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                View Mode
              </span>
              <div
                className="flex items-center p-0.5 rounded-full border shadow-2xs"
                style={{
                  backgroundColor: 'var(--surface-container-low, rgba(0, 0, 0, 0.04))',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                <button
                  type="button"
                  data-testid="text-mode-lyrics"
                  onClick={() => setDisplayMode('lyrics')}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
                  style={{
                    backgroundColor: displayMode === 'lyrics' ? accent.from : 'transparent',
                    color: displayMode === 'lyrics' ? '#ffffff' : 'var(--c-text-muted, #8A92A6)',
                  }}
                >
                  Lyrics
                </button>
                <button
                  type="button"
                  data-testid="text-mode-chords-lyrics"
                  onClick={() => setDisplayMode('chords_lyrics')}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
                  style={{
                    backgroundColor: displayMode === 'chords_lyrics' ? accent.from : 'transparent',
                    color: displayMode === 'chords_lyrics' ? '#ffffff' : 'var(--c-text-muted, #8A92A6)',
                  }}
                >
                  Chords + Lyrics
                </button>
              </div>
            </div>

            {/* Font Size & Bold Stepper */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                Size & Weight
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center border rounded-xl overflow-hidden shadow-2xs"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                >
                  <button
                    type="button"
                    data-testid="text-size-decrease"
                    onClick={() => handleUpdateFormatting({ fontSize: Math.max(14, fontSize - 2) })}
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span
                    className="text-xs font-extrabold w-10 text-center select-none"
                    style={{ color: accent.from }}
                  >
                    {fontSize}px
                  </span>
                  <button
                    type="button"
                    data-testid="text-size-increase"
                    onClick={() => handleUpdateFormatting({ fontSize: Math.min(32, fontSize + 2) })}
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                {/* Bold Toggle Button */}
                <button
                  type="button"
                  data-testid="text-bold-toggle"
                  onClick={() => handleUpdateFormatting({ bold: !isBold })}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: isBold ? `${accent.from}18` : 'var(--surface-card-bg, #ffffff)',
                    borderColor: isBold ? accent.from : 'var(--c-border, #E3E6EB)',
                    color: isBold ? accent.from : 'var(--c-text-secondary, #6B7280)',
                  }}
                  title="Toggle bold lyrics"
                >
                  B
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                Line Spacing
              </span>
              <div
                className="flex items-center p-0.5 rounded-full border shadow-2xs"
                style={{
                  backgroundColor: 'var(--surface-container-low, rgba(0, 0, 0, 0.04))',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                {[
                  { label: 'Compact', val: 1.4 },
                  { label: 'Normal', val: 1.6 },
                  { label: 'Relaxed', val: 1.9 },
                ].map((sp) => {
                  const isActive = Math.abs(lineSpacing - sp.val) < 0.1;
                  return (
                    <button
                      key={sp.label}
                      type="button"
                      data-testid={`spacing-${sp.label.toLowerCase()}`}
                      onClick={() => handleUpdateFormatting({ lineSpacing: sp.val })}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer"
                      style={{
                        backgroundColor: isActive ? accent.from : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--c-text-muted, #8A92A6)',
                      }}
                    >
                      {sp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette */}
            <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: 'var(--c-border, #E3E6EB)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                  Text Color
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                  {textColor === 'default' ? 'Theme Default' : textColor}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 py-1">
                {[
                  { name: 'Default', hex: 'default' },
                  { name: 'Gold', hex: '#F59E0B' },
                  { name: 'Sky', hex: '#0284C7' },
                  { name: 'Emerald', hex: '#059669' },
                  { name: 'Rose', hex: '#E11D48' },
                  { name: 'Violet', hex: '#7C3AED' },
                ].map((col) => {
                  const isCurrent = textColor === col.hex;
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      data-testid={`color-${col.name.toLowerCase()}`}
                      onClick={() => handleUpdateFormatting({ defaultColor: col.hex })}
                      className="w-7 h-7 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: col.hex === 'default' ? 'var(--c-text-primary, #111827)' : col.hex,
                        boxShadow: isCurrent
                          ? `0 0 0 2px var(--surface-card-bg, #ffffff), 0 0 0 4px ${col.hex === 'default' ? 'var(--c-text-primary, #111827)' : col.hex}`
                          : 'none',
                        border: '1px solid rgba(0,0,0,0.12)',
                      }}
                      title={col.name}
                    >
                      {isCurrent && (
                        <span
                          className="material-symbols-rounded text-sm"
                          style={{ color: col.hex === 'default' ? 'var(--surface-card-bg, #ffffff)' : '#FFFFFF' }}
                        >
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </MorphingActionSurface>

      {/* ── Vocal Role Picker Dialog ── */}
      <AnimatePresence>
        {selectedSectionForRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSectionForRole(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm p-5 rounded-2xl border shadow-2xl flex flex-col gap-3 z-10"
              style={{
                backgroundColor: 'var(--surface-dialog-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--c-text-primary)' }}>
                  Assign Vocal Role
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSectionForRole(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-black cursor-pointer"
                >
                  <span className="material-symbols-rounded text-lg">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                {availableVocalRoles.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => handleSetSectionVocalRole(selectedSectionForRole, role)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors active:scale-95 cursor-pointer hover:bg-neutral-100"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                      <span>{role.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      {role.type}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleSetSectionVocalRole(selectedSectionForRole, undefined)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 active:scale-95 transition-colors cursor-pointer mt-1"
                >
                  <span className="material-symbols-rounded text-base">clear</span>
                  <span>Remove Role</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
