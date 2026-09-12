import { SpringPresets } from '@workspace/studio-core';
import React, { memo } from 'react';
import { motion } from 'motion/react';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
export { Toggle, type ToggleProps } from '../design-system/StudioToggle';
export { LiquidSwitch, type LiquidSwitchProps } from '../design-system/LiquidSwitch';

export const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  rightElement,
}: {
  icon: string;
  title: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2 mt-5">
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '18px', color: 'var(--c-text-tertiary, var(--muted, #808080))' }}
        >
          {icon}
        </span>
        <p
          style={{
            color: 'var(--c-text-primary, var(--text, #ffffff))',
            fontFamily:
              'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
            fontWeight: 'var(--type-section-weight, 700)' as any,
            fontSize: 'var(--type-section-size, 19px)',
            lineHeight: 'var(--type-section-lh, 24px)',
            letterSpacing: 'var(--type-section-tracking, 0.6px)',
            margin: 0,
          }}
        >
          {title}
        </p>
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
});

export function SettingRow({
  label,
  desc,
  children,
  indent,
  onClick,
}: {
  label: string;
  desc?: string;
  children?: React.ReactNode;
  indent?: boolean;
  onClick?: () => void;
}) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const isInteractive = Boolean(onClick);
  const RowWrapper = isInteractive ? motion.div : 'div';
  const motionProps = isInteractive
    ? {
        whileTap: prefersReduced ? undefined : { scale: 0.985 },
        whileHover: canHover && !prefersReduced ? { scale: 1.006 } : undefined,
        transition: prefersReduced ? { duration: 0 } : SpringPresets.soft,
      }
    : {};

  return (
    <RowWrapper
      {...(motionProps as any)}
      onClick={onClick}
      className={`flex items-center justify-between gap-4 ${isInteractive ? 'cursor-pointer sc-setting-row-interactive' : ''}`}
      style={{
        padding: '14px 16px',
        paddingLeft: indent ? 'calc(16px * 1.75)' : '16px',
        borderBottom: '1px solid var(--track, var(--c-border))',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontSize: indent ? 'var(--type-meta-size, 12px)' : 'var(--type-body-size, 14.5px)',
            lineHeight: indent ? 'var(--type-meta-lh, 16px)' : 'var(--type-body-lh, 18px)',
            fontWeight: indent ? 400 : 500,
            color: indent
              ? 'var(--c-text-secondary, var(--muted))'
              : 'var(--c-text-primary, var(--text))',
            fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
            letterSpacing: 'var(--type-body-tracking, 0.3px)',
            margin: 0,
          }}
        >
          {label}
        </p>
        {desc && (
          <p
            style={{
              fontSize: 'var(--type-meta-size, 12px)',
              marginTop: '2px',
              lineHeight: 'var(--type-meta-lh, 16px)',
              color: 'var(--c-text-secondary, var(--muted))',
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              fontWeight: 400,
              letterSpacing: 'var(--type-meta-tracking, 0.2px)',
              opacity: indent ? 0.75 : 0.82,
              margin: '2px 0 0',
            }}
          >
            {desc}
          </p>
        )}
      </div>
      {children && <div className="flex-none">{children}</div>}
    </RowWrapper>
  );
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  accentFrom = 'var(--studio-accent-from, #679cff)',
  accentTo = 'var(--studio-accent-to, #007aff)',
  layoutId = 'segmented-control-active',
}: {
  value: T;
  options: { value: T; label: string; testId?: string }[];
  onChange: (v: T) => void;
  accentFrom?: string;
  accentTo?: string;
  layoutId?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--control-track-bg, rgba(0, 0, 0, 0.28))',
        borderRadius: '9999px',
        padding: '3px',
        display: 'flex',
        position: 'relative',
        border: '1px solid var(--track, var(--c-border))',
        boxShadow: 'var(--shadow-inset-soft, inset 0 1px 2px rgba(0, 0, 0, 0.20))',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <motion.button
            key={String(opt.value)}
            data-testid={opt.testId}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(opt.value)}
            className="relative outline-none cursor-pointer"
            style={{
              padding: '7px 15px',
              borderRadius: '9999px',
              fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: active ? '#ffffff' : 'var(--c-text-secondary, #acabaa)',
              background: 'transparent',
              border: 'none',
              transition: 'color 200ms cubic-bezier(0.2, 0, 0, 1)',
              zIndex: 10,
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 28,
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '9999px',
                  background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
                  zIndex: -1,
                  boxShadow: 'var(--shadow-control-raised, 0 2px 8px rgba(0, 0, 0, 0.22))',
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 11 }}>{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function BentoSettingCard({
  icon,
  iconColor,
  title,
  desc,
  valueText,
  badge,
  onPress,
  delay = 0,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  desc?: string;
  valueText?: string;
  badge?: string;
  onPress: () => void;
  delay?: number;
}) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  return (
    <motion.button
      onClick={onPress}
      whileTap={prefersReduced ? undefined : { scale: 0.98 }}
      whileHover={canHover && !prefersReduced ? { scale: 1.008 } : undefined}
      transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
      className="outline-none"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 16px',
        background: 'var(--surface-card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--c-border, rgba(128, 128, 128, 0.12))',
        borderRadius: 'var(--radius-card, 16px)',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
        backdropFilter: 'var(--surface-float-blur)',
        WebkitBackdropFilter: 'var(--surface-float-blur)',
        boxShadow: 'var(--shadow-surface-raised, var(--surface-card-shadow))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Specular Rim */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 12,
          right: 12,
          height: '1px',
          background: 'var(--surface-card-inset, rgba(255, 255, 255, 0.08))',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-compact, 12px)',
            background: iconColor ? `${iconColor}22` : 'var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: iconColor
              ? `1px solid ${iconColor}40`
              : '1px solid var(--track, var(--c-border))',
            boxShadow: iconColor
              ? `0 2px 8px ${iconColor}25, inset 0 1px 1px rgba(255, 255, 255, 0.35)`
              : 'inset 0 1px 1px rgba(255, 255, 255, 0.10)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: iconColor || 'var(--studio-accent-from, #679cff)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {icon}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontSize: 'var(--type-body-size, 14.5px)',
              lineHeight: 'var(--type-body-lh, 18px)',
              fontWeight: 600,
              color: 'var(--c-text-primary, var(--text))',
              margin: 0,
              letterSpacing: '-0.2px',
              fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
            }}
          >
            {title}
          </h4>
          {desc && (
            <p
              style={{
                fontSize: 'var(--type-meta-size, 12px)',
                color: 'var(--c-text-secondary, var(--muted))',
                margin: '2px 0 0',
                fontWeight: 400,
                fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                lineHeight: 'var(--type-meta-lh, 16px)',
                letterSpacing: 'var(--type-meta-tracking, 0.2px)',
                opacity: 0.85,
              }}
            >
              {desc}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {valueText && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--studio-accent-from, #679cff)',
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              opacity: 0.85,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {valueText}
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              padding: '2px 8px',
              borderRadius: 'var(--radius-compact, 12px)',
              background: 'var(--c-border)',
              color: 'var(--c-text-primary, var(--text))',
              border: '1px solid var(--track, var(--c-border))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {badge}
          </span>
        )}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15, color: 'var(--c-text-secondary, var(--muted))', opacity: 0.6 }}
          >
            chevron_right
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export function BentoSettingRow({
  icon,
  iconColor,
  title,
  desc,
  valueText,
  badge,
  onPress,
  delay = 0,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  desc?: string;
  valueText?: string;
  badge?: string;
  onPress: () => void;
  delay?: number;
}) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  return (
    <motion.button
      onClick={onPress}
      whileTap={prefersReduced ? undefined : { scale: 0.985 }}
      whileHover={canHover && !prefersReduced ? { scale: 1.006 } : undefined}
      transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
      className="outline-none hover:bg-white/5 transition-colors"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--track, var(--c-border))',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-compact, 12px)',
            background: iconColor ? `${iconColor}22` : 'var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: iconColor
              ? `1px solid ${iconColor}40`
              : '1px solid var(--track, var(--c-border))',
            boxShadow: iconColor
              ? `0 2px 8px ${iconColor}25, inset 0 1px 1px rgba(255, 255, 255, 0.35)`
              : 'inset 0 1px 1px rgba(255, 255, 255, 0.10)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: iconColor || 'var(--studio-accent-from, #679cff)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {icon}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontSize: 'var(--type-body-size, 14.5px)',
              lineHeight: 'var(--type-body-lh, 18px)',
              fontWeight: 600,
              color: 'var(--c-text-primary, var(--text))',
              margin: 0,
              letterSpacing: '-0.2px',
              fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
            }}
          >
            {title}
          </h4>
          {desc && (
            <p
              style={{
                fontSize: 'var(--type-meta-size, 12px)',
                color: 'var(--c-text-secondary, var(--muted))',
                margin: '2px 0 0',
                fontWeight: 400,
                fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                lineHeight: 'var(--type-meta-lh, 16px)',
                letterSpacing: 'var(--type-meta-tracking, 0.2px)',
                opacity: 0.85,
              }}
            >
              {desc}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {valueText && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--studio-accent-from, #679cff)',
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              opacity: 0.85,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {valueText}
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              padding: '2px 8px',
              borderRadius: 'var(--radius-compact, 12px)',
              background: 'var(--c-border)',
              color: 'var(--c-text-primary, var(--text))',
              border: '1px solid var(--track, var(--c-border))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {badge}
          </span>
        )}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15, color: 'var(--c-text-secondary, var(--muted))', opacity: 0.6 }}
          >
            chevron_right
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export function SettingSection({
  title,
  children,
  className = '',
  style,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ gap: '8px', marginBottom: '16px', ...style }}
    >
      <span
        className="px-1"
        style={{
          fontSize: 'var(--type-section-size, 19px)',
          lineHeight: 'var(--type-section-lh, 24px)',
          fontWeight: 'var(--type-section-weight, 700)' as any,
          letterSpacing: 'var(--type-section-tracking, 0.6px)',
          color: 'var(--c-text-primary, var(--text))',
          fontFamily:
            'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
          paddingLeft: '4px',
        }}
      >
        {title}
      </span>
      <div
        style={{
          border: '1px solid var(--c-border, rgba(128, 128, 128, 0.12))',
          backgroundColor: 'var(--surface-card-bg, rgba(255, 255, 255, 0.03))',
          borderRadius: 'var(--radius-card, 16px)',
          overflow: 'hidden',
          position: 'relative',
          backdropFilter: 'var(--surface-topbar-blur, blur(20px) saturate(180%))',
          WebkitBackdropFilter: 'var(--surface-topbar-blur, blur(20px) saturate(180%))',
          boxShadow: 'var(--shadow-surface-raised, 0 8px 24px rgba(0, 0, 0, 0.16))',
        }}
      >
        {/* Top Specular Rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 12,
            right: 12,
            height: '1px',
            background: 'var(--surface-card-inset, rgba(255, 255, 255, 0.08))',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />
        {children}
      </div>
    </div>
  );
}
