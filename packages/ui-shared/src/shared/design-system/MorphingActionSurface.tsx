import React, { useState, useCallback, useEffect, useLayoutEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BackDispatcher, MotionProfiler } from '@workspace/studio-core';
import { activeOverlaysRegistry } from './dialogs';
import { SPRING_PANEL, EASE_OUT } from '../../lib/ease';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';


export interface MorphingActionRowItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  badge?: string;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface MorphingActionSurfaceProps {
  buttonLabel?: string;
  buttonIcon?: string;
  title?: string;
  subtitle?: string;
  rows?: MorphingActionRowItem[];
  children?: React.ReactNode | ((helpers: { close: () => void }) => React.ReactNode);
  triggerVariant?: 'standard' | 'icon' | 'custom';
  customTrigger?: (helpers: {
    open: () => void;
    isOpen: boolean;
    surfaceId: string;
    triggerProps: {
      layoutId: string;
      onClick: () => void;
      whileTap?: { scale: number };
      transition?: any;
    };
  }) => React.ReactNode;
  /**
   * Spatial placement:
   * - 'anchor': (Default) Anchors directly adjacent to the trigger button in viewport coordinates.
   * - 'center': Centered modal presentation.
   * - 'bottom': Anchored to the bottom edge like a sheet.
   */
  placement?: 'anchor' | 'center' | 'bottom';
  /**
   * Whether to render in compact contextual popup mode (iOS-style UIMenu footprint).
   * Defaults to true when placement is 'anchor'.
   */
  compact?: boolean;
  maxWidth?: number | string;
  maxHeight?: number | string;
  accentColor?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Explicit external trigger geometry. When provided, allows morphing from an
   * external element's synchronous DOMRect without requiring a child trigger.
   */
  originRect?: {
    top: number;
    left: number;
    right?: number;
    bottom?: number;
    width: number;
    height: number;
  } | null;
  /**
   * Custom style for the inner children/rows container.
   */
  contentStyle?: React.CSSProperties;
  /**
   * Whether to display the header. Defaults to true if title or rows are present.
   */
  showHeader?: boolean;
}

/**
 * MorphingActionSurface — Appllama benchmark spatial action surface.
 * The closed trigger element physically transforms into the open modal panel via
 * Framer Motion 12 layout morphing. Includes press acknowledgement (scale 0.94),
 * staggered child entrance, outside click dismiss, and Android hardware back button integration.
 */
