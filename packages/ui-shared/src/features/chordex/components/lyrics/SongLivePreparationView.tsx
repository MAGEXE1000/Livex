import React, { useState, useMemo, useCallback } from 'react';
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
} from '@workspace/livex-core';
import { toast } from 'sonner';

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
  const [showSettings, setShowSettings] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedSectionForRole, setSelectedSectionForRole] = useState<string | null>(null);

  // Available vocal roles (presets + custom saved)
  const combinedVocalRoles = useMemo(() => getCombinedVocalRoles(), []);
  const availableVocalRoles = useMemo(
    () => [...combinedVocalRoles.defaults, ...combinedVocalRoles.customs],
    [combinedVocalRoles]
  );

  // Update document formatting settings
  const handleUpdateFormatting = useCallback(
    (newFontSize: number, newLineSpacing: number) => {
      setFontSize(newFontSize);
      setLineSpacing(newLineSpacing);
      if (!lyricsDoc) return;
      const fontSizeName: 'small' | 'medium' | 'large' =
        newFontSize <= 16 ? 'small' : newFontSize >= 24 ? 'large' : 'medium';
      const lineSpacingName: 'compact' | 'normal' | 'relaxed' =
        newLineSpacing <= 1.45 ? 'compact' : newLineSpacing >= 1.8 ? 'relaxed' : 'normal';
      onUpdateLyrics({
        ...lyricsDoc,
        formatting: {
          ...lyricsDoc.formatting,
          fontSize: fontSizeName,
          lineSpacing: lineSpacingName,
        },
      });
    },
    [lyricsDoc, onUpdateLyrics]
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
      setShowPlusMenu(false);
      toast.success(`Added [${name}] section`);
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  // Check if there is any content to perform
  const hasContent = useMemo(() => {
    return (
      sections.some((s) => s.lines.some((l) => l.text.trim().length > 0 || (l.chords && l.chords.length > 0))) ||
      preset.chords.length > 0 ||
      (preset.sections ?? []).some((s) => s.chords.length > 0)
    );
  }, [sections, preset.chords, preset.sections]);

  return (
    <div
      className="flex-1 flex flex-col relative w-full h-full overflow-hidden"
      data-purpose="song-live-preparation-view"
    >
      {/* ── Top Preparation Banner ── */}
      <div
        className="flex-none px-4 py-2.5 border-b flex flex-col gap-2.5 z-20"
        style={{
          backgroundColor: 'var(--surface-header-bg, rgba(17, 18, 26, 0.95))',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Quick Action: Edit Lyrics */}
          <button
            type="button"
            onClick={onEditLyrics}
            data-testid="prep-edit-lyrics-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--surface-card-bg, #ffffff)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-primary, #111827)',
            }}
          >
            <span className="material-symbols-rounded text-sm">edit_note</span>
            <span>Edit Lyrics</span>
          </button>

          {/* Quick Action: Teleprompter Display Settings */}
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            aria-label="Teleprompter Display Settings"
            title="Teleprompter Display Settings"
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: showSettings
                ? 'var(--surface-container-high, rgba(255, 255, 255, 0.12))'
                : 'var(--surface-container-low, rgba(255, 255, 255, 0.05))',
              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              color: showSettings ? accent.from : 'var(--c-text-secondary)',
            }}
          >
            <span className="material-symbols-rounded text-base">text_fields</span>
          </button>
        </div>

        {/* ── Collapsible Teleprompter Format Settings ── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-2 border-t flex flex-col gap-2.5"
              style={{ borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))' }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                  View Mode
                </span>
                <div
                  className="flex items-center p-0.5 rounded-full border shadow-xs"
                  style={{
                    backgroundColor: 'var(--surface-container-low, rgba(255, 255, 255, 0.05))',
                    borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setDisplayMode('lyrics')}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      backgroundColor: displayMode === 'lyrics' ? accent.from : 'transparent',
                      color: displayMode === 'lyrics' ? '#ffffff' : 'var(--c-text-muted)',
                    }}
                  >
                    Lyrics only
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('chords_lyrics')}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      backgroundColor: displayMode === 'chords_lyrics' ? accent.from : 'transparent',
                      color: displayMode === 'chords_lyrics' ? '#ffffff' : 'var(--c-text-muted)',
                    }}
                  >
                    Chords + Lyrics
                  </button>
                </div>
              </div>

              {/* Font Size & Line Spacing */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                  Font Size
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateFormatting(Math.max(14, fontSize - 2), lineSpacing)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg)',
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    A-
                  </button>
                  <span className="text-xs font-bold w-7 text-center">{fontSize}px</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateFormatting(Math.min(32, fontSize + 2), lineSpacing)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg)',
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    A+
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Prepared Document Scroll Area ── */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
        }}
        data-purpose="prepared-lyrics-scroll-container"
      >
        {sections.length === 0 || sections.every((s) => s.lines.length === 0 || s.lines.every((l) => !l.text.trim())) ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
              style={{
                backgroundColor: 'var(--surface-card-bg, #1a1b24)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                color: accent.from,
              }}
            >
              <span className="material-symbols-rounded text-3xl">edit_note</span>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--c-text-primary)' }}>
              No Lyrics Composed
            </h3>
            <p className="text-xs max-w-xs mb-6 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
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
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
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
                            backgroundColor: `${accent.from}18`,
                            borderColor: `${accent.from}44`,
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
                          backgroundColor: vocalRole ? `${vocalRole.color}22` : 'var(--surface-container-low, rgba(255, 255, 255, 0.05))',
                          borderColor: vocalRole ? `${vocalRole.color}55` : 'var(--c-border, rgba(255, 255, 255, 0.1))',
                          color: vocalRole ? vocalRole.color : 'var(--c-text-muted)',
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

                      return (
                        <div key={line.id || `line-${lIdx}`} className="flex flex-col py-0.5">
                          {/* Chords placement above text */}
                          {showChords && (
                            <div
                              className="font-mono text-xs font-bold select-none h-5 flex items-center"
                              style={{ color: accent.from }}
                            >
                              {line.chords!.map((c, cIdx) => (
                                <span
                                  key={c.id || `ch-${cIdx}`}
                                  className="mr-3 px-1 rounded bg-white/5"
                                >
                                  {c.chord}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Lyric Text */}
                          <div
                            style={{
                              fontWeight: line.format?.bold ? 700 : 400,
                              color: line.format?.color || lyricsDoc?.formatting?.defaultColor || 'var(--c-text-primary, #ffffff)',
                            }}
                          >
                            {line.text || '\u00A0'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                backgroundColor: 'var(--surface-dialog-bg, #1a1b23)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--c-text-primary)' }}>
                  Assign Vocal Role
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSectionForRole(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
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
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors active:scale-95 cursor-pointer hover:bg-white/10"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-colors cursor-pointer mt-1"
                >
                  <span className="material-symbols-rounded text-base">clear</span>
                  <span>Remove Role</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Minimal Floating [ + ] Action (Bottom Right) ── */}
      <div
        className="fixed right-4 z-40"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
        }}
      >
        <AnimatePresence>
          {showPlusMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-14 mb-2 p-1.5 rounded-2xl border shadow-xl flex flex-col gap-1 min-w-[160px]"
              style={{
                backgroundColor: 'var(--surface-dialog-bg, #1a1b23)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--c-text-muted, #8A92A6)' }}
              >
                Add Section
              </div>
              {LYRIC_SECTION_TYPES.slice(0, 5).map((sec) => (
                <button
                  key={sec.type}
                  type="button"
                  onClick={() => handleAddSection(sec.defaultName, sec.type)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors active:scale-95 cursor-pointer hover:bg-white/10"
                  style={{ color: 'var(--c-text-primary, #ffffff)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accent.from }}
                  />
                  <span>{sec.defaultName}</span>
                </button>
              ))}

              <div
                className="my-1 border-t"
                style={{ borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))' }}
              />

              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onEditLyrics();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-left text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-colors cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">edit_note</span>
                <span>Open in Composer</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowPlusMenu((prev) => !prev)}
          aria-label="Add Section or Edit"
          title="Add Section or Edit"
          className="w-12 h-12 rounded-full border shadow-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
          style={{
            backgroundColor: 'var(--surface-card-bg, #1c1d27)',
            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.15))',
            color: accent.from,
            boxShadow: showPlusMenu
              ? `0 4px 16px ${accent.from}44`
              : '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <span
            className="material-symbols-rounded text-2xl transition-transform"
            style={{
              transform: showPlusMenu ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            add
          </span>
        </button>
      </div>
    </div>
  );
};
