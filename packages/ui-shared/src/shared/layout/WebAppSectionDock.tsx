import {
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  type AppKey,
  useT,
  APP_SECTIONS,
  useStudioPreferences,
  useSettingsStore,
  useShallow,
  DurationPresets,
  EasingPresets,
  SpringPresets,
} from '@workspace/studio-core';
import React, { useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from 'motion/react';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

interface DockItemProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  accent: any;
  isLight: boolean;
  reduceMotion: boolean;
  mouseX: MotionValue<number>;
  onClick: () => void;
}

function DockItem({
  id,
  label,
  icon,
  isActive,
  accent,
  isLight,
  reduceMotion,
  mouseX,
  onClick,
}: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const canHover = useHoverCapable();
  const [isHovered, setIsHovered] = useState(false);

  // Proximity magnification logic
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Scale item width/height from 46px to 72px based on distance (range: -150px to 150px)
  const sizeTransform = useTransform(distance, [-150, 0, 150], [46, 72, 46]);
  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 160,
    damping: 15,
  });

  // Scale icon size proportionally from 20px to 32px
  const iconSizeTransform = useTransform(distance, [-150, 0, 150], [20, 32, 20]);
  const iconSize = useSpring(iconSizeTransform, {
    mass: 0.1,
    stiffness: 160,
    damping: 15,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: DurationPresets.fast, ease: EasingPresets.standard }}
            style={{
              position: 'absolute',
              bottom: '100%',
              marginBottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              borderRadius: '8px',
              background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 10, 12, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              color: isLight ? '#09090b' : '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--type-nav-font, var(--studio-font-body))',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.08)' : '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={ref}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => canHover && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: reduceMotion ? 46 : size,
          height: reduceMotion ? 46 : size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
          background: isActive
            ? isLight
              ? '#09090b'
              : '#ffffff'
            : isLight
              ? 'rgba(0, 0, 0, 0.05)'
              : 'rgba(255, 255, 255, 0.06)',
          color: isActive
            ? isLight
              ? '#ffffff'
              : '#09090b'
            : isLight
              ? 'rgba(0, 0, 0, 0.7)'
              : 'rgba(255, 255, 255, 0.7)',
          boxShadow:
            isActive && !reduceMotion
              ? isLight
                ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                : '0 4px 12px rgba(255, 255, 255, 0.15)'
              : 'none',
          transformOrigin: 'bottom center',
          transition: reduceMotion
            ? // @ts-ignore
              'none'
            : `background-color ${DurationPresets.fast * 1000}ms cubic-bezier(${EasingPresets.standard.join(',')}), color ${DurationPresets.fast * 1000}ms cubic-bezier(${EasingPresets.standard.join(',')}), transform ${DurationPresets.fast * 1000}ms cubic-bezier(${EasingPresets.standard.join(',')})`,
        }}
        whileHover={canHover && !reduceMotion ? { y: -6 } : undefined}
        transition={SpringPresets.soft}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`dock-item-${id}`}
        data-section={id}
      >
        <motion.span
          className="material-symbols-outlined"
          style={{
            fontSize: reduceMotion ? 20 : iconSize,
            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {icon}
        </motion.span>
      </motion.button>
    </div>
  );
}

export default function WebAppSectionDock({
  app,
  activeSection,
  onChangeSection,
}: {
  app: string;
  activeSection: string;
  onChangeSection: (sectionId: any) => void;
}) {
  const settings = useSettingsStore(
    useShallow((s) => ({
      perApp: s.settings.perApp,
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      accentColor: s.settings.accentColor,
    }))
  );
  const { preferences } = useStudioPreferences();
  const t = useT();
  const vt = t.vocalex as any;

  const mouseX = useMotionValue(Infinity);
  const canHover = useHoverCapable();
  const appReducedMotion = useAppReducedMotion();

  const appKey = (app === 'stage' ? 'stagex' : app) as AppKey;
  const sections = APP_SECTIONS[appKey] || APP_SECTIONS[app];
  if (!sections || sections.length === 0) return null;

  // If dock is disabled in preferences, don't render it
  if (!preferences.showWebAppDock) return null;

  const activeVis = settings.perApp?.[appKey] ?? {
    theme: settings.theme ?? 'dark',
    amoledMode: settings.amoledMode ?? false,
  };
  // Accent color resolved from global user settings
  const accent = resolveAccent(settings.accentColor);

  const getSectionLabel = (labelKey: string) => {
    switch (labelKey) {
      case 'songs':
        return t.nav?.songs || 'Songs';
      case 'library':
        return t.nav?.library || 'Library';
      case 'chords':
        return t.nav?.chords || 'Chords';

      case 'drumSongs':
        return t.drum?.songs || 'Beats';
      case 'drumPatterns':
        return t.drum?.patterns || 'Patterns';
      case 'drumPreferences':
        return t.drum?.preferences || 'Preferences';

      case 'groovexLibrary':
        return t.groovex?.library || 'Library';
      case 'groovexPreferences':
        return t.groovex?.preferences || 'Preferences';

      case 'vocalexCoach':
        return vt.navCoach || 'Coach';
      case 'vocalexTakes':
        return vt.navTakes || 'Takes';
      case 'vocalexPreferences':
        return vt.navPreferences || 'Preferences';

      case 'stagexStage':
        return t.stagex?.navStage || 'Stage';
      case 'stagexSetup':
        return t.stagex?.navSetup || 'Setup';
      case 'stagexPreferences':
        return t.stagex?.navPreferences || 'Preferences';

      default:
        return labelKey;
    }
  };

  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const isAmoled = !isLight && Boolean(settings.amoledMode || activeVis.amoledMode);

  const amoledBg = isAmoled
    ? 'rgba(0, 0, 0, 0.95)'
    : isLight
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(15, 15, 20, 0.65)';

  const reduceMotion = Boolean(preferences.reduceMotion || appReducedMotion);

  return (
    <motion.div
      onMouseMove={(e) => {
        if (!reduceMotion && canHover) mouseX.set(e.pageX);
      }}
      onMouseLeave={() => {
        if (!reduceMotion) mouseX.set(Infinity);
      }}
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '10px 14px',
        gap: '12px',
        borderRadius: '24px',
        background: amoledBg,
        backdropFilter: 'var(--surface-float-blur)',
        WebkitBackdropFilter: 'var(--surface-float-blur)',
        border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isLight
          ? '0 12px 36px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02)'
          : '0 16px 48px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.25)',
        height: '58px', // Constrain container height to prevent layout jump on scale
        transition: reduceMotion
          ? 'none'
          : `background-color ${DurationPresets.normal * 1000}ms cubic-bezier(${EasingPresets.standard.join(',')}), border-color ${DurationPresets.normal * 1000}ms cubic-bezier(${EasingPresets.standard.join(',')})`,
      }}
    >
      {sections.map((section) => (
        <DockItem
          key={section.id}
          id={section.id}
          label={getSectionLabel(section.labelKey)}
          icon={section.icon}
          isActive={activeSection === section.id}
          accent={accent}
          isLight={isLight}
          reduceMotion={reduceMotion}
          mouseX={mouseX}
          onClick={() => onChangeSection(section.id)}
        />
      ))}
    </motion.div>
  );
}
