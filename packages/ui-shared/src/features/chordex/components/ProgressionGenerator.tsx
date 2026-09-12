import React, { useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AnimatedActionButton from '../../../shared/animata/container/animated-border-trail';
import { Button, ButtonGroup } from '../../../shared/design-system/buttons';
import {
  KEYS,
  SCALE_TYPES,
  STYLES,
  labelKey,
  useChordStore,
  useBackHandler,
  useScrollHide,
  useT,
  useSettingsStore,
  getChordById,
  type Key,
  type ScaleType,
  type Style,
} from '@workspace/studio-core';
import { useProgressionState } from './useProgressionState';
import { PresetPickerSheet } from './ProgressionPickerSheet';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';

interface Props {
  accent: { from: string; to: string; mid: string };
  onClose: () => void;
  defaultKey?: Key;
  defaultScale?: ScaleType;
  defaultStyle?: Style;
}

export default function ProgressionGenerator({
  accent,
  onClose,
  defaultKey = 'C',
  defaultScale = 'major',
  defaultStyle = 'pop',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);
  const preferFlats = useSettingsStore((s) => s.settings.preferFlats);
  const presets = useChordStore((s) => s.presets);
  const t = useT();

  const state = useProgressionState(onClose, defaultKey, defaultScale, defaultStyle, scrollRef);
  const {
    key,
    setKey,
    scale,
    setScale,
    style,
    setStyle,
    result,
    swapOpenIdx,
    setSwapOpenIdx,
    savePromptOpen,
    setSavePromptOpen,
    progName,
    setProgName,
    presetPickerOpen,
    setPresetPickerOpen,
    presetPickerClosing,
    loadedToName,
    closing,
    activeChordIds,
    diatonic,
    handleGenerate,
    handleRegenerate,
    handleSwap,
    handleRemove,
    handleAppendDiatonic,
    handleUse,
    handleSaveConfirm,
    handleLoadToPreset,
    requestClose,
    requestClosePicker,
  } = state;

  useEffect(() => {
    if (closing) return undefined;
    const id = 'chordex:progression-generator';
    activeOverlaysRegistry.register('modal', id);
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
    };
  }, [closing]);

  useBackHandler(
    'modal',
    () => {
      if (swapOpenIdx !== null) {
        setSwapOpenIdx(null);
        return true;
      }
      if (presetPickerOpen) {
        requestClosePicker();
        return true;
      }
      if (savePromptOpen) {
        setSavePromptOpen(false);
        return true;
      }
      requestClose();
      return true;
    },
    [swapOpenIdx, savePromptOpen, presetPickerOpen, requestClose, requestClosePicker]
  );

  const keyDisplay = labelKey(key, !!preferFlats);

  const chipBase: React.CSSProperties = {
    height: 32,
    padding: '0 12px',
    borderRadius: 9999,
    fontFamily: 'var(--studio-font-body)',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 140ms',
    border: '1px solid rgba(128,128,128,0.16)',
    background: 'var(--app-surface-high)',
    color: 'var(--c-text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const chipActive: React.CSSProperties = {
    background: `${accent.from}22`,
    color: accent.from,
    border: `1px solid ${accent.from}55`,
  };

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => b.updatedAt - a.updatedAt),
    [presets]
  );

  const modalContent = (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing ? 'overlay-fade-out' : 'overlay-fade-in'}`}
      style={{
        background: 'var(--surface-modal-bg, var(--app-surface-scrim, rgba(0, 0, 0, 0.65)))',
        backdropFilter: 'var(--surface-scrim-blur, none)',
        WebkitBackdropFilter: 'var(--surface-scrim-blur, none)',
      }}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-label="Generate chord progression"
    >
      <div
        className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl ${closing ? 'sheet-exit' : 'sheet-enter'}`}
        ref={scrollRef}
        style={{
          background: 'var(--surface-dialog-bg, var(--app-surface-high, var(--c-surface-high)))',
          color: 'var(--c-text-primary)',
          border: '1px solid var(--c-border)',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px -8px rgba(0, 0, 0, 0.5), 0 8px 24px -4px rgba(0, 0, 0, 0.3)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          willChange: 'transform, opacity',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Generate Progression
            </h2>
            <p
              style={{
                fontSize: 11.5,
                color: 'var(--c-text-muted)',
                fontFamily: 'Inter',
                margin: '2px 0 0',
              }}
            >
              Built from real harmonic templates — no random chords.
            </p>
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="btn-smooth"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--app-surface-high)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-text-secondary)',
              fontSize: 18,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-2 flex flex-col gap-3">
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                margin: '0 0 6px',
              }}
            >
              Key
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KEYS.map((k) => {
                const active = k === key;
                return (
                  <button
                    key={k}
                    onClick={() => setKey(k)}
                    aria-pressed={active}
                    style={{
                      ...chipBase,
                      ...(active ? chipActive : {}),
                      height: 30,
                      padding: '0 10px',
                      minWidth: 36,
                    }}
                  >
                    {labelKey(k, !!preferFlats)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: '0 0 6px',
                }}
              >
                Scale
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCALE_TYPES.map((s) => {
                  const active = s.id === scale;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setScale(s.id)}
                      aria-pressed={active}
                      style={{ ...chipBase, ...(active ? chipActive : {}) }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: '0 0 6px',
                }}
              >
                Style
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => {
                  const active = s.id === style;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      aria-pressed={active}
                      title={s.blurb}
                      style={{ ...chipBase, ...(active ? chipActive : {}) }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-3">
          {!result ? (
            <AnimatedActionButton
              data-testid="generate-progression-btn"
              onClick={handleGenerate}
              className="btn-smooth w-full py-3 font-bold"
              trailColor={accent.to}
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                color: 'white',
                fontFamily: 'var(--studio-font-body)',
                fontSize: 14,
                boxShadow: `0 4px 20px ${accent.to}40`,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Generate Progression
            </AnimatedActionButton>
          ) : (
            <ButtonGroup size="md" variant="secondary" className="w-full">
              <Button
                data-testid="regenerate-progression-btn"
                onClick={handleRegenerate}
                variant="secondary"
                className="flex-1"
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    refresh
                  </span>
                }
              >
                Regenerate
              </Button>
              <Button
                onClick={handleGenerate}
                variant="secondary"
                isIconOnly={true}
                aria-label="New random template"
                title="New random template"
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    casino
                  </span>
                }
              />
            </ButtonGroup>
          )}
        </div>

        {result && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--c-text-muted)',
                  fontFamily: 'Inter',
                  margin: 0,
                }}
              >
                <span style={{ color: accent.from, fontWeight: 800 }}>{result.templateName}</span>
                <span style={{ opacity: 0.7 }}>
                  {`  in  `}
                  {keyDisplay} {scale === 'major' ? 'Major' : 'Minor'}
                </span>
              </p>
            </div>

            <div
              className="flex flex-wrap gap-2 p-3 rounded-2xl"
              style={{
                background: 'var(--app-surface-low)',
                border: '1px solid rgba(128,128,128,0.10)',
              }}
              data-testid="generated-progression"
            >
              {activeChordIds.map((id, i) => {
                const c = getChordById(id);
                const roman = result.romans[i] ?? '';
                const swapOpen = swapOpenIdx === i;
                return (
                  <div key={`${id}-${i}`} style={{ position: 'relative' }}>
                    <button
                      data-testid={`gen-chord-${i}`}
                      onClick={() => setSwapOpenIdx(swapOpen ? null : i)}
                      className="btn-smooth"
                      aria-label={`Edit chord ${c?.name ?? id}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px 12px',
                        minWidth: 64,
                        borderRadius: 14,
                        background: swapOpen ? `${accent.from}26` : 'var(--app-surface-high)',
                        border: swapOpen
                          ? `1px solid ${accent.from}66`
                          : '1px solid rgba(128,128,128,0.14)',
                        cursor: 'pointer',
                        transition: 'all 140ms',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: swapOpen ? accent.from : 'var(--c-text-muted)',
                          fontFamily: 'var(--studio-font-body)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                        }}
                      >
                        {roman}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: 'var(--c-text-primary)',
                          fontFamily: 'var(--studio-font-body)',
                          letterSpacing: '-0.02em',
                          marginTop: 3,
                          lineHeight: 1,
                        }}
                      >
                        {c?.name ?? id}
                      </span>
                    </button>
                    {swapOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          zIndex: 60,
                          background: 'var(--app-surface)',
                          border: '1px solid rgba(128,128,128,0.18)',
                          borderRadius: 12,
                          padding: 8,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                          backdropFilter: 'var(--surface-float-blur)',
                          WebkitBackdropFilter: 'var(--surface-float-blur)',
                          minWidth: 220,
                          animation: 'spring-in 160ms cubic-bezier(0.22,1,0.36,1)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: 'var(--c-text-muted)',
                            fontFamily: 'var(--studio-font-body)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            margin: '0 0 6px',
                            padding: '0 4px',
                          }}
                        >
                          Swap with diatonic chord
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {diatonic.map((d) => {
                            const dc = getChordById(d.chordId);
                            const same = d.chordId === id;
                            return (
                              <button
                                key={d.chordId}
                                onClick={() => handleSwap(i, d.chordId)}
                                className="btn-smooth"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: same ? `${accent.from}22` : 'rgba(128,128,128,0.08)',
                                  border: same
                                    ? `1px solid ${accent.from}44`
                                    : '1px solid rgba(128,128,128,0.14)',
                                  color: same ? accent.from : 'var(--c-text-primary)',
                                  fontFamily: 'var(--studio-font-body)',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 1,
                                  lineHeight: 1.1,
                                }}
                              >
                                <span style={{ fontSize: 8.5, opacity: 0.8 }}>{d.roman}</span>
                                <span>{dc?.name ?? d.chordId}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            height: 1,
                            background: 'rgba(128,128,128,0.14)',
                            margin: '6px -4px',
                          }}
                        />
                        <button
                          onClick={() => handleRemove(i)}
                          className="btn-smooth w-full"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#f87171',
                            fontFamily: 'var(--studio-font-body)',
                            fontWeight: 700,
                            fontSize: 11,
                            textAlign: 'left',
                          }}
                        >
                          Remove this chord
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={handleAppendDiatonic}
                aria-label="Add chord"
                className="btn-smooth"
                style={{
                  padding: '8px 12px',
                  minWidth: 44,
                  borderRadius: 14,
                  background: 'transparent',
                  border: '1px dashed rgba(128,128,128,0.30)',
                  color: 'var(--c-text-muted)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                data-testid="use-progression-btn"
                onClick={handleUse}
                disabled={!activeChordIds.length}
                style={{
                  flex: 1,
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  color: 'white',
                  borderRadius: 9999,
                  boxShadow: `0 4px 20px ${accent.to}40`,
                }}
              >
                Use Progression
              </Button>
              <Button
                variant="secondary"
                data-testid="load-to-song-btn"
                onClick={() => setPresetPickerOpen(true)}
                disabled={!activeChordIds.length}
                aria-label={t.chord.loadToSong}
                title={t.chord.loadToSong}
                style={{
                  borderRadius: 9999,
                  color: accent.from,
                }}
                icon="queue_music"
              />
              <Button
                variant="secondary"
                data-testid="save-progression-favorite-btn"
                onClick={() => setSavePromptOpen(true)}
                disabled={!activeChordIds.length}
                aria-label="Save as favorite"
                title="Save as favorite"
                style={{
                  borderRadius: 9999,
                  color: accent.from,
                }}
                icon="bookmark_add"
              />
            </div>

            {savePromptOpen && (
              <div className="mt-3 spring-in flex gap-2">
                <input
                  autoFocus
                  data-testid="save-favorite-name-input"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="Name your progression…"
                  className="flex-1 py-2.5 px-4 text-sm outline-none"
                  style={{
                    background: 'var(--app-surface-low)',
                    color: 'var(--c-text-primary)',
                    borderRadius: 9999,
                    border: '1px solid rgba(72,72,72,0.15)',
                    fontFamily: 'Inter',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveConfirm();
                    if (e.key === 'Escape') setSavePromptOpen(false);
                  }}
                />
                <Button
                  variant="primary"
                  data-testid="save-favorite-confirm"
                  onClick={handleSaveConfirm}
                  disabled={!progName.trim()}
                  style={{
                    borderRadius: 9999,
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    color: 'white',
                  }}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {presetPickerOpen && (
        <PresetPickerSheet
          accent={accent}
          presets={sortedPresets}
          chordCount={activeChordIds.length}
          closing={presetPickerClosing}
          onPick={handleLoadToPreset}
          onClose={requestClosePicker}
        />
      )}

      {loadedToName && (
        <div
          aria-live="polite"
          className="fixed left-1/2 spring-in"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            transform: 'translateX(-50%)',
            background: 'var(--app-surface-high)',
            color: 'var(--c-text-primary)',
            padding: '10px 16px',
            borderRadius: 9999,
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 700,
            fontSize: 12,
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            border: `1px solid ${accent.from}44`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 70,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: accent.from }}>
            check_circle
          </span>
          {t.chord.addedToSong.replace('{name}', loadedToName)}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
