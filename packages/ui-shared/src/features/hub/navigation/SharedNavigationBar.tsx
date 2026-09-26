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
import {
  CANONICAL_NAV_GEOMETRY,
  CANONICAL_NAV_MOTION,
  resolveDragDestination,
} from './navigationMotion';

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
    onPointerDown,
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
    onPointerDown?: () => void;
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
    // GPU compositor transforms only: 0 layout reflows during continuous scroll
    const iconY = useTransform(
      effectiveScroll,
      [0, 0.35],
      [
        isSwitcherOpen ? 0 : CANONICAL_NAV_GEOMETRY.ICON_Y_EXPANDED,
        CANONICAL_NAV_GEOMETRY.ICON_Y_COMPACT,
      ]
    );
    const labelOpacity = useTransform(effectiveScroll, [0, 0.28], [1, 0]);
    const labelScale = useTransform(effectiveScroll, [0, 0.28], [1, 0.85]);
    const labelY = useTransform(effectiveScroll, [0, 0.28], [0, 3]);

    return (
      <motion.button
        onClick={onClick}
        onPointerDown={onPointerDown}
        role="tab"
        aria-selected={isActive}
        aria-label={item.label}
        title={item.label}
        data-nav-item-index={index}
        whileTap={{ scale: 0.96 }}
        transition={CANONICAL_NAV_MOTION.pressSpring}
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
            position: 'relative',
          }}
        >
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isSwitcherOpen
                ? 32
                : CANONICAL_NAV_GEOMETRY.ICON_CONTAINER_SIZE,
              height: isSwitcherOpen
                ? 32
                : CANONICAL_NAV_GEOMETRY.ICON_CONTAINER_SIZE,
              flexShrink: 0,
              y: iconY,
            }}
          >
            {isIconString ? (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconName={item.icon as string}
                size={
                  isSwitcherOpen
                    ? CANONICAL_NAV_GEOMETRY.SWITCHER_ICON_SIZE
                    : CANONICAL_NAV_GEOMETRY.ICON_GLYPH_SIZE
                }
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            ) : (
              <AnimatedNavigationIcon
                itemKey={item.key}
                iconNode={item.icon}
                size={
                  isSwitcherOpen
                    ? CANONICAL_NAV_GEOMETRY.SWITCHER_ICON_SIZE
                    : CANONICAL_NAV_GEOMETRY.ICON_GLYPH_SIZE
                }
                color={iconColor}
                isActive={isActive}
                animationEpoch={animationEpoch}
              />
            )}
          </motion.div>

          {!isSwitcherOpen && item.label && (
            <motion.span
              style={{
                position: 'absolute',
                bottom: `${CANONICAL_NAV_GEOMETRY.LABEL_BOTTOM_OFFSET}px`,
                left: 0,
                right: 0,
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
                padding: '0 2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: labelOpacity,
                scale: labelScale,
                y: labelY,
                display: 'block',
                transformOrigin: 'center bottom',
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
  const isDraggingRef = useRef(false);
  const hasDragInitiatedRef = useRef(false);
  const lastDragEndedAtRef = useRef(0);
  const lastHoveredIndexRef = useRef(0);
  const [dragHoveredIndex, setDragHoveredIndex] = useState<number | null>(null);
  const navigationEpochRef = useRef(0);
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const pointerUpHandledAtRef = useRef(0);
  const startXRef = useRef(0);
  const initialPillXRef = useRef(0);
  const rectLeftRef = useRef(0);

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


  // Canonical Navigation Geometry (Restored taller proportions)
  const NAV_BAR_HEIGHT = CANONICAL_NAV_GEOMETRY.NAV_BAR_HEIGHT;
  const NAV_BAR_VERTICAL_PADDING = CANONICAL_NAV_GEOMETRY.NAV_BAR_VERTICAL_PADDING;
  const NAV_BAR_INNER_HEIGHT = CANONICAL_NAV_GEOMETRY.NAV_BAR_INNER_HEIGHT; // 48px
  const NAV_HIGHLIGHT_HEIGHT = CANONICAL_NAV_GEOMETRY.NAV_HIGHLIGHT_HEIGHT;
  const NAV_HIGHLIGHT_RADIUS = CANONICAL_NAV_GEOMETRY.NAV_HIGHLIGHT_RADIUS;
  const SATELLITE_SIZE = CANONICAL_NAV_GEOMETRY.SATELLITE_SIZE; // 58px (strictly equal to NAV_BAR_HEIGHT, matching vertical center)
  const DOCK_GAP = CANONICAL_NAV_GEOMETRY.DOCK_GAP;
  const SATELLITE_SLOT_TOTAL = CANONICAL_NAV_GEOMETRY.SATELLITE_SLOT_TOTAL; // 66px
  const SCREEN_PADDING_HORIZONTAL = CANONICAL_NAV_GEOMETRY.SCREEN_PADDING_HORIZONTAL;

  const showAiButton = isHub;
  const hasRightBubble = showSwitcherButton || showAiButton;

  // Maximum width available on screen, guaranteeing 16px screen padding on both sides
  const maxAvailableWidth = Math.max(260, windowWidth - SCREEN_PADDING_HORIZONTAL * 2);

  // When satellite button is present, reserve space for it so the combined assembly fits
  const maxDockWidth = hasRightBubble
    ? Math.min(maxAvailableWidth - SATELLITE_SLOT_TOTAL, 420)
    : Math.min(maxAvailableWidth, 460);

  // Bar width fills the available dock space length-wise
  const barWidth = isSwitcherOpen
    ? hasRightBubble
      ? Math.min(maxAvailableWidth - SATELLITE_SLOT_TOTAL, 380)
      : Math.min(maxAvailableWidth, 380)
    : Math.max(220, maxDockWidth);

  const paddingX = CANONICAL_NAV_GEOMETRY.PADDING_X;
  const dockBorderX = (CANONICAL_NAV_GEOMETRY as any).DOCK_BORDER_PX ? (CANONICAL_NAV_GEOMETRY as any).DOCK_BORDER_PX * 2 : 2;
  const usableWidth = Math.max(100, barWidth - paddingX * 2 - dockBorderX);
  const itemWidth = usableWidth / totalSlots;

  const activeIndex = useMemo(() => {
    const idx = currentItems.findIndex((item) => {
      return isSwitcherOpen ? item.key === currentApp : item.isActive;
    });
    return idx >= 0 ? idx : 0;
  }, [currentItems, currentApp, isSwitcherOpen]);

  // Canonical selected-item highlight geometry:
  // Flat minimal highlight perfectly contained with uniform insets
  const NAV_HIGHLIGHT_WIDTH = Math.max(32, Math.round(itemWidth - 6));
  const pillTop = Math.max(0, Math.round((NAV_BAR_INNER_HEIGHT - NAV_HIGHLIGHT_HEIGHT) / 2)); // 0px inside 48px innerWrapper, leaving uniform 5px margin

  const pillWidthVal = isSwitcherOpen ? Math.min(itemWidth - 6, 42) : NAV_HIGHLIGHT_WIDTH;
  const pillHeightVal = NAV_HIGHLIGHT_HEIGHT;
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
  // All navigation movements (tap, drag, release, scroll, collapse) derive continuously from this graph.
  // ─────────────────────────────────────────────────────────────────────────────

  // Root MotionValues: single target MotionValue for highlight position
  const targetPillX = activeIndex * itemWidth + centerOffset;
  const targetPillXVal = useMotionValue(targetPillX);
  const scrollOffsetRaw = useMotionValue(getNavScrollOffset());
  const profileOpenRaw = useMotionValue(isProfileMenuOpen ? 1 : 0);

  // Synchronized Apple-grade critically damped spring physics for active tab glide (zeta ~ 0.96)
  // Single continuous spring driver for TAP, DRAG, RELEASE, INTERRUPT, and SETTLE
  const pillXSpring = useSpring(
    targetPillXVal,
    prefersReduced
      ? CANONICAL_NAV_MOTION.reducedMotionSpring
      : CANONICAL_NAV_MOTION.highlightSpring
  );

  const scrollOffsetSpring = useSpring(scrollOffsetRaw, CANONICAL_NAV_MOTION.scrollSpring);
  const profileOpenSpring = useSpring(profileOpenRaw, CANONICAL_NAV_MOTION.profileSpring);

  // Reconcile root target MotionValue continuously on state changes when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      targetPillXVal.set(activeIndex * itemWidth + centerOffset);
    }
  }, [activeIndex, itemWidth, centerOffset, targetPillXVal]);

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

  // Safari/Revolut-style physical compression: dock scales down (1.00 → 0.90) toward center on scroll
  const containerScale = useTransform(scrollOffsetSpring, [0, 1], [1.0, 0.90]);
  const containerY = useTransform(scrollOffsetSpring, () => 0);

  // Satellite slot fluid collapse transforms (peer flex item in centered row)
  const satelliteSlotWidth = useTransform(
    scrollOffsetSpring,
    [0, 0.35],
    [hasRightBubble ? SATELLITE_SLOT_TOTAL : 0, 0]
  );
  const satelliteSlotPadding = useTransform(
    scrollOffsetSpring,
    [0, 0.35],
    [hasRightBubble ? DOCK_GAP : 0, 0]
  );
  const satelliteOpacity = useTransform(scrollOffsetSpring, [0, 0.28], [1, 0]);
  const satelliteScale = useTransform(scrollOffsetSpring, [0, 0.32], [1, 0.5]);
  const satellitePointerEvents = useTransform(scrollOffsetSpring, (offset) =>
    offset > 0.15 ? 'none' : 'auto'
  );

  const switcherOpacity = satelliteOpacity;
  const switcherScale = satelliteScale;
  const switcherPointerEvents = satellitePointerEvents;

  // Derived continuous profile menu transformations
  const profileCardOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);
  const profileCardY = useTransform(profileOpenSpring, [0, 1], [16, 0]);
  const profileCardScale = useTransform(profileOpenSpring, [0, 1], [0.94, 1]);
  const profileBackdropOpacity = useTransform(profileOpenSpring, [0, 1], [0, 1]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden || e.button !== 0) return;
    const rect = innerWrapperRef.current?.getBoundingClientRect();
    rectLeftRef.current = rect ? rect.left : e.currentTarget.getBoundingClientRect().left;
    startXRef.current = e.clientX;
    initialPillXRef.current = pillXSpring.get();
    isDraggingRef.current = false;
    hasDragInitiatedRef.current = false;
    lastHoveredIndexRef.current = activeIndex;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEffectiveHidden) return;
    const deltaX = e.clientX - startXRef.current;

    if (!hasDragInitiatedRef.current && Math.abs(deltaX) > CANONICAL_NAV_GEOMETRY.DRAG_THRESHOLD_PX) {
      hasDragInitiatedRef.current = true;
      isDraggingRef.current = true;
      setIsScrubbing(true);
      useBottomNavigationStore.getState().setMotionState('Dragging');
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (!isDraggingRef.current) return;

    const rawTargetX = initialPillXRef.current + deltaX;
    const maxTargetX = Math.max(0, usableWidth - pillWidthVal);
    const minTargetX = 0;
    const restingMinX = centerOffset;
    const restingMaxX = (N - 1) * itemWidth + centerOffset;

    // Apply subtle physical edge resistance while strictly bounding highlight inside capsule
    let clampedTargetX = rawTargetX;
    if (rawTargetX < restingMinX) {
      clampedTargetX = Math.max(
        minTargetX,
        restingMinX + (rawTargetX - restingMinX) * CANONICAL_NAV_GEOMETRY.EDGE_RESISTANCE
      );
    } else if (rawTargetX > restingMaxX) {
      clampedTargetX = Math.min(
        maxTargetX,
        restingMaxX + (rawTargetX - restingMaxX) * CANONICAL_NAV_GEOMETRY.EDGE_RESISTANCE
      );
    } else {
      clampedTargetX = Math.max(minTargetX, Math.min(maxTargetX, rawTargetX));
    }

    // Drive the canonical spring continuously with physical mass & damping
    targetPillXVal.set(clampedTargetX);

    // Identify tab slot under highlight center for haptic feedback & preview illumination
    const currentVisualX = pillXSpring.get();
    const currentCenter = currentVisualX + pillWidthVal / 2;
    const hoveredSlot = Math.max(
      0,
      Math.min(N - 1, Math.round((currentCenter - centerOffset - pillWidthVal / 2) / itemWidth))
    );

    if (hoveredSlot !== lastHoveredIndexRef.current) {
      lastHoveredIndexRef.current = hoveredSlot;
      setDragHoveredIndex(hoveredSlot);
      if (
        typeof window !== 'undefined' &&
        window.navigator &&
        typeof window.navigator.vibrate === 'function'
      ) {
        try {
          window.navigator.vibrate(5);
        } catch (_) {}
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    useBottomNavigationStore.getState().setMotionState('Idle');

    if (hasDragInitiatedRef.current) {
      hasDragInitiatedRef.current = false;
      isDraggingRef.current = false;
      setIsScrubbing(false);
      setDragHoveredIndex(null);
      lastDragEndedAtRef.current = performance.now();

      const currentVisualX = pillXSpring.get();
      const currentVelocity = pillXSpring.getVelocity();

      // Canonical destination resolution (momentum flick or nearest slot)
      const destIndex = resolveDragDestination(
        currentVisualX,
        currentVelocity,
        pillWidthVal,
        itemWidth,
        centerOffset,
        N
      );

      // ALWAYS resolve highlight to valid tab slot — mathematically impossible to remain between tabs
      const finalTargetX = destIndex * itemWidth + centerOffset;
      targetPillXVal.set(finalTargetX);

      // Commit navigation to canonical store
      const targetItem = currentItems[destIndex];
      if (targetItem && destIndex !== activeIndex) {
        pointerUpHandledAtRef.current = performance.now();
        navigationEpochRef.current += 1;
        setNavigationEpoch(navigationEpochRef.current);
        targetItem.onClick();
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    useBottomNavigationStore.getState().setMotionState('Idle');

    if (hasDragInitiatedRef.current) {
      hasDragInitiatedRef.current = false;
      isDraggingRef.current = false;
      setIsScrubbing(false);
      setDragHoveredIndex(null);
      lastDragEndedAtRef.current = performance.now();

      // Resolve safely to current canonical active tab
      targetPillXVal.set(activeIndex * itemWidth + centerOffset);
    }
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
                contain: 'layout style paint',
                overflow: 'hidden',
                borderRadius: '9999px',
                clipPath: 'inset(0 round 9999px)',
                pointerEvents: isEffectiveHidden ? 'none' : 'auto',
                maxWidth: '100%',
                height: `${NAV_BAR_HEIGHT}px`,
                border: 'var(--surface-topbar-border)',
                background: 'var(--surface-topbar-bg)',
                boxShadow: 'var(--surface-topbar-shadow)',
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
                boxSizing: 'border-box',
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
                  height: `${NAV_BAR_INNER_HEIGHT}px`,
                  alignItems: 'center',
                  position: 'relative',
                  touchAction: 'none',
                  overflow: 'hidden',
                  borderRadius: '9999px',
                  clipPath: 'inset(0 round 9999px)',
                  isolation: 'isolate',
                  boxSizing: 'border-box',
                }}
              >
                {/* Active lens pill — clean, flat minimal highlight with Apple-grade fluid glide */}
                <motion.div
                  animate={{
                    width: pillWidthVal,
                  }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : CANONICAL_NAV_MOTION.highlightSpring
                  }
                  style={{
                    position: 'absolute',
                    top: pillTop,
                    height: NAV_HIGHLIGHT_HEIGHT,
                    borderRadius: NAV_HIGHLIGHT_RADIUS,
                    left: 0,
                    x: pillXSpring,
                    background: 'var(--surface-glass-lens-bg)',
                    border: 'var(--surface-glass-lens-border)',
                    boxShadow: 'none',
                    pointerEvents: 'none',
                    zIndex: 0,
                    willChange: 'transform',
                    boxSizing: 'border-box',
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
                              onPointerDown={() => {
                                if (isEffectiveHidden) return;
                                targetPillXVal.set(index * itemWidth + centerOffset);
                              }}
                              onClick={() => {
                                if (isEffectiveHidden) return;
                                if (performance.now() - lastDragEndedAtRef.current < 200) return;
                                targetPillXVal.set(index * itemWidth + centerOffset);
                                navigationEpochRef.current += 1;
                                setNavigationEpoch(navigationEpochRef.current);
                                item.onClick();
                              }}
                              isActive={
                                isScrubbing && dragHoveredIndex !== null
                                  ? index === dragHoveredIndex
                                  : isActive
                              }
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
                                onPointerDown={() => {
                                  if (isEffectiveHidden) return;
                                  targetPillXVal.set(index * itemWidth + centerOffset);
                                }}
                                onClick={() => {
                                  if (isEffectiveHidden) return;
                                  if (performance.now() - lastDragEndedAtRef.current < 200) return;
                                  targetPillXVal.set(index * itemWidth + centerOffset);
                                  navigationEpochRef.current += 1;
                                  setNavigationEpoch(navigationEpochRef.current);
                                  item.onClick();
                                }}
                                isActive={
                                  isScrubbing && dragHoveredIndex !== null
                                    ? index === dragHoveredIndex
                                    : item.isActive
                                }
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

            {hasRightBubble && (
              <motion.div
                className="shared-nav-satellite-slot"
                style={{
                  width: satelliteSlotWidth,
                  paddingLeft: satelliteSlotPadding,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  pointerEvents: satellitePointerEvents,
                  scale: containerScale,
                  y: containerY,
                  transformOrigin: 'center bottom',
                }}
              >
                {showSwitcherButton && (
                  <motion.div
                    className="shared-nav-satellite"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
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
                      aria-label={isSwitcherOpen ? 'Close App Switcher' : 'Open App Switcher'}
                      style={{
                        width: `${SATELLITE_SIZE}px`,
                        height: `${SATELLITE_SIZE}px`,
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
                        flexShrink: 0,
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
                        transformOrigin: 'center center',
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
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
                        width: `${SATELLITE_SIZE}px`,
                        height: `${SATELLITE_SIZE}px`,
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
                        flexShrink: 0,
                        cursor: 'pointer',
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        transformOrigin: 'center center',
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
              </motion.div>
            )}
          </div>
        </motion.div>
      </>
    </NavigationAnimationProvider>
  );
}
