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
            style={
              isWebDesktop
                ? {
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: active
                      ? 'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))'
                      : 'var(--c-surface-low)',
                    color: active ? 'var(--color-on-tertiary, #ffffff)' : 'var(--c-text-secondary)',
                    border: active
                      ? '1px solid var(--studio-accent-border)'
                      : '1px solid var(--c-border)',
                    boxShadow: active ? 'var(--studio-accent-glow)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                  }
                : {
                    width: 'var(--btn-size-md, 42px)',
                    height: 'var(--btn-size-md, 42px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-compact, 12px)',
                    border: active
                      ? `2px solid ${acc.from}`
                      : '1px solid var(--track, var(--c-border))',
                    background: active
                      ? `linear-gradient(135deg, ${acc.from}22, ${acc.to}18)`
                      : 'var(--app-surface-low)',
                    color: active ? acc.from : 'var(--c-text-secondary, var(--muted))',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                  }
            }
          >
            <AnimatedNavigationIcon
              itemKey={value}
              iconName={iconName}
              size={isWebDesktop ? 18 : 20}
              isActive={active}
              color={
                isWebDesktop
                  ? 'currentColor'
                  : active
                    ? acc.from
                    : 'var(--c-text-secondary)'
              }
            />
          </button>
        );
      })}
    </div>
  );
}
