import { useState, useRef, useEffect } from 'react';
import type { SongPreset } from '@workspace/livex-core';

export function useDragReorder({
  activePreset,
  updatePreset,
  editorScrollRef,
  ITEM_H
}: {
  activePreset: SongPreset | null;
  updatePreset: (id: string, data: Partial<SongPreset>) => void;
  editorScrollRef: React.RefObject<HTMLDivElement | null>;
  ITEM_H: number;
}) {
  const [localChords, setLocalChords] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const dragStartY = useRef(0);
  const dragStartIdx = useRef(0);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const dragDeltaRef = useRef(0);
  const dragCountRef = useRef(0);
  const instanceKeys = useRef<string[]>([]);
  const localChordsRef = useRef<string[]>([]);
  
  const dragPointerIdRef = useRef<number | null>(null);
  const activePresetIdRef = useRef<string | null>(null);
  const cachedContainerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (dragIdx === null) {
      const chords = activePreset?.chords ?? [];
      instanceKeys.current = chords.map(() => Math.random().toString(36).slice(2));
      localChordsRef.current = [...chords];
      setLocalChords([...chords]);
    }
  }, [activePreset?.chords, dragIdx]);

  const executeDragMove = (clientY: number) => {
    if (dragNodeRef.current === null) return;
    const slot = dragStartIdx.current;

    const containerRect = cachedContainerRectRef.current;
    const screenClampedY = containerRect
      ? Math.max(containerRect.top + 8, Math.min(containerRect.bottom - 8, clientY))
      : clientY;
    const unclamped = screenClampedY - dragStartY.current;
    const minDelta = -slot * ITEM_H;
    const maxDelta = (dragCountRef.current - 1 - slot) * ITEM_H;
    const raw = Math.max(minDelta, Math.min(maxDelta, unclamped));
    dragDeltaRef.current = raw;

    dragNodeRef.current.style.top = `${slot * ITEM_H + 8 + raw}px`;

    const rawTarget = Math.round(raw / ITEM_H) + slot;
    const target = Math.max(0, Math.min(dragCountRef.current - 1, rawTarget));
    if (target !== slot) {
      const newChords = [...localChordsRef.current];
      const newKeys = [...instanceKeys.current];
      const [movedChord] = newChords.splice(slot, 1);
      const [movedKey] = newKeys.splice(slot, 1);
      newChords.splice(target, 0, movedChord);
      newKeys.splice(target, 0, movedKey);

      dragStartY.current += (target - slot) * ITEM_H;
      dragDeltaRef.current = clientY - dragStartY.current;
      dragStartIdx.current = target;
      instanceKeys.current = newKeys;
      localChordsRef.current = newChords;

      setLocalChords(newChords);
      setDragIdx(target);
      setDragDeltaY(dragDeltaRef.current);
    }
  };

  const executeDragEnd = () => {
    cachedContainerRectRef.current = null;
    const presetId = activePresetIdRef.current;
    if (presetId !== null) updatePreset(presetId, { chords: localChordsRef.current });
    dragNodeRef.current = null;
    dragDeltaRef.current = 0;
    dragPointerIdRef.current = null;
    setDragIdx(null);
    setDragDeltaY(0);
  };

  const onDragStart = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    activePresetIdRef.current = activePreset?.id ?? null;
    dragPointerIdRef.current = e.pointerId;
    dragStartY.current = e.clientY;
    dragStartIdx.current = index;
    cachedContainerRectRef.current = editorScrollRef.current?.getBoundingClientRect() ?? null;
    dragDeltaRef.current = 0;
    dragCountRef.current = localChords.length;
    setDragIdx(index);
    setDragDeltaY(0);

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerIdRef.current) return;
      executeDragMove(ev.clientY);
    };
    const handleEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerIdRef.current) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      executeDragEnd();
    };
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };

  return {
    localChords,
    dragIdx,
    dragDeltaY,
    dragNodeRef,
    instanceKeys,
    onDragStart,
  };
}
