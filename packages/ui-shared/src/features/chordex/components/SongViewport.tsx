import React from 'react';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { motion } from 'motion/react';
import { StaggeredReveal } from '../../../shared/animation';
// Note: we'll have to pass all dependencies as props.

interface SongViewportProps {
  songsMobileView: 'list' | 'editor';
  renderEditor: () => React.ReactNode;
  listScrollRef: React.RefObject<HTMLDivElement>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredPresets: any[];
  activePresetId: string | null;
  setActivePreset: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setShowForm: (show: boolean) => void;
  setShowDeleteId: (id: string | null) => void;
  accent: { from: string; to: string; mid?: string };
  customChords: Record<string, any>;
  t: any;
  renderImportSongForm: React.ReactNode;
  renderCreateSongForm: React.ReactNode;
  PresetCard: React.ComponentType<any>;
}

export function SongViewport({
  songsMobileView,
  renderEditor,
  listScrollRef,
  searchQuery,
  setSearchQuery,
  filteredPresets,
  activePresetId,
  setActivePreset,
  setEditingId,
  setShowForm,
  setShowDeleteId,
  accent,
  customChords,
  t,
  renderImportSongForm,
  renderCreateSongForm,
  PresetCard,
}: SongViewportProps) {
  return (
    <div
      style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <SharedNavigationContainer
        activeView={songsMobileView}
        viewOrder={['list', 'editor']}
        variant="drilldown"
      >
        {(view) =>
          view === 'editor' ? (
            renderEditor()
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SharedFloatingHeader
                title="Songs"
                hideBack={true}
                scrollContainerRef={listScrollRef}
              />

              {/* Main scrollable viewport */}
              <div
                ref={listScrollRef}
                className="flex-1 overflow-y-auto no-scrollbar"
                style={{ background: 'var(--app-bg)' }}
                data-purpose="songs-screen"
              >
                <main
                  className="w-full max-w-md mx-auto pb-32 px-4 space-y-4"
                  style={{
                    paddingTop:
                      'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 92px)',
                  }}
                  data-purpose="mobile-viewport"
                >
                  {/* Capsule Search Bar */}
                  <div className="relative flex items-center" data-purpose="search-bar">
                    <span
                      className="material-symbols-rounded absolute left-4 pointer-events-none text-lg select-none"
                      style={{ color: 'var(--c-text-muted, #94A3B8)' }}
                    >
                      search
                    </span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search titles, keys, or tags..."
                      className="w-full h-[46px] pl-10 pr-10 text-sm rounded-full border shadow-soft-card outline-none transition-all font-inter"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                        color: 'var(--c-text-primary, #111827)',
                      }}
                    />
                    {searchQuery && (
                      <button
                        aria-label="Clear search"
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-transform cursor-pointer"
                      >
                        <span className="material-symbols-rounded text-[18px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* List of presets with Search filtering */}
                  {filteredPresets.length > 0 ? (
                    <div className="space-y-3" data-purpose="songs-list">
                      <StaggeredReveal staggerInterval={30}>
                        {filteredPresets.map((p, i) => (
                          <PresetCard
                            key={p.id}
                            preset={p}
                            isActive={p.id === activePresetId}
                            onClick={() => setActivePreset(p.id)}
                            customChords={customChords}
                            accent={accent}
                            t={t}
                            setEditingId={setEditingId}
                            setShowForm={setShowForm}
                            setShowDeleteId={setShowDeleteId}
                          />
                        ))}
                      </StaggeredReveal>
                    </div>
                  ) : (
                    <section className="mt-8 pt-8 px-2" data-purpose="songs-empty">
                      {searchQuery ? (
                        /* Search yields no results */
                        <section
                          className="flex flex-col items-center justify-center text-center px-4 py-16"
                          data-purpose="search-empty-state"
                        >
                          <div
                            className="w-14 h-14 rounded-3xl flex items-center justify-center mb-4 border shadow-soft-card"
                            style={{
                              backgroundColor: 'var(--surface-card-bg, #ffffff)',
                              borderColor: 'var(--c-border, #E3E6EB)',
                              color: 'var(--c-text-muted, #8A92A6)',
                            }}
                          >
                            <span className="material-symbols-rounded text-2xl">search_off</span>
                          </div>
                          <h3
                            className="text-lg font-bold tracking-tight"
                            style={{
                              fontFamily: 'var(--font-headline)',
                              color: 'var(--c-text-primary, #111827)',
                            }}
                          >
                            No matching songs
                          </h3>
                          <p
                            className="text-xs font-normal mt-1.5"
                            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                          >
                            Try adjusting your search terms
                          </p>
                        </section>
                      ) : (
                        /* Complete empty state */
                        <div className="flex flex-col items-center justify-center text-center px-4 py-8 relative">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--app-bg) 50%, transparent)',
                              border: '1px solid',
                              borderColor:
                                'color-mix(in srgb, var(--c-accent-from, #2563EB) 22%, transparent)',
                              color: 'var(--c-accent-from, #2563EB)',
                            }}
                          >
                            <span className="material-symbols-rounded text-3xl">library_music</span>
                          </div>
                          <h2
                            className="text-xl font-bold tracking-tight"
                            style={{
                              fontFamily: 'var(--font-headline)',
                              color: 'var(--c-text-primary, #111827)',
                            }}
                          >
                            No songs yet
                          </h2>
                          <p
                            className="text-xs font-normal max-w-[240px] mt-1.5 leading-relaxed"
                            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                          >
                            Tap the{' '}
                            <span
                              className="font-semibold"
                              style={{ color: 'var(--c-text-primary)' }}
                            >
                              '+'
                            </span>{' '}
                            button to create your first progression
                          </p>
                          <div className="flex items-center gap-2.5 mt-6">
                            <span
                              className="material-symbols-rounded animate-bounce"
                              style={{
                                color: 'var(--c-accent-from, #2563EB)',
                                transform: 'rotate(180deg)',
                                fontSize: '18px',
                              }}
                            >
                              arrow_downward
                            </span>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </main>
              </div>

              {/* Bottom Right Floating Action Buttons */}
              <aside
                className="absolute right-4 flex flex-col gap-3 pointer-events-none z-50"
                style={{
                  bottom:
                    'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 86px)',
                }}
              >
                {/* Secondary FAB: Import from Cloud/File */}
                <MorphingActionSurface
                  placement="center"
                  maxWidth={420}
                  title={t.songs.importSong}
                  subtitle={t.songs.supportsJson || 'Import a Chordex JSON song file'}
                  accentColor={accent.from}
                  customTrigger={({ triggerProps }) => (
                    <motion.button
                      {...triggerProps}
                      type="button"
                      data-testid="import-preset-btn"
                      aria-label="Import or Backup Cloud"
                      title="Import or Backup Cloud"
                      className="w-11 h-11 rounded-full border shadow-soft-card flex items-center justify-center cursor-pointer pointer-events-auto"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                        color: 'var(--c-text-secondary, #6B7280)',
                      }}
                    >
                      <span className="material-symbols-rounded text-xl">cloud_download</span>
                    </motion.button>
                  )}
                >
                  {renderImportSongForm}
                </MorphingActionSurface>

                {/* Primary FAB: Create Song */}
                <MorphingActionSurface
                  placement="center"
                  maxWidth={400}
                  title={t.songs.newSong}
                  subtitle={t.songs.startFromScratch || 'Start a new chord progression'}
                  accentColor={accent.from}
                  customTrigger={({ triggerProps }) => (
                    <motion.button
                      {...triggerProps}
                      type="button"
                      data-testid="add-preset-btn"
                      aria-label="New Progression"
                      title="New Progression"
                      className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto"
                      style={{
                        color: '#fff',
                        backgroundColor: 'var(--c-accent-from, #2563EB)',
                        boxShadow:
                          '0 8px 24px color-mix(in srgb, var(--c-accent-from, #2563EB) 35%, transparent)',
                      }}
                    >
                      <span className="material-symbols-rounded text-2xl font-bold">add</span>
                    </motion.button>
                  )}
                >
                  {renderCreateSongForm}
                </MorphingActionSurface>
              </aside>
            </div>
          )
        }
      </SharedNavigationContainer>
    </div>
  );
}
