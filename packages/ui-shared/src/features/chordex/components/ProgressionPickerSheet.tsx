import React, { useEffect } from 'react';
import { useT, type SongPreset, BackDispatcher } from '@workspace/studio-core';
import { MorphingModal } from '../../../components/motion/morphing-modal';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';

interface PresetPickerProps {
  accent: { from: string; to: string; mid: string };
  presets: SongPreset[];
  chordCount: number;
  closing: boolean;
  onPick: (p: SongPreset) => void;
  onClose: () => void;
}

export function PresetPickerSheet({
  accent,
  presets,
  chordCount,
  closing,
  onPick,
  onClose,
}: PresetPickerProps) {
  const t = useT();

  useEffect(() => {
    if (closing) return undefined;
    const id = 'chordex:preset-picker';
    activeOverlaysRegistry.register('sheet', id);
    const unregisterBack = BackDispatcher.register('sheet', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('sheet', id);
      unregisterBack();
    };
  }, [closing, onClose]);

  const chordsLabel =
    chordCount === 1
      ? t.chord.chordsCountOne
      : t.chord.chordsCountOther.replace('{count}', String(chordCount));

  return (
    <MorphingModal
      viewId={closing ? null : 'preset-picker'}
      onClose={onClose}
      placement="bottom"
      className="w-full sm:max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {t.chord.chooseSongPreset}
          </h3>
          <p
            style={{
              fontSize: 11.5,
              color: 'var(--c-text-muted)',
              fontFamily: 'Inter',
              margin: '2px 0 0',
            }}
          >
            {chordsLabel} · {t.chord.appendChordsHint}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="btn-smooth"
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
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
            marginLeft: 12,
          }}
        >
          ×
        </button>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', padding: '4px 12px 8px' }}>
        {presets.length === 0 ? (
          <div
            className="spring-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 20px',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: 'var(--c-text-muted)', opacity: 0.7 }}
            >
              library_music
            </span>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
                margin: '4px 0 0',
              }}
            >
              {t.chord.noPresetsYet}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--c-text-muted)',
                fontFamily: 'Inter',
                margin: 0,
              }}
            >
              {t.chord.noPresetsHint}
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {presets.map((p) => {
              const presetChordCount =
                p.sections && p.sections.length > 0
                  ? p.sections.reduce((sum, s) => sum + s.chords.length, 0)
                  : p.chords.length;
              const presetChordsLabel =
                presetChordCount === 1
                  ? t.chord.chordsCountOne
                  : t.chord.chordsCountOther.replace('{count}', String(presetChordCount));
              return (
                <li key={p.id}>
                  <button
                    data-testid={`pick-preset-${p.id}`}
                    onClick={() => onPick(p)}
                    className="btn-smooth"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--app-surface-high)',
                      border: '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${accent.from}33, ${accent.to}22)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accent.from,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        music_note
                      </span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: 'var(--c-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name || 'Untitled'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color: 'var(--c-text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: 2,
                        }}
                      >
                        {[p.artist?.trim(), `${p.key || '—'}`, presetChordsLabel]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: 'var(--c-text-muted)' }}
                    >
                      chevron_right
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MorphingModal>
  );
}
