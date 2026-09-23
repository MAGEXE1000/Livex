import React, { useEffect, useRef } from 'react';
import { type AssistantState } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexThinkingOrbProps {
  size?: number;
  state?: AssistantState;
  className?: string;
  style?: React.CSSProperties;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  tilt: number;
  color: string;
}

export const LivexThinkingOrb: React.FC<LivexThinkingOrbProps> = ({
  size = 48,
  state = 'thinking',
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReduced = useAppReducedMotion();
  const isVisibleRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let startTime = performance.now();

    const dpr = window.devicePixelRatio || 1;
    const w = size * dpr;
    const h = size * dpr;
    const cx = w / 2;
    const cy = h / 2;

    // Generate orbital particles
    const particleCount = size < 36 ? 16 : 32;
    const particles: Particle[] = [];
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: (w * 0.18) + Math.random() * (w * 0.28),
        speed: (0.8 + Math.random() * 1.6) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.max(1, (w * 0.02) + Math.random() * (w * 0.035)),
        alpha: 0.35 + Math.random() * 0.65,
        tilt: (Math.random() - 0.5) * 0.8,
        color: colors[i % colors.length],
      });
    }

    const render = (now: number) => {
      if (!isVisibleRef.current) return;

      const elapsed = (now - startTime) / 1000;
      const currentState = stateRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();

      // Ambient Central Core Pulse
      const pulseSpeed = currentState === 'composing' ? 5 : 2.5;
      const pulseRadius = (w * 0.14) + Math.sin(elapsed * pulseSpeed) * (w * 0.03);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius * 2);

      if (currentState === 'searching') {
        coreGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        coreGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
        coreGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      } else {
        coreGrad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
        coreGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
        coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      }

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Render Orbital Concentric Rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringRadius = (w * 0.22) + r * (w * 0.12);
        const rot = elapsed * (r % 2 === 0 ? 0.6 : -0.5);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(1, 0.62 + r * 0.1);

        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.12 + r * 0.04})`;
        ctx.lineWidth = Math.max(1, w * 0.015);
        ctx.stroke();

        ctx.restore();
      }

      // Render Rotating Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed * 0.02;

        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);

        // Elliptical 3D tilt
        const px = cx + cos * p.radius;
        const py = cy + sin * p.radius * (0.55 + p.tilt * 0.3);

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = w * 0.05;
        ctx.globalAlpha = p.alpha * (0.6 + 0.4 * sin);
        ctx.fill();
      }

      ctx.restore();

      if (!prefersReduced) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !prefersReduced) {
          animFrameId = requestAnimationFrame(render);
        } else {
          cancelAnimationFrame(animFrameId);
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(canvas);

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'visible' && !prefersReduced) {
        animFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animFrameId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [size, prefersReduced]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  return (
    <div
      className={`livex-thinking-orb ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        width={size * dpr}
        height={size * dpr}
        style={{
          width: size,
          height: size,
          display: 'block',
        }}
      />
    </div>
  );
};

export default LivexThinkingOrb;
