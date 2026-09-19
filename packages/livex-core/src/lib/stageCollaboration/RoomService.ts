import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { getFirebaseDb, waitForFirestoreReady } from '../firebase';
import { CollaboratorRoom } from './Types';
import { serializeStage } from './StageSerializer';
import { enrichAndLogError, CollabDiagnosticsRegistry } from './CollabDiagnostics';

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function handleRoomServiceError(context: string, err: any) {
  const code = err?.code || 'unknown';
  const msg = err?.message || String(err);
  if (code === 'unavailable' || code === 'not-found' || msg.toLowerCase().includes('offline') || msg.toLowerCase().includes('database') || msg.toLowerCase().includes('not found')) {
    console.warn(`[RoomService] ${context} - Firestore is offline or database is not provisioned (Code: ${code}).`);
  } else {
    console.error(`[RoomService] ${context} - Unexpected error:`, err);
  }
}

export class RoomService {
  private static async getDb() {
    await waitForFirestoreReady();
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore is not configured');
    return db;
  }

  static async createRoom(hostId: string): Promise<CollaboratorRoom> {
    console.log('[RoomService] createRoom START for hostId:', hostId);
    const db = await this.getDb();
    console.log('[RoomService] getDb() success');
    const roomId = doc(collection(db, 'rooms')).id;
    console.log('[RoomService] Generated new roomId:', roomId);
    
    let shortCode = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      shortCode = generateShortCode();
      console.log(`[RoomService] Attempt ${attempts + 1}: Generated shortCode candidate: ${shortCode}`);
      const codeRef = doc(db, 'roomCodes', shortCode);
      console.log(`[RoomService] Checking shortCode codeRef: roomCodes/${shortCode}`);
      try {
        const codeSnap = await getDoc(codeRef);
        console.log(`[RoomService] getDoc for shortCode snap exists: ${codeSnap.exists()}`);
        if (!codeSnap.exists()) {
          isUnique = true;
        }
      } catch (err: any) {
        const code = err?.code || '';
        const msg = (err?.message || '').toLowerCase();
        if (code === 'unavailable' || code === 'not-found' || msg.includes('offline') || msg.includes('database')) {
          console.warn(`[RoomService] Firestore offline/unprovisioned during shortCode check. Accepting generated shortCode ${shortCode} for local room.`);
          isUnique = true;
        } else {
          enrichAndLogError('getDoc:roomCodes', err, { shortCode });
          handleRoomServiceError(`Checking shortCode uniqueness (attempt ${attempts + 1})`, err);
          throw err;
        }
      }
      attempts++;
    }
    if (!shortCode || !isUnique) {
      console.error('[RoomService] Failed to generate a unique room code after 10 attempts');
      throw new Error('Failed to generate a unique room code');
    }

    const now = Date.now();
    console.log('[RoomService] Serializing current stage state...');
    const currentStage = serializeStage(hostId);
    console.log('[RoomService] Stage serialized successfully');

    const room: CollaboratorRoom = {
      roomId,
      shortCode,
      hostId,
      currentStageVersion: 1,
      lastHeartbeat: now,
      createdAt: now,
      updatedAt: now,
      snapshot: currentStage,
    };

    try {
      console.log(`[RoomService] Writing roomCodes document: roomCodes/${shortCode}`);
      try {
        await setDoc(doc(db, 'roomCodes', shortCode), { roomId, createdAt: now });
      } catch (err: any) {
        enrichAndLogError('setDoc:roomCodes', err, { roomId, shortCode });
        throw err;
      }
      console.log('[RoomService] Wrote roomCodes document successfully');

      console.log(`[RoomService] Writing rooms document: rooms/${roomId}`);
      try {
        await setDoc(doc(db, 'rooms', roomId), room);
      } catch (err: any) {
        enrichAndLogError('setDoc:rooms', err, { roomId, shortCode });
        throw err;
      }
      console.log('[RoomService] Wrote rooms document successfully');
      CollabDiagnosticsRegistry.firstWriteCompleted = true;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = (err?.message || '').toLowerCase();
      if (code === 'unavailable' || code === 'not-found' || msg.includes('offline') || msg.includes('database')) {
        console.warn('[RoomService] Firestore offline/unprovisioned during room write. Room state created locally.');
      } else {
        handleRoomServiceError('Writing room/roomCode documents', err);
        throw err;
      }
    }

