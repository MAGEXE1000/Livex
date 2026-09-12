import React, { forwardRef, useImperativeHandle, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'motion/react';
import {
  ArrowUpToLine,
  BadgeAlert,
  BarChart,
  BookOpen,
  Brush,
  Bug,
  CircleHelp,
  CloudUpload,
  EyeOff,
  Globe,
  Grid,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Music,
  Pencil,
  Share2,
  Shield,
  ShieldCheck,
  Sliders,
  SquarePlay,
  Star,
  Terminal,
  Trash2,
  TriangleAlert,
  Users,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

import { ActivityIcon } from '../../components/ui/activity';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { ArrowLeftIcon } from '../../components/ui/arrow-left';
import { ArrowRightIcon } from '../../components/ui/arrow-right';
import { AudioLinesIcon } from '../../components/ui/audio-lines';
import { BellIcon } from '../../components/ui/bell';
import { BlocksIcon } from '../../components/ui/blocks';
import { CheckIcon } from '../../components/ui/check';
import { ChevronDownIcon } from '../../components/ui/chevron-down';
import { ChevronRightIcon } from '../../components/ui/chevron-right';
import { ClapIcon } from '../../components/ui/clap';
import { ClockIcon } from '../../components/ui/clock';
import { CogIcon } from '../../components/ui/cog';
import { CompassIcon } from '../../components/ui/compass';
import { CopyIcon } from '../../components/ui/copy';
import { Disc3Icon } from '../../components/ui/disc-3';
import { DownloadIcon } from '../../components/ui/download';
import { DrumIcon } from '../../components/ui/drum';
import { ExternalLinkIcon } from '../../components/ui/external-link';
import { EyeIcon } from '../../components/ui/eye';
import { FileTextIcon } from '../../components/ui/file-text';
import { FolderOpenIcon } from '../../components/ui/folder-open';
import { FoldersIcon } from '../../components/ui/folders';
import { GalleryVerticalEndIcon } from '../../components/ui/gallery-vertical-end';
import { GraduationCapIcon } from '../../components/ui/graduation-cap';
import { GripIcon } from '../../components/ui/grip';
import { HeartIcon } from '../../components/ui/heart';
import { HistoryIcon } from '../../components/ui/history';
import { HomeIcon } from '../../components/ui/home';
import { LayersIcon } from '../../components/ui/layers';
import { LayoutGridIcon } from '../../components/ui/layout-grid';
import { LayoutPanelTopIcon } from '../../components/ui/layout-panel-top';
import { LockIcon } from '../../components/ui/lock';
import { MicIcon } from '../../components/ui/mic';
import { PlayIcon } from '../../components/ui/play';
import { PlusIcon } from '../../components/ui/plus';
import { RadioIcon } from '../../components/ui/radio';
import { RefreshCWIcon as RefreshCwIcon } from '../../components/ui/refresh-cw';
import { SearchIcon } from '../../components/ui/search';
import { SettingsIcon } from '../../components/ui/settings';
import { SlidersHorizontalIcon } from '../../components/ui/sliders-horizontal';
import { SparklesIcon } from '../../components/ui/sparkles';
import { UserIcon } from '../../components/ui/user';
import { XIcon } from '../../components/ui/x';

const localAnimatedIcons: Record<string, any> = {
  activity: ActivityIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'audio-lines': AudioLinesIcon,
  audiolines: AudioLinesIcon,
  bell: BellIcon,
  blocks: BlocksIcon,
  check: CheckIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-right': ChevronRightIcon,
  clap: ClapIcon,
  clapperboard: ClapIcon,
  clock: ClockIcon,
  cog: CogIcon,
  compass: CompassIcon,
  copy: CopyIcon,
  disc: Disc3Icon,
  'disc-3': Disc3Icon,
  disc3: Disc3Icon,
  download: DownloadIcon,
  drum: DrumIcon,
  'external-link': ExternalLinkIcon,
  eye: EyeIcon,
  'file-text': FileTextIcon,
  'folder-open': FolderOpenIcon,
  folders: FoldersIcon,
  'gallery-vertical-end': GalleryVerticalEndIcon,
  galleryverticalend: GalleryVerticalEndIcon,
  'graduation-cap': GraduationCapIcon,
  grip: GripIcon,
  heart: HeartIcon,
  history: HistoryIcon,
  home: HomeIcon,
  layers: LayersIcon,
  'layout-grid': LayoutGridIcon,
  'layout-panel-top': LayoutPanelTopIcon,
  layoutpaneltop: LayoutPanelTopIcon,
  lock: LockIcon,
  mic: MicIcon,
  play: PlayIcon,
  plus: PlusIcon,
  radio: RadioIcon,
  'refresh-cw': RefreshCwIcon,
  search: SearchIcon,
  settings: SettingsIcon,
  'sliders-horizontal': SlidersHorizontalIcon,
  slidershorizontal: SlidersHorizontalIcon,
  sparkles: SparklesIcon,
  user: UserIcon,
  x: XIcon,
};

const staticLucideIcons: Record<string, LucideIcon> = {
  'arrow-up-to-line': ArrowUpToLine,
  'badge-alert': BadgeAlert,
  'bar-chart': BarChart,
  'book-open': BookOpen,
  brush: Brush,
  bug: Bug,
  'circle-help': CircleHelp,
  'cloud-upload': CloudUpload,
  'eye-off': EyeOff,
  globe: Globe,
  grid: Grid,
  'layout-dashboard': LayoutDashboard,
  'loader-circle': LoaderCircle,
  'log-out': LogOut,
  music: Music,
  pencil: Pencil,
  edit: Pencil,
  'share-2': Share2,
  shield: Shield,
  'shield-check': ShieldCheck,
  sliders: Sliders,
  'square-play': SquarePlay,
  star: Star,
  terminal: Terminal,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  users: Users,
  'volume-2': Volume2,
};

export type IconState =
  | 'active'
  | 'inactive'
  | 'selected'
  | 'pressed'
  | 'loading'
  | 'disabled'
  | 'success'
  | 'warning'
  | 'error';

export interface AnimatedIconProps {
  name: string;
  size?: number;
  color?: string;
  state?: IconState;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  onClick?: (e: React.MouseEvent) => void;
  /** Incrementing counter to force animation replay even when state is unchanged (e.g. re-tapping active tab) */
  animationEpoch?: number;
}

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

const iconComponentCache = new Map<string, any>();

// Map helper to resolve names to local animated or static icons
function getAnimatedIconComponent(name: string) {
  if (iconComponentCache.has(name)) {
    return iconComponentCache.get(name);
  }

  // Normalize names that are Material symbols or aliases to their Lucide/local counterparts
  let normName = (name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (
    normName === 'system_update' ||
    normName === 'sync' ||
    normName === 'refresh' ||
    normName === 'restart_alt'
  ) {
    normName = 'refresh-cw';
  } else if (
    normName === 'help_center' ||
    normName === 'help-center' ||
    normName === 'help' ||
    normName === 'circle-help'
  ) {
    normName = 'circle-help';
  } else if (normName === 'info' || normName === 'about' || normName === 'badge-alert') {
    normName = 'badge-alert';
  } else if (normName === 'code' || normName === 'terminal') {
    normName = 'terminal';
  } else if (
    normName === 'check_circle' ||
    normName === 'check-circle' ||
    normName === 'task_alt' ||
    normName === 'verified' ||
    normName === 'check'
  ) {
    normName = 'check';
  } else if (normName === 'close' || normName === 'x') {
    normName = 'x';
  } else if (
    normName === 'account_circle' ||
    normName === 'profile' ||
    normName === 'account' ||
    normName === 'person' ||
    normName === 'avatar' ||
    normName === 'user'
  ) {
    normName = 'user';
  } else if (normName === 'notifications' || normName === 'bell') {
    normName = 'bell';
  } else if (normName === 'language' || normName === 'globe') {
    normName = 'globe';
  } else if (normName === 'security' || normName === 'shield') {
    normName = 'shield';
  } else if (normName === 'verified_user' || normName === 'shield-check') {
    normName = 'shield-check';
  } else if (normName === 'bug_report' || normName === 'bug' || normName === 'devtools') {
    normName = 'bug';
  } else if (normName === 'content_copy' || normName === 'copy') {
    normName = 'copy';
  } else if (normName === 'edit' || normName === 'pencil' || normName === 'mode_edit') {
    normName = 'pencil';
  } else if (
    normName === 'delete' ||
    normName === 'delete_forever' ||
    normName === 'trash-2' ||
    normName === 'trash'
  ) {
    normName = 'trash-2';
  } else if (normName === 'warning' || normName === 'triangle-alert') {
    normName = 'triangle-alert';
  } else if (normName === 'star_outline' || normName === 'star') {
    normName = 'star';
  } else if (normName === 'visibility' || normName === 'eye') {
    normName = 'eye';
  } else if (normName === 'visibility_off' || normName === 'eye-off') {
    normName = 'eye-off';
  } else if (
    normName === 'progress_activity' ||
    normName === 'loader-circle' ||
    normName === 'loader'
  ) {
    normName = 'loader-circle';
  } else if (normName === 'output' || normName === 'logout' || normName === 'log-out') {
    normName = 'log-out';
  } else if (normName === 'publish' || normName === 'arrow-up-to-line') {
    normName = 'arrow-up-to-line';
  } else if (normName === 'smart_button' || normName === 'square-play') {
    normName = 'square-play';
  } else if (normName === 'volume_up' || normName === 'volume-2') {
    normName = 'volume-2';
  } else if (normName === 'mop' || normName === 'brush') {
    normName = 'brush';
  } else if (normName === 'open_in_new' || normName === 'external-link') {
    normName = 'external-link';
  } else if (normName === 'group' || normName === 'groups' || normName === 'users') {
    normName = 'users';
  } else if (normName === 'analytics' || normName === 'bar-chart' || normName === 'barchart') {
    normName = 'bar-chart';
  } else if (normName === 'music_note' || normName === 'music') {
    normName = 'music';
  } else if (
    normName === 'menu_book' ||
    normName === 'book-open' ||
    normName === 'songbook' ||
    normName === 'catalog'
  ) {
    normName = 'book-open';
  } else if (normName === 'grid_on' || normName === 'grid') {
    normName = 'grid';
  } else if (normName === 'equalizer' || normName === 'sliders') {
    normName = 'sliders';
  } else if (normName === 'cloud_upload' || normName === 'cloud-upload') {
    normName = 'cloud-upload';
  } else if (normName === 'share' || normName === 'share-2') {
    normName = 'share-2';
  } else if (normName === 'dashboard' || normName === 'layout-dashboard') {
    normName = 'layout-dashboard';
  } else if (
    normName === 'drumex' ||
    normName === 'drumbeats' ||
    normName === 'drumsongs' ||
    normName === 'beats'
  ) {
    normName = 'drum';
  } else if (
    normName === 'stagex' ||
    normName === 'stage' ||
    normName === 'editor' ||
    normName === 'stagexstage'
  ) {
    normName = 'layout-panel-top';
  } else if (
    normName === 'groovex' ||
    normName === 'record' ||
    normName === 'disc-3' ||
    normName === 'disc'
  ) {
    normName = 'disc';
  } else if (
    normName === 'chordex' ||
    normName === 'chords' ||
    normName === 'songs' ||
    normName === 'song'
  ) {
    normName = 'audio-lines';
  } else if (normName === 'vocalex' || normName === 'recorder' || normName === 'vocalexrecorder') {
    normName = 'mic';
  } else if (
    normName === 'coach' ||
    normName === 'vocalexcoach' ||
    normName === 'practice' ||
    normName === 'learn'
  ) {
    normName = 'graduation-cap';
  } else if (
    normName === 'takes' ||
    normName === 'vocalextakes' ||
    normName === 'clap' ||
    normName === 'clapperboard'
  ) {
    normName = 'clapperboard';
  }

  // 1. Try local custom animated icons first
  if (localAnimatedIcons[normName]) {
    const comp = localAnimatedIcons[normName];
    iconComponentCache.set(name, comp);
    return comp;
  }

  // 2. Try static Lucide icons
  if (staticLucideIcons[normName]) {
    const comp = staticLucideIcons[normName];
    iconComponentCache.set(name, comp);
    return comp;
  }

  // Default fallback
  const fallback = CircleHelp;
  iconComponentCache.set(name, fallback);
  return fallback;
}

export const AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    {
      name,
      size = 24,
      color = 'currentColor',
      state = 'inactive',
      className = '',
      style,
      strokeWidth = 2,
      onClick,
      animationEpoch,
    },
    ref
  ) => {
    const canHover = useHoverCapable();
    const prefersReduced = useAppReducedMotion();
    const controls = useAnimation();
    const isSpinning = state === 'loading' || name === 'loader-circle' || name === 'loader';

    const innerIconRef = useRef<any>(null);
    const isAnimatingRef = useRef(false);
    const prevEpochRef = useRef(animationEpoch);

    const normName = name.toLowerCase() === 'account_circle' ? 'user' : name.toLowerCase();
    const isMatched = !!localAnimatedIcons[normName];

    // Map imperative commands for backwards compatibility and parent controls
    useImperativeHandle(ref, () => ({
      startAnimation: () => {
        if (innerIconRef.current && !isAnimatingRef.current) {
          isAnimatingRef.current = true;
          innerIconRef.current.startAnimation?.();
          setTimeout(
            () => {
              isAnimatingRef.current = false;
            },
            name === 'settings' || name === 'cog' ? 1000 : 600
          );
        }
      },
      stopAnimation: () => {
        if (innerIconRef.current) {
          innerIconRef.current.stopAnimation?.();
          isAnimatingRef.current = false;
        }
      },
    }));

    // Trigger local animated icons' micro-animations imperatively based on tab state
    useEffect(() => {
      if (isSpinning) return;
      const isActiveState = state === 'active' || state === 'selected';
      const epochChanged = animationEpoch !== prevEpochRef.current;
      prevEpochRef.current = animationEpoch;

      if (isActiveState) {
        if (innerIconRef.current && (!isAnimatingRef.current || epochChanged)) {
          isAnimatingRef.current = true;
          console.log(
            `[AnimatedIcon] START ANIMATION -> icon: ${name}, state: ${state}, epoch: ${animationEpoch ?? 0}`
          );
          innerIconRef.current.stopAnimation?.();
          innerIconRef.current.startAnimation?.();
          setTimeout(
            () => {
              isAnimatingRef.current = false;
            },
            name === 'settings' || name === 'cog' ? 1000 : 600
          );
        }
      } else {
        if (innerIconRef.current) {
          console.log(
            `[AnimatedIcon] STOP (REVERSE) ANIMATION -> icon: ${name}, state: ${state}, epoch: ${animationEpoch ?? 0}`
          );
          innerIconRef.current.stopAnimation?.();
          isAnimatingRef.current = false;
        }
      }
    }, [state, name, animationEpoch, isSpinning]);

    // Hover configuration based on icon type (for static/unmatched icons only)
    const getIconSpecificHover = () => {
      const lower = name.toLowerCase();
      if (lower.includes('setting') || lower.includes('gear')) {
        return { rotate: 90, scale: 1.08 };
      }
      if (lower.includes('preference') || lower.includes('slider')) {
        return { rotate: [0, 6, -6, 0], scale: 1.08 };
      }
      if (lower.includes('bell') || lower.includes('notification')) {
        return { rotate: [0, -14, 14, -8, 4, 0], scale: 1.08 };
      }
      if (lower.includes('sync') || lower.includes('refresh') || lower.includes('update')) {
        return { rotate: 180, scale: 1.08 };
      }
      if (lower.includes('search') || lower.includes('magnifier')) {
        return { scale: 1.14, x: 1, y: -1 };
      }
      if (lower.includes('download')) {
        return { y: 2, scale: 1.08 };
      }
      if (lower.includes('upload')) {
        return { y: -2, scale: 1.08 };
      }
      if (lower.includes('library') || lower.includes('book')) {
        return { scale: 1.12, rotate: -2 };
      }
      if (lower.includes('favorite') || lower.includes('heart')) {
        return { scale: 1.2, rotate: -4 };
      }
      if (lower.includes('bookmark')) {
        return { scale: 1.12, y: -2 };
      }
      if (lower.includes('theme') || lower.includes('sun') || lower.includes('moon')) {
        return { rotate: 30, scale: 1.12 };
      }
      if (
        lower.includes('profile') ||
        lower.includes('user') ||
        lower.includes('avatar') ||
        lower.includes('account')
      ) {
        return { scale: 1.1, y: -1.5 };
      }
      if (lower.includes('music') || lower.includes('note') || lower.includes('song')) {
        return { y: [-1, -3, 0], scale: 1.12 };
      }
      if (lower.includes('stage') || lower.includes('spotlight')) {
        return { rotate: [0, 8, -8, 0], scale: 1.1 };
      }
      if (lower.includes('lyric') || lower.includes('text')) {
        return { scale: 1.1, x: 1 };
      }
      if (lower.includes('practice') || lower.includes('metronome')) {
        return { scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] };
      }
      if (lower.includes('record') || lower.includes('mic')) {
        return { scale: [1, 1.2, 1] };
      }
      if (lower.includes('equalizer') || lower.includes('bar')) {
        return { scale: 1.1, y: -1 };
      }
      if (lower.includes('bluetooth')) {
        return { scale: 1.15 };
      }
      if (lower.includes('wifi') || lower.includes('signal')) {
        return { scale: 1.12, y: -1 };
      }
      if (lower.includes('cloud')) {
        return { x: 2, scale: 1.08 };
      }
      if (lower.includes('home')) {
        return { scale: 1.1, y: -1 };
      }
      if (lower.includes('back') || lower.includes('arrow-left')) {
        return { x: -3, scale: 1.05 };
      }
      if (lower.includes('copy')) {
        return { scale: 1.12, x: 1, y: -1 };
      }
      if (lower.includes('edit') || lower.includes('pencil')) {
        return { scale: 1.1, rotate: -10 };
      }
      if (lower.includes('share')) {
        return { scale: 1.15, rotate: 12 };
      }
      if (lower.includes('save') || lower.includes('check')) {
        return { scale: 1.18, rotate: [0, -6, 0] };
      }
      if (lower.includes('delete') || lower.includes('trash')) {
        return { y: -2, rotate: -8, scale: 1.08 };
      }
      if (lower.includes('lock') || lower.includes('security') || lower.includes('shield')) {
        return { scale: 1.12, rotate: [0, -6, 0] };
      }
      return { scale: 1.08, y: -1 };
    };

    const getActiveStateVariants = () => {
      const iconHover = getIconSpecificHover();
      const iconRotate = typeof iconHover.rotate === 'number' ? iconHover.rotate * 0.5 : undefined;
      return {
        scale: [0.92, 1.16, 1.08],
        rotate: iconRotate !== undefined ? [0, iconRotate, 0] : [0, -4, 0],
        y: typeof iconHover.y === 'number' ? iconHover.y : -1.5,
        opacity: 1,
      };
    };

    const outerVariants: any = isMatched
      ? {
          active: { opacity: 1 },
          inactive: { opacity: 0.85 },
          pressed: { scale: 0.95 },
        }
      : {
          active: getActiveStateVariants(),
          inactive: { scale: 1, rotate: 0, y: 0, opacity: 0.85 },
          loading: { scale: 1, rotate: 360, opacity: 0.85 },
          success: { scale: [1, 1.28, 1], rotate: [0, -10, 0], opacity: 1 },
          warning: { scale: 1.15, rotate: [0, -8, 8, -4, 0], opacity: 1 },
          error: { scale: 1.15, rotate: [0, -8, 8, -4, 0], opacity: 1 },
          disabled: { scale: 0.94, rotate: 0, y: 0, opacity: 0.38 },
          pressed: { scale: 0.86, rotate: -4, y: 1.5, opacity: 0.9 },
          selected: getActiveStateVariants(),
        };

    const IconComponent = getAnimatedIconComponent(name);

    return (
      <motion.div
        className={`inline-flex items-center justify-center select-none ${className}`}
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
          willChange: isSpinning ? 'transform' : 'auto',
          ...style,
        }}
        animate={isSpinning ? { rotate: [0, 360] } : controls}
        initial="inactive"
        whileHover={
          isSpinning || isMatched || !canHover || prefersReduced
            ? undefined
            : getIconSpecificHover()
        }
        variants={outerVariants}
        transition={
          isSpinning
            ? { repeat: Infinity, duration: 1.1, ease: 'linear' }
            : isMatched || prefersReduced
              ? { duration: 0.25 }
              : { type: 'spring', stiffness: 480, damping: 26, mass: 0.75 }
        }
        onClick={onClick}
      >
        <IconComponent
          ref={innerIconRef}
          size={size}
          color={color}
          strokeWidth={strokeWidth}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            overflow: 'visible',
          }}
        />
      </motion.div>
    );
  }
);

AnimatedIcon.displayName = 'AnimatedIcon';
