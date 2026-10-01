import type {
  Band,
  BandMember,
  SharedSong,
  BandEvent,
  LiveBandSyncPacket,
  LobbyAttendee,
} from '../types/band';
import { getFirebaseDb } from './services/firebase';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

// In-memory BroadcastChannel instances mapped by bandId
const _liveSyncChannels = new Map<string, BroadcastChannel>();
const _dataSyncChannels = new Map<string, BroadcastChannel>();

function getOrCreateChannel(map: Map<string, BroadcastChannel>, name: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  let ch = map.get(name);
  if (!ch) {
    try {
      ch = new BroadcastChannel(name);
      map.set(name, ch);
    } catch (_) {
      return null;
    }
  }
  return ch;
}

function cleanPayload<T = any>(obj: any): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanPayload) as any;
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      copy[k] = typeof v === 'object' && v !== null ? cleanPayload(v) : v;
    }
  }
  return copy as T;
}

/**
 * Compute transit latency and staleness for an incoming live sync packet
 */
export function calculateTransitDrift(
  packet: LiveBandSyncPacket,
  now: number = Date.now()
): { transitMs: number; isStale: boolean } {
  const diff = now - packet.timestamp;
  const transitMs = Math.max(0, Math.min(10000, diff));
  const isStale = diff > 8000;
  return { transitMs, isStale };
}

/**
 * Broadcast a live stage packet to all connected band members
 * Transmits instantly over BroadcastChannel and synchronizes via Firestore
 */
export async function broadcastBandLivePacket(packet: LiveBandSyncPacket): Promise<void> {
  if (!packet || !packet.bandId) return;

  // 1. Instant local broadcast (sub-millisecond latency for same-device/multi-tab/preview)
  try {
    const ch = getOrCreateChannel(_liveSyncChannels, `livex_band_live_sync_${packet.bandId}`);
    if (ch) {
      ch.postMessage({ type: 'LIVEX_BAND_STAGE_SYNC', packet });
    }
  } catch (err) {
    console.warn('[BandSyncService] BroadcastChannel postMessage error:', err);
  }

  // 2. Cloud Firestore Realtime Session update
  try {
    const db = getFirebaseDb();
    if (db) {
      const sessionRef = doc(db, 'liveBandSessions', packet.bandId);
      const clean = cleanPayload(packet);
      setDoc(sessionRef, clean, { merge: true }).catch((err) => {
        console.debug('[BandSyncService] Firestore sync non-fatal write error:', err?.message || err);
      });
    }
  } catch (err) {
    console.debug('[BandSyncService] Firestore session update skipped:', err);
  }
}

/**
 * Register member presence in the active rehearsal lobby
 */
export async function joinLobbyRemote(bandId: string, attendee: LobbyAttendee): Promise<void> {
  if (!bandId || !attendee || !attendee.userId) return;

  // 1. Local BroadcastChannel trigger
  try {
    const ch = getOrCreateChannel(_liveSyncChannels, `livex_band_live_sync_${bandId}`);
    if (ch) {
      ch.postMessage({
        type: 'LIVEX_BAND_STAGE_SYNC',
        packet: {
          bandId,
          leaderId: '',
          leaderName: '',
          songId: '',
          songTitle: '',
          action: 'LOBBY_JOIN',
          timestamp: Date.now(),
          currentLineIdx: 0,
          currentWordIdx: 0,
          currentBeat: 0,
          currentBar: 0,
          bpm: 120,
          barsPerLine: 2,
          autoPlay: false,
          version: Date.now(),
          lobbyAttendees: [attendee],
          memberPayload: {
            id: attendee.userId,
            bandId,
            userId: attendee.userId,
            displayName: attendee.displayName,
            role: attendee.role || 'member',
            joinedAt: attendee.joinedAt || Date.now(),
            isOnline: true,
          },
        },
      });
    }
  } catch (_) {}

  // 2. Persist presence in Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      const attendeeRef = doc(db, 'liveBandSessions', bandId, 'lobby', attendee.userId);
      setDoc(attendeeRef, cleanPayload(attendee), { merge: true }).catch(() => {});
    }
  } catch (_) {}
}

