import {
  useScrollHide,
  useIsWebDesktop,
  useT,
  NavigationDispatcher,
  useSettingsStore,
  mediaSessionCoordinator,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import VinylLottie from '../../../shared/lottie/VinylLottie';
import { Loader } from '../../../components/motion/loader';
import { SONG_CATALOG } from '../services/songCatalog';
import { useGroovexStore } from '../state/useGroovexStore';
import {
  createEngine,
  initSoundTouch,
  initTracks,
  loadAudioFile,
  loadAudioBuffer,
  setTrackBuffer,
  play,
  pause,
  stop,
  seek,
  startScrub,
  scrubSeek,
  endScrub,
  setTrackVolume,
  toggleMute,
  toggleSolo,
  setMasterVolume,
  setPitch,
  getCurrentTime,
  destroyEngine,
  resumeAudioContext,
  type AudioEngine,
} from '../services/audioEngine';
import { groovexStemRepository, type DownloadProgress } from '@workspace/studio-core';
import StudioProgressBar from '../../../shared/progress/StudioProgressBar';
import StudioCountUpPercentage from '../../../shared/progress/StudioCountUpPercentage';

type PlayerPhase = 'loading' | 'ready' | 'error';
type PracticePreset = 'full' | 'minus-vox' | 'minus-drum' | 'bass-drum';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
};

