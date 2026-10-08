import React from 'react';

export interface FluidBadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'live' | 'accent' | 'success';
  className?: string;
  pulse?: boolean;
}

export function FluidBadge({
  children,
  variant = 'neutral',
  className = '',
  pulse = false,
}: FluidBadgeProps) {
  const variantStyles = {
    neutral: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: 'var(--landing-text-secondary, #a1a1aa)',
      dot: 'rgba(255, 255, 255, 0.7)',
    },
    live: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.25)',
      text: '#f87171',
      dot: '#ef4444',
    },
    accent: {
      bg: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.25)',
      text: '#38bdf8',
      dot: '#38bdf8',
    },
    success: {
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.25)',
      text: '#4ade80',
      dot: '#22c55e',
    },
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide select-none ${className}`}
      style={{
        backgroundColor: variantStyles.bg,
        border: `1px solid ${variantStyles.border}`,
        color: variantStyles.text,
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: variantStyles.dot }}
      />
      <span>{children}</span>
    </span>
  );
}

export default FluidBadge;