/**
 * Remove member presence from rehearsal lobby
 */
export async function leaveLobbyRemote(bandId: string, userId: string): Promise<void> {
  if (!bandId || !userId) return;

  try {
    const ch = getOrCreateChannel(_liveSyncChannels, `livex_band_live_sync_${bandId}`);
    if (ch) {
      ch.postMessage({
        type: 'LIVEX_BAND_STAGE_SYNC',
        packet: {
          bandId,
          leaderId: '',
          leaderName: '',
          songId: '',
          songTitle: '',
          action: 'LOBBY_LEAVE',
          timestamp: Date.now(),
          currentLineIdx: 0,
          currentWordIdx: 0,
          currentBeat: 0,
          currentBar: 0,
          bpm: 120,
          barsPerLine: 2,
          autoPlay: false,
          version: Date.now(),
          memberPayload: {
            userId,
          } as any,
        },
      });
    }
  } catch (_) {}

  try {
    const db = getFirebaseDb();
    if (db) {
      const attendeeRef = doc(db, 'liveBandSessions', bandId, 'lobby', userId);
      deleteDoc(attendeeRef).catch(() => {});
    }
  } catch (_) {}
}

/**
 * Subscribe to live session broadcasts for a given band
 */
export function subscribeToBandLiveSession(
  bandId: string,
  onPacket: (packet: LiveBandSyncPacket) => void
): () => void {
  if (!bandId) return () => {};

  let lastHandledVersion = -1;
  let lastHandledKey = '';

  const handleIncomingPacket = (packet: LiveBandSyncPacket) => {
    if (!packet || packet.bandId !== bandId) return;

    // Deduplicate identical packets received from dual transports
    const packetKey = `${packet.action}_${packet.timestamp}_${packet.version}_${packet.currentLineIdx}_${packet.currentBeat}`;
    if (packetKey === lastHandledKey) return;
    if (packet.version <= lastHandledVersion && packet.action === 'HEARTBEAT') return;

    lastHandledKey = packetKey;
    if (packet.version > lastHandledVersion) {
      lastHandledVersion = packet.version;
    }

    onPacket(packet);
  };

  // 1. Subscribe to local BroadcastChannel
  const ch = getOrCreateChannel(_liveSyncChannels, `livex_band_live_sync_${bandId}`);
  const onBcMessage = (event: MessageEvent) => {
    if (event?.data?.type === 'LIVEX_BAND_STAGE_SYNC' && event.data.packet) {
      handleIncomingPacket(event.data.packet);
    }
  };

  if (ch) {
    ch.addEventListener('message', onBcMessage);
  }

  // 2. Subscribe to Firestore Document changes
  let unsubFirestore: (() => void) | null = null;
  try {
    const db = getFirebaseDb();
    if (db) {
      const sessionRef = doc(db, 'liveBandSessions', bandId);
      unsubFirestore = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as LiveBandSyncPacket;
            if (data && data.bandId === bandId) {
              handleIncomingPacket(data);
            }
          }
        },
        (error) => {
          console.debug('[BandSyncService] Firestore snapshot listener notice:', error?.message || error);
        }
      );
    }
  } catch (err) {
    console.debug('[BandSyncService] Could not establish Firestore listener:', err);
  }

  return () => {
    if (ch) {
      ch.removeEventListener('message', onBcMessage);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/* ── CLOUD FIRESTORE BAND PERSISTENCE & REALTIME DATA LAYER ── */

/**
 * Create a new band in Firestore and register its join code
 */
export async function createBandRemote(band: Band, leaderMember: BandMember): Promise<void> {
  if (!band || !band.id) return;
  const normalizedCode = band.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Local BroadcastChannel trigger
  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${band.id}`);
    if (ch) {
      ch.postMessage({ type: 'BAND_CREATED', band, leaderMember });
    }
  } catch (_) {}

  try {
    const db = getFirebaseDb();
    if (!db) return;

    // 1. Save main Band document
    const bandRef = doc(db, 'bands', band.id);
    await setDoc(bandRef, cleanPayload(band), { merge: true });

    // 2. Register index code for global fast lookups across devices
    const codeRef = doc(db, 'bandCodes', normalizedCode);
    await setDoc(codeRef, {
      bandId: band.id,
      code: normalizedCode,
      name: band.name,
      leaderId: band.leaderId,
      createdAt: band.createdAt,
    }, { merge: true });

    // 3. Save leader as the first member
    if (leaderMember) {
      const memberRef = doc(db, 'bands', band.id, 'members', leaderMember.id);
      await setDoc(memberRef, cleanPayload(leaderMember), { merge: true });
    }
  } catch (err: any) {
    console.debug('[BandSyncService] createBandRemote fallback/error:', err?.message || err);
  }
}

/**
 * Look up a remote band and its members by join code
 */
export async function lookupBandByCodeRemote(
  rawCode: string
): Promise<{ band: Band; members: BandMember[] } | null> {
  const normalizedCode = rawCode.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalizedCode) return null;

  try {
    const db = getFirebaseDb();
    if (!db) return null;

    // 1. Check bandCodes index
    const codeRef = doc(db, 'bandCodes', normalizedCode);
    const codeSnap = await getDoc(codeRef);

    let bandId = '';
    if (codeSnap.exists()) {
      bandId = codeSnap.data()?.bandId;
    }

    if (!bandId) {
      // Fallback: search bands document directly by ID if code equals bandId
      const directBandRef = doc(db, 'bands', normalizedCode);
      const directSnap = await getDoc(directBandRef);
      if (directSnap.exists()) {
        bandId = directSnap.id;
      }
    }

    if (!bandId) return null;

    // 2. Fetch full band document
    const bandRef = doc(db, 'bands', bandId);
    const bandSnap = await getDoc(bandRef);
    if (!bandSnap.exists()) return null;

    const band = bandSnap.data() as Band;

    // 3. Fetch current member roster
    const membersSnap = await getDocs(collection(db, 'bands', bandId, 'members'));
    const members: BandMember[] = [];
    membersSnap.forEach((docSnap) => {
      if (docSnap.exists()) {
        members.push(docSnap.data() as BandMember);
      }
    });

    return { band, members };
  } catch (err: any) {
    console.debug('[BandSyncService] lookupBandByCodeRemote error:', err?.message || err);
    return null;
  }
}

/**
 * Add a member to a remote band and notify other members
 */
export async function joinBandRemote(bandId: string, member: BandMember): Promise<void> {
  if (!bandId || !member) return;

  // Local broadcast
  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
    if (ch) {
      ch.postMessage({ type: 'MEMBER_JOINED', bandId, member });
    }
  } catch (_) {}

  // Broadcast join packet over live session channel for immediate top toast on other clients
  broadcastBandLivePacket({
    bandId,
    leaderId: '',
    leaderName: '',
    songId: '',
    songTitle: '',
    action: 'MEMBER_JOINED',
    timestamp: Date.now(),
    currentLineIdx: 0,
    currentWordIdx: 0,
    currentBeat: 0,
    currentBar: 0,
    bpm: 120,
    barsPerLine: 2,
    autoPlay: false,
    version: Date.now(),
    memberPayload: member,
  }).catch(() => {});

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const memberRef = doc(db, 'bands', bandId, 'members', member.id);
    await setDoc(memberRef, cleanPayload(member), { merge: true });
  } catch (err: any) {
    console.debug('[BandSyncService] joinBandRemote error:', err?.message || err);
  }
}

/**
 * Share a song to the band's repertoire in Firestore
 */
export async function shareSongRemote(bandId: string, song: SharedSong): Promise<void> {
  if (!bandId || !song || !song.id) return;

  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
    if (ch) {
      ch.postMessage({ type: 'SONG_SHARED', bandId, song });
    }
  } catch (_) {}

  // Broadcast notification packet for instant client awareness
  broadcastBandLivePacket({
    bandId,
    leaderId: song.updatedBy,
    leaderName: song.uploaderName || '',
    songId: song.songId || song.id,
    songTitle: song.title,
    action: 'SONG_SHARED',
    timestamp: Date.now(),
    currentLineIdx: 0,
    currentWordIdx: 0,
    currentBeat: 0,
    currentBar: 0,
    bpm: song.bpm || 120,
    barsPerLine: song.barsPerLine || 2,
    autoPlay: false,
    version: Date.now(),
    songPayload: song,
  }).catch(() => {});

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const songRef = doc(db, 'bands', bandId, 'songs', song.id);
    await setDoc(songRef, cleanPayload(song), { merge: true });
  } catch (err: any) {
    console.debug('[BandSyncService] shareSongRemote error:', err?.message || err);
  }
}

/**
 * Remove a shared song from the band's repertoire in Firestore
 */
export async function removeSharedSongRemote(bandId: string, songId: string): Promise<void> {
  if (!bandId || !songId) return;

  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
    if (ch) {
      ch.postMessage({ type: 'SONG_REMOVED', bandId, songId });
    }
  } catch (_) {}

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const songRef = doc(db, 'bands', bandId, 'songs', songId);
    await deleteDoc(songRef);
  } catch (err: any) {
    console.debug('[BandSyncService] removeSharedSongRemote error:', err?.message || err);
  }
}

/**
 * Save an event/gig to Firestore
 */
export async function saveEventRemote(bandId: string, event: BandEvent): Promise<void> {
  if (!bandId || !event || !event.id) return;

  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
    if (ch) {
      ch.postMessage({ type: 'EVENT_SAVED', bandId, event });
    }
  } catch (_) {}

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const eventRef = doc(db, 'bands', bandId, 'events', event.id);
    await setDoc(eventRef, cleanPayload(event), { merge: true });
  } catch (err: any) {
    console.debug('[BandSyncService] saveEventRemote error:', err?.message || err);
  }
}

/**
 * Delete an event/gig from Firestore
 */
export async function deleteEventRemote(bandId: string, eventId: string): Promise<void> {
  if (!bandId || !eventId) return;

  try {
    const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
    if (ch) {
      ch.postMessage({ type: 'EVENT_DELETED', bandId, eventId });
    }
  } catch (_) {}

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const eventRef = doc(db, 'bands', bandId, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (err: any) {
    console.debug('[BandSyncService] deleteEventRemote error:', err?.message || err);
  }
}

export interface BandRealtimeHandlers {
  onBandUpdate?: (band: Band) => void;
  onMembersUpdate?: (members: BandMember[]) => void;
  onSongsUpdate?: (songs: SharedSong[]) => void;
  onEventsUpdate?: (events: BandEvent[]) => void;
  onMemberJoined?: (member: BandMember) => void;
}

/**
 * Reactive multi-collection subscription for the active band.
 * Listens to band metadata, members, songs, and events with instant snapshot propagation and join detection.
 */
export function subscribeToBandRealtimeData(
  bandId: string,
  handlers: BandRealtimeHandlers,
  currentUserId?: string
): () => void {
  if (!bandId) return () => {};

  const knownMemberIds = new Set<string>();
  let initialMembersLoaded = false;

  // 1. BroadcastChannel local subscriber
  const ch = getOrCreateChannel(_dataSyncChannels, `livex_band_data_${bandId}`);
  const onBcMessage = (e: MessageEvent) => {
    const data = e.data;
    if (!data || data.bandId !== bandId) return;

    if (data.type === 'MEMBER_JOINED' && data.member) {
      if (!knownMemberIds.has(data.member.id)) {
        knownMemberIds.add(data.member.id);
        if (data.member.userId !== currentUserId) {
          handlers.onMemberJoined?.(data.member);
        }
      }
    }
  };

  if (ch) {
    ch.addEventListener('message', onBcMessage);
  }

  // 2. Firestore real-time collection listeners
  const unsubs: (() => void)[] = [];

  try {
    const db = getFirebaseDb();
    if (db) {
      // a) Band doc listener
      const bandRef = doc(db, 'bands', bandId);
      const unsubBand = onSnapshot(bandRef, (snap) => {
        if (snap.exists() && handlers.onBandUpdate) {
          handlers.onBandUpdate(snap.data() as Band);
        }
      }, (err) => {
        console.debug('[BandSyncService] onSnapshot band error:', err?.message || err);
      });
      unsubs.push(unsubBand);

      // b) Members collection listener
      const membersRef = collection(db, 'bands', bandId, 'members');
      const unsubMembers = onSnapshot(membersRef, (snap) => {
        const membersList: BandMember[] = [];
        snap.forEach((docSnap) => {
          if (docSnap.exists()) {
            const m = docSnap.data() as BandMember;
            membersList.push(m);

            if (initialMembersLoaded && !knownMemberIds.has(m.id)) {
              knownMemberIds.add(m.id);
              if (m.userId !== currentUserId) {
                handlers.onMemberJoined?.(m);
              }
            } else {
              knownMemberIds.add(m.id);
            }
          }
        });
        initialMembersLoaded = true;

        if (handlers.onMembersUpdate && membersList.length > 0) {
          // Sort members: leaders first, then by joinedAt
          membersList.sort((a, b) => {
            if (a.role === 'leader' && b.role !== 'leader') return -1;
            if (b.role === 'leader' && a.role !== 'leader') return 1;
            return a.joinedAt - b.joinedAt;
          });
          handlers.onMembersUpdate(membersList);
        }
      }, (err) => {
        console.debug('[BandSyncService] onSnapshot members error:', err?.message || err);
      });
      unsubs.push(unsubMembers);

      // c) Songs collection listener
      const songsRef = collection(db, 'bands', bandId, 'songs');
      const unsubSongs = onSnapshot(songsRef, (snap) => {
        const songsList: SharedSong[] = [];
        snap.forEach((docSnap) => {
          if (docSnap.exists()) {
            songsList.push(docSnap.data() as SharedSong);
          }
        });
        if (handlers.onSongsUpdate) {
          songsList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          handlers.onSongsUpdate(songsList);
        }
      }, (err) => {
        console.debug('[BandSyncService] onSnapshot songs error:', err?.message || err);
      });
      unsubs.push(unsubSongs);

      // d) Events collection listener
      const eventsRef = collection(db, 'bands', bandId, 'events');
      const unsubEvents = onSnapshot(eventsRef, (snap) => {
        const eventsList: BandEvent[] = [];
        snap.forEach((docSnap) => {
          if (docSnap.exists()) {
            eventsList.push(docSnap.data() as BandEvent);
          }
        });
        if (handlers.onEventsUpdate) {
          eventsList.sort((a, b) => a.date.localeCompare(b.date));
          handlers.onEventsUpdate(eventsList);
        }
      }, (err) => {
        console.debug('[BandSyncService] onSnapshot events error:', err?.message || err);
      });
      unsubs.push(unsubEvents);
    }
  } catch (err) {
    console.debug('[BandSyncService] subscribeToBandRealtimeData failed to init Firestore:', err);
  }

  return () => {
    if (ch) {
      ch.removeEventListener('message', onBcMessage);
    }
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch (_) {}
    });
  };
}
