import type { StageLibraryItem, StageWin } from '../types';
import { useStagexStore } from '../state/useStagexStore';

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function injectAccentVars(iframe: HTMLIFrameElement, from: string, to: string) {
  try {
    const doc = iframe.contentDocument;
    const root = doc?.documentElement;
    if (!root) return;
    const [r, g, b] = hexToRgb(from);
    const [hr, hg, hb] = hexToRgb(to);
    root.style.setProperty('--accent', from);
    root.style.setProperty('--accent-dark', '#fff');
    root.style.setProperty('--accent-08', `rgba(${r},${g},${b},0.08)`);
    root.style.setProperty('--accent-10', `rgba(${r},${g},${b},0.10)`);
    root.style.setProperty('--accent-12', `rgba(${r},${g},${b},0.12)`);
    root.style.setProperty('--accent-14', `rgba(${r},${g},${b},0.14)`);
    root.style.setProperty('--accent-20', `rgba(${r},${g},${b},0.20)`);
    root.style.setProperty('--accent-22', `rgba(${r},${g},${b},0.22)`);
    root.style.setProperty('--accent-30', `rgba(${r},${g},${b},0.30)`);
    root.style.setProperty('--accent-40', `rgba(${r},${g},${b},0.40)`);
    root.style.setProperty('--accent-50', `rgba(${r},${g},${b},0.50)`);
    root.style.setProperty('--accent-60', `rgba(${r},${g},${b},0.60)`);
    root.style.setProperty('--accent-70', `rgba(${r},${g},${b},0.70)`);
    root.style.setProperty('--hot', to);
    root.style.setProperty('--hot-dark', `rgba(${hr},${hg},${hb},0.25)`);
    root.style.setProperty('--hot-10', `rgba(${hr},${hg},${hb},0.10)`);
    root.style.setProperty('--hot-20', `rgba(${hr},${hb},${hb},0.20)`);
  } catch {}
}

export function injectTheme(iframe: HTMLIFrameElement, theme: string) {
  try {
    const root = iframe.contentDocument?.documentElement;
    if (!root) return;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      const win = iframe.contentWindow as
        (Window & { updateCanvasBg?: (c: string) => void }) | null;
      win?.updateCanvasBg?.('#ffffff');
    } else {
      root.removeAttribute('data-theme');
      const win = iframe.contentWindow as
        (Window & { updateCanvasBg?: (c: string) => void }) | null;
      win?.updateCanvasBg?.('#141414');
    }
  } catch {}
}

export function injectAmoled(iframe: HTMLIFrameElement, amoled: boolean) {
  try {
    const root = iframe.contentDocument?.documentElement;
    if (!root) return;
    if (amoled) {
      root.setAttribute('data-amoled', '1');
      const win = iframe.contentWindow as
        (Window & { updateCanvasBg?: (c: string) => void }) | null;
      win?.updateCanvasBg?.('#000000');
    } else {
      root.removeAttribute('data-amoled');
      if (root.getAttribute('data-theme') !== 'light') {
        const win = iframe.contentWindow as
          (Window & { updateCanvasBg?: (c: string) => void }) | null;
        win?.updateCanvasBg?.('#141414');
      }
    }
  } catch {}
}

let _activeIframe: HTMLIFrameElement | null = null;

/**
 * StageBridge: Strongly-typed, contract-based bridge between React and the isolated canvas engine.
 */
