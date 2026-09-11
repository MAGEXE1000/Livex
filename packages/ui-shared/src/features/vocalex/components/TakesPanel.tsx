import { Dialog } from '../../../shared/design-system/dialogs';
import {
  useT,
  useNavigationStore,
  NavigationDispatcher,
  useSettingsStore,
  type TakeRecord,
  vocalexRepository,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SmartLoading from '../../../shared/loading/SmartLoading';
import { VocalexTakesSkeleton } from '../../../shared/loading/StudioSkeleton';
import { clearTakeCache } from '../services/harmonyEngine';
import { Button } from '../../../shared/design-system/StudioDesignSystem';
import { StudioHeader } from '../../../shared/layout/StudioHeader';

import TakeDetailView from './TakeDetailView';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDateI18n(
  ts: number,
  t: { today: string; yesterday: string; daysAgo: (n: number) => string }
): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 86400000) {
    return `${t.today}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diff < 172800000) {
    return `${t.yesterday}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diff < 604800000) {
    return t.daysAgo(Math.floor(diff / 86400000));
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

type ViewState = { mode: 'list' } | { mode: 'detail'; takeId: string };

const ANIM_CSS = `
@keyframes tp-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tp-bar-pulse {
  0%, 100% { transform: scaleY(0.7); }
  50% { transform: scaleY(1.15); }
}
`;

function useAnimStyle() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const s = document.createElement('style');
    s.textContent = ANIM_CSS;
    document.head.appendChild(s);
    return () => {
      s.remove();
      injected.current = false;
    };
  }, []);
}

