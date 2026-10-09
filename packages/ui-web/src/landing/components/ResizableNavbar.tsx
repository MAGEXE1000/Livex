import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { LivexLogo } from '@workspace/ui-shared';
import { useSettingsStore, useStudioPreferences, settingsController } from '@workspace/livex-core';
import { Sun, Moon, Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

export interface ResizableNavbarProps {
  navigateTo: (path: string) => void;
}

export default function ResizableNavbar({ navigateTo }: ResizableNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  const theme = useSettingsStore((s) => s.settings.theme);
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (latest > 45 && !isScrolled) {
      setIsScrolled(true);
    } else if (latest <= 45 && isScrolled) {
      setIsScrolled(false);
    }
  });

  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const toggleTheme = () => {
    // Suppress transitions during theme change per better-ui craft guidelines
    const css = document.createElement('style');
    css.type = 'text/css';
    css.appendChild(
      document.createTextNode(
        `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
      )
    );
    document.head.appendChild(css);
    const next = isLight ? 'dark' : 'light';
    settingsController.setThemeMode(next);
    window.getComputedStyle(document.body).opacity;
    setTimeout(() => {
      document.head.removeChild(css);
    }, 50);
  };

  const navLinks = [
    { label: 'Workstations', href: '#modules' },
    { label: 'Showcase', href: '#showcase' },
    { label: 'Architecture', href: '#bento' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none px-4 pt-3 md:pt-4">
        <motion.nav
          initial={false}
          animate={{
            width: isScrolled ? 'min(92%, 760px)' : 'min(96%, 1040px)',
            height: isScrolled ? '52px' : '62px',
            y: isScrolled ? 4 : 0,
            backgroundColor: isScrolled ? 'rgba(5, 5, 5, 0.82)' : 'rgba(10, 10, 10, 0.65)',
            borderColor: isScrolled ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="pointer-events-auto flex items-center justify-between px-3 md:px-5 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[box-shadow] duration-200 select-none"
        >
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
              }}
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full group"
              aria-label="Livex Audio Workspace Home"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/15 flex items-center justify-center group-hover:border-white/30 transition-colors">
                <LivexLogo size={18} />
              </div>
              <span className="font-mono text-xs tracking-[0.16em] uppercase font-bold text-white group-hover:text-zinc-200 transition-colors">
                Livex
              </span>
            </button>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-medium bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              v4.0
            </span>
          </div>

          {/* Center: Navigation Anchors (Desktop) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={() => navigateTo('/privacy')}
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              Privacy
            </button>
          </div>

          {/* Right: Actions Cluster */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Launch App Primary Action */}
            <button
              onClick={() => navigateTo('/app')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 md:px-4 md:py-1.5 rounded-full bg-white text-black text-xs font-medium tracking-tight hover:bg-zinc-200 active:scale-[0.96] transition-all duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span>Launch App</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 inset-x-4 z-40 md:hidden p-5 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/privacy');
                }}
                className="text-left px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] rounded-xl transition-colors"
              >
                Privacy Policy
              </button>
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/app');
                }}
                className="w-full py-2.5 rounded-full bg-white text-black text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
              >
                <span>Launch Web Workstation</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
