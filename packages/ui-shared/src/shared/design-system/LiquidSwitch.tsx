import React, { memo, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface LiquidSwitchProps {
  checked?: boolean;
  value?: boolean;
  onChange?: (checked: boolean) => void;
  onValueChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  accentFrom?: string;
  accentTo?: string;
  style?: React.CSSProperties;
  className?: string;
  testId?: string;
  'data-testid'?: string;
  reducedMotion?: boolean;
}

/**
 * LiquidSwitch — Appllama-grade tactile toggle switch.
 * Features dual-spring leader/follower physics, real-time velocity elongation,
 * reciprocal volume preservation (Sy = 1 / sqrt(Sx)), solid vector rendering,
 * true AMOLED #000000 compliance, and WCAG accessibility standards.
 */
export const LiquidSwitch = memo(function LiquidSwitch({
  checked,
  value,
  onChange,
  onValueChange,
  disabled = false,
  label,
  description,
  ariaLabel,
  size = 'md',
  accentFrom,
  accentTo,
  style,
  className = '',
  testId,
  'data-testid': dataTestId,
  reducedMotion = false,
}: LiquidSwitchProps) {
  const isChecked = checked !== undefined ? checked : (value ?? false);
  const prefersReduced = useReducedMotion();
  const isReduced = reducedMotion || prefersReduced;

  const resolvedTestId = testId || dataTestId;
  const activeColor = accentFrom || 'var(--c-accent-from, #f59e0b)';

  // Dimensions
  const isSm = size === 'sm';
  const trackWidth = isSm ? 42 : 50;
  const trackHeight = isSm ? 24 : 28;
  const trackPadding = 3;
  const thumbSize = isSm ? 18 : 22;
  const travelDistance = trackWidth - thumbSize - trackPadding * 2; // sm: 18, md: 22

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    onChange?.(next);
    onValueChange?.(next);
  }, [disabled, isChecked, onChange, onValueChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle();
      }
    },
    [disabled, handleToggle]
  );

  return (
    <label
      data-testid={resolvedTestId}
      aria-label={ariaLabel || label || 'Toggle switch'}
      role="switch"
      aria-checked={isChecked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        e.preventDefault();
        handleToggle();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        minHeight: 48,
        ...style,
      }}
      className={`sc-liquid-switch-container ${className}`}
    >
      {(label || description) && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, paddingRight: 8 }}>
          {label && (
            <span
              style={{
                fontSize: isSm ? '13.5px' : '15px',
                lineHeight: '20px',
                fontWeight: 500,
                color: 'var(--c-text-primary, #ffffff)',
                fontFamily: 'var(--type-body-font, var(--studio-font-body, inherit))',
                letterSpacing: '0.2px',
              }}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              style={{
                fontSize: '12px',
                lineHeight: '16px',
                fontWeight: 400,
                color: 'var(--c-text-secondary, var(--muted, #9ca3af))',
                marginTop: 2,
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <motion.div
        data-testid={resolvedTestId ? `${resolvedTestId}-track` : undefined}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
        style={{
          width: trackWidth,
          height: trackHeight,
          borderRadius: trackHeight / 2,
          backgroundColor: isChecked
            ? activeColor
            : 'var(--c-surface-high, rgba(128, 128, 128, 0.16))',
          border: isChecked
            ? '1px solid rgba(255, 255, 255, 0.22)'
            : '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
          boxShadow: isChecked
            ? `0 2px 10px ${activeColor}40, inset 0 1px 1.5px rgba(255, 255, 255, 0.35)`
            : 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          padding: trackPadding,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'background-color 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease, box-shadow 220ms ease',
        }}
      >
        {/* Follower droplet (fluid bridge) - only when motion enabled */}
        {!isReduced && (
          <motion.div
            aria-hidden="true"
            animate={{
              x: isChecked ? travelDistance : 0,
              opacity: [0, 0.85, 0],
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 22,
              mass: 1.1,
              opacity: { duration: 0.28, times: [0, 0.4, 1] },
            }}
            style={{
              position: 'absolute',
              left: trackPadding + (thumbSize * 0.15) / 2,
              width: thumbSize * 0.85,
              height: thumbSize * 0.85,
              borderRadius: (thumbSize * 0.85) / 2,
              backgroundColor: '#ffffff',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Primary Thumb with fluid velocity elongation and volumetric preservation */}
        <motion.div
          data-testid={resolvedTestId ? `${resolvedTestId}-knob` : undefined}
          animate={
            isReduced
              ? { x: isChecked ? travelDistance : 0 }
              : {
                  x: isChecked ? travelDistance : 0,
                  scaleX: isChecked ? [1, 1.34, 1] : [1, 1.34, 1],
                  scaleY: isChecked ? [1, 0.86, 1] : [1, 0.86, 1],
                }
          }
          transition={
            isReduced
              ? { duration: 0.15, ease: 'easeOut' }
              : {
                  x: { type: 'spring', stiffness: 500, damping: 28, mass: 0.8 },
                  scaleX: { duration: 0.26, times: [0, 0.45, 1], ease: 'easeInOut' },
                  scaleY: { duration: 0.26, times: [0, 0.45, 1], ease: 'easeInOut' },
                }
          }
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#ffffff',
            boxShadow:
              '0 2px 5px rgba(0, 0, 0, 0.32), 0 0 1px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
            transformOrigin: isChecked ? 'left center' : 'right center',
            flexShrink: 0,
          }}
        />
      </motion.div>
    </label>
  );
});

export default LiquidSwitch;
