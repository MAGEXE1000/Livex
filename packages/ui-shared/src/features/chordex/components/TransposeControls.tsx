import React from 'react';
import { useSettingsStore } from '@workspace/livex-core'; // assuming it's here

interface Props {
  variant?: 'mobile' | 'desktop';
  activePresetId: string;
  transposeOffset: number;
  setTranspose: (id: string, offset: number) => void;
  resetTranspose: (id: string) => void;
  preferFlats: boolean;
  formatOffset: (offset: number) => string;
  accent?: { from: string; to: string };
  t?: any;
}

export function TransposeControls({
  variant = 'mobile',
  activePresetId,
  transposeOffset,
  setTranspose,
  resetTranspose,
  preferFlats,
  formatOffset,
  accent,
  t
}: Props) {
  if (variant === 'desktop') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        {transposeOffset !== 0 && (
          <button
            onClick={() => resetTranspose(activePresetId)}
            className="btn-smooth"
            title={t?.songs?.resetKey || 'Reset key'}
            style={{
              padding: '3px 6px',
              borderRadius: '9999px',
              background: 'var(--app-surface-high)',
              color: 'var(--c-text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              restart_alt
            </span>
          </button>
        )}
        <button
          onClick={() =>
            useSettingsStore.getState().updateSettings({ preferFlats: !preferFlats })
          }
          className="btn-smooth"
          title={preferFlats ? (t?.songs?.usingFlats || 'Using flats') : (t?.songs?.usingSharps || 'Using sharps')}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'var(--app-surface-high)',
            color: 'var(--c-text-secondary)',
            fontFamily: 'var(--font-headline)',
            fontWeight: 800,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preferFlats ? '♭' : '♯'}
        </button>
        <button
          onClick={() => setTranspose(activePresetId, transposeOffset - 1)}
          className="btn-smooth"
          data-testid="transpose-down"
          disabled={transposeOffset <= -11}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--app-surface-high)',
            color: transposeOffset > -11 ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: transposeOffset <= -11 ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
            remove
          </span>
        </button>
        <div
          style={{
            width: '30px',
            textAlign: 'center',
            fontFamily: 'var(--font-headline)',
            fontWeight: 900,
            fontSize: '12px',
            color: transposeOffset !== 0 ? accent?.from : 'var(--c-text-muted)',
            transition: 'color 250ms ease',
            flexShrink: 0,
          }}
        >
          {formatOffset(transposeOffset)}
        </div>
        <button
          onClick={() => setTranspose(activePresetId, transposeOffset + 1)}
          className="btn-smooth"
          data-testid="transpose-up"
          disabled={transposeOffset >= 11}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--app-surface-high)',
            color: transposeOffset < 11 ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: transposeOffset >= 11 ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
            add
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-full px-1.5 py-1 border shadow-sm gap-0.5"
      style={{
        backgroundColor: 'var(--surface-card-bg, #ffffff)',
        borderColor: 'var(--c-border, #E3E6EB)',
      }}
      data-purpose="transpose-controls"
    >
      {transposeOffset !== 0 && (
        <button
          type="button"
          onClick={() => resetTranspose(activePresetId)}
          className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer"
          style={{ color: 'var(--c-text-secondary, #6B7280)' }}
          title="Reset key"
        >
          <span className="material-symbols-rounded text-sm">restart_alt</span>
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          useSettingsStore.getState().updateSettings({ preferFlats: !preferFlats })
        }
        className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer"
        style={{
          color: 'var(--c-text-secondary, #6B7280)',
          fontFamily: 'var(--font-headline)',
          fontWeight: 800,
          fontSize: '12px',
        }}
        title={
          preferFlats
            ? 'Using flats (click for sharps)'
            : 'Using sharps (click for flats)'
        }
      >
        {preferFlats ? '♭' : '♯'}
      </button>

      <button
        type="button"
        aria-label="Transpose down"
        data-testid="transpose-down"
        id="btn-transpose-down"
        disabled={transposeOffset <= -11}
        onClick={() => setTranspose(activePresetId, transposeOffset - 1)}
        className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer disabled:opacity-40"
        style={{ color: 'var(--c-text-primary, #111827)' }}
      >
        <span className="material-symbols-rounded text-sm">remove</span>
      </button>

      <span
        id="transpose-value"
        className="text-xs font-bold font-mono px-1 select-none min-w-[24px] text-center"
        style={{
          color:
            transposeOffset !== 0
              ? 'var(--c-accent-from, #2563EB)'
              : 'var(--c-text-primary, #111827)',
        }}
      >
        {formatOffset(transposeOffset)}
      </span>

      <button
        type="button"
        aria-label="Transpose up"
        data-testid="transpose-up"
        id="btn-transpose-up"
        disabled={transposeOffset >= 11}
        onClick={() => setTranspose(activePresetId, transposeOffset + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer disabled:opacity-40"
        style={{ color: 'var(--c-text-primary, #111827)' }}
      >
        <span className="material-symbols-rounded text-sm">add</span>
      </button>
    </div>
  );
}
