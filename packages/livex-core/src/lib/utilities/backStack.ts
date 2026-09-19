import { type BackPriority } from '../navigation/BackDispatcher';
import { useBackHandler } from '../navigation/useBackHandler';
import { BackDispatcher } from '../navigation/BackDispatcher';

export { type BackPriority, useBackHandler };

/**
 * Legacy registry push function, now forwarding directly to BackDispatcher.
 */
export function pushBackHandler(priority: BackPriority, fn: () => boolean): () => void {
  return BackDispatcher.register(priority, fn);
}

/**
 * Legacy trigger function, now forwarding directly to BackDispatcher.
 */
export function handleGlobalBack(): boolean {
  return BackDispatcher.handleBackEvent();
}

/**
 * Legacy setBackHandler stub, now forwarding directly to BackDispatcher.
 */
export function setBackHandler(
  priority: BackPriority,
  handler: (() => boolean) | null
): () => void {
  if (handler) {
    return BackDispatcher.register(priority, handler);
  }
  return () => {};
}
