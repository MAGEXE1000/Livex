import React from 'react';
import { useIsWebDesktop, resolveAccent } from '@workspace/livex-core';
import { AnimatedNavigationIcon } from '../../features/hub/navigation/AnimatedNavigationIcon';

export interface StartOnOption<T extends string> {
  value: T;
  iconName: string;
  label?: string;
  testId?: string;
}

export interface StartOnSelectorProps<T extends string> {
  currentValue: T;
  options: StartOnOption<T>[];
  onChange: (value: T) => void;
  accentColor?: string;
}

export function StartOnSelector<T extends string>({
  currentValue,
  options,
  onChange,
  accentColor,
}: StartOnSelectorProps<T>) {
  const isWebDesktop = useIsWebDesktop();
  const acc = resolveAccent(accentColor);

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {options.map(({ value, iconName, label, testId }) => {
        const active = currentValue === value;
        return (
          <button
            key={value}
            type="button"
            data-testid={testId}
            onClick={() => onChange(value)}
            title={label}
            aria-label={label || value}
            className={
              isWebDesktop
                ? 'w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-all'
                : 'touch-target-44'
            }
            style={{
              width: isWebDesktop ? 36 : 'var(--btn-size-md, 42px)',
              height: isWebDesktop ? 36 : 'var(--btn-size-md, 42px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isWebDesktop ? 8 : 'var(--radius-compact, 12px)',
              background: active
                ? 'var(--studio-accent-gradient, linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to)))'
                : 'var(--c-surface-low, rgba(128, 128, 128, 0.08))',
              color: active
                ? 'var(--studio-accent-contrast, #09090b)'
                : 'var(--c-text-secondary, var(--muted))',
              border: active
                ? '1px solid var(--studio-accent-border, transparent)'
                : '1px solid var(--track, var(--c-border))',
              boxShadow: active
                ? '0 2px 8px color-mix(in srgb, var(--studio-accent-to) 25%, transparent)'
                : 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
          >
            <AnimatedNavigationIcon
              itemKey={value}
              iconName={iconName}
              size={isWebDesktop ? 18 : 20}
              isActive={active}
              color={
                active
                  ? 'var(--studio-accent-contrast, #09090b)'
                  : 'var(--c-text-secondary)'
              }
            />
          </button>
        );
      })}
    </div>
  );
}
