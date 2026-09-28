import React from 'react';
import type { SongPreset } from '@workspace/livex-core';
import { useLiveModeState } from './useLiveModeState';
import {
  LiveModeHeader,
  ChordsLiveView,
  LyricsLiveView,
  HybridLiveView,
  LiveModeSettings,
} from './LiveModeUI';

interface LiveModeProps {
  preset: SongPreset;
  initialMode?: 'chords' | 'lyrics' | 'both';
  onClose: () => void;
  transposeOffset?: number;
}

export default function LiveMode({
  preset,
  initialMode,
  onClose,
  transposeOffset = 0,
}: LiveModeProps) {
  const state = useLiveModeState(preset, onClose, transposeOffset, initialMode);

  if (!state.hasLiveContent) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--c-background)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...state.overlayAnim,
        }}
      >
        <p
          style={{
            color: 'var(--c-text-secondary)',
            fontFamily: 'var(--studio-font-body)',
            fontSize: '18px',
          }}
        >
          No chords or lyrics in this song
        </p>
        <button
          onClick={state.handleClose}
          className="btn-smooth"
          style={{
            marginTop: '24px',
            color: state.accent.from,
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 700,
          }}
        >
          Close
        </button>
      </div>
    );
  }

  const isChordsOnly =
    state.displayMode === 'chords_both' ||
    state.displayMode === 'chords_diagram' ||
    state.displayMode === 'chords_name';

  const isHybrid =
    state.displayMode === 'lyrics_chord_diagram' ||
    state.displayMode === 'lyrics_chord_name';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--c-background)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        ...state.overlayAnim,
      }}
    >
      <LiveModeHeader state={state} />

      {isChordsOnly ? (
        <ChordsLiveView state={state} />
      ) : isHybrid ? (
        <HybridLiveView state={state} />
      ) : (
        <LyricsLiveView state={state} />
      )}

      {state.showSettings && <LiveModeSettings state={state} />}
    </div>
  );
}
