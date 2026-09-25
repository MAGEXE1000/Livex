import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
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
  type AssistantState,
} from '@workspace/livex-core';
import {
  StudioLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../chordex/icons/ChordexLogo';
import { LivexAssistantMascot } from '../../assistant/components/LivexAssistantMascot';
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
  isSatellite?: boolean;
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
  activeTab?: string;
  mascotState?: AssistantState;
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
    scrollOffsetSpring,
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
    scrollOffsetSpring?: any;
  }) => {
    const isIconString = typeof item.icon === 'string';

    const iconColor = isLight
      ? isActive
        ? '#0f172a'
        : 'var(--c-text-secondary, rgba(15, 23, 42, 0.60))'
      : isActive
        ? '#ffffff'
        : 'var(--c-text-secondary, rgba(255, 255, 255, 0.65))';

    const labelColor = isLight
      ? isActive
        ? '#0f172a'
        : 'var(--c-text-secondary, rgba(15, 23, 42, 0.60))'
      : isActive
        ? '#ffffff'
        : 'var(--c-text-secondary, rgba(255, 255, 255, 0.65))';

    const labelLen = item.label ? item.label.length : 0;
    const fontSize =
      labelLen >= 13
        ? '9.5px'
        : labelLen >= 11
          ? '10px'
          : totalSlots >= 4 || labelLen >= 9
            ? '10.5px'
            : '11px';
    const letterSpacing =
      labelLen >= 12
        ? '-0.025em'
        : labelLen >= 10
          ? '-0.015em'
          : '-0.005em';

    const fallbackScroll = useMotionValue(0);
    const effectiveScroll = scrollOffsetSpring || fallbackScroll;
    const labelOpacity = useTransform(effectiveScroll, [0, 0.35], [1, 0]);
    const labelScale = useTransform(effectiveScroll, [0, 0.35], [1, 0.75]);
    const labelHeight = useTransform(effectiveScroll, [0, 0.45], [14, 0]);
    const labelMarginTop = useTransform(effectiveScroll, [0, 0.45], [2, 0]);

    return (
      <motion.button
        onClick={onClick}
        role="tab"
        aria-selected={isActive}
        aria-label={item.label}
        title={item.label}
        data-nav-item-index={index}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '9999px',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          padding: '2px 4px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          data-nav-content="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isSwitcherOpen ? 32 : 24,
              height: isSwitcherOpen ? 32 : 24,
              flexShrink: 0,
            }}
          >
            {isIconString ? (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconName={item.icon as string}
                size={isSwitcherOpen ? 22 : 22}
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            ) : (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconNode={item.icon}
                size={isSwitcherOpen ? 22 : 22}
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            )}
          </div>

          {!isSwitcherOpen && item.label && (
            <motion.span
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize,
                fontWeight: isActive ? 650 : 500,
                color: labelColor,
                whiteSpace: 'nowrap',
                letterSpacing,
                lineHeight: 1.15,
                textAlign: 'center',
                userSelect: 'none',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: labelOpacity,
                scale: labelScale,
                height: labelHeight,
                marginTop: labelMarginTop,
                display: 'block',
                transformOrigin: 'center top',
                pointerEvents: 'none',
                transition: 'color 160ms ease, font-weight 160ms ease',
              }}
            >
              {item.label}
            </motion.span>
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
  activeTab,
  mascotState,
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


  const showAiButton = isHub;
  const hasRightBubble = showSwitcherButton || showAiButton;
  const satelliteWidth = 50;
  const dockGap = 8;
  const screenMargin = 12;

  // Maximum width available on screen
  const maxAvailableWidth = Math.max(260, windowWidth - screenMargin * 2);

  // When satellite button is present, reserve space for it so the combined assembly fits
  const maxDockWidth = hasRightBubble
    ? Math.min(maxAvailableWidth - satelliteWidth - dockGap, 420)
    : Math.min(maxAvailableWidth, 460);

  // Bar width fills the available dock space length-wise
  const barWidth = isSwitcherOpen
    ? Math.min(maxAvailableWidth, 380)
    : Math.max(220, maxDockWidth);

  const paddingX = 4;
  const usableWidth = barWidth - paddingX * 2;
  const itemWidth = usableWidth / totalSlots;

  const activeIndex = useMemo(() => {
    const idx = currentItems.findIndex((item) => {
      return isSwitcherOpen ? item.key === currentApp : item.isActive;
    });
    return idx >= 0 ? idx : 0;
  }, [currentItems, currentApp, isSwitcherOpen]);

  // Canonical selected-item highlight geometry:
  // Revolut-style flat minimal highlight filling the slot with 2px horizontal margin
  const NAV_HIGHLIGHT_WIDTH = Math.max(32, Math.round(itemWidth - 2));
  const NAV_HIGHLIGHT_HEIGHT = 50;
  const NAV_HIGHLIGHT_RADIUS = 9999;

  const pillWidthVal = isSwitcherOpen ? Math.min(itemWidth - 4, 44) : NAV_HIGHLIGHT_WIDTH;
  const pillHeightVal = isSwitcherOpen ? 44 : NAV_HIGHLIGHT_HEIGHT;
  const pillRadiusVal = NAV_HIGHLIGHT_RADIUS;

  const centerOffset = Math.max(0, Math.round((itemWidth - pillWidthVal) / 2));

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
  const dragPillX = useMotionValue(0);
  const scrollOffsetRaw = useMotionValue(getNavScrollOffset());
  const profileOpenRaw = useMotionValue(isProfileMenuOpen ? 1 : 0);

  // Synchronized Apple-grade critically damped spring physics (zero overshoot, zero bounce)
  const activeIdxSpring = useSpring(
    activeIdxRaw,
    prefersReduced
      ? { stiffness: 4000, damping: 200, mass: 0.001 }
      : { stiffness: 420, damping: 38, mass: 0.6 }
  );

  const scrollOffsetSpring = useSpring(scrollOffsetRaw, { stiffness: 380, damping: 32, mass: 0.7 });
  const profileOpenSpring = useSpring(profileOpenRaw, { stiffness: 420, damping: 28, mass: 0.8 });

  // Update root raw MotionValues continuously on state changes
  useEffect(() => {
    activeIdxRaw.set(activeIndex);
  }, [activeIndex, activeIdxRaw]);

  // Connect scroll listener directly without causing React component re-renders
  useEffect(() => {
    return subscribeNavScrollOffset((offset) => {
      scrollOffsetRaw.set(offset);
      if (offset > 0.15) {
        if (isSwitcherOpen) setIsSwitcherOpen(false);
        if (isProfileMenuOpen) setProfileMenuOpen(false);
      }
    });
  }, [scrollOffsetRaw, isSwitcherOpen, setIsSwitcherOpen, isProfileMenuOpen, setProfileMenuOpen]);

  useEffect(() => {
    profileOpenRaw.set(isProfileMenuOpen ? 1 : 0);
  }, [isProfileMenuOpen, profileOpenRaw]);

  useEffect(() => {
    scrollOffsetRaw.set(0);
    scrollOffsetSpring.jump(0);
  }, [currentApp, scrollOffsetRaw, scrollOffsetSpring]);

  useEffect(() => {
    if (collapsed !== undefined) {
      scrollOffsetRaw.set(collapsed ? 1 : 0);
    }
  }, [collapsed, scrollOffsetRaw]);

  // Safari/Revolut-style physical compression: dock scales down (1.00 → 0.90) toward center on scroll
  const containerScale = useTransform(scrollOffsetSpring, [0, 1], [1.0, 0.90]);
  const containerY = useTransform(scrollOffsetSpring, () => 0);

  // Centering shift:
  // When satellite is visible, shift dock left by half of (dockGap + satelliteWidth) so the combined assembly is centered.
  // When scrolling down, satellite collapses and shift smoothly returns to 0 (dock centered in viewport).
  const shiftX = hasRightBubble ? (dockGap + satelliteWidth) / 2 : 0;
  const dockShiftX = useTransform(scrollOffsetSpring, (offset) => {
    if (!hasRightBubble) return 0;
    const progress = Math.min(1, offset / 0.45);
    return -shiftX * (1 - progress);
  });

  // Satellite buttons (App Changer & AI Assistant): smooth progressive fade-out and scale-down to 0 on scroll
  const satelliteOpacity = useTransform(scrollOffsetSpring, [0, 0.35], [1, 0]);
  const satelliteScale = useTransform(scrollOffsetSpring, [0, 0.35], [1, 0.5]);
  const satellitePointerEvents = useTransform(scrollOffsetSpring, (offset) =>
    offset > 0.2 ? 'none' : 'auto'
  );

  // Dynamic satellite X position: positioned adjacent to the dock, collapsing inward on scroll
  const satelliteX = useTransform(scrollOffsetSpring, (offset) => {
    const curShift = !hasRightBubble ? 0 : -shiftX * (1 - Math.min(1, offset / 0.45));
    return curShift + barWidth / 2 + dockGap;
  });

  const switcherOpacity = satelliteOpacity;
  const switcherScale = satelliteScale;
  const switcherPointerEvents = satellitePointerEvents;

  // Derived continuous pill movement:
  // When scrubbing: directly follows finger via dragPillX.
  // When idle or tab-switching: follows activeIdxSpring (critically damped, zero bounce).
  const animatedPillX = useTransform(
    [activeIdxSpring, dragPillX],
    ([springIdx, dragVal]) => {
      if (isScrubbingRef.current) {
        return dragVal as number;
      }
      const idx = Math.max(0, Math.min(totalSlots - 1, springIdx as number));
      const rawX = idx * itemWidth + centerOffset;
      return Math.max(0, Math.min(usableWidth - pillWidthVal, rawX));
    }
  );

  // Derived continuous profile menu transformations
  const profileCardOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);
  const profileCardY = useTransform(profileOpenSpring, [0, 1], [16, 0]);
  const profileCardScale = useTransform(profileOpenSpring, [0, 1], [0.94, 1]);
  const profileBackdropOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);

  const startXRef = useRef(0);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden || e.button !== 0) return;
    startXRef.current = e.clientX;
    isScrubbingRef.current = false;
    scrubbingIndexRef.current = activeIndex;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden) return;
    const dragDistance = Math.abs(e.clientX - startXRef.current);
    if (!isScrubbingRef.current && dragDistance > 4) {
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (!isScrubbingRef.current) return;

    const rect =
      innerWrapperRef.current?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    // Direct 1:1 positioning of pill center with touch position
    const targetX = relativeX - pillWidthVal / 2;
    const clampedX = Math.max(0, Math.min(usableWidth - pillWidthVal, targetX));
    dragPillX.set(clampedX);

    const hoveredIndex = Math.max(0, Math.min(N - 1, Math.floor((relativeX / usableWidth) * N)));
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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      setIsScrubbing(false);

      const finalIndex = scrubbingIndexRef.current;
      const targetItem = currentItems[finalIndex];

      activeIdxRaw.set(finalIndex);

      if (targetItem && finalIndex !== activeIndex) {
        pointerUpHandledAtRef.current = performance.now();
        navigationEpochRef.current += 1;
        setNavigationEpoch(navigationEpochRef.current);
        targetItem.onClick();
      }
    } else {
      const rect =
        innerWrapperRef.current?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const clickIndex = Math.max(0, Math.min(N - 1, Math.floor((relativeX / usableWidth) * N)));
      const clickedItem = currentItems[clickIndex];

      if (clickedItem) {
        activeIdxRaw.set(clickIndex);
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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    isScrubbingRef.current = false;
    setIsScrubbing(false);
    activeIdxRaw.set(activeIndex);
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
    <NavigationAnimationProvider activeTab={activeTabKey} items={currentItems}>
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
            backdropFilter: 'var(--surface-topbar-backdrop)',
            WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
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
                <StudioIcon
                  name="person"
                  size={22}
                  style={{ color: 'var(--c-text-secondary)' }}
                />
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
              <StudioIcon
                name="person"
                size={20}
                style={{ color: 'var(--c-text-secondary)' }}
              />
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
              <StudioIcon
                name="settings"
                size={20}
                style={{ color: 'var(--c-text-secondary)' }}
              />
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
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 32,
                mass: 0.7,
              }}
              style={{
                contain: 'layout style',
                pointerEvents: isEffectiveHidden ? 'none' : 'auto',
                maxWidth: '100%',
                height: '58px',
                borderRadius: '9999px',
                border: 'var(--surface-topbar-border)',
                background: 'var(--surface-topbar-bg)',
                boxShadow: isLight
                  ? '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                  : '0 8px 32px -4px rgba(0, 0, 0, 0.50), 0 2px 8px -2px rgba(0, 0, 0, 0.35)',
                backdropFilter: 'var(--surface-topbar-backdrop)',
                WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                paddingLeft: paddingX,
                paddingRight: paddingX,
                paddingTop: '4px',
                paddingBottom: '4px',
                position: 'relative',
                touchAction: 'none',
                userSelect: 'none',
                transformOrigin: 'center bottom',
                scale: containerScale,
                y: containerY,
                x: dockShiftX,
              }}
            >
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
                  // overflow:hidden keeps nav items clipped to pill shape without breaking
                  // Android WebView compositing of the parent's backdrop-filter.
                  overflow: 'hidden',
                  borderRadius: '9999px',
                }}
              >
                {/* Active lens pill — Revolut-style flat minimal highlight */}
                <motion.div
                  animate={{
                    width: pillWidthVal,
                    height: pillHeightVal,
                    borderRadius: pillRadiusVal,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 38,
                    mass: 0.6,
                  }}
                  style={{
                    position: 'absolute',
                    top: isSwitcherOpen ? Math.max(0, Math.round((50 - pillHeightVal) / 2)) : 0,
                    left: 0,
                    x: animatedPillX,
                    background: 'var(--surface-glass-lens-bg)',
                    border: 'var(--surface-glass-lens-border)',
                    boxShadow: 'var(--surface-glass-lens-shadow)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    willChange: 'transform',
                  }}
                />

                {/* Navigation items — fluid liquid continuous transformation */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {isSwitcherOpen ? (
                    <motion.div
                      key="switcher"
                      role="tablist"
                      aria-label="App Switcher"
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
                              scrollOffsetSpring={scrollOffsetSpring}
                            />
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="nav"
                      role="tablist"
                      aria-label="Main Navigation"
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
                      {(items || []).map((item, index) => {
                        const showDivider = item.isSatellite || item.key === 'assistant';
                        return (
                          <React.Fragment key={item.key}>
                            {showDivider && (
                              <div
                                style={{
                                  width: '1px',
                                  height: '24px',
                                  background: isLight
                                    ? 'rgba(0, 0, 0, 0.08)'
                                    : 'rgba(255, 255, 255, 0.12)',
                                  flexShrink: 0,
                                  margin: '0 -1px',
                                  zIndex: 1,
                                  pointerEvents: 'none',
                                }}
                              />
                            )}
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
                                scrollOffsetSpring={scrollOffsetSpring}
                              />
                            </motion.div>
                          </React.Fragment>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {showSwitcherButton && (
              <motion.div
                className="shared-nav-satellite"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: switcherPointerEvents,
                  x: satelliteX,
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
                    width: '50px',
                    height: '50px',
                    borderRadius: '9999px',
                    background: 'var(--surface-topbar-bg)',
                    border: 'var(--surface-topbar-border)',
                    backdropFilter: 'var(--surface-topbar-backdrop)',
                    WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
                    boxShadow: isLight
                      ? '0 4px 16px -2px rgba(0, 0, 0, 0.08)'
                      : '0 8px 28px -4px rgba(0, 0, 0, 0.50)',
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
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={isSwitcherOpen ? 'close' : 'apps'}
                      initial={{ rotate: isSwitcherOpen ? -90 : 90, opacity: 0, scale: 0.7 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: isSwitcherOpen ? 90 : -90, opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24, mass: 0.7 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <StudioIcon
                        name={isSwitcherOpen ? 'close' : 'apps'}
                        size={20}
                        style={{ display: 'block' }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            )}

            {showAiButton && (
              <motion.div
                className="shared-nav-satellite"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: satellitePointerEvents,
                  x: satelliteX,
                }}
              >
                <motion.button
                  onClick={() => {
                    if (isEffectiveHidden) return;
                    NavigationDispatcher.push({ app: 'hub', tab: 'assistant' });
                  }}
                  whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                  whileHover={canHover && !prefersReduced ? { scale: 1.04 } : undefined}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 360, damping: 24, mass: 0.75 }
                  }
                  title="Music AI Assistant"
                  aria-label="Open Music AI Assistant"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '9999px',
                    background: 'var(--surface-topbar-bg)',
                    border: 'var(--surface-topbar-border)',
                    backdropFilter: 'var(--surface-topbar-backdrop)',
                    WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
                    boxShadow: isLight
                      ? '0 4px 16px -2px rgba(0, 0, 0, 0.08)'
                      : '0 8px 28px -4px rgba(0, 0, 0, 0.50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    transformOrigin: 'center bottom',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: satelliteOpacity,
                    scale: satelliteScale,
                    pointerEvents: satellitePointerEvents,
                  }}
                >
                  <LivexAssistantMascot
                    size={24}
                    mode="dock"
                    state={mascotState}
                    interactive={false}
                  />
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </>
    </NavigationAnimationProvider>
  );
}
