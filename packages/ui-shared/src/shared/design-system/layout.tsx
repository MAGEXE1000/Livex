import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/studio-core';
import { StudioHeader as AnimatedAppHeader } from '../layout/StudioHeader';
import { ProgressiveBlur } from './ProgressiveBlur';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

// ── 5. Toolbar ─────────────────────────────────────────────────────────────
export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: React.ReactNode;
}

export function Toolbar({
  title,
  actions,
  children,
  style,
  className = '',
  ...props
}: ToolbarProps) {
  return (
    <div
      style={{
        height: '56px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid rgba(255, 255, 255, 0.08)`,
        backgroundColor: 'transparent',
        flexShrink: 0,
        ...style,
      }}
      className={`studio-toolbar ${className}`}
      {...props}
    >
      {title && (
        <span
          style={{
            fontSize: '16px',
            fontWeight: 800,
            fontFamily: 'var(--studio-font-display)',
            letterSpacing: '-0.02em',
            color: 'var(--c-text-primary)',
          }}
        >
          {title}
        </span>
      )}
      {children}
      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  );
}

// ── 8. Header ──────────────────────────────────────────────────────────────
export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle, style, className = '', ...props }: HeaderProps) {
  return (
    <div style={{ padding: '16px', flexShrink: 0, ...style }} className={className} {...props}>
      <AnimatedAppHeader title={title} subtitle={subtitle} />
    </div>
  );
}

// ── 9. Screen ──────────────────────────────────────────────────────────────
export interface ScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

export function Screen({
  scrollable = true,
  children,
  style,
  className = '',
  ...props
}: ScreenProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: scrollable ? 'auto' : 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
      className={`studio-screen ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ── 10. Scaffold ───────────────────────────────────────────────────────────
export interface ScaffoldProps extends React.HTMLAttributes<HTMLDivElement> {
  toolbar?: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  floatingButton?: React.ReactNode;
}

export function Scaffold({
  toolbar,
  bottomNavigation,
  floatingButton,
  children,
  style,
  className = '',
  ...props
}: ScaffoldProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      className={`studio-scaffold ${className}`}
      {...props}
    >
      {toolbar}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{children}</div>
      {floatingButton && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
            right: '20px',
            zIndex: 40,
          }}
        >
          {floatingButton}
        </div>
      )}
      {bottomNavigation}
    </div>
  );
}

// ── 11. Bottom Navigation ──────────────────────────────────────────────────
export interface BottomNavigationProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  ({ children, style, className = '', ...props }, ref) => {
    return (
      <nav
        ref={ref}
        style={{
          position: 'fixed',
          bottom: 'var(--nav-safe-bottom)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '448px',
          height: '60px',
          borderRadius: '2rem',
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          background: 'transparent',
          boxShadow: 'var(--elevation-high, 0 12px 40px rgba(0, 0, 0, 0.35))',
          zIndex: 50,
          overflow: 'hidden',
          transition: 'background-color 200ms ease, border-color 200ms ease',
          ...style,
        }}
        className={`studio-bottom-nav ${className}`}
        {...props}
      >
        {/* Flagship progressive blur background layer */}
        <ProgressiveBlur direction="bottom" blurLayers={6} maxBlur={24} style={{ zIndex: -2 }} />
        {/* Semi-transparent color overlay for theme matching */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--c-surface-glass-bg, rgba(26,26,30,0.45))',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
        {children}
      </nav>
    );
  }
);

BottomNavigation.displayName = 'BottomNavigation';

// ── 12. ListRow ─────────────────────────────────────────────────────────────
export interface ListRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string | React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  last?: boolean;
}

export const ListRow = forwardRef<HTMLButtonElement, ListRowProps>(
  (
    {
      icon,
      iconColor,
      iconBg,
      title,
      subtitle,
      badge,
      trailing,
      showChevron = true,
      last = false,
      onClick,
      disabled,
      style,
      className = '',
      ...props
    },
    ref
  ) => {
    const canHover = useHoverCapable();
    const prefersReduced = useAppReducedMotion();
    const isInteractive = !!onClick;
    const Component = (isInteractive ? motion.button : 'div') as any;
    const motionProps = isInteractive
      ? {
          whileTap: disabled || prefersReduced ? undefined : { scale: 0.985 },
          whileHover: disabled || !canHover || prefersReduced ? undefined : { scale: 1.006 },
          transition: prefersReduced ? { duration: 0 } : SpringPresets.soft,
        }
      : {};

    return (
      <Component
        ref={ref}
        type={isInteractive ? 'button' : undefined}
        onClick={onClick}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          borderBottom: last ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
          cursor: isInteractive && !disabled ? 'pointer' : 'default',
          textAlign: 'left',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
        className={`studio-list-row ${isInteractive ? 'hover:bg-white/5 transition-colors' : ''} ${className}`}
        {...motionProps}
        {...props}
      >
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: iconBg || 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: iconColor || 'var(--c-text-primary)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15)',
            }}
          >
            {typeof icon === 'string' ? (
              <span className="material-symbols-outlined" style={{ fontSize: 20, opacity: 0.85 }}>
                {icon}
              </span>
            ) : (
              icon
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--type-body-font, var(--studio-font-body))',
              fontWeight: 750,
              fontSize: 14.5,
              letterSpacing: '-0.015em',
              color: 'var(--c-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontFamily: 'var(--type-meta-font, var(--studio-font-body))',
                fontSize: 12,
                color: 'var(--c-text-secondary)',
                opacity: 0.8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <span
            style={{
              fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
              fontWeight: 800,
              fontSize: 9.5,
              color: 'var(--c-text-secondary)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: 6,
              padding: '2px 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
        {trailing}
        {showChevron && isInteractive && (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 15, color: 'var(--c-text-secondary)', opacity: 0.6 }}
            >
              chevron_right
            </span>
          </div>
        )}
      </Component>
    );
  }
);

ListRow.displayName = 'ListRow';