export default function TakesPanel() {
  useAnimStyle();
  const t = useT();
  const settings = useSettingsStore(useShallow((s) => s.settings));
  const language = settings.language;
  const activeVis = settings.perApp?.vocalex ?? { theme: 'dark', amoledMode: false };
  const isLight =
    activeVis.theme === 'light' ||
    (activeVis.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(settings.amoledMode || activeVis.amoledMode);

  const [takes, setTakes] = useState<TakeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const currentRoute = useNavigationStore(useShallow((s) => s.history[s.history.length - 1])) || {
    app: 'hub',
  };

  const view = useMemo<ViewState>(() => {
    if (currentRoute.app === 'vocalex' && currentRoute.page === 'takes') {
      if (currentRoute.subView === 'detail' && currentRoute.id) {
        return { mode: 'detail', takeId: currentRoute.id };
      }
    }
    return { mode: 'list' };
  }, [currentRoute]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setPlayingTakeId(null);
  }, []);

  // Cleanup audio when switching view or unmounting
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const loadTakes = useCallback(async () => {
    try {
      const all = await vocalexRepository.getAllTakes();
      setTakes(all);
    } catch {
      /* empty */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTakes();
  }, [loadTakes]);

  const togglePlay = useCallback(
    (take: TakeRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      if (playingTakeId === take.id) {
        stopPlayback();
        return;
      }
      stopPlayback();

      try {
        const url = URL.createObjectURL(take.audioBlob);
        currentUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingTakeId(take.id);

        audio.onended = () => {
          stopPlayback();
        };
        audio.onerror = () => {
          stopPlayback();
        };
        audio.play().catch(() => {
          stopPlayback();
        });
      } catch {
        stopPlayback();
      }
    },
    [playingTakeId, stopPlayback]
  );

  const handleExport = useCallback((take: TakeRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = URL.createObjectURL(take.audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${take.name || 'take'}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* empty */
    }
  }, []);

  const handleCreateNewProject = useCallback(async () => {
    const isEs = (language ?? 'en') === 'es';
    const newProject: TakeRecord = {
      id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: isEs ? `Proyecto ${takes.length + 1}` : `Project ${takes.length + 1}`,
      createdAt: Date.now(),
      durationMs: 0,
      audioBlob: new Blob([], { type: 'audio/webm' }),
      waveformPeaks: [],
      sampleRate: 48000,
    };
    await vocalexRepository.saveTake(newProject);
    await loadTakes();
    NavigationDispatcher.push({
      app: 'vocalex',
      page: 'takes',
      subView: 'detail',
      id: newProject.id,
    });
  }, [language, takes.length, loadTakes]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (playingTakeId === id) {
        stopPlayback();
      }
      await vocalexRepository.deleteTake(id);
      clearTakeCache(id);
      setTakes((prev) => prev.filter((t) => t.id !== id));
      if (view.mode === 'detail' && view.takeId === id) {
        NavigationDispatcher.pop();
      }
    },
    [view, playingTakeId, stopPlayback]
  );

  const handleSaveBounce = useCallback(
    async (newTake: TakeRecord) => {
      await vocalexRepository.saveTake(newTake);
      await loadTakes();
    },
    [loadTakes]
  );

  const handleOpenDetail = useCallback(
    (takeId: string) => {
      stopPlayback();
      NavigationDispatcher.push({
        app: 'vocalex',
        page: 'takes',
        subView: 'detail',
        id: takeId,
      });
    },
    [stopPlayback]
  );

  if (view.mode === 'detail') {
    const take = takes.find((t) => t.id === view.takeId);
    if (!take) {
      return (
        <div style={{ padding: 24, color: 'var(--c-text-secondary)' }}>
          {t.vocalex.takeNotFound}
        </div>
      );
    }
    return (
      <TakeDetailView
        take={take}
        onBack={() => NavigationDispatcher.pop()}
        onDelete={handleDelete}
        onSaveBounce={handleSaveBounce}
        onUpdateTake={async (updatedTake) => {
          await vocalexRepository.saveTake(updatedTake);
          await loadTakes();
        }}
      />
    );
  }

  const isEs = language === 'es';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding:
          '0 16px calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 16px) + 24px)',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Canonical Vocalex Page Header */}
        <StudioHeader
          title={t.vocalex.takesTitle}
          subtitle={t.vocalex.takesSubtitle}
          disableHorizontalPadding={true}
          containerStyle={{ marginBottom: '8px' }}
        />

        {/* Action and Filter Row */}
        <section
          data-purpose="actions-and-filter-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 12,
          }}
        >
          {/* Segmented Filter Chip */}
          <div
            className="studio-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: isLight
                ? '#ffffff'
                : isAmoled
                  ? '#000000'
                  : 'var(--app-surface-low, rgba(255,255,255,0.05))',
              padding: '6px 14px',
              borderRadius: 9999,
              border: '1px solid var(--c-border, rgba(128,128,128,0.18))',
              boxShadow: 'var(--shadow-pill)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 16,
                color: 'var(--studio-accent, #007aff)',
              }}
            >
              mic
            </span>
            <span
              style={{
                fontFamily: 'var(--studio-font-display)',
                fontWeight: 700,
                fontSize: 12.5,
                color: 'var(--c-text-primary)',
              }}
            >
              {t.vocalex.recent}
            </span>
            <span
              style={{
                fontFamily: 'var(--studio-font-mono)',
                fontWeight: 700,
                fontSize: 11,
                color: 'var(--studio-accent, #007aff)',
                background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
                padding: '2px 8px',
                borderRadius: 9999,
              }}
            >
              {takes.length}
            </span>
          </div>

          {/* Primary Action: New Take Button */}
          <Button
            variant="primary"
            isPill={true}
            onClick={handleCreateNewProject}
            style={{
              background: 'var(--studio-accent, #007aff)',
              color: '#ffffff',
              borderRadius: 9999,
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: 'var(--shadow-control-raised), 0 4px 14px rgba(0, 122, 255, 0.25)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            icon="mic"
          >
            {t.vocalex.newTake}
          </Button>
        </section>

        {/* Content Area */}
        {loading ? (
          <SmartLoading fallbackSkeleton={<VocalexTakesSkeleton />} />
        ) : takes.length === 0 ? (
          /* Empty State Section */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section
              data-purpose="takes-empty-state"
              style={{
                background: isLight
                  ? '#ffffff'
                  : isAmoled
                    ? '#000000'
                    : 'var(--app-surface-low, rgba(255,255,255,0.04))',
                borderRadius: 24,
                border: '1px solid var(--c-border, rgba(128,128,128,0.16))',
                padding: '36px 20px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: 'var(--shadow-surface-raised)',
                animation: 'tp-fade-up 350ms cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              {/* Clean Waveform Bars */}
              <div
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 48,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 20,
                    borderRadius: 9999,
                    background: 'var(--c-text-secondary)',
                    opacity: 0.35,
                  }}
                />
                <div
                  style={{
                    width: 5,
                    height: 36,
                    borderRadius: 9999,
                    background: 'var(--studio-accent, #007aff)',
                    opacity: 0.7,
                  }}
                />
                <div
                  style={{
                    width: 5,
                    height: 48,
                    borderRadius: 9999,
                    background: 'var(--studio-accent, #007aff)',
                  }}
                />
                <div
                  style={{
                    width: 5,
                    height: 28,
                    borderRadius: 9999,
                    background: 'var(--studio-accent, #007aff)',
                    opacity: 0.8,
                  }}
                />
                <div
                  style={{
                    width: 5,
                    height: 16,
                    borderRadius: 9999,
                    background: 'var(--c-text-secondary)',
                    opacity: 0.35,
                  }}
                />
              </div>

              {/* Heading and Instruction */}
              <h2
                style={{
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--c-text-primary)',
                  margin: '0 0 6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {t.vocalex.noTakesYet}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontSize: 13,
                  color: 'var(--c-text-secondary)',
                  margin: 0,
                  maxWidth: 240,
                  lineHeight: 1.5,
                }}
              >
                {t.vocalex.noTakesHint}
              </p>

              <Button
                variant="primary"
                isPill={true}
                onClick={handleCreateNewProject}
                style={{
                  marginTop: 18,
                  background: 'var(--studio-accent, #007aff)',
                  color: '#ffffff',
                  borderRadius: 9999,
                  padding: '9px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: 'var(--shadow-control-raised), 0 4px 14px 0 rgba(0, 122, 255, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                icon="mic"
              >
                {t.vocalex.newTake}
              </Button>

              {/* Lossless & Pitch Badges */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: '1px solid var(--c-border, rgba(128,128,128,0.12))',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    48 kHz
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 11,
                      color: 'var(--c-text-secondary)',
                      opacity: 0.8,
                    }}
                  >
                    {isEs ? 'Audio sin pérdida' : 'Lossless Audio'}
                  </span>
                </div>
                <div
                  style={{
                    height: 24,
                    width: 1,
                    background: 'var(--c-border, rgba(128,128,128,0.15))',
                  }}
                />
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    {isEs ? 'En vivo' : 'Real-time'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 11,
                      color: 'var(--c-text-secondary)',
                      opacity: 0.8,
                    }}
                  >
                    {isEs ? 'Detección de tono' : 'Pitch Tracking'}
                  </span>
                </div>
              </div>
            </section>

            {/* Quick Tips Section */}
            <section
              data-purpose="quick-guide-section"
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <h3
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: 11,
                  color: 'var(--c-text-secondary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '4px 0 2px 4px',
                }}
              >
                {isEs ? 'Consejos Rápidos' : 'Quick Tips'}
              </h3>

              {/* Tip 1 */}
              <div
                style={{
                  background: isLight
                    ? '#ffffff'
                    : isAmoled
                      ? '#000000'
                      : 'var(--app-surface-low, rgba(255,255,255,0.04))',
                  borderRadius: 18,
                  border: '1px solid var(--c-border, rgba(128,128,128,0.14))',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  boxShadow: 'var(--shadow-surface-soft)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 19, color: 'var(--studio-accent, #007aff)' }}
                  >
                    headphones
                  </span>
                </div>
                <div>
                  <h4
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--c-text-primary)',
                      margin: '0 0 2px',
                    }}
                  >
                    {isEs ? 'Monitoreo con Auriculares' : 'Headphone Monitoring'}
                  </h4>
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    {isEs
                      ? 'Conecta auriculares con cable para escuchar tu afinación sin latencia.'
                      : 'Connect wired headphones for latency-free pitch feedback.'}
                  </p>
                </div>
              </div>

              {/* Tip 2 */}
              <div
                style={{
                  background: isLight
                    ? '#ffffff'
                    : isAmoled
                      ? '#000000'
                      : 'var(--app-surface-low, rgba(255,255,255,0.04))',
                  borderRadius: 18,
                  border: '1px solid var(--c-border, rgba(128,128,128,0.14))',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  boxShadow: 'var(--shadow-surface-soft)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: '#10b981' }}
                  >
                    graphic_eq
                  </span>
                </div>
                <div>
                  <h4
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--c-text-primary)',
                      margin: '0 0 2px',
                    }}
                  >
                    {isEs ? 'Armonías y Mezcla' : 'Harmonies & Mixing'}
                  </h4>
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    {isEs
                      ? 'Abre cualquier toma para generar armonías vocales inteligentes y exportar pistas.'
                      : 'Open any take to generate intelligent vocal harmonies and export stems.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Takes List Section */
          <div
            data-purpose="takes-list"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {takes.map((take, index) => (
              <TakeListItem
                key={take.id}
                take={take}
                index={index}
                isPlaying={playingTakeId === take.id}
                isLight={isLight}
                isAmoled={isAmoled}
                onOpen={() => handleOpenDetail(take.id)}
                onTogglePlay={(e) => togglePlay(take, e)}
                onExport={(e) => handleExport(take, e)}
                onDelete={() => handleDelete(take.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TakeListItem({
  take,
  index,
  isPlaying,
  isLight,
  isAmoled,
  onOpen,
  onTogglePlay,
  onExport,
  onDelete,
}: {
  take: TakeRecord;
  index: number;
  isPlaying: boolean;
  isLight: boolean;
  isAmoled: boolean;
  onOpen: () => void;
  onTogglePlay: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        background: isLight
          ? '#ffffff'
          : isAmoled
            ? '#000000'
            : 'var(--app-surface-low, rgba(255,255,255,0.04))',
        borderRadius: 20,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `1px solid ${
          isPlaying ? 'var(--studio-accent, #007aff)' : 'var(--c-border, rgba(128,128,128,0.14))'
        }`,
        cursor: 'pointer',
        boxShadow: isPlaying ? '0 4px 18px rgba(0,122,255,0.22)' : 'var(--shadow-surface-soft)',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        animation: `tp-fade-up 350ms cubic-bezier(0.22,1,0.36,1) ${index * 35}ms both`,
      }}
    >
      {/* Play / Record Touch Button */}
      {take.durationMs === 0 ? (
        <button
          type="button"
          aria-label={t.vocalex.newTake || 'Record'}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 9999,
            background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
            color: 'var(--studio-accent, #007aff)',
            border: 'none',
            boxShadow: 'var(--shadow-control-raised)',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              fontVariationSettings: "'FILL' 1",
            }}
          >
            mic
          </span>
        </button>
      ) : (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause take' : 'Play take'}
          onClick={onTogglePlay}
          style={{
            width: 42,
            height: 42,
            borderRadius: 9999,
            background: isPlaying
              ? 'var(--studio-accent, #007aff)'
              : 'rgba(var(--studio-accent-rgb, 0,122,255), 0.10)',
            color: isPlaying ? '#ffffff' : 'var(--studio-accent, #007aff)',
            border: 'none',
            boxShadow: isPlaying
              ? '0 4px 14px rgba(0, 122, 255, 0.35)'
              : 'var(--shadow-control-raised)',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 22,
              fontVariationSettings: "'FILL' 1",
              marginLeft: isPlaying ? 0 : 2,
            }}
          >
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      )}

      {/* Take Titles & Metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontFamily: 'var(--studio-font-display)',
            fontWeight: 700,
            fontSize: 14.5,
            color: 'var(--c-text-primary)',
            margin: '0 0 3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}
        >
          {take.name}
        </h4>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--studio-font-body)',
            fontSize: 11.5,
            color: 'var(--c-text-secondary)',
          }}
        >
          <span>{formatDateI18n(take.createdAt, t.vocalex)}</span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'var(--c-text-secondary)',
              opacity: 0.5,
            }}
          />
          {take.durationMs === 0 ? (
            <span
              style={{
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--studio-accent, #007aff)',
                background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
                padding: '2px 8px',
                borderRadius: 9999,
                letterSpacing: '0.04em',
              }}
            >
              READY TO RECORD
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--studio-font-mono)', fontWeight: 600 }}>
              {formatDuration(take.durationMs)}
            </span>
          )}
          {take.sampleRate ? (
            <>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'var(--c-text-secondary)',
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--studio-font-mono)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {Math.round(take.sampleRate / 1000)}k
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Mini Waveform Visualization */}
      <MiniWaveform peaks={take.waveformPeaks} isPlaying={isPlaying} />

      {/* Action Buttons: Export & Delete */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Export .wav (only if recorded) */}
        {take.durationMs > 0 && (
          <button
            type="button"
            aria-label="Export take"
            onClick={onExport}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9999,
              background: 'transparent',
              border: 'none',
              color: 'var(--c-text-secondary)',
              opacity: 0.75,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 150ms ease, background 150ms ease',
            }}
            title="Export audio (.wav)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          aria-label="Delete take"
          onClick={() => setConfirming(true)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 9999,
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-secondary)',
            opacity: 0.75,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 150ms ease, background 150ms ease',
          }}
          title={t.vocalex.deleteTake}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            delete
          </span>
        </button>
      </div>

      {/* Chevron Navigation Indicator */}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 18,
          color: 'var(--c-text-secondary)',
          opacity: 0.35,
          flexShrink: 0,
        }}
      >
        chevron_right
      </span>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.vocalex.deleteConfirmTitle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--studio-font-body)',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {t.vocalex.deleteConfirmBody}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => setConfirming(false)} style={{ flex: 1 }}>
              {t.vocalex.cancelAction}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onDelete();
                setConfirming(false);
              }}
              style={{ flex: 1, background: 'var(--c-error, #ef4444)', color: '#ffffff' }}
            >
              {t.vocalex.deleteTake}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function MiniWaveform({ peaks, isPlaying }: { peaks: number[]; isPlaying: boolean }) {
  const display = useMemo(() => {
    if (!peaks || peaks.length === 0) {
      return [20, 35, 60, 45, 25, 40, 70, 50, 30, 20];
    }
    const targetCount = 10;
    if (peaks.length > targetCount) {
      const step = Math.ceil(peaks.length / targetCount);
      return peaks.filter((_, i) => i % step === 0).slice(0, targetCount);
    }
    return peaks;
  }, [peaks]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 24,
        flexShrink: 0,
        opacity: isPlaying ? 1 : 0.45,
        transition: 'opacity 180ms ease',
      }}
    >
      {display.map((h, i) => (
        <div
          key={i}
          style={{
            width: 2.5,
            height: `${Math.max(14, Math.min(100, h))}%`,
            background: isPlaying ? 'var(--studio-accent, #007aff)' : 'var(--c-text-secondary)',
            borderRadius: 9999,
            transition: 'background 200ms ease, height 180ms ease',
            animation: isPlaying ? `tp-bar-pulse 800ms ease-in-out ${i * 80}ms infinite` : 'none',
          }}
        />
      ))}
    </div>
  );
}
