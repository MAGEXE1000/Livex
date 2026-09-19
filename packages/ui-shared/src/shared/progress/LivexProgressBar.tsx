import React from 'react';
import CossProgress from '../../components/ui/progress';

export interface LivexProgressBarProps {
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

export type StudioProgressBarProps = LivexProgressBarProps;

/**
 * LivexProgressBar — Official COSS Progress Component Wrapper
 *
 * Implements COSS UI Progress specification across Livex:
 * - Real download progress & value representation.
 * - Header row with label on left and percentage on far right.
 * - Accessible ARIA attributes (`role="progressbar"`).
 * - Theme & spring motion support.
 */
export function LivexProgressBar({
  value = 0,
  max = 100,
  label = 'Downloading update',
  showPercentage = true,
  accentFrom,
  accentTo,
  height = 8,
  className = '',
  style,
}: LivexProgressBarProps) {
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

export const StudioProgressBar = LivexProgressBar;
export default LivexProgressBar;
