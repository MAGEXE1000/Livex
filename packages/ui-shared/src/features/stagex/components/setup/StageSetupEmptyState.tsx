import React from 'react';
import { useSettingsStore } from '@workspace/studio-core';

export interface StageSetupEmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
  isLight?: boolean;
}

export const StageSetupEmptyState: React.FC<StageSetupEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  iconColor,
  isLight: isLightProp,
}) => {
  const activeVis = useSettingsStore((s) => s.settings.perApp?.stagex);
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;

  const defaultIconColor = isLight ? 'var(--c-text-primary, #09090b)' : '#ffffff';
  const effectiveIconColor = iconColor || defaultIconColor;

  return (
    <div
      className="w-full py-8 px-4 rounded-[20px] border flex flex-col items-center justify-center text-center my-2"
      style={{
        backgroundColor: isLight
          ? 'rgba(0, 0, 0, 0.02)'
          : 'var(--c-bg-card, rgba(20, 20, 26, 0.50))',
        borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'var(--c-border, rgba(255, 255, 255, 0.06))',
      }}
    >
      <div
        className="w-12 h-12 rounded-[16px] flex items-center justify-center mb-3 border shadow-sm"
        style={{
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
          borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ color: effectiveIconColor }}
        >
          {icon}
        </span>
      </div>

      <h4
        className="text-[14px] font-bold tracking-tight mb-1"
        style={{
          color: isLight ? 'var(--c-text-primary, #09090b)' : '#ffffff',
          fontFamily: 'var(--studio-font-display)',
        }}
      >
        {title}
      </h4>

      <p
        className="text-[12px] max-w-xs leading-relaxed mb-4"
        style={{ color: isLight ? 'var(--c-text-secondary, #71717a)' : '#a1a1aa' }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          style={{
            backgroundColor: isLight ? '#09090b' : '#ffffff',
            color: isLight ? '#ffffff' : '#09090b',
          }}
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
