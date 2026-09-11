import React, { useState, useCallback, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { BackDispatcher } from '@workspace/studio-core';

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
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const rawId = useId();
  const surfaceId = `morph-surface-${rawId.replace(/:/g, '')}`;
  const prefersReduced = useReducedMotion();
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
      }
    }
  }, []);

  const handleOpen = useCallback(() => {
    captureRect();
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
      onOpenChange?.(true);
    }
  }, [captureRect, isControlled, onOpenChange]);

  const handleClose = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  }, [isControlled, onOpenChange]);

  // Android Back Handler integration via BackDispatcher
  useEffect(() => {
    if (!isOpen) return;
    const unregister = BackDispatcher.register('modal', () => {
      handleClose();
      return true; // Consumed event
    });
    return unregister;
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && !originRectRef.current) {
      captureRect();
    }
  }, [isOpen, captureRect]);

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

  if (placement === 'center') {
    computedPositionStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else if (placement === 'bottom') {
    computedPositionStyle = {
      bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      left: '50%',
      transform: 'translateX(-50%)',
      width: isCompact ? popupWidth : 'calc(100% - 32px)',
      maxWidth: maxWidth ?? (isCompact ? popupWidth : 440),
    };
  } else {
    // placement === 'anchor'
    if (effectiveRect) {
      const isRightHalf = (effectiveRect.left + effectiveRect.width / 2) > (viewportWidth / 2);
      if (isRightHalf) {
        const desiredRight = viewportWidth - effectiveRect.right;
        const clampedRight = Math.max(12, Math.min(viewportWidth - popupWidth - 12, desiredRight));
        computedPositionStyle.right = clampedRight;
      } else {
        const clampedLeft = Math.max(12, Math.min(viewportWidth - popupWidth - 12, effectiveRect.left));
        computedPositionStyle.left = clampedLeft;
      }

      const isBottomHalf = (effectiveRect.top + effectiveRect.height / 2) > (viewportHeight / 2);
      if (isBottomHalf) {
        // Expand upward above the trigger button
        computedPositionStyle.bottom = Math.max(12, viewportHeight - effectiveRect.top + 6);
        computedPositionStyle.transformOrigin = isRightHalf ? 'bottom right' : 'bottom left';
      } else {
        // Expand downward below the trigger button
        computedPositionStyle.top = Math.max(12, effectiveRect.bottom + 6);
        computedPositionStyle.transformOrigin = isRightHalf ? 'top right' : 'top left';
      }
    } else {
      computedPositionStyle = {
        top: Math.max(16, viewportHeight * 0.25),
        left: Math.max(12, (viewportWidth - popupWidth) / 2),
      };
    }
  }

  return (
    <>
      {/* 1. Closed State Trigger Button */}
      {!isOpen && (
        <span
          ref={triggerAnchorRef}
          className="sc-morphing-anchor"
          style={{ display: 'inline-flex', verticalAlign: 'middle' }}
          onTouchStart={captureRect}
          onMouseDown={captureRect}
        >
          {customTrigger ? (
            customTrigger({
              open: handleOpen,
              isOpen,
              surfaceId,
              triggerProps: {
                layoutId: surfaceId,
                onClick: handleOpen,
                whileTap: isReduced ? undefined : { scale: 0.94 },
                transition: {
                  layout: { type: 'spring', stiffness: 340, damping: 28, mass: 0.8 },
                },
              },
            })
          ) : triggerVariant === 'icon' ? (
            <motion.button
              layoutId={surfaceId}
              data-testid={testId}
              onClick={handleOpen}
              whileTap={isReduced ? undefined : { scale: 0.94 }}
              transition={{
                layout: { type: 'spring', stiffness: 340, damping: 28, mass: 0.8 },
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
          ) : (
            <motion.button
              layoutId={surfaceId}
              data-testid={testId}
              onClick={handleOpen}
              whileTap={isReduced ? undefined : { scale: 0.94 }}
              transition={{
                layout: { type: 'spring', stiffness: 340, damping: 28, mass: 0.8 },
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
          )}
        </span>
      )}

      {/* 2. Open State Modal Surface & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              pointerEvents: 'auto',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={handleClose}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: isCompact ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: isReduced ? 'none' : isCompact ? 'blur(2px)' : 'blur(4px)',
                WebkitBackdropFilter: isReduced ? 'none' : isCompact ? 'blur(2px)' : 'blur(4px)',
              }}
            />

            {/* Expanded Morphing Surface */}
            <motion.div
              layoutId={surfaceId}
              initial={isReduced ? { opacity: 0, scale: 0.94 } : undefined}
              animate={isReduced ? { opacity: 1, scale: 1 } : undefined}
              exit={isReduced ? { opacity: 0, scale: 0.94 } : undefined}
              transition={{
                layout: { type: 'spring', stiffness: 340, damping: 28, mass: 0.8 },
                duration: isReduced ? 0.15 : undefined,
              }}
              style={{
                position: 'absolute',
                width: isCompact ? popupWidth : '100%',
                maxWidth: maxWidth ?? (isCompact ? popupWidth : 380),
                maxHeight: maxHeight ?? (isCompact ? '70vh' : '85vh'),
                borderRadius: isCompact ? 16 : 24,
                backgroundColor: 'var(--c-surface-base, #16161c)',
                border: '1px solid var(--c-border, rgba(255, 255, 255, 0.14))',
                boxShadow: isCompact
                  ? '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                  : '0 20px 40px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                ...computedPositionStyle,
              }}
              className="sc-morphing-panel"
            >
              {/* Header */}
              {isCompact ? (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '20px 20px 14px 20px',
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
              )}

              {/* Rows or Custom Children with Staggered Fluid Entry */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: isReduced ? 0 : 0.035,
                      delayChildren: isReduced ? 0 : 0.05,
                    },
                  },
                }}
                style={{
                  padding: isCompact ? '6px 6px' : '8px 12px 16px 12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isCompact ? 3 : 6,
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
                        variants={{
                          hidden: { opacity: 0, y: isReduced ? 0 : 10 },
                          visible: {
                            opacity: isDisabled ? 0.45 : 1,
                            y: 0,
                            transition: { type: 'spring', stiffness: 350, damping: 25 },
                          },
                        }}
                        onClick={() => {
                          if (isDisabled) return;
                          row.onPress();
                          handleClose();
                        }}
                        whileTap={isReduced || isDisabled ? undefined : { scale: 0.97 }}
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
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MorphingActionSurface;
