import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { StartupCoordinator, getStartupAnimationThemeSpec } from '@workspace/livex-core';
import { triggerIntroReveal } from './introSignal';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import livexForm1Url from '../../assets/livex-form1.png';
import livexForm2Url from '../../assets/livex-form2.png';
import livexForm1LightUrl from '../../assets/livex-form1-light.png';
import livexForm2LightUrl from '../../assets/livex-form2-light.png';
import livexSymbolUrl from '../../assets/livex-symbol.png';
import livexSymbolLightUrl from '../../assets/livex-symbol-light.png';

// Pre-warm and decode Livex brand textures at module load so they are ready in GPU memory before frame 0
if (typeof window !== 'undefined') {
  [
    livexForm1Url,
    livexForm2Url,
    livexForm1LightUrl,
    livexForm2LightUrl,
    livexSymbolUrl,
    livexSymbolLightUrl,
  ].forEach((src) => {
    try {
      const img = new Image();
      img.src = src;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    } catch (_) {}
  });
}

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
  const prefersReduced = useAppReducedMotion();
  const effectiveSkip = skipIntro || prefersReduced;
  const [stage, setStage] = useState<'brand_reveal' | 'exit_dissolve' | 'complete'>(
    effectiveSkip ? 'complete' : 'brand_reveal'
  );
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Smoothly dissolve index.html splash overlay once React mounts to eliminate jarring 0ms cuts
    const intro = document.getElementById('intro');
    if (intro) {
      intro.style.transition = 'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)';
      intro.style.opacity = '0';
      intro.style.pointerEvents = 'none';
      setTimeout(() => {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }, 240);
    }

    // Release native Android splash screen on the first painted frame of the brand reveal
    requestAnimationFrame(() => {
      try {
        if (
          typeof window !== 'undefined' &&
          (window as any).Capacitor &&
          (window as any).Capacitor.Plugins &&
          (window as any).Capacitor.Plugins.AppInstaller
        ) {
          (window as any).Capacitor.Plugins.AppInstaller.notifyAppReady();
        }
      } catch (_) {}
    });

    if (effectiveSkip) {
      triggerIntroReveal();
      onComplete?.();
    }
  }, [effectiveSkip, onComplete]);

  // 1. brand_reveal: 1.05s 6-phase mark assembly, sheen sweep, and breathing hold
  // 2. exit_dissolve: 0.30s graceful fade-out into pre-mounted Hub DOM (Total motion: ~1.35s)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let unsub: (() => void) | undefined;
    let watchdogTimer: ReturnType<typeof setTimeout> | undefined;

    if (stage === 'brand_reveal') {
      // Phase 1 through 5 run over 1050ms before initiating Hub exit dissolve
      t = setTimeout(() => {
        const isHubReady =
          loopMode ||
          StartupCoordinator.isStartupComplete() ||
          (typeof window !== 'undefined' &&
            ((window as any).__studioStartupComplete ||
              (window as any).__studioHubReady ||
              !!document.querySelector('[data-livex-hub-root="true"]') ||
              !!document.getElementById('hub-root')));

        if (isHubReady) {
          triggerIntroReveal();
          setStage('exit_dissolve');
        } else {
          unsub = StartupCoordinator.subscribeStartupComplete(() => {
            triggerIntroReveal();
            setStage('exit_dissolve');
          });

          // Fail-safe watchdog fallback to guarantee transition out even if event is delayed
          watchdogTimer = setTimeout(() => {
            triggerIntroReveal();
            setStage('exit_dissolve');
          }, 1000);
        }
      }, 1050);
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
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
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
        {/* Phase 1 (0.00-0.22s): Ambient Inception Glow (pure composited radial-gradient, zero blur filter cost) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={
            isExit
              ? { opacity: 0, scale: 1.08 }
              : isBrandReveal
                ? { opacity: 0.9, scale: 1.0 }
                : { opacity: 0, scale: 0.7 }
          }
          transition={
            isExit
              ? { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
          }
          style={{
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: '50%',
            background: glowGradient,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
          }}
        />

        {/* Phase 4 (0.70-0.80s) Union impulse + Phase 5 (0.80-1.05s) Breathing hold + Phase 6 Exit scale */}
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
                  duration: 1.05,
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
              loading="eager"
              decoding="async"
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
              loading="eager"
              decoding="async"
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
