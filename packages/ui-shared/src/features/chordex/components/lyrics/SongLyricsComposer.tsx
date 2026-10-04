import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useBackHandler,
  continuousTextToLyricsDocument,
  lyricsDocumentToContinuousText,
  type SongLyricsDocument,
  type StandardLyricSectionType,
} from '@workspace/livex-core';
import { toast } from 'sonner';

export interface SongLyricsComposerProps {
  initialTitle?: string;
  initialLyrics?: SongLyricsDocument;
  onSave: (result: { title: string; lyrics: SongLyricsDocument }) => void;
  onClose: () => void;
  accent: { from: string; to: string; mid?: string };
}

const SECTION_SHORTCUTS: { label: string; type: StandardLyricSectionType; insertText: string }[] = [
  { label: 'Verse', type: 'verse', insertText: '[Verse]\n' },
  { label: 'Chorus', type: 'chorus', insertText: '[Chorus]\n' },
  { label: 'Pre-Chorus', type: 'pre-chorus', insertText: '[Pre-Chorus]\n' },
  { label: 'Bridge', type: 'bridge', insertText: '[Bridge]\n' },
  { label: 'Intro', type: 'intro', insertText: '[Intro]\n' },
  { label: 'Outro', type: 'outro', insertText: '[Outro]\n' },
];

