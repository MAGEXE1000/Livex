import { create } from 'zustand';

export type BottomNavMotionState =
  | 'Idle'
  | 'Scrolling'
  | 'Hidden'
  | 'Visible'
  | 'Dragging'
  | 'SwitchingApp'
  | 'ReturningToHub'
  | 'Transitioning'
  | 'Restoring';

export interface BottomNavItem {
  key: string;
  icon: string | React.JSX.Element;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface BottomNavigationStore {
  motionState: BottomNavMotionState;
  visible: boolean;
  collapsed: boolean;
  isSwitcherOpen: boolean;
  isProfileMenuOpen: boolean;
  isSearchOpen: boolean;
  items: BottomNavItem[];
  isLight: boolean;
  debugLog: boolean;
  isLocked: boolean;

  // Actions
  setMotionState: (state: BottomNavMotionState) => void;
  setVisible: (visible: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  setSwitcherOpen: (open: boolean) => void;
  setProfileMenuOpen: (open: boolean) => void;
  toggleProfileMenu: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  closeAllOverlays: () => void;
  setLocked: (locked: boolean) => void;
  setItems: (items: BottomNavItem[]) => void;
  setIsLight: (isLight: boolean) => void;
  setDebugLog: (enabled: boolean) => void;
  logState: (action: string) => void;
}

export const useBottomNavigationStore = create<BottomNavigationStore>((set, get) => ({
  motionState: 'Idle',
  visible: true,
  collapsed: false,
  isSwitcherOpen: false,
  isProfileMenuOpen: false,
  isSearchOpen: false,
  items: [],
  isLight: false,
  debugLog: false,
  isLocked: false,

  setLocked: (isLocked: boolean) => {
    if (isLocked) {
      set({
        isLocked: true,
        isSwitcherOpen: false,
        isProfileMenuOpen: false,
        isSearchOpen: false,
        motionState: 'Hidden',
      });
      get().logState('locked: true -> bottom nav interaction disabled');
    } else {
      set({ isLocked: false, motionState: 'Visible' });
      get().logState('locked: false -> bottom nav interaction restored');
    }
  },

  setMotionState: (motionState) => {
    if (get().isLocked && motionState !== 'Hidden') return;
    const prev = get().motionState;
    if (prev === motionState) return;
    set({ motionState });
    get().logState(`state: ${prev} -> ${motionState}`);
  },
  setVisible: (visible) => {
    if (get().isLocked && visible) return;
    const prev = get().visible;
    if (prev === visible) return;
    set({ visible });
    get().setMotionState(visible ? 'Visible' : 'Hidden');
  },
  setCollapsed: (collapsed) => {
    if (get().isLocked) return;
    const prev = get().collapsed;
    if (prev === collapsed) return;
    set({ collapsed });
    get().setMotionState(collapsed ? 'Scrolling' : 'Idle');
  },
  setSwitcherOpen: (isSwitcherOpen) => {
    if (get().isLocked && isSwitcherOpen) return;
    set({
      isSwitcherOpen,
      isProfileMenuOpen: isSwitcherOpen ? false : get().isProfileMenuOpen,
      isSearchOpen: isSwitcherOpen ? false : get().isSearchOpen,
    });
    get().setMotionState(isSwitcherOpen ? 'SwitchingApp' : 'Visible');
  },
  setProfileMenuOpen: (isProfileMenuOpen) => {
    if (get().isLocked && isProfileMenuOpen) return;
    set({
      isProfileMenuOpen,
      isSwitcherOpen: isProfileMenuOpen ? false : get().isSwitcherOpen,
      isSearchOpen: isProfileMenuOpen ? false : get().isSearchOpen,
    });
  },
  toggleProfileMenu: () => {
    if (get().isLocked) return;
    const next = !get().isProfileMenuOpen;
    get().setProfileMenuOpen(next);
  },
  setSearchOpen: (isSearchOpen) => {
    if (get().isLocked && isSearchOpen) return;
    set({
      isSearchOpen,
      isProfileMenuOpen: isSearchOpen ? false : get().isProfileMenuOpen,
      isSwitcherOpen: isSearchOpen ? false : get().isSwitcherOpen,
    });
  },
  toggleSearch: () => {
    if (get().isLocked) return;
    const next = !get().isSearchOpen;
    get().setSearchOpen(next);
  },
  closeAllOverlays: () => {
    set({
      isSwitcherOpen: false,
      isProfileMenuOpen: false,
      isSearchOpen: false,
    });
  },
  setItems: (items) => {
    set({ items });
  },
  setIsLight: (isLight) => set({ isLight }),
  setDebugLog: (debugLog) => set({ debugLog }),
  logState: (action) => {
    if (get().debugLog) {
    }
  },
}));
