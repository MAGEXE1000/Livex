import React from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/studio-core';
import { Loader } from '../../components/motion/loader';
import { Button } from './buttons';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

// ── 14. Skeleton ───────────────────────────────────────────────────────────
export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({
  variant = 'rect',
  width = '100%',
  height = '16px',
  style,
  className = '',
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: variant === 'circle' ? '50%' : variant === 'text' ? '6px' : '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
      className={`studio-shimmer ${className}`}
    />
  );
}

// ── 14.5. Badge ────────────────────────────────────────────────────────────
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  icon?: string | React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  icon,
  children,
  style,
  className = '',
  ...props
}: BadgeProps) {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'linear-gradient(135deg, var(--c-accent-from, #7c3aed)30, var(--c-accent-to, var(--c-accent-from, #7c3aed))25)',
          color: '#ffffff',
          border: '1px solid var(--c-accent-from, rgba(124, 58, 237, 0.5))',
          shadow: '0 2px 8px var(--c-accent-from, rgba(124, 58, 237, 0.25))',
        };
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          shadow: '0 2px 8px rgba(16, 185, 129, 0.20)',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          shadow: '0 2px 8px rgba(245, 158, 11, 0.20)',
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          shadow: '0 2px 8px rgba(239, 68, 68, 0.20)',
        };
      case 'secondary':
        return {
          bg: 'rgba(255, 255, 255, 0.08)',
          color: 'var(--c-text-primary)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          shadow: 'none',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--c-text-secondary)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          shadow: 'none',
        };
    }
  };

  const s = getStyles();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '2px 7px' : '4px 10px',
        fontSize: size === 'sm' ? '9.5px' : '11.5px',
        fontWeight: 800,
        fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderRadius: size === 'sm' ? '6px' : '8px',
        background: s.bg,
        color: s.color,
        border: s.border,
        boxShadow: s.shadow,
        boxSizing: 'border-box',
        ...style,
      }}
      className={`studio-badge ${className}`}
      {...props}
    >
      {icon &&
        (typeof icon === 'string' ? (
          <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? 12 : 14 }}>
            {icon}
          </span>
        ) : (
          icon
        ))}
      {children}
    </span>
  );
}

// ── 14.6. Chip ─────────────────────────────────────────────────────────────
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: string | React.ReactNode;
  accentColor?: string;
}

export function Chip({
  selected = false,
  icon,
  accentColor = 'var(--c-accent-from, #7c3aed)',
  children,
  onClick,
  disabled,
  style,
  className = '',
  ...props
}: ChipProps) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled || prefersReduced ? undefined : { scale: 0.95 }}
      whileHover={disabled || !canHover || prefersReduced ? undefined : { scale: 1.02 }}
      transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 9999,
        background: selected
          ? `linear-gradient(135deg, ${accentColor}35, ${accentColor}25)`
          : 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
        border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.08)',
        color: selected ? '#ffffff' : 'var(--c-text-secondary)',
        boxShadow: selected
          ? `0 2px 10px ${accentColor}30, inset 0 1px 1px rgba(255, 255, 255, 0.25)`
          : '0 2px 6px rgba(0, 0, 0, 0.08)',
        fontFamily: 'var(--type-body-font, var(--studio-font-body))',
        fontSize: '12px',
        fontWeight: 750,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
        ...style,
      }}
      className={`studio-chip ${className}`}
      {...(props as any)}
    >
      {icon &&
        (typeof icon === 'string' ? (
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {icon}
          </span>
        ) : (
          icon
        ))}
      {children}
    </motion.button>
  );
}

// ── 15. Loading ────────────────────────────────────────────────────────────
export interface LoadingProps {
  statusText?: string;
  overlay?: boolean;
}

export function Loading({ statusText = 'Loading...', overlay = false }: LoadingProps) {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
      }}
    >
      <Loader variant="comet" size={36} />
      {statusText && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 750,
            color: 'var(--c-text-secondary)',
            fontFamily: 'var(--type-body-font, var(--studio-font-body))',
            letterSpacing: '-0.01em',
          }}
        >
          {statusText}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface-topbar-bg, rgba(16, 16, 20, 0.75))',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          zIndex: 1000,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

// ── 16. Error ─────────────────────────────────────────────────────────────
export interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export function Error({ message, onRetry }: ErrorProps) {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '20px',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        border: `1px solid rgba(239, 68, 68, 0.22)`,
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
        transition: 'background-color 200ms ease, border-color 200ms ease',
      }}
      className="studio-error-card"
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
          error
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '13.5px',
          fontWeight: 700,
          color: '#ef4444',
          fontFamily: 'var(--type-body-font, var(--studio-font-body))',
        }}
      >
        {message}
      </p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// ── 17. Empty State ────────────────────────────────────────────────────────
export interface EmptyStateProps {
  message: string;
  icon?: string;
  description?: string;
}

export function EmptyState({ message, icon = 'folder_open', description }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '32px',
            color: 'var(--c-text-secondary)',
            opacity: 0.7,
          }}
        >
          {icon}
        </span>
      </div>
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: '16px',
          fontWeight: 850,
          letterSpacing: '-0.02em',
          fontFamily: 'var(--studio-font-display)',
          color: 'var(--c-text-primary)',
        }}
      >
        {message}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: '12.5px',
            color: 'var(--c-text-secondary)',
            fontFamily: 'var(--studio-font-body)',
            maxWidth: '280px',
            lineHeight: 1.4,
            opacity: 0.82,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
