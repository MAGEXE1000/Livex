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
      // 1. Resolve song in local library if user already owns it
      let targetId = packet.songId;
      const presets = useChordStore.getState().presets;
      const existing = presets.find(
        (p) => p.id === packet.songId || p.name.toLowerCase() === packet.songTitle.toLowerCase()
      );

      if (existing) {
        targetId = existing.id;
        setActivePreset(targetId);
      }

      // 2. Join session via canonical joinSession:
      // Mounts ephemeral in-memory sessionPreset snapshot without saving to follower's library
      useBandStore.getState().joinSession(packet);

      // 3. Dispatch navigation into Chordex Songs with auto-open Live mode flag
      try {
        sessionStorage.setItem('livex_auto_open_live', targetId || 'session');
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent('livex:open-live-spectator', { detail: { songId: targetId } })
      );
      NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
    },
    [setActivePreset]
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
      if ((packet.action === 'CALL_BAND' || packet.action === 'START_SESSION') && (isLeaderOfBand || isPacketLeader || isBroadcaster)) {
        return;
      }
      if (isLeaderOfBand || isPacketLeader || isBroadcaster || isLockedToLeader) {
        return;
      }

      if (
        packet.action !== 'START_SESSION' &&
        packet.action !== 'PLAY' &&
        packet.action !== 'SONG_SELECT' &&
        packet.action !== 'CALL_BAND' &&
        packet.action !== 'CUE'
      ) {
        return;
      }

      // Check if this is the same song notification within 10 seconds (unless it's an explicit CALL_BAND or START_SESSION)
      if (packet.action !== 'CALL_BAND' && packet.action !== 'START_SESSION' && lastToastSongIdRef.current === `${packet.songId}_${packet.songTitle}`) {
        return;
      }

      lastToastSongIdRef.current = `${packet.songId}_${packet.songTitle}`;
      const isSessionStart = packet.action === 'START_SESSION';
      const isCallBand = packet.action === 'CALL_BAND';
      const songTitle = packet.songTitle || (isSpanish ? 'Ensayo en Vivo' : 'Live Rehearsal');
      const leaderName = packet.leaderName || (isSpanish ? 'Líder' : 'Band Leader');

      showLiveToast(
        isSessionStart
          ? isSpanish
            ? `${leaderName} inició "Tocar Juntos": ${songTitle}`
            : `${leaderName} started "Play Together": ${songTitle}`
          : isCallBand
          ? isSpanish
            ? `${leaderName} llamó para ${songTitle}`
            : `${leaderName} called for ${songTitle}`
          : isSpanish
          ? `Tocando: ${songTitle}`
          : `Playing: ${songTitle}`,
        {
          duration: isSessionStart || isCallBand ? 10000 : 5000,
          songTitle,
          songId: packet.songId,
          leaderName,
          isCallBand: isCallBand || isSessionStart,
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
