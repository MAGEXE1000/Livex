import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

export default function LandingPricing({
  navigateTo,
  apkUrl,
}: {
  navigateTo: (path: string) => void;
  apkUrl?: string;
}) {
  const TIERS = [
    {
      name: 'Free / Core Rehearsal',
      price: '$0',
      period: 'Forever free',
      description: 'Complete workstation access for individual practice and offline rehearsal.',
      highlight: false,
      features: [
        'Full browser access to all 5 workstations',
        'Local IndexedDB offline project saving',
        'Chordex 400+ chord voicings & Nashville map',
        'Drumex 16-step polyphonic beat sequencer',
        'Vocalex real-time pitch detection meter',
        'Standard Stagex plot canvas & PNG export',
      ],
      buttonText: 'Open Web App',
      action: () => navigateTo('/app'),
    },
    {
      name: 'Livex Pro',
      price: '$9',
      period: 'per month',
      description: 'Advanced workstation tools, multitrack audio worklets, and cloud backup.',
      highlight: true,
      features: [
        'Everything in Free / Core Rehearsal',
        'Groovex 5-stem WebAssembly multitrack player',
        'SoundTouchJS pitch transposition & time-stretch',
        'Expanded project cloud storage & backup',
        'Bluetooth MIDI foot pedal prompter integration',
        'Vector PDF technical stage rider exporter',
        'Priority update channels & beta features',
      ],
      buttonText: 'Start Livex Pro',
      action: () => navigateTo('/app'),
    },
    {
      name: 'Studio Ensemble',
      price: '$19',
      period: 'per month',
      description: 'Synchronized live stage telemetry across bandmates, crew, and sound engineers.',
      highlight: false,
      features: [
        'Everything in Livex Pro',
        'Live multi-device Stagex plot synchronization',
        'Shared band setlists & song arrangement broadcast',
        'Sub-device audio panning telemetry',
        'Collaborative song preparation vault',
        'Multi-track stem audio stem export',
        'Community preset sharing & backups',
      ],
      buttonText: 'Launch Shared Session',
      action: () => navigateTo('/app'),
    },
  ];

  return (
    <section id="pricing" className="w-full py-20 md:py-28 bg-zinc-50 dark:bg-black relative select-none border-t border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-200/60 dark:bg-white/[0.04] border border-zinc-300/80 dark:border-white/10 mb-4 backdrop-blur-md">
            <span className="text-[11px] font-sans uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-semibold">
              Plans & Pricing
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Professional Audio Tools for Every Musician
          </h2>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mt-3 font-normal leading-relaxed">
            Livex is committed to open, robust tooling. Core workstation features remain unrestricted in your browser and on your Android device.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 relative ${
                tier.highlight
                  ? 'bg-zinc-100 dark:bg-zinc-900/60 border-2 border-zinc-900 dark:border-white/30 shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,0.8)]'
                  : 'bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 shadow-md dark:shadow-xl'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black font-sans text-[10px] tracking-wider uppercase font-bold shadow-md">
                  Recommended for Performers
                </div>
              )}

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{tier.name}</h3>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 font-normal leading-relaxed">
                  {tier.description}
                </p>

                <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-zinc-200 dark:border-white/[0.08]">
                  <span className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight font-mono">
                    {tier.price}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="w-4 h-4 rounded-full bg-zinc-200/80 dark:bg-white/[0.06] border border-zinc-300 dark:border-white/15 flex items-center justify-center text-zinc-800 dark:text-zinc-300 flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={tier.action}
                className={`w-full py-3 rounded-full text-xs font-semibold tracking-tight flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-150 cursor-pointer ${
                  tier.highlight
                    ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-md'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300/80 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] dark:border-white/15'
                }`}
              >
                <span>{tier.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
