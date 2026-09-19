import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InspectorTab =
  | 'info'
  | 'props'
  | 'styles'
  | 'animation'
  | 'render'
  | 'tree'
  | 'measure'
  | 'export';

export type GridOverlayMode =
  | 'none'
  | '4dp'
  | '8dp'
  | 'baseline'
  | 'safeArea'
  | 'touchTargets';

export type DockPosition = 'bottom' | 'side' | 'floating';
export type FilterCategory = 'all' | 'interactive' | 'animated' | 'react' | 'dom' | 'scrollable';

export interface BreadcrumbItem {
  name: string;
  element: HTMLElement;
  isReact: boolean;
}

export interface ComponentFiberInfo {
  displayName: string;
  tagName: string;
  props: Record<string, any>;
  state: Record<string, any>;
  hooks: any[];
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  renderCount: number;
  lastRenderTime?: number;
  memoized: boolean;
  ownerName?: string;
  parentName?: string;
  childrenCount: number;
  siblingCount: number;
  renderDepth: number;
  flexGridInfo?: {
    display: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gridTemplateColumns?: string;
    gap?: string;
  };
}

export interface InspectorStoreState {
  isEnabled: boolean;
  isDockOpen: boolean;
  dockPosition: DockPosition;
  isLiveSelecting: boolean;
  isFrozen: boolean;
  selectedElement: HTMLElement | null;
  hoveredElement: HTMLElement | null;
  selectedFiberInfo: ComponentFiberInfo | null;
  activeTab: InspectorTab;
  searchQuery: string;
  activeFilter: FilterCategory;
  gridOverlay: GridOverlayMode;
  measurePair: [HTMLElement | null, HTMLElement | null];
  showBoxModel: boolean;
  showParentOutline: boolean;
  showChildrenOutline: boolean;
  showRouteTracer: boolean;
  breadcrumbs: BreadcrumbItem[];

  // Actions
  setIsEnabled: (enabled: boolean) => void;
  setIsDockOpen: (open: boolean) => void;
  setDockPosition: (pos: DockPosition) => void;
  setIsLiveSelecting: (selecting: boolean) => void;
  setIsFrozen: (frozen: boolean) => void;
  toggleFreezeUI: () => void;
  setSelectedElement: (el: HTMLElement | null, fiberInfo?: ComponentFiberInfo | null, breadcrumbs?: BreadcrumbItem[]) => void;
  setHoveredElement: (el: HTMLElement | null) => void;
  setActiveTab: (tab: InspectorTab) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterCategory) => void;
  setGridOverlay: (grid: GridOverlayMode) => void;
  setMeasurePair: (pair: [HTMLElement | null, HTMLElement | null]) => void;
  setShowBoxModel: (show: boolean) => void;
  setShowParentOutline: (show: boolean) => void;
  setShowChildrenOutline: (show: boolean) => void;
  setShowRouteTracer: (show: boolean) => void;
  resetInspector: () => void;
}

export const useDeveloperInspectorStore = create<InspectorStoreState>()(
  persist(
    (set) => ({
      isEnabled: false,
      isDockOpen: false,
      dockPosition: 'bottom',
      isLiveSelecting: false,
      isFrozen: false,
      selectedElement: null,
      hoveredElement: null,
      selectedFiberInfo: null,
      activeTab: 'info',
      searchQuery: '',
      activeFilter: 'all',
      gridOverlay: 'none',
      measurePair: [null, null],
      showBoxModel: true,
      showParentOutline: true,
      showChildrenOutline: true,
      showRouteTracer: false,
      breadcrumbs: [],

      setIsEnabled: (isEnabled) =>
        set((state) => {
          if (!isEnabled) {
            return {
              isEnabled: false,
              isDockOpen: false,
              isLiveSelecting: false,
              isFrozen: false,
              selectedElement: null,
              hoveredElement: null,
              selectedFiberInfo: null,
              measurePair: [null, null],
              breadcrumbs: [],
            };
          }
          return { isEnabled: true, isDockOpen: true };
        }),

      setIsDockOpen: (isDockOpen) => set({ isDockOpen }),
      setDockPosition: (dockPosition) => set({ dockPosition }),
      setIsLiveSelecting: (isLiveSelecting) => set({ isLiveSelecting }),
      setIsFrozen: (isFrozen) => set({ isFrozen }),
      toggleFreezeUI: () => set((state) => ({ isFrozen: !state.isFrozen })),
      setSelectedElement: (selectedElement, selectedFiberInfo = null, breadcrumbs = []) =>
        set({ selectedElement, selectedFiberInfo, breadcrumbs }),
      setHoveredElement: (hoveredElement) => set({ hoveredElement }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setActiveFilter: (activeFilter) => set({ activeFilter }),
      setGridOverlay: (gridOverlay) => set({ gridOverlay }),
      setMeasurePair: (measurePair) => set({ measurePair }),
      setShowBoxModel: (showBoxModel) => set({ showBoxModel }),
      setShowParentOutline: (showParentOutline) => set({ showParentOutline }),
      setShowChildrenOutline: (showChildrenOutline) => set({ showChildrenOutline }),
      setShowRouteTracer: (showRouteTracer) => set({ showRouteTracer }),

      resetInspector: () =>
        set({
          isLiveSelecting: false,
          isFrozen: false,
          selectedElement: null,
          hoveredElement: null,
          selectedFiberInfo: null,
          activeTab: 'info',
          searchQuery: '',
          activeFilter: 'all',
          gridOverlay: 'none',
          measurePair: [null, null],
          showRouteTracer: false,
          breadcrumbs: [],
        }),
    }),
    {
      name: 'livex_developer_inspector_v2',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        isDockOpen: state.isDockOpen,
        dockPosition: state.dockPosition,
        showBoxModel: state.showBoxModel,
        showParentOutline: state.showParentOutline,
        showChildrenOutline: state.showChildrenOutline,
        showRouteTracer: state.showRouteTracer,
      }),
    }
  )
);
