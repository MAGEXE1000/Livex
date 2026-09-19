import React, { forwardRef, memo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  X,
  Plus,
  PlusCircle,
  Trash2,
  Pencil,
  Minus,
  Save,
  Check,
  CheckCircle2,
  Undo,
  Redo,
  Menu,
  Home,
  Settings,
  User,
  Users,
  Layers,
  Grid,
  LayoutGrid,
  LayoutDashboard,
  MoreVertical,
  MoreHorizontal,
  GripVertical,
  Mic,
  MicOff,
  Music,
  Volume2,
  Volume1,
  VolumeX,
  Headphones,
  Disc,
  Library,
  SlidersHorizontal,
  Sliders,
  Gauge,
  Play,
  PlayCircle,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Search,
  SearchX,
  Copy,
  Download,
  CloudDownload,
  Upload,
  CloudUpload,
  Cloud,
  CloudOff,
  RefreshCw,
  History,
  Clock,
  Timer,
  Lock,
  Unlock,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Shield,
  ShieldCheck,
  Ban,
  Bookmark,
  BookmarkPlus,
  Heart,
  Star,
  Eye,
  EyeOff,
  Share2,
  ExternalLink,
  Terminal,
  Code,
  Bug,
  Moon,
  Sun,
  Palette,
  Globe,
  GraduationCap,
  Pin,
  Compass,
  BarChart2,
  BarChart3,
  Camera,
  Smile,
  Smartphone,
  Zap,
  Speaker,
  Cable,
  type LucideIcon,
} from 'lucide-react';

export interface LivexIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  filled?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

export type StudioIconProps = LivexIconProps;

// Custom Piano SVG Icon
const PianoIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  width = 24,
  height = 24,
  stroke = 'currentColor',
  strokeWidth = 2,
  fill = 'none',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={width}
    height={height}
    stroke={stroke}
    strokeWidth={strokeWidth}
    fill={fill}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="6" y1="4" x2="6" y2="13" />
    <line x1="10" y1="4" x2="10" y2="13" />
    <line x1="14" y1="4" x2="14" y2="13" />
    <line x1="18" y1="4" x2="18" y2="13" />
    <line x1="8" y1="4" x2="8" y2="13" strokeWidth={3} />
    <line x1="12" y1="4" x2="12" y2="13" strokeWidth={3} />
    <line x1="16" y1="4" x2="16" y2="13" strokeWidth={3} />
  </svg>
);

