import React from 'react';
import CossProgress from '../../components/ui/progress';

export interface StudioProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  accentFrom?: string;
  accentTo?: string;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StudioProgressBar — Official COSS Progress Component Wrapper
 *
 * Implements COSS UI Progress specification across Studio:
 * - Real download progress & value representation.
 * - Header row with label on left and percentage on far right.
 * - Accessible ARIA attributes (`role="progressbar"`).
 * - Theme & spring motion support.
 */
export function StudioProgressBar({
  value = 0,
  max = 100,
  label = 'Downloading update',
  showPercentage = true,
  accentFrom,
  accentTo,
  height = 8,
  className = '',
  style,
}: StudioProgressBarProps) {
  return (
    <CossProgress
      value={value}
      max={max}
      label={label}
      showPercentage={showPercentage}
      accentFrom={accentFrom}
      accentTo={accentTo}
      height={height}
      className={className}
      style={style}
    />
  );
}

export default StudioProgressBar;
