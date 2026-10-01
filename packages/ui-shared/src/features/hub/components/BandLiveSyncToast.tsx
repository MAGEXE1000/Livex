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
  type BandMember,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';

export type ToastPayload =
  | {
      type: 'live';
      songTitle: string;
      songId: string;
      leaderName: string;
      isCallBand?: boolean;
      packet: LiveBandSyncPacket;
    }
  | {
      type: 'member_joined';
      memberName: string;
      memberRole?: string;
    };

export const BandLiveSyncToast: React.FC = () => {
  const currentBand = useBandStore((s) => s.currentBand);
  const isBroadcasting = useBandStore((s) => s.isBroadcasting);
  const isLockedToLeader = useBandStore((s) => s.isLockedToLeader);
  const setIsLockedToLeader = useBandStore((s) => s.setIsLockedToLeader);
  const setActiveLiveSession = useBandStore((s) => s.setActiveLiveSession);
  const sharedSongs = useBandStore((s) => s.sharedSongs);
  const attachRealtimeSync = useBandStore((s) => s.attachRealtimeSync);

  const presets = useChordStore((s) => s.presets);
  const createPreset = useChordStore((s) => s.createPreset);
  const setActivePreset = useChordStore((s) => s.setActivePreset);

  const { accentColor, language, theme } = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
      theme: s.settings.theme,
    }))
  );
  const accent = resolveAccent(accentColor);
  const isSpanish = language === 'es';
  const isLight = theme === 'light';

  const [activeToast, setActiveToast] = useState<ToastPayload | null>(null);

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

  // 1. Maintain active realtime subscription for the current band
  useEffect(() => {
    if (!currentBand?.id) return () => {};
    const unsub = attachRealtimeSync();
    return () => {
      unsub();
    };
  }, [currentBand?.id, attachRealtimeSync]);

  // 2. Subscribe to live session broadcasts and member join events
  useEffect(() => {
    if (!currentBand?.id) {
      setActiveToast(null);
      return () => {};
    }

    const unsub = subscribeToBandLiveSession(currentBand.id, (packet) => {
      if (!packet) return;

      // Handle Member Joined notification
      if (packet.action === 'MEMBER_JOINED' && packet.memberPayload) {
        clearDismissTimer();
        setActiveToast({
          type: 'member_joined',
          memberName: packet.memberPayload.displayName || 'Musician',
          memberRole: packet.memberPayload.role,
        });

        const member = packet.memberPayload as BandMember;
        if (member.id) {
          const currentMembers = useBandStore.getState().members;
          if (!currentMembers.some((m) => m.id === member.id || (member.userId && m.userId === member.userId))) {
            useBandStore.getState().setMembers([...currentMembers, member]);
          }
        }

        dismissTimerRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 4000);
        return;
      }

      // Handle Live Rehearsal broadcast & Call Band
      const currentUserId = useBandStore.getState().currentUserId || 'local-user';
      const isLeaderDevice = Boolean(
        isBroadcasting ||
        (currentBand && currentBand.leaderId === currentUserId) ||
        packet.leaderId === currentUserId
      );

      // Strict Leader Filtering: The device initiating or leading the session must NEVER display an invitation toast to itself
      if (isLeaderDevice || isBroadcasting || isLockedToLeader) return;

      if (
        packet.action !== 'PLAY' &&
        packet.action !== 'SONG_SELECT' &&
        packet.action !== 'CALL_BAND' &&
        packet.action !== 'CUE'
      ) {
        return;
      }

      // Check if this is the same song notification within 10 seconds (unless it's an explicit CALL_BAND)
      if (packet.action !== 'CALL_BAND' && lastToastSongIdRef.current === `${packet.songId}_${packet.songTitle}`) {
        return;
      }

      lastToastSongIdRef.current = `${packet.songId}_${packet.songTitle}`;
      clearDismissTimer();

      const isCallBand = packet.action === 'CALL_BAND';

      setActiveToast({
        type: 'live',
        songTitle: packet.songTitle || 'Live Rehearsal',
        songId: packet.songId,
        leaderName: packet.leaderName || 'Band Leader',
        isCallBand,
        packet,
      });

      // Auto-dismiss after 8 seconds for CALL_BAND, 6 seconds for passive session
      const timeoutMs = isCallBand ? 8000 : 6000;
      dismissTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, timeoutMs);
    });

    return () => {
      unsub();
      clearDismissTimer();
    };
  }, [currentBand?.id, isBroadcasting, isLockedToLeader]);

  const handleJoin = useCallback(() => {
    if (!activeToast || activeToast.type !== 'live') return;
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
    const currentUserId = useBandStore.getState().currentUserId || 'local-user';
    const currentUserName = useBandStore.getState().currentUserName || 'Musician';

    if (currentBand?.id) {
      useBandStore.getState().joinLobby(currentBand.id, {
        userId: currentUserId,
        displayName: currentUserName,
        role: 'member',
        joinedAt: Date.now(),
      });
    }

    setIsLockedToLeader(true);
    setActiveLiveSession(packet);
    setActivePreset(targetId);

    // 3. Dispatch navigation into Chordex Songs with auto-open Live mode flag
    try {
      sessionStorage.setItem('livex_auto_open_live', targetId);
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('livex:open-live-spectator', { detail: { songId: targetId } }));
    NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
  }, [activeToast, presets, sharedSongs, currentBand?.id, createPreset, setActivePreset, setIsLockedToLeader, setActiveLiveSession]);

  if (!activeToast || typeof document === 'undefined') return null;

  const isLiveToast = activeToast.type === 'live';

  return createPortal(
    <div
      data-testid={isLiveToast ? 'band-live-sync-top-toast' : 'band-member-joined-toast'}
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
        padding: '6px 10px 6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(24, 24, 27, 0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: isLight
          ? '0 10px 30px rgba(0, 0, 0, 0.15), 0 0 16px rgba(59, 130, 246, 0.18)'
          : '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.22)',
        animation: 'slide-down-spring 360ms cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        color: isLight ? '#0f172a' : '#ffffff',
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

      {/* Content */}
      {isLiveToast ? (
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
                color: activeToast.isCallBand ? accent.from : '#22c55e',
              }}
            >
              {activeToast.isCallBand
                ? isSpanish
                  ? 'Llamado de Banda'
                  : 'Band Call'
                : isSpanish
                  ? 'En Vivo • Banda'
                  : 'Live • Band Rehearsal'}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: isLight ? '#0f172a' : '#ffffff',
              }}
            >
              {activeToast.isCallBand
                ? isSpanish
                  ? `${activeToast.leaderName || 'Líder'} llamó para ${activeToast.songTitle}`
                  : `${activeToast.leaderName || 'Band Leader'} called for ${activeToast.songTitle}`
                : isSpanish
                  ? `Tocando: ${activeToast.songTitle}`
                  : `Playing: ${activeToast.songTitle}`}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `${accent.from}22`,
              border: `1px solid ${accent.from}44`,
              color: accent.from,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <StudioIcon name="person_add" size={15} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: accent.from,
              }}
            >
              {isSpanish ? 'Nuevo Integrante' : 'Member Joined'}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: isLight ? '#0f172a' : '#ffffff',
              }}
            >
              {isSpanish
                ? `${activeToast.memberName} se unió a la banda`
                : `${activeToast.memberName} joined the band`}
            </span>
          </div>
        </div>
      )}

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {isLiveToast && (
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
        )}

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
            background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.6)',
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
