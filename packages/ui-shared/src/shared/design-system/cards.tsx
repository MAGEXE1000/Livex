import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/studio-core';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

// ── 2. Card ────────────────────────────────────────────────────────────────
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  accentBorder?: boolean;
  glass?: boolean;
  rim?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      interactive = false,
      accentBorder = false,
      glass = true,
      rim = false,
      children,
      style,
      className = '',
      ...props
    },
    ref
  ) => {
    const canHover = useHoverCapable();
    const prefersReduced = useAppReducedMotion();
    const Component = (interactive ? motion.div : 'div') as any;
    const motionProps = interactive
      ? {
          whileHover:
            canHover && !prefersReduced
              ? { scale: 1.012, y: -2, boxShadow: 'var(--shadow-surface-raised)' }
              : undefined,
          whileTap: prefersReduced ? undefined : { scale: 0.985, y: 0 },
          transition: prefersReduced ? { duration: 0 } : SpringPresets.soft,
        }
      : {};

    return (
      <Component
        ref={ref}
        style={{
          borderRadius: 'var(--radius-card, 16px)',
          padding: 'var(--card-pad, 16px)',
          background: glass
            ? 'var(--surface-topbar-bg)'
            : 'var(--surface-card-bg, var(--c-surface-mid))',
          border: accentBorder
            ? `1.5px solid var(--c-accent-from, #7c3aed)`
            : `1px solid var(--c-border, rgba(128, 128, 128, 0.12))`,
          boxShadow: 'var(--shadow-surface-raised, var(--surface-card-shadow))',
          backdropFilter: glass ? 'var(--surface-topbar-blur, blur(16px))' : 'none',
          WebkitBackdropFilter: glass ? 'var(--surface-topbar-blur, blur(16px))' : 'none',
          cursor: interactive ? 'pointer' : 'default',
          willChange: interactive ? 'transform, box-shadow' : 'auto',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          ...style,
        }}
        className={`studio-card ${className}`}
        {...motionProps}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

// ── 2.5. BentoCard ─────────────────────────────────────────────────────────
export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string | React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  accentGlow?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(
  (
    {
      icon,
      iconColor,
      iconBg,
      title,
      subtitle,
      badge,
      accentGlow,
      interactive = false,
      onClick,
      children,
      style,
      className = '',
      ...props
    },
    ref
  ) => {
    const canHover = useHoverCapable();
    const prefersReduced = useAppReducedMotion();
    const Component = (interactive || onClick ? motion.div : 'div') as any;
    const motionProps =
      interactive || onClick
        ? {
            whileHover:
              canHover && !prefersReduced
                ? { scale: 1.015, y: -2, boxShadow: 'var(--shadow-surface-raised)' }
                : undefined,
            whileTap: prefersReduced ? undefined : { scale: 0.985, y: 0 },
            transition: prefersReduced ? { duration: 0 } : SpringPresets.soft,
          }
        : {};

    return (
      <Component
        ref={ref}
        onClick={onClick}
        style={{
          background: 'var(--surface-topbar-bg)',
          border: '1px solid var(--c-border, rgba(128, 128, 128, 0.12))',
          borderRadius: 'var(--radius-card, 16px)',
          padding: 'var(--card-pad, 16px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 96,
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          boxShadow: 'var(--shadow-surface-raised, var(--surface-topbar-shadow))',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          cursor: interactive || onClick ? 'pointer' : 'default',
          userSelect: interactive || onClick ? 'none' : 'auto',
          WebkitTapHighlightColor: 'transparent',
          ...style,
        }}
        className={`studio-bento-card ${className}`}
        {...motionProps}
        {...props}
      >
        {/* Ambient Glow */}
        {accentGlow && (
          <div
            style={{
              position: 'absolute',
              top: -24,
              right: -24,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: accentGlow,
              filter: 'blur(18px)',
              pointerEvents: 'none',
            }}
          />
        )}

        {(icon || badge) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              zIndex: 2,
            }}
          >
            {icon && (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: iconBg || 'var(--c-surface-low)',
                  border: '1px solid var(--c-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor || 'var(--c-text-primary)',
                  boxShadow: 'var(--elevation-low)',
                }}
              >
                {typeof icon === 'string' ? (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {icon}
                  </span>
                ) : (
                  icon
                )}
              </div>
            )}
            {badge && (
              <span
                style={{
                  fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: 'var(--c-text-tertiary, #808080)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {badge}
              </span>
            )}
          </div>
        )}

        {(title || subtitle) && (
          <div style={{ marginTop: 10, zIndex: 2 }}>
            {title && (
              <p
                style={{
                  fontFamily:
                    'var(--type-title-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                  fontWeight: 600,
                  fontSize: 'var(--type-title-size, 22px)',
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  lineHeight: 'var(--type-title-lh, 28px)',
                  letterSpacing: 'var(--type-title-tracking, -0.7px)',
                }}
              >
                {title}
              </p>
            )}
            {subtitle && (
              <p
                style={{
                  fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
                  fontSize: 'var(--type-body-size, 14.5px)',
                  color: 'var(--muted, var(--c-text-secondary))',
                  margin: '3px 0 0',
                  lineHeight: 'var(--type-body-lh, 18px)',
                  letterSpacing: 'var(--type-body-tracking, 0.3px)',
                  fontWeight: 400,
                  opacity: 0.88,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </Component>
    );
  }
);

BentoCard.displayName = 'BentoCard';

// ── 3. Surface ─────────────────────────────────────────────────────────────
export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  level?: 'low' | 'mid' | 'high';
}

export function Surface({
  glass = false,
  level = 'mid',
  children,
  style,
  className = '',
  ...props
}: SurfaceProps) {
  const getBg = () => {
    if (glass) return 'var(--surface-topbar-bg, var(--c-surface-glass-bg))';
    if (level === 'low') return 'var(--c-background)';
    if (level === 'high') return 'var(--c-surface-high)';
    return 'var(--c-surface-mid)';
  };

  return (
    <div
      style={{
        backgroundColor: getBg(),
        border: '1px solid var(--c-border, rgba(128, 128, 128, 0.12))',
        backdropFilter: glass ? 'var(--surface-topbar-blur)' : 'none',
        WebkitBackdropFilter: glass ? 'var(--surface-topbar-blur)' : 'none',
        color: 'var(--c-text-primary)',
        boxShadow: glass
          ? 'var(--shadow-surface-raised, 0 8px 24px rgba(0, 0, 0, 0.16))'
          : 'var(--shadow-surface-soft, var(--elevation-low))',
        transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
        borderRadius: 'var(--radius-major, 18px)',
        ...style,
      }}
      className={`studio-surface ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
