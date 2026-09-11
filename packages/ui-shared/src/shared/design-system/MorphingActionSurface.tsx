import React, { useState, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { BackDispatcher } from '@workspace/studio-core';

export interface MorphingActionRowItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  badge?: string;
  active?: boolean;
  onPress: () => void;
}

export interface MorphingActionSurfaceProps {
  buttonLabel?: string;
  buttonIcon?: string;
  title: string;
  subtitle?: string;
  rows?: MorphingActionRowItem[];
  children?: React.ReactNode | ((helpers: { close: () => void }) => React.ReactNode);
  triggerVariant?: 'standard' | 'icon' | 'custom';
  customTrigger?: (helpers: { open: () => void; isOpen: boolean; surfaceId: string }) => React.ReactNode;
  maxWidth?: number | string;
  maxHeight?: number | string;
  accentColor?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
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
  maxWidth,
  maxHeight,
  accentColor = 'var(--c-accent-from, #f59e0b)',
  reducedMotion = false,
  className = '',
  style,
  testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rawId = useId();
  const surfaceId = `morph-surface-${rawId.replace(/:/g, '')}`;
  const prefersReduced = useReducedMotion();
  const isReduced = reducedMotion || prefersReduced;

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Android Back Handler integration via BackDispatcher
  useEffect(() => {
    if (!isOpen) return;
    const unregister = BackDispatcher.register('modal', () => {
      handleClose();
      return true; // Consumed event
    });
    return unregister;
  }, [isOpen, handleClose]);

  return (
    <>
      {/* 1. Closed State Trigger Button */}
      {!isOpen && (
        customTrigger ? (
          customTrigger({ open: handleOpen, isOpen, surfaceId })
        ) : triggerVariant === 'icon' ? (
          <motion.button
            layoutId={surfaceId}
            data-testid={testId}
            onClick={handleOpen}
            whileTap={isReduced ? undefined : { scale: 0.94 }}
            transition={{
              layout: { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 },
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
              layout: { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 },
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
        )
      )}

      {/* 2. Open State Modal Surface & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: isReduced ? 'none' : 'blur(4px)',
                WebkitBackdropFilter: isReduced ? 'none' : 'blur(4px)',
              }}
            />

            {/* Expanded Morphing Surface */}
            <motion.div
              layoutId={surfaceId}
              initial={isReduced ? { opacity: 0, scale: 0.96 } : undefined}
              animate={isReduced ? { opacity: 1, scale: 1 } : undefined}
              exit={isReduced ? { opacity: 0, scale: 0.96 } : undefined}
              transition={{
                layout: { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 },
                duration: isReduced ? 0.15 : undefined,
              }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: maxWidth ?? 380,
                maxHeight: maxHeight ?? '85vh',
                borderRadius: 24,
                backgroundColor: 'var(--c-surface-base, #121216)',
                border: '1px solid var(--c-border, rgba(255, 255, 255, 0.15))',
                boxShadow:
                  '0 20px 40px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
              className="sc-morphing-panel"
            >
              {/* Header */}
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

              {/* Rows or Custom Children with Staggered Fluid Entry */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: isReduced ? 0 : 0.045,
                      delayChildren: isReduced ? 0 : 0.08,
                    },
                  },
                }}
                style={{
                  padding: '8px 12px 16px 12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {children ? (
                  typeof children === 'function' ? children({ close: handleClose }) : children
                ) : (
                  rows.map((row) => (
                  <motion.div
                    key={row.id}
                    variants={{
                      hidden: { opacity: 0, y: isReduced ? 0 : 14 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { type: 'spring', stiffness: 350, damping: 25 },
                      },
                    }}
                    onClick={() => {
                      row.onPress();
                      handleClose();
                    }}
                    whileTap={isReduced ? undefined : { scale: 0.97 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 14,
                      backgroundColor: row.active
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'var(--c-surface-high, rgba(255, 255, 255, 0.04))',
                      border: row.active
                        ? `1px solid ${accentColor}`
                        : '1px solid var(--c-border, rgba(255, 255, 255, 0.06))',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {row.icon && (
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 20,
                            color: row.active ? accentColor : 'var(--c-text-secondary, #9ca3af)',
                          }}
                        >
                          {row.icon}
                        </span>
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: row.active ? 600 : 500,
                            color: row.active ? accentColor : 'var(--c-text-primary, #ffffff)',
                          }}
                        >
                          {row.label}
                        </div>
                        {row.sublabel && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--c-text-secondary, #9ca3af)',
                              marginTop: 2,
                            }}
                          >
                            {row.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {row.badge && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
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
                          style={{ fontSize: 18, color: accentColor }}
                        >
                          check
                        </span>
                      )}
                    </div>
                  </motion.div>
                )))}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MorphingActionSurface;
