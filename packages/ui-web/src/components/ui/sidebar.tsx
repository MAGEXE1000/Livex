import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelLeft, ChevronRight } from 'lucide-react';

const SIDEBAR_WIDTH = '16rem'; // 256px
const SIDEBAR_WIDTH_ICON = '4.25rem'; // 68px
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

interface SidebarContextType {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean | ((value: boolean) => boolean)) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className = '',
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  const open = openProp !== undefined ? openProp : _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
    },
    [setOpenProp, open]
  );

  const toggleSidebar = React.useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state: 'expanded' | 'collapsed' = open ? 'expanded' : 'collapsed';
  const isMobile = false; // Desktop web shell

  const contextValue = React.useMemo<SidebarContextType>(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, isMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={`flex w-full h-full min-h-[100dvh] overflow-hidden text-zinc-100 ${className}`}
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export function Sidebar({
  side = 'left',
  variant = 'floating',
  collapsible = 'icon',
  className = '',
  style,
  children,
  ...props
}: SidebarProps) {
  const { open } = useSidebar();

  const isFloating = variant === 'floating';
  const targetWidth = open ? SIDEBAR_WIDTH : collapsible === 'icon' ? SIDEBAR_WIDTH_ICON : '0rem';

  return (
    <motion.aside
      className={`relative select-none flex-shrink-0 flex flex-col z-30 transition-[margin,border-radius] ${
        isFloating
          ? 'my-3 ml-3 rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl shadow-2xl shadow-black/80'
          : 'border-r border-white/10 bg-zinc-950'
      } ${className}`}
      animate={{
        width: targetWidth,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 32,
        mass: 0.8,
      }}
      style={
        {
          height: isFloating ? 'calc(100dvh - 24px)' : '100dvh',
          boxSizing: 'border-box',
          overflow: 'hidden',
          willChange: 'width',
          ...style,
        } as React.CSSProperties
      }
      {...(props as any)}
    >
      <div
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </motion.aside>
  );
}

export function SidebarHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center gap-2 p-3 border-b border-white/[0.07] flex-shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 py-3 space-y-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-2.5 border-t border-white/[0.07] flex-shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`space-y-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      className={`px-3 py-1 text-[10px] font-mono tracking-widest text-zinc-500 uppercase select-none ${className}`}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        height: open ? 'auto' : 0,
        visibility: open ? 'visible' : 'hidden',
      }}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export function SidebarGroupAction({
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarGroupContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function SidebarMenu({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={`space-y-1 p-0 m-0 list-none ${className}`} {...props}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={`relative ${className}`} {...props}>
      {children}
    </li>
  );
}

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  tooltip?: string;
  size?: 'default' | 'sm' | 'lg';
}

export function SidebarMenuButton({
  isActive = false,
  tooltip,
  size = 'default',
  className = '',
  children,
  ...props
}: SidebarMenuButtonProps) {
  const sizeClasses =
    size === 'sm'
      ? 'h-8 text-xs px-2.5'
      : size === 'lg'
      ? 'h-11 text-sm px-3.5'
      : 'h-9 text-xs px-3';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      title={tooltip}
      className={`w-full flex items-center gap-3 rounded-xl font-medium tracking-tight text-left cursor-pointer transition-colors duration-150 outline-none select-none focus-visible:ring-1 focus-visible:ring-white/40 ${sizeClasses} ${
        isActive
          ? 'bg-white/[0.10] text-white font-semibold shadow-xs'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
      } ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

export function SidebarMenuAction({
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarMenuBadge({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const { open } = useSidebar();
  if (!open) return null;

  return (
    <span
      className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function SidebarMenuSub({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  const { open } = useSidebar();
  if (!open) return null;

  return (
    <ul
      className={`ml-7 my-1 border-l border-white/10 pl-2 space-y-0.5 list-none ${className}`}
      {...props}
    >
      {children}
    </ul>
  );
}

export function SidebarMenuSubItem({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={`relative ${className}`} {...props}>
      {children}
    </li>
  );
}

export interface SidebarMenuSubButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export function SidebarMenuSubButton({
  isActive = false,
  className = '',
  children,
  ...props
}: SidebarMenuSubButtonProps) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs font-medium tracking-tight text-left cursor-pointer transition-colors duration-150 outline-none select-none ${
        isActive
          ? 'text-white bg-white/[0.08] font-semibold'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarSeparator({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={`border-0 border-t border-white/[0.08] my-2 mx-2 ${className}`}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      title={open ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
      aria-label="Toggle Sidebar"
      className={`p-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.96] text-zinc-300 hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${className}`}
      {...props}
    >
      <PanelLeft className="w-4 h-4" />
    </button>
  );
}

export function SidebarRail({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { toggleSidebar } = useSidebar();

  return (
    <div
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-white/20 transition-colors z-40 ${className}`}
      {...props}
    />
  );
}

export function SidebarInset({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={`flex-1 h-[100dvh] overflow-hidden relative ${className}`}
      {...props}
    >
      {children}
    </main>
  );
}
