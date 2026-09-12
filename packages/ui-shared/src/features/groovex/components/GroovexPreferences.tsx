import {
  useT,
  APP_VERSION_LABEL,
  useScrollHide,
  useIsWebDesktop,
  useSettingsStore,
  groovexStemRepository,
  type SongCacheInfo,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGroovexStore } from '../state/useGroovexStore';
import { SONG_CATALOG } from '../services/songCatalog';
import { Dialog } from '../../../shared/design-system/dialogs';
import { Button } from '../../../shared/design-system/StudioDesignSystem';

// Canonical conversions for Master Gain:
// Range: -24 dB to +6 dB, with 0 dB at center position (50%).
// Stored preference: linear gain where 1.0 represents 0 dB unity gain.
export function dbToGain(db: number): number {
  return Number(Math.pow(10, db / 20).toFixed(3));
}

export function gainToDb(gain: number): number {
  if (!gain || gain <= 0.063) return -24;
  return Math.round(20 * Math.log10(gain));
}

export function dbToSliderPos(db: number): number {
  const clamped = Math.max(-24, Math.min(6, db));
  if (clamped <= 0) {
    // -24 dB..0 dB maps to 0..50
    return Math.round(((clamped + 24) / 24) * 50);
  }
  // 0 dB..+6 dB maps to 50..100
  return Math.round(50 + (clamped / 6) * 50);
}

export function sliderPosToDb(pos: number): number {
  const clamped = Math.max(0, Math.min(100, pos));
  if (clamped <= 50) {
    // 0..50 maps to -24..0 dB
    return Math.round(-24 + (clamped / 50) * 24);
  }
  // 50..100 maps to 0..+6 dB
  return Math.round(((clamped - 50) / 50) * 6);
}

