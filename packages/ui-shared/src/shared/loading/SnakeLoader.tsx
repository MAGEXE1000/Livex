import React from 'react';
import { Snake } from '../../components/motion/loader';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

export interface SnakeLoaderProps {
  size?: number;
  speed?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SnakeLoader — Standalone canonical loading.dev Snake loader.
 */
export default function SnakeLoader({
  size = 24,
  speed = 1,
  strokeWidth = 2.5,
  color,
  className = '',
  style,
}: SnakeLoaderProps) {
  const reduce = useAppReducedMotion();
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
      <Snake
        size={size}
        speed={speed}
        reduce={reduce}
        strokeWidth={strokeWidth}
      />
    </span>
  );
}

export { SnakeLoader, SnakeLoader as LivexSnakeLoader };
