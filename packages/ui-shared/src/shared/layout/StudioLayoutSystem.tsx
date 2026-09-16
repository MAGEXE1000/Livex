import { activeOverlaysRegistry } from '../design-system/dialogs';
import { useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

import { useScrollHide, SpringPresets, useSettingsStore, useShallow } from '@workspace/studio-core';
import { ProgressiveBlur } from '../design-system/ProgressiveBlur';
import { StudioLogo } from '../../features/chordex/icons/ChordexLogo';
import { StudioHeader } from './StudioHeader';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { useScrollMorph } from './useScrollMorph';
export * from './ContextualActionPill';

// Helper hook to detect responsive design states (tablets, landscape, foldables)
export function useLayoutMetrics() {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 360,
    height: typeof window !== 'undefined' ? window.innerHeight : 640,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLandscape = dimensions.width > dimensions.height;
  const isTablet = dimensions.width >= 768;
  const isFoldable = dimensions.width >= 600 && dimensions.width < 768 && isLandscape;
  const isLargeScreen = isTablet || isFoldable;

  return {
    ...dimensions,
    isLandscape,
    isTablet,
    isFoldable,
    isLargeScreen,
  };
}

// ── 1. ScreenScaffold ────────────────────────────────────────────────────────
// Enforces standard full-screen viewport layout and handles responsive margins.
export interface ScreenScaffoldProps extends React.HTMLAttributes<HTMLDivElement> {
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  children: React.ReactNode;
}

export function ScreenScaffold({
  safeAreaTop = true,
  safeAreaBottom = true,
  children,
  style,
  className = '',
  ...props
}: ScreenScaffoldProps) {
  const { isLargeScreen } = useLayoutMetrics();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'var(--c-background)',
        paddingTop: safeAreaTop ? 'env(safe-area-inset-top, 0px)' : 0,
        paddingBottom: safeAreaBottom ? 'env(safe-area-inset-bottom, 0px)' : 0,
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        ...style,
      }}
      className={`studio-screen-scaffold ${className}`}
      {...props}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isLargeScreen ? '1024px' : '100%',
          margin: isLargeScreen ? '0 auto' : '0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── 2. ScrollScaffold ────────────────────────────────────────────────────────
// Standard scrollable body that keeps margins and bottom navigation pad safe.
export interface ScrollScaffoldProps extends React.HTMLAttributes<HTMLDivElement> {
  bottomSpacing?: boolean;
  children: React.ReactNode;
  disableScrollHide?: boolean;
}

