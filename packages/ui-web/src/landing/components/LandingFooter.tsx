import { LivexLogo } from '@workspace/ui-shared';
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LandingFooterProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
  apkVersion?: string;
}

export default function LandingFooter({
  navigateTo,
  apkUrl,
}: LandingFooterProps) {
  const handleScrollTo = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    id: string
  ) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-zinc-200/80 dark:border-white/[0.08] py-16 bg-zinc-50 dark:bg-black relative overflow-hidden select-none transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start mb-16">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 flex items-center justify-center text-zinc-900 dark:text-white">
                <LivexLogo size={20} />
              </div>
              <span className="font-mono text-xs tracking-[0.18em] uppercase font-bold text-zinc-900 dark:text-white">
                Livex Audio
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-zinc-600 dark:text-zinc-400 font-normal">
              Livex is an integrated, low-latency audio workstation ecosystem engineered for
              performing bands, guitarists, vocalists, audio engineers, and music directors.
              Built for high-pressure stages and real rehearsal environments.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>All Workstation DSP Engines Operational</span>
            </div>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-white font-semibold mb-4">
                Workstations
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'bento')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Groovex (Stems)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'bento')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Chordex (Prompter)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'bento')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Drumex (Sequencer)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'bento')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Vocalex (Pitch)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'bento')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Stagex (Spatial Plot)
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-white font-semibold mb-4">
                Navigation
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <button
                    onClick={() => navigateTo('/app')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Launch Web App
                  </button>
                </li>
                <li>
                  {apkUrl ? (
                    <a href={apkUrl} className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
                      Download Android APK
                    </a>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">Android APK</span>
                  )}
                </li>
                <li>
                  <a
                    href="#showcase"
                    onClick={(e) => handleScrollTo(e, 'showcase')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    3D Showcase
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    onClick={(e) => handleScrollTo(e, 'pricing')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Pricing & Tiers
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    onClick={(e) => handleScrollTo(e, 'about')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    About Ethos
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-white font-semibold mb-4">
                Legal & Safety
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <button
                    onClick={() => navigateTo('/privacy')}
                    className="text-zinc-900 dark:text-white hover:underline flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                    aria-label="View Privacy Policy"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <span className="text-zinc-500">Offline-First Local Storage</span>
                </li>
                <li>
                  <span className="text-zinc-500">Zero Analytics Telemetry</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legal & Rights */}
        <div className="border-t border-zinc-200/80 dark:border-white/[0.08] pt-8 pb-8 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 space-y-2">
          <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">Licenses & Rights</h5>
          <p>
            Livex is distributed as a progressive web application and Android native APK for musicians and audio professionals.
            All Livex interface designs, trademarks, workstation modules, and original algorithms are part of the Livex project.
          </p>
          <p>
            Third-party DSP libraries and audio decoders remain under their respective licenses.
            Livex does not distribute copyrighted master audio recordings or lyrics.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-200/80 dark:border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© 2026 Livex Audio Suite. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/privacy')}
              className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer font-medium flex items-center gap-1"
            >
              <span>Privacy Policy</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
