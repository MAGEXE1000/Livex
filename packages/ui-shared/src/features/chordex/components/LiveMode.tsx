import React from 'react';
import { createPortal } from 'react-dom';
import { calculateSongTimingSchedule, useBandStore, type SongPreset } from '@workspace/livex-core';

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
  preset?: SongPreset | null;
  initialMode?: 'chords' | 'lyrics' | 'both';
  onClose: () => void;
  transposeOffset?: number;
  setlistContext?: LiveSetlistContext;
}

export default function LiveMode({
  preset: propPreset,
  initialMode,
  onClose,
  transposeOffset = 0,
  setlistContext,
}: LiveModeProps) {
  const sessionPreset = useBandStore((s) => s.sessionPreset);
  const isLockedToLeader = useBandStore((s) => s.isLockedToLeader);
  const effectivePreset = (isLockedToLeader && sessionPreset) ? sessionPreset : (propPreset || sessionPreset);

  const fallbackPreset: SongPreset = effectivePreset || {
    id: 'ephemeral-session-song',
    name: 'Play Together Session',
    artist: '',
    key: 'C',
    bpm: 120,
    speed: 120,
    barsPerLine: 2,
    notes: '',
    chords: [],
    sections: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const state = useLiveModeState(fallbackPreset, onClose, transposeOffset, initialMode, setlistContext);

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

          {state.isLeaderDisconnected && (
            <div
              data-testid="leader-disconnect-banner"
              style={{
                position: 'fixed',
                top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 54px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1002,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.92)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.01em',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                cloud_off
              </span>
              <span>
                {state.isSpanish
                  ? 'Líder desconectado • Pausando teleprompter...'
                  : 'Leader disconnected • Pausing teleprompter...'}
              </span>
            </div>
          )}

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
