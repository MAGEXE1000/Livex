import React, { forwardRef, useState } from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/livex-core';
import { StudioIcon } from '../icons/StudioIcon';

// ── 6. Input ───────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  desc?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, desc, error, style, className = '', onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--c-text-secondary)',
              fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
            }}
          >
            {label}
          </span>
        )}
        <input
          ref={ref}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            padding: '11px 14px',
            borderRadius: '14px',
            fontSize: '13.5px',
            fontFamily: 'var(--type-body-font, var(--studio-font-body))',
            backgroundColor: 'var(--c-surface-lowest)',
            border: error
              ? '1px solid var(--c-error, #ef4444)'
              : focused
                ? '1px solid var(--c-accent-from, #7c3aed)'
                : '1px solid var(--c-border)',
            boxShadow: error
              ? '0 0 0 3px rgba(239, 68, 68, 0.20)'
              : focused
                ? '0 0 0 3px var(--studio-accent-soft, rgba(124, 58, 237, 0.25))'
                : 'var(--elevation-low)',
            color: 'var(--c-text-primary)',
            outline: 'none',
            transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
            boxSizing: 'border-box',
            ...style,
          }}
          className={`studio-input ${className}`}
          {...props}
        />
        {desc && !error && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--c-text-secondary)',
              fontFamily: 'var(--type-meta-font, var(--studio-font-body))',
              opacity: 0.8,
            }}
          >
            {desc}
          </span>
        )}
        {error && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--c-error, #ef4444)',
              fontWeight: 600,
              fontFamily: 'var(--type-meta-font, var(--studio-font-body))',
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ── Search Bar ───────────────────────────────────────────────────────────────
export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  accent?: { from: string; to: string; mid: string };
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      onClear,
      accent,
      value,
      onChange,
      style,
      className = '',
      placeholder,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const showClear = value && value.toString().length > 0 && onClear;
    const activeAccent = accent?.from || 'var(--c-accent-from, #7c3aed)';

    return (
      <div
        className={`relative w-full ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Top Specular Rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 14,
            right: 14,
            height: '1px',
            background:
              'var(--surface-glass-rim, linear-gradient(90deg, transparent, var(--c-border), transparent))',
            pointerEvents: 'none',
            opacity: focused ? 0.9 : 0.5,
            zIndex: 6,
          }}
        />

        <StudioIcon
          name="search"
          size={20}
          className="absolute left-4 pointer-events-none"
          style={{
            color: focused ? activeAccent : 'var(--c-text-secondary)',
            zIndex: 5,
            transition: 'color 200ms ease',
          }}
        />
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            width: '100%',
            height: '46px',
            padding: '10px 44px 10px 46px',
            borderRadius: '9999px',
            backgroundColor: 'var(--surface-topbar-bg)',
            border: focused ? `1px solid ${activeAccent}` : '1px solid var(--c-border)',
            color: 'var(--c-text-primary)',
            fontSize: '13.5px',
            fontFamily: 'var(--type-body-font, var(--studio-font-body))',
            outline: 'none',
            transition: 'all 240ms cubic-bezier(0.2, 0, 0, 1)',
            boxShadow: focused
              ? `0 0 0 3px var(--studio-accent-soft), var(--elevation-mid)`
              : 'var(--elevation-low)',
            backdropFilter: 'var(--surface-topbar-blur, blur(16px))',
            WebkitBackdropFilter: 'var(--surface-topbar-blur, blur(16px))',
            boxSizing: 'border-box',
            ...style,
          }}
          {...props}
        />
        {showClear && (
          <motion.button
            onClick={onClear}
            type="button"
            aria-label="Clear search"
            whileTap={{ scale: 0.9 }}
            transition={SpringPresets.soft}
            className="absolute right-3.5 outline-none cursor-pointer flex items-center justify-center"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--app-surface-high)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <StudioIcon name="close" size={15} aria-hidden="true" />
          </motion.button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
