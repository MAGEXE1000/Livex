import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Music2,
  SlidersHorizontal,
  Layers,
  Compass,
  Mic2,
  Settings,
  ListMusic,
  Bell,
  Check,
  ChevronsUpDown,
  Plus,
  ChevronDown,
  Sparkles,
  Users,
  LogOut,
  FolderHeart,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Disc3,
} from 'lucide-react';
import {
  useNavigationStore,
  NavigationDispatcher,
  useSettingsStore,
  authRepository,
  type AuthUser,
  getUserCover,
  subscribeUserCover,
} from '@workspace/livex-core';
import {
  LivexLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '@workspace/ui-shared';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

export interface BandProject {
  id: string;
  name: string;
  genre: string;
  members: number;
}

const DEFAULT_PROJECTS: BandProject[] = [
  { id: 'main-band', name: 'Main Band (Livex Core)', genre: 'Prog Rock / Fusion', members: 5 },
  { id: 'acoustic-duo', name: 'Acoustic Duo Sessions', genre: 'Acoustic Folk', members: 2 },
  { id: 'solo-prod', name: 'Solo Production Lab', genre: 'Electronic / Beat', members: 1 },
];

export interface WorkstationNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  module: 'groovex' | 'chordex' | 'sync' | 'drumex';
}

const INITIAL_NOTIFICATIONS: WorkstationNotification[] = [
  {
    id: 'n1',
    title: 'Stem stems sync completed',
    description: 'Groovex: 5-stem multitrack for "Neon Sunset" processed with local WebAudio DSP.',
    time: '2m ago',
    unread: true,
    module: 'groovex',
  },
  {
    id: 'n2',
    title: 'New setlist shared with Band',
    description: 'Chordex: "Weekend Festival 2026" synced with 4 connected stage prompters.',
    time: '14m ago',
    unread: true,
    module: 'chordex',
  },
  {
    id: 'n3',
    title: 'Stage plot snapshot saved',
    description: 'Stagex: 5-piece monitor configuration & wireless frequencies updated.',
    time: '1h ago',
    unread: false,
    module: 'sync',
  },
];

