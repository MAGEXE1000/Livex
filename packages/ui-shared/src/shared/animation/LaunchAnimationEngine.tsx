import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { StartupCoordinator, getStartupAnimationThemeSpec } from '@workspace/studio-core';
import { triggerIntroReveal } from '../typography/StudioTitleReveal';
import livexForm1Url from '../../assets/livex-form1.png';
import livexForm2Url from '../../assets/livex-form2.png';
import livexForm1LightUrl from '../../assets/livex-form1-light.png';
import livexForm2LightUrl from '../../assets/livex-form2-light.png';
import livexSymbolUrl from '../../assets/livex-symbol.png';
import livexSymbolLightUrl from '../../assets/livex-symbol-light.png';

// Studio Sine Wave Logo SVG path (retained for backward-compatibility)
export const StudioSinePath = 'M 72 256 C 128 60 192 60 256 256 S 384 452 440 256';

export type LaunchPreset =
  'fluid_surface' | 'liquid_glass' | 'ripple_reveal' | 'layer_expansion' | 'aurora_reveal';

interface LaunchAnimationEngineProps {
  preset?: LaunchPreset;
  onComplete?: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
  loopMode?: boolean;
  scaleFactor?: number;
  skipIntro?: boolean;
}

export interface LaunchAnimationThemeConfig {
  themeMode: 'light' | 'dark' | 'amoled';
  bgColor: string;
  glowGradient: string;
  logoFilter: string;
  logoOpacity: number;
  sheenGradient: string;
  sheenBlendMode: 'screen' | 'normal';
}

export function resolveLaunchAnimationThemeConfig(
  isLight?: boolean,
  isAmoled?: boolean
): LaunchAnimationThemeConfig {
  let themeMode: 'light' | 'dark' | 'amoled';
  if (isLight) {
    themeMode = 'light';
  } else if (isAmoled) {
    themeMode = 'amoled';
  } else if (typeof document !== 'undefined' && document.documentElement) {
    const cl = document.documentElement.classList;
    if (cl.contains('light')) {
      themeMode = 'light';
    } else if (cl.contains('amoled')) {
      themeMode = 'amoled';
    } else {
      themeMode = 'dark';
    }
  } else {
    themeMode = 'dark';
  }

  const spec = getStartupAnimationThemeSpec(themeMode);
  return {
    themeMode,
    bgColor: spec.bgColor,
    glowGradient: spec.glowGradient,
    logoFilter: spec.logoFilter,
    logoOpacity: spec.logoOpacity,
    sheenGradient: spec.sheenGradient,
    sheenBlendMode: spec.sheenBlendMode,
  };
}

