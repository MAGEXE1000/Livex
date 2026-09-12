// packages/ui-shared/src/shared/animation/introSignal.ts
// Pure module-level intro completion signal decoupled from any rendering or animation library.

let _introDone = false;
const introSubscribers = new Set<() => void>();

export function isIntroDone(): boolean {
  return _introDone || (typeof window !== 'undefined' && Boolean((window as any).__introDone));
}

export function resetIntroSignal(): void {
  _introDone = false;
  if (typeof window !== 'undefined') {
    (window as any).__introDone = false;
  }
}

export function subscribeIntroDone(cb: () => void): () => void {
  if (isIntroDone()) {
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
  const subs = Array.from(introSubscribers);
  introSubscribers.clear();
  for (const subscriber of subs) {
    try {
      subscriber();
    } catch (_) {}
  }
}
