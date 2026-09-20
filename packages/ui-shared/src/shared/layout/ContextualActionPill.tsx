import React from 'react';
import { motion } from 'motion/react';
import { SpringPresets, useSettingsStore, useShallow } from '@workspace/livex-core';

export interface ContextualActionItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  active?: boolean;
  dataPurpose?: string;
}

export interface ContextualActionPillProps {
  items: ContextualActionItem[];
  isLight?: boolean;
  isAmoled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Canonical compact icon-first navigation pill matching the Stagex floating pill language.
 * Reusable across Chordex, Drumex, Stagex, Groovex, and Vocalex.
 */
export const ContextualActionPill: React.FC<ContextualActionPillProps> = ({
  items,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
  className = '',
  style,
}) => {
  const { theme, amoledMode } = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
    }))
  );
  const isLight = isLightProp !== undefined ? isLightProp : theme === 'light';
  const isAmoled = isAmoledProp !== undefined ? isAmoledProp : amoledMode;
  return (
    <div
      data-testid="contextual-action-pill"
      className={`contextual-action-pill pointer-events-auto flex items-center rounded-full ${className}`}
      style={{
        height: 38,
        padding: '0 3px',
        background: 'var(--surface-pill-bg)',
        border: 'var(--surface-pill-border)',
        backdropFilter: 'var(--surface-pill-backdrop)',
        WebkitBackdropFilter: 'var(--surface-pill-backdrop)',
        boxShadow: 'var(--surface-pill-shadow)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            <motion.button
              type="button"
              data-testid={item.testId}
              data-purpose={item.dataPurpose}
              onClick={item.onClick}
              aria-label={item.label}
              title={item.label}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              transition={SpringPresets.soft}
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: item.active
                  ? isLight
                    ? 'rgba(0, 0, 0, 0.08)'
                    : 'rgba(255, 255, 255, 0.16)'
                  : 'transparent',
                border: 'none',
                color: isLight
                  ? 'var(--c-text-primary, #0f172a)'
                  : 'var(--c-text-primary, #f8fafc)',
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {/* Ergonomic touch hit area expansion (>= 44px) */}
              <span
                style={{
                  position: 'absolute',
                  inset: '-6px',
                  pointerEvents: 'auto',
                  borderRadius: '50%',
                }}
              />
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  color: 'inherit',
                }}
              >
                {item.icon}
              </span>
            </motion.button>
            {!isLast && (
              <div
                style={{
                  width: '1px',
                  height: '16px',
                  background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)',
                  flexShrink: 0,
                  margin: '0 2px',
                }}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