export const SongLyricsComposer: React.FC<SongLyricsComposerProps> = ({
  initialTitle = '',
  initialLyrics,
  onSave,
  onClose,
  accent,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(() => lyricsDocumentToContinuousText(initialLyrics, false));
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextRef = useRef(text);
  const initialTitleRef = useRef(title);

  const isDirty = text !== initialTextRef.current || title !== initialTitleRef.current;

  // Auto-focus textarea or title on mount
  useEffect(() => {
    if (!initialTitle.trim()) {
      // If brand new without title, focus title field
      const titleInput = document.getElementById('composer-title-input');
      if (titleInput) {
        titleInput.focus();
        return;
      }
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [initialTitle]);

  // Back handling (Android back or gesture)
  const handleAttemptClose = useCallback(() => {
    if (isDirty && (text.trim().length > 0 || title.trim().length > 0)) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, text, title, onClose]);

  useBackHandler('nested', () => {
    if (showDiscardConfirm) {
      setShowDiscardConfirm(false);
      return true;
    }
    if (showSectionMenu) {
      setShowSectionMenu(false);
      return true;
    }
    handleAttemptClose();
    return true;
  }, [showDiscardConfirm, showSectionMenu, handleAttemptClose]);

  // Handle Save / Done
  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const finalTitle = trimmedTitle || 'Untitled Song';
    const parsedDoc = continuousTextToLyricsDocument(text, initialLyrics);

    onSave({
      title: finalTitle,
      lyrics: parsedDoc,
    });
    toast.success('Lyrics saved');
  }, [title, text, initialLyrics, onSave]);

  // Insert section marker at cursor position
  const handleInsertSection = useCallback((insertSnippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev ? `${prev}\n\n${insertSnippet}` : insertSnippet);
      setShowSectionMenu(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    // Determine if we need leading newlines
    let prefix = '';
    if (start > 0 && currentVal[start - 1] !== '\n') {
      prefix = '\n\n';
    } else if (start > 1 && currentVal[start - 2] !== '\n') {
      prefix = '\n';
    }

    const nextText = currentVal.slice(0, start) + prefix + insertSnippet + currentVal.slice(end);
    setText(nextText);
    setShowSectionMenu(false);

    // Re-focus and set cursor position right after insertion
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + prefix.length + insertSnippet.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  }, []);

  // Compute word and line stats
  const lineCount = text ? text.split('\n').length : 0;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col pointer-events-auto"
      style={{
        backgroundColor: 'var(--app-bg, #0b0c10)',
        color: 'var(--c-text-primary, #ffffff)',
      }}
      data-purpose="song-lyrics-composer"
    >
      {/* ── Top Bar ── */}
      <header
        className="flex-none flex items-center justify-between px-3 sm:px-5 gap-3 border-b z-20"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          paddingBottom: '8px',
          minHeight: 'calc(env(safe-area-inset-top, 0px) + 56px)',
          backgroundColor: 'var(--surface-header-bg, rgba(16, 17, 24, 0.95))',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        {/* Left: Close / Back Button */}
        <button
          type="button"
          onClick={handleAttemptClose}
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface-container-low, rgba(255, 255, 255, 0.06))',
            color: 'var(--c-text-primary, #ffffff)',
          }}
        >
          <span className="material-symbols-rounded text-xl">arrow_back</span>
        </button>

        {/* Center: Song Title Input */}
        <div className="flex-1 min-w-0 flex items-center">
          <input
            id="composer-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title..."
            className="w-full bg-transparent border-none outline-none text-base sm:text-lg font-bold truncate placeholder:text-neutral-500"
            style={{
              fontFamily: 'var(--font-headline, system-ui, sans-serif)',
              color: 'var(--c-text-primary, #ffffff)',
            }}
          />
        </div>

        {/* Right: Done / Save Button */}
        <button
          type="button"
          onClick={handleSave}
          data-testid="composer-done-btn"
          className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            boxShadow: `0 2px 10px ${accent.to}44`,
          }}
        >
          <span className="material-symbols-rounded text-base font-bold">check</span>
          <span>Done</span>
        </button>
      </header>

      {/* ── Continuous Writing Body ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <style>{`
          @keyframes lyric-caret-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.15; }
          }
          .lyrics-composer-textarea {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
            caret-color: ${accent.from || '#ffffff'} !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          .lyrics-composer-textarea:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
        `}</style>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write or paste lyrics here..."
          className="lyrics-composer-textarea w-full flex-1 p-4 sm:p-6 bg-transparent border-none outline-none resize-none leading-relaxed text-base sm:text-lg placeholder:text-neutral-600 no-scrollbar"
          style={{
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
            fontSize: '17px',
            lineHeight: 1.65,
            color: 'var(--c-text-primary, #ffffff)',
            caretColor: accent.from || '#ffffff',
            outline: 'none',
            border: 'none',
            boxShadow: 'none',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
          }}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck="false"
        />

        {/* ── Document Stats Badge (Bottom Left) ── */}
        <div
          className="absolute left-4 z-10 pointer-events-none select-none text-[11px] font-medium tracking-wide flex items-center gap-2"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            color: 'var(--c-text-muted, rgba(255, 255, 255, 0.4))',
          }}
        >
          <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          <span>•</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>

        {/* ── Minimal Floating [ + ] Action (Bottom Right) ── */}
        <div
          className="absolute right-4 z-20"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          <AnimatePresence>
            {showSectionMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 bottom-14 mb-2 p-1.5 rounded-2xl border shadow-xl flex flex-col gap-1 min-w-[150px]"
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
                  Insert Section
                </div>
                {SECTION_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleInsertSection(s.insertText)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors active:scale-95 cursor-pointer hover:bg-white/10"
                    style={{ color: 'var(--c-text-primary, #ffffff)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: accent.from }}
                    />
                    <span>{s.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setShowSectionMenu((prev) => !prev)}
            aria-label="Add Section Tag"
            title="Add Section Tag"
            className="w-12 h-12 rounded-full border shadow-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-card-bg, #1c1d27)',
              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.15))',
              color: accent.from,
              boxShadow: showSectionMenu
                ? `0 4px 16px ${accent.from}44`
                : '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span
              className="material-symbols-rounded text-2xl transition-transform"
              style={{
                transform: showSectionMenu ? 'rotate(45deg)' : 'rotate(0deg)',
              }}
            >
              add
            </span>
          </button>
        </div>
      </main>

      {/* ── Discard Changes Confirmation Modal ── */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiscardConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm p-5 rounded-2xl border shadow-2xl flex flex-col gap-4 z-10"
              style={{
                backgroundColor: 'var(--surface-dialog-bg, #1a1b23)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
              }}
            >
              <h3 className="text-base font-bold" style={{ color: 'var(--c-text-primary)' }}>
                Discard changes?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                You have unsaved lyrics. If you go back now, your recent edits will be lost.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
