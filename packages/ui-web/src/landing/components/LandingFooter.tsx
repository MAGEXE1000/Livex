import { APP_VERSION_LABEL } from '@workspace/livex-core';
import { LivexLogo } from '@workspace/ui-shared';
import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface LandingFooterProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
  apkVersion?: string;
}

export default function LandingFooter({
  navigateTo,
  apkUrl,
  apkVersion = APP_VERSION_LABEL,
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
    <footer className="border-t border-white/10 py-16 bg-[#050505] relative overflow-hidden select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start mb-16">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0 text-white">
                <LivexLogo size={28} />
              </div>
              <span
                className="font-bold text-base tracking-tight text-white"
                style={{ letterSpacing: '-0.02em' }}
              >
                Livex
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-zinc-400">
              Livex is an integrated, low-latency performance and rehearsal suite designed for
              guitarists, drummers, audio engineers, vocalists, and music directors.
              Built for production stages and real rehearsal environments.
            </p>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight mb-4">
                Workstations
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-400">
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'workstations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Groovex (Stems)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'workstations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Chordex (Prompter)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'workstations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Drumex (Sequencer)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'workstations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Vocalex (Pitch)
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleScrollTo(e, 'workstations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Stagex (Spatial Plot)
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight mb-4">
                Platforms
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-400">
                <li>
                  <button
                    onClick={() => navigateTo('/app')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Web Workstation
                  </button>
                </li>
                <li>
                  {apkUrl ? (
                    <a href={apkUrl} className="hover:text-white transition-colors cursor-pointer">
                      Android APK
                    </a>
                  ) : (
                    <span className="text-zinc-600">Android APK</span>
                  )}
                </li>
                <li>
                  <a
                    href="#downloads"
                    onClick={(e) => handleScrollTo(e, 'downloads')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    All Downloads
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5 text-xs text-zinc-400">
                <li>
                  <a
                    href="#features"
                    onClick={(e) => handleScrollTo(e, 'features')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Core Features
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo('/privacy')}
                    className="text-white hover:underline flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <span className="text-zinc-600">Release Notes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legal & Rights */}
        <div className="border-t border-white/10 pt-8 pb-8 text-xs leading-relaxed text-zinc-400 space-y-2">
          <h5 className="font-semibold text-white mb-2">Licenses & Rights</h5>
          <p>
            Livex is distributed as a progressive web application and Android APK for musicians and audio professionals.
            All Livex interface designs, trademarks, workstation modules, and original algorithms are part of the Livex project.
          </p>
          <p>
            Third-party DSP libraries and audio decoders remain under their respective licenses.
            Livex does not distribute copyrighted master audio recordings or lyrics.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 Livex. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/privacy')}
              className="text-zinc-300 hover:text-white transition-colors cursor-pointer font-medium flex items-center gap-1"
            >
              <span>Privacy Policy</span>
            </button>
            <span>Web v4.0.0</span>
            <span>Android v{apkVersion}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
