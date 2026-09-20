import { useLivexPreferences, useSettingsStore, settingsController } from '@workspace/livex-core';
import { LivexLogo } from '@workspace/ui-shared';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Sparkles, ArrowRight } from 'lucide-react';

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
    const sectionIds = ['suite', 'showcase', 'features', 'downloads'];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200; // offset for navbar height

      // If at the top of the page, highlight nothing
      if (window.scrollY < 100) {
        setActiveSection('');
        return;
      }

      // Find current section
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

      // If we are at the bottom of the page, default to downloads
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        current = 'downloads';
      }

      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'suite', label: 'Suite' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'features', label: 'Features' },
    { id: 'downloads', label: 'Downloads' },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-200 landing-font-heading"
      style={{
        backgroundColor: 'var(--landing-nav-bg)',
        borderColor: 'var(--landing-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex-shrink-0" style={{ color: 'var(--landing-text-primary)' }}>
            <LivexLogo size={28} />
          </div>
          <span
            className="font-extrabold text-base tracking-tight"
            style={{
              fontFamily: 'var(--studio-font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--landing-text-primary)',
            }}
          >
            Livex
          </span>
        </div>

        {/* Center Nav tabs */}
        <nav
          className="hidden md:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider p-1 rounded-full relative border transition-colors"
          style={{
            backgroundColor: 'var(--landing-surface-subtle)',
            borderColor: 'var(--landing-border)',
            color: 'var(--landing-text-secondary)',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleScrollTo(e, item.id)}
                className="relative px-4 py-1.5 rounded-full transition-colors duration-200"
                style={{
                  color: isActive ? 'var(--landing-text-primary)' : 'var(--landing-text-secondary)',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeLandingTab"
                    className="absolute inset-0 rounded-full -z-10 shadow-sm"
                    style={{
                      backgroundColor: 'var(--landing-surface-card)',
                      border: '1px solid var(--landing-border)',
                    }}
                    transition={
                      isReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                    }
                  />
                )}
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Theme Switcher & Use Web CTA */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Segmented Theme Switcher */}
          <div
            className="flex items-center p-1 rounded-full border transition-colors"
            style={{
              backgroundColor: 'var(--landing-surface-subtle)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <button
              type="button"
              onClick={() => settingsController.setThemeMode('light')}
              title="Light theme"
              aria-label="Light theme"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'light' ? 'var(--landing-surface-card)' : 'transparent',
                color: currentMode === 'light' ? 'var(--landing-text-primary)' : 'var(--landing-text-muted)',
                boxShadow: currentMode === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Light</span>
            </button>

            <button
              type="button"
              onClick={() => settingsController.setThemeMode('dark')}
              title="Dark theme"
              aria-label="Dark theme"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'dark' ? 'var(--landing-surface-card)' : 'transparent',
                color: currentMode === 'dark' ? 'var(--landing-text-primary)' : 'var(--landing-text-muted)',
                boxShadow: currentMode === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => settingsController.setThemeMode('amoled')}
              title="AMOLED theme"
              aria-label="AMOLED theme"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: currentMode === 'amoled' ? 'var(--landing-surface-card)' : 'transparent',
                color: currentMode === 'amoled' ? 'var(--landing-text-primary)' : 'var(--landing-text-muted)',
                boxShadow: currentMode === 'amoled' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">AMOLED</span>
            </button>
          </div>

          {/* Launch Web Button */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('livex:entered_from_landing', 'true');
              navigateTo('/app');
            }}
            className="h-9 px-3.5 sm:px-4 rounded-full text-[11px] uppercase font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--landing-cta-bg)',
              color: 'var(--landing-cta-text)',
            }}
          >
            <span className="hidden sm:inline">Use Web</span>
            <span className="sm:hidden">Web</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
