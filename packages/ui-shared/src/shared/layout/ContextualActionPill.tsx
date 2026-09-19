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
      className={`contextual-action-pill pointer-events-auto flex items-center p-0.5 rounded-full ${className}`}
      style={{
        background: isAmoled
          ? 'rgba(10, 10, 12, 0.88)'
          : isLight
            ? 'rgba(0, 0, 0, 0.04)'
            : 'rgba(255, 255, 255, 0.06)',
        border: isAmoled
          ? '1px solid rgba(255, 255, 255, 0.12)'
          : isLight
            ? '1px solid rgba(0, 0, 0, 0.08)'
            : '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: 'var(--btn-surface-shadow, 0 1px 3px rgba(0,0,0,0.12))',
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
                    : 'rgba(255, 255, 255, 0.14)'
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
                  height: '14px',
                  background: isLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.12)',
                  flexShrink: 0,
                  margin: '0 1px',
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
