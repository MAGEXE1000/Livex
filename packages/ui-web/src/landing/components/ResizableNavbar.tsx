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
            width: isScrolled ? 'min(92%, 720px)' : 'min(96%, 980px)',
            height: isScrolled ? '52px' : '60px',
            y: isScrolled ? 4 : 0,
            backgroundColor: isScrolled
              ? isLight
                ? 'rgba(255, 255, 255, 0.88)'
                : 'rgba(5, 5, 5, 0.82)'
              : isLight
                ? 'rgba(255, 255, 255, 0.75)'
                : 'rgba(10, 10, 10, 0.65)',
            borderColor: isScrolled
              ? isLight
                ? 'rgba(0, 0, 0, 0.12)'
                : 'rgba(255, 255, 255, 0.14)'
              : isLight
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.08)',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="pointer-events-auto flex items-center justify-between px-3 md:px-5 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[box-shadow] duration-200 select-none"
        >
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
              }}
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/40 rounded-full group cursor-pointer"
              aria-label="Livex Audio Workspace Home"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 flex items-center justify-center group-hover:border-zinc-300 dark:group-hover:border-white/30 transition-colors">
                <LivexLogo size={18} />
              </div>
              <span className="font-mono text-xs tracking-[0.16em] uppercase font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                Livex
              </span>
            </button>
          </div>

          {/* Center: Navigation Anchors (Desktop) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.06] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={() => navigateTo('/privacy')}
              className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30 cursor-pointer"
            >
              Privacy
            </button>
          </div>

          {/* Right: Actions Cluster */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/40 cursor-pointer"
              aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/40 cursor-pointer"
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
            className="fixed top-16 inset-x-4 z-40 md:hidden p-5 rounded-3xl bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/privacy');
                }}
                className="text-left px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            </div>
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/app');
                }}
                className="w-full py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer shadow-sm"
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
