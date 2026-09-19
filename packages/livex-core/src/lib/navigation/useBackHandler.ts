import { useEffect } from 'react';
import { BackDispatcher, type BackPriority } from './BackDispatcher';

/**
 * Register a back handler while the component is mounted.
 * Auto-deregisters on unmount. Re-registers when deps change.
 *
 * @example
 *   useBackHandler('modal', () => {
 *     if (!isOpen) return false;
 *     setIsOpen(false);
 *     return true;
 *   }, [isOpen]);
 */
export function useBackHandler(
  priority: BackPriority,
  fn: () => boolean,
  deps: unknown[] = []
): void {
  useEffect(() => {
    return BackDispatcher.register(priority, fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
