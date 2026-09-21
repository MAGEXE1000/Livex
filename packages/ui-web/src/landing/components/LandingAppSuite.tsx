import { useLivexPreferences } from '@workspace/livex-core';
import React from 'react';
import { motion } from 'motion/react';
import {
  ChordexFeatureSkeleton,
  DrumexFeatureSkeleton,
  StagexFeatureSkeleton,
  GroovexFeatureSkeleton,
  VocalexFeatureSkeleton,
} from './LivexFeatureSkeletons';

export default function LandingAppSuite() {
  const { preferences } = useLivexPreferences();
  const isReduced = preferences.reduceMotion;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: isReduced ? 0 : 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: isReduced ? 0 : 24,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  const features = [
    {
      app: 'chordex',
      name: 'Chordex',
      badge: 'Songs & Chords',
      title: 'Organize songs, chords, and setlists.',
      desc: 'Build song libraries, explore fretboard and keyboard diagrams, transpose keys on the fly, and structure live performance sets.',
      Skeleton: ChordexFeatureSkeleton,
      colSpan: 'lg:col-span-2 md:col-span-1',
    },
    {
      app: 'drums',
      name: 'Drumex',
      badge: 'Rhythm & Click',
      title: 'Lock your tempo with step sequencer precision.',
      desc: 'Interactive 16-step polyphonic pattern sequencer, snare rudiment drills, and dynamic visual metronome/click synchronization.',
      Skeleton: DrumexFeatureSkeleton,
      colSpan: 'lg:col-span-2 md:col-span-1',
    },
    {
      app: 'stagex',
      name: 'Stagex',
      badge: 'Stage Plots & Riders',
      title: 'Plan the stage before the gig.',
      desc: 'Interactive drag-and-drop stage plots, equipment and amp node placement, input channel grid, and FOH technical rider exports.',
      Skeleton: StagexFeatureSkeleton,
      colSpan: 'lg:col-span-2 md:col-span-1',
    },
    {
      app: 'groovex',
      name: 'Groovex',
      badge: 'Practice Mixer',
      title: 'Rehearse with multitrack stem balancing.',
      desc: 'Low-latency multitrack fader mixing, isolated stems control, mute/solo channels, flexible A-B practice looping, and speed training.',
      Skeleton: GroovexFeatureSkeleton,
      colSpan: 'lg:col-span-3 md:col-span-1',
    },
    {
      app: 'vocalex',
      name: 'Vocalex',
      badge: 'Vocal Pitch & Takes',
      title: 'Trace vocal pitch in real time.',
      desc: 'Visual pitch detection contour curve, cent-level vocal tuning feedback, multi-take audio recording to local storage, and interval warmup exercises.',
      Skeleton: VocalexFeatureSkeleton,
      colSpan: 'lg:col-span-3 md:col-span-2',
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
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-widest font-bold mb-5 select-none landing-font-heading"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
              color: 'var(--landing-text-secondary)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            The Livex Creative Suite
          </div>
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-5 leading-tight landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Five Dedicated Tools. One Unified Platform.
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed max-w-2xl mx-auto landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Every phase of your rehearsal and live performance is covered: song charts in Chordex,
            rhythm in Drumex, stage plots in Stagex, stem mixing in Groovex, and vocal pitch precision in Vocalex.
          </p>
        </div>

        {/* Features Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6"
        >
          {features.map(({ app, name, badge, title, desc, Skeleton, colSpan }) => (
            <motion.div
              key={app}
              variants={cardVariants}
              className={`group relative flex flex-col rounded-2xl border p-1.5 overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-xl ${colSpan}`}
              style={{
                backgroundColor: 'var(--landing-surface-card)',
                borderColor: 'var(--landing-border)',
              }}
            >
              <div
                className="flex flex-col h-full rounded-xl overflow-hidden border"
                style={{
                  backgroundColor: 'var(--landing-surface-subtle)',
                  borderColor: 'var(--landing-border-subtle)',
                }}
              >
                {/* Skeleton Viewport */}
                <div
                  className="h-[215px] w-full border-b relative overflow-hidden mockup-viewport"
                  style={{
                    backgroundColor: '#050508',
                    borderColor: 'var(--landing-border)',
                  }}
                >
                  <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />
                  <Skeleton />
                </div>

                {/* Text Description Area */}
                <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border landing-font-heading"
                        style={{
                          backgroundColor: 'var(--landing-surface-card)',
                          borderColor: 'var(--landing-border)',
                          color: 'var(--landing-text-primary)',
                        }}
                      >
                        {name}
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-widest font-semibold landing-font-heading"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        {badge}
                      </span>
                    </div>

                    <h3
                      className="text-sm md:text-base font-bold uppercase tracking-wide leading-snug mb-2 landing-font-heading"
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
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
