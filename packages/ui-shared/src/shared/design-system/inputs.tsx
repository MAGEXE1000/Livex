import React, { forwardRef, useState } from 'react';
import { motion } from 'motion/react';
import { SpringPresets } from '@workspace/livex-core';
import { StudioIcon } from '../icons/StudioIcon';
import { IosSearchBar, type IosSearchBarProps, type IosSearchBarHandle } from '../../components/ui/IosSearchBar';

export { IosSearchBar, type IosSearchBarProps, type IosSearchBarHandle };

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
      value = '',
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
    return (
      <IosSearchBar
        value={typeof value === 'string' ? value : String(value ?? '')}
        onChange={(val) => {
          if (onChange) {
            const syntheticEvent = {
              target: { value: val },
              currentTarget: { value: val },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        }}
        onClear={onClear}
        placeholder={placeholder}
        accent={accent}
        className={className}
        style={style}
        onFocus={onFocus ? () => onFocus({} as React.FocusEvent<HTMLInputElement>) : undefined}
        onBlur={onBlur ? () => onBlur({} as React.FocusEvent<HTMLInputElement>) : undefined}
        disabled={props.disabled}
        autoFocus={props.autoFocus}
        id={props.id}
        name={props.name}
        data-testid={props['data-testid']}
        data-purpose={props['data-purpose']}
      />
    );
  }
);

SearchBar.displayName = 'SearchBar';

