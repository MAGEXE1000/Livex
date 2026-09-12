import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStagexStore } from '../../state/useStagexStore';
import { StageSetupDetailLayout } from './StageSetupDetailLayout';
import { useSettingsStore, useT, useShallow } from '@workspace/studio-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';


interface StageSetlistViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const StageSetlistView: React.FC<StageSetlistViewProps> = ({
  onBack,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const t = useT();
  const tr = t as any;
  const setlistTr = tr.stagex?.setup?.setlist;
  const settings = useSettingsStore((s) => s.settings);
  const isSpanish = (settings.language ?? 'en') === 'es';
  const { setlist, addSong, removeSong, reorderSongs, preferences } = useStagexStore(
    useShallow((s) => ({
      setlist: s.setlist,
      addSong: s.addSong,
      removeSong: s.removeSong,
      reorderSongs: s.reorderSongs,
      preferences: s.preferences,
    }))
  );
  const activeVis = settings.perApp?.stagex;
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && Boolean(settings.amoledMode || activeVis?.amoledMode || preferences?.amoled);

  const prefersReducedMotion = useAppReducedMotion();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songKey, setSongKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [duration, setDuration] = useState('3:30');
  const [energy, setEnergy] = useState('75');

  const [sortBy, setSortBy] = useState<'default' | 'title' | 'bpm' | 'key'>('default');
  const [showSections, setShowSections] = useState(false);

  // Compute stats
  const totalDuration = useMemo(() => {
    let totalSecs = 0;
    for (const song of setlist) {
      if (!song.duration) continue;
      const parts = song.duration.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        totalSecs += parts[0] * 60 + parts[1];
      }
    }
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [setlist]);

  const avgEnergy = useMemo(() => {
    if (!setlist.length) return null;
    const total = setlist.reduce((acc, s) => acc + (s.energy || 50), 0);
    return Math.round(total / setlist.length);
  }, [setlist]);

  // Computed Setlist Insights (Stitch Parity)
  const tempoStability = useMemo(() => {
    if (setlist.length === 0) return '—';
    const bpmList = setlist
      .map((s) => s.bpm)
      .filter((b): b is number => typeof b === 'number' && !isNaN(b) && b > 0);

    if (bpmList.length === 0) return '—';
    if (bpmList.length === 1) return `${bpmList[0]} BPM`;

    const min = Math.min(...bpmList);
    const max = Math.max(...bpmList);
    const diff = max - min;

    if (diff <= 10) return isSpanish ? `Consistente (±${diff} BPM)` : `Consistent (±${diff} BPM)`;
    if (diff <= 25)
      return isSpanish ? `Moderado (${min}–${max} BPM)` : `Moderate (${min}–${max} BPM)`;
    return isSpanish ? `Dinámico (${min}–${max} BPM)` : `Dynamic (${min}–${max} BPM)`;
  }, [setlist, isSpanish]);

  const keyVariety = useMemo(() => {
    if (setlist.length === 0) return '—';
    const keys = setlist.map((s) => s.key?.trim().toUpperCase()).filter((k): k is string => !!k);

    if (keys.length === 0) return '—';
    const unique = Array.from(new Set(keys));
    if (unique.length === 1)
      return isSpanish ? `Tono Único (${unique[0]})` : `Single Key (${unique[0]})`;
    return isSpanish ? `${unique.length} Tonos Distintos` : `${unique.length} Distinct Keys`;
  }, [setlist, isSpanish]);

  const transitionFluidity = useMemo(() => {
    if (setlist.length < 2) return '—';
    let totalDelta = 0;
    let comparisons = 0;

    for (let i = 1; i < setlist.length; i++) {
      const prevE = setlist[i - 1].energy || 50;
      const currE = setlist[i].energy || 50;
      totalDelta += Math.abs(currE - prevE);
      comparisons++;
    }

    const avgDelta = comparisons > 0 ? Math.round(totalDelta / comparisons) : 0;
    if (avgDelta <= 15) return isSpanish ? 'Flujo Armónico Suave' : 'Smooth Harmonic Flow';
    if (avgDelta <= 30) return isSpanish ? 'Impulso Equilibrado' : 'Balanced Momentum';
    return isSpanish ? 'Alto Contraste Dinámico' : 'High Dynamic Contrast';
  }, [setlist, isSpanish]);

  // Filtered/Sorted list for display
  const displayList = useMemo(() => {
    if (sortBy === 'default') return setlist;
    const copy = [...setlist];
    if (sortBy === 'title') {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'bpm') {
      copy.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
    } else if (sortBy === 'key') {
      copy.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
    }
    return copy;
  }, [setlist, sortBy]);

  const handleCycleSort = () => {
    setSortBy((prev) => {
      if (prev === 'default') return 'title';
      if (prev === 'title') return 'bpm';
      if (prev === 'bpm') return 'key';
      return 'default';
    });
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addSong({
      title: title.trim(),
      artist: artist.trim() || undefined,
      key: songKey.trim() || undefined,
      bpm: bpm ? parseInt(bpm, 10) : undefined,
      duration: duration.trim() || '3:30',
      energy: energy ? parseInt(energy, 10) : 75,
    });
    setTitle('');
    setArtist('');
    setSongKey('');
    setBpm('');
    setDuration('3:30');
    setEnergy('75');
    setIsAdding(false);
  };

  // Theme Design Tokens
  const cardBg = isLight ? '#ffffff' : isAmoled ? '#000000' : 'var(--c-bg-card, #111115)';
  const cardBorder = isLight
    ? '#eaecef'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.12)'
      : 'var(--c-border, rgba(255, 255, 255, 0.08))';
  const innerBg = isLight
    ? '#f9fafb'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(255, 255, 255, 0.03)';
  const innerBorder = isLight
    ? '#e5e7eb'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.06)';
  const dividerColor = isLight
    ? '#f3f4f6'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.06)';
  const textPrimary = isLight ? '#18181b' : '#ffffff';
  const textSecondary = isLight ? '#71717a' : '#a1a1aa';
  const textMuted = isLight ? '#9ca3af' : '#71717a';

  return (
    <StageSetupDetailLayout
      title={setlistTr?.title || tr.stagex?.setlistTitle || 'Setlist'}
      onBack={onBack}
      isLight={isLight}
      isAmoled={isAmoled}
      toolbarActions={
        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 hover:opacity-90"
          style={{
            backgroundColor: isLight ? '#000000' : '#ffffff',
            color: isLight ? '#ffffff' : '#000000',
          }}
          title={isAdding ? setlistTr?.cancel || 'Cancel' : setlistTr?.addTrack || 'Add Track'}
          aria-label={isAdding ? setlistTr?.cancel || 'Cancel' : setlistTr?.addTrack || 'Add Track'}
          data-testid="btn-toggle-add-track"
        >
          <svg
            className="w-5 h-5 transition-transform duration-200"
            style={{ transform: isAdding ? 'rotate(45deg)' : 'rotate(0deg)' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      }
    >
      <div className="space-y-3.5 pb-8">
        {/* ── 1. CURRENT ARRANGEMENT SUBHEADER (STITCH PARITY) ────────── */}
        <section
          className="flex items-center justify-between px-1 pt-1"
          data-testid="arrangement-header"
        >
          <div>
            <h2
              className="font-extrabold text-[22px] tracking-tight leading-none"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {setlistTr?.currentArrangement ||
                (isSpanish ? 'Repertorio Actual' : 'Current Arrangement')}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* Sort / Filter Button */}
            <button
              type="button"
              onClick={handleCycleSort}
              aria-label={setlistTr?.filterArrangement || 'Filter arrangement'}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{
                color: sortBy !== 'default' ? (isLight ? '#09090b' : '#ffffff') : textSecondary,
                backgroundColor:
                  sortBy !== 'default'
                    ? isLight
                      ? 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
              }}
              title={
                sortBy === 'default'
                  ? setlistTr?.sortFilter || 'Sort / Filter'
                  : isSpanish
                    ? `Ordenado por ${sortBy.toUpperCase()}`
                    : `Sorted by ${sortBy.toUpperCase()}`
              }
              data-testid="btn-filter-arrangement"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>

            {/* Sections Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSections((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: showSections
                  ? isLight
                    ? 'rgba(0, 0, 0, 0.06)'
                    : 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
                color: showSections ? textPrimary : textSecondary,
              }}
              title={isSpanish ? 'Alternar Secciones' : 'Toggle Sections'}
              data-testid="btn-toggle-sections"
            >
              <svg
                className="w-4 h-4 stroke-[2]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect height="6" rx="1.5" width="18" x="3" y="4" />
                <rect height="6" rx="1.5" width="18" x="3" y="14" />
              </svg>
              <span
                className="text-xs font-bold tracking-wider uppercase"
                style={{ fontFamily: 'var(--studio-font-display)' }}
              >
                {isSpanish ? 'SECCIONES' : 'SECTIONS'}
              </span>
            </button>
          </div>
        </section>

        {/* ── 2. INLINE ADD TRACK FORM ─────────────────────────────────── */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleAddSong}
              className="p-5 rounded-[24px] border shadow-card flex flex-col gap-3.5"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              data-testid="form-add-track"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: textSecondary, fontFamily: 'var(--studio-font-display)' }}
                >
                  Add New Track
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: textSecondary }}
                  aria-label="Close"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={setlistTr?.formSongTitle || 'Song Title *'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  autoFocus
                  required
                  data-testid="input-song-title"
                />
                <input
                  type="text"
                  placeholder="Artist / Composer (optional)"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="input-song-artist"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Am"
                    value={songKey}
                    onChange={(e) => setSongKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-key"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    BPM
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-bpm"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3:45"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-duration"
                  />
                </div>

                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: textSecondary }}
                  >
                    Energy (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 75"
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{
                      backgroundColor: innerBg,
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    data-testid="input-song-energy"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer opacity-70 hover:opacity-100"
                  style={{ color: textSecondary }}
                >
                  {setlistTr?.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95"
                  style={{
                    backgroundColor: isLight ? '#000000' : '#ffffff',
                    color: isLight ? '#ffffff' : '#000000',
                  }}
                  data-testid="btn-submit-track"
                >
                  Add to Setlist
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── 3. EMPTY STATE OR POPULATED ARRANGEMENT ─────────────────── */}
        {setlist.length === 0 ? (
          /* Empty Setlist Card matching Stitch Reference */
          <section
            className="w-full rounded-[26px] p-7 shadow-card border text-center flex flex-col items-center justify-center min-h-[175px]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="setlist-empty-state"
          >
            <p
              className="text-[12px] font-extrabold tracking-[0.08em] max-w-[270px] leading-relaxed uppercase mb-4"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {isSpanish
                ? 'NO HAY CANCIONES — TOCA AÑADIR CANCIÓN PARA INICIAR TU REPERTORIO.'
                : 'NO SONGS YET — TAP ADD NEW TRACK TO START YOUR SETLIST.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="group inline-flex items-center space-x-2 text-xs font-bold tracking-wider uppercase active:scale-95 transition-all py-1.5 px-4 rounded-full cursor-pointer border"
              style={{
                backgroundColor: innerBg,
                borderColor: innerBorder,
                color: textSecondary,
              }}
              data-testid="btn-empty-add-track"
            >
              <svg
                className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                <path
                  d="M12 8v8m-4-4h8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span
                className="tracking-[0.06em]"
                style={{ fontFamily: 'var(--studio-font-display)' }}
              >
                {isSpanish ? 'AÑADIR CANCIÓN' : 'ADD NEW TRACK'}
              </span>
            </button>
          </section>
        ) : (
          /* Populated Arrangement Tracks Container */
          <div
            className="p-4 rounded-[26px] border shadow-card flex flex-col gap-2.5"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="setlist-populated-container"
          >
            {showSections && (
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: textSecondary, fontFamily: 'var(--studio-font-display)' }}
                >
                  SET 1 — MAIN PERFORMANCE ({displayList.length})
                </span>
                <span className="text-[10.5px] font-mono" style={{ color: textMuted }}>
                  {totalDuration}
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {displayList.map((song, idx) => (
                <motion.div
                  key={song.id}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-3.5 rounded-[16px] border transition-colors duration-150"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                  }}
                  data-testid={`setlist-song-${song.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span
                      className="text-xs font-mono font-bold w-5 text-right shrink-0"
                      style={{ color: textSecondary }}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                          {song.title}
                        </p>
                        {song.key && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                            style={{
                              backgroundColor: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                            }}
                          >
                            {song.key}
                          </span>
                        )}
                        {song.bpm && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                            }}
                          >
                            {song.bpm} BPM
                          </span>
                        )}
                      </div>
                      {song.artist && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: textSecondary }}>
                          {song.artist}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono mr-1" style={{ color: textSecondary }}>
                      {song.duration}
                    </span>

                    {/* Reorder Up */}
                    <button
                      type="button"
                      onClick={() => reorderSongs(idx, idx - 1)}
                      disabled={idx === 0 || sortBy !== 'default'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20 cursor-pointer"
                      style={{ color: textSecondary }}
                      title="Move Up"
                      data-testid={`btn-move-up-${song.id}`}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>

                    {/* Reorder Down */}
                    <button
                      type="button"
                      onClick={() => reorderSongs(idx, idx + 1)}
                      disabled={idx === setlist.length - 1 || sortBy !== 'default'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20 cursor-pointer"
                      style={{ color: textSecondary }}
                      title="Move Down"
                      data-testid={`btn-move-down-${song.id}`}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {/* Delete Song */}
                    <button
                      type="button"
                      onClick={() => removeSong(song.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer opacity-60 hover:opacity-100"
                      style={{ color: textSecondary }}
                      title="Delete Song"
                      data-testid={`btn-delete-song-${song.id}`}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── 4. METRIC CARDS STACK (STITCH PARITY) ────────────────────── */}
        <div className="space-y-3" data-testid="metrics-summary">
          {/* Card 1: Songs Count */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-songs-count"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statTracks || (isSpanish ? 'CANCIONES' : 'SONGS COUNT')}
            </span>
            <span
              className="block font-black text-4xl mt-1 leading-none"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {setlist.length}
            </span>
          </article>

          {/* Card 2: Total Duration */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-total-duration"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statTotalRuntime || (isSpanish ? 'DURACIÓN TOTAL' : 'TOTAL DURATION')}
            </span>
            <span
              className="block font-black text-4xl mt-1 leading-none tracking-tight"
              style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
            >
              {totalDuration}
            </span>
          </article>

          {/* Card 3: Average Energy */}
          <article
            className="rounded-[24px] px-6 py-5 shadow-card border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="metric-avg-energy"
          >
            <span
              className="block text-[11px] font-bold tracking-wider uppercase font-sans"
              style={{ color: textMuted }}
            >
              {setlistTr.statEnergy || (isSpanish ? 'ENERGÍA PROMEDIO' : 'AVG ENERGY')}
            </span>
            <div className="mt-2.5 h-6 flex items-center justify-between">
              {avgEnergy !== null ? (
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: innerBorder }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, avgEnergy))}%`,
                        backgroundColor:
                          avgEnergy >= 75 ? '#ef4444' : avgEnergy >= 50 ? '#f97316' : '#10b981',
                      }}
                    />
                  </div>
                  <span
                    className="font-black text-base"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    {avgEnergy}%
                  </span>
                </div>
              ) : (
                <span
                  className="inline-block w-8 h-1.5 rounded-full"
                  style={{ backgroundColor: isLight ? '#18181b' : '#ffffff' }}
                />
              )}
            </div>
          </article>
        </div>

        {/* ── 5. SETLIST INSIGHTS CARD (STITCH PARITY) ────────────────── */}
        <section
          className="rounded-[26px] px-6 py-5 shadow-card border mt-1"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-testid="card-setlist-insights"
        >
          <h3
            className="text-[11px] font-extrabold tracking-wider uppercase mb-4"
            style={{
              color: textPrimary,
              fontFamily: 'var(--studio-font-display)',
              letterSpacing: '0.08em',
            }}
          >
            {isSpanish ? 'ANÁLISIS DEL REPERTORIO' : 'SETLIST INSIGHTS'}
          </h3>

          <div className="space-y-4">
            {/* Tempo Stability */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightTempoDynamics ||
                  (isSpanish ? 'Estabilidad de Tempo' : 'Tempo Stability')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-tempo-stability"
              >
                {tempoStability}
              </span>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />

            {/* Key Variety */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightKeyHarmony || (isSpanish ? 'Variedad Tonal' : 'Key Variety')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-key-variety"
              >
                {keyVariety}
              </span>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />

            {/* Transition Fluidity */}
            <div className="flex items-center justify-between text-sm py-0.5">
              <span className="font-medium text-[13px]" style={{ color: textSecondary }}>
                {setlistTr.insightShowFlow ||
                  (isSpanish ? 'Fluidez de Transición' : 'Transition Fluidity')}
              </span>
              <span
                className="font-bold text-sm tracking-wider font-mono"
                style={{ color: textPrimary }}
                data-testid="insight-transition-fluidity"
              >
                {transitionFluidity}
              </span>
            </div>
          </div>
        </section>
      </div>
    </StageSetupDetailLayout>
  );
};
