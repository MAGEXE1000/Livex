import { useLivexPreferences, useSettingsStore, settingsController } from '@workspace/livex-core';
import { LivexLogo } from '@workspace/ui-shared';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingNavbarProps {
  navigateTo: (path: string) => void;
}

export default function LandingNavbar({ navigateTo }: LandingNavbarProps) {
  const { preferences } = useLivexPreferences();
  const isReduced = preferences.reduceMotion;
  const [activeSection, setActiveSection] = useState<string>('');

  const currentTheme = useSettingsStore((s) => s.settings.theme);
  const amoledMode = useSettingsStore((s) => s.settings.amoledMode);

  const currentMode: 'light' | 'dark' | 'amoled' =
    currentTheme === 'light' ? 'light' : amoledMode ? 'amoled' : 'dark';

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const sectionIds = ['workstations', 'features', 'downloads'];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;

      if (window.scrollY < 100) {
        setActiveSection('');
        return;
      }

      let current = '';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = id;
            break;
          }
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        current = 'downloads';
      }

      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-md bg-black/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
        >
          <div className="flex-shrink-0 text-white">
            <LivexLogo size={26} />
          </div>
          <span
            className="font-bold text-base tracking-tight text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            Livex
          </span>
        </div>

        {/* Center Nav tabs */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium p-1 rounded-full relative border border-white/10 bg-white/[0.03]">
          <a
            href="#workstations"
            onClick={(e) => handleScrollTo(e, 'workstations')}
            className={`relative px-3.5 py-1.5 rounded-full transition-colors duration-200 ${
              activeSection === 'workstations' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeSection === 'workstations' && (
              <motion.span
                layoutId="activeLandingTab"
                className="absolute inset-0 rounded-full -z-10 shadow-sm bg-white/10 border border-white/15"
                transition={
                  isReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                }
              />
            )}
            Workstations
          </a>

          <a
            href="#features"
            onClick={(e) => handleScrollTo(e, 'features')}
            className={`relative px-3.5 py-1.5 rounded-full transition-colors duration-200 ${
              activeSection === 'features' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeSection === 'features' && (
              <motion.span
                layoutId="activeLandingTab"
                className="absolute inset-0 rounded-full -z-10 shadow-sm bg-white/10 border border-white/15"
                transition={
                  isReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                }
              />
            )}
            Features
          </a>

          <a
            href="#downloads"
            onClick={(e) => handleScrollTo(e, 'downloads')}
            className={`relative px-3.5 py-1.5 rounded-full transition-colors duration-200 ${
              activeSection === 'downloads' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeSection === 'downloads' && (
              <motion.span
                layoutId="activeLandingTab"
                className="absolute inset-0 rounded-full -z-10 shadow-sm bg-white/10 border border-white/15"
                transition={
                  isReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                }
              />
            )}
            Platforms
          </a>

          {/* Explicit Privacy Policy Navigation */}
          <button
            type="button"
            onClick={() => navigateTo('/privacy')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Privacy</span>
          </button>
        </nav>

        {/* Right: Theme Switcher & Open App Action */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Segmented Theme Switcher */}
          <div className="flex items-center p-0.5 rounded-full border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => settingsController.setThemeMode('light')}
              title="Light theme"
              aria-label="Light theme"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'light' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: currentMode === 'light' ? '#ffffff' : '#71717a',
              }}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => settingsController.setThemeMode('dark')}
              title="Dark theme"
              aria-label="Dark theme"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'dark' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: currentMode === 'dark' ? '#ffffff' : '#71717a',
              }}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => settingsController.setThemeMode('amoled')}
              title="AMOLED theme"
              aria-label="AMOLED theme"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'amoled' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: currentMode === 'amoled' ? '#ffffff' : '#71717a',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Launch Web Button */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('livex:entered_from_landing', 'true');
              navigateTo('/app');
            }}
            className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-1.5 active:scale-95 bg-white text-black hover:bg-zinc-100 shadow-sm cursor-pointer"
          >
            <span>Open App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
