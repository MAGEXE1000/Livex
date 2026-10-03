import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { type SongLyricSection } from '@workspace/livex-core';

export function useLineRangeSelection(sections: SongLyricSection[]) {
  const [active, setActive] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  
  const anchorIdRef = useRef<string | null>(null);
  const prevAnchorSelectionRef = useRef<Set<string>>(new Set());
  
  const flatLineIds = useMemo(() => {
    return sections.flatMap(s => s.lines.filter(l => l.type !== 'interlude').map(l => l.id));
  }, [sections]);

  const enter = useCallback((seedIds: Set<string>) => {
    setActive(true);
    setSelectedLineIds(new Set(seedIds));
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setSelectedLineIds(new Set());
    anchorIdRef.current = null;
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectRange = useCallback((fromId: string, toId: string, baseSelection: Set<string>) => {
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
  }, [flatLineIds]);

  const onPointerDownLine = useCallback((id: string, e: React.PointerEvent) => {
    if (!active) return;
    e.preventDefault();
    anchorIdRef.current = id;
    
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      prevAnchorSelectionRef.current = next;
      return next;
    });
  }, [active]);

  useEffect(() => {
    if (!active) return;

    let rafId: number | null = null;

    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) {
        anchorIdRef.current = null;
        return;
      }
      
      if (!anchorIdRef.current) return;
      
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const lineEl = el?.closest('[data-line-id]') as HTMLElement;
        if (lineEl) {
          const currentId = lineEl.dataset.lineId;
          if (currentId && anchorIdRef.current) {
            selectRange(anchorIdRef.current, currentId, prevAnchorSelectionRef.current);
          }
        }
      });
    };
    
    const onPointerUp = () => {
      anchorIdRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerup', onPointerUp);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [active, selectRange]);

  return { 
    active, 
    selectedLineIds, 
    enter, 
    exit, 
    toggle, 
    onPointerDownLine, 
    selectedCount: selectedLineIds.size 
  };
}
