import React, { useEffect, useState } from 'react';

interface StudioUpdateAuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  showRadialGradient?: boolean;
  accentFrom: string;
  accentTo: string;
}

export default function StudioUpdateAuroraBackground({
  className,
  children,
  showRadialGradient = true,
  accentFrom,
  accentTo,
  ...props
}: StudioUpdateAuroraBackgroundProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Soft purple-blue neutral fallbacks for the aurora color bands
  const c1 = accentFrom || '#3b82f6';
  const c2 = accentTo || '#8b5cf6';
  const c3 = 'var(--app-surface-high, rgba(128,128,128,0.14))';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        background: 'var(--app-bg, #0a0a0a)',
        ...props.style,
      }}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Colorful aurora layer */}
        <div
          style={{
            position: 'absolute',
            inset: '-20%',
            backgroundImage: `repeating-linear-gradient(100deg, ${c1} 0%, ${c2} 10%, ${c3} 20%, ${c1} 30%, ${c2} 40%)`,
            backgroundSize: '200% 200%',
            opacity: 0.42,
            filter: 'blur(60px) saturate(1.5)',
            willChange: 'transform',
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            animation: reducedMotion ? 'none' : 'studio-aurora 36s ease-in-out infinite',
          }}
        />

        {/* Ambient depth overlay — radial mask blending edges into surface background */}
        {showRadialGradient && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 50% 40%, transparent 25%, var(--app-bg, #0a0a0c) 80%)',
            }}
          />
        )}
      </div>

      {/* Local keyframe animations for robust standalone compilation */}
      <style>{`
        @keyframes studio-aurora {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(20px, -15px) scale(1.08) rotate(3deg);
          }
          66% {
            transform: translate(-15px, 20px) scale(0.92) rotate(-3deg);
          }
          100% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
          }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
