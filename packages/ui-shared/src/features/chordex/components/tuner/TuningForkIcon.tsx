import React from 'react';

export interface TuningForkIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
  waves?: boolean;
}

export const TuningForkIcon = React.forwardRef<SVGSVGElement, TuningForkIconProps>(
  (
    {
      size = 20,
      color,
      className = '',
      waves = false,
      strokeWidth = 2,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        style={{ color: color || undefined, ...style }}
        {...props}
      >
        {/* Tuning fork tines and U-junction */}
        <path d="M8 3.5v7.5a4 4 0 0 0 8 0V3.5" />
        {/* Handle stem */}
        <path d="M12 15v6" />
        {/* Handle bottom accent / base */}
        <path d="M10 21h4" />
        {/* Optional acoustic resonance waves */}
        {waves && (
          <>
            <path d="M4.5 5.5a5.5 5.5 0 0 0 0 4" opacity="0.6" strokeWidth="1.5" />
            <path d="M19.5 5.5a5.5 5.5 0 0 1 0 4" opacity="0.6" strokeWidth="1.5" />
          </>
        )}
      </svg>
    );
  }
);

TuningForkIcon.displayName = 'TuningForkIcon';

