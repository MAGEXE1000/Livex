import React from 'react';
import { motion } from 'motion/react';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { useNavigationAnimation } from './NavigationAnimationProvider';

export interface AnimatedNavigationIconProps {
  itemKey: string;
  iconName?: string;
  iconNode?: React.ReactNode;
  size?: number;
  color?: string;
  strokeWidth?: number;
  isActive: boolean;
  animationEpoch?: number;
}

function getNormalizedIconName(key: string): string {
  const norm = (key || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

  // User & Profile
  if (['user', 'profile', 'account', 'person', 'avatar'].includes(norm)) return 'user';

  // Settings & Preferences
  if (['settings', 'cog', 'gear'].includes(norm)) return 'settings';
  if (
    [
      'sliders-horizontal',
      'slidershorizontal',
      'preferences',
      'drumpreferences',
      'groovexpreferences',
      'vocalexpreferences',
      'stagexpreferences',
      'prefs',
    ].includes(norm)
  ) {
    return 'sliders-horizontal';
  }

  // Chordex
  if (['audio-lines', 'audiolines', 'songs', 'song', 'chordex', 'chords'].includes(norm))
    return 'audio-lines';
  if (['gallery-vertical-end', 'galleryverticalend', 'library'].includes(norm))
    return 'gallery-vertical-end';
  if (['tuning-fork', 'tuningfork', 'tuner', 'chordextuner', 'afinador', 'afinar'].includes(norm))
    return 'tuning-fork';

  // Drumex
  if (['drum', 'drums', 'beats', 'drumbeats', 'drumsongs', 'drumex'].includes(norm)) return 'drum';
  if (['blocks', 'patterns', 'drumpatterns'].includes(norm)) return 'blocks';
  if (['metronome', 'drummetronome', 'timer', 'clock'].includes(norm)) return 'clock';

  // StageX
  if (
    ['layout-panel-top', 'layoutpaneltop', 'stage', 'editor', 'stagexstage', 'stagex'].includes(
      norm
    )
  )
    return 'layout-panel-top';
  if (['layers', 'setup', 'stagexsetup', 'rhythms', 'groovexrhythms'].includes(norm))
    return 'layers';

  // Vocalex
  if (['graduation-cap', 'coach', 'vocalexcoach', 'practice', 'learn'].includes(norm))
    return 'graduation-cap';
  if (['mic', 'recorder', 'vocalexrecorder', 'vocalex'].includes(norm)) return 'mic';
  if (['clap', 'takes', 'vocalextakes', 'clapperboard'].includes(norm)) return 'clapperboard';

  // GrooveX
  if (['disc', 'disc-3', 'disc3', 'groovex', 'record'].includes(norm)) return 'disc';

  // Hub
  if (['hub', 'home'].includes(norm)) return 'home';

  // General fallback equivalents
  if (['songbook', 'catalog'].includes(norm)) return 'book-open';
  if (norm === 'share') return 'share-2';
  if (norm === 'devtools' || norm === 'bug') return 'bug';
  if (norm === 'performance' || norm === 'activity') return 'activity';
  if (norm === 'inspector' || norm === 'search') return 'search';
  if (norm === 'dashboard' || norm === 'layout-dashboard') return 'layout-dashboard';
  if (norm === 'graphic_eq' || norm === 'graphiceq') return 'audio-lines';

  return norm;
}

const MATCHED_NAMES = new Set([
  'activity',
  'audio-lines',
  'blocks',
  'book-open',
  'bug',
  'clap',
  'clapperboard',
  'clock',
  'cog',
  'disc',
  'drum',
  'gallery-vertical-end',
  'graduation-cap',
  'home',
  'layers',
  'layout-dashboard',
  'layout-panel-top',
  'mic',
  'music',
  'search',
  'settings',
  'share-2',
  'sliders-horizontal',
  'user',
]);

const FILLED_VARIANTS_SUPPORT: Record<string, boolean> = {
  home: false,
  user: false,
  profile: false,
  account: false,
  person: false,
  avatar: false,
  settings: false,
  'audio-lines': false,
  'gallery-vertical-end': false,
  'sliders-horizontal': false,
  drum: false,
  blocks: false,
  layers: false,
  'graduation-cap': false,
  mic: false,
  clap: false,
  clapperboard: false,
  'layout-panel-top': false,
  activity: false,
  search: false,
  disc: false,
  'disc-3': false,
  disc3: false,
  music: false,
  'book-open': false,
  'share-2': false,
  bug: false,
  'layout-dashboard': false,
  chordex: false,
  drumex: false,
  stagex: false,
  groovex: false,
  vocalex: false,
  hub: false,
  devtools: false,
  practice: false,
  library: false,
  songs: false,
  song: false,
  beats: false,
  drumbeats: false,
  drumsongs: false,
  patterns: false,
  drumpatterns: false,
  prefs: false,
  preferences: false,
  drumpreferences: false,
  groovexpreferences: false,
  vocalexpreferences: false,
  stagexpreferences: false,
  rhythms: false,
  groovexrhythms: false,
  coach: false,
  vocalexcoach: false,
  recorder: false,
  vocalexrecorder: false,
  takes: false,
  vocalextakes: false,
  editor: false,
  setup: false,
  stagexsetup: false,
  stage: false,
  stagexstage: false,
  record: false,
  audiolines: false,
  galleryverticalend: false,
  slidershorizontal: false,
  layoutpaneltop: false,
};

const AnimatedNavigationIconComponent = React.forwardRef<any, AnimatedNavigationIconProps>(
  (
    {
      itemKey,
      iconName,
      iconNode,
      size = 24,
      color = 'currentColor',
      strokeWidth = 2,
      isActive,
      animationEpoch,
    },
    ref
  ) => {
    const navAnim = useNavigationAnimation();
    const direction = navAnim ? navAnim.direction : 'forward';
    const dirSign = direction === 'reverse' ? -1 : 1;

    const resolvedName = getNormalizedIconName(iconName || itemKey);

    // Log explicit warning if a filled variant of this icon is requested/expected but not supported
    // Skip checking if a custom iconNode (e.g. profile avatar JSX) is supplied
    if (
      !iconNode &&
      isActive &&
      typeof window !== 'undefined' &&
      FILLED_VARIANTS_SUPPORT[resolvedName] === undefined &&
      FILLED_VARIANTS_SUPPORT[itemKey] === undefined &&
      FILLED_VARIANTS_SUPPORT[iconName || ''] === undefined
    ) {
      console.warn(
        `[AnimatedNavigationIcon] Warning: Filled status of icon "${resolvedName}" is unmapped.`
      );
    }

    // Squish-stretch keyframes for elastic bounce
    const scaleX = isActive ? [1, 1.2, 0.92, 1.04, 1] : 1;
    const scaleY = isActive ? [1, 0.8, 1.08, 0.96, 1] : 1;
    const rotate = isActive ? [0, -6 * dirSign, 4 * dirSign, 0] : 0;

    const content = iconNode ? (
      <div
        style={{
          width: size,
          height: size,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconNode}
      </div>
    ) : (
      <AnimatedIcon
        ref={ref}
        name={resolvedName}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        state={isActive ? 'active' : 'inactive'}
        animationEpoch={animationEpoch}
      />
    );

    return (
      <motion.div
        key={`nav-icon-${resolvedName}`}
        animate={{
          opacity: isActive ? 1 : 0.85,
          scaleX,
          scaleY,
          rotate,
        }}
        transition={{
          duration: 0.38,
          ease: [0.25, 1, 0.5, 1], // premium elastic curve
        }}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {content}
      </motion.div>
    );
  }
);

AnimatedNavigationIconComponent.displayName = 'AnimatedNavigationIcon';

export const AnimatedNavigationIcon = React.memo(AnimatedNavigationIconComponent);
