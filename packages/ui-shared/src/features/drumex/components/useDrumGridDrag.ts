import { useRef } from 'react';
import { type DrumInstrument, type DrumPattern, useDrumStore } from '@workspace/livex-core';
import { drumScheduler } from '@workspace/livex-core';

export const LABEL_W = 104;
export const ROW_H = 44;
export const RULER_H = 28;

type DrumMeasure = DrumPattern['measures'][0];

interface UseDrumGridDragArgs {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  spm: number;
  measuresPerRow: number;
  visibleInsts: DrumInstrument[];
  rowGap: number;
  openBarMenu: string | null;
  setOpenBarMenu: (id: string | null) => void;
  pushUndo: () => void;
  applyHitToCell: (inst: DrumInstrument, m: DrumMeasure, stepInM: number, patternId: string) => void;
  setFocusedInst: (inst: DrumInstrument | null) => void;
  MEASURE_W: number;
  STEP_W: number;
  FULL_SYS_H: number;
}

export function useDrumGridDrag({
  scrollRef,
  spm,
  measuresPerRow,
  visibleInsts,
  rowGap,
  openBarMenu,
  setOpenBarMenu,
  pushUndo,
  applyHitToCell,
  setFocusedInst,
  MEASURE_W,
  STEP_W,
  FULL_SYS_H
}: UseDrumGridDragArgs) {
  const mprRef = useRef(measuresPerRow);
  mprRef.current = measuresPerRow;
  const stepWRef = useRef(STEP_W);
  stepWRef.current = STEP_W;
  const measureWRef = useRef(MEASURE_W);
  measureWRef.current = MEASURE_W;
  const sysHRef = useRef(FULL_SYS_H);
  sysHRef.current = FULL_SYS_H;
  const allInstsRef = useRef(visibleInsts);
  allInstsRef.current = visibleInsts;
  const spmRef = useRef(spm);
  spmRef.current = spm;

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragFilled = useRef<Set<string>>(new Set());
  const activeDragInst = useRef<DrumInstrument | null>(null);

  const resolveCell = (clientX: number, clientY: number, instOverride?: DrumInstrument | null) => {
    const el = scrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left - LABEL_W + el.scrollLeft;
    const cy = clientY - rect.top + el.scrollTop;
    if (cx < 0) return null;
    const sysIdx = Math.floor(cy / sysHRef.current);
    const measureInRow = Math.floor(cx / measureWRef.current);
    const { patterns: pts, activePatternId: actId } = useDrumStore.getState();
    const curPat = pts.find((p) => p.id === actId);
    if (!curPat) return null;
    if (
      sysIdx * mprRef.current + measureInRow < 0 ||
      sysIdx * mprRef.current + measureInRow >= curPat.measures.length
    )
      return null;
    const mIdx = sysIdx * mprRef.current + measureInRow;

    // snapToGrid=false -> quantize to beat rather than subdivision step
    let stepInM = Math.floor((cx % measureWRef.current) / stepWRef.current);
    if (!useDrumStore.getState().drumPrefs.snapToGrid) {
      const spBeat = spmRef.current / 4;
      stepInM = Math.floor(stepInM / spBeat) * spBeat;
    }
    if (stepInM < 0 || stepInM >= spmRef.current) return null;

    const vis = allInstsRef.current;
    let inst: DrumInstrument;
    let instIdx: number;

    if (instOverride) {
      inst = instOverride;
      instIdx = vis.indexOf(inst);
    } else {
      const yInSys = (cy % sysHRef.current) - RULER_H;
      if (yInSys < 0) return null;
      instIdx = -1;
      for (let i = 0; i < vis.length; i++) {
        const top = i * (ROW_H + rowGap);
        const bottom = top + ROW_H;
        if (yInSys >= top && yInSys <= bottom) {
          instIdx = i;
          break;
        }
      }
      if (instIdx === -1) return null;
      inst = vis[instIdx];
    }

    if (instIdx < 0 || instIdx >= vis.length) return null;
    return { inst, m: curPat.measures[mIdx], stepInM, mIdx, instIdx };
  };

  const cancelPointer = () => {
    pointerStart.current = null;
    activeDragInst.current = null;
    isDragging.current = false;
    dragFilled.current.clear();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (openBarMenu) setOpenBarMenu(null);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
    dragFilled.current.clear();

    const cell = resolveCell(e.clientX, e.clientY);
    if (cell) {
      activeDragInst.current = cell.inst;
    } else {
      activeDragInst.current = null;
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!useDrumStore.getState().drumPrefs.dragToFill) return;
    if (!pointerStart.current) return;
    const s = pointerStart.current;
    const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (dist < 8) return; // minimum drag threshold
    if (!isDragging.current) {
      isDragging.current = true;
      pushUndo();
    }
    const cell = resolveCell(e.clientX, e.clientY, activeDragInst.current);
    if (!cell) return;
    const key = `${cell.inst}:${cell.mIdx}:${cell.stepInM}`;
    if (dragFilled.current.has(key)) return; // already filled in this drag
    dragFilled.current.add(key);
    // When dragging, only add notes (don't remove), so use simpleToggleHit-style
    const { patterns: pts, activePatternId: actId, simpleToggleHit } = useDrumStore.getState();
    const curPat = pts.find((p) => p.id === actId);
    if (!curPat) return;
    const existing = cell.m.hits[cell.inst]?.find((h) => h.step === cell.stepInM);
    if (!existing) {
      simpleToggleHit(curPat.id, cell.m.id, cell.inst, cell.stepInM);
      if (drumScheduler.isPlaying)
        drumScheduler.updatePattern(
          useDrumStore.getState().patterns.find((p) => p.id === curPat.id)!
        );
    }
    setFocusedInst(cell.inst);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const s = pointerStart.current;
    if (!s) return;
    pointerStart.current = null;
    const instLock = activeDragInst.current;
    activeDragInst.current = null;
    // If this was a drag-to-fill event, just clean up
    if (isDragging.current) {
      isDragging.current = false;
      dragFilled.current.clear();
      return;
    }
    if (Math.abs(e.clientX - s.x) > 12 || Math.abs(e.clientY - s.y) > 12) return;
    const cell = resolveCell(e.clientX, e.clientY, instLock);
    if (!cell) return;
    const { activePatternId: actId } = useDrumStore.getState();
    if (!actId) return;
    pushUndo();
    applyHitToCell(cell.inst, cell.m, cell.stepInM, actId);
    setFocusedInst(cell.inst);
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, cancelPointer };
}
