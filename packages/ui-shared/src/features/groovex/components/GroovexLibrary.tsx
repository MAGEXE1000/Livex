import {
  useT,
  useScrollHide,
  useIsWebDesktop,
  NavigationDispatcher,
  useSettingsStore,
  groovexStemRepository,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useMemo, useRef, useEffect } from 'react';
import { SONG_CATALOG, getArtists, getGenres } from '../services/songCatalog';
import type { SongMeta } from '../services/songCatalog';
import { useGroovexStore } from '../state/useGroovexStore';
import { StaggeredReveal } from '../../../shared/animation';
import { motion } from 'motion/react';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';

export default function GroovexLibrary() {
  const searchQuery = useGroovexStore(useShallow((s) => s.searchQuery));
  const setSearchQuery = useGroovexStore(useShallow((s) => s.setSearchQuery));
  const filterArtist = useGroovexStore(useShallow((s) => s.filterArtist));
  const setFilterArtist = useGroovexStore(useShallow((s) => s.setFilterArtist));
  const filterGenre = useGroovexStore(useShallow((s) => s.filterGenre));
  const setFilterGenre = useGroovexStore(useShallow((s) => s.setFilterGenre));
  const sortBy = useGroovexStore(useShallow((s) => s.sortBy));
  const setSortBy = useGroovexStore(useShallow((s) => s.setSortBy));
  const setActiveSong = useGroovexStore(useShallow((s) => s.setActiveSong));
  const addRecentSong = useGroovexStore(useShallow((s) => s.addRecentSong));
  const recentSongs = useGroovexStore(useShallow((s) => s.recentSongs));
  const settings = useSettingsStore(useShallow((s) => s.settings));
  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const [cachedSongIds, setCachedSongIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);

  // Read local offline stem cache from IndexedDB
  useEffect(() => {
    let isMounted = true;
    groovexStemRepository
      .getPerSongCacheInfo()
      .then((infos) => {
        if (!isMounted) return;
        const set = new Set<string>();
        for (const info of infos) {
          if (info.stemCount > 0) set.add(info.songId);
        }
        setCachedSongIds(set);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const artists = useMemo(() => getArtists(), []);
  const genres = useMemo(() => getGenres(), []);

  const filteredSongs = useMemo(() => {
    let songs = [...SONG_CATALOG];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      songs = songs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q)
      );
    }
    if (filterArtist) songs = songs.filter((s) => s.artist === filterArtist);
    if (filterGenre) songs = songs.filter((s) => s.genre === filterGenre);

    if (sortBy === 'title') songs.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'artist')
      songs.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    else if (sortBy === 'recent') {
      songs.sort((a, b) => {
        const ai = recentSongs.indexOf(a.id);
        const bi = recentSongs.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.title.localeCompare(b.title);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    return songs;
  }, [searchQuery, filterArtist, filterGenre, sortBy, recentSongs]);

  const grouped = useMemo(() => {
    if (sortBy === 'artist') {
      const map = new Map<string, SongMeta[]>();
      filteredSongs.forEach((s) => {
        if (!map.has(s.artist)) map.set(s.artist, []);
        map.get(s.artist)!.push(s);
      });
      return [...map.entries()];
    }
    return [['', filteredSongs]] as [string, SongMeta[]][];
  }, [filteredSongs, sortBy]);

  function openSong(song: SongMeta) {
    setActiveSong(song.id);
    addRecentSong(song.id);
    NavigationDispatcher.push({ app: 'groovex', page: 'player' });
  }

  function handleResetFilters() {
    setSearchQuery('');
    setFilterArtist('');
    setFilterGenre('');
  }

  const hasActiveFilters = Boolean(searchQuery.trim() || filterArtist || filterGenre);

  return (
    <div
      ref={scrollRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--app-bg)',
      }}
    >
      <div
        style={{
          padding: '0 var(--page-header-inset-h, var(--page-inset-h, 20px))',
          paddingBottom:
            'calc(var(--content-bottom-pad, 96px) + env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        {/* ── STITCH COMPACT, PUNCHY LIBRARY HEADER ── */}
        <section
          style={{
            paddingTop: isWebDesktop
              ? '16px'
              : 'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 40px))',
            paddingBottom: '8px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1
              style={{
                fontFamily: 'var(--studio-font-display)',
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--c-text-primary, var(--text))',
                margin: 0,
              }}
            >
              {t.groovex.libraryTitle || 'Library'}
            </h1>
          </div>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--c-text-secondary, var(--muted))',
              marginTop: '6px',
              marginBottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--app-accent, #007AFF)',
                boxShadow: '0 0 6px var(--app-accent, #007AFF)',
                flexShrink: 0,
              }}
            />
            <span id="session-count">{t.groovex.sessionsAvailable(SONG_CATALOG.length)}</span>
          </p>
        </section>

        {/* ── STITCH POLISHED SEARCH & FILTER CONTROLS (STICKY) ── */}
        <section
          style={{
            paddingTop: '8px',
            paddingBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'var(--app-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--c-border, rgba(0, 0, 0, 0.04))',
            margin: '0 calc(-1 * var(--page-header-inset-h, var(--page-inset-h, 20px)))',
            paddingLeft: 'var(--page-header-inset-h, var(--page-inset-h, 20px))',
            paddingRight: 'var(--page-header-inset-h, var(--page-inset-h, 20px))',
          }}
        >
          {/* Search Input Container */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '14px',
                fontSize: '20px',
                color: 'var(--c-text-muted)',
                pointerEvents: 'none',
              }}
            >
              search
            </span>
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.groovex.searchPlaceholder || 'Search songs, artists, or genres...'}
              style={{
                width: '100%',
                background: 'var(--app-surface)',
                color: 'var(--c-text-primary, var(--text))',
                fontFamily: 'var(--studio-font-body)',
                fontSize: '14px',
                fontWeight: 500,
                paddingLeft: '42px',
                paddingRight: searchQuery ? '40px' : '16px',
                paddingTop: '11px',
                paddingBottom: '11px',
                borderRadius: '9999px',
                border: '1px solid var(--c-border, rgba(0, 0, 0, 0.08))',
                boxShadow: isLight
                  ? '0 2px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)'
                  : '0 2px 6px rgba(0, 0, 0, 0.2)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              className="focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                id="clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '9999px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  cancel
                </span>
              </button>
            )}
          </div>

          {/* Compact Coherent Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Artist Filter / Sort Button */}
              <button
                type="button"
                id="filter-artist"
                onClick={() => {
                  if (sortBy === 'artist') {
                    setSortBy('title');
                  } else {
                    setSortBy('artist');
                  }
                }}
                className="btn-smooth"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 13px',
                  borderRadius: '9999px',
                  background:
                    sortBy === 'artist' || filterArtist
                      ? 'var(--app-accent-light, rgba(0, 122, 255, 0.12))'
                      : 'var(--app-surface)',
                  border:
                    sortBy === 'artist' || filterArtist
                      ? '1px solid var(--app-accent, #007AFF)'
                      : '1px solid var(--c-border, rgba(0, 0, 0, 0.08))',
                  color:
                    sortBy === 'artist' || filterArtist
                      ? 'var(--app-accent, #007AFF)'
                      : 'var(--c-text-primary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '16px',
                    color:
                      sortBy === 'artist' || filterArtist
                        ? 'var(--app-accent, #007AFF)'
                        : 'var(--c-text-muted)',
                  }}
                >
                  sort_by_alpha
                </span>
                <span>{t.groovex.artist || 'ARTIST'}</span>
                {(sortBy === 'artist' || filterArtist) && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--app-accent, #007AFF)',
                      marginLeft: '2px',
                    }}
                  />
                )}
              </button>

              {/* Morphing Filter Surface */}
              <MorphingActionSurface
                title={t.groovex.filter || 'Filters'}
                subtitle="Filter library by artist and genre"
                accentColor="var(--app-accent, #007AFF)"
                maxWidth={340}
                customTrigger={({ open, surfaceId }) => (
                  <motion.button
                    layoutId={surfaceId}
                    type="button"
                    id="filter-modal-btn"
                    onClick={open}
                    whileTap={{ scale: 0.94 }}
                    className="btn-smooth"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 13px',
                      borderRadius: '9999px',
                      background:
                        filterGenre || filterArtist
                          ? 'var(--app-accent-light, rgba(0, 122, 255, 0.12))'
                          : 'var(--app-surface)',
                      border:
                        filterGenre || filterArtist
                          ? '1px solid var(--app-accent, #007AFF)'
                          : '1px solid var(--c-border, rgba(0, 0, 0, 0.08))',
                      color:
                        filterGenre || filterArtist
                          ? 'var(--app-accent, #007AFF)'
                          : 'var(--c-text-secondary)',
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-pill)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '16px',
                        color:
                          filterGenre || filterArtist
                            ? 'var(--app-accent, #007AFF)'
                            : 'var(--c-text-muted)',
                      }}
                    >
                      tune
                    </span>
                    <span>{t.groovex.filter || 'FILTER'}</span>
                    {(filterGenre || filterArtist) && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--app-accent, #007AFF)',
                          marginLeft: '2px',
                        }}
                      />
                    )}
                  </motion.button>
                )}
              >
                {() => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 2px' }}>
                    <div>
                      <p
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--c-text-muted)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          margin: '0 0 8px',
                          fontFamily: 'var(--studio-font-body)',
                        }}
                      >
                        {t.groovex.artist || 'Artist'}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <FilterChip
                          label={t.groovex.all || 'All'}
                          active={!filterArtist}
                          onClick={() => setFilterArtist('')}
                        />
                        {artists.map((a) => (
                          <FilterChip
                            key={a}
                            label={a}
                            active={filterArtist === a}
                            onClick={() => setFilterArtist(filterArtist === a ? '' : a)}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--c-text-muted)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          margin: '0 0 8px',
                          fontFamily: 'var(--studio-font-body)',
                        }}
                      >
                        {t.groovex.genre || 'Genre'}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <FilterChip
                          label={t.groovex.all || 'All'}
                          active={!filterGenre}
                          onClick={() => setFilterGenre('')}
                        />
                        {genres.map((g) => (
                          <FilterChip
                            key={g}
                            label={g}
                            active={filterGenre === g}
                            onClick={() => setFilterGenre(filterGenre === g ? '' : g)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </MorphingActionSurface>
            </div>

            {/* Clear / Reset affordance */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-smooth"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontFamily: 'var(--studio-font-body)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  close
                </span>
                <span>{t.groovex.clear || 'CLEAR'}</span>
              </button>
            )}
          </div>
        </section>

        {/* ── EMPTY STATE (STITCH POLISHED DESIGN) ── */}
        {filteredSongs.length === 0 && (
          <section
            id="view-empty"
            style={{
              padding: '48px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '24px',
                backgroundColor: 'var(--app-surface)',
                border: '1px solid var(--c-border, rgba(0,0,0,0.08))',
                boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.04)' : '0 4px 16px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'var(--app-accent, #007AFF)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                library_music
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'var(--studio-font-display)',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--c-text-primary, var(--text))',
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              {t.groovex.noSongsFound || 'No multitrack sessions'}
            </h3>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--c-text-secondary, var(--muted))',
                maxWidth: '280px',
                margin: '0 0 20px',
              }}
            >
              {t.groovex.noSongsHint ||
                'Sync with your Studio cloud library or reset filters to practice with GrooveX.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-smooth"
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--app-surface)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {t.groovex.clear || 'Reset Filter'}
              </button>
            </div>
          </section>
        )}

        {/* ── STITCH MAIN SONG LIST VIEW ── */}
        {filteredSongs.length > 0 && (
          <main
            id="view-main"
            style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {grouped.map(([artistName, songs]) => (
              <div
                key={artistName || 'all'}
                className="artist-group"
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {artistName && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--c-text-secondary, var(--muted))',
                          margin: 0,
                        }}
                      >
                        {artistName}
                      </h2>
                      <span
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--c-text-muted)',
                          backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        ({songs.length})
                      </span>
                    </div>
                    {songs[0]?.genre && (
                      <span
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--c-text-muted)',
                        }}
                      >
                        {songs[0].genre}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <StaggeredReveal staggerInterval={30}>
                    {songs.map((song) => (
                      <StitchSongCard
                        key={song.id}
                        song={song}
                        isCached={cachedSongIds.has(song.id) || song.hasStems}
                        onOpen={() => openSong(song)}
                        isLight={isLight}
                      />
                    ))}
                  </StaggeredReveal>
                </div>
              </div>
            ))}
          </main>
        )}
      </div>
    </div>
  );
}

