import { useLivexPreferences, useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import { FEATURES_DATA } from '../landingData';
import { motion } from 'motion/react';

export default function LandingFeatureGrid() {
  const { preferences } = useLivexPreferences();
  const isReduced = preferences.reduceMotion;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: isReduced ? 0 : 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: isReduced ? 0 : 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.5,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section
      id="features"
      className="py-24 border-t relative select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--landing-bg)',
        borderColor: 'var(--landing-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-4 landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Technical Design Core
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Livex is engineered to withstand the demanding conditions of live music performance and
            band rehearsal settings.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {FEATURES_DATA.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="p-6 rounded-2xl border flex flex-col gap-4 transition-all duration-300 shadow-md"
                style={{
                  backgroundColor: 'var(--landing-surface-card)',
                  borderColor: 'var(--landing-border)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--landing-surface-subtle)',
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text-primary)',
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3
                  className="text-sm font-bold uppercase tracking-wider landing-font-heading"
                  style={{ color: 'var(--landing-text-primary)' }}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-xs leading-relaxed landing-font-body"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  {feat.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
