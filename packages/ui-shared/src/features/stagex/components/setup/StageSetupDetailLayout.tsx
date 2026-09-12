import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SharedFloatingHeader } from '../../../../shared/layout/StudioLayoutSystem';
import { useSettingsStore } from '@workspace/studio-core';

export interface StageSetupDetailLayoutProps {
  title: string;
  onBack: () => void;
  toolbarActions?: React.ReactNode;
  isLight?: boolean;
  isAmoled?: boolean;
  children: React.ReactNode;
}

export const StageSetupDetailLayout: React.FC<StageSetupDetailLayoutProps> = ({
  title,
  onBack,
  toolbarActions,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
  children,
}) => {
  const { activeVis, amoledMode } = useSettingsStore(
    useShallow((s) => ({
      activeVis: s.settings.perApp?.stagex,
      amoledMode: s.settings.amoledMode,
    }))
  );
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && (amoledMode || activeVis?.amoledMode);

  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col"
      style={{
        background: isLight
          ? 'var(--app-bg, #f4f4f5)'
          : isAmoled
            ? '#000000'
            : 'var(--app-bg, #09090b)',
      }}
    >
      {/* Canonical Stagex Detail Floating Topbar */}
      <SharedFloatingHeader
        title={title}
        onBack={onBack}
        hideBack={false}
        backBtnTestId="stage-setup-back-btn"
        toolbarActions={toolbarActions}
        isLight={isLight}
        isAmoled={isAmoled}
      />

      {/* Continuous Scrolling Content Area with Safe-Area Insets */}
      <div
        className="flex-1 overflow-y-auto w-full h-full relative"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 80px)',
          paddingBottom:
            'calc(var(--content-bottom-pad, 88px) + env(safe-area-inset-bottom, 0px) + 32px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
};