function transposeKey(key: string, semitones: number): string {
  if (!key || semitones === 0) return key;
  const match = key.match(/^([A-G][b#]?)(.*)/);
  if (!match) return key;
  const [, root, suffix] = match;
  const normalized = FLAT_MAP[root] || root;
  const idx = NOTE_NAMES.indexOf(normalized);
  if (idx < 0) return key;
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  return NOTE_NAMES[newIdx] + suffix;
}

const STEM_COLOR_MAP: Record<string, string> = {
  drums: '#f59e0b',
  kick: '#f59e0b',
  snare: '#f59e0b',
  cymbals: '#f59e0b',
  bass: '#6366f1',
  guitar: '#10b981',
  vocals: '#f43f5e',
  vox: '#f43f5e',
  backing: '#a855f7',
  crowd: '#06b6d4',
  keys: '#ec4899',
  other: '#64748b',
};

function getStemColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(STEM_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return '#0066FF';
}

function getSectionName(pct: number): string {
  if (pct < 0.12) return 'Intro';
  if (pct < 0.32) return 'Verse 1';
  if (pct < 0.52) return 'Chorus';
  if (pct < 0.76) return 'Verse 2';
  if (pct < 0.9) return 'Bridge';
  return 'Outro';
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
  const isAmoled = settings.amoledMode;

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const activeSongId = useGroovexStore((s) => s.activeSongId);
  const preferences = useGroovexStore((s) => s.preferences);
  const song = useMemo(() => SONG_CATALOG.find((s) => s.id === activeSongId), [activeSongId]);

  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);
  const sessionIdRef = useRef(0);

  // Turntable Vinyl Physics
  const vinylRef = useRef<HTMLDivElement>(null);
  const currentAngleRef = useRef(35);
  const currentVelocityRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const lastProgressUpdateRef = useRef(0);
  const lastTimeUpdateRef = useRef(0);

  // Musical BPM -> RPM calculation
  // One full vinyl revolution = one 4/4 musical measure (4 beats)
  // RPM = BPM / 4
  // Angular velocity omega = 1.5 * BPM (deg/s)
  // Target velocity in degrees per millisecond:
  const songBpm = song?.bpm && song.bpm > 0 ? song.bpm : 120;
  const effectiveBpm = Math.min(200, Math.max(60, songBpm));
  const targetVelocity = (1.5 * effectiveBpm) / 1000;
  const targetVelocityRef = useRef(targetVelocity);
  targetVelocityRef.current = targetVelocity;

  const [phase, setPhase] = useState<PlayerPhase>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [tonearmState, setTonearmState] = useState<'parked' | 'playing' | 'disengaged'>('parked');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStemLabel, setCurrentStemLabel] = useState('');
  const [failedStems, setFailedStems] = useState<number[]>([]);
  const [pitchShift, setPitchShift] = useState(0);
  const [activePreset, setActivePreset] = useState<PracticePreset | null>('full');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubVisualTime, setScrubVisualTime] = useState(0);

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

  const updateProgressThrottled = useCallback((val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    const now = performance.now();
    if (now - lastProgressUpdateRef.current > 32 || clamped === 100 || clamped === 0) {
      lastProgressUpdateRef.current = now;
      setOverallProgress(Number(clamped.toFixed(1)));
    }
  }, []);

  // Physics-based Rotational Animation loop (Smooth acceleration & graceful ~650ms inertia spin-down)
  useEffect(() => {
    let animId: number;

    function updateVinylRotation(timestamp: number) {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const deltaTime = Math.min(timestamp - lastTimestampRef.current, 50);
      lastTimestampRef.current = timestamp;

      const targetVel = targetVelocityRef.current;
      // Spin-up: direct-drive motor accelerates to operating speed in ~400ms
      const accelRate = (targetVel / 400) * deltaTime;
      // Spin-down: platter inertia / magnetic brake coasts down gracefully in ~650ms
      const decelRate = (targetVel / 650) * deltaTime;

      if (isPlaying) {
        if (currentVelocityRef.current < targetVel) {
          currentVelocityRef.current = Math.min(targetVel, currentVelocityRef.current + accelRate);
        } else if (currentVelocityRef.current > targetVel) {
          currentVelocityRef.current = Math.max(targetVel, currentVelocityRef.current - decelRate);
        }
      } else {
        if (currentVelocityRef.current > 0) {
          currentVelocityRef.current = Math.max(0, currentVelocityRef.current - decelRate);
          if (currentVelocityRef.current === 0) {
            // Platter reached complete rest: normalize angle to [0, 360)
            currentAngleRef.current = ((currentAngleRef.current % 360) + 360) % 360;
          }
        }
      }

      if (currentVelocityRef.current > 0) {
        // Continuous cumulative angle without modulo jump during active rotation
        currentAngleRef.current += currentVelocityRef.current * deltaTime;
        if (vinylRef.current) {
          vinylRef.current.style.transform = `rotate(${currentAngleRef.current.toFixed(2)}deg)`;
        }
      }

      if (isPlaying || currentVelocityRef.current > 0) {
        animId = requestAnimationFrame(updateVinylRotation);
      }
    }

    lastTimestampRef.current = null;
    animId = requestAnimationFrame(updateVinylRotation);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

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
    setIsPlaying(false);
    setTonearmState('parked');
    setOverallProgress(0);
    setCurrentStemLabel('');
    setFailedStems([]);
    setPitchShift(0);
    setActivePreset('full');
    currentAngleRef.current = 35;
    currentVelocityRef.current = 0;
    lastTimeUpdateRef.current = 0;
    if (vinylRef.current) {
      vinylRef.current.style.transform = 'rotate(35deg)';
    }
    cancelAnimationFrame(rafRef.current);

    if (song.hasStems) {
      groovexStemRepository
        .getSongCacheStatus(
          song.id,
          song.stems.map((s) => s.name)
        )
        .then((status) => {
          if (sessionIdRef.current !== sid) return;
          const allCached = song.stems.every((s) => status[s.name]);
          loadAllStems(engine, song, sid, allCached);
        })
        .catch(() => {
          if (sessionIdRef.current !== sid) return;
          loadAllStems(engine, song, sid, false);
        });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
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

  async function loadAllStems(
    engine: AudioEngine,
    songData: (typeof SONG_CATALOG)[0],
    sid: number,
    allCached = false
  ) {
    setPhase('loading');
    setFailedStems([]);
    const total = songData.stems.length;
    const failed: number[] = [];

    if (allCached) {
      setOverallProgress(100);
    }

    for (let i = 0; i < total; i++) {
      if (sessionIdRef.current !== sid) return;
      const stem = songData.stems[i];
      setCurrentStemLabel(stem.label);
      try {
        resumeAudioContext();
        const data = await groovexStemRepository.downloadStem(
          songData.id,
          stem.name,
          (p: DownloadProgress) => {
            if (sessionIdRef.current !== sid || allCached) return;
            const stemProgress = p.percent / 100;
            updateProgressThrottled(((i + stemProgress) / total) * 100);
          }
        );
        if (sessionIdRef.current !== sid) return;
        const buffer = await loadAudioBuffer(data);
        if (sessionIdRef.current !== sid) return;
        setTrackBuffer(engine, i, buffer);
        setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
        setDuration(engine.duration);
      } catch (e) {
        console.error(`Failed to load stem ${stem.name}:`, e);
        failed.push(i);
      }
      if (sessionIdRef.current !== sid) return;
      if (!allCached) {
        updateProgressThrottled(((i + 1) / total) * 100);
      }
    }

    if (sessionIdRef.current !== sid) return;
    if (failed.length > 0) {
      setFailedStems(failed);
      setPhase('error');
    } else {
      setOverallProgress(100);
      // Fluid settle delay before revealing ready player controls
      await new Promise((r) => setTimeout(r, allCached ? 160 : 320));
      if (sessionIdRef.current !== sid) return;
      setPhase('ready');
      setCurrentStemLabel('');
    }
  }

  async function handleDownload() {
    const engine = engineRef.current;
    if (!engine || !song) return;
    await loadAllStems(engine, song, sessionIdRef.current);
  }

  async function handleRedownload() {
    const engine = engineRef.current;
    if (!engine || !song) return;
    const sid = ++sessionIdRef.current;
    stop(engine);
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setCurrentTime(0);
    setTracks((prev) => prev.map((t) => ({ ...t, loaded: false })));
    await loadAllStems(engine, song, sid);
  }

  async function handleRetryFailed() {
    const engine = engineRef.current;
    if (!engine || !song) return;
    const sid = sessionIdRef.current;
    const toRetry = [...failedStems];
    setPhase('loading');
    setFailedStems([]);
    const newFailed: number[] = [];

    for (let fi = 0; fi < toRetry.length; fi++) {
      if (sessionIdRef.current !== sid) return;
      const i = toRetry[fi];
      const stem = song.stems[i];
      setCurrentStemLabel(stem.label);
      try {
        resumeAudioContext();
        const data = await groovexStemRepository.downloadStem(
          song.id,
          stem.name,
          (p: DownloadProgress) => {
            if (sessionIdRef.current !== sid) return;
            updateProgressThrottled(((fi + p.percent / 100) / toRetry.length) * 100);
          },
          true
        );
        if (sessionIdRef.current !== sid) return;
        const buffer = await loadAudioBuffer(data);
        if (sessionIdRef.current !== sid) return;
        setTrackBuffer(engine, i, buffer);
        setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, loaded: true } : t)));
        setDuration(engine.duration);
      } catch (e) {
        console.error(`Retry failed for stem ${stem.name}:`, e);
        newFailed.push(i);
      }
      if (sessionIdRef.current !== sid) return;
      updateProgressThrottled(((fi + 1) / toRetry.length) * 100);
    }

    if (sessionIdRef.current !== sid) return;
    if (newFailed.length > 0) {
      setFailedStems(newFailed);
      setPhase('error');
    } else {
      setOverallProgress(100);
      await new Promise((r) => setTimeout(r, 260));
      if (sessionIdRef.current !== sid) return;
      setPhase('ready');
      setCurrentStemLabel('');
    }
  }

  async function handleLoadFromFile(idx: number) {
    const engine = engineRef.current;
    if (!engine) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        resumeAudioContext();
        const buffer = await loadAudioFile(file);
        setTrackBuffer(engine, idx, buffer);
        setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, loaded: true } : t)));
        setDuration(engine.duration);
        setFailedStems((prev) => prev.filter((fi) => fi !== idx));
        if (phase !== 'ready') setPhase('ready');
      } catch (e) {
        console.error('Failed to load audio:', e);
      }
    };
    input.click();
  }

  const updateTime = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!engine.isScrubbing) {
      const t = getCurrentTime(engine);
      const now = performance.now();
      // Throttle React state updates to ~40ms (~25fps) to maintain 60fps compositor budget on Android
      if (now - lastTimeUpdateRef.current > 40 || !engine.isPlaying) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(t);
        setDuration(engine.duration);
      }
    } else {
      setDuration(engine.duration);
    }
    if (engine.isPlaying || engine.vinylTransitionState !== 'idle') {
      rafRef.current = requestAnimationFrame(updateTime);
    } else if (isPlaying) {
      setIsPlaying(false);
      setTonearmState('parked');
    }
  }, [isPlaying]);

  function handlePlay() {
    const engine = engineRef.current;
    if (!engine) return;
    resumeAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
      setTonearmState('disengaged');
      pause(engine, () => {
        setTonearmState('parked');
        if (engineRef.current) {
          setCurrentTime(getCurrentTime(engineRef.current));
        }
      });
    } else {
      setIsPlaying(true);
      setTonearmState('playing');
      play(engine, () => {
        // Steady operating speed reached
      });
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }

  function handleStop() {
    const engine = engineRef.current;
    if (!engine) return;
    stop(engine);
    setIsPlaying(false);
    setTonearmState('parked');
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

  function handleScrubStart() {
    const engine = engineRef.current;
    if (!engine || !isPlaying) return;
    startScrub(engine);
  }

  function handleScrubSeek(pct: number, delta: number) {
    const engine = engineRef.current;
    if (!engine || !isPlaying) return;
    scrubSeek(engine, delta);
    setCurrentTime(pct * engine.duration);
  }

  function handleScrubEnd(pct: number) {
    const engine = engineRef.current;
    if (!engine) return;
    const t = pct * engine.duration;
    if (isPlaying) {
      endScrub(engine, t);
    } else {
      engine.pauseOffset = Math.max(0, Math.min(t, engine.duration));
    }
    setCurrentTime(t);
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }

  function handlePitchChange(delta: number) {
    setPitchShift((prev) => {
      const newPitch = Math.max(-6, Math.min(6, prev + delta));
      const engine = engineRef.current;
      if (engine) {
        setPitch(engine, newPitch);
      }
      return newPitch;
    });
  }

  function handleSkip(delta: number) {
    const engine = engineRef.current;
    if (!engine) return;
    const newTime = Math.max(0, Math.min(getCurrentTime(engine) + delta, engine.duration));
    seek(engine, newTime);
    setCurrentTime(newTime);
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }

  function handleVolumeChange(idx: number, vol: number) {
    const engine = engineRef.current;
    if (!engine) return;
    setTrackVolume(engine, idx, vol);
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, volume: vol } : t)));
    setActivePreset(null);
  }

  function handleMute(idx: number) {
    const engine = engineRef.current;
    if (!engine) return;
    toggleMute(engine, idx);
    const track = engine.tracks[idx];
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, muted: track.muted } : t)));
    setActivePreset(null);
  }

  function handleSolo(idx: number) {
    const engine = engineRef.current;
    if (!engine) return;
    toggleSolo(engine, idx);
    const track = engine.tracks[idx];
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, solo: track.solo } : t)));
    setActivePreset(null);
  }

  function handleResetMixer() {
    const engine = engineRef.current;
    if (!engine) return;
    const defaults = [0.95, 0.85, 0.88, 0.9, 0.75, 0.6];
    setTracks((prev) =>
      prev.map((t, idx) => {
        const defVol =
          defaults[idx] !== undefined ? defaults[idx] : (preferences.defaultStemVolume ?? 0.85);
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
          const defaults = [0.95, 0.85, 0.88, 0.9, 0.75, 0.6];
          targetVol = defaults[idx] !== undefined ? defaults[idx] : 0.85;
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

  // MediaSession Coordinator bindings & native controls integration
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;
  const handleSeekRef = useRef(handleSeek);
  handleSeekRef.current = handleSeek;
  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;
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
        handleSkipRef.current(sec);
      },
      onSkipBackward: (sec: number) => {
        handleSkipRef.current(-sec);
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
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const isReady = phase === 'ready';
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ensure vinyl transform reflects current angle upon entering ready state
  useIsomorphicLayoutEffect(() => {
    if (isReady && vinylRef.current && currentVelocityRef.current === 0) {
      vinylRef.current.style.transform = `rotate(${currentAngleRef.current.toFixed(2)}deg)`;
    }
  }, [isReady]);

  // Physical Vinyl Placement Transform Calculation
  const vinylPlacementStyle = useMemo(() => {
    if (isReady) {
      return {
        boxShadow:
          '0 20px 45px -10px rgba(15, 23, 42, 0.35), 0 8px 16px -4px rgba(15, 23, 42, 0.22)',
        cursor: 'pointer',
        opacity: 1,
        willChange: 'transform',
        transition: 'box-shadow 300ms ease',
      };
    }

    const t = Math.min(1, Math.max(0, overallProgress / 100));

    if (prefersReducedMotion) {
      return {
        transform: 'rotate(35deg)',
        boxShadow:
          '0 20px 45px -10px rgba(15, 23, 42, 0.35), 0 8px 16px -4px rgba(15, 23, 42, 0.22)',
        cursor: 'default',
        opacity: t >= 0.05 ? 1 : Math.max(0.2, t / 0.05),
        transition: 'opacity 200ms ease',
      };
    }

    // Dynamic physical placement: elevation, scale, and 3D spatial alignment
    const translateY = -42 * Math.pow(1 - t, 1.25);
    const scale = 1 + (1 - t) * 0.07;
    const rotX = 14 * (1 - t);
    const rotY = -8 * (1 - t);
    const rotZ = 20 + 15 * t;

    const shadowSpread = Math.round(35 + 20 * (1 - t));
    const shadowY = Math.round(20 + 16 * (1 - t));
    const shadowOpacity = (0.32 + 0.15 * (1 - t)).toFixed(2);

    return {
      transform: `perspective(900px) translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(3)}) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`,
      boxShadow: `0 ${shadowY}px ${shadowSpread}px -8px rgba(0, 0, 0, ${shadowOpacity}), 0 10px 20px -4px rgba(0, 0, 0, 0.25)`,
      cursor: 'default',
      opacity: t >= 0.03 ? 1 : Math.max(0.15, t / 0.03),
      transition:
        'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms ease, opacity 200ms ease',
    };
  }, [isReady, overallProgress, prefersReducedMotion]);

  if (!song) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          color: 'var(--c-text-secondary)',
        }}
      >
        <VinylLottie size={64} />
        <p style={{ fontSize: 14, margin: 0 }}>{t.groovex.noSongSelected}</p>
      </div>
    );
  }

  const effectiveTime = isScrubbing ? scrubVisualTime : currentTime;
  const anyLoaded = tracks.some((t) => t.loaded);
  const currentKeyDisplay = song ? transposeKey(song.key, pitchShift) : '';

  return (
    <div
      ref={scrollRef}
      data-purpose="groovex-player-scroll"
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: isWebDesktop ? 'var(--app-bg)' : 'transparent',
      }}
    >
      <style>{`
        @keyframes gxFadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gxGlowPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.92);
          }
        }
        /* Realistic Hi-Fi Vinyl Radial Grooves */
        .gx-vinyl-disc {
          background: radial-gradient(circle at center,
            #111215 0%,
            #1c1e23 14%,
            #0b0c0e 16%,
            #21252b 25%,
            #111316 27%,
            #1d2127 36%,
            #0e1012 38%,
            #232830 48%,
            #121417 50%,
            #20252c 60%,
            #0d0e11 62%,
            #1d2229 74%,
            #090a0c 76%,
            #171a20 89%,
            #0a0b0d 91%,
            #14161a 100%
          );
        }

        /* Vinyl High-Gloss Dual Conic Sheen Reflection */
        .gx-vinyl-sheen {
          background: conic-gradient(
            from 35deg at 50% 50%,
            rgba(255, 255, 255, 0.16) 0deg,
            rgba(255, 255, 255, 0.02) 42deg,
            transparent 65deg,
            rgba(255, 255, 255, 0.12) 130deg,
            transparent 175deg,
            rgba(255, 255, 255, 0.16) 215deg,
            rgba(255, 255, 255, 0.02) 255deg,
            transparent 280deg,
            rgba(255, 255, 255, 0.12) 330deg,
            transparent 360deg
          );
        }

        /* Precision Tonearm Smooth Transition */
        .gx-tonearm-assembly {
          transform-origin: 32px 32px;
          transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), filter 0.35s ease;
          will-change: transform;
        }
        .gx-tonearm-assembly.playing {
          transform: rotate(24.5deg);
        }
        .gx-tonearm-assembly.disengaged {
          transform: rotate(24.5deg) translate(-2px, -3px) scale(1.01);
          filter: drop-shadow(3px 5px 8px rgba(0, 0, 0, 0.4));
        }
        .gx-tonearm-assembly.parked {
          transform: rotate(0deg);
          transition: transform 0.65s cubic-bezier(0.25, 1, 0.35, 1);
        }

        /* Animated Live Waveform Frequency Bars */
        @keyframes gxWaveFloat {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        .gx-wave-bar-anim {
          transform-origin: bottom;
          animation: gxWaveFloat 1.2s ease-in-out infinite alternate;
        }

        /* Range Slider Styling */
        input[type=range].gx-range-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type=range].gx-range-slider:focus {
          outline: none;
        }
        input[type=range].gx-range-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 5px;
          border-radius: 9999px;
          background: rgba(148, 163, 184, 0.25);
        }
        input[type=range].gx-range-slider::-webkit-slider-thumb {
          height: 17px;
          width: 17px;
          border-radius: 50%;
          background: #0066FF;
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -6px;
          box-shadow: 0 2px 6px rgba(0, 102, 255, 0.4);
          border: 2.5px solid #FFFFFF;
          transition: transform 0.15s ease;
        }
        input[type=range].gx-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.22);
        }

        /* Stem volume slider specific track */
        input[type=range].gx-stem-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type=range].gx-stem-slider:focus {
          outline: none;
        }
        input[type=range].gx-stem-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          border-radius: 9999px;
          background: rgba(148, 163, 184, 0.2);
        }
        input[type=range].gx-stem-slider::-webkit-slider-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #0066FF;
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -6px;
          box-shadow: 0 2px 5px rgba(0, 102, 255, 0.35);
          border: 2px solid #FFFFFF;
          transition: transform 0.12s ease;
        }
        input[type=range].gx-stem-slider::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
      `}</style>

      {/* Main Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: '0 auto',
          padding: '0 16px',
          paddingTop: isWebDesktop ? 16 : 'calc(env(safe-area-inset-top, 0px) + 78px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 36px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxSizing: 'border-box',
        }}
      >
        {/* Desktop Back Navigation */}
        {isWebDesktop && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
            <button
              onClick={() => NavigationDispatcher.push({ app: 'groovex', page: 'library' })}
              className="premium-back-btn"
              aria-label="Back to library"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9999,
                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                border: '1px solid var(--surface-border)',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_back
              </span>
              <span>Library</span>
            </button>
          </div>
        )}

        {/* SECTION 1: TURNTABLE & AUDIO DECK CARD */}
        <section
          style={{
            background: isLight ? '#FFFFFF' : isAmoled ? '#000000' : 'rgba(255,255,255,0.03)',
            borderRadius: 28,
            padding: '16px 16px 18px',
            border: isLight
              ? '1px solid #E8EDF5'
              : isAmoled
                ? '1px solid #1a1a1a'
                : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight
              ? '0 10px 30px -4px rgba(15, 23, 42, 0.04), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
              : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Turntable Plinth Header Badges (Visible when Ready) */}
          {isReady && (
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                padding: '0 4px',
                animation: 'gxFadeSlideUp 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* BPM Chip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  background: isLight ? '#EEF6FF' : 'rgba(37,99,235,0.15)',
                  color: '#0066FF',
                  border: isLight ? '1px solid #D9EBFF' : '1px solid rgba(37,99,235,0.3)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  speed
                </span>
                <span>{song.bpm} BPM</span>
              </div>

              {/* Key Tag */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: isLight ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255,255,255,0.06)',
                  color: 'var(--c-text-primary)',
                  border: isLight
                    ? '1px solid rgba(226, 232, 240, 0.8)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'inline-block',
                  }}
                />
                <span id="header-key-badge">Key: {currentKeyDisplay}</span>
              </div>
            </div>
          )}

          {/* TURNTABLE PLINTH & VINYL PLATTER */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 316,
              aspectRatio: '1 / 1',
              margin: '8px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '900px',
            }}
          >
            {/* Turntable Cast Platter Sub-chassis */}
            <div
              style={{
                position: 'absolute',
                width: '98%',
                height: '98%',
                borderRadius: '50%',
                background: isLight
                  ? 'linear-gradient(to bottom, #e2e8f0, #f1f5f9, #cbd5e1)'
                  : 'linear-gradient(to bottom, #1e293b, #0f172a, #1e293b)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
                border: isLight
                  ? '1px solid rgba(203, 213, 225, 0.8)'
                  : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Machined strobe dots ring on outer platter rim */}
              <div
                style={{
                  width: '94%',
                  height: '94%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(148, 163, 184, 0.5)',
                }}
              />

              {/* Center Turntable Spindle Pin */}
              <div
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #ffffff, #f59e0b 60%, #b45309)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* ROTATING / PLACEMENT VINYL DISC */}
            <div
              ref={vinylRef}
              id="vinyl-disc"
              className="gx-vinyl-disc"
              onClick={isReady ? handlePlay : undefined}
              role="button"
              tabIndex={isReady ? 0 : -1}
              aria-label={!isReady ? 'Loading Session' : isPlaying ? 'Pause Vinyl' : 'Play Vinyl'}
              style={{
                position: 'relative',
                width: '88%',
                height: '88%',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                ...vinylPlacementStyle,
              }}
            >
              {/* High-gloss Conic Sheen Reflection Overlay */}
              <div
                className="gx-vinyl-sheen"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />

              {/* Central Vinyl Label */}
              <div
                style={{
                  width: '37%',
                  height: '37%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0066FF, #0052CC, #1e1b4b)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '3px solid #0F172A',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  textAlign: 'center',
                  color: '#FFFFFF',
                  position: 'relative',
                  zIndex: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Concentric label ring accent */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 4,
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Subtle GrooveX Brand mark */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#EEF6FF',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                    graphic_eq
                  </span>
                  <span>GROOVEX</span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1,
                    marginTop: 2,
                    letterSpacing: '-0.01em',
                  }}
                >
                  STEREO
                </span>
                <span
                  style={{
                    fontSize: 7.5,
                    color: 'rgba(217, 235, 255, 0.9)',
                    fontFamily: 'var(--studio-font-mono, monospace)',
                    marginTop: 2,
                  }}
                >
                  LOSSLESS MASTER
                </span>

                {/* Precision Machined Aluminum Center Bushing */}
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #0f172a, #334155, #0f172a)',
                    border: '2px solid #f59e0b',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* PRECISION TONEARM ASSEMBLY */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 4,
                width: 96,
                height: 192,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              {/* Tonearm Gimbal Pivot Base */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(to bottom, #f1f5f9, #cbd5e1)',
                  border: '1px solid rgba(148, 163, 184, 0.8)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #334155, #1e293b, #020617)',
                    border: '1px solid #cbd5e1',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#0066FF',
                      boxShadow: '0 0 6px rgba(0, 102, 255, 0.8)',
                    }}
                  />
                </div>
              </div>

              {/* Tonearm Armature & Headshell */}
              <svg
                id="tonearm-assembly"
                className={`gx-tonearm-assembly ${tonearmState}`}
                viewBox="0 0 90 190"
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'visible',
                }}
              >
                {/* Drop shadow for realism */}
                <path
                  d="M 72 23 L 46 112 L 28 148"
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.22)"
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
                {/* Brushed aluminum tonearm wand */}
                <path
                  d="M 72 23 L 46 112 L 28 148"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
                <path
                  d="M 72 23 L 46 112 L 28 148"
                  fill="none"
                  stroke="#94A3B8"
                  strokeLinecap="round"
                  strokeWidth="1.6"
                />
                {/* Gimbal counterweight rear extension */}
                <rect
                  x="70"
                  y="8"
                  width="10"
                  height="15"
                  rx="2"
                  fill="#475569"
                  stroke="#334155"
                  strokeWidth="1"
                />
                {/* Audiophile Headshell & Cartridge with Cyan/Blue Stylus */}
                <g transform="rotate(-19 28 152)">
                  <rect
                    x="20"
                    y="142"
                    width="16"
                    height="24"
                    rx="2.5"
                    fill="#0F172A"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  {/* Stylus body & contact tip */}
                  <rect x="26" y="163" width="4.5" height="7" rx="1" fill="#0066FF" />
                  <circle cx="28.25" cy="170" r="1.2" fill="#FFFFFF" />
                </g>
              </svg>
            </div>
          </div>

          {/* DEDICATED LOADING STATE (While stems are downloading) */}
          {!isReady && (
            <div
              id="player-loading-panel"
              style={{
                marginTop: 12,
                padding: '16px 16px',
                background: isLight ? 'rgba(248, 250, 252, 0.95)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 18,
                border: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: 'var(--shadow-surface-soft)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: phase === 'error' ? '#ef4444' : '#0066FF',
                      display: 'inline-block',
                      boxShadow:
                        phase === 'error'
                          ? '0 0 8px rgba(239, 68, 68, 0.7)'
                          : '0 0 8px rgba(0, 102, 255, 0.7)',
                      animation:
                        phase === 'error' ? 'none' : 'gxGlowPulse 1.5s ease-in-out infinite',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: 'var(--studio-font-display, sans-serif)',
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: phase === 'error' ? '#ef4444' : 'var(--c-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {phase === 'error'
                        ? 'Download Interrupted'
                        : overallProgress >= 100
                          ? 'Aligning Turntable Session...'
                          : 'Loading Multitrack Session'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--studio-font-body)',
                        fontSize: 11,
                        color: 'var(--c-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {phase === 'error'
                        ? `${failedStems.length} stem${failedStems.length > 1 ? 's' : ''} failed to load`
                        : currentStemLabel
                          ? `Downloading ${currentStemLabel} stem...`
                          : 'Preparing lossless audio stems...'}
                    </span>
                  </div>
                </div>

                <span
                  id="loading-percentage-display"
                  style={{
                    fontFamily: 'var(--studio-font-mono, monospace)',
                    fontSize: 15,
                    fontWeight: 800,
                    color: phase === 'error' ? '#ef4444' : '#0066FF',
                    letterSpacing: '-0.02em',
                    flexShrink: 0,
                  }}
                >
                  <StudioCountUpPercentage value={overallProgress} />%
                </span>
              </div>

              <StudioProgressBar
                value={overallProgress}
                accentFrom={phase === 'error' ? '#ef4444' : '#0066FF'}
                accentTo={phase === 'error' ? '#f87171' : '#3b82f6'}
                height={6}
              />

              {phase === 'error' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <button
                    onClick={handleRetryFailed}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      refresh
                    </span>
                    Retry Download
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPLETE PLAYER CONTROLS (Only when Ready) */}
          {isReady && (
            <div
              id="player-ready-controls"
              style={{
                animation: 'gxFadeSlideUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* COMPACT WAVEFORM AUDIO VISUALIZER */}
              <div
                style={{
                  marginTop: 8,
                  background: isLight ? 'rgba(248, 250, 252, 0.9)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  padding: 8,
                  border: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 9.5,
                    fontFamily: 'var(--studio-font-mono, monospace)',
                    color: 'var(--c-text-muted)',
                    marginBottom: 4,
                    padding: '0 4px',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 700,
                      color: '#0066FF',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#0066FF',
                        display: 'inline-block',
                        animation: isPlaying ? 'gx-glow-pulse 1.5s ease-in-out infinite' : 'none',
                      }}
                    />
                    LIVE STEM MASTER
                  </span>
                  <span style={{ fontWeight: 600, opacity: 0.8 }}>44.1kHz • 24-bit Lossless</span>
                </div>

                {/* Dynamic Compact Waveform Frequency Bars */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    height: 20,
                    gap: 2,
                    padding: '0 4px',
                    overflow: 'hidden',
                  }}
                >
                  {[6, 12, 16, 8, 18, 14, 12, 18, 20, 14, 10, 16, 18, 12].map((h, i) => (
                    <span
                      key={`wave-left-${i}`}
                      className="gx-wave-bar-anim"
                      style={{
                        width: 2.5,
                        borderRadius: 9999,
                        background: '#0066FF',
                        height: h,
                        animationDelay: `${(i * 0.07).toFixed(2)}s`,
                        animationPlayState: isPlaying ? 'running' : 'paused',
                      }}
                    />
                  ))}

                  <span
                    style={{
                      width: 3,
                      borderRadius: 9999,
                      background: '#0066FF',
                      height: 20,
                      boxShadow: '0 0 4px rgba(0, 102, 255, 0.6)',
                    }}
                  />

                  {[
                    16, 10, 14, 18, 12, 16, 20, 10, 8, 16, 18, 14, 10, 14, 18, 12, 8, 6, 12, 14, 8,
                  ].map((h, i) => (
                    <span
                      key={`wave-right-${i}`}
                      style={{
                        width: 2.5,
                        borderRadius: 9999,
                        background: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.15)',
                        height: h,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* PROGRESS TIMELINE SCRUBBER */}
              <div style={{ padding: '8px 4px 0' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="range"
                    className="gx-range-slider"
                    min={0}
                    max={duration > 0 ? duration : 1}
                    step="0.1"
                    value={isScrubbing ? scrubVisualTime : currentTime}
                    onPointerDown={() => {
                      setIsScrubbing(true);
                      setScrubVisualTime(currentTime);
                    }}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setScrubVisualTime(val);
                    }}
                    onPointerUp={(e) => {
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      setIsScrubbing(false);
                      handleSeek(val);
                    }}
                    onPointerCancel={() => {
                      setIsScrubbing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        handleSkip(-5);
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        handleSkip(5);
                      }
                    }}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    fontFamily: 'var(--studio-font-mono, monospace)',
                    color: 'var(--c-text-muted)',
                    marginTop: 6,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>
                    {formatTime(effectiveTime)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--studio-font-display, sans-serif)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: '#0066FF',
                    }}
                  >
                    {getSectionName(duration > 0 ? effectiveTime / duration : 0)}
                  </span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
              </div>

              {/* REFINED PLAYBACK CONTROLS */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: '12px 8px 4px',
                }}
              >
                <button
                  onClick={handlePreviousTrack}
                  aria-label="Previous Track / Restart"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-primary)',
                    background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease',
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    skip_previous
                  </span>
                </button>

                <button
                  onClick={() => handleSkip(-10)}
                  aria-label="Rewind 10 seconds"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-primary)',
                    background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease',
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
                    replay_10
                  </span>
                </button>

                {/* VIBRANT BLUE PLAY/PAUSE FAB */}
                <button
                  id="play-pause-btn"
                  onClick={handlePlay}
                  disabled={!anyLoaded}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: anyLoaded
                      ? '#0066FF'
                      : isLight
                        ? 'rgba(0,0,0,0.06)'
                        : 'rgba(255,255,255,0.08)',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: anyLoaded ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: anyLoaded
                      ? '0 10px 25px -4px rgba(0, 102, 255, 0.45), 0 4px 10px -2px rgba(0, 102, 255, 0.3)'
                      : 'none',
                    margin: '0 4px',
                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                  }}
                  onPointerDown={(e) => {
                    if (anyLoaded) e.currentTarget.style.transform = 'scale(0.92)';
                  }}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 34, fontVariationSettings: "'FILL' 1" }}
                  >
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <button
                  onClick={() => handleSkip(10)}
                  aria-label="Forward 10 seconds"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-primary)',
                    background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease',
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
                    forward_10
                  </span>
                </button>

                <button
                  onClick={handleNextTrack}
                  aria-label="Next Track"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-primary)',
                    background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease',
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    skip_next
                  </span>
                </button>
              </div>

              {/* PITCH TRANSPOSITION STEPPER */}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: isLight ? 'rgba(248, 250, 252, 0.8)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ color: '#0066FF', fontSize: 20 }}
                  >
                    tune
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: 'var(--c-text-muted)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Transposition
                    </span>
                    <span
                      id="key-label"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--c-text-primary)',
                      }}
                    >
                      Key: {currentKeyDisplay}
                      {pitchShift === 0 ? ' (Original)' : ''}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                    padding: 4,
                    borderRadius: 12,
                    border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <button
                    onClick={() => handlePitchChange(-1)}
                    disabled={pitchShift <= -6}
                    aria-label="Transpose one semitone down"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: pitchShift <= -6 ? 'not-allowed' : 'pointer',
                      opacity: pitchShift <= -6 ? 0.3 : 1,
                      fontWeight: 700,
                      transition: 'transform 100ms ease',
                    }}
                    onPointerDown={(e) => {
                      if (pitchShift > -6) e.currentTarget.style.transform = 'scale(0.9)';
                    }}
                    onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      remove
                    </span>
                  </button>

                  <span
                    id="key-offset"
                    style={{
                      width: 32,
                      textAlign: 'center',
                      fontFamily: 'var(--studio-font-mono, monospace)',
                      fontSize: 12,
                      fontWeight: 700,
                      color: pitchShift !== 0 ? '#0066FF' : 'var(--c-text-primary)',
                    }}
                  >
                    {pitchShift > 0 ? `+${pitchShift}` : pitchShift === 0 ? '±0' : pitchShift}
                  </span>

                  <button
                    onClick={() => handlePitchChange(1)}
                    disabled={pitchShift >= 6}
                    aria-label="Transpose one semitone up"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: pitchShift >= 6 ? 'not-allowed' : 'pointer',
                      opacity: pitchShift >= 6 ? 0.3 : 1,
                      fontWeight: 700,
                      transition: 'transform 100ms ease',
                    }}
                    onPointerDown={(e) => {
                      if (pitchShift < 6) e.currentTarget.style.transform = 'scale(0.9)';
                    }}
                    onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      add
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 4: STEMS MIXER WORKSTATION (Only when Ready) */}
        {isReady && (
          <section
            id="stems-mixer-section"
            style={{
              background: isLight ? '#FFFFFF' : isAmoled ? '#000000' : 'rgba(255,255,255,0.03)',
              borderRadius: 28,
              padding: '16px 16px 20px',
              border: isLight
                ? '1px solid #E8EDF5'
                : isAmoled
                  ? '1px solid #1a1a1a'
                  : '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'var(--shadow-surface-raised)',
              animation: 'gxFadeSlideUp 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Mixer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ color: '#0066FF', fontSize: 22 }}
                >
                  equalizer
                </span>
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                      fontWeight: 800,
                      fontSize: 14,
                      color: 'var(--c-text-primary)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}
                  >
                    STEMS MIXER
                  </h2>
                  <p
                    style={{
                      fontSize: 10,
                      color: 'var(--c-text-muted)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    {tracks.length} Synchronized Multitrack Channels
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleResetMixer}
                  style={{
                    padding: '4px 10px',
                    background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                    color: 'var(--c-text-secondary)',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 100ms ease',
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                  onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  RESET
                </button>

                <span
                  style={{
                    padding: '4px 8px',
                    background: isLight ? '#EEF6FF' : 'rgba(37,99,235,0.15)',
                    color: '#0066FF',
                    border: isLight ? '1px solid #D9EBFF' : '1px solid rgba(37,99,235,0.3)',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    cloud_done
                  </span>
                  CACHED
                </span>
              </div>
            </div>

            {/* STEM CHANNELS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tracks.map((track, idx) => {
                const stemColor = getStemColor(track.name);
                const volPct = Math.round(track.volume * 100);

                return (
                  <div
                    key={track.name}
                    style={{
                      background: isLight ? 'rgba(248, 250, 252, 0.85)' : 'rgba(255,255,255,0.02)',
                      padding: 12,
                      borderRadius: 16,
                      border: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255,255,255,0.04)',
                      opacity: track.muted ? 0.45 : 1,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: stemColor,
                            display: 'inline-block',
                            boxShadow: `0 0 6px ${stemColor}55`,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--c-text-primary)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {track.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: 'var(--studio-font-mono, monospace)',
                            fontWeight: 600,
                            color: 'var(--c-text-muted)',
                          }}
                        >
                          {volPct}%
                        </span>
                        {!track.loaded && (!song.hasStems || failedStems.includes(idx)) && (
                          <button
                            onClick={() => handleLoadFromFile(idx)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--surface-border)',
                              cursor: 'pointer',
                              background: 'transparent',
                              color: 'var(--c-text-secondary)',
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            Load File
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Mute Button */}
                        <button
                          onClick={() => handleMute(idx)}
                          aria-label={`Mute ${track.label}`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: track.muted
                              ? '#f43f5e'
                              : isLight
                                ? '#FFFFFF'
                                : 'rgba(255,255,255,0.06)',
                            color: track.muted
                              ? '#FFFFFF'
                              : isLight
                                ? '#475569'
                                : 'rgba(255,255,255,0.7)',
                            border: track.muted
                              ? '1px solid #e11d48'
                              : isLight
                                ? '1px solid #E2E8F0'
                                : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'transform 100ms ease, background 120ms ease',
                          }}
                          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          M
                        </button>

                        {/* Solo Button */}
                        <button
                          onClick={() => handleSolo(idx)}
                          aria-label={`Solo ${track.label}`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: track.solo
                              ? '#f59e0b'
                              : isLight
                                ? '#FFFFFF'
                                : 'rgba(255,255,255,0.06)',
                            color: track.solo
                              ? '#FFFFFF'
                              : isLight
                                ? '#475569'
                                : 'rgba(255,255,255,0.7)',
                            border: track.solo
                              ? '1px solid #d97706'
                              : isLight
                                ? '1px solid #E2E8F0'
                                : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'transform 100ms ease, background 120ms ease',
                          }}
                          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          S
                        </button>
                      </div>
                    </div>

                    {/* Volume Slider */}
                    <input
                      type="range"
                      className="gx-stem-slider"
                      min={0}
                      max={100}
                      value={volPct}
                      disabled={!track.loaded}
                      onChange={(e) => handleVolumeChange(idx, Number(e.target.value) / 100)}
                      style={{
                        width: '100%',
                        cursor: track.loaded ? 'pointer' : 'not-allowed',
                        opacity: track.loaded ? 1 : 0.4,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* QUICK PRACTICE MIX PRESETS */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--c-text-muted)',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                Practice Mix Presets
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                }}
              >
                {(
                  [
                    { id: 'full', label: 'Full Band' },
                    { id: 'minus-vox', label: 'Minus Vox' },
                    { id: 'minus-drum', label: 'Minus Drum' },
                    { id: 'bass-drum', label: 'Bass & Drum' },
                  ] as const
                ).map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      style={{
                        padding: '8px 4px',
                        textAlign: 'center',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 600,
                        background: isActive
                          ? '#0066FF'
                          : isLight
                            ? '#F1F5F9'
                            : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#FFFFFF' : 'var(--c-text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxShadow: isActive ? '0 2px 8px rgba(0, 102, 255, 0.3)' : 'none',
                        transition: 'all 120ms ease',
                      }}
                      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
