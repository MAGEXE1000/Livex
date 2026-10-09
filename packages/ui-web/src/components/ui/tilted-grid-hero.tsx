import * as React from 'react';
import { cn } from '@workspace/livex-core';

export const SLICES = 16;
export const CAMERA = 1.6;
export const MAX_WIDTH = 55;

/**
 * Calculates arc depth ratio based on camera distance and angle in radians.
 */
export function arc(angle: number): number {
  return (CAMERA - 1 + Math.cos(angle)) / (2 * CAMERA * Math.sin(angle));
}

export interface TiltedGridMeasureResult {
  columns: number;
  sweep: number;
  unit: number;
  limit: number;
}

/**
 * Calculates dynamic column count, angular sweep, and perspective unit.
 */
export function measure(
  width: number,
  height: number,
  tileHeight: number,
  aspectRatio: number,
  gap: number,
  curveAngleRad: number
): TiltedGridMeasureResult {
  const q = Math.min((tileHeight / 100) * height, (MAX_WIDTH / 100) * (width / aspectRatio));
  const z = width * arc(curveAngleRad);
  if (!(q > 0) || !(z > 0)) {
    return { columns: 2, sweep: 0, unit: 0, limit: 0 };
  }
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const p = toDeg(q / z);
  const y = (aspectRatio + gap / 100) * p;
  const spread = toDeg(curveAngleRad) + (aspectRatio * p) / 2;
  const count = Math.min(60, Math.max(2, Math.ceil((2 * spread) / y)));
  const round = (val: number) => +val.toFixed(4);
  const sweep = round((count * y) / 2);
  return {
    columns: count,
    sweep,
    unit: round(p),
    limit: round(Math.min(sweep, spread)),
  };
}

export interface TiltedGridImage {
  src: string;
  alt?: string;
}

export interface TiltedGridHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  images: TiltedGridImage[];
  speed?: number;
  tileHeight?: number;
  aspectRatio?: number;
  gap?: number;
  axis?: number;
  curve?: number;
  fade?: number;
  children?: React.ReactNode;
  className?: string;
}

export function TiltedGridHero({
  images,
  speed = 4,
  tileHeight = 26,
  aspectRatio = 16 / 9,
  gap = 6,
  axis = 56,
  curve = 80,
  fade = 12,
  children,
  className,
  style,
  ...props
}: TiltedGridHeroProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const orbitKeyframe = `tgh-o-${id}`;
  const tileClass = `tgh-t-${id}`;
  const curveRad = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;
  const [dimensions, setDimensions] = React.useState<TiltedGridMeasureResult | null>(null);
  const [activeIndices, setActiveIndices] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const m = measure(width, height, tileHeight, aspectRatio, gap, curveRad);
      setDimensions((prev) =>
        prev?.columns === m.columns && prev.sweep === m.sweep && prev.unit === m.unit ? prev : m
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tileHeight, aspectRatio, gap, curveRad]);

  React.useEffect(() => {
    for (const img of images) {
      if (img.src) {
        const image = new Image();
        image.src = img.src;
      }
    }
  }, [images]);

  const { columns, sweep, unit, limit } =
    dimensions ?? measure(1200, 560, tileHeight, aspectRatio, gap, curveRad);

  const u = (val: number) =>
    `calc(${+val.toFixed(4)} * min(${tileHeight}cqh, ${+(MAX_WIDTH / aspectRatio).toFixed(4)}cqw))`;

  const radiusPercent = 100 * arc(curveRad);
  const radiusCqw = `${+radiusPercent.toFixed(3)}cqw`;

  const turn = (deg: number) =>
    `translateZ(${radiusCqw}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radiusCqw})`;

  const hidePercent = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);

  const keyframeCss = `@keyframes ${orbitKeyframe}{from{transform:${turn(
    -sweep
  )}}to{transform:${turn(
    sweep
  )}}0%,${hidePercent}%,${100 - hidePercent}%,100%{visibility:hidden}${hidePercent + 0.001}%,${
    100 - hidePercent - 0.001
  }%{visibility:visible}}@media(prefers-reduced-motion:reduce){.${tileClass}{animation-play-state:paused}}`;

  const sliceWidth = aspectRatio / SLICES;
  const duration = columns * speed;
  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${100 - fade}%,transparent)`;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ containerType: 'size', ...style }}
      {...props}
    >
      <style>{keyframeCss}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: dimensions ? 1 : 0,
          perspective: `${+(radiusPercent * CAMERA).toFixed(3)}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {Array.from({ length: columns }, (_, colIdx) => {
          const revIdx = columns - 1 - colIdx;
          const imgIndex = (activeIndices[colIdx] ?? revIdx) % Math.max(images.length, 1);
          const img = images[imgIndex];
          return (
            <div
              key={colIdx}
              className={cn(tileClass, 'absolute')}
              style={{
                left: `calc(50% - ${u(aspectRatio / 2)})`,
                top: `calc(${axis}% - ${u(0.5)})`,
                width: u(aspectRatio),
                height: u(1),
                transformStyle: 'preserve-3d',
                animation: `${orbitKeyframe} ${duration}s linear ${-colIdx * speed}s infinite`,
              }}
              onAnimationIteration={(e: React.AnimationEvent<HTMLDivElement>) => {
                const iter = Math.round(e.elapsedTime / duration);
                setActiveIndices((prev) => {
                  const nextImgIndex = iter * columns + revIdx;
                  return prev[colIdx] === nextImgIndex ? prev : { ...prev, [colIdx]: nextImgIndex };
                });
              }}
            >
              {Array.from({ length: SLICES }, (_, sliceIdx) => (
                <div
                  key={sliceIdx}
                  className={cn(
                    'absolute top-0 overflow-hidden bg-muted',
                    sliceIdx === 0 && 'rounded-l-lg',
                    sliceIdx === SLICES - 1 && 'rounded-r-lg'
                  )}
                  style={{
                    left: u((aspectRatio - sliceWidth) / 2),
                    width: sliceIdx === SLICES - 1 ? u(sliceWidth) : `calc(${u(sliceWidth)} + 1px)`,
                    height: u(1),
                    transform: turn((aspectRatio / 2 - (sliceIdx + 0.5) * sliceWidth) * unit),
                  }}
                >
                  {img && (
                    <img
                      src={img.src}
                      alt={sliceIdx === 0 ? img.alt ?? '' : ''}
                      draggable={false}
                      className="absolute top-0 max-w-none object-cover"
                      style={{
                        left: u(-sliceIdx * sliceWidth),
                        width: u(aspectRatio),
                        height: u(1),
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

export default TiltedGridHero;
