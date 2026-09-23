import React, { useEffect, useRef } from 'react';
import { type AssistantState } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexAssistantMascotProps {
  size?: number;
  mode?: 'dock' | 'chat';
  state?: AssistantState;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LivexAssistantMascot: React.FC<LivexAssistantMascotProps> = ({
  size = 28,
  mode = 'dock',
  state = 'idle',
  interactive = false,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useAppReducedMotion();

  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const isVisibleRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animFrameId: number;
    let startTime = performance.now();
    let lastBlinkTime = performance.now();
    let isBlinking = false;
    let blinkDuration = 160;

    // Gaze position smoothing
    let currentGazeX = 0;
    let currentGazeY = 0;

    // Rhythmic mouth scale for responding state
    let mouthPhase = 0;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const render = (now: number) => {
      if (!isVisibleRef.current) return;

      const elapsed = (now - startTime) / 1000;
      const currentState = stateRef.current;

      // Handle blink timing
      if (now - lastBlinkTime > 4200 && currentState !== 'sleeping' && currentState !== 'success') {
        isBlinking = true;
        lastBlinkTime = now;
      }
      if (isBlinking && now - lastBlinkTime > blinkDuration) {
        isBlinking = false;
        lastBlinkTime = now + Math.random() * 2000;
      }

      // Handle Gaze target based on state
      let targetGazeX = 0;
      let targetGazeY = 0;

      switch (currentState) {
        case 'thinking':
          targetGazeX = 0.35;
          targetGazeY = -0.55; // Look up-right contemplatively
          break;
        case 'searching':
          targetGazeX = Math.sin(elapsed * 5.0) * 0.7; // Sweep eyes left to right
          targetGazeY = 0;
          break;
        case 'listening':
          targetGazeX = 0;
          targetGazeY = 0.2; // Focus attentively slightly down/forward
          break;
        case 'composing':
          targetGazeX = Math.sin(elapsed * 2.5) * 0.3;
          targetGazeY = Math.cos(elapsed * 2.5) * 0.2;
          break;
        case 'error':
          targetGazeX = 0;
          targetGazeY = 0.45; // Look down apologetically
          break;
        default:
          if (interactive) {
            targetGazeX = (mousePosRef.current.x - 0.5) * 1.2;
            targetGazeY = (mousePosRef.current.y - 0.5) * 1.2;
          } else {
            // Gentle wandering gaze
            targetGazeX = Math.sin(elapsed * 0.6) * 0.2;
            targetGazeY = Math.cos(elapsed * 0.4) * 0.15;
          }
          break;
      }

      // Smooth interpolation
      currentGazeX += (targetGazeX - currentGazeX) * 0.12;
      currentGazeY += (targetGazeY - currentGazeY) * 0.12;

      // Bobbing / breathing
      let bobY = 0;
      if (currentState === 'sleeping') {
        bobY = Math.sin(elapsed * 1.2) * (size * 0.02);
      } else if (currentState === 'composing') {
        bobY = Math.abs(Math.sin(elapsed * 6.0)) * -(size * 0.05); // Musical head nodding
      } else if (!prefersReduced) {
        bobY = Math.sin(elapsed * 2.0) * (size * 0.025);
      }

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const w = size * dpr;
      const h = size * dpr;
      const cx = w / 2;
      const cy = h / 2 + bobY * dpr;

      ctx.save();

      // 1. Bot Head Base Dimensions
      const headRadius = w * 0.38;
      const cornerRadius = mode === 'dock' ? w * 0.26 : w * 0.28;

      // 2. Head Ambient Drop Shadow / Glow
      if (mode === 'chat') {
        ctx.shadowColor = currentState === 'error'
          ? 'rgba(239, 68, 68, 0.4)'
          : currentState === 'thinking' || currentState === 'composing'
            ? 'rgba(147, 51, 234, 0.35)'
            : 'rgba(56, 189, 248, 0.25)';
        ctx.shadowBlur = w * 0.12;
        ctx.shadowOffsetY = h * 0.05;
      }

      // 3. Extruded Body / Head (Glossy Lit Capsule)
      const headLeft = cx - headRadius;
      const headTop = cy - headRadius * 0.92;
      const headWidth = headRadius * 2;
      const headHeight = headRadius * 1.84;

      ctx.beginPath();
      ctx.roundRect(headLeft, headTop, headWidth, headHeight, cornerRadius);

      // Lit Extrusion Gradient
      const bodyGrad = ctx.createLinearGradient(headLeft, headTop, headLeft, headTop + headHeight);
      if (currentState === 'error') {
        bodyGrad.addColorStop(0, '#f87171');
        bodyGrad.addColorStop(0.5, '#dc2626');
        bodyGrad.addColorStop(1, '#991b1b');
      } else if (currentState === 'thinking' || currentState === 'composing') {
        bodyGrad.addColorStop(0, '#c084fc');
        bodyGrad.addColorStop(0.4, '#8b5cf6');
        bodyGrad.addColorStop(1, '#4c1d95');
      } else {
        // Canonical Livex Cyan-Indigo Gloss
        bodyGrad.addColorStop(0, '#38bdf8');
        bodyGrad.addColorStop(0.35, '#2563eb');
        bodyGrad.addColorStop(0.85, '#1e1b4b');
        bodyGrad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Head Stroke / Edge Specular
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = Math.max(1, w * 0.035);
      const strokeGrad = ctx.createLinearGradient(cx, headTop, cx, headTop + headHeight);
      strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      strokeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      strokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.strokeStyle = strokeGrad;
      ctx.stroke();

      // 4. Specular Top Highlight (Optical Glass Reflection)
      ctx.beginPath();
      ctx.ellipse(cx, headTop + headRadius * 0.28, headRadius * 0.65, headRadius * 0.16, 0, 0, Math.PI * 2);
      const specGrad = ctx.createRadialGradient(
        cx,
        headTop + headRadius * 0.28,
        0,
        cx,
        headTop + headRadius * 0.28,
        headRadius * 0.65
      );
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      specGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.12)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.fill();

      // 5. Visor / Face Screen Plate
      const visorWidth = headWidth * 0.78;
      const visorHeight = headHeight * 0.52;
      const visorLeft = cx - visorWidth / 2;
      const visorTop = cy - visorHeight / 2 - headRadius * 0.06;

      ctx.beginPath();
      ctx.roundRect(visorLeft, visorTop, visorWidth, visorHeight, visorHeight * 0.45);
      ctx.fillStyle = 'rgba(7, 10, 19, 0.94)';
      ctx.fill();
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // 6. Expressive Eyes
      const eyeSpacing = visorWidth * 0.26;
      const eyeBaseY = visorTop + visorHeight * 0.46;
      const eyeRadiusX = visorWidth * 0.11;
      let eyeRadiusY = visorHeight * 0.24;

      const leftEyeX = cx - eyeSpacing + currentGazeX * (visorWidth * 0.08);
      const rightEyeX = cx + eyeSpacing + currentGazeX * (visorWidth * 0.08);
      const eyeY = eyeBaseY + currentGazeY * (visorHeight * 0.12);

      // Eye Color based on State
      let eyeColor = '#38bdf8';
      let eyeGlow = 'rgba(56, 189, 248, 0.8)';
      if (currentState === 'error') {
        eyeColor = '#f87171';
        eyeGlow = 'rgba(248, 113, 113, 0.9)';
      } else if (currentState === 'thinking' || currentState === 'composing') {
        eyeColor = '#c084fc';
        eyeGlow = 'rgba(192, 132, 252, 0.9)';
      } else if (currentState === 'success') {
        eyeColor = '#4ade80';
        eyeGlow = 'rgba(74, 222, 128, 0.9)';
      }

      ctx.shadowColor = eyeGlow;
      ctx.shadowBlur = w * 0.08;

      if (isBlinking || currentState === 'sleeping') {
        // Closed Eyes (Serene horizontal slit / arc)
        ctx.strokeStyle = eyeColor;
        ctx.lineWidth = Math.max(1.5, w * 0.04);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(leftEyeX - eyeRadiusX, eyeY);
        ctx.lineTo(leftEyeX + eyeRadiusX, eyeY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightEyeX - eyeRadiusX, eyeY);
        ctx.lineTo(rightEyeX + eyeRadiusX, eyeY);
        ctx.stroke();
      } else if (currentState === 'success') {
        // Happy squinting crescent eyes (^ ^)
        ctx.strokeStyle = eyeColor;
        ctx.lineWidth = Math.max(1.8, w * 0.045);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY + eyeRadiusY * 0.3, eyeRadiusX, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rightEyeX, eyeY + eyeRadiusY * 0.3, eyeRadiusX, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else {
        // Open Living Eyes
        ctx.fillStyle = eyeColor;

        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye Pupil Specular Dot
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        const specOffset = eyeRadiusX * 0.3;

        ctx.beginPath();
        ctx.arc(leftEyeX - specOffset, eyeY - specOffset, eyeRadiusX * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX - specOffset, eyeY - specOffset, eyeRadiusX * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Dynamic Mouth / Speaker Bar
      ctx.shadowColor = 'transparent';
      const mouthY = visorTop + visorHeight * 0.80;

      if (currentState === 'responding') {
        mouthPhase += 0.28;
        const mouthW = visorWidth * 0.22 + Math.sin(mouthPhase) * (visorWidth * 0.08);
        const mouthH = Math.max(1.5, visorHeight * 0.08 + Math.abs(Math.cos(mouthPhase)) * (visorHeight * 0.06));

        ctx.beginPath();
        ctx.roundRect(cx - mouthW / 2, mouthY - mouthH / 2, mouthW, mouthH, 999);
        ctx.fillStyle = eyeColor;
        ctx.fill();
      } else if (mode === 'chat') {
        // Subtle micro-smile slot
        const mouthW = visorWidth * 0.16;
        ctx.beginPath();
        ctx.roundRect(cx - mouthW / 2, mouthY - 1, mouthW, 2, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
      }

      // 8. Ear Transducers / Glowing Side Pods
      const podW = headRadius * 0.24;
      const podH = headRadius * 0.58;
      const leftPodX = headLeft - podW * 0.65;
      const rightPodX = headLeft + headWidth - podW * 0.35;
      const podY = cy - podH / 2;

      ctx.beginPath();
      ctx.roundRect(leftPodX, podY, podW, podH, podW * 0.5);
      ctx.roundRect(rightPodX, podY, podW, podH, podW * 0.5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.strokeStyle = strokeGrad;
      ctx.stroke();

      // Side Pod Color Accent Rings
      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeGlow;
      ctx.shadowBlur = w * 0.06;
      ctx.beginPath();
      ctx.arc(leftPodX + podW * 0.45, cy, podW * 0.25, 0, Math.PI * 2);
      ctx.arc(rightPodX + podW * 0.55, cy, podW * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // If reduced motion is active, do not schedule continuous frames
      if (!prefersReduced) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    // IntersectionObserver to suspend rAF loop when offscreen
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

    if (canvas) {
      observer.observe(canvas);
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'visible' && !prefersReduced) {
        animFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animFrameId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial render call
    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [size, mode, prefersReduced, interactive]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      mousePosRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    }
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    mousePosRef.current = { x: 0.5, y: 0.5 };
  };

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`livex-assistant-mascot ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        pointerEvents: interactive ? 'auto' : 'none',
        ...style,
      }}
      aria-label={`Livex Assistant Mascot (${state})`}
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

export default LivexAssistantMascot;
