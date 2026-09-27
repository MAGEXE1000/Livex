import React, { useState, useEffect, useCallback } from 'react';
import {
  useBackHandler,
  useT,
  useNavigationStore,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { StudioPageTransition } from '../../../../components/StudioPageTransition';
import { StageSetupHub } from './StageSetupHub';
import { StageRiderView } from './StageRiderView';
import { StageSetlistView } from './StageSetlistView';
import { StageGearView } from './StageGearView';
import { StageMembersView } from './StageMembersView';
import { useStagexStore, type StagexSubView } from '../../state/useStagexStore';

export interface StageSetupContainerProps {
  isActive?: boolean;
  initialSubView?: StagexSubView | 'hub';
  onBackToStage?: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const StageSetupContainer: React.FC<StageSetupContainerProps> = ({
  isActive = true,
  initialSubView = 'hub',
  onBackToStage,
  isLight = false,
  isAmoled = false,
}) => {
  const storeSubView = useStagexStore((s) => s.setupSubView);
  const setStoreSubView = useStagexStore((s) => s.setSetupSubView);

  const [activeSubView, setActiveSubView] = useState<StagexSubView | 'hub'>(
    storeSubView || initialSubView
  );
  const t = useT();
  const tr = t as any;

  // Sync initialSubView or storeSubView changes
  useEffect(() => {
    if (storeSubView) {
      setActiveSubView(storeSubView);
    } else if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [storeSubView, initialSubView]);

  const handleSubViewChange = useCallback((sv: StagexSubView | 'hub') => {
    setActiveSubView(sv);
    setStoreSubView(sv);

    if (sv === 'hub') {
      const current = useNavigationStore.getState().history.slice(-1)[0];
      if (current && (current.subView || current.page !== 'Setup')) {
        NavigationDispatcher.replace({
          app: 'stagex',
          page: 'Setup',
        });
      }
    } else {
      NavigationDispatcher.replace({
        app: 'stagex',
        page: 'Setup',
        subView: sv,
      });
    }
  }, [setStoreSubView]);

  const handleBackFromSubsection = useCallback(() => {
    handleSubViewChange('hub');
  }, [handleSubViewChange]);

  // Handle hardware / system back navigation
  useBackHandler(
    'nested',
    () => {
      if (!isActive) return false;

      // 1. If inside a Setup subsection (rider, setlist, gear, members), back returns to Setup Hub
      if (activeSubView !== 'hub') {
        handleBackFromSubsection();
        return true;
      }

      // 2. If on Setup Hub, back returns to Stage
      if (onBackToStage) {
        onBackToStage();
        return true;
      }

      return false;
    },
    [isActive, activeSubView, handleBackFromSubsection, onBackToStage]
  );

  const subViewTitles: Record<StagexSubView | 'hub', string> = {
    hub: tr.stagex?.setupOptions || tr.stagex?.setupTitle || 'Setup & Options',
    rider:
      tr.stagex?.setup?.rider?.title ||
      tr.stagex?.techRiderTitle ||
      tr.stagex?.techRider ||
      'Technical Rider',
    setlist: tr.stagex?.setup?.setlist?.title || tr.stagex?.setlistTitle || 'Setlist',
    gear:
      tr.stagex?.setup?.gear?.title ||
      tr.stagex?.gearTitle ||
      tr.stagex?.gearInventory ||
      'Gear Inventory',
    members:
      tr.stagex?.setup?.members?.title ||
      tr.stagex?.bandCrewTitle ||
      tr.stagex?.bandMembers ||
      'Band & Crew',
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-transparent">
      {/* Content Area with Canonical StudioPageTransition */}
      <div className="w-full flex-1 relative overflow-hidden">
        <StudioPageTransition
          pageKey={activeSubView}
          variant={activeSubView === 'hub' ? 'tab' : 'drilldown'}
        >
          {activeSubView === 'hub' && (
            <div className="w-full h-full">
              <StageSetupHub
                onSelectSubView={handleSubViewChange}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </div>
          )}

          {activeSubView === 'rider' && (
            <div className="w-full h-full">
              <StageRiderView
                onBack={handleBackFromSubsection}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </div>
          )}

          {activeSubView === 'setlist' && (
            <div className="w-full h-full">
              <StageSetlistView
                onBack={handleBackFromSubsection}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </div>
          )}

          {activeSubView === 'gear' && (
            <div className="w-full h-full">
              <StageGearView
                onBack={handleBackFromSubsection}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </div>
          )}

          {activeSubView === 'members' && (
            <div className="w-full h-full">
              <StageMembersView
                onBack={handleBackFromSubsection}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </div>
          )}
        </StudioPageTransition>
      </div>
    </div>
  );
};
