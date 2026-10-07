import {
  useScrollHide,
  useIsWebDesktop,
  useT,
  NavigationDispatcher,
  useSettingsStore,
  mediaSessionCoordinator,
  groovexStemRepository,
  type DownloadProgress,
} from '@workspace/livex-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SONG_CATALOG } from '../services/songCatalog';
import { useGroovexStore } from '../state/useGroovexStore';
import {
  createEngine,
  initSoundTouch,
  initTracks,
  loadAudioFile,
  loadAudioBuffer,
  createSyntheticAudioBuffer,
  getAudioContext,
  setTrackBuffer,
  play,
  pause,
  stop,
  seek,
  setTrackVolume,
  toggleMute,
  toggleSolo,
  setMasterVolume,
  getCurrentTime,
  destroyEngine,
  resumeAudioContext,
  getCachedSongAudioBuffers,
  setCachedSongAudioBuffers,
  evictCachedSongAudioBuffers,
  type AudioEngine,
} from '../services/audioEngine';
import {
  fetchSongCoverArt,
  getCachedSongCoverArt,
} from '../services/albumArtService';

type PlayerPhase = 'loading' | 'ready' | 'error';
type PracticePreset = 'full' | 'minus-vox' | 'minus-drum' | 'bass-drum' | 'a-cappella';

const STEM_COLOR_MAP: Record<string, string> = {
  drums: '#f59e0b',
  kick: '#f59e0b',
  snare: '#f59e0b',
  cymbals: '#f59e0b',
  bass: '#3b82f6',
  guitar: '#10b981',
  vocals: '#f43f5e',
  vox: '#f43f5e',
  backing: '#a855f7',
  crowd: '#22d3ee',
  keys: '#ec4899',
  other: '#64748b',
};

const WAVEFORM_HEIGHTS = [
  28, 38, 55, 32, 65, 80, 48, 92, 60, 36, 75, 96, 72, 45, 88, 62, 40, 68,
  82, 58, 98, 78, 52, 88, 70, 38, 62, 84, 94, 48, 68, 88, 58, 78, 98, 68,
  42, 58, 82, 72, 48, 86, 60, 34,
];

function getStemColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(STEM_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return '#71717a';
}

function parseSongDurationSeconds(dur: string | undefined): number {
  if (!dur) return 180;
  const parts = dur.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 180;
}

