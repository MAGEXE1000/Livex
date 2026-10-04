import React from 'react';
import { motion } from 'motion/react';

export type SongViewMode = 'chords' | 'lyrics' | 'both';

export interface SongViewModeSelectorProps {
  mode: SongViewMode;
  onChange: (mode: SongViewMode) => void;
  testIdPrefix?: string;
  className?: string;
  style?: React.CSSProperties;
}

const MODES: { id: SongViewMode; label: string }[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'both', label: 'Both' },
];

export const SongViewModeSelector: React.FC<SongViewModeSelectorProps> = ({
  mode,
  onChange,
  testIdPrefix = 'view-mode',
  className = '',
  style,
}) => {
  return (
    <div
      data-purpose="view-mode-selector"
      className={`inline-flex items-center p-0.5 rounded-full border shadow-xs select-none ${className}`}
      style={{
        backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
        borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
        position: 'relative',
        ...style,
      }}
    >
      {MODES.map(({ id, label }) => {
        const isActive = mode === id;
        return (
          <motion.button
            key={id}
            type="button"
            data-testid={`${testIdPrefix}-${id}`}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.95 }}
            className="relative px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-colors duration-150 cursor-pointer select-none"
            style={{
              color: isActive ? 'var(--studio-accent-contrast, #09090b)' : 'var(--c-text-muted, #8A92A6)',
              zIndex: 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="song-mode-selector-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: 'var(--studio-accent, #ffffff)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  zIndex: -1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                }}
              />
            )}
            {label}
          </motion.button>
        );
      })}
    </div>
  );
};
