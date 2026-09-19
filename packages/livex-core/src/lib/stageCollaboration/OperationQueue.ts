import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseDb, waitForFirestoreReady } from '../firebase';
import { StageOperation } from './Types';
import { enrichAndLogError, CollabDiagnosticsRegistry } from './CollabDiagnostics';

/** Max number of consecutive flush failures before an operation is dropped. */
const MAX_RETRIES = 5;

/** Backoff base delay in ms — doubles on each retry (1s → 2s → 4s → 8s → 16s). */
const BASE_RETRY_MS = 1000;

interface QueuedOp {
  op: StageOperation;
  roomId: string;
  retries: number;
}

export class OperationQueue {
  private queue: QueuedOp[] = [];
  private processing = false;
  private isOffline = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOffline = false;
        this.flush();
      });
      window.addEventListener('offline', () => {
        this.isOffline = true;
      });
      this.isOffline = !navigator.onLine;
    }
  }

  enqueue(op: StageOperation, roomId: string) {
    this.queue.push({ op, roomId, retries: 0 });
    this.flush();
  }

  private async flush() {
    if (this.processing || this.isOffline || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    try {
      await waitForFirestoreReady();
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore is not configured');

      while (this.queue.length > 0 && !this.isOffline) {
        const item = this.queue[0];

        const opRef = doc(db, 'rooms', item.roomId, 'operations', item.op.id);
        
        try {
          await setDoc(opRef, {
            id: item.op.id,
            authorId: item.op.authorId,
            timestamp: item.op.timestamp,
            type: item.op.type,
            payload: item.op.payload,
          });
          // Success — remove from queue
          this.queue.shift();
          CollabDiagnosticsRegistry.firstWriteCompleted = true;
        } catch (writeErr: any) {
          const code = writeErr?.code || '';
          // Permanent errors: don't retry, drop the operation
          if (code === 'permission-denied' || code === 'not-found' || code === 'invalid-argument' || code === 'unauthenticated') {
            console.error(`[OperationQueue] Permanent error writing op ${item.op.id}, dropping:`, writeErr);
            CollabDiagnosticsRegistry.finalFailureReason = `Permanent error: ${code}`;
            enrichAndLogError('setDoc:operationQueue:drop', writeErr, { roomId: item.roomId });
            this.queue.shift();
            continue;
          }
          // Transient error: increment retry counter
          item.retries++;
          CollabDiagnosticsRegistry.retryCount = item.retries;
          CollabDiagnosticsRegistry.retryReason = writeErr.message || String(writeErr);
          
          if (item.retries >= MAX_RETRIES) {
            console.error(`[OperationQueue] Op ${item.op.id} failed after ${MAX_RETRIES} retries, dropping:`, writeErr);
            CollabDiagnosticsRegistry.finalFailureReason = `Max retries reached (${MAX_RETRIES})`;
            enrichAndLogError('setDoc:operationQueue:max_retries', writeErr, { roomId: item.roomId });
            this.queue.shift();
            continue;
          }
          // Break out of the while loop to retry after backoff
          throw writeErr;
        }
      }
    } catch (e: any) {
      // Determine backoff delay from the head-of-queue retry count
      const retryCount = this.queue.length > 0 ? this.queue[0].retries : 1;
      const delay = Math.min(BASE_RETRY_MS * Math.pow(2, retryCount - 1), 30000);
      CollabDiagnosticsRegistry.backoffDelay = delay;
      console.warn(`[OperationQueue] Flush failed (retry ${retryCount}/${MAX_RETRIES}), next attempt in ${delay}ms:`, e);
      enrichAndLogError('setDoc:operationQueue:retry_backoff', e, { roomId: this.queue[0]?.roomId });
      this.processing = false;
      if (this.queue.length > 0 && !this.isOffline) {
        setTimeout(() => this.flush(), delay);
      }
      return;
    } finally {
      this.processing = false;
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
}
