import React from 'react';
import type { SongPreset } from '@workspace/studio-core';

interface SongCardGridProps {
  songs: SongPreset[];
  onSelectSong: (song: SongPreset) => void;
}

export function SongCardGrid({ songs, onSelectSong }: SongCardGridProps) {
  if (songs.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: 14 }}>
        No songs found. Create a new song to get started.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      {songs.map((song) => (
        <div
          key={song.id}
          onClick={() => onSelectSong(song)}
          className="content-auto-row"
          style={{
            background: 'var(--c-surface-mid)',
            borderRadius: 12,
            padding: '12px 16px',
            border: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-primary)' }}>{song.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-secondary)' }}>
              {song.artist ? `by ${song.artist}` : 'Unknown Artist'} • Key: {song.key || 'C'} • {song.bpm || 120} BPM
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--c-text-muted)' }}>
            chevron_right
          </span>
        </div>
      ))}
    </div>
  );
}
