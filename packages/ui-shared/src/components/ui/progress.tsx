import React from 'react';
import { motion } from 'motion/react';

export interface CossProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  accentFrom?: string;
  accentTo?: string;
  height?: number;
  className?: string;
}

/**
 * COSS Progress Component
 *
 * Implements the official COSS UI Progress specification:
 * - Root container with accessible ARIA progressbar attributes.
 * - Header row with single label on left and exact percentage aligned to far right.
 * - Track and Indicator fill with smooth spring motion transitions.
 * - Zero duplicated status text or fake progress interpolation.
 */
export function CossProgress({
  value = 0,
  max = 100,
  label = 'Downloading update',
  showPercentage = true,
  accentFrom = 'var(--c-accent-from, #ffffff)',
  accentTo = 'var(--c-accent-to, #f4f4f5)',
  height = 8,
  className = '',
  style,
  ...props
}: CossProgressProps) {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={percentage}
      aria-label={label}
      className={`w-full flex flex-col gap-2 ${className}`}
      style={style}
      {...props}
    >
      {/* Header Row: Label on Left, Percentage Aligned Far Right */}
      <div className="flex items-center justify-between text-xs font-semibold select-none font-sans" style={{ color: 'var(--c-text-primary)' }}>
        <span className="text-xs font-semibold tracking-tight">{label}</span>
        {showPercentage && (
          <span className="text-xs font-bold font-mono text-right" style={{ color: 'var(--c-text-secondary)' }}>
            {percentage}%
          </span>
        )}
      </div>

      {/* Progress Track & Indicator */}
      <div
        className="w-full overflow-hidden rounded-full relative"
        style={{
          height: `${height}px`,
          background: 'var(--c-surface-high, rgba(128, 128, 128, 0.15))',
          border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          style={{
            background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
            boxShadow: `0 0 12px ${accentFrom}`,
          }}
        />
      </div>
    </div>
  );
}

export default CossProgress;