export function LaunchAnimationEngine({
  onComplete,
  isLight = false,
  isAmoled = false,
  loopMode = false,
  scaleFactor = 1,
  skipIntro = false,
}: LaunchAnimationEngineProps) {
  // Determine start delay from app launch time (T+0.65s target)
  const getInitialDelay = () => {
    if (skipIntro) return 0;
    const htmlStart =
      typeof window !== 'undefined' ? (window as any).__bootTimings?.htmlStart || 0 : 0;
    const elapsed = htmlStart > 0 ? performance.now() - htmlStart : 0;
    const targetDelay = 650; // 0.65s intentional start delay
    return Math.max(0, Math.round(targetDelay - elapsed));
  };

  const initialDelay = useRef<number>(getInitialDelay());
  const [stage, setStage] = useState<'delay' | 'brand_reveal' | 'exit_dissolve' | 'complete'>(
    skipIntro ? 'complete' : initialDelay.current > 0 ? 'delay' : 'brand_reveal'
  );
  const [key, setKey] = useState(0);

  // Telemetry frame tracking
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    // Dismiss index.html splash overlay immediately once React mounts to prevent duplicate presentation
    const intro = document.getElementById('intro');
    console.log(`[STARTUP-TRACE] LaunchAnimationEngine: mount effect, #intro exists=${!!intro}`);
    if (intro) {
      intro.style.display = 'none';
      if (intro.parentNode) intro.parentNode.removeChild(intro);
      console.log(
        `[STARTUP-TRACE] LaunchAnimationEngine: removed #intro at ${performance.now().toFixed(0)}ms`
      );
    }

    if (skipIntro) {
      triggerIntroReveal();
      onComplete?.();
    }
  }, [skipIntro]);

  // Frame telemetry tracking
  useEffect(() => {
    lastTime.current = performance.now();
    let frameId: number;

    const trackFrame = (time: number) => {
      if (lastTime.current > 0) {
        const delta = time - lastTime.current;
        frameTimes.current.push(delta);
        if (frameTimes.current.length > 300) frameTimes.current.shift();
      }
      lastTime.current = time;
      frameId = requestAnimationFrame(trackFrame);
    };

    frameId = requestAnimationFrame(trackFrame);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [key]);

  // Stage transition orchestration:
  // 1. delay: 0.65s initial launch pause
  // 2. brand_reveal: 1.18s 6-phase mark assembly, sheen sweep, and breathing hold
  // 3. exit_dissolve: 0.30s graceful fade-out into pre-mounted Hub DOM (Total motion: ~1.48s)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let unsub: (() => void) | undefined;
    let watchdogTimer: ReturnType<typeof setTimeout> | undefined;

    if (stage === 'delay') {
      const waitMs = initialDelay.current;
      console.log(`[STARTUP-TRACE] LaunchAnimationEngine: waiting ${waitMs}ms start delay`);
      t = setTimeout(() => {
        console.log(
          `[STARTUP-TRACE] LaunchAnimationEngine: delay -> brand_reveal transition at ${performance.now().toFixed(0)}ms`
        );
        setStage('brand_reveal');
      }, waitMs);
    } else if (stage === 'brand_reveal') {
      // Phase 1 through 5 run over 1180ms before initiating Hub exit dissolve
      t = setTimeout(() => {
        console.log(
          `[STARTUP-TRACE] LaunchAnimationEngine: brand_reveal complete -> checking Hub readiness at ${performance.now().toFixed(0)}ms`
        );

        const isHubReady =
          loopMode ||
          (typeof window !== 'undefined' &&
            ((window as any).__studioStartupComplete ||
              !!document.querySelector('[data-livex-hub-root="true"]') ||
              !!document.getElementById('hub-root')));

        if (isHubReady) {
          console.log(
            `[STARTUP-TRACE] LaunchAnimationEngine: Hub already ready, starting exit_dissolve`
          );
          setStage('exit_dissolve');
        } else {
          console.log(
            `[STARTUP-TRACE] LaunchAnimationEngine: Hub not yet ready, subscribing to startup complete`
          );
          unsub = StartupCoordinator.subscribeStartupComplete(() => {
            console.log(
              `[STARTUP-TRACE] LaunchAnimationEngine: received startup complete event, starting exit_dissolve`
            );
            setStage('exit_dissolve');
          });

          // Fail-safe watchdog fallback to guarantee transition out even if event is delayed
          watchdogTimer = setTimeout(() => {
            console.log(
              `[STARTUP-TRACE] LaunchAnimationEngine: watchdog triggered, starting exit_dissolve`
            );
            setStage('exit_dissolve');
          }, 2000);
        }
      }, 1180);
    }

    return () => {
      clearTimeout(t);
      if (unsub) unsub();
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [stage, loopMode]);

  const { themeMode, bgColor, glowGradient, logoFilter, logoOpacity, sheenGradient, sheenBlendMode } =
    resolveLaunchAnimationThemeConfig(isLight, isAmoled);

  const isThemeLight = themeMode === 'light';
  const form1Src = isThemeLight ? livexForm1LightUrl : livexForm1Url;
  const form2Src = isThemeLight ? livexForm2LightUrl : livexForm2Url;
  const symbolMaskUrl = isThemeLight ? livexSymbolLightUrl : livexSymbolUrl;

  // Sizing calibrated for mobile viewports (~196px standard, clamped between 160px and 220px)
  const symbolSize = Math.max(160, Math.min(220, Math.round(196 * scaleFactor)));
  const glowSize = Math.round(symbolSize * 1.55);

  const isBrandReveal = stage === 'brand_reveal';
  const isExit = stage === 'exit_dissolve';
  const isComplete = stage === 'complete';

  if (isComplete && !loopMode) {
    return null;
  }

  return (
    <motion.div
      key={key}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExit ? 0 : 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => {
        if (isExit) {
          if (loopMode) {
            setTimeout(() => {
              setKey((prev) => prev + 1);
              setStage('brand_reveal');
            }, 300);
          } else {
            setStage('complete');
            triggerIntroReveal();
            console.log(
              `[STARTUP-TRACE] LaunchAnimationEngine: onComplete at ${performance.now().toFixed(0)}ms`
            );
            if (onComplete) onComplete();
          }
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        backgroundColor: bgColor,
        pointerEvents: isExit || isComplete ? 'none' : 'auto',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        transform: 'translateZ(0)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Phase 1 (0.00-0.22s): Ambient Inception Glow expanding along 65° diagonal trajectory */}
        <motion.div
          initial={{ opacity: 0, scale: 0.65 }}
          animate={
            isExit
              ? { opacity: 0, scale: 1.1 }
              : isBrandReveal
                ? { opacity: 0.85, scale: 1.0 }
                : { opacity: 0, scale: 0.65 }
          }
          transition={
            isExit
              ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
          }
          style={{
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: '50%',
            background: glowGradient,
            filter: 'blur(28px)',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
          }}
        />

        {/* The Livex Logo Stage: Form 1 + Form 2 + Specular Seam Sheen */}
        {/* Phase 4 (0.70-0.80s) Union impulse + Phase 5 (0.80-1.18s) Breathing hold + Phase 6 Exit scale */}
        <motion.div
          initial={{ scale: 1 }}
          animate={
            isExit
              ? { scale: 1.032 }
              : isBrandReveal
                ? { scale: [1, 1, 1.014, 1.0, 1.014] }
                : { scale: 1 }
          }
          transition={
            isExit
              ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              : {
                  duration: 1.18,
                  times: [0, 0.58, 0.63, 0.7, 1.0],
                  ease: 'easeInOut',
                }
          }
          style={{
            position: 'relative',
            zIndex: 2,
            width: symbolSize,
            height: symbolSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          {/* Phase 2 (0.15-0.52s): Form 1 Ascending Stem / Left Petal Path Reveal */}
          <motion.div
            initial={{ opacity: 0, x: -28, y: 38, rotate: -4.5, scale: 0.92 }}
            animate={
              isBrandReveal || isExit
                ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
                : { opacity: 0, x: -28, y: 38, rotate: -4.5, scale: 0.92 }
            }
            transition={{
              delay: 0.15,
              duration: 0.37,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
          >
            <img
              src={form1Src}
              alt=""
              width={symbolSize}
              height={symbolSize}
              draggable={false}
              style={{
                display: 'block',
                width: symbolSize,
                height: symbolSize,
                objectFit: 'contain',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
                filter: isThemeLight ? 'none' : logoFilter,
                opacity: isThemeLight ? 1.0 : logoOpacity,
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)',
              }}
            />
          </motion.div>

          {/* Phase 3 (0.32-0.72s): Form 2 Curved Wing Swoop & Convergence */}
          <motion.div
            initial={{ opacity: 0, x: 34, y: 20, rotate: 9.5, scale: 0.88 }}
            animate={
              isBrandReveal || isExit
                ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
                : { opacity: 0, x: 34, y: 20, rotate: 9.5, scale: 0.88 }
            }
            transition={{
              delay: 0.32,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
          >
            <img
              src={form2Src}
              alt=""
              width={symbolSize}
              height={symbolSize}
              draggable={false}
              style={{
                display: 'block',
                width: symbolSize,
                height: symbolSize,
                objectFit: 'contain',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
                filter: isThemeLight ? 'none' : logoFilter,
                opacity: isThemeLight ? 1.0 : logoOpacity,
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)',
              }}
            />
          </motion.div>

          {/* Phase 4 (0.70-1.05s): Luminous Specular Sheen Ribbon sweeping across seam */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              WebkitMaskImage: `url(${symbolMaskUrl})`,
              maskImage: `url(${symbolMaskUrl})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              overflow: 'hidden',
              mixBlendMode: sheenBlendMode,
              transform: 'translateZ(0)',
            }}
          >
            <motion.div
              initial={{ x: '-110%', y: '110%', opacity: 0 }}
              animate={
                isBrandReveal || isExit
                  ? {
                      x: ['-110%', '0%', '110%'],
                      y: ['110%', '0%', '-110%'],
                      opacity: [0, 0.95, 0],
                    }
                  : { opacity: 0 }
              }
              transition={{
                delay: 0.7,
                duration: 0.35,
                times: [0, 0.45, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                position: 'absolute',
                inset: '-60%',
                background: sheenGradient,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
              }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