// Fallback glyph for unmapped names (renders clean vector circle, NEVER raw text)
const FallbackGlyph: React.FC<React.SVGProps<SVGSVGElement>> = ({
  width = 24,
  height = 24,
  stroke = 'currentColor',
  strokeWidth = 2,
  fill = 'none',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={width}
    height={height}
    stroke={stroke}
    strokeWidth={strokeWidth}
    fill={fill}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="9" opacity="0.35" />
    <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />
  </svg>
);

// Canonical icon table mapping Material Symbol ligature names to Lucide / local SVG
const ICON_MAP: Record<string, LucideIcon | React.FC<any>> = {
  // Chevrons & Carets
  chevron_right: ChevronRight,
  'chevron-right': ChevronRight,
  chevronright: ChevronRight,
  arrow_forward_ios: ChevronRight,
  chevron_left: ChevronLeft,
  'chevron-left': ChevronLeft,
  chevronleft: ChevronLeft,
  arrow_back_ios: ChevronLeft,
  chevron_down: ChevronDown,
  'chevron-down': ChevronDown,
  chevrondown: ChevronDown,
  expand_more: ChevronDown,
  'expand-more': ChevronDown,
  chevron_up: ChevronUp,
  'chevron-up': ChevronUp,
  chevronup: ChevronUp,
  expand_less: ChevronUp,
  'expand-less': ChevronUp,
  unfold_more: SlidersHorizontal,

  // Directional Arrows
  arrow_back: ArrowLeft,
  'arrow-back': ArrowLeft,
  arrow_left: ArrowLeft,
  'arrow-left': ArrowLeft,
  arrowleft: ArrowLeft,
  arrow_forward: ArrowRight,
  'arrow-forward': ArrowRight,
  arrow_right: ArrowRight,
  'arrow-right': ArrowRight,
  arrowright: ArrowRight,
  arrow_upward: ArrowUp,
  'arrow-upward': ArrowUp,
  arrow_downward: ArrowDown,
  'arrow-downward': ArrowDown,
  arrow_up_to_line: ArrowUpToLine,
  'arrow-up-to-line': ArrowUpToLine,
  publish: ArrowUpToLine,

  // Core Actions
  close: X,
  x: X,
  cancel: X,
  clear: X,
  add: Plus,
  plus: Plus,
  add_circle: PlusCircle,
  'add-circle': PlusCircle,
  delete: Trash2,
  trash: Trash2,
  'trash-2': Trash2,
  delete_forever: Trash2,
  delete_sweep: Trash2,
  edit: Pencil,
  pencil: Pencil,
  mode_edit: Pencil,
  remove: Minus,
  minus: Minus,
  horizontal_rule: Minus,
  save: Save,
  check: Check,
  done: Check,
  check_circle: CheckCircle2,
  'check-circle': CheckCircle2,
  verified: CheckCircle2,
  task_alt: CheckCircle2,
  undo: Undo,
  redo: Redo,

  // Navigation, Hub, & Layout
  menu: Menu,
  menu_open: Menu,
  home: Home,
  settings: Settings,
  cog: Settings,
  person: User,
  user: User,
  account_circle: User,
  profile: User,
  avatar: User,
  group: Users,
  groups: Users,
  users: Users,
  layers: Layers,
  grid_view: LayoutGrid,
  grid: Grid,
  'grid-view': LayoutGrid,
  apps: LayoutGrid,
  dashboard: LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  more_vert: MoreVertical,
  'more-vert': MoreVertical,
  more_horiz: MoreHorizontal,
  'more-horiz': MoreHorizontal,
  drag_indicator: GripVertical,
  'drag-indicator': GripVertical,

  // Audio, Speech, & Instrument
  mic: Mic,
  recorder: Mic,
  mic_none: Mic,
  mic_off: MicOff,
  music_note: Music,
  music: Music,
  music_off: VolumeX,
  volume_up: Volume2,
  'volume-2': Volume2,
  volume_down: Volume1,
  volume_mute: VolumeX,
  volume_off: VolumeX,
  graphic_eq: AudioWaveformIcon,
  headphones: Headphones,
  piano: PianoIcon,
  album: Disc,
  record: Disc,
  disc: Disc,
  'disc-3': Disc,
  queue_music: Library,
  library_music: Library,
  catalog: Library,
  songbook: Library,
  equalizer: Sliders,
  sliders: Sliders,
  tune: SlidersHorizontal,
  'sliders-horizontal': SlidersHorizontal,
  speed: Gauge,
  record_voice_over: Mic,

  // Playback & Media
  play_arrow: Play,
  play: Play,
  play_circle: PlayCircle,
  pause: Pause,
  stop: Square,
  skip_previous: SkipBack,
  'skip-previous': SkipBack,
  skip_next: SkipForward,
  'skip-next': SkipForward,
  replay: RotateCcw,
  restart_alt: RotateCcw,
  'restart-alt': RotateCcw,
  replay_10: RotateCcw,
  forward_10: RotateCw,
  repeat: Repeat,

  // Search & Content
  search: Search,
  search_off: SearchX,
  search_hands_free: Search,
  content_copy: Copy,
  copy: Copy,
  download: Download,
  cloud_download: CloudDownload,
  upload: Upload,
  upload_file: Upload,
  cloud_upload: CloudUpload,
  cloud: Cloud,
  cloud_queue: Cloud,
  cloud_done: Cloud,
  cloud_off: CloudOff,
  cloud_sync: RefreshCw,
  refresh: RefreshCw,
  sync: RefreshCw,
  'refresh-cw': RefreshCw,
  history: History,
  schedule: Clock,
  timer: Timer,
  timelapse: Timer,

  // Status & Security
  lock: Lock,
  lock_reset: Lock,
  lock_open: Unlock,
  warning: AlertTriangle,
  'triangle-alert': AlertTriangle,
  error: AlertCircle,
  error_outline: AlertCircle,
  info: Info,
  help: HelpCircle,
  help_center: HelpCircle,
  help_outline: HelpCircle,
  'circle-help': HelpCircle,
  about: AlertCircle,
  'badge-alert': AlertCircle,
  shield: Shield,
  security: Shield,
  verified_user: ShieldCheck,
  'shield-check': ShieldCheck,
  block: Ban,

  // Meta, Tools, & Misc
  bookmark: Bookmark,
  bookmark_add: BookmarkPlus,
  bookmark_border: Bookmark,
  favorite: Heart,
  heart: Heart,
  star: Star,
  star_outline: Star,
  visibility: Eye,
  eye: Eye,
  visibility_off: EyeOff,
  'eye-off': EyeOff,
  share: Share2,
  'share-2': Share2,
  open_in_new: ExternalLink,
  'external-link': ExternalLink,
  terminal: Terminal,
  code: Code,
  bug_report: Bug,
  bug: Bug,
  dark_mode: Moon,
  light_mode: Sun,
  palette: Palette,
  language: Globe,
  globe: Globe,
  school: GraduationCap,
  'graduation-cap': GraduationCap,
  coach: GraduationCap,
  practice: GraduationCap,
  straighten: Pin,
  push_pin: Pin,
  explore: Compass,
  compass: Compass,
  insights: BarChart2,
  query_stats: BarChart3,
  analytics: BarChart2,
  'bar-chart': BarChart2,
  photo_camera: Camera,
  emoji_emotions: Smile,
  devices: Smartphone,
  sensors: Zap,
  electric_bolt: Zap,
  speaker: Speaker,
  cable: Cable,
  install_mobile: Smartphone,
  system_update: RefreshCw,
  display_settings: Settings,
  settings_input_component: Sliders,
  settings_input_hdmi: Cable,
  toggle_on: CheckCircle2,
  toggle_off: Ban,
  crop_free: Grid,
  select_all: LayoutGrid,
};

// Helper audio waveform icon
function AudioWaveformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.width || 24}
      height={props.height || 24}
      stroke={props.stroke || 'currentColor'}
      strokeWidth={props.strokeWidth || 2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 10v4" />
      <path d="M6 6v12" />
      <path d="M10 3v18" />
      <path d="M14 8v8" />
      <path d="M18 5v14" />
      <path d="M22 10v4" />
    </svg>
  );
}

