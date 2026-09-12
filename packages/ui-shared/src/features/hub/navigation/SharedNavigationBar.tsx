import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  AnimatePresence,
} from 'motion/react';
import {
  subscribeNavScrollOffset,
  getNavScrollOffset,
  NavigationDispatcher,
  SpringPresets,
  useBottomNavigationStore,
  useBackHandler,
  StartupCoordinator,
  useT,
} from '@workspace/studio-core';
import {
  StudioLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../chordex/icons/ChordexLogo';
import { AnimatedNavigationIcon } from './AnimatedNavigationIcon';
import { NavigationAnimationProvider } from './NavigationAnimationProvider';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

function useStartupComplete() {
  const [complete, setComplete] = useState(() => StartupCoordinator.isStartupComplete());

  useEffect(() => {
    if (complete) return;
    return StartupCoordinator.subscribeStartupComplete(() => {
      setComplete(true);
    });
  }, [complete]);

  return complete;
}

export interface SharedNavigationItem {
  key: string;
  icon: string | React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface SharedNavigationBarProps {
  items: SharedNavigationItem[];
  isLight: boolean;
  visible?: boolean;
  isLocked?: boolean;
  collapsed: boolean;
  isSwitcherOpen: boolean;
  setIsSwitcherOpen: (open: boolean) => void;
  currentApp: string;
  onOpenProfile?: () => void;
  user?: any;
  customPhoto?: string | null;
  profileIcon?: React.ReactNode;
}

const NavigationItem = React.memo(
  ({
    item,
    index,
    onClick,
    isActive,
    isLight = false,
    isSwitcherOpen,
    totalSlots = 3,
    animationEpoch,
  }: {
    item: any;
    index: number;
    onClick: () => void;
    isActive: boolean;
    isLight?: boolean;
    isSwitcherOpen?: boolean;
    totalSlots?: number;
    activeIdxSpring?: any;
    activeIndex?: number;
    onMeasureGeometry?: (index: number, width: number, leftOffset: number) => void;
    innerWrapperRef?: React.RefObject<HTMLDivElement | null>;
    animationEpoch?: number;
  }) => {
    const isIconString = typeof item.icon === 'string';

    const iconColor = isLight
      ? isActive
        ? '#2563eb'
        : 'var(--c-text-secondary, rgba(15, 23, 42, 0.60))'
      : isActive
        ? 'var(--studio-accent-from, #60a5fa)'
        : 'var(--c-text-secondary, rgba(255, 255, 255, 0.65))';

    const labelColor = isLight
      ? isActive
        ? '#2563eb'
        : 'var(--c-text-secondary, rgba(15, 23, 42, 0.60))'
      : isActive
        ? 'var(--studio-accent-from, #60a5fa)'
        : 'var(--c-text-secondary, rgba(255, 255, 255, 0.65))';

    const labelLen = item.label ? item.label.length : 0;
    const fontSize =
      labelLen >= 12 ? '9.5px' : totalSlots >= 4 || labelLen >= 10 ? '10px' : '10.5px';
    const letterSpacing = labelLen >= 11 ? '-0.025em' : '-0.015em';

    return (
      <motion.button
        onClick={onClick}
        aria-label={item.label}
        title={item.label}
        data-nav-item-index={index}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 25 }}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '22px',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          padding: '2px 4px',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          gap: '2px',
        }}
      >
        <div
          data-nav-content="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isSwitcherOpen ? '0px' : '1.5px',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isSwitcherOpen ? 32 : 22,
              height: isSwitcherOpen ? 32 : 22,
            }}
          >
            {isIconString ? (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconName={item.icon as string}
                size={isSwitcherOpen ? 22 : 21}
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            ) : (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconNode={item.icon}
                size={isSwitcherOpen ? 22 : 21}
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            )}
          </div>

          {!isSwitcherOpen && item.label && (
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize,
                fontWeight: isActive ? 700 : 550,
                color: labelColor,
                whiteSpace: 'nowrap',
                letterSpacing,
                lineHeight: 1.15,
                textAlign: 'center',
                userSelect: 'none',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 180ms ease, font-weight 180ms ease',
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      </motion.button>
    );
  }
);

