import { useLivexPreferences } from '@workspace/livex-core';
import React from 'react';
import { FEATURES_DATA } from '../landingData';
import { motion } from 'motion/react';
import SpotlightCard from './SpotlightCard';

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
      y: isReduced ? 0 : 16,
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
      className="py-24 border-t border-white/10 relative select-none transition-colors duration-200 bg-[#000000]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-xs font-medium text-zinc-300 mb-4 bg-white/[0.03]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Stage-Ready Architecture</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"
            style={{ letterSpacing: '-0.02em' }}
          >
            Connected Live Ecosystem
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-zinc-400">
            Engineered specifically for gigging musicians, live bands, and sound engineers.
            Every tool communicates seamlessly from the rehearsal room to the front-of-house mixer.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES_DATA.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div key={idx} variants={itemVariants}>
                <SpotlightCard
                  className="h-full p-6 bg-[#09090b]/80 border-white/10 flex flex-col justify-between"
                  spotlightColor="rgba(255, 255, 255, 0.06)"
                  spotlightSize={300}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3
                      className="text-base font-semibold text-white tracking-tight mb-2"
                      style={{ letterSpacing: '-0.01em' }}
                    >
                      {feat.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-400 font-normal">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-[11px] text-zinc-500 font-mono">
                    <span>Feature 0{idx + 1}</span>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
