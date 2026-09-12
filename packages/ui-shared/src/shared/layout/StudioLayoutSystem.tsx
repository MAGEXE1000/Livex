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

export function ScrollScaffold({
  bottomSpacing = true,
  children,
  style,
  className = '',
  disableScrollHide = false,
  ...props
}: ScrollScaffoldProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useScrollHide(ref, disableScrollHide);

  return (
    <div
      ref={ref}
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

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
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
      <header
        ref={headerBgRef}
        data-testid="shared-floating-header"
        style={{
          width: '100%',
          maxWidth: 'calc(var(--content-max-w) - calc(var(--page-inset-h, 24px) * 2))',
          height: '58px',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          position: 'relative',
          background: 'var(--surface-topbar-bg)',
          border: 'var(--surface-topbar-border)',
          backdropFilter: 'var(--surface-topbar-blur)',
          WebkitBackdropFilter: 'var(--surface-topbar-blur)',
          boxShadow: 'var(--surface-topbar-shadow)',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
      >
        {/* Subtle Specular Top Curvature Response */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: isLight
              ? 'radial-gradient(ellipse 80% 65% at 50% 0%, rgba(255, 255, 255, 0.14) 0%, transparent 100%)'
              : 'radial-gradient(ellipse 80% 65% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Left Back Action Button */}
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
              width: 'var(--btn-size-md, 42px)',
              height: 'var(--btn-size-md, 42px)',
              minWidth: '42px',
              minHeight: '42px',
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
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.button>
        ) : (
          <div style={{ width: 42, height: 42, flexShrink: 0 }} />
        )}

        {/* Mathematically Centered Section Title across complete top bar */}
        <div
          ref={titleRef}
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
            paddingLeft: toolbarActions ? '104px' : '56px',
            paddingRight: toolbarActions ? '104px' : '56px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {subtitle ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              <span
                data-testid={titleTestId}
                style={{
                  fontSize: '15.5px',
                  lineHeight: '1.2',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  letterSpacing: '-0.01em',
                  fontFamily:
                    'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  lineHeight: '1.2',
                  fontWeight: 500,
                  color: 'var(--c-text-muted)',
                  fontFamily: 'var(--font-body, "Inter", sans-serif)',
                  marginTop: '1.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {subtitle}
              </span>
            </div>
          ) : (
            <span
              data-testid={
                titleTestId ||
                (title === 'Production Document' ? 'production-document-title' : undefined)
              }
              style={{
                fontSize: 'var(--type-section-size, 19px)',
                lineHeight: 'var(--type-section-lh, 24px)',
                fontWeight: 600,
                color: 'var(--c-text-primary)',
                letterSpacing: 'var(--type-section-tracking, 0.6px)',
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
          )}
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
            }}
          >
            {toolbarActions}
          </div>
        ) : (
          <div style={{ width: 40, height: 40, flexShrink: 0 }} />
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
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
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
          {showLargeTitle && (
            <div
              ref={largeTitleRef}
              style={{
                width: '100%',
                marginBottom: '16px',
              }}
            >
              <StudioHeader
                title={title}
                disableTopInset={true}
                disableHorizontalPadding={true}
                containerStyle={{ paddingTop: '8px', paddingBottom: '16px' }}
              />
            </div>
          )}

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