export const StageBridge = {
  registerIframe(iframe: HTMLIFrameElement | null): void {
    _activeIframe = iframe;
  },

  getActiveIframe(): HTMLIFrameElement | null {
    return _activeIframe;
  },

  getWin(iframe?: HTMLIFrameElement | null): StageWin | null {
    try {
      const target =
        iframe !== undefined
          ? iframe
          : _activeIframe ||
            (typeof document !== 'undefined'
              ? document.querySelector<HTMLIFrameElement>('iframe[src*="stage-core"]')
              : null);
      return (target?.contentWindow as StageWin) || null;
    } catch {
      return null;
    }
  },

  syncCurrentProjectState(iframe?: HTMLIFrameElement | null): void {
    try {
      const win = this.getWin(iframe) as any;
      if (win) {
        if (typeof win._persistCurrentScene === 'function') {
          win._persistCurrentScene();
        }
        if (typeof win.saveProject === 'function') {
          win.saveProject();
        }
        const st = win.state;
        if (st) {
          const curIdx = typeof st.currentSceneIdx === 'number' ? st.currentSceneIdx : 0;
          const currentScene = Array.isArray(st.scenes) ? st.scenes[curIdx] : null;
          const elements = (currentScene && currentScene.elements) || st.elements || [];
          useStagexStore.setState({
            elements: JSON.parse(JSON.stringify(elements)),
            scenes: Array.isArray(st.scenes) ? JSON.parse(JSON.stringify(st.scenes)) : [],
            currentSceneIdx: curIdx,
          });
          return;
        }
      }
    } catch (err) {
      console.warn('[StageBridge] Failed to sync live project state:', err);
    }
    useStagexStore.getState().reloadFromStorage();
  },

  updateCanvasBg(iframe: HTMLIFrameElement | null, bg: string): void {
    const win = this.getWin(iframe);
    win?.updateCanvasBg?.(bg);
  },

  setStageShape(iframe: HTMLIFrameElement | null, shape: 'rectangular' | 'square'): void {
    const win = this.getWin(iframe);
    win?.setStageShape?.(shape);
  },

  setSnapToGrid(iframe: HTMLIFrameElement | null, snap: boolean): void {
    const win = this.getWin(iframe);
    win?.setSnapToGrid?.(snap);
  },

  setGridVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setGridVisible?.(visible);
  },

  setGridSize(iframe: HTMLIFrameElement | null, size: number): void {
    const win = this.getWin(iframe);
    win?.setGridSize?.(size);
  },

  setConnectionsVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setConnectionsVisible?.(visible);
  },

  setLabelsVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setLabelsVisible?.(visible);
  },

  setShowCableLength(iframe: HTMLIFrameElement | null, show: boolean): void {
    const win = this.getWin(iframe);
    win?.setShowCableLength?.(show);
  },

  setAutoWire(iframe: HTMLIFrameElement | null, autoWire: boolean): void {
    const win = this.getWin(iframe);
    win?.setAutoWire?.(autoWire);
  },

  setStageBalanceVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setStageBalanceVisible?.(visible);
  },

  setStageUnits(iframe: HTMLIFrameElement | null, units: 'meters' | 'feet'): void {
    const win = this.getWin(iframe);
    win?.setStageUnits?.(units);
  },

  setReducedAnimations(iframe: HTMLIFrameElement | null, reduced: boolean): void {
    const win = this.getWin(iframe);
    win?.setReducedAnimations?.(reduced);
  },

  setAudioCoverageVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setAudioCoverageVisible?.(visible);
  },

  setStageGuidesVisible(iframe: HTMLIFrameElement | null, visible: boolean): void {
    const win = this.getWin(iframe);
    win?.setStageGuidesVisible?.(visible);
  },

  syncAllPreferences(iframe: HTMLIFrameElement | null, prefs: any): void {
    const win = this.getWin(iframe);
    win?.syncAllPreferences?.(prefs);
  },

  resetView(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.resetView?.();
  },

  activateMeasure(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.scActivateMeasure?.();
  },

  openPresetsPanel(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.openPresetsPanel?.();
  },

  openTimelinePanel(iframe: HTMLIFrameElement | null): void {
    if (typeof (window as any).__stagexOpenHistory === 'function') {
      (window as any).__stagexOpenHistory();
      return;
    }
    const win = this.getWin(iframe);
    win?.openTimelinePanel?.();
  },

  undo(iframe?: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    win?.undo?.();
    this.syncCurrentProjectState(iframe);
  },

  redo(iframe?: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    win?.redo?.();
    this.syncCurrentProjectState(iframe);
  },

  jumpToHistory(iframe: HTMLIFrameElement | null, index: number): void {
    const win = this.getWin(iframe) as any;
    win?.scJumpToHistory?.(index);
    this.syncCurrentProjectState(iframe);
  },

  getHistoryState(iframe?: HTMLIFrameElement | null): {
    entries: Array<{ index: number; label: string; time?: number }>;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
  } {
    const win = this.getWin(iframe) as any;
    if (!win || !win.state) {
      return { entries: [], currentIndex: -1, canUndo: false, canRedo: false };
    }
    const history: string[] = win.state.history || [];
    const currentIndex: number =
      typeof win.state.historyIndex === 'number' ? win.state.historyIndex : -1;
    const timelineMeta = win._histTimeline || [];
    const entries = history.map((snapStr: string, idx: number) => {
      const meta = timelineMeta[idx] || {};
      let label = meta.label;
      if (!label) {
        try {
          const parsed = JSON.parse(snapStr);
          const count = (parsed.elements || []).length;
          label = count === 0 ? 'Initial Stage' : `${count} elements on stage`;
        } catch {
          label = `Step ${idx + 1}`;
        }
      }
      return {
        index: idx,
        label,
        time: meta.time,
      };
    });
    return {
      entries,
      currentIndex,
      canUndo: currentIndex > 0,
      canRedo: currentIndex >= 0 && currentIndex < entries.length - 1,
    };
  },

  toggleZones(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.scToggleZones?.();
  },

  toggleCableLength(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.scToggleCableLength?.();
  },

  addItemToStage(iframe: HTMLIFrameElement | null, item: StageLibraryItem): void {
    const win = this.getWin(iframe);
    win?.addItemToStage?.(item);
  },

  switchView(iframe: HTMLIFrameElement | null, view: string): void {
    const win = this.getWin(iframe);
    win?.switchView?.(view);
  },

  exportPdf(
    iframe: HTMLIFrameElement | null,
    options: { name: string; includeBackdrop: boolean }
  ): Promise<void> {
    const win = this.getWin(iframe);
    if (win?.exportPDFWithOptions) {
      return win.exportPDFWithOptions(options);
    }
    return Promise.resolve();
  },

  getSceneInfo(
    iframe: HTMLIFrameElement | null
  ): { count: number; currentIdx: number; names: string[] } | null {
    const win = this.getWin(iframe);
    return win?.__getSceneInfo ? win.__getSceneInfo() : null;
  },

  goBack(iframe: HTMLIFrameElement | null): boolean {
    const win = this.getWin(iframe);
    return win?.stageGoBack ? win.stageGoBack() : false;
  },

  hasOpenOverlay(iframe: HTMLIFrameElement | null): boolean {
    const win = this.getWin(iframe);
    return win?.stageHasOpenOverlay ? win.stageHasOpenOverlay() : false;
  },

  openCustomElementModal(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe);
    win?.openCustomElementModal?.();
  },

  getSelectedElement(iframe: HTMLIFrameElement | null): any | null {
    const win = this.getWin(iframe) as any;
    if (!win || !win.state) return null;
    const selectedId = win.state.selectedId;
    if (!selectedId) return null;
    const el = win.state.elements?.find((e: any) => e.id === selectedId);
    return el ? JSON.parse(JSON.stringify(el)) : null;
  },

  updateElement(iframe: HTMLIFrameElement | null, id: any, updates: Record<string, any>): void {
    const win = this.getWin(iframe) as any;
    if (!win || !win.state) return;
    const el = win.state.elements?.find((e: any) => e.id === id);
    if (!el) return;
    Object.assign(el, updates);
    const dom = win.document?.getElementById('elem-' + id);
    if (dom) {
      if (updates.scale !== undefined) {
        dom.style.transform = `translate(-50%,-50%) scale(${el.scale / 100})`;
        const disp = dom.querySelector('.el-scale-display');
        if (disp) disp.textContent = el.scale + '%';
      }
      if (updates.rotation !== undefined) {
        const iconWrap = dom.querySelector('.el-icon-wrap');
        if (iconWrap) iconWrap.style.transform = `rotate(${el.rotation}deg)`;
      }
      if (updates.label !== undefined) {
        const lbl = dom.querySelector('.el-label');
        if (lbl) lbl.textContent = el.label;
      }
      if (updates.color !== undefined) {
        dom.style.setProperty('--el-color', el.color);
        const ico = dom.querySelector('.el-icon');
        if (ico) ico.style.color = el.color;
      }
      if (typeof win.repositionResizeBar === 'function') {
        win.repositionResizeBar(dom);
      }
    }
    if (typeof win.pushHistory === 'function') win.pushHistory();
    if (typeof win.markAutosaveDirty === 'function') win.markAutosaveDirty();
    if (typeof win.renderConnections === 'function') win.renderConnections();
    if (typeof win.saveProject === 'function') win.saveProject();
  },

  duplicateSelected(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    if (typeof win?.duplicateSelected === 'function') {
      win.duplicateSelected();
    } else if (typeof win?.scDuplicateEl === 'function' && win.state?.selectedId) {
      const el = win.state.elements?.find((e: any) => e.id === win.state.selectedId);
      if (el) win.scDuplicateEl(el);
    }
  },

  deleteSelected(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    if (typeof win?.removeSelected === 'function') {
      win.removeSelected();
    } else if (typeof win?.deleteSelectedElement === 'function') {
      win.deleteSelectedElement();
    }
  },

  toggleLockSelected(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    if (typeof win?.scToggleLock === 'function' && win.state?.selectedId) {
      const el = win.state.elements?.find((e: any) => e.id === win.state.selectedId);
      if (el) win.scToggleLock(el);
    }
  },

  togglePinSelected(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    if (typeof win?.scTogglePin === 'function' && win.state?.selectedId) {
      const el = win.state.elements?.find((e: any) => e.id === win.state.selectedId);
      if (el) win.scTogglePin(el);
    }
  },

  savePresetSelected(iframe: HTMLIFrameElement | null): void {
    const win = this.getWin(iframe) as any;
    win?.scSaveAsPreset?.();
  },

  getBandMembers(iframe: HTMLIFrameElement | null): Array<{ id: string; name: string }> {
    const win = this.getWin(iframe) as any;
    if (!win || !win.state) return [];
    const raw = win.state.bandMembers || win.state.members || [];
    return Array.isArray(raw) ? raw : [];
  },

  setLang(iframe: HTMLIFrameElement | null, lang: string): void {
    const targetLang = lang === 'es' ? 'es' : 'en';
    const win = this.getWin(iframe) as any;
    if (typeof win?.setLang === 'function') {
      win.setLang(targetLang);
    } else if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'sc-set-lang', lang: targetLang }, '*');
    }
  },
};
