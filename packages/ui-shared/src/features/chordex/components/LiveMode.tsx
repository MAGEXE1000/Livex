import React from 'react';
import type { SongPreset } from '@workspace/livex-core';
import { useLiveModeState } from './useLiveModeState';
import {
  LiveModeHeader,
  LiveModeVisualizer,
  LiveModeProgress,
  LiveModeControls,
  LiveModeSettings,
} from './LiveModeUI';

interface LiveModeProps {
  preset: SongPreset;
  onClose: () => void;
  transposeOffset?: number;
}

export default function LiveMode({ preset, onClose, transposeOffset = 0 }: LiveModeProps) {
  const state = useLiveModeState(preset, onClose, transposeOffset);

  if (state.total === 0) {
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
          No chords in this preset
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
        ...state.overlayAnim,
      }}
      onClick={state.handleTap}
    >
      <LiveModeHeader state={state} />
      <LiveModeVisualizer state={state} />
      <LiveModeProgress state={state} />
      <LiveModeControls state={state} />
      {state.showSettings && <LiveModeSettings state={state} />}
    </div>
  );
}
