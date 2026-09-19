import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  type Unsubscribe 
} from 'firebase/firestore';
import { getFirebaseDb, waitForFirestoreReady } from '../firebase';
import { StageOperation, Participant } from './Types';
import { enrichAndLogError, CollabDiagnosticsRegistry } from './CollabDiagnostics';

export class FirestoreSync {
  private static async getDb() {
    await waitForFirestoreReady();
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore is not configured');
    return db;
  }

  /**
   * Subscribe to operations in a room.
   * @param sinceTimestamp Only receive operations with timestamp > this value.
   *   Pass 0 (default) to receive all future operations. Pass Date.now() when
   *   joining an existing room to avoid replaying the entire operation history.
   */
  static subscribeOperations(
    roomId: string, 
    onOpAdded: (op: StageOperation) => void,
    onError?: (err: Error) => void,
    sinceTimestamp: number = 0
  ): Unsubscribe {
    let unsub: Unsubscribe | null = null;
    let isUnsubscribed = false;

    this.getDb().then(db => {
      if (isUnsubscribed) return;
      const opsCol = collection(db, 'rooms', roomId, 'operations');
      const opsQuery = sinceTimestamp > 0
        ? query(opsCol, where('timestamp', '>', sinceTimestamp), orderBy('timestamp', 'asc'))
        : query(opsCol, orderBy('timestamp', 'asc'));

      unsub = onSnapshot(opsQuery, (snap) => {
        CollabDiagnosticsRegistry.firstSnapshotReceived = true;
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const op = change.doc.data() as StageOperation;
            onOpAdded(op);
          }
        });
      }, (err) => {
        enrichAndLogError('onSnapshot:operations', err, { roomId });
        console.warn(`[FirestoreSync] Operations subscription error:`, err);
        onError?.(err);
      });
    }).catch(err => {
      enrichAndLogError('getDb:operations', err, { roomId });
      console.warn(`[FirestoreSync] Failed to init db for operations:`, err);
      onError?.(err);
    });

    return () => {
      isUnsubscribed = true;
      if (unsub) unsub();
    };
  }

  static subscribePresence(
    roomId: string,
    onPresenceChange: (participants: Participant[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    let unsub: Unsubscribe | null = null;
    let isUnsubscribed = false;

    this.getDb().then(db => {
      if (isUnsubscribed) return;
      const presenceCol = collection(db, 'rooms', roomId, 'presence');

      unsub = onSnapshot(presenceCol, (snap) => {
        CollabDiagnosticsRegistry.firstSnapshotReceived = true;
        const participants: Participant[] = [];
        snap.forEach((doc) => {
          participants.push(doc.data() as Participant);
        });
        onPresenceChange(participants);
      }, (err) => {
        enrichAndLogError('onSnapshot:presence', err, { roomId });
        console.warn(`[FirestoreSync] Presence subscription error:`, err);
        onError?.(err);
      });
    }).catch(err => {
      enrichAndLogError('getDb:presence', err, { roomId });
      console.warn(`[FirestoreSync] Failed to init db for presence:`, err);
      onError?.(err);
    });

    return () => {
      isUnsubscribed = true;
      if (unsub) unsub();
    };
  }
}
