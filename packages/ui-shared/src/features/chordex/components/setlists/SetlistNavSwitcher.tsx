import React from 'react';
import { motion } from 'motion/react';

interface SetlistNavSwitcherProps {
  activeTab: 'all' | 'setlists';
  onTabChange: (tab: 'all' | 'setlists') => void;
  songsCount: number;
  setlistsCount: number;
  accentColor?: string;
}

export const SetlistNavSwitcher: React.FC<SetlistNavSwitcherProps> = ({
  activeTab,
  onTabChange,
  songsCount,
  setlistsCount,
  accentColor = '#2563EB',
}) => {
  return (
    <div
      className="flex items-center justify-center w-full px-4 mb-3 select-none"
      data-purpose="songs-setlists-switcher"
    >
      <div
        className="flex items-center p-1 rounded-full border shadow-sm"
        style={{
          backgroundColor: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.05))',
          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={() => onTabChange('all')}
          data-testid="tab-all-songs"
          className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-colors cursor-pointer"
          style={{
            color:
              activeTab === 'all'
                ? '#FFFFFF'
                : 'var(--c-text-secondary, rgba(255, 255, 255, 0.6))',
          }}
        >
          {activeTab === 'all' && (
            <motion.div
              layoutId="songs-nav-pill"
              className="absolute inset-0 rounded-full shadow-md"
              style={{
                backgroundColor: accentColor,
                zIndex: 0,
              }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="material-symbols-rounded text-base relative z-10">library_music</span>
          <span className="relative z-10">All Songs</span>
          <span
            className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{
              backgroundColor:
                activeTab === 'all'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'var(--surface-card-bg, rgba(255, 255, 255, 0.1))',
              color: activeTab === 'all' ? '#FFFFFF' : 'var(--c-text-muted, #94A3B8)',
            }}
          >
            {songsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('setlists')}
          data-testid="tab-setlists"
          className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-colors cursor-pointer"
          style={{
            color:
              activeTab === 'setlists'
                ? '#FFFFFF'
                : 'var(--c-text-secondary, rgba(255, 255, 255, 0.6))',
          }}
        >
          {activeTab === 'setlists' && (
            <motion.div
              layoutId="songs-nav-pill"
              className="absolute inset-0 rounded-full shadow-md"
              style={{
                backgroundColor: accentColor,
                zIndex: 0,
              }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="material-symbols-rounded text-base relative z-10">queue_music</span>
          <span className="relative z-10">Setlists</span>
          <span
            className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{
              backgroundColor:
                activeTab === 'setlists'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'var(--surface-card-bg, rgba(255, 255, 255, 0.1))',
              color: activeTab === 'setlists' ? '#FFFFFF' : 'var(--c-text-muted, #94A3B8)',
            }}
          >
            {setlistsCount}
          </span>
        </button>
      </div>
    </div>
  );
};
