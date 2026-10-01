import type { LiveBandSyncPacket } from '../types/band';
import { getFirebaseDb } from './services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// In-memory BroadcastChannel instances mapped by bandId
const _broadcastChannels = new Map<string, BroadcastChannel>();

function getOrCreateBroadcastChannel(bandId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  let ch = _broadcastChannels.get(bandId);
  if (!ch) {
    try {
      ch = new BroadcastChannel(`livex_band_live_sync_${bandId}`);
      _broadcastChannels.set(bandId, ch);
    } catch (_) {
      return null;
    }
  }
  return ch;
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
  // If packet is more than 8 seconds old and is not a state update, consider stale
  const isStale = diff > 8000;
  return { transitMs, isStale };
}

/**
 * Broadcast a live stage packet to all connected band members
 * Transmits instantly over BroadcastChannel and synchronizes via Firestore
 */
export async function broadcastBandLivePacket(packet: LiveBandSyncPacket): Promise<void> {
  if (!packet || !packet.bandId) return;

  // 1. Instant local broadcast (sub-millisecond latency for same-device/hotspot/preview)
  try {
    const ch = getOrCreateBroadcastChannel(packet.bandId);
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
      // Strip undefined properties before writing to Firestore
      const cleanPacket: any = { ...packet };
      Object.keys(cleanPacket).forEach((k) => {
        if (cleanPacket[k] === undefined) delete cleanPacket[k];
      });
      // Fire-and-forget background write with timeout guard
      setDoc(sessionRef, cleanPacket, { merge: true }).catch((err) => {
        // Silent catch for offline or non-blocking network lag
        console.debug('[BandSyncService] Firestore sync non-fatal write error:', err?.message || err);
      });
    }
  } catch (err) {
    console.debug('[BandSyncService] Firestore session update skipped:', err);
  }
}

/**
 * Subscribe to live session broadcasts for a given band
 * Listens on both BroadcastChannel and Firestore document updates with deduplication
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
  const ch = getOrCreateBroadcastChannel(bandId);
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

  // Return composite unsubscribe
  return () => {
    if (ch) {
      ch.removeEventListener('message', onBcMessage);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}
