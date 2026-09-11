import React from 'react';

export interface ProgressiveBlurProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'top' | 'right' | 'bottom' | 'left';
  blurLayers?: number;
  maxBlur?: number;
}

export const ProgressiveBlur = React.forwardRef<HTMLDivElement, ProgressiveBlurProps>(
  ({ direction = 'top', blurLayers = 2, maxBlur = 12, style, className = '', ...props }, ref) => {
    // Map directions to css linear-gradient direction strings
    const gradientDir =
      {
        top: 'to bottom',
        bottom: 'to top',
        left: 'to right',
        right: 'to left',
      }[direction] || 'to bottom';

    // Read performance preferences to automatically scale quality if needed
    // In low-performance/low-spec environments we reduce the layer count to prevent GPU lag
    let activeLayers = Math.min(3, Math.max(1, blurLayers));
    if (typeof window !== 'undefined') {
      const isLowPower =
        localStorage.getItem('studio_performance_mode') === 'low' ||
        localStorage.getItem('studio_reduced_motion') === 'true';
      if (isLowPower) {
        activeLayers = 1;
      }
    }

    const layers = Array.from({ length: activeLayers });

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          ...style,
        }}
        className={`progressive-blur-container ${className}`}
        {...props}
      >
        {layers.map((_, index) => {
          const blurAmount = ((index + 1) / activeLayers) * maxBlur;
          const stopPosition = ((index + 1) / activeLayers) * 100;

          // linear-gradient with Webkit vendor prefix compatibility
          const gradient = `linear-gradient(${gradientDir}, black 0%, transparent ${stopPosition}%)`;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                backdropFilter: `blur(${blurAmount}px)`,
                WebkitBackdropFilter: `blur(${blurAmount}px)`,
                maskImage: gradient,
                WebkitMaskImage: gradient,
                pointerEvents: 'none',
              }}
            />
          );
        })}
      </div>
    );
  }
);

ProgressiveBlur.displayName = 'ProgressiveBlur';
