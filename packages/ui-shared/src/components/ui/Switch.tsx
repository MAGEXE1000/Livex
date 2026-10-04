import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Canonical Livex switch (single source of truth for every toggle in the app).
 * ON  : solid white track + solid black circular thumb.
 * OFF : dark translucent track + neutral thumb.
 * Dependency-free (no Radix) so it renders identically in Web and the Android WebView.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, disabled, onClick, ...props },
  ref
) {
  const state = checked ? 'checked' : 'unchecked';
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={state}
      data-toggle="switch"
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={cn(
        'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-white data-[state=unchecked]:bg-neutral-800 dark:data-[state=unchecked]:bg-neutral-800/80',
        'data-[state=checked]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] dark:data-[state=checked]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]',
        className
      )}
      {...props}
    >
      <span
        data-state={state}
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          'data-[state=checked]:bg-black data-[state=unchecked]:bg-neutral-400 dark:data-[state=unchecked]:bg-neutral-300'
        )}
      />
    </button>
  );
});

export default Switch;