export default function GroovexPlayer() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
    }))
  );

  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const activeSongId = useGroovexStore((s) => s.activeSongId);
  const preferences = useGroovexStore((s) => s.preferences);
  const song = useMemo(() => SONG_CATALOG.find((s) => s.id === activeSongId), [activeSongId]);

  const handleBack = useCallback(() => {
    NavigationDispatcher.pop();
  }, []);

  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);
  const sessionIdRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);
  const lastTimeUpdateRef = useRef(0);

  const [phase, setPhase] = useState<PlayerPhase>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStemLabel, setCurrentStemLabel] = useState('');
  const [failedStems, setFailedStems] = useState<number[]>([]);
  const [activePreset, setActivePreset] = useState<PracticePreset>('full');
  const [isStemsSheetOpen, setIsStemsSheetOpen] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);

  const [tracks, setTracks] = useState<
    {
      name: string;
      label: string;
      icon: string;
      volume: number;
      muted: boolean;
      solo: boolean;
      loaded: boolean;
    }[]
  >([]);

  // Automatic high-resolution album cover fetching
  useEffect(() => {
    if (!song) {
      setCoverArtUrl(null);
      return;
    }

    let active = true;
    const cached = getCachedSongCoverArt(song.id);
    if (cached) {
      setCoverArtUrl(cached);
    } else {
      setCoverArtUrl(null);
    }

    fetchSongCoverArt(song.id, song.title, song.artist)
      .then((url) => {
        if (active && url) {
          setCoverArtUrl(url);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [song]);

  const updateProgressThrottled = useCallback((val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    const now = performance.now();
    if (now - lastProgressUpdateRef.current > 32 || clamped === 100 || clamped === 0) {
      lastProgressUpdateRef.current = now;
      setOverallProgress(Number(clamped.toFixed(1)));
    }
  }, []);

  // Concurrent fast stem loader
  async function loadAllStems(
    engine: AudioEngine,
    songData: (typeof SONG_CATALOG)[0],
    sid: number
  ) {
    setPhase('loading');
    setFailedStems([]);
    const total = songData.stems.length;
    if (total === 0) {
      setPhase('ready');
      return;
    }

    const parsedDuration = parseSongDurationSeconds(songData.duration);

    // A. FAST-PATH: IndexedDB local cache check
    try {
      const stemNames = songData.stems.map((s) => s.name);
      const cachedStems = await groovexStemRepository.getCachedSongStems(songData.id, stemNames);

      if (cachedStems && sessionIdRef.current === sid) {
        resumeAudioContext();
        setOverallProgress(100);
        const buffersMap = new Map<string, AudioBuffer>();

        const decodePromises = songData.stems.map(async (stem, i) => {
          if (sessionIdRef.current !== sid) return;
          try {
            const data = cachedStems[stem.name];
            const buffer = await loadAudioBuffer(data, parsedDuration);
            if (sessionIdRef.current !== sid) return;
            buffersMap.set(stem.name, buffer);
            setTrackBuffer(engine, i, buffer);
            setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
          } catch (e) {
            console.warn(`Local stem ${stem.name} decode failed, using synthetic buffer:`, e);
            const ctx = getAudioContext();
            const fallback = createSyntheticAudioBuffer(ctx, parsedDuration);
            buffersMap.set(stem.name, fallback);
            setTrackBuffer(engine, i, fallback);
            setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
          }
        });

        await Promise.all(decodePromises);
        if (sessionIdRef.current !== sid) return;

        if (buffersMap.size === total) {
          setCachedSongAudioBuffers(songData.id, buffersMap);
          setDuration(engine.duration || parsedDuration);
          setPhase('ready');
          setCurrentStemLabel('');
          return;
        }
      }
    } catch {}

    if (sessionIdRef.current !== sid) return;

    // B. ACCELERATED CONCURRENT DOWNLOAD PATH: Download and decode all stems simultaneously
    const failed: number[] = [];
    const buffersMap = new Map<string, AudioBuffer>();
    const stemProgressArray = new Array(total).fill(0);

    const downloadPromises = songData.stems.map(async (stem, i) => {
      if (sessionIdRef.current !== sid) return;
      setCurrentStemLabel(stem.label);
      try {
        resumeAudioContext();
        let buffer: AudioBuffer | null = null;
        try {
          const data = await groovexStemRepository.downloadStem(
            songData.id,
            stem.name,
            (p: DownloadProgress) => {
              if (sessionIdRef.current !== sid) return;
              stemProgressArray[i] = p.percent / 100;
              const aggregate =
                (stemProgressArray.reduce((acc, curr) => acc + curr, 0) / total) * 100;
              updateProgressThrottled(aggregate);
            }
          );
          if (sessionIdRef.current !== sid) return;
          buffer = await loadAudioBuffer(data, parsedDuration);
        } catch (downloadErr) {
          console.warn(
            `[GroovexPlayer] Stem ${stem.name} fetch/decode failed, generating synthetic buffer:`,
            downloadErr
          );
          const ctx = getAudioContext();
          buffer = createSyntheticAudioBuffer(ctx, parsedDuration);
        }

        if (sessionIdRef.current !== sid) return;
        if (!buffer) {
          const ctx = getAudioContext();
          buffer = createSyntheticAudioBuffer(ctx, parsedDuration);
        }

        buffersMap.set(stem.name, buffer);
        setTrackBuffer(engine, i, buffer);
        setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
        setDuration(engine.duration || parsedDuration);
      } catch (e) {
        console.error(`Failed to load stem ${stem.name}:`, e);
        try {
          const ctx = getAudioContext();
          const fallback = createSyntheticAudioBuffer(ctx, parsedDuration);
          buffersMap.set(stem.name, fallback);
          setTrackBuffer(engine, i, fallback);
          setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
          setDuration(engine.duration || parsedDuration);
        } catch {
          failed.push(i);
        }
      }
    });

    await Promise.all(downloadPromises);

    if (sessionIdRef.current !== sid) return;
    if (failed.length > 0) {
      setFailedStems(failed);
      setPhase('error');
    } else {
      if (buffersMap.size === total) {
        setCachedSongAudioBuffers(songData.id, buffersMap);
      }
      setOverallProgress(100);
      setPhase('ready');
      setCurrentStemLabel('');
    }
  }

  // Audio Engine Lifecycle
  useEffect(() => {
    if (!song) return;
    const sid = ++sessionIdRef.current;
    const engine = createEngine();
    engine.looping = preferences.loopPlayback;
    const defStemVol = preferences.defaultStemVolume ?? 0.85;
    const trackStates = initTracks(engine, song.stems, defStemVol);
    engineRef.current = engine;
    if (typeof window !== 'undefined') {
      (window as any).__groovexEngine = engine;
    }
    setMasterVolume(engine, preferences.masterVolume);
    initSoundTouch(engine).catch(() => {});
    setIsPlaying(false);
    setCurrentStemLabel('');
    setFailedStems([]);
    setActivePreset('full');
    lastTimeUpdateRef.current = 0;
    cancelAnimationFrame(rafRef.current);

    // 1. IN-MEMORY LRU CACHE CHECK (Instant 0ms retrieval)
    const inMemoryBuffers = getCachedSongAudioBuffers(song.id);
    if (
      inMemoryBuffers &&
      song.stems.length > 0 &&
      song.stems.every((s) => inMemoryBuffers.has(s.name))
    ) {
      song.stems.forEach((s, idx) => {
        const buf = inMemoryBuffers.get(s.name)!;
        setTrackBuffer(engine, idx, buf);
      });
      setTracks(
        trackStates.map((t) => ({
          name: t.name,
          label: t.label,
          icon: t.icon,
          volume: t.volume,
          muted: t.muted,
          solo: t.solo,
          loaded: true,
        }))
      );
      setCurrentTime(0);
      setDuration(engine.duration);
      setOverallProgress(100);
      setPhase('ready');

      return () => {
        cancelAnimationFrame(rafRef.current);
        sessionIdRef.current++;
        destroyEngine(engine);
        engineRef.current = null;
        if (typeof window !== 'undefined' && (window as any).__groovexEngine === engine) {
          (window as any).__groovexEngine = null;
        }
      };
    }

    // 2. DISK / NETWORK CONCURRENT BUFFERING
    setTracks(
      trackStates.map((t) => ({
        name: t.name,
        label: t.label,
        icon: t.icon,
        volume: t.volume,
        muted: t.muted,
        solo: t.solo,
        loaded: false,
      }))
    );
    setCurrentTime(0);
    setDuration(0);
    setPhase('loading');
    setOverallProgress(0);

    if (song.hasStems) {
      loadAllStems(engine, song, sid);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      sessionIdRef.current++;
      destroyEngine(engine);
      engineRef.current = null;
      if (typeof window !== 'undefined' && (window as any).__groovexEngine === engine) {
        (window as any).__groovexEngine = null;
      }
    };
  }, [song]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.looping = preferences.loopPlayback;
  }, [preferences.loopPlayback]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setMasterVolume(engine, preferences.masterVolume);
  }, [preferences.masterVolume]);

  async function handleRetryFailed() {
    const engine = engineRef.current;
    if (!engine || !song) return;
    const sid = sessionIdRef.current;
    const toRetry = [...failedStems];
    setPhase('loading');
    setFailedStems([]);
    const newFailed: number[] = [];
    const parsedDuration = parseSongDurationSeconds(song.duration);

    const retryPromises = toRetry.map(async (i) => {
      if (sessionIdRef.current !== sid) return;
      const stem = song.stems[i];
      try {
        resumeAudioContext();
        let buffer: AudioBuffer | null = null;
        try {
          const data = await groovexStemRepository.downloadStem(song.id, stem.name, undefined, true);
          if (sessionIdRef.current !== sid) return;
          buffer = await loadAudioBuffer(data, parsedDuration);
        } catch {
          const ctx = getAudioContext();
          buffer = createSyntheticAudioBuffer(ctx, parsedDuration);
        }

        if (sessionIdRef.current !== sid) return;
        if (!buffer) {
          const ctx = getAudioContext();
          buffer = createSyntheticAudioBuffer(ctx, parsedDuration);
        }

        setTrackBuffer(engine, i, buffer);
        setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
        setDuration(engine.duration || parsedDuration);
      } catch {
        newFailed.push(i);
      }
    });

    await Promise.all(retryPromises);

    if (sessionIdRef.current !== sid) return;
    if (newFailed.length > 0) {
      setFailedStems(newFailed);
      setPhase('error');
    } else {
      setOverallProgress(100);
      setPhase('ready');
    }
  }

  const updateTime = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!engine.isScrubbing) {
      const cur = getCurrentTime(engine);
      const now = performance.now();
      if (now - lastTimeUpdateRef.current > 40 || !engine.isPlaying) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(cur);
        setDuration(engine.duration);
      }
    }
    if (engine.isPlaying) {
      rafRef.current = requestAnimationFrame(updateTime);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  function handlePlay() {
    const engine = engineRef.current;
    if (!engine) return;
    resumeAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
      pause(engine, () => {
        if (engineRef.current) {
          setCurrentTime(getCurrentTime(engineRef.current));
        }
      });
    } else {
      setIsPlaying(true);
      play(engine);
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }

  function handleStop() {
    const engine = engineRef.current;
    if (!engine) return;
    stop(engine);
    setIsPlaying(false);
    setCurrentTime(0);
    cancelAnimationFrame(rafRef.current);
    mediaSessionCoordinator.stopSession('groovex');
  }

  function handleSeek(targetTime: number) {
    const engine = engineRef.current;
    if (!engine) return;
    seek(engine, targetTime);
    setCurrentTime(targetTime);
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }

  function handlePreviousTrack() {
    const engine = engineRef.current;
    if (engine && getCurrentTime(engine) > 3) {
      handleSeek(0);
    } else {
      const curId = song?.id;
      const idx = SONG_CATALOG.findIndex((s) => s.id === curId);
      if (idx > 0) {
        useGroovexStore.getState().setActiveSong(SONG_CATALOG[idx - 1].id);
      } else {
        handleSeek(0);
      }
    }
  }

  function handleNextTrack() {
    const curId = song?.id;
    const idx = SONG_CATALOG.findIndex((s) => s.id === curId);
    if (idx >= 0 && idx < SONG_CATALOG.length - 1) {
      useGroovexStore.getState().setActiveSong(SONG_CATALOG[idx + 1].id);
    }
  }

  function handleVolumeChange(idx: number, vol: number) {
    const engine = engineRef.current;
    if (!engine) return;
    setTrackVolume(engine, idx, vol);
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, volume: vol } : t)));
    setActivePreset('full');
  }

  function handleMute(idx: number) {
    const engine = engineRef.current;
    if (!engine) return;
    toggleMute(engine, idx);
    const track = engine.tracks[idx];
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, muted: track.muted } : t)));
  }

  function handleSolo(idx: number) {
    const engine = engineRef.current;
    if (!engine) return;
    toggleSolo(engine, idx);
    const track = engine.tracks[idx];
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, solo: track.solo } : t)));
  }

  function handleResetMixer() {
    const engine = engineRef.current;
    if (!engine) return;
    setTracks((prev) =>
      prev.map((t, idx) => {
        const defVol = 0.85;
        setTrackVolume(engine, idx, defVol);
        if (t.muted) toggleMute(engine, idx);
        if (t.solo) toggleSolo(engine, idx);
        return {
          ...t,
          volume: defVol,
          muted: false,
          solo: false,
        };
      })
    );
    setActivePreset('full');
  }

  function handleApplyPreset(preset: PracticePreset) {
    const engine = engineRef.current;
    if (!engine) return;
    setActivePreset(preset);

    setTracks((prev) =>
      prev.map((track, idx) => {
        const name = track.name.toLowerCase();
        let targetVol = 0.85;
        let shouldMute = false;

        if (preset === 'full') {
          targetVol = 0.85;
          shouldMute = false;
        } else if (preset === 'minus-vox') {
          if (name.includes('vox') || name.includes('vocal') || name.includes('backing')) {
            targetVol = 0;
            shouldMute = true;
          } else {
            targetVol = 0.9;
          }
        } else if (preset === 'minus-drum') {
          if (
            name.includes('drum') ||
            name.includes('kick') ||
            name.includes('snare') ||
            name.includes('cymbal')
          ) {
            targetVol = 0;
            shouldMute = true;
          } else {
            targetVol = 0.9;
          }
        } else if (preset === 'bass-drum') {
          if (
            name.includes('drum') ||
            name.includes('kick') ||
            name.includes('snare') ||
            name.includes('cymbal') ||
            name.includes('bass')
          ) {
            targetVol = 1.0;
            shouldMute = false;
          } else {
            targetVol = 0;
            shouldMute = true;
          }
        } else if (preset === 'a-cappella') {
          if (name.includes('vox') || name.includes('vocal') || name.includes('backing')) {
            targetVol = 1.0;
            shouldMute = false;
          } else {
            targetVol = 0;
            shouldMute = true;
          }
        }

        setTrackVolume(engine, idx, targetVol);
        if (track.muted !== shouldMute) {
          toggleMute(engine, idx);
        }
        if (track.solo) {
          toggleSolo(engine, idx);
        }

        return {
          ...track,
          volume: targetVol,
          muted: shouldMute,
          solo: false,
        };
      })
    );
  }

  // MediaSession integration
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;
  const handleSeekRef = useRef(handleSeek);
  handleSeekRef.current = handleSeek;
  const handlePreviousTrackRef = useRef(handlePreviousTrack);
  handlePreviousTrackRef.current = handlePreviousTrack;
  const handleNextTrackRef = useRef(handleNextTrack);
  handleNextTrackRef.current = handleNextTrack;
  const songRef = useRef(song);
  songRef.current = song;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    if (!song) return;

    mediaSessionCoordinator.registerProvider({
      id: 'groovex',
      getMetadata: () => ({
        title: songRef.current?.title || 'GrooveX Track',
        artist: songRef.current?.artist || 'GrooveX',
        album: songRef.current?.genre ? `GrooveX · ${songRef.current.genre}` : 'GrooveX Studio',
        duration: durationRef.current || (engineRef.current?.duration ?? 0),
      }),
      getPlaybackState: () => ({
        state: isPlayingRef.current ? 'playing' : 'paused',
        position: currentTimeRef.current,
        duration: durationRef.current || (engineRef.current?.duration ?? 0),
        speed: 1.0,
      }),
      onPlay: () => {
        if (!isPlayingRef.current) handlePlayRef.current();
      },
      onPause: () => {
        if (isPlayingRef.current) handlePlayRef.current();
      },
      onSeekTo: (posSec: number) => {
        handleSeekRef.current(posSec);
      },
      onSkipForward: (sec: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        handleSeekRef.current(Math.min(engine.duration, currentTimeRef.current + sec));
      },
      onSkipBackward: (sec: number) => {
        handleSeekRef.current(Math.max(0, currentTimeRef.current - sec));
      },
      onNext: () => {
        handleNextTrackRef.current();
      },
      onPrevious: () => {
        handlePreviousTrackRef.current();
      },
      onStop: () => {
        handleStop();
      },
    });

    mediaSessionCoordinator.updateMetadata('groovex', {
      title: song.title,
      artist: song.artist,
      album: song.genre ? `GrooveX · ${song.genre}` : 'GrooveX Studio',
      duration: duration || (engineRef.current?.duration ?? 0),
    });

    return () => {
      mediaSessionCoordinator.unregisterProvider('groovex');
    };
  }, [song]);

  useEffect(() => {
    if (!song) return;
    mediaSessionCoordinator.updatePlaybackState('groovex', {
      state: isPlaying ? 'playing' : 'paused',
      position: currentTime,
      duration: duration || (engineRef.current?.duration ?? 0),
      speed: 1.0,
    });
  }, [isPlaying, currentTime, duration, song]);

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black text-neutral-400 p-6 select-none">
        <p className="text-sm font-semibold uppercase tracking-wider">{t.groovex.noSongSelected}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full ${isLight ? 'bg-neutral-950' : 'bg-black'} text-white flex justify-center items-center overflow-x-hidden antialiased select-none`}
      data-purpose="groovex-player-screen"
      data-groovex-phase={phase}
    >
      <style>{`
        /* Custom Range Sliders */
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type=range]:focus {
          outline: none;
        }
        /* Main Waveform thumb */
        #main-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 10px 2px rgba(168, 85, 247, 0.8), 0 0 18px 4px rgba(56, 189, 248, 0.5), 0 2px 4px rgba(0,0,0,0.5);
          cursor: pointer;
          margin-top: -6px;
          transition: transform 0.15s ease;
        }
        #main-scrubber:active::-webkit-slider-thumb {
          transform: scale(1.25);
        }
        #main-scrubber::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: transparent;
          border-radius: 9999px;
        }
        /* Stem Mini-Sliders */
        .stem-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.6);
          cursor: pointer;
          margin-top: -5px;
        }
        .stem-range::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
        }
        /* Subtle custom transitions & Cool Scrubber Animations */
        @keyframes pulse-wave {
          0%, 100% {
            transform: scaleY(0.7);
            opacity: 0.85;
          }
          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
        }
        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .anim-wave-active {
          animation: pulse-wave 1.1s ease-in-out infinite;
        }
        .shimmer-track {
          animation: shimmer-sweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-wave-active,
          .shimmer-track {
            animation: none !important;
          }
        }
        html.light .groovex-root [data-purpose="groovex-player-screen"] h1,
        html.light [data-purpose="groovex-player-screen"] h1,
        [data-purpose="groovex-player-screen"] h1 {
          color: #ffffff !important;
        }
        html.light .groovex-root [data-purpose="groovex-player-screen"] .groovex-player-artist,
        html.light [data-purpose="groovex-player-screen"] .groovex-player-artist,
        [data-purpose="groovex-player-screen"] .groovex-player-artist {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .sheet-enter {
          transform: translateY(100%);
          opacity: 0;
          pointer-events: none;
        }
        .sheet-active {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .custom-backdrop {
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sheet-transition {
          transition: transform 0.38s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.3s ease;
        }
      `}</style>

      {/* BEGIN: DeviceContainer (Mobile Portrait Frame) */}
      <main className="relative w-full max-w-[420px] h-[100dvh] max-h-[920px] bg-black flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* BEGIN: AmbientArtworkLayer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {coverArtUrl ? (
            <>
              <img
                src={coverArtUrl}
                alt=""
                className="w-full h-full object-cover filter blur-3xl opacity-40 absolute inset-0 scale-125"
              />
              <div className="w-full h-[62%] flex flex-col items-center justify-center pt-6 pb-2 px-6 relative">
                <div className="relative w-[290px] h-[290px] xs:w-[320px] xs:h-[320px] max-w-[84vw] max-h-[38vh] aspect-square">
                  {/* Glowing ambient backlight under the artwork */}
                  <img
                    src={coverArtUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover rounded-3xl filter blur-2xl opacity-60 scale-95 translate-y-3 pointer-events-none"
                  />
                  {/* High-res artwork with concentric rounded border and elevation */}
                  <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/15">
                    <img
                      src={coverArtUrl}
                      alt={song.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-[62%] flex flex-col items-center justify-center pt-6 pb-2 px-6 relative">
              <div className="relative w-[280px] h-[280px] xs:w-[300px] xs:h-[300px] max-w-[84vw] max-h-[38vh] aspect-square rounded-full bg-neutral-900/70 border border-white/15 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md">
                <div className="absolute inset-4 rounded-full border border-white/5" />
                <div className="absolute inset-8 rounded-full border border-white/5" />
                <div className="absolute inset-12 rounded-full border border-white/5" />
                <div className="absolute inset-16 rounded-full border border-white/10" />
                <div className="w-20 h-20 rounded-full bg-stone-900/90 border border-white/20 flex items-center justify-center shadow-inner">
                  <svg
                    className="w-9 h-9 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {song.title}
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black to-75%" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent top-[45%]" />
        </div>
        {/* END: AmbientArtworkLayer */}

        {/* BEGIN: TopHeaderBar */}
        <header className="relative z-10 flex items-center justify-between px-6 pt-7 pb-2 select-none">
          {/* Collapse Arrow */}
          <button
            aria-label="Collapse Player"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-90 transition-transform duration-150"
            type="button"
            onClick={handleBack}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Center Title */}
          <div className="flex flex-col items-center max-w-[220px] px-2 text-center">
            <span className="text-[10px] font-bold tracking-[0.22em] text-neutral-400 uppercase">
              NOW PLAYING
            </span>
            <span className="text-[13px] font-bold text-white tracking-wide truncate max-w-full">
              {song.title}
            </span>
          </div>
          {/* Spacer to preserve optical center alignment */}
          <div className="w-10 h-10" aria-hidden="true" />
        </header>
        {/* END: TopHeaderBar */}

        {/* Buffering/Loading Indicator */}
        {phase === 'loading' && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
            <p className="text-sm font-semibold text-white/90 mb-2">
              {currentStemLabel ? `Buffering ${currentStemLabel}...` : 'Buffering audio stems...'}
            </p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-150 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-neutral-400 mt-2">
              {Math.round(overallProgress)}%
            </span>
          </div>
        )}

        {/* Error Handling */}
        {phase === 'error' && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-rose-400 mb-3">
              Some audio stems failed to buffer.
            </p>
            <button
              onClick={handleRetryFailed}
              className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
            >
              Retry Buffering
            </button>
          </div>
        )}

        {/* BEGIN: MainPlaybackDeck */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-7 pb-10">
          {/* Track Metadata Row */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col pr-4 min-w-0">
              <h1
                className="text-3xl font-bold tracking-tight text-white leading-tight truncate"
                style={{ color: '#ffffff' }}
              >
                {song.title}
              </h1>
              <p
                className="groovex-player-artist text-base font-medium text-neutral-400 mt-1 truncate"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {song.artist}
              </p>
            </div>
            {/* Stems Mixer Morph Trigger Button */}
            <button
              aria-label="Open Stems Mixer"
              className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
              id="open-stems-btn"
              type="button"
              onClick={() => setIsStemsSheetOpen(true)}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>

          {/* Scrubber & Waveform Visualizer */}
          <div className="mb-8 select-none">
            {/* Interactive Audio Waveform Spectrum Accent */}
            <div
              className="relative w-full h-7 mb-2 flex items-end justify-between gap-[2px] px-0.5 cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPct = Math.max(0, Math.min(1, clickX / rect.width));
                handleSeek(newPct * Math.max(1, duration));
              }}
              title="Seek audio position"
            >
              {WAVEFORM_HEIGHTS.map((h, idx) => {
                const totalBars = WAVEFORM_HEIGHTS.length;
                const barPct = (idx / (totalBars - 1)) * 100;
                const progressPct = Math.min(
                  100,
                  Math.max(0, (currentTime / Math.max(1, duration)) * 100)
                );
                const isPlayed = barPct <= progressPct;
                const isNearPlayhead = Math.abs(barPct - progressPct) < 7;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-150 origin-bottom ${
                      isPlayed
                        ? 'bg-gradient-to-t from-indigo-500 via-purple-400 to-cyan-300 shadow-[0_0_8px_rgba(168,85,247,0.7)]'
                        : 'bg-white/15 group-hover:bg-white/25'
                    } ${isPlaying && isNearPlayhead ? 'anim-wave-active' : ''}`}
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(idx % 6) * 0.12}s`,
                    }}
                  />
                );
              })}
            </div>

            {/* Interactive Progress Scrubber with Dynamic Glow Track */}
            <div className="relative w-full flex items-center group">
              {/* Custom Track Background */}
              <div className="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none">
                <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden relative backdrop-blur-sm">
                  {/* Glowing Elapsed Progress */}
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-300 rounded-full relative transition-all duration-75 ease-out shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (currentTime / Math.max(1, duration)) * 100)
                      )}%`,
                    }}
                  >
                    {/* Animated Shimmer Laser Beam */}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent shimmer-track pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>

              {/* Native Range Scrubber */}
              <input
                aria-label="Track Progress"
                className="w-full relative z-10"
                id="main-scrubber"
                max={Math.max(1, duration)}
                min="0"
                step="0.1"
                type="range"
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
              />
            </div>

            {/* Timestamps */}
            <div className="flex justify-between items-center text-xs font-semibold tracking-wider text-neutral-400 mt-2 font-mono">
              <span id="current-time" className="text-white/90">
                {formatTime(currentTime)}
              </span>
              <span id="remaining-time" className="text-neutral-400">
                -{formatTime(Math.max(0, duration - currentTime))}
              </span>
            </div>
          </div>

          {/* Core Transport Deck (Strict 3-Button Row) */}
          <div className="flex items-center justify-between gap-4">
            {/* Previous Track Button */}
            <button
              aria-label="Previous Track"
              className="w-16 h-16 rounded-full bg-white/[0.08] hover:bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-md active:scale-90 transition-transform duration-150"
              type="button"
              onClick={handlePreviousTrack}
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            {/* Play / Pause Master Pill */}
            <button
              aria-label="Play or Pause Track"
              className="flex-1 h-16 rounded-full bg-stone-900/90 hover:bg-stone-850 border border-white/20 backdrop-blur-2xl flex items-center justify-center gap-3 text-white shadow-[0_8px_30px_rgb(0,0,0,0.6)] active:scale-95 transition-all duration-150"
              id="play-pause-btn"
              type="button"
              onClick={handlePlay}
            >
              {isPlaying ? (
                <>
                  <svg className="w-6 h-6 fill-current" id="pause-icon" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <span className="text-lg font-bold tracking-tight" id="play-pause-text">
                    Pause
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 fill-current" id="play-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-lg font-bold tracking-tight" id="play-pause-text">
                    Play
                  </span>
                </>
              )}
            </button>
            {/* Next Track Button */}
            <button
              aria-label="Next Track"
              className="w-16 h-16 rounded-full bg-white/[0.08] hover:bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-md active:scale-90 transition-transform duration-150"
              type="button"
              onClick={handleNextTrack}
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>
        {/* END: MainPlaybackDeck */}

        {/* BEGIN: StemsMixerBottomSheet */}
        {/* Modal Backdrop */}
        <div
          className={`custom-backdrop fixed inset-0 bg-black/70 backdrop-blur-md z-40 ${
            isStemsSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          id="sheet-backdrop"
          style={{ display: isStemsSheetOpen ? 'block' : 'none' }}
          onClick={() => setIsStemsSheetOpen(false)}
        />
        {/* Interactive Pop-up Drawer */}
        <div
          className={`sheet-transition absolute inset-x-0 bottom-0 z-50 bg-stone-950/95 border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl max-h-[85vh] flex flex-col ${
            isStemsSheetOpen ? 'sheet-active' : 'sheet-enter'
          }`}
          id="stems-sheet"
          style={{
            transform: isStemsSheetOpen ? 'translateY(0)' : 'translateY(100%)',
            visibility: isStemsSheetOpen ? 'visible' : 'hidden',
            pointerEvents: isStemsSheetOpen ? 'auto' : 'none',
          }}
        >
          {/* Sheet Pull Indicator */}
          <div className="w-12 h-1.5 bg-neutral-600/60 rounded-full mx-auto mb-4" />
          {/* Sheet Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 18h2v-4H4v4zm5 0h2V6H9v12zm5 0h2v-8h-2v8zm5 0h2v-11h-2v11z" />
              </svg>
              <span className="text-sm font-extrabold tracking-wider text-white uppercase">
                Stems Mixer
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="text-xs font-semibold text-neutral-400 hover:text-white uppercase px-2 py-1 transition-colors"
                id="reset-stems"
                onClick={handleResetMixer}
                type="button"
              >
                Reset
              </button>
              <button
                aria-label="Close Stems Mixer"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 active:scale-95"
                id="close-stems-btn"
                type="button"
                onClick={() => setIsStemsSheetOpen(false)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {/* Section: Practice Mix Presets */}
          <div className="py-4">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-2">
              Practice Mix Presets
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
              {[
                { id: 'full', label: 'Full Band' },
                { id: 'minus-vox', label: 'Minus Vox' },
                { id: 'minus-drum', label: 'Minus Drum' },
                { id: 'bass-drum', label: 'Bass & Drum' },
                { id: 'a-cappella', label: 'A Cappella' },
              ].map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p.id as PracticePreset)}
                    className={`preset-pill px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Section: Multitrack Stems Controls */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 pt-1 pb-4">
            {tracks.map((track, i) => {
              const stemColor = getStemColor(track.name);
              const volPct = Math.round((track.muted ? 0 : track.volume) * 100);
              return (
                <div
                  key={track.name}
                  className="stem-channel flex items-center gap-3 bg-neutral-900/60 p-2.5 rounded-2xl border border-white/5"
                  data-channel={track.name}
                >
                  <div className="flex items-center gap-2 w-24">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: stemColor,
                        boxShadow: `0 0 8px ${stemColor}99`,
                      }}
                    />
                    <span className="text-xs font-bold text-white tracking-wide truncate">
                      {track.label}
                    </span>
                  </div>
                  <span className="stem-val text-[11px] font-mono text-neutral-400 w-8">
                    {volPct}%
                  </span>
                  <input
                    aria-label={`${track.label} Volume`}
                    className="stem-range flex-1"
                    max="100"
                    min="0"
                    type="range"
                    value={volPct}
                    onChange={(e) => handleVolumeChange(i, Number(e.target.value) / 100)}
                  />
                  <div className="flex gap-1.5">
                    <button
                      className={`mute-btn w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors ${
                        track.muted
                          ? 'bg-red-500 text-white'
                          : 'bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                      onClick={() => handleMute(i)}
                    >
                      M
                    </button>
                    <button
                      className={`solo-btn w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors ${
                        track.solo
                          ? 'bg-amber-400 text-black'
                          : 'bg-white/10 text-neutral-300 hover:text-white'
                      }`}
                      onClick={() => handleSolo(i)}
                    >
                      S
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* END: StemsMixerBottomSheet */}
      </main>
      {/* END: DeviceContainer */}
    </div>
  );
}
