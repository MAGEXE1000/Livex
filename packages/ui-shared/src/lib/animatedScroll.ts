/**
 * Interruptible, duration-bound auto-scroll for teleprompter / practice views.
 *
 * Replaces `scrollTo({ behavior: 'smooth' })`, whose duration is browser-defined, which restarts on
 * every call and which cannot be cancelled by the user's own touch. Layout is read once per call
 * (never per frame); each frame only writes `scrollTop`. Native touch/wheel panning stays available
 * and immediately cancels the running animation, so the user is never fought by autoplay.
 */
const running = new WeakMap<HTMLElement, number>();
const guarded = new WeakSet<HTMLElement>();

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function cancelAnimatedScroll(el: HTMLElement): void {
  const id = running.get(el);
  if (id !== undefined) {
    cancelAnimationFrame(id);
    running.delete(el);
  }
}

export function animateScrollTop(el: HTMLElement, target: number, durationMs = 450): void {
  cancelAnimatedScroll(el);

  if (!guarded.has(el)) {
    guarded.add(el);
    const cancel = (): void => cancelAnimatedScroll(el);
    el.addEventListener('touchstart', cancel, { passive: true });
    el.addEventListener('wheel', cancel, { passive: true });
    el.addEventListener('pointerdown', cancel, { passive: true });
  }

  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  const to = Math.min(max, Math.max(0, target));
  const from = el.scrollTop;
  const distance = to - from;

  if (Math.abs(distance) < 1 || durationMs <= 0 || prefersReducedMotion()) {
    el.scrollTop = to;
    return;
  }

  const startedAt = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.scrollTop = from + distance * eased;
    if (t < 1) {
      running.set(el, requestAnimationFrame(step));
    } else {
      running.delete(el);
    }
  };
  running.set(el, requestAnimationFrame(step));
}
