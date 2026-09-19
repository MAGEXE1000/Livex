import { StageOperation } from './Types';

export class ConflictResolver {
  private appliedOpIds = new Set<string>();
  private elementTimestamps = new Map<string, number>();

  /**
   * Registers that an operation has been applied.
   * Returns true if it was already applied (duplicate).
   */
  checkAndRegisterOp(opId: string): boolean {
    if (this.appliedOpIds.has(opId)) {
      return true; // Already applied
    }
    this.appliedOpIds.add(opId);
    
    // Keep set size bounded (max 5000 items) to prevent memory leaks
    if (this.appliedOpIds.size > 5000) {
      const items = Array.from(this.appliedOpIds);
      const toRemove = items.slice(0, 1000);
      for (const id of toRemove) {
        this.appliedOpIds.delete(id);
      }
    }
    return false;
  }

  /**
   * Resolves whether an incoming operation is valid and should be applied.
   * Uses Last-Write-Wins (LWW) per element.
   */
  shouldApplyOperation(op: StageOperation, currentUserId: string): boolean {
    // 1. Echo filter: Ignore operations created by the current user
    if (op.authorId === currentUserId) {
      return false;
    }

    // 2. Duplicate prevention
    if (this.checkAndRegisterOp(op.id)) {
      return false;
    }

    // 3. Conflict resolution (LWW per element)
    const elementId = op.payload?.id || op.payload?.elementId;
    if (elementId) {
      const lastTs = this.elementTimestamps.get(elementId);
      if (lastTs && op.timestamp < lastTs) {
        // Reject outdated operation
        console.log(`[ConflictResolver] Rejected outdated operation ${op.id} on element ${elementId} (${op.timestamp} < ${lastTs})`);
        return false;
      }
      this.elementTimestamps.set(elementId, op.timestamp);
    }

    return true;
  }

  registerLocalMutation(elementId: string) {
    this.elementTimestamps.set(elementId, Date.now());
  }

  clear() {
    this.appliedOpIds.clear();
    this.elementTimestamps.clear();
  }
}