export const MorphingActionSurface: React.FC<MorphingActionSurfaceProps> = ({
  buttonLabel = '',
  buttonIcon,
  title,
  subtitle,
  rows = [],
  children,
  triggerVariant = 'standard',
  customTrigger,
  placement = 'anchor',
  compact,
  maxWidth,
  maxHeight,
  accentColor = 'var(--c-accent-from, #f59e0b)',
  reducedMotion = false,
  className = '',
  style,
  testId,
  isOpen: controlledIsOpen,
  onOpenChange,
  originRect: propsOriginRect,
  contentStyle,
  showHeader = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const rawId = useId();
  const surfaceId = `morph-surface-${rawId.replace(/:/g, '')}`;
  const prefersReduced = useAppReducedMotion();
  const isReduced = reducedMotion || prefersReduced;

  const triggerAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [originRect, setOriginRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);

  const originRectRef = useRef<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);

  const [closeRect, setCloseRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);

  const captureRect = useCallback(() => {
    if (triggerAnchorRef.current) {
      const r = triggerAnchorRef.current.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        const rectData = {
          top: r.top,
          left: r.left,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
        originRectRef.current = rectData;
        setOriginRect(rectData);
        return rectData;
      }
    }
    return null;
  }, []);

  const captureCloseRect = useCallback(() => {
    if (triggerAnchorRef.current) {
      const r = triggerAnchorRef.current.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        const rectData = {
          top: r.top,
          left: r.left,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
        setCloseRect(rectData);
        return rectData;
      }
    }
    return null;
  }, []);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasBeenOpened(true);
    }
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    try {
      MotionProfiler.recordTriggerAttempt(surfaceId, { blockedByExitOverlay: false });
      MotionProfiler.startMorphOpen(surfaceId);
    } catch (_) {}
    captureRect();
    setHasBeenOpened(true);
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
      onOpenChange?.(true);
    }
  }, [captureRect, isControlled, onOpenChange, surfaceId]);

  const handleClose = useCallback(() => {
    try {
      MotionProfiler.startMorphClose(surfaceId);
    } catch (_) {}
    captureCloseRect();
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  }, [captureCloseRect, isControlled, onOpenChange, surfaceId]);

  // Active overlays registry integration
  useEffect(() => {
    if (!isOpen) return;
    activeOverlaysRegistry.register('sheet', surfaceId);
    return () => {
      activeOverlaysRegistry.unregister('sheet', surfaceId);
    };
  }, [isOpen, surfaceId]);

  // Android Back Handler integration via BackDispatcher
  useEffect(() => {
    if (!isOpen) return;
    const unregister = BackDispatcher.register('modal', () => {
      handleClose();
      return true; // Consumed event
    });
    return unregister;
  }, [isOpen, handleClose]);

  // Synchronous bounds capture & controlled change tracking
  const prevOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    if (propsOriginRect) {
      const rectData = {
        top: propsOriginRect.top,
        left: propsOriginRect.left,
        right: propsOriginRect.right ?? (propsOriginRect.left + propsOriginRect.width),
        bottom: propsOriginRect.bottom ?? (propsOriginRect.top + propsOriginRect.height),
        width: propsOriginRect.width,
        height: propsOriginRect.height,
      };
      originRectRef.current = rectData;
      setOriginRect(rectData);
    } else if (!prevOpenRef.current && isOpen) {
      if (!originRectRef.current && triggerAnchorRef.current) {
        captureRect();
      }
    } else if (prevOpenRef.current && !isOpen) {
      captureCloseRect();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, propsOriginRect, captureRect, captureCloseRect]);

  // Determine compact presentation mode (defaulting to true for contextual menus)
  const isCompact = compact !== undefined
    ? compact
    : (placement === 'anchor' && (!maxWidth || Number(maxWidth) <= 320));

  const popupWidth = typeof maxWidth === 'number'
    ? maxWidth
    : (isCompact ? 260 : 360);

  // Compute anchored viewport coordinates
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 844;

  const effectiveRect = originRect || originRectRef.current;
  let computedPositionStyle: React.CSSProperties = {};
  let panelInitial: any;
  let panelAnimate: any;
  let panelExit: any;

  if (placement === 'center') {
    if (effectiveRect && !isReduced) {
      const triggerCenterX = effectiveRect.left + effectiveRect.width / 2;
      const triggerCenterY = effectiveRect.top + effectiveRect.height / 2;
      const centerViewportX = viewportWidth / 2;
      const centerViewportY = viewportHeight / 2;

      const deltaX = Math.round(triggerCenterX - centerViewportX);
      const deltaY = Math.round(triggerCenterY - centerViewportY);

      const targetWidth = typeof maxWidth === 'number'
        ? Math.min(maxWidth, viewportWidth - 32)
        : (typeof maxWidth === 'string' && maxWidth.endsWith('px'))
          ? Math.min(parseFloat(maxWidth), viewportWidth - 32)
          : Math.min(isCompact ? 260 : 380, viewportWidth - 32);

      const startScale = Math.max(0.18, Math.min(0.88, (effectiveRect.width || 80) / targetWidth));

      computedPositionStyle = {
        position: 'relative',
        width: isCompact ? popupWidth : '100%',
        maxWidth: maxWidth ?? (isCompact ? popupWidth : 380),
        transformOrigin: 'center center',
      };
      panelInitial = {
        opacity: 0,
        scale: startScale,
        x: deltaX,
        y: deltaY,
        borderRadius: isCompact ? 18 : 28,
      };
      panelAnimate = {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        borderRadius: isCompact ? 16 : 24,
      };
      panelExit = {
        opacity: 0,
        scale: startScale,
        x: deltaX,
        y: deltaY,
        borderRadius: isCompact ? 18 : 28,
      };
    } else {
      computedPositionStyle = {
        position: 'relative',
        width: isCompact ? popupWidth : '100%',
        maxWidth: maxWidth ?? (isCompact ? popupWidth : 380),
        transformOrigin: 'center center',
      };
      panelInitial = isReduced
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.92, y: 12 };
      panelAnimate = isReduced
        ? { opacity: 1 }
        : { opacity: 1, scale: 1, y: 0 };
      panelExit = isReduced
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.92, y: 12 };
    }
  } else if (placement === 'bottom') {
    computedPositionStyle = {
      position: 'relative',
      width: isCompact ? popupWidth : '100%',
      maxWidth: maxWidth ?? (isCompact ? popupWidth : 440),
      transformOrigin: 'center bottom',
    };
    panelInitial = isReduced
      ? { opacity: 0 }
      : { opacity: 0, y: '100%' };
    panelAnimate = isReduced
      ? { opacity: 1 }
      : { opacity: 1, y: '0%' };
    panelExit = isReduced
      ? { opacity: 0 }
      : { opacity: 0, y: '100%' };
  } else {
    // placement === 'anchor'
    if (effectiveRect) {
      const isRightHalf = (effectiveRect.left + effectiveRect.width / 2) > (viewportWidth / 2);
      let clampedLeft: number | undefined;
      let clampedRight: number | undefined;
      if (isRightHalf) {
        const desiredRight = viewportWidth - effectiveRect.right;
        clampedRight = Math.max(12, Math.min(viewportWidth - popupWidth - 12, desiredRight));
      } else {
        clampedLeft = Math.max(12, Math.min(viewportWidth - popupWidth - 12, effectiveRect.left));
      }

      const isBottomHalf = (effectiveRect.top + effectiveRect.height / 2) > (viewportHeight / 2);
      let clampedTop: number | undefined;
      let clampedBottom: number | undefined;
      let transformOrigin: string;
      if (isBottomHalf) {
        // Expand upward above the trigger button
        clampedBottom = Math.max(12, viewportHeight - effectiveRect.top + 6);
        transformOrigin = isRightHalf ? 'bottom right' : 'bottom left';
      } else {
        // Expand downward below the trigger button
        clampedTop = Math.max(12, effectiveRect.bottom + 6);
        transformOrigin = isRightHalf ? 'top right' : 'top left';
      }

      computedPositionStyle = {
        position: 'absolute',
        top: clampedTop,
        bottom: clampedBottom,
        left: clampedLeft,
        right: clampedRight,
        transformOrigin,
        width: isCompact ? popupWidth : '100%',
        maxWidth: maxWidth ?? (isCompact ? popupWidth : 380),
      };

      const startScale = Math.max(0.82, Math.min(0.92, (effectiveRect.width || 44) / popupWidth + 0.7));
      const deltaY = isBottomHalf ? 8 : -8;
      const deltaX = isRightHalf ? 6 : -6;

      panelInitial = isReduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            scale: startScale,
            x: deltaX,
            y: deltaY,
            borderRadius: isCompact ? 18 : 22,
          };
      panelAnimate = isReduced
        ? { opacity: 1 }
        : {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            borderRadius: isCompact ? 16 : 24,
          };
      panelExit = isReduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            scale: startScale,
            x: deltaX,
            y: deltaY,
            borderRadius: isCompact ? 18 : 22,
          };
    } else {
      computedPositionStyle = {
        position: 'absolute',
        top: Math.max(16, viewportHeight * 0.25),
        left: Math.max(12, (viewportWidth - popupWidth) / 2),
        transformOrigin: 'center center',
        width: isCompact ? popupWidth : '100%',
        maxWidth: maxWidth ?? (isCompact ? popupWidth : 380),
      };
      panelInitial = isReduced
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.92, y: 12 };
      panelAnimate = isReduced
        ? { opacity: 1 }
        : { opacity: 1, scale: 1, y: 0 };
      panelExit = isReduced
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.92, y: 12 };
    }
  }

  const overlayContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: isOpen ? 'auto' : 'none',
        display: placement === 'center' || placement === 'bottom' ? 'flex' : 'block',
        alignItems: placement === 'center' ? 'center' : placement === 'bottom' ? 'flex-end' : undefined,
        justifyContent: placement === 'center' || placement === 'bottom' ? 'center' : undefined,
        padding:
          placement === 'bottom'
            ? '0 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px'
            : placement === 'center'
              ? '16px'
              : 0,
        boxSizing: 'border-box',
      }}
    >
      <AnimatePresence
        onExitComplete={() => {
          try {
            MotionProfiler.endMorphClose(surfaceId);
          } catch (_) {}
          setHasBeenOpened(false);
        }}
      >
        {isOpen && (
          /* Backdrop */
          <motion.div
            key={`${surfaceId}-backdrop`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isReduced ? 0.15 : 0.22, ease: EASE_OUT }}
            onClick={handleClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: isCompact ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.65)',
              backdropFilter: isReduced ? 'none' : 'var(--surface-scrim-blur, none)',
              WebkitBackdropFilter: isReduced ? 'none' : 'var(--surface-scrim-blur, none)',
            }}
          />
        )}

        {isOpen && (
          /* Expanded Morphing Surface */
          <motion.div
            key={`${surfaceId}-panel`}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            onAnimationComplete={() => {
              try {
                MotionProfiler.endMorphOpen(surfaceId);
              } catch (_) {}
            }}
            transition={{
              ...(isReduced ? { duration: 0.15, ease: EASE_OUT } : SPRING_PANEL),
            }}
            style={{
              maxHeight: maxHeight ?? (isCompact ? '70vh' : '85vh'),
              borderRadius: isCompact ? 16 : 24,
              backgroundColor: 'var(--surface-dialog-bg, #16161c)',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.14))',
              color: 'var(--c-text-primary, #ffffff)',
              boxShadow: isCompact
                ? '0 8px 24px rgba(0, 0, 0, 0.4)'
                : '0 12px 32px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              ...computedPositionStyle,
            }}
            className="sc-morphing-panel"
          >
              {/* Header */}
              {showHeader && (
                isCompact ? (
                  title ? (
                    <div
                      style={{
                        padding: '10px 14px 6px 14px',
                        borderBottom: '1px solid var(--c-border, rgba(255, 255, 255, 0.06))',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--c-text-secondary, #9ca3af)',
                        }}
                      >
                        {title}
                      </span>
                      {subtitle && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--c-text-muted, #6b7280)',
                            marginTop: 2,
                          }}
                        >
                          {subtitle}
                        </div>
                      )}
                    </div>
                  ) : null
                ) : (
                  (title || subtitle || !children) ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '18px 20px 14px 20px',
                        borderBottom: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--c-text-primary, #ffffff)',
                            fontFamily: 'var(--type-heading-font, var(--studio-font-display, inherit))',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {title}
                        </h3>
                        {subtitle && (
                          <p
                            style={{
                              margin: '4px 0 0 0',
                              fontSize: 13,
                              color: 'var(--c-text-secondary, var(--muted, #9ca3af))',
                              lineHeight: '18px',
                            }}
                          >
                            {subtitle}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={handleClose}
                        aria-label="Close"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'var(--c-surface-high, rgba(255, 255, 255, 0.08))',
                          border: 'none',
                          color: 'var(--c-text-secondary, #9ca3af)',
                          cursor: 'pointer',
                          touchAction: 'manipulation',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          close
                        </span>
                      </button>
                    </div>
                  ) : null
                )
              )}

              {/* Rows or Custom Children with Immediate Coherent Fluid Entry */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: isReduced ? 0.12 : 0.15,
                  ease: EASE_OUT,
                }}
                style={{
                  padding: isCompact ? '6px 6px' : '8px 12px 16px 12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isCompact ? 3 : 6,
                  ...contentStyle,
                }}
              >
                {children ? (
                  typeof children === 'function' ? children({ close: handleClose }) : children
                ) : (
                  rows.map((row) => {
                    const isDisabled = Boolean(row.disabled);
                    const isDestructive = Boolean(row.destructive);
                    return (
                      <motion.div
                        key={row.id}
                        data-disabled={isDisabled ? 'true' : undefined}
                        whileTap={isReduced || isDisabled ? undefined : { scale: 0.98 }}
                        transition={{ duration: 0.08 }}
                        onClick={() => {
                          if (isDisabled) return;
                          row.onPress();
                          handleClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isCompact ? '9px 12px' : '12px 14px',
                          borderRadius: isCompact ? 10 : 14,
                          backgroundColor: row.active
                            ? 'rgba(245, 158, 11, 0.12)'
                            : isDestructive
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'var(--c-surface-high, rgba(255, 255, 255, 0.04))',
                          border: row.active
                            ? `1px solid ${accentColor}`
                            : isDestructive
                            ? '1px solid rgba(239, 68, 68, 0.2)'
                            : '1px solid var(--c-border, rgba(255, 255, 255, 0.06))',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.45 : 1,
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 10 : 12 }}>
                          {row.icon && (
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: isCompact ? 18 : 20,
                                color: isDestructive
                                  ? '#ef4444'
                                  : row.active
                                  ? accentColor
                                  : 'var(--c-text-secondary, #9ca3af)',
                              }}
                            >
                              {row.icon}
                            </span>
                          )}
                          <div>
                            <div
                              style={{
                                fontSize: isCompact ? 13.5 : 14.5,
                                fontWeight: row.active ? 600 : 500,
                                color: isDestructive
                                  ? '#ef4444'
                                  : row.active
                                  ? accentColor
                                  : 'var(--c-text-primary, #ffffff)',
                              }}
                            >
                              {row.label}
                            </div>
                            {row.sublabel && (
                              <div
                                style={{
                                  fontSize: isCompact ? 11 : 12,
                                  color: 'var(--c-text-secondary, #9ca3af)',
                                  marginTop: 1,
                                }}
                              >
                                {row.sublabel}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.badge && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: accentColor,
                                color: '#000000',
                              }}
                            >
                              {row.badge}
                            </span>
                          )}
                          {row.active && (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 16, color: accentColor }}
                            >
                              check
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );

  return (
    <>
      {/* 1. Trigger Anchor & Button (Permanently mounted in DOM for layout stability & live geometry) */}
      <span
        ref={triggerAnchorRef}
        className="sc-morphing-anchor"
        aria-hidden={isOpen ? 'true' : undefined}
        style={{
          display: (customTrigger || buttonLabel || buttonIcon) ? 'inline-flex' : 'none',
          verticalAlign: 'middle',
          visibility: isOpen ? 'hidden' : 'visible',
          pointerEvents: isOpen ? 'none' : 'auto',
        }}
        onTouchStart={() => {
          try {
            MotionProfiler.recordTriggerAttempt(surfaceId, { blockedByExitOverlay: false });
          } catch (_) {}
          captureRect();
        }}
        onMouseDown={() => {
          try {
            MotionProfiler.recordTriggerAttempt(surfaceId, { blockedByExitOverlay: false });
          } catch (_) {}
          captureRect();
        }}
      >
        {customTrigger ? (
          customTrigger({
            open: handleOpen,
            isOpen,
            surfaceId,
            triggerProps: {
              layoutId: surfaceId,
              onClick: handleOpen,
              whileTap: isReduced ? undefined : { scale: 0.96 },
              transition: {
                layout: SPRING_PANEL,
              },
            },
          })
        ) : triggerVariant === 'icon' ? (
          <motion.button
            layoutId={surfaceId}
            data-testid={testId}
            onClick={handleOpen}
            whileTap={isReduced ? undefined : { scale: 0.96 }}
            transition={{
              layout: SPRING_PANEL,
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'var(--c-surface-high, #1e1e24)',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              color: 'var(--c-text-primary, #ffffff)',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              ...style,
            }}
            className={`sc-morphing-trigger ${className}`}
            title={title}
            aria-label={title}
          >
            {buttonIcon && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: accentColor }}
              >
                {buttonIcon}
              </span>
            )}
          </motion.button>
        ) : (buttonLabel || buttonIcon) ? (
          <motion.button
            layoutId={surfaceId}
            data-testid={testId}
            onClick={handleOpen}
            whileTap={isReduced ? undefined : { scale: 0.96 }}
            transition={{
              layout: SPRING_PANEL,
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              minHeight: 44,
              borderRadius: 22,
              backgroundColor: 'var(--c-surface-high, #1e1e24)',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              color: 'var(--c-text-primary, #ffffff)',
              fontFamily: 'var(--type-body-font, var(--studio-font-body, inherit))',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              ...style,
            }}
            className={`sc-morphing-trigger ${className}`}
          >
            {buttonIcon && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: accentColor }}
              >
                {buttonIcon}
              </span>
            )}
            <span>{buttonLabel}</span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, opacity: 0.6, marginLeft: 2 }}
            >
              expand_more
            </span>
          </motion.button>
        ) : null}
      </span>

      {/* 2. Open State Modal Surface & Backdrop via Portal (only mounted when active or exiting) */}
      {(isOpen || hasBeenOpened) &&
        (typeof document !== 'undefined' ? createPortal(overlayContent, document.body) : overlayContent)}
    </>
  );
};

export default MorphingActionSurface;
