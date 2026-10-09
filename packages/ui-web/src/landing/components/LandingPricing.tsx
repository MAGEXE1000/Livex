import React from 'react';
import { Check, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export default function LandingPricing({
  navigateTo,
  apkUrl,
}: {
  navigateTo: (path: string) => void;
  apkUrl?: string;
}) {
  const TIERS = [
    {
      name: 'Web Workstation',
      price: '$0',
      period: 'Forever free',
      description: 'Zero install, browser-native production suite with local-first storage.',
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
      name: 'Livex Stage Pro',
      price: 'Free',
      period: 'Public Beta Track',
      description: 'Offline-first native Android APK engineered for stage and rehearsal rigs.',
      highlight: true,
      features: [
        'Everything in Web Workstation',
        'Installed native Android APK (Capacitor/Gradle)',
        'Groovex 5-stem WebAssembly multitrack player',
        'SoundTouchJS pitch transposition & time-stretch',
        'Bluetooth MIDI foot pedal prompter integration',
        'Zero-latency offline audio playback',
        'Vector PDF technical stage rider exporter',
      ],
      buttonText: 'Download Android APK',
      action: () => {
        if (apkUrl) {
          window.location.href = apkUrl;
        } else {
          navigateTo('/app');
        }
      },
    },
    {
      name: 'Studio Ensemble',
      price: 'Open',
      period: 'Multi-Device Sync',
      description: 'Synchronized telemetry across bandmates, MDs, and audio engineers.',
      highlight: false,
      features: [
        'Everything in Stage Pro',
        'Live multi-device Stagex plot synchronization',
        'Shared band setlists & song arrangement broadcast',
        'Sub-device audio panning telemetry',
        'Collaborative song preparation vault',
        'Community preset sharing & backups',
      ],
      buttonText: 'Launch Shared Session',
      action: () => navigateTo('/app'),
    },
  ];

  return (
    <section id="pricing" className="w-full py-20 md:py-28 bg-black relative select-none border-t border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-4">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              Transparent Access // No Paywalls
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Professional Audio Tools for Every Musician
          </h2>
          <p className="text-sm md:text-base text-zinc-400 mt-3 font-normal leading-relaxed">
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
                  ? 'bg-zinc-900/60 border-2 border-white/30 shadow-[0_16px_48px_rgba(0,0,0,0.8)]'
                  : 'bg-zinc-950/70 border border-white/10 hover:border-white/20 shadow-xl'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black font-mono text-[10px] tracking-widest uppercase font-bold shadow-md">
                  Recommended for Performers
                </div>
              )}

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{tier.name}</h3>
                </div>
                <p className="text-xs text-zinc-400 mb-6 font-normal leading-relaxed">
                  {tier.description}
                </p>

                <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-white/[0.08]">
                  <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono">
                    {tier.price}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <div className="w-4 h-4 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-zinc-300 flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={tier.action}
                className={`w-full py-3 rounded-full text-xs font-semibold tracking-tight flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-150 ${
                  tier.highlight
                    ? 'bg-white text-black hover:bg-zinc-200 shadow-md'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.12] border border-white/15'
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
