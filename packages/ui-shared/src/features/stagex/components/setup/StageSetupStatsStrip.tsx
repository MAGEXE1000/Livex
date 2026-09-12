import React from 'react';
import { useSettingsStore } from '@workspace/studio-core';

export interface SetupStatItem {
  label: string;
  value: string | number;
  accentColor?: string;
  sublabel?: string;
}

export interface StageSetupStatsStripProps {
  items: SetupStatItem[];
  isLight?: boolean;
}

export const StageSetupStatsStrip: React.FC<StageSetupStatsStripProps> = ({
  items,
  isLight: isLightProp,
}) => {
  const activeVis = useSettingsStore((s) => s.settings.perApp?.stagex);
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;

  return (
    <div
      className={`grid gap-2.5 mb-5 ${
        items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          className="p-3 rounded-[18px] border flex flex-col justify-center transition-all"
          style={{
            backgroundColor: isLight
              ? 'rgba(0, 0, 0, 0.03)'
              : 'var(--c-bg-card, rgba(20, 20, 26, 0.75))',
            borderColor: isLight
              ? 'rgba(0, 0, 0, 0.06)'
              : 'var(--c-border, rgba(255, 255, 255, 0.07))',
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider truncate"
            style={{ color: isLight ? 'var(--c-text-secondary, #71717a)' : '#a1a1aa' }}
          >
            {item.label}
          </span>
          <p
            className="text-[19px] font-black tracking-tight mt-0.5 leading-tight truncate"
            style={{
              color: item.accentColor || (isLight ? 'var(--c-text-primary, #09090b)' : '#ffffff'),
              fontFamily: 'var(--studio-font-display)',
            }}
          >
            {item.value}
          </p>
          {item.sublabel && (
            <span
              className="text-[10px] mt-0.5 truncate"
              style={{ color: isLight ? '#71717a' : '#71717a' }}
            >
              {item.sublabel}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
