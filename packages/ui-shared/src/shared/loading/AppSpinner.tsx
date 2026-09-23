import React from 'react';
import { Loader } from '../../components/motion/loader';

export interface AppSpinnerProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  outerSize?: string;
  childSize?: string;
  colorFrom?: string;
  colorTo?: string;
  speed?: number;
  label?: string;
  style?: React.CSSProperties;
}

/**
 * AppSpinner — Canonical loading.dev Snake loader for Livex.
 */
export default function AppSpinner({
  size = 20,
  color,
  strokeWidth,
  className,
  speed = 1,
  label = 'Loading...',
  style,
}: AppSpinnerProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color ?? 'inherit',
        ...style,
      }}
    >
      <Loader
        variant="snake"
        size={size}
        speed={speed}
        strokeWidth={strokeWidth}
        label={label}
      />
    </span>
  );
}
