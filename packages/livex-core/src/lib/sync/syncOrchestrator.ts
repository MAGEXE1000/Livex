export type SyncPhase = 'idle' | 'pending' | 'running' | 'retry' | 'failed' | 'completed' | 'syncing' | 'success' | 'error';

export interface SyncState {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  lastError: string | null;
  pendingCount: number;
  retryCount: number;
}

type SyncStateListener = (state: SyncState) => void;

class SyncOrchestratorClass {
  private state: SyncState = {
    phase: 'idle',
    lastSyncedAt: null,
    lastError: null,
    pendingCount: 0,
    retryCount: 0,
  };

  private listeners = new Set<SyncStateListener>();
  private inFlightRunPromise: Promise<void> | null = null;
  private hasPendingFollowup = false;
  private currentEpoch = 0;
  private maxRetries = 3;

  public getState(): SyncState {
    return { ...this.state };
  }

  public incrementEpoch(): number {
    this.currentEpoch++;
    return this.currentEpoch;
  }

  public getEpoch(): number {
    return this.currentEpoch;
  }

  public updateState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  public subscribe(listener: SyncStateListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async enqueueRun(runFn: () => Promise<void>): Promise<void> {
    if (this.inFlightRunPromise) {
      if (!this.hasPendingFollowup) {
        this.hasPendingFollowup = true;
        this.updateState({ phase: 'pending', pendingCount: this.state.pendingCount + 1 });
      }
      return this.inFlightRunPromise;
    }

    this.updateState({ phase: 'running', lastError: null });

    this.inFlightRunPromise = (async () => {
      let attempts = 0;
      let success = false;

      while (attempts <= this.maxRetries && !success) {
        try {
          attempts++;
          await runFn();
          success = true;
          this.updateState({
            phase: 'completed',
            lastSyncedAt: Date.now(),
            pendingCount: Math.max(0, this.state.pendingCount - 1),
            retryCount: 0,
          });

          // Auto revert back to idle phase after 2s
          setTimeout(() => {
            if (this.state.phase === 'completed') {
              this.updateState({ phase: 'idle' });
            }
          }, 2000);
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          if (attempts <= this.maxRetries) {
            this.updateState({
              phase: 'retry',
              lastError: errMsg,
              retryCount: attempts,
            });
            // Backoff delay
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          } else {
            // Terminal failure - state set to failed
            this.updateState({
              phase: 'failed',
              lastError: errMsg,
            });
          }
        }
      }

      this.inFlightRunPromise = null;

      if (this.hasPendingFollowup) {
        this.hasPendingFollowup = false;
        void this.enqueueRun(runFn);
      }
    })();

    return this.inFlightRunPromise;
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }
}

export const SyncOrchestrator = new SyncOrchestratorClass();
