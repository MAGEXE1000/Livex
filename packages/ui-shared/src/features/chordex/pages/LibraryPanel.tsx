import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useScrollHide } from '@workspace/studio-core';
import { EmptyState } from '../../../shared/design-system/StudioDesignSystem';
import { StudioPageTransition } from '../../../components/StudioPageTransition';
import { useLibraryState } from './useLibraryState';
import { LibraryMainView, LibraryChordDetail, CategoryScreenView } from './LibraryUI';

const SongPracticeView = lazy(() =>
  import('./SongPracticeView').then((m) => ({ default: m.SongPracticeView }))
);
const SaxophonePracticePanel = lazy(() =>
  import('./SaxophonePracticePanel').then((m) => ({ default: m.SaxophonePracticePanel }))
);
const CustomChordBuilder = lazy(() => import('../components/CustomChordBuilder'));
const ProgressionGenerator = lazy(() => import('../components/ProgressionGenerator'));

export default function LibraryPanel() {
  const state = useLibraryState();

  const {
    settings,
    isWebDesktop,
    selectedChordId,
    selectChord,
    showFinder,
    setShowFinder,
    showGenerator,
    setShowGenerator,
    activePracticeSong,
    setActivePracticeSong,
    accent,
    chord,
  } = state;

  useScrollHide(state.scrollRef);

  if (settings.instrument === 'saxophone') {
    return (
      <Suspense fallback={null}>
        <SaxophonePracticePanel />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden app-bg" style={{ position: 'relative' }}>
      {isWebDesktop ? (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
          {/* Left Column: Explorer */}
          <div
            style={{
              width: '420px',
              minWidth: '380px',
              maxWidth: '480px',
              borderRight: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <LibraryMainView state={state} />
          </div>
          {/* Right Column: Interactive Chord Preview */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {chord ? (
              <LibraryChordDetail state={state} />
            ) : state.chordOfTheDay ? (
              <LibraryChordDetail
                state={{ ...state, chord: state.chordOfTheDay }}
                isDefaultPreview={true}
              />
            ) : (
              <EmptyState message="Select a chord to view details" icon="music_note" />
            )}
          </div>
        </div>
      ) : (
        // Mobile view - unified canonical drilldown transitions
        (() => {
          const activeMobileView = selectedChordId
            ? 'detail'
            : state.activeType
              ? 'category'
              : 'main';
          return (
            <div
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <StudioPageTransition
                pageKey={activeMobileView}
                variant="drilldown"
                className="w-full h-full flex flex-col"
              >
                {activeMobileView === 'detail' && (
                  <LibraryChordDetail state={state} onBack={() => selectChord(null)} />
                )}
                {activeMobileView === 'category' && (
                  <CategoryScreenView
                    activeType={state.activeType!}
                    setActiveType={state.setActiveType}
                    activeCategoryObject={state.activeCategoryObject}
                    filteredByType={state.filteredByType}
                    selectedRootFilter={state.selectedRootFilter}
                    setSelectedRootFilter={state.setSelectedRootFilter}
                    categoryQuery={state.categoryQuery}
                    setCategoryQuery={state.setCategoryQuery}
                    handleChordClick={state.handleChordClick}
                    accent={accent}
                    isLight={state.isLight}
                    tuning={settings?.tuning}
                    scrollRef={state.scrollRef}
                  />
                )}
                {activeMobileView === 'main' && <LibraryMainView state={state} />}
              </StudioPageTransition>
            </div>
          );
        })()
      )}

      {/* Floating Action Modals */}
      {showFinder && (
        <Suspense fallback={null}>
          <CustomChordBuilder accent={accent} mode="find" onClose={() => setShowFinder(false)} />
        </Suspense>
      )}
      {showGenerator && (
        <Suspense fallback={null}>
          <ProgressionGenerator accent={accent} onClose={() => setShowGenerator(false)} />
        </Suspense>
      )}

      <AnimatePresence>
        {activePracticeSong && (
          <StudioPageTransition
            pageKey={activePracticeSong.id}
            variant="drilldown"
            style={{ position: 'fixed', inset: 0, zIndex: 100000 }}
          >
            <Suspense fallback={null}>
              <SongPracticeView
                song={activePracticeSong}
                onClose={() => setActivePracticeSong(null)}
              />
            </Suspense>
          </StudioPageTransition>
        )}
      </AnimatePresence>
    </div>
  );
}