function TeamSwitcher({ projects }: { projects: BandProject[] }) {
  const { open } = useSidebar();
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/15 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-xs">
          <Users className="w-4 h-4 text-zinc-300" />
        </div>

        {open && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate block">
                {activeProject.name}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 truncate block">
              {activeProject.members} Members • {activeProject.genre}
            </span>
          </div>
        )}

        {open && (
          <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 ml-auto flex-shrink-0" />
        )}
      </motion.button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute bottom-full mb-2 z-50 p-1.5 rounded-xl bg-zinc-950/95 border border-white/15 shadow-2xl backdrop-blur-2xl ${
              open ? 'left-0 w-64' : 'left-0 w-60'
            }`}
          >
            <div className="px-2.5 py-1 text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
              Bands & Workspaces
            </div>

            <div className="space-y-0.5 mt-1">
              {projects.map((proj) => {
                const isSelected = proj.id === activeProject.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setActiveProject(proj);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.10] text-white font-medium'
                        : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center font-bold text-[10px] text-zinc-200">
                      {proj.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block font-medium">{proj.name}</span>
                      <span className="text-[10px] text-zinc-500 block truncate">
                        {proj.members} members
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="my-1.5 border-t border-white/10" />

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'main' });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Create New Band Project</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsPopover({
  notifications,
  onClear,
}: {
  notifications: WorkstationNotification[];
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        title="Workstation Notifications"
        aria-label="Notifications"
        className="p-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all duration-150 cursor-pointer relative outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 z-50 w-80 p-3 rounded-2xl bg-zinc-950/95 border border-white/15 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white">Workstation Activity</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Mark read
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No active workstation notifications
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      item.unread
                        ? 'bg-white/[0.06] border-white/15'
                        : 'bg-white/[0.02] border-white/5 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Offline Engine Active</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardSidebar() {
  const { open } = useSidebar();
  const activeRoute = useNavigationStore((s) => s.history[s.history.length - 1]);
  const currentApp = activeRoute?.app ?? 'hub';

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    chordex: false,
    groovex: false,
    drumex: false,
    stagex: false,
    vocalex: false,
    settings: false,
  });

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);

  // Subscribe to Authentication state
  useEffect(() => {
    return authRepository.subscribeAuth((user) => {
      setAuthUser(user);
    });
  }, []);

  // Subscribe to Profile Photo updates
  useEffect(() => {
    if (!authUser?.uid) {
      setCustomPhoto(null);
      return;
    }
    const refresh = () => setCustomPhoto(getUserCover(authUser.uid));
    refresh();
    return subscribeUserCover(({ uid, cover }) => {
      if (uid === authUser.uid) {
        setCustomPhoto(cover);
      }
    });
  }, [authUser?.uid]);

  const toggleSubmenu = (menuKey: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const navigateTo = (appId: string, page?: string, tab?: string) => {
    if (appId === 'hub') {
      window.history.pushState({}, '', '/app');
      NavigationDispatcher.push({ app: 'hub', tab: (tab as any) ?? 'home', page });
    } else {
      window.history.pushState({}, '', `/app/${appId}`);
      NavigationDispatcher.openApp(appId as any);
      if (page) {
        NavigationDispatcher.push({ app: appId as any, page });
      }
    }
  };

  const handleClearNotifications = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const name = authUser?.displayName || authUser?.email || 'Livex Artist';
  const email = authUser?.email || 'Local Offline Mode';
  const photo = customPhoto || authUser?.photoURL;
  const initial = (name[0] ?? 'L').toUpperCase();

  return (
    <Sidebar variant="floating" collapsible="icon">
      {/* Header with Brand, Notifications & Trigger */}
      <SidebarHeader>
        <div className="flex items-center justify-between w-full gap-2">
          {/* Logo & Brand Label */}
          <button
            type="button"
            onClick={() => navigateTo('hub', undefined, 'home')}
            className="flex items-center gap-2.5 bg-transparent border-0 text-left p-1 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/40 flex-1 min-w-0"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center flex-shrink-0 shadow-xs">
              <LivexLogo size={20} />
            </div>
            {open && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-white leading-none truncate">
                  Livex Studio
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-tight mt-0.5 truncate">
                  Audio Workstation
                </span>
              </div>
            )}
          </button>

          {/* Controls: Notifications & Sidebar Trigger */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {open && (
              <NotificationsPopover
                notifications={notifications}
                onClear={handleClearNotifications}
              />
            )}
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent>
        {/* Workstations Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Workstations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Hub / Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentApp === 'hub' && activeRoute?.tab !== 'settings'}
                  onClick={() => navigateTo('hub', undefined, 'home')}
                  tooltip="Hub / Overview"
                >
                  <Home className="w-4 h-4 flex-shrink-0 text-zinc-300" />
                  {open && <span className="truncate">Hub Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Chordex */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'chordex'}
                    onClick={() => {
                      navigateTo('chordex');
                      if (open) toggleSubmenu('chordex');
                    }}
                    tooltip="Chordex — Chords & Teleprompter"
                    className="flex-1"
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <ChordexLogo size={18} />
                    </div>
                    {open && <span className="truncate">Chordex</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('chordex', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Chordex Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.chordex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.chordex && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'chordex' && activeRoute?.page === 'library'}
                        onClick={() => navigateTo('chordex', 'library')}
                      >
                        <span>Chords & Lyrics</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'chordex' && activeRoute?.page === 'songs'}
                        onClick={() => navigateTo('chordex', 'songs')}
                      >
                        <span>Live Teleprompter</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'chordex' && activeRoute?.page === 'practice'}
                        onClick={() => navigateTo('chordex', 'practice')}
                      >
                        <span>Solo Practice Mode</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Groovex */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'groovex'}
                    onClick={() => {
                      navigateTo('groovex');
                      if (open) toggleSubmenu('groovex');
                    }}
                    tooltip="Groovex — Multitrack Stems Mixer"
                    className="flex-1"
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <GroovexLogo size={18} />
                    </div>
                    {open && <span className="truncate">Groovex</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('groovex', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Groovex Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.groovex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.groovex && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'groovex'}
                        onClick={() => navigateTo('groovex')}
                      >
                        <span>5-Stem Multitrack Mixer</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => navigateTo('groovex')}
                      >
                        <span>Stem Isolation Worklet</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Drumex */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'drumex'}
                    onClick={() => {
                      navigateTo('drumex');
                      if (open) toggleSubmenu('drumex');
                    }}
                    tooltip="Drumex — Step Sequencer"
                    className="flex-1"
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <DrumexLogo size={18} />
                    </div>
                    {open && <span className="truncate">Drumex</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('drumex', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Drumex Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.drumex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.drumex && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'drumex'}
                        onClick={() => navigateTo('drumex')}
                      >
                        <span>16-Step Beat Grid</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => navigateTo('drumex')}
                      >
                        <span>Drum Kit Library</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Stagex */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'stagex'}
                    onClick={() => {
                      navigateTo('stagex');
                      if (open) toggleSubmenu('stagex');
                    }}
                    tooltip="Stagex — Stage Plots & Tech Riders"
                    className="flex-1"
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <StagexLogoIcon size={18} />
                    </div>
                    {open && <span className="truncate">Stagex</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('stagex', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Stagex Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.stagex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.stagex && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'stagex'}
                        onClick={() => navigateTo('stagex')}
                      >
                        <span>Spatial Stage Plot</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => navigateTo('stagex')}
                      >
                        <span>Input Patch & Specs</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Vocalex */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'vocalex'}
                    onClick={() => {
                      navigateTo('vocalex');
                      if (open) toggleSubmenu('vocalex');
                    }}
                    tooltip="Vocalex — Vocal Coach & Takes"
                    className="flex-1"
                  >
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <VocalexLogo size={18} />
                    </div>
                    {open && <span className="truncate">Vocalex</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('vocalex', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Vocalex Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.vocalex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.vocalex && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentApp === 'vocalex'}
                        onClick={() => navigateTo('vocalex')}
                      >
                        <span>Sub-Cent Pitch Monitor</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => navigateTo('vocalex')}
                      >
                        <span>Vocal Warmup Takes</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management & Configuration Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Setlists */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigateTo('chordex', 'songs')}
                  tooltip="Setlists & Rehearsals"
                >
                  <ListMusic className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                  {open && <span className="truncate">Setlists & Songs</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Audio Library */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigateTo('chordex', 'library')}
                  tooltip="Audio Library & Assets"
                >
                  <FolderHeart className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                  {open && <span className="truncate">Audio Library</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings & Danger Zone */}
              <SidebarMenuItem>
                <div className="flex items-center w-full">
                  <SidebarMenuButton
                    isActive={currentApp === 'hub' && activeRoute?.tab === 'settings'}
                    onClick={() => {
                      navigateTo('hub', undefined, 'settings');
                      if (open) toggleSubmenu('settings');
                    }}
                    tooltip="Settings & Danger Zone"
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                    {open && <span className="truncate">Settings & Danger Zone</span>}
                  </SidebarMenuButton>

                  {open && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubmenu('settings', e)}
                      className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle Settings Submenu"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedMenus.settings ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {open && expandedMenus.settings && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={activeRoute?.page === 'main'}
                        onClick={() => navigateTo('hub', 'main', 'settings')}
                      >
                        <span>Preferences</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={activeRoute?.page === 'audio'}
                        onClick={() => navigateTo('hub', 'audio', 'settings')}
                      >
                        <span>Audio Worklet Config</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={activeRoute?.page === 'backup'}
                        onClick={() => navigateTo('hub', 'backup', 'settings')}
                      >
                        <span className="text-rose-400">Danger Zone (Reset)</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with TeamSwitcher and User Profile */}
      <SidebarFooter>
        <div className="space-y-2">
          {/* Workspace / Band Switcher */}
          <TeamSwitcher projects={DEFAULT_PROJECTS} />

          {/* User Profile / Status Chip */}
          <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold text-white shadow-xs">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            {open && (
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-xs text-white truncate block">
                  {name}
                </span>
                <span className="text-[10px] text-zinc-400 truncate block">
                  {email}
                </span>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
