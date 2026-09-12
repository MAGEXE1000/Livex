// packages/ui-shared/src/shared/animation/introSignal.ts
// Pure module-level intro completion signal decoupled from any rendering or animation library.

let _introDone = false;
const introSubscribers = new Set<() => void>();

export function subscribeIntroDone(cb: () => void): () => void {
  if (_introDone || (typeof window !== 'undefined' && (window as any).__introDone)) {
    cb();
    return () => {};
  }
  introSubscribers.add(cb);
  return () => {
    introSubscribers.delete(cb);
  };
}

export function triggerIntroReveal(): void {
  _introDone = true;
  if (typeof window !== 'undefined') {
    (window as any).__introDone = true;
  }
  for (const subscriber of introSubscribers) {
    try {
      subscriber();
    } catch (_) {}
  }
}
