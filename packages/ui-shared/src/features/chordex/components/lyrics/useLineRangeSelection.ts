import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { type SongLyricSection } from '@workspace/livex-core';

export function useLineRangeSelection(sections: SongLyricSection[]) {
  const [active, setActive] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  const anchorIdRef = useRef<string | null>(null);
  const prevAnchorSelectionRef = useRef<Set<string>>(new Set());
  const touchStartPosRef = useRef<{ x: number; y: number; id: string } | null>(null);
  const isDraggingRef = useRef(false);

  const flatLineIds = useMemo(() => {
    return sections.flatMap((s) => s.lines.filter((l) => l.type !== 'interlude').map((l) => l.id));
  }, [sections]);

  const enter = useCallback((seedIds: Set<string>) => {
    setActive(true);
    setSelectedLineIds(new Set(seedIds));
    anchorIdRef.current = null;
    isDraggingRef.current = false;
    touchStartPosRef.current = null;
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setSelectedLineIds(new Set());
    anchorIdRef.current = null;
    isDraggingRef.current = false;
    touchStartPosRef.current = null;
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectRange = useCallback(
    (fromId: string, toId: string, baseSelection: Set<string>) => {
      const fromIdx = flatLineIds.indexOf(fromId);
      const toIdx = flatLineIds.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;

      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);

      const next = new Set(baseSelection);
      for (let i = start; i <= end; i++) {
        next.add(flatLineIds[i]);
      }
      setSelectedLineIds(next);
    },
    [flatLineIds]
  );

  /**
   * Pointer/Touch Down handler for line items in batch mode.
   * Records starting coordinates and anchor line without toggling immediately
   * to separate tap toggling from drag range expansion.
   */
  const onPointerDownLine = useCallback(
    (id: string, e: React.PointerEvent | React.TouchEvent) => {
      if (!active) return;

      // Extract client coordinates whether pointer or touch event
      const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX ?? 0;
      const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY ?? 0;

      anchorIdRef.current = id;
      prevAnchorSelectionRef.current = new Set(selectedLineIds);
      touchStartPosRef.current = { x: clientX, y: clientY, id };
      isDraggingRef.current = false;
    },
    [active, selectedLineIds]
  );

  useEffect(() => {
    if (!active) return;

    let rafId: number | null = null;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!touchStartPosRef.current || !anchorIdRef.current) return;

      const delta = Math.hypot(
        clientX - touchStartPosRef.current.x,
        clientY - touchStartPosRef.current.y
      );

      // If finger moved beyond 6px threshold, engage drag selection
      if (delta > 6) {
        isDraggingRef.current = true;
      }

      if (!isDraggingRef.current) return;

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Auto-scroll writing canvas if dragging near viewport boundaries
        if (clientY < 120) {
          window.scrollBy({ top: -14, behavior: 'instant' });
        } else if (clientY > window.innerHeight - 150) {
          window.scrollBy({ top: 14, behavior: 'instant' });
        }

        const el = document.elementFromPoint(clientX, clientY);
        const lineEl = el?.closest('[data-line-id]') as HTMLElement | null;
        if (lineEl && lineEl.dataset.lineId && anchorIdRef.current) {
          selectRange(anchorIdRef.current, lineEl.dataset.lineId, prevAnchorSelectionRef.current);
        }
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        if (isDraggingRef.current) {
          e.preventDefault(); // Stop native scrolling / text selection while actively dragging lines
        }
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleRelease = () => {
      if (touchStartPosRef.current && !isDraggingRef.current) {
        // Tap gesture completed: toggle the targeted line atomically
        const tappedId = touchStartPosRef.current.id;
        setSelectedLineIds((prev) => {
          const next = new Set(prev);
          if (next.has(tappedId)) next.delete(tappedId);
          else next.add(tappedId);
          return next;
        });
      }

      touchStartPosRef.current = null;
      anchorIdRef.current = null;
      isDraggingRef.current = false;
    };

    const onPointerUp = () => handleRelease();
    const onTouchEnd = () => handleRelease();
    const onPointerCancel = () => {
      touchStartPosRef.current = null;
      anchorIdRef.current = null;
      isDraggingRef.current = false;
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('pointercancel', onPointerCancel);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [active, selectRange]);

  return {
    active,
    selectedLineIds,
    enter,
    exit,
    toggle,
    onPointerDownLine,
    selectedCount: selectedLineIds.size,
  };
}
