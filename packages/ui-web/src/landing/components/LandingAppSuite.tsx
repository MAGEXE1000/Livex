import { useLivexPreferences, useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import { motion } from 'motion/react';
import {
  ChordexFeatureSkeleton,
  StagexFeatureSkeleton,
  GroovexFeatureSkeleton,
} from './LivexFeatureSkeletons';

export default function LandingAppSuite() {
  const { preferences } = useLivexPreferences();
  const isReduced = preferences.reduceMotion;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: isReduced ? 0 : 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: isReduced ? 0 : 28,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.65,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  const features = [
    {
      app: 'chordex',
      title: 'Organize songs, chords, and setlists.',
      desc: 'Build song presets, browse chord shapes, manage progressions, and keep your set material ready.',
      Skeleton: ChordexFeatureSkeleton,
    },
    {
      app: 'stagex',
      title: 'Plan the stage before the gig.',
      desc: 'Map stage layouts, organize gear placement, and prepare cleaner setup information for live shows.',
      Skeleton: StagexFeatureSkeleton,
    },
    {
      app: 'groovex',
      title: 'Practice with a focused groove workspace.',
      desc: 'Use mixer-style controls and practice views to stay locked into rhythm and arrangement ideas.',
      Skeleton: GroovexFeatureSkeleton,
    },
  ];

  return (
    <section
      id="suite"
      className="py-24 border-t relative select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--landing-surface-subtle)',
        borderColor: 'var(--landing-border)',
      }}
    >
      {/* Decorative background grid effect */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-5 leading-tight landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Built for focused music workflows.
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed max-w-2xl mx-auto landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Livex connects the core parts of a modern music workflow: organizing songs and chords,
            preparing stage layouts, and practicing with groove-focused tools.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {features.map(({ app, title, desc, Skeleton }) => (
            <motion.div
              key={app}
              variants={cardVariants}
              className="group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg"
              style={{
                backgroundColor: 'var(--landing-surface-card)',
                borderColor: 'var(--landing-border)',
              }}
            >
              {/* Skeleton Area */}
              <div className="h-[210px] w-full border-b relative overflow-hidden mockup-viewport"
                style={{
                  backgroundColor: '#050508',
                  borderColor: 'var(--landing-border)',
                }}
              >
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />
                <Skeleton />
              </div>

              {/* Text Description Area */}
              <div className="p-6 flex flex-col flex-1 gap-2">
                <h3
                  className="text-sm md:text-base font-bold uppercase tracking-wider leading-snug landing-font-heading"
                  style={{ color: 'var(--landing-text-primary)' }}
                >
                  {title}
                </h3>
                <p
                  className="text-xs leading-relaxed landing-font-body"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  {desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
