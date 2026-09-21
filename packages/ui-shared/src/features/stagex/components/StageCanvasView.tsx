import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useIsWebDesktop,
  useT,
  authRepository,
  CollaborationService,
  registerStageIframe,
  getFirebaseConfigDetails,
  getFirestoreDiagnostics,
  APP_VERSION,
  lockOrientation,
  setNavHidden,
  setNavLocked,
  useBackHandler,
  useBottomNavigationStore,
  useSettingsStore,
} from '@workspace/livex-core';
import { StageToolbar } from './StageToolbar';
import { StageLibraryPanel } from './StageLibraryPanel';
import { StagexRightSidebar, type RightSidebarTab } from './StagexRightSidebar';
import { StageBottomPanelSlot } from './StageBottomPanelSlot';
import { StageElementLibrarySurface } from './StageElementLibrarySurface';
import { StageHistorySurface } from './StageHistorySurface';
import { StageElementSpecsEditor } from './StageElementSpecsEditor';
import { StageCollabDialog } from './dialogs/StageCollabDialog';
import {
  StageBridge,
  injectTheme,
  injectAmoled,
  injectAccentVars,
} from '../services/StageBridgeService';
import { useStagexStore } from '../state/useStagexStore';
import SmartLoading from '../../../shared/loading/SmartLoading';
import { resolveAccent } from '@workspace/livex-core';

export interface StageCanvasViewProps {
  isLight: boolean;
  isAmoled: boolean;
  accentColor: string;
  stageBg: string;
  liveMode: boolean;
  setLiveMode: (val: boolean) => void;
  onNavigateView?: (view: string) => void;
}

export const isAllowedStagexOrigin = (origin: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (!origin) return false;
  if (origin === window.location.origin) return true;
  if (origin === 'https://localhost' || origin === 'capacitor://localhost') return true;
  if (window.location.origin === 'null' && origin === 'null') return true;
  return false;
};

export const getStagexTargetOrigin = (): string => {
  if (typeof window === 'undefined') return '*';
  return window.location.origin === 'null' ? '*' : window.location.origin;
};