// ── STITCH SONG CARD COMPONENT ────────────────────────────────────────────────
function StitchSongCard({
  song,
  isCached,
  onOpen,
  isLight,
}: {
  song: SongMeta;
  isCached: boolean;
  onOpen: () => void;
  isLight: boolean;
}) {
  const [pressed, setPressed] = useState(false);

  // Dynamic spindle center color based on artist / genre
  const spindleColor = useMemo(() => {
    const hash = song.artist.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [
      'var(--app-accent, #007AFF)',
      '#9333ea', // purple
      '#dc2626', // red
      '#d97706', // amber
      '#059669', // emerald
      '#2563eb', // blue
    ];
    return hues[hash % hues.length];
  }, [song.artist]);

  return (
    <article
      data-testid={`groovex-song-item-${song.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onClick={onOpen}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="active-press group"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px',
        backgroundColor: isLight ? '#ffffff' : 'var(--app-surface)',
        border: '1px solid var(--c-border, rgba(0, 0, 0, 0.08))',
        borderRadius: '24px', // rounded-3xl
        boxShadow: 'var(--shadow-surface-soft)',
        cursor: 'pointer',
        boxSizing: 'border-box',
        width: '100%',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s ease-out, border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Left: Vinyl Disk Avatar + Title/Metadata Hierarchy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        {/* Custom Styled Mini Vinyl Disc Icon */}
        <div
          style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isLight ? '#f4f4f5' : '#27272a',
            border: isLight
              ? '1px solid rgba(0, 0, 0, 0.06)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          {/* Vinyl Disc Body with Grooves */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isLight
                ? 'radial-gradient(circle, #374151 0%, #1f2937 40%, #111827 70%, #030712 100%)'
                : 'radial-gradient(circle, #3f3f46 0%, #27272a 40%, #18181b 70%, #09090b 100%)',
              border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.5)',
            }}
          >
            {/* Center Spindle Label Ring */}
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: `${spindleColor}25`,
                border: `1px solid ${spindleColor}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Spindle Center Hole */}
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: spindleColor,
                }}
              />
            </div>
          </div>

          {/* Downloaded / Cached Status Pill */}
          {isCached && (
            <span
              style={{
                position: 'absolute',
                bottom: '-3px',
                right: '-3px',
                backgroundColor: isLight ? '#ffffff' : '#18181b',
                borderRadius: '50%',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.1)',
                color: 'var(--app-accent, #007AFF)',
              }}
              title="Downloaded & Cached Offline"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '13px',
                  fontVariationSettings: "'FILL' 1",
                  display: 'block',
                }}
              >
                cloud_done
              </span>
            </span>
          )}
        </div>

        {/* Title & Metadata Hierarchy */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--studio-font-display)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--c-text-primary, var(--text))',
              margin: 0,
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {song.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--c-text-secondary, var(--muted))',
              margin: '2px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {song.artist} <span style={{ color: 'var(--c-text-muted)' }}>• {song.bpm} BPM</span>
          </p>

          {/* Stems Container (Mobile Optimized) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              flexWrap: 'wrap',
            }}
          >
            {song.stems.slice(0, 3).map((s) => (
              <span
                key={s.name}
                className="font-mono"
                style={{
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                  color: isLight ? '#4b5563' : '#d1d5db',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--studio-font-mono)',
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {s.name.slice(0, 3)}
              </span>
            ))}
            {song.stems.length > 3 && (
              <span
                className="font-mono"
                style={{
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--app-accent-light, rgba(0, 122, 255, 0.12))',
                  color: 'var(--app-accent, #007AFF)',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--studio-font-mono)',
                  letterSpacing: '-0.02em',
                }}
              >
                +{song.stems.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action & Navigation Affordance */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          marginLeft: '8px',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label={`Play ${song.title}`}
          className="btn-smooth"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
            color: 'var(--app-accent, #007AFF)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '20px',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            play_arrow
          </span>
        </button>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '18px',
            color: 'var(--c-text-muted)',
          }}
        >
          chevron_right
        </span>
      </div>
    </article>
  );
}

// ── FILTER CHIP COMPONENT ──────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-smooth"
      style={{
        padding: '5px 12px',
        borderRadius: '9999px',
        backgroundColor: active
          ? 'var(--app-accent, #007AFF)'
          : 'var(--app-surface-subtle, rgba(0,0,0,0.04))',
        color: active ? '#ffffff' : 'var(--c-text-secondary)',
        border: active ? '1px solid transparent' : '1px solid var(--c-border, rgba(0,0,0,0.06))',
        boxShadow: active ? 'var(--shadow-control-raised)' : 'var(--shadow-pill)',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--studio-font-body)',
        letterSpacing: '0.02em',
        transition: 'all 0.12s ease',
      }}
    >
      {label}
    </button>
  );
}
