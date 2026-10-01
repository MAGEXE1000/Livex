import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  useBandStore,
  useChordStore,
  useSettingsStore,
  useShallow,
  resolveAccent,
  subscribeToBandLiveSession,
  NavigationDispatcher,
  type LiveBandSyncPacket,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';

export const BandLiveSyncToast: React.FC = () => {
  const currentBand = useBandStore((s) => s.currentBand);
  const isBroadcasting = useBandStore((s) => s.isBroadcasting);
  const isLockedToLeader = useBandStore((s) => s.isLockedToLeader);
  const setIsLockedToLeader = useBandStore((s) => s.setIsLockedToLeader);
  const setActiveLiveSession = useBandStore((s) => s.setActiveLiveSession);
  const sharedSongs = useBandStore((s) => s.sharedSongs);

  const presets = useChordStore((s) => s.presets);
  const createPreset = useChordStore((s) => s.createPreset);
  const setActivePreset = useChordStore((s) => s.setActivePreset);

  const { accentColor, language } = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
    }))
  );
  const accent = resolveAccent(accentColor);
  const isSpanish = language === 'es';

  const [activeToast, setActiveToast] = useState<{
    songTitle: string;
    songId: string;
    leaderName: string;
    packet: LiveBandSyncPacket;
  } | null>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastSongIdRef = useRef<string>('');

  const clearDismissTimer = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  const handleDismiss = useCallback(() => {
    clearDismissTimer();
    setActiveToast(null);
  }, []);

  useEffect(() => {
    if (!currentBand?.id || isBroadcasting || isLockedToLeader) {
      setActiveToast(null);
      return () => {};
    }

    const unsub = subscribeToBandLiveSession(currentBand.id, (packet) => {
      // Don't toast if we are already locked or broadcasting or if the packet is just a heartbeat
      if (!packet || isBroadcasting || isLockedToLeader) return;
      if (packet.action !== 'PLAY' && packet.action !== 'SONG_SELECT' && packet.action !== 'CUE') {
        return;
      }

      // Check if this is the same song notification within 10 seconds
      if (lastToastSongIdRef.current === `${packet.songId}_${packet.songTitle}`) {
        return;
      }

      lastToastSongIdRef.current = `${packet.songId}_${packet.songTitle}`;
      clearDismissTimer();

      setActiveToast({
        songTitle: packet.songTitle || 'Live Rehearsal',
        songId: packet.songId,
        leaderName: packet.leaderName || 'Band Leader',
        packet,
      });

      // Auto-dismiss smoothly after 6 seconds
      dismissTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
    });

    return () => {
      unsub();
      clearDismissTimer();
    };
  }, [currentBand?.id, isBroadcasting, isLockedToLeader]);

  const handleJoin = useCallback(() => {
    if (!activeToast) return;
    const { packet } = activeToast;

    clearDismissTimer();
    setActiveToast(null);

    // 1. Resolve song in local library or import from sharedSongs/songPayload
    let targetId = packet.songId;
    const existing = presets.find(
      (p) => p.id === packet.songId || p.name.toLowerCase() === packet.songTitle.toLowerCase()
    );

    if (existing) {
      targetId = existing.id;
    } else {
      // Look in shared songs
      const shared = sharedSongs.find(
        (s) => s.songId === packet.songId || s.title.toLowerCase() === packet.songTitle.toLowerCase()
      );
      if (shared) {
        targetId = createPreset({
          name: shared.title,
          artist: shared.artist || '',
          key: shared.key || 'C',
          bpm: shared.bpm || 120,
          speed: shared.speed || shared.bpm || 120,
          barsPerLine: shared.barsPerLine || 2,
          notes: shared.notes || '',
          chords: shared.chords || [],
          sections: shared.sections || [],
          lyrics: shared.lyrics,
          coverImage: shared.coverImage,
        });
      } else if (packet.songPayload) {
        const payload = packet.songPayload;
        targetId = createPreset({
          name: payload.title || packet.songTitle,
          artist: payload.artist || '',
          key: payload.key || 'C',
          bpm: payload.bpm || packet.bpm || 120,
          speed: payload.speed || payload.bpm || 120,
          barsPerLine: payload.barsPerLine || packet.barsPerLine || 2,
          notes: payload.notes || '',
          chords: payload.chords || [],
          sections: payload.sections || [],
          lyrics: payload.lyrics,
          coverImage: payload.coverImage,
        });
      }
    }

    // 2. Lock to leader and set spectator session state
    setIsLockedToLeader(true);
    setActiveLiveSession(packet);
    setActivePreset(targetId);

    // 3. Dispatch navigation into Chordex Songs with auto-open Live mode flag
    try {
      sessionStorage.setItem('livex_auto_open_live', targetId);
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('livex:open-live-spectator', { detail: { songId: targetId } }));
    NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
  }, [activeToast, presets, sharedSongs, createPreset, setActivePreset, setIsLockedToLeader, setActiveLiveSession]);

  if (!activeToast || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-testid="band-live-sync-top-toast"
      role="alert"
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 32px)',
        maxWidth: '480px',
        minHeight: '46px',
        borderRadius: '24px',
        padding: '6px 8px 6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        background: 'rgba(24, 24, 27, 0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(34, 197, 94, 0.22)',
        animation: 'slide-down-spring 360ms cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      <style>{`
        @keyframes slide-down-spring {
          from {
            opacity: 0;
            transform: translate(-50%, -120%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>

      {/* Left: Pulsing Live Dot + Message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 10px #22c55e',
            flexShrink: 0,
            animation: 'live-dot-pulse 1.2s infinite',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#4ade80',
            }}
          >
            {isSpanish ? 'En Vivo • Banda' : 'Live • Band Rehearsal'}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#ffffff',
            }}
          >
            {isSpanish
              ? `Tocando: ${activeToast.songTitle}`
              : `Playing: ${activeToast.songTitle}`}
          </span>
        </div>
      </div>

      {/* Right: Join Action Button + Close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          data-testid="band-live-toast-join-btn"
          onClick={handleJoin}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '16px',
            background: accent.from,
            border: 'none',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: `0 2px 10px ${accent.from}44`,
            transition: 'all 0.15s ease',
          }}
        >
          <StudioIcon name="play_arrow" size={13} />
          <span>{isSpanish ? 'Unirse' : 'Join'}</span>
        </button>

        <button
          type="button"
          data-testid="band-live-toast-dismiss-btn"
          onClick={handleDismiss}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: 0,
          }}
          title={isSpanish ? 'Descartar' : 'Dismiss'}
        >
          <StudioIcon name="close" size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
};
