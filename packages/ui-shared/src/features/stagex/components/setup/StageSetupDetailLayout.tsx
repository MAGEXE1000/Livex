import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SharedFloatingHeader } from '../../../../shared/layout/StudioLayoutSystem';
import { useOverscrollSpring } from '../../../../shared/layout/useOverscrollSpring';
import { useSettingsStore } from '@workspace/livex-core';

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

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  useOverscrollSpring({ scrollContainerRef: scrollRef });

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
        scrollContainerRef={scrollRef}
      />

      {/* Continuous Scrolling Content Area with Safe-Area Insets */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto w-full h-full relative"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 92px)',
          paddingBottom:
            'calc(var(--content-bottom-pad, 88px) + env(safe-area-inset-bottom, 0px) + 32px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 'var(--content-max-w)',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box',
            paddingLeft: 'var(--page-inset-h)',
            paddingRight: 'var(--page-inset-h)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
