'use client';
// Unified three-state theme toggle using shadcn @toggles/around and @toggles/eclipse
// Cycle: WHITE -> BLACK -> AMOLED -> WHITE -> BLACK -> AMOLED -> ...

import { useSettingsStore, settingsController } from '@workspace/livex-core';
import { useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Around } from '../ui/around';
import { Eclipse } from '../ui/eclipse';
import { cn } from '../../lib/utils';

export type UnifiedThemeMode = 'white' | 'black' | 'amoled';

export type ThemeVariant = 'rectangle' | 'circle' | 'circle-blur' | 'blinds';

export type RectStart =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-up';

export interface ThemeToggleProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick'
> {
  /** Animation variant (retained for backward compatibility). Default: "rectangle". */
  variant?: ThemeVariant;
  /** Origin direction for reveal (retained for backward compatibility). Default: "bottom-up". */
  start?: RectStart;
  iconClassName?: string;
  duration?: number;
}

export function useThemeToggle({
  variant = 'rectangle',
  start = 'bottom-up',
}: { variant?: ThemeVariant; start?: RectStart } = {}) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const amoledMode = useSettingsStore((s) => s.settings.amoledMode);
  const language = useSettingsStore((s) => s.settings.language);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)')?.matches);

  // Canonical three-state mode — single source of truth for visual icon + aria label.
  const themeMode: UnifiedThemeMode = !mounted
    ? 'black'
    : isLight
      ? 'white'
      : amoledMode
        ? 'amoled'
        : 'black';

  const toggle = () => {
    settingsController.cycleNextTheme();
  };

  const isSpanish = (language ?? 'en') === 'es';

  const label = isSpanish
    ? themeMode === 'white'
      ? 'Tema: Blanco'
      : themeMode === 'black'
        ? 'Tema: Negro'
        : 'Tema: AMOLED'
    : themeMode === 'white'
      ? 'Theme: White'
      : themeMode === 'black'
        ? 'Theme: Black'
        : 'Theme: AMOLED';

  const nextMode: UnifiedThemeMode =
    themeMode === 'white'
      ? 'black'
      : themeMode === 'black'
        ? 'amoled'
        : 'white';

  const actionHint = isSpanish
    ? nextMode === 'black'
      ? 'Cambiar a modo Negro'
      : nextMode === 'amoled'
        ? 'Cambiar a modo AMOLED'
        : 'Cambiar a modo Blanco'
    : nextMode === 'black'
      ? 'Switch to Black theme'
      : nextMode === 'amoled'
        ? 'Switch to AMOLED theme'
        : 'Switch to White theme';

  return {
    themeMode,
    mounted,
    toggle,
    label,
    actionHint,
    fullAriaLabel: `${label}. ${actionHint}`,
  };
}

export function ThemeToggle({
  variant = 'rectangle',
  start = 'bottom-up',
  className,
  iconClassName = 'w-5 h-5',
  duration = 350,
  ...rest
}: ThemeToggleProps) {
  const { themeMode, mounted, toggle, label, actionHint } = useThemeToggle({ variant, start });

  const ariaLabel = rest['aria-label'] ?? label;
  const buttonTitle = rest.title ?? `${label}. ${actionHint}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={buttonTitle}
      onClick={toggle}
      data-theme-mode={themeMode}
      data-testid="theme-toggle"
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden shrink-0 select-none cursor-pointer',
        className
      )}
      {...rest}
    >
      {mounted ? (
        <AnimatePresence mode="popLayout" initial={false}>
          {themeMode === 'amoled' ? (
            <motion.span
              key="eclipse"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="inline-flex items-center justify-center shrink-0"
            >
              <Eclipse
                as="span"
                toggled={true}
                duration={duration}
                svgClassName={iconClassName}
              />
            </motion.span>
          ) : (
            <motion.span
              key="around"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="inline-flex items-center justify-center shrink-0"
            >
              <Around
                as="span"
                toggled={themeMode === 'black'}
                duration={duration}
                svgClassName={iconClassName}
              />
            </motion.span>
          )}
        </AnimatePresence>
      ) : (
        <span className={iconClassName} aria-hidden="true" />
      )}
    </button>
  );
}