// Normalizer: strips quotes, curly braces, trims whitespace and converts to lower snake/kebab
export function normalizeIconName(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/^[{'"`]+|['"`}]+$/g, '')
    .trim();
}

/**
 * Checks whether an icon name is known to the StudioIcon registry.
 */
export function hasLivexIcon(name: string): boolean {
  const norm = normalizeIconName(name);
  return !!ICON_MAP[norm];
}

export const hasStudioIcon = hasLivexIcon;

/**
 * Canonical LivexIcon Component
 *
 * Deterministically renders an icon as an SVG component.
 * Physically eliminates any possibility of ligature text fallback ("chevron_right", "close", etc.).
 */
export const LivexIcon = memo(
  forwardRef<SVGSVGElement, LivexIconProps>(
    (
      {
        name,
        size = 24,
        color = 'currentColor',
        strokeWidth = 2,
        className = '',
        style,
        filled = false,
        'aria-hidden': ariaHidden = true,
        'aria-label': ariaLabel,
        ...rest
      },
      ref
    ) => {
      const norm = normalizeIconName(name);
      if (!norm) return null;

      const Component = ICON_MAP[norm] || FallbackGlyph;
      const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 24;

      const combinedStyle: React.CSSProperties = {
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      };

      return (
        <Component
          ref={ref as any}
          width={numSize}
          height={numSize}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={filled ? color : 'none'}
          className={className}
          style={combinedStyle}
          aria-hidden={ariaHidden}
          aria-label={ariaLabel}
          {...rest}
        />
      );
    }
  )
);

LivexIcon.displayName = 'LivexIcon';

export const StudioIcon = LivexIcon;

