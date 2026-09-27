import React from 'react';
import { PlusMenu } from '../../../shared/design-system';
import type { SongPreset } from '@workspace/livex-core'; // assuming

interface Props {
  presets: SongPreset[];
  activePresetId: string | null;
  setActivePreset: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setShowForm: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  onNewSong: () => void;
  accent: { from: string; to: string; mid?: string };
  t: any;
}

export function SongLibraryList({
  presets,
  activePresetId,
  setActivePreset,
  setEditingId,
  setShowForm,
  setShowImport,
  onNewSong,
  accent,
  t
}: Props) {
  return (
    <div
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid var(--c-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderBottom: '1px solid var(--c-border)',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--c-text-muted)',
            fontFamily: 'var(--font-headline)',
          }}
        >
          {t.songs.songs}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <PlusMenu
            openWidth={180}
            openHeight={100}
            closedSize={32}
            closedRadius={16}
            openRadius={14}
            triggerAriaLabel={t.songs.newSong}
            triggerIcon={
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add
              </span>
            }
            style={{
              background: 'var(--surface-dialog-bg, #1c1c22)',
              borderColor: 'var(--c-border)',
            }}
          >
            {({ close }: any) => (
              <div className="flex flex-col p-1.5 gap-1 w-full h-full justify-center">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onNewSong();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ color: accent.from }}>
                    add
                  </span>
                  <span>{t.songs.newSong}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setShowImport(true);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--c-text-secondary)' }}>
                    upload_file
                  </span>
                  <span>{t.songs.importSong}</span>
                </button>
              </div>
            )}
          </PlusMenu>
        </div>
      </div>
      {/* List of songs */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: '8px' }}>
        {presets.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--c-text-muted)',
              fontSize: '12px',
            }}
          >
            No Songs
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {presets.map((p) => {
              const isActive = p.id === activePresetId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(p.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    textAlign: 'left',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: isActive ? '700' : '500',
                        color: isActive ? '#fff' : 'var(--c-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </span>
                    {p.key && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--c-text-secondary)',
                          opacity: 0.8,
                        }}
                      >
                        {p.key}
                      </span>
                    )}
                  </div>
                  {p.artist && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--c-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.artist}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