export default function GroovexPreferences() {
  const t = useT();
  const preferences = useGroovexStore((s) => s.preferences);
  const updatePreferences = useGroovexStore((s) => s.updatePreferences);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);

  const [cacheInfo, setCacheInfo] = useState({ totalBytes: 0, songCount: 0, stemCount: 0 });
  const [songCaches, setSongCaches] = useState<SongCacheInfo[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const isWebDesktop = useIsWebDesktop();

  const refreshCache = useCallback(() => {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    groovexStemRepository
      .getCacheSize()
      .then(setCacheInfo)
      .catch(() => {});
    groovexStemRepository
      .getPerSongCacheInfo()
      .then(setSongCaches)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleDeleteSong(songId: string) {
    setDeletingId(songId);
    try {
      await groovexStemRepository.clearSongCache(songId);
      await refreshCache();
    } catch {
      // silently handle cache error
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll() {
    try {
      await groovexStemRepository.clearAllCache();
      await refreshCache();
    } catch {
      // silently handle cache error
    } finally {
      setConfirmDeleteAll(false);
    }
  }

  function songMeta(songId: string) {
    return SONG_CATALOG.find((s) => s.id === songId);
  }

  const settings = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      perApp: s.settings.perApp,
    }))
  );
  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = Boolean(
    !isLight && (settings.amoledMode || settings.perApp?.groovex?.amoledMode)
  );

  // Master Gain canonical decibel mapping:
  // preferences.masterVolume = 1.0 -> 0 dB (center position 50).
  const currentDb = gainToDb(preferences.masterVolume);
  const displayDb = currentDb > 0 ? `+${currentDb} dB` : `${currentDb} dB`;
  const masterSliderPos = dbToSliderPos(currentDb);

  // Default Stem Volume calculation:
  // defaultStemVolume default 0.85 -> 85%.
  const currentStemPct = Math.round(preferences.defaultStemVolume * 100);

  const cardBg = isAmoled ? '#000000' : isLight ? '#ffffff' : 'var(--app-surface, #141417)';
  const cardBorder = isAmoled
    ? '1px solid rgba(255, 255, 255, 0.12)'
    : isLight
      ? '1px solid rgba(0, 0, 0, 0.06)'
      : '1px solid rgba(255, 255, 255, 0.07)';

  const cardStyle: React.CSSProperties = {
    backgroundColor: cardBg,
    borderRadius: 24,
    padding: '20px',
    boxShadow: 'var(--shadow-surface-raised)',
    border: cardBorder,
  };

  const thumbRing = isLight ? '#ffffff' : cardBg;

  return (
    <div
      ref={scrollRef}
      className="w-full no-scrollbar"
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--app-bg)',
      }}
    >
      <style>{`
        input[type=range].stitch-range-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          margin: 0;
          padding: 0;
        }
        input[type=range].stitch-range-slider:focus {
          outline: none;
        }
        input[type=range].stitch-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: var(--app-accent, #007aff);
          box-shadow: 0 2px 6px rgba(0, 122, 255, 0.35), 0 0 0 3px ${thumbRing};
          margin-top: -8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        input[type=range].stitch-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.15);
          box-shadow: 0 3px 10px rgba(0, 122, 255, 0.45), 0 0 0 4px ${thumbRing};
        }
        input[type=range].stitch-range-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          border-radius: 9999px;
          background: transparent;
        }
        input[type=range].stitch-range-slider::-moz-range-thumb {
          height: 22px;
          width: 22px;
          border: 3px solid ${thumbRing};
          border-radius: 50%;
          background: var(--app-accent, #007aff);
          box-shadow: 0 2px 6px rgba(0, 122, 255, 0.35);
          transition: transform 0.15s ease;
        }
        input[type=range].stitch-range-slider::-moz-range-thumb:active {
          transform: scale(1.15);
        }
        input[type=range].stitch-range-slider::-moz-range-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>

      <div
        style={{
          maxWidth: 600,
          margin: isWebDesktop ? '0' : '0 auto',
          padding: '0 var(--page-header-inset-h, var(--page-inset-h, 20px))',
          paddingBottom:
            'calc(var(--content-bottom-pad, 96px) + env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        {/* ── STITCH SCREEN HEADER ── */}
        <section
          data-purpose="screen-title-section"
          style={{
            paddingTop: isWebDesktop
              ? '16px'
              : 'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 40px))',
            paddingBottom: '20px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1
              style={{
                fontFamily: 'var(--studio-font-display)',
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: 'var(--c-text-primary, var(--text))',
                margin: 0,
              }}
            >
              {t.groovex.preferences || 'Preferences'}
            </h1>
          </div>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--c-text-secondary, var(--muted))',
              marginTop: '4px',
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            Customize how GrooveX feels and sounds
          </p>
        </section>

        {/* ── SETTINGS STACK ── */}
        <div
          data-purpose="settings-stack"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* ── SECTION 1: DEFAULT VOLUME LEVELS ── */}
          <section data-purpose="audio-engine-card" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: isLight ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.16)',
                  border: `1px solid ${
                    isLight ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.28)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--app-accent, #007aff)',
                  flexShrink: 0,
                }}
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M4 9h3v11H4zm6-5h3v16h-3zm6 8h3v8h-3z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, var(--text))',
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {t.groovex.defaultVolumeLevels}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: '12px',
                    color: 'var(--c-text-secondary, var(--muted))',
                    margin: '2px 0 0',
                    fontWeight: 500,
                  }}
                >
                  Fine-tune the output behavior and states
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>
              {/* Master Gain Slider */}
              <StitchRangeSlider
                id="master-gain"
                label={t.groovex.masterGain}
                value={masterSliderPos}
                min={0}
                max={100}
                step={1}
                displayValue={displayDb}
                ticks={[{ label: '-24 dB' }, { label: '0 dB' }, { label: '+6 dB' }]}
                onChange={(newPos) => {
                  const newDb = sliderPosToDb(newPos);
                  const vol = dbToGain(newDb);
                  updatePreferences({ masterVolume: vol });
                }}
                isLight={isLight}
              />

              {/* Default Stem Volume Slider */}
              <StitchRangeSlider
                id="stem-volume"
                label={t.groovex.defaultStemVolume}
                value={currentStemPct}
                min={0}
                max={100}
                step={1}
                displayValue={`${currentStemPct}%`}
                ticks={[{ label: '0%' }, { label: '50%' }, { label: '100%' }]}
                onChange={(newPct) => {
                  const vol = Math.max(0, Math.min(1.0, Number((newPct / 100).toFixed(2))));
                  updatePreferences({ defaultStemVolume: vol });
                }}
                isLight={isLight}
              />
            </div>
          </section>

          {/* ── SECTION 2: PLAYBACK AUTOMATIONS ── */}
          <section data-purpose="playback-settings-card" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: isLight ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.16)',
                  border: `1px solid ${
                    isLight ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.28)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--app-accent, #007aff)',
                  flexShrink: 0,
                }}
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, var(--text))',
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {t.groovex.playback}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: '12px',
                    color: 'var(--c-text-secondary, var(--muted))',
                    margin: '2px 0 0',
                    fontWeight: 500,
                  }}
                >
                  Player timeline and loop automations
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <StitchToggleRow
                label={t.groovex.autoPlayOnLoad}
                subtitle="Begin playing instantly when opening tracks"
                value={preferences.autoPlay}
                onChange={(v) => updatePreferences({ autoPlay: v })}
                dataPurpose="toggle-row-autoplay"
                isLight={isLight}
              />
              <div
                style={{
                  height: 1,
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                }}
              />
              <StitchToggleRow
                label={t.groovex.infiniteLoop}
                subtitle="Seamlessly repeat audio at timeline end"
                value={preferences.loopPlayback}
                onChange={(v) => updatePreferences({ loopPlayback: v })}
                dataPurpose="toggle-row-loop"
                isLight={isLight}
              />
              <div
                style={{
                  height: 1,
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                }}
              />
              <StitchToggleRow
                label={t.groovex.prerollCountIn}
                subtitle="1-bar metronome beat before playback"
                value={preferences.countIn}
                onChange={(v) => updatePreferences({ countIn: v })}
                dataPurpose="toggle-row-countin"
                isLight={isLight}
              />
            </div>
          </section>

          {/* ── SECTION 3: DOWNLOADED SONGS ── */}
          <section data-purpose="downloaded-songs-card" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: isLight ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.16)',
                  border: `1px solid ${
                    isLight ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.28)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--app-accent, #007aff)',
                  flexShrink: 0,
                }}
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, var(--text))',
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {t.groovex.downloadedSongs}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: '12px',
                    color: 'var(--c-text-secondary, var(--muted))',
                    margin: '2px 0 0',
                    fontWeight: 500,
                  }}
                >
                  Local cache &amp; offline audio stems
                </p>
              </div>
            </div>

            {/* Metric Display */}
            <div
              style={{
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.025)' : 'rgba(255, 255, 255, 0.035)',
                borderRadius: 18,
                padding: '16px',
                border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'}`,
                marginBottom: 12,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--c-text-secondary, var(--muted))',
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  Storage Used
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--c-text-secondary, var(--muted))',
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  {t.groovex.songUnit(cacheInfo.songCount)} • {cacheInfo.stemCount} stems
                </span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--c-text-primary, var(--text))',
                  fontFamily: 'var(--studio-font-display)',
                }}
              >
                {formatBytes(cacheInfo.totalBytes)}
              </div>
            </div>

            {cacheInfo.songCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={deletingId !== null}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer',
                    backgroundColor: isLight
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(239, 68, 68, 0.16)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'var(--studio-font-body)',
                    opacity: deletingId ? 0.5 : 1,
                    transition: 'opacity 150ms ease, background-color 150ms ease',
                  }}
                >
                  {t.groovex.deleteAll}
                </button>
              </div>
            )}

            {songCaches.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginTop: 6,
                  marginBottom: 12,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
                className="no-scrollbar"
              >
                {songCaches.map((sc) => {
                  const meta = songMeta(sc.songId);
                  const isDeleting = deletingId === sc.songId || deletingId === '__all__';
                  return (
                    <div
                      key={sc.songId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        backgroundColor: isLight
                          ? 'rgba(0, 0, 0, 0.02)'
                          : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 12,
                        opacity: isDeleting ? 0.4 : 1,
                        transition: 'opacity 200ms ease',
                        border: isLight
                          ? '1px solid rgba(0, 0, 0, 0.05)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 22,
                          color: 'var(--app-accent, #007aff)',
                          flexShrink: 0,
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        album
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--c-text-primary, var(--text))',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'var(--studio-font-body)',
                          }}
                        >
                          {meta?.title ?? sc.songId}
                        </p>
                        <p
                          style={{
                            fontSize: '11px',
                            color: 'var(--c-text-secondary, var(--muted))',
                            margin: '2px 0 0',
                            fontFamily: 'var(--studio-font-body)',
                          }}
                        >
                          {meta?.artist ?? t.groovex.unknown} • {sc.stemCount} stems •{' '}
                          {formatBytes(sc.totalBytes)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSong(sc.songId)}
                        disabled={deletingId !== null}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          cursor: deletingId ? 'default' : 'pointer',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          opacity: deletingId && !isDeleting ? 0.3 : 1,
                          transition: 'opacity 150ms ease',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16, color: '#ef4444' }}
                        >
                          {isDeleting ? 'hourglass_empty' : 'delete'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <p
              style={{
                fontSize: '12px',
                color: 'var(--c-text-secondary, var(--muted))',
                margin: 0,
                fontFamily: 'var(--studio-font-body)',
                lineHeight: 1.5,
              }}
            >
              {songCaches.length === 0
                ? t.groovex.noSongsDownloaded
                : t.groovex.downloadedSongsHint}
            </p>

            <Dialog
              open={confirmDeleteAll}
              onClose={() => setConfirmDeleteAll(false)}
              title={t.groovex.deleteAll}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--c-text-primary, var(--text))',
                    lineHeight: 1.5,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  Are you sure you want to delete all downloaded song caches?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button onClick={() => setConfirmDeleteAll(false)} style={{ flex: 1 }}>
                    {t.groovex.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleClearAll}
                    style={{ flex: 1, backgroundColor: '#ef4444', color: '#ffffff' }}
                  >
                    {t.groovex.confirm}
                  </Button>
                </div>
              </div>
            </Dialog>
          </section>

          {/* ── SECTION 4: ABOUT GROOVEX ── */}
          <section data-purpose="about-groovex-card" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: isLight ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.16)',
                  border: `1px solid ${
                    isLight ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.28)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--app-accent, #007aff)',
                  flexShrink: 0,
                }}
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, var(--text))',
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {t.groovex.aboutGroovex}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: '12px',
                    color: 'var(--c-text-secondary, var(--muted))',
                    margin: '2px 0 0',
                    fontWeight: 500,
                  }}
                >
                  Multitrack practice tool &amp; audio engine
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--c-text-secondary, var(--muted))',
                  margin: 0,
                  fontFamily: 'var(--studio-font-body)',
                  lineHeight: 1.55,
                }}
              >
                {t.groovex.aboutDesc1}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--c-text-secondary, var(--muted))',
                  margin: 0,
                  fontFamily: 'var(--studio-font-body)',
                  lineHeight: 1.55,
                }}
              >
                {t.groovex.aboutDesc2}
              </p>
              <div
                style={{
                  paddingTop: 8,
                  marginTop: 2,
                  borderTop: `1px solid ${
                    isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)'
                  }`,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--c-text-secondary, var(--muted))',
                    fontFamily: 'var(--studio-font-body)',
                    opacity: 0.8,
                  }}
                >
                  {APP_VERSION_LABEL} • {t.groovex.aboutVersion}
                </span>
              </div>
            </div>
          </section>

          {/* ── SECTION 5: RESET ALL PREFERENCES ── */}
          <section
            data-purpose="reset-preferences-card"
            style={{
              backgroundColor: cardBg,
              borderRadius: 24,
              padding: '20px',
              boxShadow: isLight
                ? '0 2px 12px rgba(239, 68, 68, 0.04)'
                : '0 4px 20px rgba(0, 0, 0, 0.25)',
              border: `1px solid ${isLight ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 12,
                  backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.16)',
                  border: `1px solid ${
                    isLight ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--c-text-primary, var(--text))',
                    margin: 0,
                    fontFamily: 'var(--studio-font-display)',
                  }}
                >
                  {t.groovex.resetAllPreferences}
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--c-text-secondary, var(--muted))',
                    margin: '4px 0 0',
                    lineHeight: 1.45,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  {t.groovex.resetDesc}
                </p>
              </div>
            </div>

            <div style={{ paddingTop: 4 }}>
              <button
                id="reset-btn"
                type="button"
                onClick={() => setConfirmReset(true)}
                style={{
                  width: isWebDesktop ? 'auto' : '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.16)',
                  color: '#ef4444',
                  border: `1px solid ${
                    isLight ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)'
                  }`,
                  borderRadius: 16,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--studio-font-body)',
                  transition: 'background-color 150ms ease, transform 150ms ease',
                }}
              >
                {t.groovex.resetToDefaults}
              </button>
            </div>

            <Dialog
              open={confirmReset}
              onClose={() => setConfirmReset(false)}
              title={t.groovex.resetAllPreferences}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--c-text-primary, var(--text))',
                    lineHeight: 1.5,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  {t.groovex.resetDesc}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button onClick={() => setConfirmReset(false)} style={{ flex: 1 }}>
                    {t.groovex.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      updatePreferences({
                        masterVolume: 1.0,
                        loopPlayback: false,
                        autoPlay: false,
                        countIn: false,
                        defaultStemVolume: 0.85,
                      });
                      setConfirmReset(false);
                    }}
                    style={{ flex: 1, backgroundColor: '#ef4444', color: '#ffffff' }}
                  >
                    {t.groovex.resetToDefaults}
                  </Button>
                </div>
              </div>
            </Dialog>
          </section>
        </div>
      </div>
    </div>
  );
}

function StitchRangeSlider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  ticks,
  onChange,
  isLight,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue: string;
  ticks: { label: string }[];
  onChange: (val: number) => void;
  isLight: boolean;
}) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const trackBg = isLight ? '#e5e7eb' : 'rgba(255, 255, 255, 0.12)';
  const accentColor = 'var(--app-accent, #007aff)';

  return (
    <div data-purpose={`slider-container-${id}`}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <label
          htmlFor={id}
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--c-text-secondary, var(--muted))',
            fontFamily: 'var(--studio-font-body)',
          }}
        >
          {label}
        </label>
        <span
          id={`${id}-val`}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: accentColor,
            fontFamily: 'var(--studio-font-mono, monospace)',
            letterSpacing: '-0.02em',
          }}
        >
          {displayValue}
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 28 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="stitch-range-slider"
          style={{
            width: '100%',
            height: 6,
            borderRadius: 9999,
            outline: 'none',
            background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--c-text-secondary, var(--muted))',
          fontWeight: 500,
          marginTop: 4,
          fontFamily: 'var(--studio-font-body)',
          opacity: 0.75,
        }}
      >
        {ticks.map((t, idx) => (
          <span key={idx}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}

function StitchToggleRow({
  label,
  subtitle,
  value,
  onChange,
  dataPurpose,
  isLight,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  dataPurpose: string;
  isLight: boolean;
}) {
  return (
    <div
      data-purpose={dataPurpose}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
      }}
    >
      <div style={{ paddingRight: 16, minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--c-text-primary, var(--text))',
            margin: 0,
            lineHeight: 1.35,
            fontFamily: 'var(--studio-font-body)',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--c-text-secondary, var(--muted))',
            margin: '2px 0 0',
            fontFamily: 'var(--studio-font-body)',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        data-toggle="switch"
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: 28,
          width: 48,
          flexShrink: 0,
          cursor: 'pointer',
          borderRadius: 9999,
          border: '2px solid transparent',
          backgroundColor: value
            ? 'var(--app-accent, #007aff)'
            : isLight
              ? 'rgba(0, 0, 0, 0.12)'
              : 'rgba(255, 255, 255, 0.15)',
          transition: 'background-color 200ms ease-in-out',
          outline: 'none',
          padding: 0,
        }}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          style={{
            pointerEvents: 'none',
            display: 'inline-block',
            height: 24,
            width: 24,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
            transform: value ? 'translateX(20px)' : 'translateX(0px)',
            transition: 'transform 200ms ease-in-out',
          }}
        />
      </button>
    </div>
  );
}
