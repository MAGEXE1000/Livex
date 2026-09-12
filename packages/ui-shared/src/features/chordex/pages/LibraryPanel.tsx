import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useScrollHide, useT } from '@workspace/studio-core';
import { EmptyState } from '../../../shared/design-system/StudioDesignSystem';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { StudioPageTransition } from '../../../components/StudioPageTransition';
import { useLibraryState } from './useLibraryState';
import { LibraryMainView, LibraryChordDetail, CategoryScreenView } from './LibraryUI';

function capitalize(str?: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const SongPracticeView = lazy(() =>
  import('./SongPracticeView').then((m) => ({ default: m.SongPracticeView }))
);
const SaxophonePracticePanel = lazy(() =>
  import('./SaxophonePracticePanel').then((m) => ({ default: m.SaxophonePracticePanel }))
);
const CustomChordBuilder = lazy(() => import('../components/CustomChordBuilder'));

export default function LibraryPanel() {
  const state = useLibraryState();
  const t = useT();

  const {
    settings,
    isWebDesktop,
    selectedChordId,
    selectChord,
    showFinder,
    setShowFinder,
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
          const isDirectChordRoute =
            state.currentRoute?.app === 'chordex' && state.currentRoute?.page === 'chord';
          const activeMobileView = isDirectChordRoute
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

      {/* Morphing Foreground Chord Finder Modal */}
      <MorphingActionSurface
        isOpen={showFinder}
        originRect={state.finderOriginRect}
        placement="center"
        maxWidth={480}
        maxHeight="88vh"
        title={t.chordFinder.title}
        subtitle={t.chordFinder.subtitle}
        onOpenChange={(open) => {
          if (!open) {
            state.closeFinder();
          }
        }}
        contentStyle={{ padding: 0 }}
      >
        <Suspense fallback={null}>
          <CustomChordBuilder
            accent={accent}
            mode="find"
            inMorphSurface={true}
            onClose={() => state.closeFinder()}
          />
        </Suspense>
      </MorphingActionSurface>

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

      {/* Morphing Foreground Chord Detail Popup */}
      <MorphingActionSurface
        isOpen={Boolean(state.modalChordState)}
        originRect={state.modalChordState?.originRect}
        placement="center"
        maxWidth={440}
        maxHeight="86vh"
        title={
          state.displayModalChord
            ? `${state.displayModalChord.name} ${state.displayModalChord.type ? capitalize(state.displayModalChord.type) : ''}`
            : undefined
        }
        subtitle={state.displayModalChord ? state.displayModalChord.notes.join(' · ') : undefined}
        onOpenChange={(open) => {
          if (!open) {
            state.closeModalChord();
          }
        }}
        contentStyle={{ padding: 0 }}
      >
        {state.displayModalChord ? (
          <LibraryChordDetail
            state={{ ...state, chord: state.displayModalChord }}
            inModal={true}
            onBack={state.closeModalChord}
          />
        ) : null}
      </MorphingActionSurface>
    </div>
  );
}
