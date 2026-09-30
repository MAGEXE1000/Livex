import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  type SongPreset,
  type SongLyricsDocument,
  type SongLyricSection,
  type SongLyricLine,
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

  const [isEditing, setIsEditing] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
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

  // Insert explicit timed silence / interlude
  const handleAddInterludeLine = useCallback(
    (sectionId?: string) => {
      if (!lyricsDoc) return;
      const targetSectionId = sectionId || (sections.length > 0 ? sections[sections.length - 1].id : null);
      if (!targetSectionId) {
        const newSec: SongLyricSection = {
          id: generateLyricId('sec'),
          name: 'Interlude',
          type: 'interlude',
          lines: [
            {
              id: generateLyricId('line'),
              type: 'interlude',
              text: '(Solo)',
              explicitDurationMs: 15000,
            },
          ],
        };
        onUpdateLyrics({
          ...lyricsDoc,
          sections: [newSec],
        });
        toast.success('Added 15s Timed Interlude');
        return;
      }

      const nextSections = sections.map((sec) => {
        if (sec.id !== targetSectionId) return sec;
        const newLine: SongLyricLine = {
          id: generateLyricId('line'),
          type: 'interlude',
          text: '(Solo)',
          explicitDurationMs: 15000,
        };
        return {
          ...sec,
          lines: [...sec.lines, newLine],
        };
      });

      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
      toast.success('Added 15s Timed Interlude');
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleUpdateInterludeDuration = useCallback(
    (sectionId: string, lineId: string, durationSec: number) => {
      if (!lyricsDoc) return;
      const clampedSec = Math.max(1, Math.min(600, durationSec));
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== lineId) return l;
            return {
              ...l,
              type: 'interlude' as const,
              explicitDurationMs: clampedSec * 1000,
            };
          }),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleUpdateInterludeLabel = useCallback(
    (sectionId: string, lineId: string, text: string) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== lineId) return l;
            return {
              ...l,
              text,
            };
          }),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleDeleteLine = useCallback(
    (sectionId: string, lineId: string) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.filter((l) => l.id !== lineId),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
      toast.success('Line removed');
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
                    if (line.type === 'interlude') {
                      const durSec = Math.round((line.explicitDurationMs || 15000) / 1000);
                      return (
                        <div
                          key={line.id || `interlude-${lIdx}`}
                          data-testid={`interlude-line-${lIdx}`}
                          className="w-full my-2 p-3.5 rounded-2xl border flex flex-col gap-2 transition-all"
                          style={{
                            backgroundColor: 'var(--surface-card-bg, #ffffff)',
                            borderColor: `${accent.from}33`,
                            boxShadow: 'var(--shadow-soft-card, none)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{
                                  backgroundColor: `${accent.from}18`,
                                  color: accent.from,
                                }}
                              >
                                <span className="material-symbols-rounded text-lg">hourglass_bottom</span>
                              </div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={line.text || '(Solo)'}
                                  onChange={(e) => handleUpdateInterludeLabel(section.id, line.id, e.target.value)}
                                  className="px-2 py-1 rounded-lg text-sm font-bold border outline-none"
                                  style={{
                                    backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                    borderColor: 'var(--c-border, #E3E6EB)',
                                    color: 'var(--c-text-primary, #111827)',
                                    fontFamily: 'var(--font-headline)',
                                  }}
                                  placeholder="(Solo)"
                                />
                              ) : (
                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    fontFamily: 'var(--font-headline)',
                                    color: 'var(--c-text-primary, #111827)',
                                  }}
                                >
                                  {line.text || '(Solo)'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono text-xs font-black px-2.5 py-1 rounded-full border"
                                style={{
                                  backgroundColor: `${accent.from}18`,
                                  borderColor: `${accent.from}44`,
                                  color: accent.from,
                                }}
                              >
                                {durSec}s
                              </span>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLine(section.id, line.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer"
                                  title="Delete interlude"
                                >
                                  <span className="material-symbols-rounded text-base">delete</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--c-border, #E3E6EB)' }}>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterludeDuration(section.id, line.id, Math.max(1, durSec - 1))}
                                  className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border active:scale-90 transition-all cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                    borderColor: 'var(--c-border, #E3E6EB)',
                                    color: 'var(--c-text-primary, #111827)',
                                  }}
                                  title="Decrease 1s"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold px-1">{durSec}s</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterludeDuration(section.id, line.id, Math.min(600, durSec + 1))}
                                  className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border active:scale-90 transition-all cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                    borderColor: 'var(--c-border, #E3E6EB)',
                                    color: 'var(--c-text-primary, #111827)',
                                  }}
                                  title="Increase 1s"
                                >
                                  +
                                </button>
                              </div>

                              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                {[5, 10, 15, 20, 30, 45, 60].map((presetSec) => (
                                  <button
                                    key={presetSec}
                                    type="button"
                                    onClick={() => handleUpdateInterludeDuration(section.id, line.id, presetSec)}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                                    style={{
                                      backgroundColor: durSec === presetSec ? accent.from : 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                      color: durSec === presetSec ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                                      border: '1px solid var(--c-border, #E3E6EB)',
                                    }}
                                  >
                                    {presetSec}s
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

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

      {/* ── Floating Controls: View Mode Floating Edit FAB / Edit Mode Action Dock ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          !isEditing ? (
            <button
              type="button"
              data-testid="lyrics-floating-edit-btn"
              onClick={() => setIsEditing(true)}
              style={{
                position: 'fixed',
                bottom: 'calc(max(20px, env(safe-area-inset-bottom, 20px)) + 16px)',
                right: '20px',
                zIndex: 50,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'var(--surface-topbar-bg, rgba(20, 20, 24, 0.9))',
                border: 'var(--surface-topbar-border, 1px solid rgba(255, 255, 255, 0.15))',
                backdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
                WebkitBackdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
                boxShadow: 'var(--surface-topbar-shadow, 0 8px 32px rgba(0, 0, 0, 0.45))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-primary, #ffffff)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerCancel={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Edit Lyrics"
              aria-label="Edit Lyrics"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                edit
              </span>
            </button>
          ) : (
            <aside
              aria-label="Song Lyrics edit toolbar"
              data-testid="lyrics-editing-bottom-dock"
              data-purpose="lyrics-editing-bottom-dock"
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto select-none"
              style={{
                position: 'fixed',
                bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
                left: '50%',
                transform: 'translateX(-50%) translateZ(0)',
                willChange: 'transform, backdrop-filter',
                zIndex: 45,
                width: 'fit-content',
                maxWidth: 'calc(100vw - 32px)',
                backgroundColor: 'var(--surface-float-bg, rgba(20, 20, 26, 0.85))',
                borderColor: 'var(--surface-topbar-border, rgba(255, 255, 255, 0.15))',
                boxShadow: 'var(--surface-topbar-shadow, 0 10px 30px rgba(0, 0, 0, 0.45))',
                backdropFilter: 'var(--surface-topbar-backdrop)',
                WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
                pointerEvents: 'auto',
              }}
            >
              {/* Exit Edit Mode (Done) */}
              <button
                type="button"
                data-testid="lyrics-edit-done-btn"
                onClick={() => setIsEditing(false)}
                className="px-3.5 h-9 rounded-full flex items-center justify-center gap-1.5 font-bold text-xs transition active:scale-90 cursor-pointer"
                style={{
                  backgroundColor: `${accent.from}22`,
                  border: `1px solid ${accent.from}44`,
                  color: accent.from,
                }}
              >
                <span className="material-symbols-rounded text-base">check</span>
                <span>Done</span>
              </button>

              {/* Divider */}
              <div
                className="w-[1px] h-5 mx-0.5"
                style={{
                  backgroundColor:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? 'rgba(0,0,0,0.10)'
                      : 'rgba(255,255,255,0.12)',
                }}
              />

              {/* Unified + Action Button */}
              <button
                type="button"
                data-testid="lyrics-edit-unified-add-btn"
                onClick={() => setShowAddMenu(true)}
                aria-label="Add to Lyrics"
                title="Add Options"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition active:scale-95 cursor-pointer shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  boxShadow: `0 4px 16px ${accent.to}66, 0 0 0 1px rgba(255,255,255,0.25)`,
                }}
              >
                <span className="material-symbols-rounded text-2xl font-bold">add</span>
              </button>

              {/* Divider */}
              <div
                className="w-[1px] h-5 mx-0.5"
                style={{
                  backgroundColor:
                    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
                      ? 'rgba(0,0,0,0.10)'
                      : 'rgba(255,255,255,0.12)',
                }}
              />

              {/* Text Presentation / Typography Button */}
              <button
                type="button"
                data-testid="lyrics-toolbar-text-btn"
                onClick={() => setShowTextMorph(true)}
                aria-label="Text Presentation & Formatting"
                title="Typography & Styling"
                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer"
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
            </aside>
          ),
          document.body
        )}

      {/* ── Unified "+" Options Menu (Add Lyrics, Add Section, Add Timed Interlude, Text Styling) ── */}
      <MorphingActionSurface
        isOpen={showAddMenu}
        onOpenChange={setShowAddMenu}
        placement="center"
        compact
        maxWidth={260}
        title="Add to Lyrics"
        accentColor={accent.from}
        rows={[
          {
            id: 'add-lyrics',
            label: 'Add Lyrics',
            icon: 'draw',
            sublabel: 'Open lyric composer',
            onPress: () => {
              setShowAddMenu(false);
              onEditLyrics();
            },
          },
          {
            id: 'add-section',
            label: 'Add Section',
            icon: 'layers',
            sublabel: 'Verse, Chorus, Bridge...',
            onPress: () => {
              setShowAddMenu(false);
              setShowSectionMorph(true);
            },
          },
          {
            id: 'add-interlude',
            label: 'Add Timed Interlude',
            icon: 'timer',
            sublabel: 'Timed silence / solo (e.g. 15s)',
            onPress: () => {
              setShowAddMenu(false);
              handleAddInterludeLine();
            },
          },
          {
            id: 'text-styling',
            label: 'Text Styling',
            icon: 'format_size',
            sublabel: 'Font size, spacing, colors',
            onPress: () => {
              setShowAddMenu(false);
              setShowTextMorph(true);
            },
          },
        ]}
      />

      {/* ── Morphing Section Picker (With proper section icons) ── */}
      <MorphingActionSurface
        isOpen={showSectionMorph}
        onOpenChange={setShowSectionMorph}
        placement="center"
        compact
        maxWidth={260}
        title="Add Section"
        accentColor={accent.from}
        rows={[
          { id: 'verse', label: 'Verse', icon: 'queue_music', onPress: () => handleAddSection('Verse', 'verse') },
          { id: 'chorus', label: 'Chorus', icon: 'music_note', onPress: () => handleAddSection('Chorus', 'chorus') },
          { id: 'bridge', label: 'Bridge', icon: 'linear_scale', onPress: () => handleAddSection('Bridge', 'bridge') },
          { id: 'pre-chorus', label: 'Pre-Chorus', icon: 'graphic_eq', onPress: () => handleAddSection('Pre-Chorus', 'pre-chorus') },
          { id: 'intro', label: 'Intro', icon: 'play_arrow', onPress: () => handleAddSection('Intro', 'intro') },
          { id: 'outro', label: 'Outro', icon: 'stop', onPress: () => handleAddSection('Outro', 'outro') },
          { id: 'solo', label: 'Solo', icon: 'timer', onPress: () => handleAddSection('Solo', 'solo') },
          { id: 'interlude', label: 'Interlude', icon: 'hourglass_bottom', onPress: () => handleAddSection('Interlude', 'interlude') },
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
