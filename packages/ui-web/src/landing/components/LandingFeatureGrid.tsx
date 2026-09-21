import { useLivexPreferences } from '@workspace/livex-core';
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
        staggerChildren: isReduced ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: isReduced ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.55,
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
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-widest font-bold mb-5 select-none landing-font-heading"
            style={{
              backgroundColor: 'var(--landing-surface-subtle)',
              borderColor: 'var(--landing-border)',
              color: 'var(--landing-text-secondary)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Stage-Ready Architecture
          </div>
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-4 landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            The Connected Live Ecosystem
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Built specifically for gigging musicians, live bands, and sound engineers. Every tool
            communicates seamlessly from rehearsal rooms to stage monitors.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES_DATA.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group p-1.5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-lg"
                style={{
                  backgroundColor: 'var(--landing-surface-card)',
                  borderColor: 'var(--landing-border)',
                }}
              >
                <div
                  className="p-6 rounded-xl flex flex-col gap-4 h-full border"
                  style={{
                    backgroundColor: 'var(--landing-surface-subtle)',
                    borderColor: 'var(--landing-border-subtle)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl border flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: 'var(--landing-surface-card)',
                      borderColor: 'var(--landing-border)',
                      color: 'var(--landing-text-primary)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-bold uppercase tracking-wider mb-2 landing-font-heading"
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
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
