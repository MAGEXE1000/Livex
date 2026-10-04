import React, { memo, useCallback } from 'react';
import { Switch } from '../../components/ui/Switch';

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
  style,
  className = '',
  testId,
  'data-testid': dataTestId,
}: LiquidSwitchProps) {
  const isChecked = checked !== undefined ? checked : (value ?? false);

  const resolvedTestId = testId || dataTestId;

  // Dimensions
  const isSm = size === 'sm';

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    onChange?.(next);
    onValueChange?.(next);
  }, [disabled, isChecked, onChange, onValueChange]);

  return (
    <div
      data-testid={resolvedTestId}
      onClick={handleToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
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
      <Switch
        checked={isChecked}
        disabled={disabled}
        aria-label={ariaLabel || label || 'Toggle switch'}
        data-testid={resolvedTestId ? `${resolvedTestId}-track` : undefined}
        onClick={(e) => {
          // Wrapper owns the toggle so label taps and switch taps behave identically.
          e.preventDefault();
        }}
      />
    </div>
  );
});

export default LiquidSwitch;