export const StageCanvasView: React.FC<StageCanvasViewProps> = ({
  isLight,
  isAmoled,
  accentColor,
  stageBg,
  liveMode,
  setLiveMode,
  onNavigateView,
}) => {
  const isWebDesktop = useIsWebDesktop();
  const t = useT();
  const tr = t as any;
  const accent = resolveAccent(accentColor);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Desktop Right Stage Elements & Specs Sidebar State
  const [rightSidebarTab, setRightSidebarTab] = useState<RightSidebarTab>('elements');
  const [isRightSidebarHovered, setIsRightSidebarHovered] = useState(false);
  const [isRightSidebarPinned, setIsRightSidebarPinned] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const rightSidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [customElements, setCustomElements] = useState<any[]>([]);

  // The sidebar expands when hovered, pinned, actively searching, or search input focused
  const isRightSidebarExpanded =
    isRightSidebarPinned ||
    isRightSidebarHovered ||
    isSearchFocused;

  const handleRightSidebarMouseEnter = useCallback(() => {
    if (rightSidebarTimeoutRef.current) {
      clearTimeout(rightSidebarTimeoutRef.current);
      rightSidebarTimeoutRef.current = null;
    }
    setIsRightSidebarHovered(true);
  }, []);

  const handleRightSidebarMouseLeave = useCallback(() => {
    if (isRightSidebarPinned || isSearchFocused) return;
    if (rightSidebarTimeoutRef.current) {
      clearTimeout(rightSidebarTimeoutRef.current);
    }
    rightSidebarTimeoutRef.current = setTimeout(() => {
      setIsRightSidebarHovered(false);
    }, 280);
  }, [isRightSidebarPinned, isSearchFocused]);

  const handleTogglePinSidebar = useCallback(() => {
    setIsRightSidebarPinned((prev) => !prev);
  }, []);

  const handleCollapseSidebar = useCallback(() => {
    setIsRightSidebarPinned(false);
    setIsRightSidebarHovered(false);
    setIsSearchFocused(false);
  }, []);

  // Floating controls & Bottom Drawer State
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'elements' | 'history'>('elements');
  const [historyState, setHistoryState] = useState<{
    entries: any[];
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
  }>({
    entries: [],
    currentIndex: -1,
    canUndo: false,
    canRedo: false,
  });
  const [isLandscape, setIsLandscape] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);

  // Layers Floating Surface State
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<
    Record<string, { label: string; labelEs: string; color: string; visible: boolean }>
  >({
    stage: { label: 'Stage Layout', labelEs: 'Escenario', color: '#7aafff', visible: true },
    audio: { label: 'Audio', labelEs: 'Audio', color: '#ff7439', visible: true },
    power: { label: 'Power', labelEs: 'Energía', color: '#c5ffc9', visible: true },
    connections: { label: 'Connections', labelEs: 'Conexiones', color: '#c8a2ff', visible: true },
    utilities: { label: 'Utilities', labelEs: 'Utilidades', color: '#ffd700', visible: true },
  });
  const layersRef = useRef<HTMLDivElement>(null);

  const userExitedLandscapeRef = useRef(false);

  // Sync orientation changes with isLandscape and inform stage-core (Mobile only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Desktop Web uses normal canonical workspace and must never enter mobile landscape mode
    if (isWebDesktop) {
      document.body.classList.remove('is-landscape');
      setIsLandscape(false);
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'sc-landscape', isLandscape: false },
          getStagexTargetOrigin()
        );
      }
      return;
    }

    const mql = window.matchMedia('(orientation: landscape)');
    const handleOrientation = () => {
      const isWindowLandscape =
        mql.matches || (window.innerWidth > window.innerHeight && window.innerWidth > 600);
      if (!isWindowLandscape) {
        userExitedLandscapeRef.current = false;
      }
      const active = isWindowLandscape && !userExitedLandscapeRef.current;
      if (active) {
        document.body.classList.add('is-landscape');
      } else {
        document.body.classList.remove('is-landscape');
      }
      setIsLandscape((prev) => {
        if (prev !== active) {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { type: 'sc-landscape', isLandscape: active },
              getStagexTargetOrigin()
            );
          }
          return active;
        }
        return prev;
      });
    };
    handleOrientation();
    if (mql.addEventListener) {
      mql.addEventListener('change', handleOrientation);
    } else {
      (mql as any).addListener?.(handleOrientation);
    }
    window.addEventListener('resize', handleOrientation);
    return () => {
      document.body.classList.remove('is-landscape');
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleOrientation);
      } else {
        (mql as any).removeListener?.(handleOrientation);
      }
      window.removeEventListener('resize', handleOrientation);
    };
  }, [isWebDesktop]);

  // Listen for selection and specs events from the canvas engine
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!isAllowedStagexOrigin(e.origin)) return;
      if (!iframeRef.current?.contentWindow || e.source !== iframeRef.current.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;

      const type = e.data.type;
      if (type === 'sc-element-selected') {
        const el = e.data.element && typeof e.data.element === 'object' ? e.data.element : null;
        setSelectedElement(el);
        if (!el) {
          setSpecsOpen(false);
        } else if (isWebDesktop) {
          setRightSidebarTab('specs');
        }
      } else if (type === 'sc-open-specs') {
        if (e.data.element && typeof e.data.element === 'object') {
          setSelectedElement(e.data.element);
        } else if (iframeRef.current) {
          const el = StageBridge.getSelectedElement(iframeRef.current);
          if (el) setSelectedElement(el);
        }
        if (isWebDesktop) {
          setRightSidebarTab('specs');
          setIsRightSidebarPinned(true);
        }
      } else if (type === 'sc-drag-start') {
        setIsCanvasDragging(true);
      } else if (type === 'sc-drag-end') {
        setIsCanvasDragging(false);
      } else if (type === 'sc-canvas-rescaled') {
        if (Array.isArray(e.data.elements)) {
          useStagexStore.setState({
            elements: e.data.elements,
            scenes:
              Array.isArray(e.data.scenes) && e.data.scenes.length > 0
                ? e.data.scenes
                : useStagexStore.getState().scenes,
          });
        }
      } else if (type === 'sc-project-saved') {
        if (Array.isArray(e.data.elements)) {
          const rawName =
            typeof e.data.name === 'string'
              ? e.data.name
              : typeof e.data.projectName === 'string'
                ? e.data.projectName
                : undefined;
          const newName = rawName ? rawName.slice(0, 120) : undefined;
          const currentSceneIdx =
            typeof e.data.currentSceneIdx === 'number' &&
            Number.isFinite(e.data.currentSceneIdx) &&
            e.data.currentSceneIdx >= 0
              ? Math.floor(e.data.currentSceneIdx)
              : useStagexStore.getState().currentSceneIdx;

          useStagexStore.setState({
            ...(newName ? { projectName: newName } : {}),
            elements: e.data.elements,
            scenes:
              Array.isArray(e.data.scenes) && e.data.scenes.length > 0
                ? e.data.scenes
                : useStagexStore.getState().scenes,
            currentSceneIdx,
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Ensure bottom navigation reflects landscape, inspection mode, element picker drawer, specs editor, and drag state
  useEffect(() => {
    if (isWebDesktop) return;
    const shouldHide = isLandscape || liveMode || panelOpen || specsOpen || isCanvasDragging;
    setNavLocked(shouldHide);
    setNavHidden(shouldHide);
    useBottomNavigationStore.getState().setLocked(shouldHide);
  }, [isLandscape, liveMode, panelOpen, specsOpen, isCanvasDragging, isWebDesktop]);

  // Clean up orientation lock and navigation state on unmount
  useEffect(() => {
    return () => {
      if (!isWebDesktop) {
        lockOrientation('portrait').catch(() => {});
      }
      setNavLocked(false);
      setNavHidden(false);
      useBottomNavigationStore.getState().setLocked(false);
    };
  }, [isWebDesktop]);

  // Collaboration state
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [shortCodeInput, setShortCodeInput] = useState('');
  const [collabRoom, setCollabRoom] = useState<any>(null);
  const [collabParticipants, setCollabParticipants] = useState<any[]>([]);
  const [collabState, setCollabState] = useState<any>('disconnected');
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabErrorTimestamp, setCollabErrorTimestamp] = useState<string | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabDiagExpanded, setCollabDiagExpanded] = useState(false);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const callIframe = useCallback((fn: string, arg?: any) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const targetOrigin = getStagexTargetOrigin();
    try {
      const win = iframe.contentWindow as any;
      if (!win) return;
      if (typeof win[fn] === 'function') {
        win[fn](arg);
      } else {
        iframe.contentWindow?.postMessage({ type: 'sc-call', fn, arg }, targetOrigin);
      }
    } catch {
      iframe.contentWindow?.postMessage({ type: 'sc-call', fn, arg }, targetOrigin);
    }
  }, []);

  // Dismiss Layers popup, Specs editor, bottom panel (drawer/history), or selection on Android hardware back button
  // In landscape editing mode, intercept back events to safely consume them and prevent accidental exit
  useBackHandler(
    'overlay',
    () => {
      if (layersOpen) {
        setLayersOpen(false);
        return true;
      }
      if (specsOpen) {
        setSpecsOpen(false);
        return true;
      }
      if (panelOpen) {
        setPanelOpen(false);
        return true;
      }
      if (selectedElement) {
        callIframe('deselectAll');
        setSelectedElement(null);
        return true;
      }
      if (isLandscape) {
        // Safe lock: In landscape editing mode, consume back event to prevent accidental exit
        return true;
      }
      return false;
    },
    [layersOpen, specsOpen, panelOpen, selectedElement, isLandscape, callIframe]
  );

  // Close Layers popup when clicking outside
  useEffect(() => {
    if (!layersOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setLayersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [layersOpen]);

  const handleToggleLayers = useCallback(() => {
    setLayersOpen((prev) => {
      const next = !prev;
      if (next && iframeRef.current) {
        try {
          const win = iframeRef.current.contentWindow as any;
          if (win?.LAYERS) {
            setLayers((current) => {
              const updated = { ...current };
              for (const k of Object.keys(updated)) {
                if (win.LAYERS[k] && typeof win.LAYERS[k].visible === 'boolean') {
                  updated[k] = { ...updated[k], visible: win.LAYERS[k].visible };
                }
              }
              return updated;
            });
          }
        } catch {}
      }
      return next;
    });
  }, []);

  const handleToggleLayer = useCallback(
    (key: string) => {
      setLayers((prev) => {
        const nextVis = !prev[key].visible;
        callIframe('setLayer', { key, visible: nextVis });
        return {
          ...prev,
          [key]: { ...prev[key], visible: nextVis },
        };
      });
    },
    [callIframe]
  );

  const handleClearStage = useCallback(() => {
    callIframe('clearStage');
  }, [callIframe]);

  const refreshHistoryState = useCallback(() => {
    if (!iframeRef.current) return;
    const hist = StageBridge.getHistoryState(iframeRef.current);
    if (hist) {
      setHistoryState(hist);
    }
  }, []);

  const handleToggleHistory = useCallback(() => {
    if (panelOpen && panelMode === 'history') {
      setPanelOpen(false);
    } else {
      setPanelMode('history');
      setPanelOpen(true);
      refreshHistoryState();
    }
  }, [panelOpen, panelMode, refreshHistoryState]);

  const handleToggleElements = useCallback(() => {
    if (panelOpen && panelMode === 'elements') {
      setPanelOpen(false);
    } else {
      setPanelMode('elements');
      setPanelOpen(true);
    }
  }, [panelOpen, panelMode]);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: 'elements' | 'history') => {
      setPanelMode(nextMode);
      if (nextMode === 'history') {
        refreshHistoryState();
      }
    },
    [refreshHistoryState]
  );

  const handleUndo = useCallback(() => {
    StageBridge.undo(iframeRef.current);
    refreshHistoryState();
  }, [refreshHistoryState]);

  const handleRedo = useCallback(() => {
    StageBridge.redo(iframeRef.current);
    refreshHistoryState();
  }, [refreshHistoryState]);

  const handleJumpToHistory = useCallback(
    (index: number) => {
      StageBridge.jumpToHistory(iframeRef.current, index);
      refreshHistoryState();
    },
    [refreshHistoryState]
  );

  // Global hooks & event listeners for history changes from iframe
  useEffect(() => {
    (window as any).__stagexOpenHistory = () => {
      setPanelMode('history');
      setPanelOpen(true);
      refreshHistoryState();
    };
    (window as any).__stagexCloseHistory = () => {
      setPanelOpen(false);
    };
    (window as any).__stagexOnHistoryChange = () => {
      refreshHistoryState();
    };

    const handleHistoryEvents = (e: MessageEvent) => {
      if (!isAllowedStagexOrigin(e.origin)) return;
      if (!iframeRef.current?.contentWindow || e.source !== iframeRef.current.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'stagex-open-history') {
        setPanelMode('history');
        setPanelOpen(true);
        refreshHistoryState();
      } else if (e.data.type === 'stagex-history-changed') {
        refreshHistoryState();
      }
    };
    window.addEventListener('message', handleHistoryEvents);

    return () => {
      delete (window as any).__stagexOpenHistory;
      delete (window as any).__stagexCloseHistory;
      delete (window as any).__stagexOnHistoryChange;
      window.removeEventListener('message', handleHistoryEvents);
    };
  }, [refreshHistoryState]);

  const handleAddElement = useCallback(
    (item: any) => {
      StageBridge.addItemToStage(iframeRef.current, item);
      refreshHistoryState();
    },
    [refreshHistoryState]
  );

  const handleExitLandscape = useCallback(async () => {
    if (isWebDesktop) return;
    userExitedLandscapeRef.current = true;
    setIsLandscape(false);
    document.body.classList.remove('is-landscape');
    if (panelOpen) setPanelOpen(false);
    if (specsOpen) setSpecsOpen(false);
    const shouldHide = liveMode;
    setNavLocked(shouldHide);
    setNavHidden(shouldHide);
    useBottomNavigationStore.getState().setLocked(shouldHide);
    if (!isWebDesktop) {
      try {
        await lockOrientation('portrait');
      } catch {}
    }
    callIframe('sc-landscape', { isLandscape: false });
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'sc-landscape', isLandscape: false },
        getStagexTargetOrigin()
      );
    }
  }, [liveMode, panelOpen, specsOpen, callIframe, isWebDesktop]);

  const handleToggleRotate = useCallback(async () => {
    if (isWebDesktop) return;
    if (isLandscape) {
      await handleExitLandscape();
    } else {
      userExitedLandscapeRef.current = false;
      setIsLandscape(true);
      document.body.classList.add('is-landscape');
      if (panelOpen) setPanelOpen(false);
      if (specsOpen) setSpecsOpen(false);
      setNavLocked(true);
      setNavHidden(true);
      useBottomNavigationStore.getState().setLocked(true);
      if (!isWebDesktop) {
        try {
          await lockOrientation('landscape');
        } catch {}
      }
      callIframe('sc-landscape', { isLandscape: true });
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'sc-landscape', isLandscape: true },
          getStagexTargetOrigin()
        );
      }
    }
  }, [isLandscape, handleExitLandscape, panelOpen, specsOpen, callIframe, isWebDesktop]);

  const handleToggleEye = useCallback(() => {
    const next = !liveMode;
    setLiveMode(next);
    if (panelOpen) setPanelOpen(false);
    if (specsOpen) setSpecsOpen(false);
    const shouldHide = next || isLandscape;
    setNavLocked(shouldHide);
    setNavHidden(shouldHide);
    callIframe('toggleGigMode');
    if (!next) {
      callIframe('resetView');
    }
  }, [liveMode, isLandscape, panelOpen, specsOpen, setLiveMode, callIframe]);

  const handleUpdateElement = useCallback(
    (updates: Record<string, any>) => {
      if (!selectedElement) return;
      StageBridge.updateElement(iframeRef.current, selectedElement.id, updates);
      setSelectedElement((prev: any) => (prev ? { ...prev, ...updates } : null));

      // Keep useStagexStore elements synchronized in real time
      const store = useStagexStore.getState();
      const currentList = store.elements || [];
      const exists = currentList.some((e) => e.id === selectedElement.id);
      const nextElements = exists
        ? currentList.map((e) => (e.id === selectedElement.id ? { ...e, ...updates } : e))
        : [...currentList, { ...selectedElement, ...updates }];
      useStagexStore.setState({ elements: nextElements });

      // Keep localStorage stagecoreProject synchronized
      try {
        const raw = localStorage.getItem('stagecoreProject');
        if (raw) {
          const proj = JSON.parse(raw);
          const updated = (proj.elements || []).map((e: any) =>
            e.id === selectedElement.id ? { ...e, ...updates } : e
          );
          proj.elements = updated;
          const sceneIdx =
            typeof proj.currentSceneIdx === 'number' &&
            Number.isInteger(proj.currentSceneIdx) &&
            proj.currentSceneIdx >= 0
              ? proj.currentSceneIdx
              : 0;
          if (
            Array.isArray(proj.scenes) &&
            sceneIdx < proj.scenes.length &&
            proj.scenes[sceneIdx] &&
            typeof proj.scenes[sceneIdx] === 'object'
          ) {
            proj.scenes[sceneIdx].elements = updated;
          }
          localStorage.setItem('stagecoreProject', JSON.stringify(proj));
        }
      } catch {}
    },
    [selectedElement]
  );

  const handleDuplicateElement = useCallback(() => {
    StageBridge.duplicateSelected(iframeRef.current);
  }, []);

  const handleDeleteElement = useCallback(() => {
    StageBridge.deleteSelected(iframeRef.current);
    setSelectedElement(null);
    setSpecsOpen(false);
  }, []);

  const handleToggleLock = useCallback(() => {
    StageBridge.toggleLockSelected(iframeRef.current);
    setSelectedElement((prev: any) => (prev ? { ...prev, locked: !prev.locked } : null));
  }, []);

  const handleTogglePin = useCallback(() => {
    StageBridge.togglePinSelected(iframeRef.current);
    setSelectedElement((prev: any) => (prev ? { ...prev, pinned: !prev.pinned } : null));
  }, []);

  const handleSavePreset = useCallback(() => {
    StageBridge.savePresetSelected(iframeRef.current);
  }, []);

  const bandMembers = useMemo(() => {
    return StageBridge.getBandMembers(iframeRef.current);
  }, [iframeRef.current, specsOpen]);

  // Update canvas background and theme attributes on theme changes
  useEffect(() => {
    if (!iframeRef.current) return;
    injectTheme(iframeRef.current, isLight ? 'light' : 'dark');
    injectAmoled(iframeRef.current, isAmoled);
    StageBridge.updateCanvasBg(iframeRef.current, stageBg);
    try {
      const win = iframeRef.current.contentWindow as any;
      if (typeof win?._renderStageLayout === 'function') {
        win._renderStageLayout();
      }
    } catch {}
  }, [stageBg, isLight, isAmoled]);

  // Update canvas accent color variables on global accent changes
  useEffect(() => {
    if (!iframeRef.current) return;
    injectAccentVars(iframeRef.current, accent.from, accent.to);
  }, [accent.from, accent.to]);

  // Load custom elements
  const loadCustomElements = useCallback(() => {
    try {
      const raw = localStorage.getItem('stagex_custom_elements');
      if (raw) setCustomElements(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    loadCustomElements();
  }, [loadCustomElements]);

  // Register stage iframe with core service
  useEffect(() => {
    registerStageIframe(iframeRef.current);
    if (iframeRef.current) {
      StageBridge.registerIframe(iframeRef.current);
    }
    return () => registerStageIframe(null);
  }, []);

  // Collaboration subscriptions
  useEffect(() => {
    const unsubAuth = authRepository.subscribeAuth(setCurrentUser);
    const service = CollaborationService.getInstance();

    setCollabState(service.getConnectionState());
    setCollabRoom(service.getActiveRoom());
    setCollabParticipants(service.getParticipants());

    const unsubState = service.subscribeConnectionState(setCollabState);
    const unsubRoom = service.subscribeRoom(setCollabRoom);
    const unsubPresence = service.subscribePresence(setCollabParticipants);

    return () => {
      unsubAuth();
      unsubState();
      unsubRoom();
      unsubPresence();
    };
  }, []);

  const openProductionDocumentWorkflow = useCallback(() => {
    StageBridge.syncCurrentProjectState(iframeRef.current);
    onNavigateView?.('Export');
  }, [onNavigateView]);


  const preferences = useStagexStore((s) => s.preferences);
  const stageShape = preferences?.stageShape || 'rectangular';

  const currentLang = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = currentLang === 'es';
  const isHistoryActive = panelOpen && panelMode === 'history';

  // Handle iframe load
  const handleIframeLoad = () => {
    setIframeLoading(false);
    if (iframeRef.current) {
      registerStageIframe(iframeRef.current);
      StageBridge.registerIframe(iframeRef.current);
      injectTheme(iframeRef.current, isLight ? 'light' : 'dark');
      injectAmoled(iframeRef.current, isAmoled);
      injectAccentVars(iframeRef.current, accent.from, accent.to);
      StageBridge.updateCanvasBg(iframeRef.current, stageBg);
      StageBridge.setLang(iframeRef.current, currentLang);
      StageBridge.syncAllPreferences(iframeRef.current, preferences);
      callIframe('resetView');
      refreshHistoryState();
      try {
        const win = iframeRef.current.contentWindow as any;
        if (typeof win?._renderStageLayout === 'function') {
          win._renderStageLayout();
        }
      } catch {}
    }
  };

  useEffect(() => {
    callIframe('resetView');
  }, [callIframe]);

  useEffect(() => {
    if (!iframeLoading && iframeRef.current) {
      StageBridge.syncAllPreferences(iframeRef.current, preferences);
    }
  }, [preferences, iframeLoading]);

  useEffect(() => {
    if (!iframeLoading && iframeRef.current) {
      StageBridge.setLang(iframeRef.current, currentLang);
    }
  }, [currentLang, iframeLoading]);

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: stageBg }}
    >
      {/* Desktop Top Toolbar */}
      {isWebDesktop && (
        <StageToolbar
          curView="Editor"
          isLight={isLight}
          tr={tr}
          callIframe={callIframe}
          transitionToView={(v) =>
            v === 'Export' ? openProductionDocumentWorkflow() : onNavigateView?.(v)
          }
          openPdfSheet={openProductionDocumentWorkflow}
          collabState={collabState}
          onOpenCollab={() => setCollabModalOpen(true)}
          onOpenHistory={handleToggleHistory}
        />
      )}

      {/* Seamless Floating Actions (Overlaid on canvas in mobile mode) */}
      {!isWebDesktop && !liveMode && (
        <div
          className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex items-center justify-end px-4 gap-2"
          style={{
            paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
          }}
        >
          {/* TopBar Container (Pill + Morphing Layers Popup) */}
          <div className="relative">
            <div
              className="stagex-floating-actions-pill pointer-events-auto flex items-center gap-1 p-1 rounded-full"
              style={{
                background: 'var(--surface-pill-bg)',
                border: 'var(--surface-pill-border)',
                backdropFilter: 'var(--surface-pill-backdrop)',
                WebkitBackdropFilter: 'var(--surface-pill-backdrop)',
                boxShadow: 'var(--surface-pill-shadow)',
              }}
            >
              {/* 0. Layers (Far-left action) */}
              <button
                type="button"
                data-testid="stagex-layers-btn"
                onClick={handleToggleLayers}
                title={tr.stagex?.layers || (isSpanish ? 'Capas' : 'Layers')}
                aria-label={tr.stagex?.layers || (isSpanish ? 'Capas' : 'Layers')}
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                style={{
                  color: layersOpen
                    ? 'var(--accent, #7aafff)'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.75)'
                      : 'rgba(255, 255, 255, 0.85)',
                  background: layersOpen ? 'rgba(122, 175, 255, 0.15)' : undefined,
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  layers
                </span>
              </button>

              {/* Exit Landscape Button (Active in landscape mode) */}
              {isLandscape && (
                <button
                  type="button"
                  data-testid="stagex-exit-landscape-btn"
                  onClick={handleExitLandscape}
                  title={currentLang === 'es' ? 'Salir de Modo Horizontal' : 'Exit Landscape'}
                  aria-label={currentLang === 'es' ? 'Salir de Modo Horizontal' : 'Exit Landscape'}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-all shadow-md flex-shrink-0 cursor-pointer"
                  style={{
                    background: 'var(--c-accent-to, var(--studio-accent, #007aff))',
                    color: 'var(--studio-accent-contrast, #ffffff)',
                  }}
                >
                  <span className="material-symbols-outlined text-[15px]">screen_rotation</span>
                  <span className="whitespace-nowrap">{currentLang === 'es' ? 'Salir' : 'Exit'}</span>
                </button>
              )}

              {/* 1. Ruler */}
              <button
                type="button"
                data-testid="stagex-ruler-btn"
                onClick={() => callIframe('scActivateMeasure')}
                title={tr.stagex?.toolMeasure || 'Measure'}
                aria-label={tr.stagex?.toolMeasure || 'Measure'}
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                style={{
                  color: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  straighten
                </span>
              </button>

              {/* 2. Cloud (Collaboration) */}
              <button
                type="button"
                data-testid="stagex-collab-btn"
                onClick={() => setCollabModalOpen(true)}
                title="Collaboration"
                aria-label="Collaboration"
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                style={{
                  color:
                    collabState === 'connected'
                      ? '#10b981'
                      : isLight
                        ? 'rgba(0,0,0,0.75)'
                        : 'rgba(255,255,255,0.85)',
                  background: collabState === 'connected' ? 'rgba(16,185,129,0.15)' : undefined,
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  {collabState === 'connected' ? 'cloud' : 'cloud_queue'}
                </span>
              </button>

              {/* 3. History */}
              <button
                type="button"
                data-testid="stagex-history-btn"
                onClick={handleToggleHistory}
                title={tr.stagex?.toolHistory || 'History'}
                aria-label={tr.stagex?.toolHistory || 'History'}
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                style={{
                  color: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                  background:
                    panelOpen && panelMode === 'history'
                      ? isLight
                        ? 'rgba(0, 0, 0, 0.12)'
                        : 'rgba(255, 255, 255, 0.18)'
                      : undefined,
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  history
                </span>
              </button>

              {/* 4. Stage Position Reset */}
              <button
                type="button"
                data-testid="stagex-reset-view-btn"
                onClick={() => callIframe('resetView')}
                title={tr.stagex?.resetView || 'Reset View'}
                aria-label={tr.stagex?.resetView || 'Reset View'}
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                style={{
                  color: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  filter_center_focus
                </span>
              </button>

              {/* 5. PDF (rightmost action) */}
              <button
                type="button"
                data-testid="stagex-export-doc-btn"
                onClick={openProductionDocumentWorkflow}
                title={tr.stagex?.productionDoc || 'Production Document (PDF)'}
                aria-label={tr.stagex?.productionDoc || 'Production Document (PDF)'}
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                style={{
                  color: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <span className="material-symbols-outlined text-[17px] select-none block overflow-hidden leading-none">
                  picture_as_pdf
                </span>
              </button>
            </div>

            {/* Morphing Layers Surface Popup */}
            <AnimatePresence>
              {layersOpen && (
                <motion.div
                  ref={layersRef}
                  key="stagex-layers-popup"
                  initial={{ opacity: 0, scale: 0.9, y: -6, transformOrigin: 'top left' }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                  className="absolute top-[calc(100%+8px)] left-0 z-30 pointer-events-auto w-56 p-3 rounded-2xl flex flex-col gap-1.5 shadow-2xl"
                  style={{
                    background: isLight
                      ? 'rgba(255, 255, 255, 0.94)'
                      : isAmoled
                        ? '#000000'
                        : 'var(--surface-pill-bg, rgba(20, 20, 24, 0.92))',
                    border: 'var(--surface-pill-border)',
                    backdropFilter: 'var(--surface-pill-backdrop, blur(24px))',
                    WebkitBackdropFilter: 'var(--surface-pill-backdrop, blur(24px))',
                    boxShadow: 'var(--surface-pill-shadow, 0 16px 36px rgba(0,0,0,0.35))',
                  }}
                >
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-black/10 dark:border-white/10">
                    <span
                      className="font-headline text-[10px] font-extrabold uppercase tracking-wider select-none"
                      style={{
                        color: isLight ? '#64748b' : '#a1a1aa',
                      }}
                    >
                      {isSpanish ? 'Capas en escenario' : 'Show on stage'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLayersOpen(false)}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      style={{ color: isLight ? '#64748b' : '#a1a1aa' }}
                    >
                      <span className="material-symbols-outlined text-[13px] leading-none">close</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    {Object.entries(layers).map(([key, item]) => {
                      const isVis = item.visible;
                      return (
                        <button
                          key={key}
                          type="button"
                          data-testid={`stagex-layer-toggle-${key}`}
                          onClick={() => handleToggleLayer(key)}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl transition-all select-none cursor-pointer"
                          style={{
                            background: isVis
                              ? isLight
                                ? 'rgba(0, 0, 0, 0.04)'
                                : 'rgba(255, 255, 255, 0.06)'
                              : 'transparent',
                            opacity: isVis ? 1 : 0.45,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: item.color,
                                boxShadow: isVis ? `0 0 8px ${item.color}66` : 'none',
                              }}
                            />
                            <span
                              className="text-[12px] font-medium truncate"
                              style={{
                                color: isLight ? '#1e293b' : '#f4f4f5',
                              }}
                            >
                              {isSpanish ? item.labelEs : item.label}
                            </span>
                          </div>
                          <span
                            className="material-symbols-outlined text-[16px] flex-shrink-0"
                            style={{
                              color: isVis ? item.color : isLight ? '#94a3b8' : '#71717a',
                            }}
                          >
                            {isVis ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dedicated Circular Trash Control */}
          <button
            type="button"
            data-testid="stagex-clear-stage-btn"
            onClick={handleClearStage}
            title={tr.stagex?.clearStage || (isSpanish ? 'Limpiar escenario' : 'Clear stage')}
            aria-label={tr.stagex?.clearStage || (isSpanish ? 'Limpiar escenario' : 'Clear stage')}
            className="stagex-floating-trash-btn pointer-events-auto w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-lg"
            style={{
              background: 'var(--surface-pill-bg)',
              border: 'var(--surface-pill-border)',
              backdropFilter: 'var(--surface-pill-backdrop)',
              WebkitBackdropFilter: 'var(--surface-pill-backdrop)',
              boxShadow: 'var(--surface-pill-shadow)',
              color: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            }}
          >
            <span className="material-symbols-outlined text-[19px] select-none block overflow-hidden leading-none">
              delete
            </span>
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative w-full h-full">
        {/* Canvas Host Container */}
        <div
          className={`flex-1 min-w-0 relative overflow-hidden ${
            isWebDesktop ? 'm-3 rounded-xl border' : ''
          }`}
          style={{
            borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
            background: 'transparent',
          }}
        >
          <iframe
            ref={iframeRef}
            src="/stage-core/index.html"
            title="Stagex Canvas Engine"
            onLoad={handleIframeLoad}
            className="w-full h-full border-none block relative z-0"
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          />

          {iframeLoading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: stageBg }}
            >
              <SmartLoading app="stagex" />
            </div>
          )}
        </div>

        {/* Desktop Collapsible Right Sidebar (Elements & Specs) */}
        {isWebDesktop && (
          <StagexRightSidebar
            isLight={isLight}
            isAmoled={isAmoled}
            accent={accent}
            isExpanded={isRightSidebarExpanded}
            isPinned={isRightSidebarPinned}
            onTogglePin={handleTogglePinSidebar}
            onClose={handleCollapseSidebar}
            onMouseEnter={handleRightSidebarMouseEnter}
            onMouseLeave={handleRightSidebarMouseLeave}
            onAnimationComplete={() => {
              callIframe('_triggerRescale');
            }}
            handleAddElement={handleAddElement}
            customElements={customElements}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
            onToggleLock={handleToggleLock}
            onTogglePinElement={handleTogglePin}
            onSavePreset={handleSavePreset}
            bandMembers={bandMembers}
            onDeselectElement={() => {
              callIframe('deselectAll');
              setSelectedElement(null);
            }}
            activeTab={rightSidebarTab}
            setActiveTab={setRightSidebarTab}
            onSearchFocusChange={setIsSearchFocused}
          />
        )}
      </div>

      {/* Mobile Floating Action Controls */}
      {!isWebDesktop && (
        <>
          {/* Normal Mode Controls: Rotate & Add FAB (hidden in liveMode, when specs is open) */}
          {!liveMode && !specsOpen && (
            <>
              {/* Rotation Toggle - hidden when panel is open */}
              {!panelOpen && (
                <button
                  data-testid="stagex-rotate-btn"
                  onClick={handleToggleRotate}
                  className="absolute rounded-full z-20 flex items-center justify-center p-0 cursor-pointer transition-all active:scale-95"
                  style={{
                    bottom: 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 196px)',
                    right: 'calc(max(16px, env(safe-area-inset-right, 0px)))',
                    width: 44,
                    height: 44,
                    background: isLandscape
                      ? 'var(--c-accent-to, var(--studio-accent, #007aff))'
                      : isAmoled
                        ? 'rgba(10, 10, 12, 0.88)'
                        : isLight
                          ? 'rgba(255, 255, 255, 0.85)'
                          : 'rgba(20, 20, 26, 0.80)',
                    border: isLandscape
                      ? '1px solid var(--c-accent-to, var(--studio-accent, #007aff))'
                      : isAmoled
                        ? '1px solid rgba(255, 255, 255, 0.12)'
                        : isLight
                          ? '1px solid rgba(0, 0, 0, 0.08)'
                          : '1px solid rgba(255, 255, 255, 0.10)',
                    color: isLandscape ? 'var(--studio-accent-contrast, #ffffff)' : isLight ? '#09090b' : '#ffffff',
                    boxShadow: isLandscape
                      ? 'var(--c-accent-glow, var(--studio-accent-glow, 0 4px 14px rgba(0, 122, 255, 0.45)))'
                      : '0 4px 16px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'var(--surface-float-blur)',
                    WebkitBackdropFilter: 'var(--surface-float-blur)',
                  }}
                  aria-label={
                    isLandscape
                      ? currentLang === 'es'
                        ? 'Salir de Modo Horizontal'
                        : 'Exit Landscape'
                      : 'Switch to Landscape'
                  }
                  title={
                    isLandscape
                      ? currentLang === 'es'
                        ? 'Salir de Modo Horizontal'
                        : 'Exit Landscape'
                      : 'Switch to Landscape'
                  }
                >
                  <span className="material-symbols-outlined text-[22px]">sync</span>
                </button>
              )}

              {/* Add Element FAB - strictly hidden when panel is open */}
              {!panelOpen && (
                <button
                  data-testid="stagex-fab-add"
                  onClick={handleToggleElements}
                  className="absolute rounded-full flex items-center justify-center p-0 cursor-pointer active:scale-95 transition-all"
                  style={{
                    zIndex: 20,
                    bottom: 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 84px)',
                    right: 'calc(max(16px, env(safe-area-inset-right, 0px)))',
                    width: 44,
                    height: 44,
                    background: 'var(--c-accent-to, var(--studio-accent, #007aff))',
                    border: 'none',
                    color: 'var(--studio-accent-contrast, #ffffff)',
                    boxShadow: 'var(--c-accent-glow, var(--studio-accent-glow, 0 4px 14px rgba(0, 122, 255, 0.45)))',
                  }}
                  aria-label={currentLang === 'es' ? 'Añadir Elemento' : 'Add Element'}
                  title={currentLang === 'es' ? 'Añadir Elemento' : 'Add Element'}
                >
                  <span className="material-symbols-outlined text-[24px]">add</span>
                </button>
              )}
            </>
          )}

          {/* Live Mode Toggle (Eye) - Hidden when drawer is open or specs is open */}
          {!panelOpen && !specsOpen && (
            <button
              data-testid="stagex-eye-btn"
              onClick={handleToggleEye}
              className="absolute rounded-full z-20 flex items-center justify-center p-0 cursor-pointer active:scale-95 transition-all"
              style={{
                bottom: liveMode
                  ? 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 24px)'
                  : 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 140px)',
                right: 'calc(max(16px, env(safe-area-inset-right, 0px)))',
                width: 44,
                height: 44,
                background: liveMode
                  ? 'var(--c-accent-to, var(--studio-accent, #007aff))'
                  : isAmoled
                    ? 'rgba(10, 10, 12, 0.88)'
                    : isLight
                      ? 'rgba(255, 255, 255, 0.85)'
                      : 'rgba(20, 20, 26, 0.80)',
                border: liveMode
                  ? '1px solid var(--c-accent-to, var(--studio-accent, #007aff))'
                  : isAmoled
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : isLight
                      ? '1px solid rgba(0, 0, 0, 0.08)'
                      : '1px solid rgba(255, 255, 255, 0.10)',
                color: liveMode ? 'var(--studio-accent-contrast, #ffffff)' : isLight ? '#09090b' : '#ffffff',
                boxShadow: liveMode
                  ? 'var(--c-accent-glow, var(--studio-accent-glow, 0 4px 14px rgba(0, 122, 255, 0.45)))'
                  : '0 4px 16px rgba(0, 0, 0, 0.35)',
                backdropFilter: 'var(--surface-float-blur)',
                WebkitBackdropFilter: 'var(--surface-float-blur)',
              }}
              aria-label={liveMode ? 'Exit Inspection Mode' : 'Enter Inspection Mode'}
              title={liveMode ? 'Exit Inspection Mode' : 'Enter Inspection Mode'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {liveMode ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
        </>
      )}

      {/* Canonical Bottom Panel Slot hosting Element Library or History Surface */}
      <StageBottomPanelSlot
        isOpen={panelOpen && !liveMode && (!isWebDesktop || isHistoryActive)}
        onClose={handleClosePanel}
        isLight={isLight}
        isAmoled={isAmoled}
        ariaLabel={isHistoryActive ? 'Stage History Panel' : 'Stage Element Catalog'}
        testId="stagex-element-drawer"
      >
        {isHistoryActive ? (
          <StageHistorySurface
            onClose={handleClosePanel}
            historyEntries={historyState.entries}
            currentIndex={historyState.currentIndex}
            canUndo={historyState.canUndo}
            canRedo={historyState.canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onJumpToHistory={handleJumpToHistory}
            isLight={isLight}
            isAmoled={isAmoled}
            isSpanish={currentLang === 'es'}
          />
        ) : (
          <StageElementLibrarySurface
            onClose={handleClosePanel}
            onSelectElement={handleAddElement}
            isLight={isLight}
            isAmoled={isAmoled}
            accent={accent}
          />
        )}
      </StageBottomPanelSlot>

      {/* Mobile Selected Element Specs Pill Button */}
      {!isWebDesktop && selectedElement && !panelOpen && !specsOpen && !liveMode && (
        <button
          data-testid="stagex-specs-btn"
          onClick={() => setSpecsOpen(true)}
          className="absolute z-30 flex items-center gap-2 h-10 px-3.5 rounded-full cursor-pointer active:scale-95 transition-all"
          style={{
            bottom: 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 84px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: isAmoled
              ? 'rgba(10, 10, 14, 0.90)'
              : isLight
                ? 'rgba(255, 255, 255, 0.92)'
                : 'rgba(20, 20, 26, 0.88)',
            border: isAmoled
              ? '1px solid rgba(255, 255, 255, 0.14)'
              : isLight
                ? '1px solid rgba(0, 0, 0, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: isLight
              ? '0 4px 16px rgba(0, 0, 0, 0.12)'
              : '0 4px 20px rgba(0, 0, 0, 0.50)',
            backdropFilter: 'var(--surface-float-blur)',
            WebkitBackdropFilter: 'var(--surface-float-blur)',
          }}
          aria-label="Edit Specs"
          title="Edit Specs"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: selectedElement.color || '#6B97FF' }}
          />
          <span
            className="text-[12px] font-bold max-w-[120px] truncate"
            style={{ color: isLight ? '#09090b' : '#ffffff' }}
          >
            {selectedElement.label || selectedElement.name}
          </span>
          <span
            className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: 'var(--c-accent-mid, var(--studio-accent, #007aff))' }}
          >
            Specs
            <span className="material-symbols-outlined text-[15px]">tune</span>
          </span>
        </button>
      )}

      {/* Compact Floating Specs Editor (Mobile only) */}
      {!isWebDesktop && (
        <StageElementSpecsEditor
          isOpen={specsOpen && !!selectedElement}
          element={selectedElement}
          onClose={() => setSpecsOpen(false)}
          onUpdateElement={handleUpdateElement}
          onDuplicate={handleDuplicateElement}
          onDelete={handleDeleteElement}
          onToggleLock={handleToggleLock}
          onTogglePin={handleTogglePin}
          onSavePreset={handleSavePreset}
          bandMembers={bandMembers}
          isLight={isLight}
          isAmoled={isAmoled}
          accent={accent}
        />
      )}


      {/* Collaboration Dialog */}
      <StageCollabDialog
        open={collabModalOpen}
        onClose={() => !collabLoading && setCollabModalOpen(false)}
        currentUser={currentUser}
        collabState={collabState}
        collabRoom={collabRoom}
        collabParticipants={collabParticipants}
        collabLoading={collabLoading}
        collabError={collabError}
        collabErrorTimestamp={collabErrorTimestamp}
        collabDiagExpanded={collabDiagExpanded}
        setCollabDiagExpanded={setCollabDiagExpanded}
        pendingOpsCount={pendingOpsCount}
        shortCodeInput={shortCodeInput}
        setShortCodeInput={setShortCodeInput}
        onHostSession={async () => {
          if (!currentUser?.uid) return;
          setCollabLoading(true);
          setCollabError(null);
          try {
            await CollaborationService.getInstance().createRoom(
              currentUser.uid,
              {
                displayName: currentUser.displayName || 'Stage Host',
                avatar: currentUser.photoURL || '',
              },
              accent.from
            );
          } catch (err: any) {
            setCollabError(err.message || 'Failed to create room');
            setCollabErrorTimestamp(new Date().toISOString());
          } finally {
            setCollabLoading(false);
          }
        }}
        onJoinSession={async () => {
          if (!currentUser?.uid || !shortCodeInput || shortCodeInput.length !== 6) return;
          setCollabLoading(true);
          setCollabError(null);
          try {
            await CollaborationService.getInstance().joinRoom(
              shortCodeInput,
              currentUser.uid,
              {
                displayName: currentUser.displayName || 'Stage Guest',
                avatar: currentUser.photoURL || '',
              },
              accent.from
            );
          } catch (err: any) {
            setCollabError(err.message || 'Failed to join room');
            setCollabErrorTimestamp(new Date().toISOString());
          } finally {
            setCollabLoading(false);
          }
        }}
        onLeaveSession={async () => {
          setCollabLoading(true);
          try {
            await CollaborationService.getInstance().leaveRoom();
          } finally {
            setCollabLoading(false);
          }
        }}
        generateDiagnosticsReport={() => {
          const fbConfig = getFirebaseConfigDetails();
          const fsDiag = getFirestoreDiagnostics();
          return [
            `=== STAGEX COLLABORATION DIAGNOSTICS ===`,
            `Generated: ${new Date().toISOString()}`,
            `App Version: ${APP_VERSION}`,
            `Firebase Project: ${fbConfig.projectId}`,
            `Connection: ${collabState}`,
            `Active Room: ${collabRoom?.shortCode || 'None'}`,
            `Participants: ${collabParticipants.length}`,
            `Pending Ops: ${pendingOpsCount}`,
            `Cache State: ${fsDiag.firestoreRuntimeActive ? 'Active' : 'Offline'}`,
            `=========================================`,
          ].join('\n');
        }}
      />
    </div>
  );
};
