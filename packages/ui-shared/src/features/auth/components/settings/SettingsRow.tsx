import React from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';
import { useHoverCapable } from '../../../../lib/hooks/use-hover-capable';

export function SettingsRow({
  icon,
  label,
  badge,
  onPress,
  last = false,
}: {

  icon: string;
  label: string;
  badge?: string;
  onPress: (e: React.MouseEvent<HTMLButtonElement>) => void;
  last?: boolean;
}) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={prefersReduced ? undefined : { scale: 0.985 }}
      whileHover={canHover && !prefersReduced ? { scale: 1.006 } : undefined}
      transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
      className="outline-none hover:bg-white/5 transition-colors"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        minHeight: 58,
        padding: '16px 18px',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        borderBottom: last ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        textAlign: 'left' as const,
        boxSizing: 'border-box' as const,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--c-text-primary)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, color: 'var(--c-text-primary)', opacity: 0.85 }}
        >
          {icon}
        </span>
      </div>
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--studio-font-body)',
          fontWeight: 750,
          fontSize: 15.5,
          letterSpacing: '-0.015em',
          color: 'var(--c-text-primary)',
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          style={{
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 800,
            fontSize: 11,
            color: 'var(--c-text-secondary)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: 8,
            padding: '3px 9px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          {badge}
        </span>
      )}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color: 'var(--c-text-secondary)', opacity: 0.6, flexShrink: 0 }}
        >
          chevron_right
        </span>
      </div>
    </motion.button>
  );
}
