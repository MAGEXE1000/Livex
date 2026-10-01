import React, { useEffect, useRef, useCallback } from 'react';
import {
  useBandStore,
  useChordStore,
  useSettingsStore,
  subscribeToBandLiveSession,
  NavigationDispatcher,
  type LiveBandSyncPacket,
  type BandMember,
} from '@workspace/livex-core';
import { showLiveToast, showMemberJoinedToast } from '../../../components/ui/sonner';

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
  const attachRealtimeSync = useBandStore((s) => s.attachRealtimeSync);

  const createPreset = useChordStore((s) => s.createPreset);
  const setActivePreset = useChordStore((s) => s.setActivePreset);

  const language = useSettingsStore((s) => s.settings.language);
  const isSpanish = language === 'es';

  const lastToastSongIdRef = useRef<string>('');

  // 1. Maintain active realtime subscription for the current band
  useEffect(() => {
    if (!currentBand?.id) return () => {};
    const unsub = attachRealtimeSync();
    return () => {
      unsub();
    };
  }, [currentBand?.id, attachRealtimeSync]);

  const handleJoin = useCallback(
    (packet: LiveBandSyncPacket) => {
      // 1. Resolve song in local library or import from sharedSongs/songPayload
      let targetId = packet.songId;
      const presets = useChordStore.getState().presets;
      const existing = presets.find(
        (p) => p.id === packet.songId || p.name.toLowerCase() === packet.songTitle.toLowerCase()
      );

      if (existing) {
        targetId = existing.id;
      } else {
        const sharedSongs = useBandStore.getState().sharedSongs;
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

      window.dispatchEvent(
        new CustomEvent('livex:open-live-spectator', { detail: { songId: targetId } })
      );
      NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
    },
    [currentBand?.id, createPreset, setActivePreset, setIsLockedToLeader, setActiveLiveSession]
  );

  // 2. Subscribe to live session broadcasts and member join events
  useEffect(() => {
    if (!currentBand?.id) {
      return () => {};
    }

    const unsub = subscribeToBandLiveSession(currentBand.id, (packet) => {
      if (!packet) return;

      // Handle Member Joined notification
      if (packet.action === 'MEMBER_JOINED' && packet.memberPayload) {
        const member = packet.memberPayload as BandMember;
        if (member.id) {
          const currentMembers = useBandStore.getState().members;
          if (!currentMembers.some((m) => m.id === member.id || (member.userId && m.userId === member.userId))) {
            useBandStore.getState().setMembers([...currentMembers, member]);
          }
        }

        const memberName = packet.memberPayload.displayName || (isSpanish ? 'Músico' : 'Musician');
        showMemberJoinedToast(
          isSpanish ? `${memberName} se unió a la banda` : `${memberName} joined the band`,
          {
            duration: 4000,
            memberName,
            memberRole: packet.memberPayload.role,
          }
        );
        return;
      }

      // Handle Live Rehearsal broadcast & Call Band
      const currentUserId = useBandStore.getState().currentUserId || 'local-user';
      const isLeaderOfBand = Boolean(currentBand && currentBand.leaderId === currentUserId);
      const isPacketLeader = Boolean(
        packet.leaderId === currentUserId ||
        (currentBand?.leaderId && packet.leaderId === currentBand.leaderId)
      );
      const isBroadcaster = Boolean(isBroadcasting || useBandStore.getState().isBroadcasting);

      // Strict Leader Filtering: The device initiating or leading the session must NEVER display an invitation toast to itself
      if (packet.action === 'CALL_BAND' && (isLeaderOfBand || isPacketLeader || isBroadcaster)) {
        return;
      }
      if (isLeaderOfBand || isPacketLeader || isBroadcaster || isLockedToLeader) {
        return;
      }

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
      const isCallBand = packet.action === 'CALL_BAND';
      const songTitle = packet.songTitle || (isSpanish ? 'Ensayo en Vivo' : 'Live Rehearsal');
      const leaderName = packet.leaderName || (isSpanish ? 'Líder' : 'Band Leader');

      showLiveToast(
        isCallBand
          ? isSpanish
            ? `${leaderName} llamó para ${songTitle}`
            : `${leaderName} called for ${songTitle}`
          : isSpanish
          ? `Tocando: ${songTitle}`
          : `Playing: ${songTitle}`,
        {
          duration: isCallBand ? 8000 : 5000,
          songTitle,
          songId: packet.songId,
          leaderName,
          isCallBand,
          onJoin: () => handleJoin(packet),
        }
      );
    });

    return () => {
      unsub();
    };
  }, [currentBand, isBroadcasting, isLockedToLeader, isSpanish, handleJoin]);

  return null;
};
