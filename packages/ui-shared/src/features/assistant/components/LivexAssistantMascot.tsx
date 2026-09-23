import React, { useEffect, useRef, useCallback } from 'react';
import { type AssistantState } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexAssistantMascotProps {
  size?: number;
  mode?: 'dock' | 'chat';
  state?: AssistantState;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

/**
 * LivexAssistantMascot
 *
 * Sleek, futuristic cyber-bot mascot inspired by Kimi AI and Grok.
 * Features an obsidian capsule head, dark glass OLED visor, expressive luminous eyes,
 * and a rich physics/animation suite:
 * - Idle hover & breathing with ground shadow
 * - Autonomous gaze wander & pointer/touch gaze tracking
 * - Realistic randomized blinking & human-like double blinks
 * - Contemplative thinking with head tilt & thought wave
 * - Horizontal radar scanner sweep during searching
 * - Attentive eye-widening and acoustic ripples during listening
 * - Dynamic audio equalizer speech waveform & rhythmic head nods when responding
 * - Interactive tap/click delight with spring hop, playful wink, and sparkle starburst
 * - Offscreen/background pause via IntersectionObserver & visibilitychange (0% idle battery waste)
 */
export const LivexAssistantMascot: React.FC<LivexAssistantMascotProps> = ({
  size = 32,
  mode = 'dock',
  state = 'idle',
  interactive = false,
  className = '',
  style = {},
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useAppReducedMotion();

  const stateRef = useRef(state);
  stateRef.current = state;

  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const isHoveredRef = useRef(false);
  const isVisibleRef = useRef(true);

  // Tap animation & sparkle bursts
  const tapStartTimeRef = useRef(0);
  const sparklesRef = useRef<SparkleParticle[]>([]);

  const triggerTapReaction = useCallback(() => {
    tapStartTimeRef.current = performance.now();
    // Generate sparkle burst
    const colors = ['#38bdf8', '#c084fc', '#4ade80', '#ffffff'];
    const newSparkles: SparkleParticle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.2 + Math.random() * 1.8;
      newSparkles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 1.5 + Math.random() * 2,
        color: colors[i % colors.length],
      });
    }
    sparklesRef.current = newSparkles;
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      triggerTapReaction();
    }
    onClick?.();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let startTime = performance.now();

    // Autonomous gaze & blink state
    let gazeX = 0;
    let gazeY = 0;
    let targetGazeX = 0;
    let targetGazeY = 0;
    let nextGazeShiftTime = performance.now() + 2000;

    let isBlinking = false;
    let blinkProgress = 0;
    let blinkStartTime = 0;
    let nextBlinkTime = performance.now() + 2500 + Math.random() * 2000;

    const render = (now: number) => {
      if (!isVisibleRef.current) return;

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = size * dpr;
      const h = size * dpr;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      const currentState = stateRef.current;
      const t = (now - startTime) / 1000;

      // 1. Interactive Tap Animation State
      const tapElapsed = now - tapStartTimeRef.current;
      const isTapping = tapElapsed > 0 && tapElapsed < 750;
      let tapProgress = isTapping ? tapElapsed / 750 : 0;
      let hopY = 0;
      let tiltAngle = 0;
      let isWinking = false;

      if (isTapping && !prefersReduced) {
        // Playful spring hop & slight rotation
        hopY = -Math.sin(tapProgress * Math.PI) * (h * 0.16);
        tiltAngle = Math.sin(tapProgress * Math.PI * 2) * 0.12;
        isWinking = tapProgress > 0.15 && tapProgress < 0.75;
      }

      // 2. Idle Float / Nod Animation
      let floatY = 0;
      if (!prefersReduced && !isTapping) {
        if (currentState === 'responding') {
          // Speaking nod rhythm
          floatY = Math.sin(t * 8.5) * (h * 0.025);
        } else if (currentState === 'thinking') {
          // Contemplative tilt & slower float
          floatY = Math.sin(t * 1.8) * (h * 0.02);
          tiltAngle = Math.sin(t * 1.5) * 0.05;
        } else if (currentState === 'listening') {
          // Gentle rhythmic breath
          floatY = Math.sin(t * 2.8) * (h * 0.03);
        } else if (currentState === 'success') {
          // Joyful double bounce
          floatY = -Math.abs(Math.sin(t * 5.0)) * (h * 0.08);
        } else {
          // Natural idle float
          floatY = Math.sin(t * 2.2) * (h * 0.035);
        }
      }

      // 3. Autonomous & Pointer Gaze Logic
      if (isHoveredRef.current && interactive) {
        targetGazeX = (mousePosRef.current.x - 0.5) * 2;
        targetGazeY = (mousePosRef.current.y - 0.5) * 2;
      } else {
        if (currentState === 'thinking') {
          // Contemplative upward gaze
          targetGazeX = 0.25;
          targetGazeY = -0.55;
        } else if (currentState === 'searching') {
          // Horizontal scanning gaze
          targetGazeX = Math.sin(t * 5.5) * 0.75;
          targetGazeY = 0;
        } else if (now > nextGazeShiftTime) {
          // Autonomous glances
          const glances = [-0.4, 0, 0.4];
          targetGazeX = glances[Math.floor(Math.random() * glances.length)];
          targetGazeY = (Math.random() - 0.5) * 0.3;
          nextGazeShiftTime = now + 2500 + Math.random() * 3000;
        }
      }

      // Smooth gaze interpolation
      gazeX += (targetGazeX - gazeX) * 0.12;
      gazeY += (targetGazeY - gazeY) * 0.12;

      // 4. Natural Blinking Logic
      if (!prefersReduced && now > nextBlinkTime && !isBlinking && !isWinking) {
        isBlinking = true;
        blinkStartTime = now;
      }

      if (isBlinking) {
        const blinkElapsed = now - blinkStartTime;
        const blinkDuration = 130;
        if (blinkElapsed < blinkDuration) {
          blinkProgress = Math.sin((blinkElapsed / blinkDuration) * Math.PI);
        } else {
          isBlinking = false;
          blinkProgress = 0;
          // 25% chance of realistic human double-blink
          const isDoubleBlink = Math.random() < 0.25;
          nextBlinkTime = now + (isDoubleBlink ? 200 : 3000 + Math.random() * 2500);
        }
      }

      const cx = w * 0.5;
      const cy = h * 0.48 + floatY + hopY;

      // 5. Soft Dynamic Ground Shadow
      const shadowW = w * 0.42 * (1 - (floatY + hopY) / (h * 0.8));
      const shadowH = h * 0.08;
      const shadowY = h * 0.86;
      const shadowGrad = ctx.createRadialGradient(cx, shadowY, 0, cx, shadowY, shadowW * 0.5);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.12)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, shadowY, shadowW * 0.5, shadowH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Setup head transform
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tiltAngle);
      ctx.translate(-cx, -cy);

      // Geometry coordinates
      const headW = w * 0.72;
      const headH = h * 0.62;
      const headR = headH * 0.45;
      const headX = cx - headW * 0.5;
      const headY = cy - headH * 0.5;

      // 6. Ear Acoustic Pods / Side Transducers
      const podW = w * 0.08;
      const podH = headH * 0.48;
      const podR = podW * 0.5;
      const leftPodX = headX - podW * 0.6;
      const rightPodX = headX + headW - podW * 0.4;
      const podY = cy - podH * 0.5;

      // Ear pod fills
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(leftPodX, podY, podW, podH, podR);
      ctx.roundRect(rightPodX, podY, podW, podH, podR);
      ctx.fill();

      // Ear pod borders
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = Math.max(1, w * 0.015);
      ctx.stroke();

      // Ear pod indicator dots
      let accentColor = '#38bdf8';
      let accentGlow = 'rgba(56, 189, 248, 0.7)';
      if (currentState === 'thinking' || currentState === 'composing') {
        accentColor = '#c084fc';
        accentGlow = 'rgba(192, 132, 252, 0.8)';
      } else if (currentState === 'listening') {
        accentColor = '#06b6d4';
        accentGlow = 'rgba(6, 182, 212, 0.8)';
      } else if (currentState === 'success') {
        accentColor = '#4ade80';
        accentGlow = 'rgba(74, 222, 128, 0.8)';
      } else if (currentState === 'error') {
        accentColor = '#f87171';
        accentGlow = 'rgba(248, 113, 113, 0.8)';
      }

      ctx.save();
      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = w * 0.08;
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(leftPodX + podW * 0.4, cy, Math.max(1.2, w * 0.022), 0, Math.PI * 2);
      ctx.arc(rightPodX + podW * 0.6, cy, Math.max(1.2, w * 0.022), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Obsidian Head Chassis
      const chassisGrad = ctx.createLinearGradient(headX, headY, headX, headY + headH);
      chassisGrad.addColorStop(0, '#1e293b');
      chassisGrad.addColorStop(0.5, '#0f172a');
      chassisGrad.addColorStop(1, '#090d16');

      ctx.beginPath();
      ctx.roundRect(headX, headY, headW, headH, headR);
      ctx.fillStyle = chassisGrad;
      ctx.fill();

      // Metallic Rim Highlight
      const rimGrad = ctx.createLinearGradient(headX, headY, headX, headY + headH);
      rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      rimGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.12)');
      rimGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.03)');
      rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.stroke();

      // Top Specular Sheen (Gloss)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(headX, headY, headW, headH, headR);
      ctx.clip();

      const glossGrad = ctx.createRadialGradient(
        cx,
        headY + headH * 0.15,
        0,
        cx,
        headY + headH * 0.2,
        headW * 0.5
      );
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.ellipse(cx, headY + headH * 0.18, headW * 0.45, headH * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 8. OLED Visor Glass Screen
      const visorW = headW * 0.80;
      const visorH = headH * 0.60;
      const visorR = visorH * 0.45;
      const visorX = cx - visorW * 0.5;
      const visorY = cy - visorH * 0.5 + headH * 0.02;

      ctx.beginPath();
      ctx.roundRect(visorX, visorY, visorW, visorH, visorR);
      ctx.fillStyle = 'rgba(6, 10, 18, 0.96)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = Math.max(1, w * 0.015);
      ctx.stroke();

      // Visor Inner Clip for Screen Effects & Eyes
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(visorX, visorY, visorW, visorH, visorR);
      ctx.clip();

      // 9. Visor Background Dynamics
      if (currentState === 'searching') {
        // Laser radar scan sweep line
        const scanX = visorX + visorW * (0.5 + Math.sin(t * 6.0) * 0.48);
        const scanGrad = ctx.createLinearGradient(scanX - 6, visorY, scanX + 6, visorY);
        scanGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        scanGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
        scanGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(scanX - 6, visorY, 12, visorH);
      } else if (currentState === 'thinking' || currentState === 'composing') {
        // Expanding circular thought wave
        const waveR = ((t * 22) % (visorW * 0.6));
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, visorY + visorH * 0.45, waveR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentState === 'listening') {
        // Acoustic concentric pulse rings
        const ring1 = ((t * 18) % (visorW * 0.55));
        const ring2 = (((t + 0.3) * 18) % (visorW * 0.55));
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, visorY + visorH * 0.5, ring1, 0, Math.PI * 2);
        ctx.arc(cx, visorY + visorH * 0.5, ring2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 10. Expressive Glowing Eyes
      const eyeSpacing = visorW * 0.26;
      const eyeBaseY = visorY + visorH * 0.44;
      const leftEyeX = cx - eyeSpacing + gazeX * (visorW * 0.08);
      const rightEyeX = cx + eyeSpacing + gazeX * (visorW * 0.08);
      const eyeY = eyeBaseY + gazeY * (visorH * 0.12);

      const eyeRadiusX = visorW * 0.11;
      let eyeRadiusY = visorH * 0.25;

      if (currentState === 'listening') {
        eyeRadiusY *= 1.15; // Widen attentively
      }

      ctx.save();
      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = w * 0.09;

      const isHappyCrescent = currentState === 'success';
      const isClosed = blinkProgress > 0.6 || currentState === 'sleeping';

      if (isHappyCrescent) {
        // Joyful crescent eyes (^ ^)
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(1.8, w * 0.045);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY + eyeRadiusY * 0.3, eyeRadiusX, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rightEyeX, eyeY + eyeRadiusY * 0.3, eyeRadiusX, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (isWinking) {
        // Playful Wink (^ ˘): Left eye happy crescent, right eye wink slit
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(1.8, w * 0.045);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY + eyeRadiusY * 0.3, eyeRadiusX, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightEyeX - eyeRadiusX, eyeY);
        ctx.lineTo(rightEyeX + eyeRadiusX, eyeY);
        ctx.stroke();
      } else if (isClosed) {
        // Closed / Blinking slit
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(1.6, w * 0.04);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(leftEyeX - eyeRadiusX, eyeY);
        ctx.lineTo(leftEyeX + eyeRadiusX, eyeY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightEyeX - eyeRadiusX, eyeY);
        ctx.lineTo(rightEyeX + eyeRadiusX, eyeY);
        ctx.stroke();
      } else {
        // Open Luminous OLED Eyes (capsule/ellipse)
        const currentEyeHeight = eyeRadiusY * (1 - blinkProgress * 0.9);
        ctx.fillStyle = accentColor;

        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, eyeRadiusX, currentEyeHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, eyeRadiusX, currentEyeHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye Pupil Specular Glint
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        const specOffset = eyeRadiusX * 0.32;
        const specR = Math.max(0.8, eyeRadiusX * 0.32);

        ctx.beginPath();
        ctx.arc(leftEyeX - specOffset, eyeY - specOffset, specR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX - specOffset, eyeY - specOffset, specR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 11. Dynamic Responding Equalizer Speech Waveform Mouth
      const mouthY = visorY + visorH * 0.82;
      if (currentState === 'responding') {
        const barCount = 5;
        const totalW = visorW * 0.36;
        const barW = totalW / (barCount * 1.6);
        const startX = cx - totalW * 0.5;

        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentGlow;
        ctx.shadowBlur = w * 0.05;

        for (let i = 0; i < barCount; i++) {
          const phase = t * 9.0 + i * 0.85;
          const barH = Math.max(1.8, (visorH * 0.16) * Math.abs(Math.sin(phase)));
          const bx = startX + i * (barW * 1.6);
          ctx.beginPath();
          ctx.roundRect(bx, mouthY - barH * 0.5, barW, barH, barW * 0.5);
          ctx.fill();
        }
      } else if (mode === 'chat' && !isHappyCrescent) {
        // Subtle resting micro-smile slit
        const mouthW = visorW * 0.16;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.roundRect(cx - mouthW * 0.5, mouthY - 1, mouthW, 2, 1);
        ctx.fill();
      }

      ctx.restore(); // Visor clip restore
      ctx.restore(); // Head transform restore

      // 12. Sparkle Burst Animation (when tapped)
      const sparkles = sparklesRef.current;
      if (sparkles.length > 0) {
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const sp = sparkles[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.alpha -= 0.024;
          sp.size *= 0.98;

          if (sp.alpha <= 0) {
            sparkles.splice(i, 1);
          } else {
            ctx.save();
            ctx.fillStyle = sp.color;
            ctx.globalAlpha = sp.alpha;
            ctx.beginPath();
            ctx.arc(cx + sp.x, cy + sp.y, Math.max(0.5, sp.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      if (!prefersReduced) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    // Visibility Observer to pause rAF loop when offscreen
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
      { threshold: 0.02 }
    );

    if (canvas) observer.observe(canvas);

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
  }, [size, mode, prefersReduced, interactive]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isHoveredRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      mousePosRef.current = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
    }
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
  };

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`livex-assistant-mascot ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        cursor: interactive ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      role={interactive ? 'button' : 'img'}
      aria-label={`Livex Assistant Mascot (${state})`}
      tabIndex={interactive ? 0 : undefined}
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