    console.log('[RoomService] createRoom SUCCESS, room:', room);
    return room;
  }

  static async getRoomIdFromCode(shortCode: string): Promise<string | null> {
    const cleanCode = shortCode.toUpperCase().trim();
    console.log(`[DIAG-ROOM] getRoomIdFromCode START for code: ${cleanCode}. navigator.onLine=${typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'}`);
    const db = await this.getDb();
    const codeRef = doc(db, 'roomCodes', cleanCode);
    try {
      const codeSnap = await getDoc(codeRef);
      console.log(`[RoomService] getRoomIdFromCode codeRef exists: ${codeSnap.exists()}`);
      if (!codeSnap.exists()) return null;
      const roomId = codeSnap.data().roomId || null;
      console.log('[RoomService] getRoomIdFromCode resolved roomId:', roomId);
      return roomId;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = (err?.message || '').toLowerCase();
      if (code === 'unavailable' || code === 'not-found' || msg.includes('offline') || msg.includes('database')) {
        console.warn('[RoomService] Firestore offline/unprovisioned during getRoomIdFromCode.');
        return null;
      }
      enrichAndLogError('getDoc:roomCodes', err, { shortCode: cleanCode });
      handleRoomServiceError('getRoomIdFromCode', err);
      throw err;
    }
  }

  static async getRoom(roomId: string): Promise<CollaboratorRoom | null> {
    console.log('[RoomService] getRoom START for roomId:', roomId);
    const db = await this.getDb();
    const roomRef = doc(db, 'rooms', roomId);
    try {
      const roomSnap = await getDoc(roomRef);
      console.log(`[RoomService] getRoom snap exists: ${roomSnap.exists()}`);
      if (!roomSnap.exists()) return null;
      const room = roomSnap.data() as CollaboratorRoom;
      console.log('[RoomService] getRoom success');
      return room;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = (err?.message || '').toLowerCase();
      if (code === 'unavailable' || code === 'not-found' || msg.includes('offline') || msg.includes('database')) {
        console.warn('[RoomService] Firestore offline/unprovisioned during getRoom.');
        return null;
      }
      enrichAndLogError('getDoc:rooms', err, { roomId });
      handleRoomServiceError('getRoom', err);
      throw err;
    }
  }

  static async updateRoomHeartbeat(roomId: string) {
    const db = await this.getDb();
    const roomRef = doc(db, 'rooms', roomId);
    try {
      await updateDoc(roomRef, {
        lastHeartbeat: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      throw enrichAndLogError('updateDoc:rooms:heartbeat', err, { roomId });
    }
  }

  static async deleteRoom(roomId: string, shortCode: string) {
    const db = await this.getDb();
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      await deleteDoc(doc(db, 'roomCodes', shortCode.toUpperCase().trim()));
    } catch (err: any) {
      throw enrichAndLogError('deleteDoc:room', err, { roomId, shortCode });
    }
  }

  static async runTTLPruning() {
    const db = await this.getDb();
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('lastHeartbeat', '<', twentyFourHoursAgo)
    );
    
    try {
      const snaps = await getDocs(roomsQuery);
      for (const d of snaps.docs) {
        const room = d.data() as CollaboratorRoom;
        try {
          await this.deleteRoom(room.roomId, room.shortCode);
          console.log(`[RoomService] Pruned inactive room ${room.roomId} (${room.shortCode})`);
        } catch (delErr: any) {
          enrichAndLogError('deleteRoom:pruning', delErr, { roomId: room.roomId, shortCode: room.shortCode });
        }
      }
    } catch (e: any) {
      enrichAndLogError('getDocs:rooms:pruning', e);
      console.warn('[RoomService] Error pruning old rooms:', e);
    }
  }
}
