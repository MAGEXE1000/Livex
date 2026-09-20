import { useStudioPreferences } from '@workspace/livex-core';
import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { renderMockupByName } from './StudioScreenMockups';

interface LandingContainerScrollProps {
  titleText: string;
  descriptionText: string;
  mockupName?: string;
}

export default function LandingContainerScroll({
  titleText,
  descriptionText,
  mockupName = 'stage',
}: LandingContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  // Rotation and scale transformation mapping
  const rotateXTransform = useTransform(scrollYProgress, [0, 0.45], [16, 0]);
  const scaleTransform = useTransform(scrollYProgress, [0, 0.45], [0.94, 1]);
  const translateYTransform = useTransform(scrollYProgress, [0, 0.45], [40, 0]);

  const rotateX = useSpring(rotateXTransform, { stiffness: 100, damping: 20 });
  const scale = useSpring(scaleTransform, { stiffness: 100, damping: 20 });
  const translateY = useSpring(translateYTransform, { stiffness: 100, damping: 20 });

  const [activeStep, setActiveStep] = useState<'chordSongs' | 'chordLib' | 'stage'>('chordSongs');

  const steps = [
    { id: 'chordSongs', label: '1. Songs', desc: 'Organize setlists and chord sheets' },
    { id: 'chordLib', label: '2. Chords', desc: 'Explore chords and fingering' },
    { id: 'stage', label: '3. Stage', desc: 'Design stage plots and tech riders' },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center py-20 px-6 overflow-hidden select-none transition-colors duration-200"
      style={{
        perspective: '1000px',
        backgroundColor: 'var(--landing-bg)',
      }}
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Title Block */}
        <div className="mb-10 text-center max-w-2xl">
          <h2
            className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight mb-4 landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            {titleText}
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            {descriptionText}
          </p>
        </div>

        {/* Step Switcher */}
        <div
          className="mb-4 flex flex-wrap justify-center gap-1.5 p-1.5 rounded-2xl max-w-md w-full border transition-colors"
          style={{
            backgroundColor: 'var(--landing-surface-subtle)',
            borderColor: 'var(--landing-border)',
          }}
        >
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id as any)}
                className="flex-1 min-w-[90px] px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border-none outline-none shadow-sm"
                style={{
                  backgroundColor: isActive ? 'var(--landing-cta-bg)' : 'transparent',
                  color: isActive ? 'var(--landing-cta-text)' : 'var(--landing-text-secondary)',
                }}
              >
                {step.label}
              </button>
            );
          })}
        </div>

        {/* Active Step Subtext */}
        <div className="mb-8 h-4 text-center">
          <span
            className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest leading-none"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            {steps.find((s) => s.id === activeStep)?.desc}
          </span>
        </div>

        {/* Scrolling Animated Container */}
        <motion.div
          style={{
            rotateX: isReduced ? 0 : rotateX,
            scale: isReduced ? 1 : scale,
            y: isReduced ? 0 : translateY,
            transformStyle: 'preserve-3d',
            backgroundColor: 'var(--landing-surface-card)',
            borderColor: 'var(--landing-border)',
          }}
          className="w-full border p-2 sm:p-4 rounded-2xl md:rounded-3xl shadow-2xl relative"
        >
          <div className="w-full overflow-hidden rounded-xl bg-black aspect-video border flex items-center justify-center relative min-h-[300px] md:min-h-[480px] mockup-viewport"
            style={{ borderColor: 'var(--landing-border)' }}
          >
            {renderMockupByName(activeStep)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
