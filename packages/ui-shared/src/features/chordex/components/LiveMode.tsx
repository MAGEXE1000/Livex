import React from 'react';
import { createPortal } from 'react-dom';
import { calculateSongTimingSchedule, type SongPreset } from '@workspace/livex-core';

if (typeof window !== 'undefined') {
  (window as any).calculateSongTimingSchedule = calculateSongTimingSchedule;
}
import { useLiveModeState, type LiveSetlistContext } from './useLiveModeState';
import {
  LiveModeHeader,
  ChordsLiveView,
  LyricsLiveView,
  HybridLiveView,
  LiveModeSettings,
  RehearsalWaitingLobby,
  LeaderLobbyPresenceBar,
} from './LiveModeUI';
import { LiveCountdownOverlay } from './LiveCountdownOverlay';
import { LiveTempoMorphPopup } from './LiveTempoMorphPopup';

interface LiveModeProps {
  preset: SongPreset;
  initialMode?: 'chords' | 'lyrics' | 'both';
  onClose: () => void;
  transposeOffset?: number;
  setlistContext?: LiveSetlistContext;
}

export default function LiveMode({
  preset,
  initialMode,
  onClose,
  transposeOffset = 0,
  setlistContext,
}: LiveModeProps) {
  const state = useLiveModeState(preset, onClose, transposeOffset, initialMode, setlistContext);

  if (!state.hasLiveContent) {
    const emptyNode = (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--c-background)',
          zIndex: 1000,
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
    return typeof document !== 'undefined' ? createPortal(emptyNode, document.body) : emptyNode;
  }

  const isChordsOnly =
    state.displayMode === 'chords_both' ||
    state.displayMode === 'chords_diagram' ||
    state.displayMode === 'chords_name';

  const isHybrid =
    state.displayMode === 'lyrics_chord_diagram' ||
    state.displayMode === 'lyrics_chord_name';

  const showWaitingLobby = state.isLockedToLeader && state.isInLobby;
  const showLeaderPresenceBar =
    state.isBandLeader && state.isBroadcasting && state.isInLobby && !state.autoPlay;

  const liveNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--c-background)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        ...state.overlayAnim,
      }}
    >
      {showWaitingLobby ? (
        <RehearsalWaitingLobby state={state} />
      ) : (
        <>
          <LiveModeHeader state={state} />

          {isChordsOnly ? (
            <ChordsLiveView state={state} />
          ) : isHybrid ? (
            <HybridLiveView state={state} />
          ) : (
            <LyricsLiveView state={state} />
          )}

          {showLeaderPresenceBar && <LeaderLobbyPresenceBar state={state} />}

          {state.showSettings && <LiveModeSettings state={state} />}

          {state.isCountingDown && (
            <LiveCountdownOverlay
              currentBeat={state.countdownBeat}
              totalBeats={state.countdownTotalBeats}
              currentBar={state.countdownCurrentBar}
              totalBars={state.countdownTotalBars}
              bpm={state.speed || state.bpmOverride}
              accent={state.accent}
              onCancel={state.cancelCountdown}
            />
          )}

          {state.showTempoModal && (
            <LiveTempoMorphPopup
              bpm={state.speed || state.bpmOverride}
              onBpmChange={(newBpm) => {
                state.setSpeed(newBpm);
              }}
              accent={state.accent}
              timeSignature={state.metronomeTimeSignature}
              onTimeSignatureChange={state.setMetronomeTimeSignature}
              subdivision={state.metronomeSubdivision}
              onSubdivisionChange={state.setMetronomeSubdivision}
              accentPattern={state.metronomeAccentPattern}
              onCycleBeatAccent={state.cycleMetronomeBeatAccent}
              activeBeat={state.activeMetronomeBeat}
              metronomeEnabled={state.metronomeEnabled}
              onMetronomeToggle={state.setMetronomeEnabled}
              metronomeVolume={state.metronomeVolume}
              onMetronomeVolumeChange={state.setMetronomeVolume}
              metronomeSound={state.metronomeSound}
              onMetronomeSoundChange={state.setMetronomeSound}
              onClose={() => state.setShowTempoModal(false)}
            />
          )}
        </>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(liveNode, document.body) : liveNode;
}
