import React, { useRef, useEffect } from 'react';
import { useSettingsStore, useT } from '@workspace/livex-core';

export interface StageHistoryItem {
  index: number;
  label: string;
  time?: number;
}

export interface StageHistorySurfaceProps {
  onClose: () => void;
  historyEntries?: StageHistoryItem[];
  currentIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onJumpToHistory?: (index: number) => void;
  isLight: boolean;
  isAmoled: boolean;
  isSpanish?: boolean;
}

export const StageHistorySurface: React.FC<StageHistorySurfaceProps> = ({
  onClose,
  historyEntries = [],
  currentIndex = -1,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onJumpToHistory,
  isLight,
  isSpanish: isSpanishProp,
}) => {
  const t = useT();
  const tr = t as any;
  const settingsLang = useSettingsStore((s) => s.settings.language);
  const isSpanish =
    isSpanishProp !== undefined
      ? isSpanishProp
      : settingsLang === 'es' || tr.nav?.stagexStage === 'Escenario';
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active history card into view
  useEffect(() => {
    if (historyContainerRef.current && currentIndex >= 0) {
      const activeEl = historyContainerRef.current.querySelector<HTMLElement>(
        `[data-testid="history-item-${currentIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const totalSteps = Math.max(historyEntries.length, 1);
  const currentStep = currentIndex >= 0 ? currentIndex + 1 : 1;
  const stepText = isSpanish
    ? `Paso ${currentStep} de ${totalSteps}`
    : `Step ${currentStep} of ${totalSteps}`;

  return (
    <div
      data-testid="stagex-history-surface"
      className="flex flex-col w-full"
      style={{
        transition: 'opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header: Title + Step Badge (Left) & Secondary Undo/Redo Pill + Close (Right) */}
      <div className="flex items-center justify-between gap-3 pb-2.5">
        {/* Left: Stagex History Title & Step Counter */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: isLight ? 'rgba(236, 72, 153, 0.12)' : 'rgba(236, 72, 153, 0.18)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
            }}
          >
            <span className="material-symbols-outlined text-[16px] text-pink-500">
              history
            </span>
          </div>
          <span
            data-testid="stagex-history-title"
            className="text-[13px] font-bold tracking-tight whitespace-nowrap"
            style={{
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-display)',
            }}
          >
            {isSpanish ? 'Historial de Escenario' : 'Stage History'}
          </span>
          <span
            data-testid="stagex-history-step-badge"
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'var(--app-surface-low)',
              color: 'var(--c-text-secondary)',
              border: '1px solid var(--c-border)',
            }}
          >
            {stepText}
          </span>
        </div>

        {/* Right: Grouped Undo/Redo Pill & Close Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Segmented Undo/Redo Pill */}
          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              background: 'var(--app-surface-low)',
              border: '1px solid var(--c-border)',
            }}
          >
            {/* Undo Button */}
            <button
              type="button"
              data-testid="stagex-panel-undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              style={{
                color: canUndo ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
                opacity: canUndo ? 1 : 0.35,
              }}
              title={isSpanish ? 'Deshacer (Ctrl+Z)' : 'Undo'}
              aria-label={isSpanish ? 'Deshacer' : 'Undo'}
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
            </button>

            <div
              className="w-[1px] h-3.5 mx-0.5"
              style={{ background: 'var(--c-border)' }}
            />

            {/* Redo Button */}
            <button
              type="button"
              data-testid="stagex-panel-redo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              style={{
                color: canRedo ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
                opacity: canRedo ? 1 : 0.35,
              }}
              title={isSpanish ? 'Rehacer (Ctrl+Y)' : 'Redo'}
              aria-label={isSpanish ? 'Rehacer' : 'Redo'}
            >
              <span className="material-symbols-outlined text-[16px]">redo</span>
            </button>
          </div>

          {/* Dedicated Close Button */}
          <button
            type="button"
            data-testid="stagex-history-close-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-all"
            style={{
              background: 'var(--app-surface-low)',
              color: 'var(--c-text-secondary)',
              border: '1px solid var(--c-border)',
            }}
            aria-label={isSpanish ? 'Cerrar panel de historial' : 'Close History Panel'}
            title={isSpanish ? 'Cerrar' : 'Close'}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* History Content Area */}
      {historyEntries.length === 0 ? (
        <div
          data-testid="stagex-history-empty"
          className="w-full flex flex-col items-center justify-center py-6 gap-1.5 text-center"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <span className="material-symbols-outlined text-[24px] opacity-40">
            history_toggle_off
          </span>
          <span className="text-[11px] font-medium">
            {isSpanish ? 'No hay acciones registradas aún' : 'No history recorded yet'}
          </span>
        </div>
      ) : historyEntries.length === 1 ? (
        /* Single Entry Layout: Dedicated card eliminating awkward void */
        <div className="w-full pt-1 pb-0.5">
          {(() => {
            const entry = historyEntries[0];
            const timeStr = entry.time
              ? new Date(entry.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div
                data-testid={`history-item-${entry.index}`}
                className="w-full flex items-center justify-between p-3 rounded-2xl transition-all"
                style={{
                  background: isLight
                    ? 'rgba(236, 72, 153, 0.08)'
                    : 'rgba(236, 72, 153, 0.14)',
                  border: '1.5px solid #ec4899',
                  boxShadow: '0 0 16px rgba(236, 72, 153, 0.15)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: '#ec4899',
                      color: '#ffffff',
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded"
                        style={{
                          background: '#ec4899',
                          color: '#ffffff',
                        }}
                      >
                        #1
                      </span>
                      <span
                        data-testid="stagex-history-now-badge"
                        className="text-[9px] font-black uppercase tracking-wider text-pink-500 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {isSpanish ? 'ESTADO ACTUAL' : 'CURRENT STATE'}
                      </span>
                      {timeStr && (
                        <span
                          className="text-[9px] font-medium"
                          style={{ color: 'var(--c-text-muted)' }}
                        >
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[12px] font-bold truncate mt-0.5"
                      style={{
                        color: 'var(--c-text-primary)',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {entry.label || (isSpanish ? 'Escenario Inicial' : 'Initial Stage')}
                    </span>
                    <span
                      className="text-[10px] font-normal leading-tight mt-0.5"
                      style={{ color: 'var(--c-text-muted)' }}
                    >
                      {isSpanish
                        ? 'Punto de partida del escenario. Las modificaciones posteriores aparecerán en esta línea de tiempo.'
                        : 'Stage starting point. Subsequent edits will appear in this timeline.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Multi-Entry Layout: Chronological connected timeline shelf */
        <div
          ref={historyContainerRef}
          data-testid="drawer-history-row"
          className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {historyEntries.map((entry, idx) => {
            const isCurrent = entry.index === currentIndex;
            const isPast = entry.index < currentIndex;
            const isFuture = entry.index > currentIndex;
            const timeStr = entry.time
              ? new Date(entry.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <React.Fragment key={`history-fragment-${entry.index}`}>
                {/* Arrow connector between steps */}
                {idx > 0 && (
                  <span
                    className="material-symbols-outlined text-[13px] flex-shrink-0 select-none"
                    style={{
                      color: isPast || isCurrent ? '#ec4899' : 'var(--c-text-muted)',
                      opacity: isPast || isCurrent ? 0.7 : 0.3,
                    }}
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                )}

                <button
                  type="button"
                  data-testid={`history-item-${entry.index}`}
                  onClick={() => onJumpToHistory?.(entry.index)}
                  className="flex flex-col items-start justify-between p-2 rounded-2xl transition-all active:scale-95 flex-shrink-0 cursor-pointer text-left relative"
                  style={{
                    width: '148px',
                    height: '76px',
                    background: isCurrent
                      ? isLight
                        ? 'rgba(236, 72, 153, 0.09)'
                        : 'rgba(236, 72, 153, 0.16)'
                      : isFuture
                        ? isLight
                          ? 'rgba(0, 0, 0, 0.015)'
                          : 'rgba(255, 255, 255, 0.02)'
                        : isLight
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'rgba(255, 255, 255, 0.04)',
                    border: isCurrent
                      ? '1.5px solid #ec4899'
                      : isFuture
                        ? '1px dashed var(--c-border)'
                        : '1px solid var(--c-border)',
                    boxShadow: isCurrent
                      ? '0 0 12px rgba(236, 72, 153, 0.22)'
                      : 'none',
                    opacity: isFuture ? 0.65 : 1,
                    color: 'var(--c-text-primary)',
                  }}
                  title={isSpanish ? `Ir a ${entry.label}` : `Jump to ${entry.label}`}
                >
                  {/* Top: Step Badge + Status Indicator */}
                  <div className="w-full flex items-center justify-between gap-1">
                    <span
                      className="text-[9px] font-extrabold tracking-wider uppercase px-1.5 py-0.2 rounded"
                      style={{
                        background: isCurrent
                          ? '#ec4899'
                          : 'var(--app-surface-low)',
                        color: isCurrent ? '#ffffff' : 'var(--c-text-secondary)',
                      }}
                    >
                      #{entry.index + 1}
                    </span>

                    {isCurrent && (
                      <span
                        data-testid="stagex-history-now-badge"
                        className="text-[8.5px] font-black uppercase tracking-wider text-pink-500 flex items-center gap-0.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {isSpanish ? 'ACTUAL' : 'NOW'}
                      </span>
                    )}

                    {isFuture && (
                      <span
                        className="text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-0.5"
                        style={{ color: 'var(--c-text-muted)' }}
                      >
                        <span className="material-symbols-outlined text-[10px]">redo</span>
                        {isSpanish ? 'REHACER' : 'REDO'}
                      </span>
                    )}

                    {isPast && timeStr && (
                      <span
                        className="text-[9px] font-medium"
                        style={{ color: 'var(--c-text-muted)' }}
                      >
                        {timeStr}
                      </span>
                    )}
                  </div>

                  {/* Bottom: Action Label */}
                  <span
                    className="text-[10.5px] font-bold w-full line-clamp-2 leading-snug"
                    style={{
                      color: isCurrent
                        ? 'var(--c-text-primary)'
                        : isFuture
                          ? 'var(--c-text-muted)'
                          : 'var(--c-text-secondary)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {entry.label || (isSpanish ? 'Acción' : 'Action')}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