export const ScrollScaffold = React.forwardRef<HTMLDivElement, ScrollScaffoldProps>(
  function ScrollScaffold(
    {
      bottomSpacing = true,
      children,
      style,
      className = '',
      disableScrollHide = false,
      ...props
    },
    forwardedRef
  ) {
    const internalRef = React.useRef<HTMLDivElement | null>(null);
    useScrollHide(internalRef, disableScrollHide);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    return (
      <div
        ref={setRefs}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          padding: 'var(--spacing-md)',
          paddingBottom: bottomSpacing
            ? 'var(--content-bottom-pad)'
            : 'max(var(--spacing-md), env(safe-area-inset-bottom, 16px))',
          ...style,
        }}
        className={`studio-scroll-scaffold no-scrollbar ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

// ── 3. SettingsScaffold ──────────────────────────────────────────────────────
// Drill down settings details viewport with back button and scroll container.
export interface SettingsScaffoldProps {
  title: string;
  onBack: () => void;
  toolbarActions?: React.ReactNode;
  children: React.ReactNode;
  hideBack?: boolean;
}

export interface SharedFloatingHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  toolbarActions?: React.ReactNode;
  headerBgRef?: React.RefObject<HTMLDivElement | null>;
  titleRef?: React.RefObject<HTMLDivElement | null>;
  headerProgress?: any;
  titleTestId?: string;
  backBtnTestId?: string;
  isLight?: boolean;
  isAmoled?: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  enableMorph?: boolean;
  morphDistance?: number;
  startOffset?: number;
}

// ── Livex Liquid Glass SVG Filter (Displacement mapping via feTurbulence & feDisplacementMap) ──
export function LivexLiquidGlassFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter
        id="livex-liquid-glass-filter"
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04 0.04"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="2"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export function SharedFloatingHeader({
  title,
  subtitle,
  onBack,
  hideBack,
  toolbarActions,
  headerBgRef,
  titleRef,
  headerProgress,
  titleTestId,
  backBtnTestId,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
  scrollContainerRef,
  enableMorph = true,
  morphDistance = 86,
  startOffset = 14,
}: SharedFloatingHeaderProps) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  // Read current theme to apply warm tinted translucency
  const { theme, amoledMode } = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
    }))
  );
  const isLight = isLightProp !== undefined ? isLightProp : theme === 'light';
  const isAmoled = isAmoledProp !== undefined ? isAmoledProp : amoledMode;

  const fallbackHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const fallbackTitleRef = React.useRef<HTMLDivElement | null>(null);
  const actualHeaderRef = headerBgRef || fallbackHeaderRef;
  const actualTitleRef = titleRef || fallbackTitleRef;

  const glassSurfaceRef = React.useRef<HTMLDivElement | null>(null);
  const specularRef = React.useRef<HTMLDivElement | null>(null);

  const morphActive = Boolean(enableMorph && scrollContainerRef);

  useScrollMorph({
    scrollContainerRef: scrollContainerRef || { current: null },
    headerRef: actualHeaderRef,
    titleRef: actualTitleRef,
    glassSurfaceRef,
    morphDistance,
    startOffset,
    enabled: morphActive,
    isLight,
    isAmoled,
    expandedLeftInset: onBack && !hideBack ? 56 : 20,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 var(--page-inset-h, 24px)',
        zIndex: 110,
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      <LivexLiquidGlassFilter />
      <header
        ref={actualHeaderRef}
        data-testid="shared-floating-header"
        style={{
          width: '100%',
          maxWidth: 'calc(var(--content-max-w) - calc(var(--page-inset-h, 24px) * 2))',
          height: '56px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 4px',
          position: 'relative',
          background: 'transparent',
          border: '1px solid transparent',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
      >
        {/* Canonical Persistent Liquid Glass Surface (Smoothly forms on scroll, dissolves on top) */}
        <div
          ref={glassSurfaceRef}
          data-testid="shared-floating-header-glass-surface"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: 'var(--surface-topbar-bg)',
            border: 'var(--surface-topbar-border)',
            backdropFilter: 'var(--surface-topbar-blur) saturate(140%)',
            WebkitBackdropFilter: 'var(--surface-topbar-blur) saturate(140%)',
            boxShadow: 'var(--surface-topbar-shadow)',
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: 0,
            visibility: 'hidden',
            zIndex: 0,
          }}
        >
          {/* Internal Optical Refraction Plane (Applies micro-refraction without distorting container border) */}
          <div
            className="liquid-glass-refraction"
            style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: 'inherit',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%)',
              filter: 'url(#livex-liquid-glass-filter)',
              pointerEvents: 'none',
            }}
          />

          {/* Subtle Specular Top Curvature Sheen Response */}
          <div
            ref={specularRef}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background: isLight
                ? 'radial-gradient(ellipse 85% 65% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, transparent 100%)'
                : isAmoled
                ? 'radial-gradient(ellipse 85% 65% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 100%)'
                : 'radial-gradient(ellipse 85% 65% at 50% 0%, rgba(255, 255, 255, 0.10) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Left Back Action Button (Tightly positioned toward left edge with >=44px touch hit area) */}
        {onBack && !hideBack ? (
          <motion.button
            type="button"
            data-testid={backBtnTestId || 'shared-floating-header-back-btn'}
            onClick={onBack}
            aria-label="Go back"
            whileTap={prefersReduced ? undefined : { scale: 0.92 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.04 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              width: 38,
              height: 38,
              minWidth: 38,
              minHeight: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.05)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'var(--btn-surface-shadow, 0 1px 3px rgba(0,0,0,0.12))',
              color: 'var(--c-text-primary)',
              cursor: 'pointer',
              zIndex: 2,
              pointerEvents: 'auto',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
              marginLeft: '2px',
              position: 'relative',
              transform: 'scale(var(--morph-btn-scale, 1))',
            }}
          >
            {/* Extended invisible touch target for comfortable >=44px ergonomic tap */}
            <span
              style={{
                position: 'absolute',
                inset: '-4px',
                pointerEvents: 'auto',
                borderRadius: '50%',
              }}
            />
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', pointerEvents: 'none' }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.button>
        ) : (
          <div style={{ width: 38, height: 38, flexShrink: 0, marginLeft: '2px' }} />
        )}

        {/* Mathematically Centered Section Title across complete top bar */}
        <div
          ref={actualTitleRef}
          data-testid="shared-floating-header-title"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: toolbarActions ? '88px' : (onBack && !hideBack ? '46px' : '16px'),
            paddingRight: toolbarActions ? '88px' : (onBack && !hideBack ? '46px' : '16px'),
            pointerEvents: 'none',
            zIndex: 1,
            willChange: 'transform',
          }}
        >
          <span
            data-testid={
              titleTestId ||
              (title === 'Production Document' ? 'production-document-title' : undefined)
            }
            style={{
              fontSize: 'var(--type-title-size, 19px)',
              lineHeight: 'var(--type-title-lh, 26px)',
              fontWeight: 700,
              color: 'var(--c-text-primary)',
              letterSpacing: 'var(--type-title-tracking, -0.4px)',
              fontFamily:
                'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
              maxWidth: '100%',
            }}
          >
            {title}
          </span>
        </div>

        {/* Right Toolbar Actions Layer */}
        {toolbarActions ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 2,
              pointerEvents: 'auto',
              flexShrink: 0,
              marginRight: '2px',
              transform: 'scale(var(--morph-btn-scale, 1))',
            }}
          >
            {toolbarActions}
          </div>
        ) : (
          <div style={{ width: 38, height: 38, flexShrink: 0, marginRight: '2px' }} />
        )}
      </header>
    </div>
  );
}

export function SettingsScaffold({
  title,
  onBack,
  toolbarActions,
  children,
  hideBack,
  showLargeTitle = false,
}: SettingsScaffoldProps & { showLargeTitle?: boolean }) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const headerBgRef = React.useRef<HTMLDivElement | null>(null);
  const titleRef = React.useRef<HTMLDivElement | null>(null);
  const largeTitleRef = React.useRef<HTMLHeadingElement | null>(null);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 100,
        background: 'var(--c-background)',
      }}
      className="studio-settings-scaffold"
    >
      <SharedFloatingHeader
        title={title}
        onBack={onBack}
        hideBack={hideBack}
        toolbarActions={toolbarActions}
        headerBgRef={headerBgRef}
        titleRef={titleRef}
        scrollContainerRef={scrollRef}
        enableMorph={true}
      />

      {/* Continuous Scrolling View with safe area top and bottom insets */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          padding: '0',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 92px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)',
        }}
        className="no-scrollbar"
      >
        {/* Centered page column wrapper to align title and content perfectly */}
        <div
          style={{
            width: '100%',
            maxWidth: 'var(--content-max-w)',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box',
            paddingLeft: 'var(--page-inset-h)',
            paddingRight: 'var(--page-inset-h)',
          }}
        >
          {/* Content Canvas */}
          <div style={{ width: '100%' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export const STAGGER_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
};

export const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export interface SettingsContentContainerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> {
  children: React.ReactNode;
  disableStagger?: boolean;
}

export function SettingsContentContainer({
  children,
  style,
  className = '',
  disableStagger = false,
  ...props
}: SettingsContentContainerProps) {
  if (disableStagger) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--density-section-gap, 16px)',
          width: '100%',
          boxSizing: 'border-box',
          background: 'transparent',
          ...style,
        }}
        className={`studio-settings-content-container ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={STAGGER_CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--density-section-gap, 16px)',
        width: '100%',
        boxSizing: 'border-box',
        background: 'transparent',
        ...style,
      }}
      className={`studio-settings-content-container ${className}`}
      {...(props as any)}
    >
      {React.Children.map(children, (child, idx) => {
        if (!child) return null;
        return (
          <motion.div
            key={idx}
            variants={STAGGER_ITEM_VARIANTS}
            style={{ width: '100%', willChange: 'transform, opacity' }}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── 5. HubScaffold ──────────────────────────────────────────────────────────
// Responsive Scaffold structure specifically optimized for main Studio Hub dashboard layouts.
export interface HubScaffoldProps {
  toolbar: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  children: React.ReactNode;
}

export function HubScaffold({ toolbar, bottomNavigation, children }: HubScaffoldProps) {
  const { isLargeScreen } = useLayoutMetrics();

  return (
    <ScreenScaffold safeAreaTop={false} safeAreaBottom={false}>
      {/* Fixed top toolbar */}
      <div style={{ flexShrink: 0, zIndex: 10 }}>{toolbar}</div>

      {/* Main dashboard viewport grid */}
      <div
        style={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {children}
      </div>

      {/* Optional bottom navigation */}
      {bottomNavigation && <div style={{ flexShrink: 0, zIndex: 10 }}>{bottomNavigation}</div>}
    </ScreenScaffold>
  );
}

// ── 6. SubAppScaffold ────────────────────────────────────────────────────────
// Responsive fullscreen wrapper for full-canvas nested modules.
export interface SubAppScaffoldProps {
  appKey: string;
  children: React.ReactNode;
  onReady?: () => void;
}

export function SubAppScaffold({ appKey, children, onReady }: SubAppScaffoldProps) {
  return (
    <div
      className={`app-sub-app-container ${appKey}-root`}
      data-app-key={appKey}
      data-subapp={appKey}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--c-background)',
      }}
    >
      {children}
    </div>
  );
}