export function SharedNavigationBar({
  items,
  isLight,
  visible = true,
  isLocked,
  collapsed,
  isSwitcherOpen,
  setIsSwitcherOpen,
  currentApp,
  onOpenProfile,
  user,
  customPhoto,
  profileIcon,
}: SharedNavigationBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const startupComplete = useStartupComplete();
  const t = useT();
  const isSpanish = (t as any).nav?.profile === 'Perfil';

  const storeLocked = useBottomNavigationStore((s) => s.isLocked);
  const isEffectiveLocked = Boolean(isLocked || storeLocked);
  const isEffectiveHidden = !visible || isEffectiveLocked;

  const isProfileMenuOpen = useBottomNavigationStore((s) => s.isProfileMenuOpen);
  const setProfileMenuOpen = useBottomNavigationStore((s) => s.setProfileMenuOpen);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef(false);
  const scrubbingIndexRef = useRef(0);
  const navigationEpochRef = useRef(0);
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const pointerUpHandledAtRef = useRef(0);

  // Close profile menu on hardware back press
  useBackHandler(
    'modal',
    () => {
      if (isProfileMenuOpen) {
        setProfileMenuOpen(false);
        return true;
      }
      return false;
    },
    [isProfileMenuOpen, setProfileMenuOpen]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__navMetrics = (window as any).__navMetrics || {
        mounts: 0,
        unmounts: 0,
        fallbackActivations: 0,
        recoveries: 0,
        itemRebuilds: 0,
        controllerRecreations: 0,
      };
      (window as any).__navMetrics.mounts++;
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).__navMetrics.unmounts++;
      }
    };
  }, []);

  const handleAppSwitch = (appKey: string) => {
    if (isEffectiveHidden) return;
    NavigationDispatcher.push({ app: appKey as any });
    setIsSwitcherOpen(false);
  };

  const switcherApps = useMemo(
    () => [
      {
        key: 'hub',
        label: 'Hub',
        icon: <StudioLogo size={20} />,
        onClick: () => handleAppSwitch('hub'),
      },
      {
        key: 'chordex',
        label: 'Chordex',
        icon: <ChordexLogo size={20} />,
        onClick: () => handleAppSwitch('chordex'),
      },
      {
        key: 'drumex',
        label: 'Drumex',
        icon: <DrumexLogo size={20} />,
        onClick: () => handleAppSwitch('drumex'),
      },
      {
        key: 'stagex',
        label: 'Stagex',
        icon: <StagexLogoIcon size={20} />,
        onClick: () => handleAppSwitch('stagex'),
      },
      {
        key: 'groovex',
        label: 'Groovex',
        icon: <GroovexLogo size={20} />,
        onClick: () => handleAppSwitch('groovex'),
      },
      {
        key: 'vocalex',
        label: 'Vocalex',
        icon: <VocalexLogo size={20} />,
        onClick: () => handleAppSwitch('vocalex'),
      },
    ],
    []
  );

  // Dynamic screen width monitoring
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 360
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const innerWrapperRef = useRef<HTMLDivElement | null>(null);

  const isHub = currentApp === 'hub';
  const showSwitcherButton = currentApp !== 'hub';

  const currentItems = isSwitcherOpen ? switcherApps : items || [];
  const N = currentItems.length || 1;
  const totalSlots = N;

  const idealSlotWidth = isSwitcherOpen
    ? 46
    : isHub
      ? 82
      : totalSlots >= 4
        ? 60
        : totalSlots === 2
          ? 88
          : 76;
  const paddingX = isSwitcherOpen ? 6 : 8;

  // hasRightBubble: true when App Changer satellite button is shown (non-hub apps only)
  const hasRightBubble = showSwitcherButton;
  const satelliteWidth = 58;
  const dockGap = 8;
  const edgeMargin = 6;
  const maxScreenWidth = Math.min(windowWidth - 24, 600);
  // Satellite button is positioned at barWidth / 2 + dockGap.
  // To keep it strictly within the visible viewport: barWidth / 2 + dockGap + satelliteWidth <= windowWidth / 2 - edgeMargin
  const maxBarWithSatellite = Math.max(
    180,
    (windowWidth / 2 - dockGap - satelliteWidth - edgeMargin) * 2
  );
  const maxBarWidth = hasRightBubble
    ? Math.min(maxScreenWidth, maxBarWithSatellite)
    : maxScreenWidth;

  const targetBarWidth = totalSlots * idealSlotWidth + paddingX * 2;
  const minBarW = isSwitcherOpen
    ? Math.min(240, maxBarWidth)
    : windowWidth < 480
      ? Math.min(180, maxBarWidth)
      : 220;
  const barWidth = Math.max(Math.min(targetBarWidth, maxBarWidth), Math.min(minBarW, maxBarWidth));

  const usableWidth = barWidth - paddingX * 2;
  const itemWidth = usableWidth / totalSlots;

  const activeIndex = useMemo(() => {
    const idx = currentItems.findIndex((item) => {
      return isSwitcherOpen ? item.key === currentApp : item.isActive;
    });
    return idx >= 0 ? idx : 0;
  }, [currentItems, currentApp, isSwitcherOpen]);

  // Symmetrical lens pill sizing and exact slot-centering.
  // The selected highlight dimensions are calculated independently: they fully contain
  // the icon and label with consistent internal padding, without enlarging or shifting the navbar.
  const pillWidthVal = useMemo(() => {
    if (isSwitcherOpen) {
      return Math.min(40, Math.max(32, itemWidth - 8));
    }
    const activeItem = currentItems[activeIndex];
    const labelStr = typeof activeItem?.label === 'string' ? activeItem.label : '';
    const labelLen = labelStr.length;
    const charWidth = totalSlots >= 4 || labelLen >= 10 ? 5.8 : 6.2;
    const contentWidth = Math.max(22, Math.round(labelLen * charWidth));
    const desiredPillWidth = contentWidth + 18;
    const maxPillWidth = itemWidth - (totalSlots >= 4 ? 6 : 8);
    const minPillWidth = Math.min(38, maxPillWidth);
    return Math.min(maxPillWidth, Math.max(minPillWidth, desiredPillWidth));
  }, [isSwitcherOpen, currentItems, activeIndex, itemWidth, totalSlots]);

  const centerOffset = (itemWidth - pillWidthVal) / 2;

  const getPillX = useCallback(
    (index: number) => {
      return index * itemWidth + centerOffset;
    },
    [centerOffset, itemWidth]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // UNIFIED MOTION GRAPH ROOT ENGINE
  // All navigation movements, pill, profile, scale derive continuously from this graph.
  // ─────────────────────────────────────────────────────────────────────────────

  // Root MotionValues
  const activeIdxRaw = useMotionValue(activeIndex);
  const scrollOffsetRaw = useMotionValue(getNavScrollOffset());
  const profileOpenRaw = useMotionValue(isProfileMenuOpen ? 1 : 0);

  const dragXRaw = useMotionValue(0);
  const dragSkewRaw = useMotionValue(0);
  const pressPressureRaw = useMotionValue(0);

  // Synchronized Apple-grade spring physics
  const activeIdxSpring = useSpring(
    activeIdxRaw,
    prefersReduced
      ? { stiffness: 1000, damping: 50, mass: 0.01 }
      : { stiffness: 360, damping: 30, mass: 0.8 }
  );
  const scrollOffsetSpring = useSpring(scrollOffsetRaw, { stiffness: 380, damping: 30, mass: 0.7 });
  const profileOpenSpring = useSpring(profileOpenRaw, { stiffness: 420, damping: 28, mass: 0.8 });

  // Update root raw MotionValues continuously on state changes
  useEffect(() => {
    activeIdxRaw.set(activeIndex);
  }, [activeIndex, activeIdxRaw]);

  // Connect scroll listener directly without causing React component re-renders
  useEffect(() => {
    return subscribeNavScrollOffset((offset) => {
      scrollOffsetRaw.set(offset);
    });
  }, [scrollOffsetRaw]);

  useEffect(() => {
    profileOpenRaw.set(isProfileMenuOpen ? 1 : 0);
  }, [isProfileMenuOpen, profileOpenRaw]);

  useEffect(() => {
    scrollOffsetRaw.set(0);
    scrollOffsetSpring.jump(0);
  }, [currentApp, items, scrollOffsetRaw, scrollOffsetSpring]);

  // Safari-style physical compression: dock scales down (1.00 → 0.88) on scroll
  const containerScale = useTransform(scrollOffsetSpring, (offset) => {
    return 1.0 - offset * 0.12;
  });

  // With transformOrigin 'center bottom', no Y translation needed — bottom-anchored
  // scale handles the tuck effect without additional vertical movement.
  const containerY = useTransform(scrollOffsetSpring, () => 0);

  // App Changer satellite: smooth progressive fade-out and subtle scale-down on scroll
  const switcherOpacity = useTransform(scrollOffsetSpring, (offset) => {
    if (offset <= 0) return 1.0;
    if (offset >= 0.7) return 0;
    return 1.0 - offset / 0.7;
  });

  const switcherScale = useTransform(scrollOffsetSpring, (offset) => 1.0 - offset * 0.18);

  const switcherPointerEvents = useTransform(scrollOffsetSpring, (offset) =>
    offset > 0.4 ? 'none' : 'auto'
  );

  // Derived continuous pill movement with zero layout jumps
  const pillX = useTransform(
    [activeIdxRaw, activeIdxSpring, dragXRaw],
    ([rawIdx, springIdx, dragVal]) => {
      const isScrubbingActive = isScrubbingRef.current;
      const idxVal = isScrubbingActive ? (rawIdx as number) : (springIdx as number);
      const idx = Math.max(0, Math.min(totalSlots - 1, idxVal));
      const rawX = idx * itemWidth + centerOffset + (dragVal as number);
      return Math.max(0, Math.min(usableWidth - pillWidthVal, rawX));
    }
  );

  const animatedPillX = pillX;

  const pillPressScale = useTransform(pressPressureRaw, [0, 5], [1, 0.96]);

  // Derived continuous profile menu transformations
  const profileCardOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);
  const profileCardY = useTransform(profileOpenSpring, [0, 1], [16, 0]);
  const profileCardScale = useTransform(profileOpenSpring, [0, 1], [0.94, 1]);
  const profileBackdropOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);

  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden || e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const minX = getPillX(0);
    const maxX = getPillX(N - 1);
    const clampedX = Math.max(minX, Math.min(maxX, relativeX));

    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    isScrubbingRef.current = false;
    scrubbingIndexRef.current = activeIndex;

    animate(pressPressureRaw, 5, { ...SpringPresets.stiff });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden) return;
    const dragDistance = Math.abs(e.clientX - startXRef.current);
    if (!isScrubbingRef.current && dragDistance > 2) {
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (!isScrubbingRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const minX = getPillX(0);
    const maxX = getPillX(N - 1);
    const clampedX = Math.max(minX, Math.min(maxX, relativeX));
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    const dx = e.clientX - lastXRef.current;

    const velocity = dt > 0 ? dx / dt : 0;
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;

    dragXRaw.set(clampedX - getPillX(activeIndex));

    const skew = Math.max(-10, Math.min(10, velocity * 3.5));
    dragSkewRaw.set(skew);

    let hoveredIndex = Math.max(0, Math.min(N - 1, Math.floor((relativeX / usableWidth) * N)));
    if (typeof document !== 'undefined') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const itemEl = el?.closest('[data-nav-item-index]');
      if (itemEl) {
        const idx = Number(itemEl.getAttribute('data-nav-item-index'));
        if (!isNaN(idx) && idx >= 0 && idx < N) {
          hoveredIndex = idx;
        }
      }
    }

    if (hoveredIndex !== scrubbingIndexRef.current) {
      scrubbingIndexRef.current = hoveredIndex;
      activeIdxRaw.set(hoveredIndex);
      if (
        typeof window !== 'undefined' &&
        window.navigator &&
        typeof window.navigator.vibrate === 'function'
      ) {
        try {
          window.navigator.vibrate(5);
        } catch (err) {}
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    useBottomNavigationStore.getState().setMotionState('Idle');
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    animate(dragSkewRaw, 0, { ...SpringPresets.expressive });
    animate(pressPressureRaw, 0, { ...SpringPresets.expressive });
    animate(dragXRaw, 0, { ...SpringPresets.soft });

    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      setIsScrubbing(false);

      const finalIndex = scrubbingIndexRef.current;
      const targetItem = currentItems[finalIndex];

      if (targetItem && finalIndex !== activeIndex) {
        pointerUpHandledAtRef.current = performance.now();
        navigationEpochRef.current += 1;
        setNavigationEpoch(navigationEpochRef.current);
        targetItem.onClick();
      }
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const progress = relativeX / usableWidth;
      const clickIndex = Math.max(0, Math.min(N - 1, Math.floor(progress * N)));
      const clickedItem = currentItems[clickIndex];

      if (clickedItem) {
        pointerUpHandledAtRef.current = performance.now();
        navigationEpochRef.current += 1;
        setNavigationEpoch(navigationEpochRef.current);
        clickedItem.onClick();
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    useBottomNavigationStore.getState().setMotionState('Idle');
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    animate(dragSkewRaw, 0, { ...SpringPresets.expressive });
    animate(pressPressureRaw, 0, { ...SpringPresets.expressive });
    animate(dragXRaw, 0, { ...SpringPresets.soft });

    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  const lastProfileToggleTimeRef = useRef(0);
  useEffect(() => {
    if (isProfileMenuOpen) {
      lastProfileToggleTimeRef.current = Date.now();
    }
  }, [isProfileMenuOpen]);

  const activeTabKey = useMemo(() => {
    const currentItems = isSwitcherOpen ? switcherApps : items;
    const activeItem = currentItems.find((item: any) =>
      isSwitcherOpen ? item.key === currentApp : item.isActive
    );
    return activeItem?.key || null;
  }, [items, switcherApps, isSwitcherOpen, currentApp]);

  if (!visible) return null;

  return (
    <NavigationAnimationProvider activeTab={activeTabKey}>
      <>
        {/* Profile Click-Outside Backdrop */}
        <motion.div
          onPointerDown={(e) => {
            e.stopPropagation();
            if (Date.now() - lastProfileToggleTimeRef.current < 250) return;
            setProfileMenuOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 2000,
            opacity: profileBackdropOpacity,
            pointerEvents: isProfileMenuOpen ? 'auto' : 'none',
          }}
        />

        {/* Profile Menu Card */}
        <motion.div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 16,
            width: 280,
            background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(28, 28, 30, 0.95)',
            backdropFilter: 'var(--surface-float-blur)',
            WebkitBackdropFilter: 'var(--surface-float-blur)',
            borderRadius: 16,
            border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            zIndex: 2001,
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            opacity: profileCardOpacity,
            y: profileCardY,
            scale: profileCardScale,
            pointerEvents: isProfileMenuOpen ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px 12px',
              borderBottom: isLight
                ? '1px solid rgba(0,0,0,0.06)'
                : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(128,128,128,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(128,128,128,0.08)',
              }}
            >
              {customPhoto || user?.photoURL ? (
                <img
                  src={customPhoto || user?.photoURL || ''}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : profileIcon ? (
                profileIcon
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 'var(--font-display-sm)', color: 'var(--c-text-secondary)' }}
                >
                  person
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                {user?.displayName || (isSpanish ? 'Usuario Invitado' : 'Guest User')}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-section-label)',
                  color: 'var(--c-text-secondary)',
                  opacity: 0.8,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {user?.email || 'guest@livex.studio'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => {
                NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
                setProfileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: 'var(--c-text-secondary)' }}
              >
                person
              </span>
              {isSpanish ? 'Ver perfil' : 'View Profile'}
            </button>

            <button
              onClick={() => {
                NavigationDispatcher.push({ app: 'hub', tab: 'settings' });
                setProfileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: 'var(--c-text-secondary)' }}
              >
                settings
              </span>
              {(t as any).nav?.settings || (isSpanish ? 'Ajustes' : 'Settings')}
            </button>
          </div>
        </motion.div>

        {/* Main Unified Bottom Navigation Container */}
        <motion.div
          key="navigation-bar-wrapper"
          ref={containerRef}
          className="shared-bottom-navbar-wrapper"
          animate={{
            y: isEffectiveHidden ? 100 : 0,
            opacity: isEffectiveHidden ? 0 : 1,
            scale: isEffectiveHidden ? 0.94 : 1,
          }}
          transition={{
            duration: 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'fixed',
            bottom: 'max(14px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 14px)))',
            left: 0,
            right: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            visibility: isEffectiveHidden ? 'hidden' : 'visible',
            transformOrigin: 'center center',
          }}
        >
          {/* Bottom Navigation Dock Container */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '100%',
              paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
              paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              className="shared-bottom-nav glass-nav"
              animate={{
                width: barWidth,
                x: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 340,
                damping: 26,
                mass: 0.75,
              }}
              style={{
                contain: 'layout style',
                pointerEvents: isEffectiveHidden ? 'none' : 'auto',
                maxWidth: '100%',
                height: '58px',
                borderRadius: '26px',
                border: 'var(--surface-topbar-border)',
                background: 'var(--surface-topbar-bg)',
                boxShadow: 'var(--surface-topbar-shadow)',
                backdropFilter: 'var(--surface-float-blur)',
                WebkitBackdropFilter: 'var(--surface-float-blur)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                paddingLeft: paddingX,
                paddingRight: paddingX,
                paddingTop: '3px',
                paddingBottom: '3px',
                position: 'relative',
                touchAction: 'none',
                userSelect: 'none',
                // 'center bottom': scale collapses downward toward the fixed
                // bottom anchor so the pill shrinks vertically/downward, not
                // equally inward. This keeps the nav visually centered and
                // prevents any drift toward the bottom-right.
                transformOrigin: 'center bottom',
                scale: containerScale,
                y: containerY,
              }}
            >
              {/* Inner Radial Vignette — realistic optical depth / gentle fresnel reflection */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '26px',
                  background: isLight
                    ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 100%)'
                    : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 100%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              <div
                ref={innerWrapperRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  position: 'relative',
                  touchAction: 'none',
                  // overflow:hidden here (not on the outer backdrop-filter element)
                  // keeps nav items clipped to pill shape without breaking
                  // Android WebView's compositing of the parent's backdrop-filter.
                  overflow: 'hidden',
                  borderRadius: '26px',
                }}
              >
                {/* Active lens pill */}
                <motion.div
                  animate={{
                    width: pillWidthVal,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 340,
                    damping: 26,
                    mass: 0.75,
                  }}
                  style={{
                    position: 'absolute',
                    top: 3,
                    bottom: 3,
                    left: 0,
                    x: animatedPillX,
                    borderRadius: '21px',
                    background: isLight
                      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 244, 255, 0.85) 100%)'
                      : 'var(--surface-glass-lens-bg)',
                    border: isLight
                      ? '1px solid rgba(0, 0, 0, 0.05)'
                      : 'var(--surface-glass-lens-border)',
                    boxShadow: isLight
                      ? '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)'
                      : 'var(--surface-glass-lens-shadow)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    skewX: dragSkewRaw,
                    scale: pillPressScale,
                    willChange: 'transform, width',
                  }}
                >
                  {/* Inner Lens — Radial Center Glow (specular center highlight) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '21px',
                      background: isLight
                        ? 'radial-gradient(ellipse 65% 50% at 50% 8%, rgba(255,255,255,0.40) 0%, transparent 100%)'
                        : 'radial-gradient(ellipse 65% 50% at 50% 8%, rgba(255,255,255,0.12) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </motion.div>

                {/* Navigation items — fluid liquid continuous transformation */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {isSwitcherOpen ? (
                    <motion.div
                      key="switcher"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.022,
                          delayChildren: 0.02,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.12, ease: 'easeOut' },
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        pointerEvents: 'auto',
                      }}
                    >
                      {switcherApps.map((item, index) => {
                        const isActive = item.key === currentApp;
                        return (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, scale: 0.65, y: 4 }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              y: 0,
                              transition: {
                                type: 'spring',
                                stiffness: 360,
                                damping: 24,
                                mass: 0.6,
                              },
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.75,
                              transition: { duration: 0.1, ease: 'easeIn' },
                            }}
                            style={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <NavigationItem
                              item={item}
                              index={index}
                              onClick={() => {
                                if (isEffectiveHidden) return;
                                if (performance.now() - pointerUpHandledAtRef.current < 100) return;
                                navigationEpochRef.current += 1;
                                setNavigationEpoch(navigationEpochRef.current);
                                item.onClick();
                              }}
                              isActive={isActive}
                              isLight={isLight}
                              isSwitcherOpen={true}
                              totalSlots={totalSlots}
                              animationEpoch={navigationEpoch}
                            />
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="nav"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.025,
                          delayChildren: 0.02,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.12, ease: 'easeOut' },
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        pointerEvents: 'auto',
                      }}
                    >
                      {(items || []).map((item, index) => (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, scale: 0.8, y: -2 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: {
                              type: 'spring',
                              stiffness: 360,
                              damping: 24,
                              mass: 0.6,
                            },
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.8,
                            transition: { duration: 0.1, ease: 'easeIn' },
                          }}
                          style={{
                            flex: 1,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <NavigationItem
                            item={item}
                            index={index}
                            onClick={() => {
                              if (isEffectiveHidden) return;
                              if (performance.now() - pointerUpHandledAtRef.current < 100) return;
                              navigationEpochRef.current += 1;
                              setNavigationEpoch(navigationEpochRef.current);
                              item.onClick();
                            }}
                            isActive={item.isActive}
                            isLight={isLight}
                            isSwitcherOpen={false}
                            totalSlots={totalSlots}
                            animationEpoch={navigationEpoch}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {showSwitcherButton && (
              <motion.div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'auto',
                }}
                animate={{
                  x: barWidth / 2 + dockGap,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 26,
                  mass: 0.75,
                }}
              >
                <motion.button
                  onClick={() => {
                    if (isEffectiveHidden) return;
                    setIsSwitcherOpen(!isSwitcherOpen);
                  }}
                  whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                  whileHover={canHover && !prefersReduced ? { scale: 1.04 } : undefined}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 360, damping: 24, mass: 0.75 }
                  }
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '26px',
                    background: 'var(--surface-topbar-bg)',
                    border: 'var(--surface-topbar-border)',
                    backdropFilter: 'var(--surface-float-blur)',
                    WebkitBackdropFilter: 'var(--surface-float-blur)',
                    boxShadow: 'var(--surface-topbar-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isLight
                      ? isSwitcherOpen
                        ? '#0f172a'
                        : 'rgba(15, 23, 42, 0.75)'
                      : isSwitcherOpen
                        ? '#ffffff'
                        : 'rgba(255, 255, 255, 0.65)',
                    cursor: 'pointer',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    transformOrigin: 'center bottom',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: switcherOpacity,
                    scale: switcherScale,
                    pointerEvents: switcherPointerEvents,
                  }}
                >
                  {/* Radial Center Glow */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '26px',
                      background: isLight
                        ? 'radial-gradient(ellipse 70% 55% at 50% 8%, rgba(255,255,255,0.12) 0%, transparent 100%)'
                        : 'radial-gradient(ellipse 70% 55% at 50% 8%, rgba(255,255,255,0.04) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={isSwitcherOpen ? 'close' : 'apps'}
                      initial={{ rotate: isSwitcherOpen ? -90 : 90, opacity: 0, scale: 0.7 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: isSwitcherOpen ? 90 : -90, opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24, mass: 0.7 }}
                      className="material-symbols-outlined text-[20px]"
                      style={{ display: 'block' }}
                    >
                      {isSwitcherOpen ? 'close' : 'apps'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </>
    </NavigationAnimationProvider>
  );
}
