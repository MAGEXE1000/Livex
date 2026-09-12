import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore, BackDispatcher } from '@workspace/studio-core';
import { activeOverlaysRegistry } from '../../../../shared/design-system/dialogs';

export interface SaveFilenameModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (fileName: string) => Promise<void> | void;
  defaultFileName: string;
  activeSectionsCount: number;
  totalSectionsCount?: number;
  isSaving?: boolean;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const SaveFilenameModal: React.FC<SaveFilenameModalProps> = ({
  open,
  onClose,
  onSave,
  defaultFileName,
  activeSectionsCount,
  totalSectionsCount = 7,
  isSaving = false,
  isLight = false,
  isAmoled = false,
}) => {
  const language = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = language === 'es';
  const [fileName, setFileName] = useState(defaultFileName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync default file name when opened
  useEffect(() => {
    if (open) {
      setFileName(defaultFileName);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [open, defaultFileName]);

  useEffect(() => {
    if (!open) return undefined;
    const id = 'stagex:save-filename-modal';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      if (!isSaving) {
        onClose();
      }
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [open, isSaving, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSaving, onClose]);

  // Real-time illegal character sanitization [\\/:*?"<>|]
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/[\\/:*?"<>|]/g, '');
    setFileName(sanitized);
  };

  const handleConfirm = () => {
    const finalName = fileName.trim() || defaultFileName;
    onSave(finalName);
  };

  // Theming tokens
  const bgCard = isLight
    ? 'rgba(255, 255, 255, 0.98)'
    : isAmoled
      ? 'rgba(10, 10, 14, 0.98)'
      : 'rgba(24, 24, 30, 0.96)';
  const borderCol = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
  const textPrimary = isLight ? '#09090b' : '#ffffff';
  const textSecondary = isLight ? '#52525b' : '#d4d4d8';
  const textDim = isLight ? '#a1a1aa' : '#71717a';
  const inputBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';

  return (
    <AnimatePresence>
      {open && (
        <div
          data-testid="save-filename-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isSaving) onClose();
            }}
          />

          {/* Modal Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-6 flex flex-col gap-5"
            style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              boxShadow: isLight
                ? '0 20px 48px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)'
                : '0 24px 60px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-500">
                  {isSpanish ? 'Guardar en Descargas' : 'Save to Downloads'}
                </span>
                <h3
                  className="text-lg font-bold tracking-tight"
                  style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                >
                  {isSpanish ? 'Exportar Documento de Producción' : 'Export Production Document'}
                </h3>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-75 disabled:opacity-30"
                style={{
                  color: textDim,
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                }}
                aria-label={isSpanish ? 'Cerrar diálogo' : 'Close dialog'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scope / Section Details */}
            <div
              className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs font-medium"
              style={{
                backgroundColor: isLight ? 'rgba(37, 99, 235, 0.04)' : 'rgba(37, 99, 235, 0.08)',
                borderColor: isLight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.25)',
                color: textSecondary,
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>
                  {isSpanish
                    ? 'Formato: PDF Vectorial (Listo para Imprimir A4)'
                    : 'Format: Vector PDF (A4 Print-Ready)'}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-blue-500">
                {isSpanish
                  ? `${activeSectionsCount} de ${totalSectionsCount} Secciones`
                  : `${activeSectionsCount} of ${totalSectionsCount} Sections`}
              </span>
            </div>

            {/* Filename Input Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="production-doc-filename-input"
                className="text-[11px] font-bold tracking-wide uppercase"
                style={{ color: textDim }}
              >
                {isSpanish ? 'Nombre de archivo' : 'Filename'}
              </label>

              <div
                className="flex items-center rounded-xl border overflow-hidden px-3 py-2 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderCol,
                }}
              >
                <input
                  id="production-doc-filename-input"
                  ref={inputRef}
                  type="text"
                  value={fileName}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSaving) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  disabled={isSaving}
                  maxLength={96}
                  data-testid="save-filename-input"
                  className="flex-1 bg-transparent text-sm font-semibold outline-none border-none p-0"
                  style={{ color: textPrimary }}
                  placeholder={isSpanish ? 'Nombre_del_documento' : 'Document_Name'}
                />
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded ml-2 select-none"
                  style={{
                    backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                    color: textDim,
                  }}
                >
                  .pdf
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {isSpanish
                  ? 'Los caracteres no válidos (\\ / : * ? " < > |) se eliminan automáticamente'
                  : 'Illegal characters (\\ / : * ? " < > |) are automatically removed'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                data-testid="save-modal-cancel-btn"
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:opacity-80 active:scale-95 disabled:opacity-40"
                style={{
                  color: textSecondary,
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving || !fileName.trim()}
                data-testid="save-modal-confirm-btn"
                className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                style={{
                  backgroundColor: '#2563eb',
                }}
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>{isSpanish ? 'Guardando...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>{isSpanish ? 'Guardar PDF' : 'Save PDF'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
