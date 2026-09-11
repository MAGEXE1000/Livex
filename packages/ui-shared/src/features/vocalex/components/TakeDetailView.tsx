import { Dialog } from '../../../shared/design-system/dialogs';
import {
  useT,
  useNavigationStore,
  NavigationDispatcher,
  useBackHandler,
  useSettingsStore,
  blobToAudioBuffer,
  extractWaveformPeaks,
  createAudioContext,
  vocalexRepository,
  type TakeRecord,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader } from '../../../components/motion/loader';
import { analyzeAudio, type VocalAnalysis, type AnalysisLabels } from '../services/vocalAnalysis';
import HarmonizerSheet from './HarmonizerSheet';
import { Button } from '../../../shared/design-system/StudioDesignSystem';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';

const SMOOTHING_FACTOR = 0.8;
const VIZ_BARS = 48;

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

export default function TakeDetailView({
  take: initialTake,
  onBack,
  onDelete,
  onSaveBounce,
  onUpdateTake,
}: {
  take: TakeRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
  onSaveBounce: (newTake: TakeRecord) => Promise<void>;
  onUpdateTake?: (newTake: TakeRecord) => Promise<void> | void;
}) {
  const t = useT();
  const settings = useSettingsStore(useShallow((s) => s.settings));
  const isSpanish = (settings.language ?? 'en') === 'es';
  const activeVis = settings.perApp?.vocalex ?? { theme: 'dark', amoledMode: false };
  const isLight =
    activeVis.theme === 'light' ||
    (activeVis.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(settings.amoledMode || activeVis.amoledMode);

  const [take, setTake] = useState<TakeRecord>(initialTake);
  useEffect(() => {
    setTake(initialTake);
  }, [initialTake]);

  const isEmpty = !take.audioBlob || take.audioBlob.size === 0 || take.durationMs === 0;
  const [isRecordingMode, setIsRecordingMode] = useState<boolean>(isEmpty);

  useEffect(() => {
    if (take.durationMs === 0) {
      setIsRecordingMode(true);
    }
  }, [take.durationMs]);

  // In-Project Recording State
  const [recordState, setRecordState] = useState<'idle' | 'countdown' | 'recording' | 'processing'>(
    'idle'
  );
  const [elapsed, setElapsed] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [freqBars, setFreqBars] = useState<number[]>(() => new Array(VIZ_BARS).fill(0));
  const [recordError, setRecordError] = useState<string | null>(null);

  // Title rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(take.name || '');

  useEffect(() => {
    setTitleInput(take.name || '');
  }, [take.name]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === take.name) return;
    const updated = { ...take, name: trimmed };
    setTake(updated);
    await vocalexRepository.saveTake(updated);
    if (onUpdateTake) {
      await onUpdateTake(updated);
    }
  };

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const vizRafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const smoothedBarsRef = useRef<number[]>(new Array(VIZ_BARS).fill(0));
  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const cleanupRecordingAudio = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((trk) => trk.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecordingAudio();
    };
  }, [cleanupRecordingAudio]);

  const monitorFrequency = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    const bucketSize = Math.max(1, Math.floor(freqData.length / VIZ_BARS));
    const newBars: number[] = [];
    for (let i = 0; i < VIZ_BARS; i++) {
      let sum = 0;
      const start = i * bucketSize;
      for (let j = start; j < start + bucketSize && j < freqData.length; j++) {
        sum += freqData[j];
      }
      const raw = sum / bucketSize / 255;
      const prev = smoothedBarsRef.current[i] ?? 0;
      const smoothed = prev * SMOOTHING_FACTOR + raw * (1 - SMOOTHING_FACTOR);
      newBars.push(smoothed);
    }
    smoothedBarsRef.current = newBars;
    setFreqBars([...newBars]);
    vizRafRef.current = requestAnimationFrame(monitorFrequency);
  }, []);

  const acquireMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is not supported in this browser context.');
    }
    const s = useSettingsStore.getState().settings;
    const noiseSuppression = s.vocalexNoiseSuppression ?? false;
    const autoGainControl = s.vocalexAutoGainControl ?? false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression,
          autoGainControl,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    streamRef.current = stream;

    const ctx = createAudioContext();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    src.connect(analyser);
    analyserRef.current = analyser;

    vizRafRef.current = requestAnimationFrame(monitorFrequency);
    return stream;
  }, [monitorFrequency]);

  const beginMediaRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(200);
    startTimeRef.current = Date.now();
    setRecordState('recording');

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50);
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      setRecordError(null);
      await acquireMic();

      const countIn = settings.vocalexCountIn ?? 3;
      if (countIn <= 0) {
        beginMediaRecorder();
      } else {
        setRecordState('countdown');
        setCountdownNum(countIn);

        let count = countIn;
        const cdInterval = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(cdInterval);
            beginMediaRecorder();
          } else {
            setCountdownNum(count);
          }
        }, 1000);
      }
    } catch (err: unknown) {
      setRecordError(err instanceof Error ? err.message : 'Microphone access denied');
      setRecordState('idle');
    }
  }, [acquireMic, beginMediaRecorder, settings.vocalexCountIn]);

  const handleStopRecording = useCallback(async () => {
    setRecordState('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const durationMs = elapsedRef.current;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    cleanupRecordingAudio();

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

    let waveformPeaks: number[] = [];
    let sampleRate = 48000;
    try {
      const audioBuffer = await blobToAudioBuffer(blob);
      waveformPeaks = extractWaveformPeaks(audioBuffer, 60);
      sampleRate = audioBuffer.sampleRate;
    } catch {
      /* fallback */
    }

    const updatedTake: TakeRecord = {
      ...take,
      durationMs,
      audioBlob: blob,
      waveformPeaks,
      sampleRate,
    };

    setTake(updatedTake);
    await vocalexRepository.saveTake(updatedTake);
    if (onUpdateTake) {
      await onUpdateTake(updatedTake);
    }
    setRecordState('idle');
    setElapsed(0);
    setIsRecordingMode(false);
  }, [take, cleanupRecordingAudio, onUpdateTake]);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<VocalAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHarmonizer, setShowHarmonizer] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  useBackHandler(
    'nested',
    () => {
      onBack();
      return true;
    },
    [onBack]
  );

  useEffect(() => {
    if (!take.audioBlob || take.audioBlob.size === 0 || take.durationMs === 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
      setProgress(0);
      return;
    }
    const url = URL.createObjectURL(take.audioBlob);
    urlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [take.audioBlob, take.durationMs]);

  useEffect(() => {
    if (!take.audioBlob || take.audioBlob.size === 0 || take.durationMs === 0) {
      setAnalyzing(false);
      setAnalysis(null);
      return;
    }
    setAnalyzing(true);
    (async () => {
      try {
        const audioBuffer = await blobToAudioBuffer(take.audioBlob);
        const labels: AnalysisLabels = {
          noPitchTitle: t.vocalex.noPitchTitle,
          noPitchDetail: t.vocalex.noPitchDetail,
          pitchStability: t.vocalex.pitchStabilityTitle,
          stabilityExcellent: t.vocalex.stabilityExcellent,
          stabilityGood: t.vocalex.stabilityGood,
          stabilityPractice: t.vocalex.stabilityPractice,
          vocalRange: t.vocalex.vocalRangeTitle,
          semitones: t.vocalex.semitonesUnit,
          rangeWide: t.vocalex.rangeWide,
          rangeModerate: t.vocalex.rangeModerate,
          rangeNarrow: t.vocalex.rangeNarrow,
          rangeTo: t.vocalex.rangeTo,
          pitchTrend: t.vocalex.pitchTrendTitle,
          driftingFlat: t.vocalex.driftingFlat,
          driftingFlatDetail: t.vocalex.driftingFlatDetail,
          driftingSharp: t.vocalex.driftingSharp,
          driftingSharpDetail: t.vocalex.driftingSharpDetail,
          stableTrend: t.vocalex.stableTrend,
          stableTrendDetail: t.vocalex.stableTrendDetail,
          breathGaps: t.vocalex.breathGapsTitle,
          breathGapsDetail: t.vocalex.breathGapsDetail,
          inTuneRate: t.vocalex.inTuneRateTitle,
          inTuneExcellent: t.vocalex.inTuneExcellent,
          inTuneDecent: t.vocalex.inTuneDecent,
          inTunePractice: t.vocalex.inTunePractice,
        };
        const result = analyzeAudio(audioBuffer, labels);
        setAnalysis(result);
      } catch {
        /* empty */
      }
      setAnalyzing(false);
    })();
  }, [take.audioBlob, take.durationMs, t.vocalex]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && isFinite(audio.duration)) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audio.play();
      rafRef.current = requestAnimationFrame(updateProgress);
      setPlaying(true);
    }
  }, [playing, updateProgress]);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = x * audio.duration;
    setProgress(x * 100);
  };

  const handleDelete = () => {
    if (audioRef.current) audioRef.current.pause();
    onDelete(take.id);
  };

  const currentTimeSec = audioRef.current?.currentTime ?? 0;
  const totalTimeSec = take.durationMs / 1000;

  const cardBg = isLight
    ? '#ffffff'
    : isAmoled
      ? '#000000'
      : 'var(--app-surface-low, rgba(255,255,255,0.04))';
  const cardBorder = '1px solid var(--c-border, rgba(128,128,128,0.14))';
  const cardShadow = 'var(--shadow-surface-raised)';

  return (
    <div
      className="relative"
      style={{
        padding:
          '16px 20px calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 16px) + 24px)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <SharedFloatingHeader
        title={take.name || 'Take Details'}
        onBack={onBack}
        toolbarActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {take.durationMs > 0 && (
              <button
                data-testid="open-harmonizer-btn"
                onClick={() => {
                  if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    setPlaying(false);
                  }
                  setShowHarmonizer(true);
                }}
                style={{
                  background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
                  border: '1px solid var(--studio-accent, #007aff)',
                  cursor: 'pointer',
                  color: 'var(--studio-accent, #007aff)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontFamily: 'var(--studio-font-display)',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
                >
                  graphic_eq
                </span>
                Harmonize
              </button>
            )}
            {take.durationMs > 0 && !isRecordingMode && (
              <button
                onClick={() => {
                  if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    setPlaying(false);
                  }
                  setIsRecordingMode(true);
                }}
                style={{
                  background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.12)',
                  border: '1px solid var(--studio-accent, #007aff)',
                  cursor: 'pointer',
                  color: 'var(--studio-accent, #007aff)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontFamily: 'var(--studio-font-display)',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
                >
                  mic
                </span>
                {isSpanish ? 'Re-grabar' : 'Re-record'}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
              title={t.vocalex.deleteTake}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                delete
              </span>
            </button>
          </div>
        }
      />

      {showHarmonizer && (
        <HarmonizerSheet
          take={take}
          accent="var(--studio-accent, #007aff)"
          onClose={() => setShowHarmonizer(false)}
          onBounce={async (newTake) => {
            await onSaveBounce(newTake);
            setShowHarmonizer(false);
            onBack();
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t.vocalex.deleteConfirmTitle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {t.vocalex.deleteConfirmBody}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>
              {t.vocalex.cancelAction}
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              style={{ flex: 1, background: 'var(--c-error, #ef4444)', color: '#fff' }}
            >
              {t.vocalex.deleteTake}
            </Button>
          </div>
        </div>
      </Dialog>

      {isRecordingMode ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Project Title & Status Bar */}
          <div
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: 20,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: cardShadow,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditingTitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    autoFocus
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    style={{
                      background: 'var(--app-surface-low, rgba(255,255,255,0.08))',
                      border: '1px solid var(--studio-accent, #007aff)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      color: 'var(--c-text-primary)',
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: 'var(--studio-font-display)',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingTitle(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 800,
                      fontSize: 17,
                      color: 'var(--c-text-primary)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {take.name}
                  </h3>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 15, color: 'var(--c-text-secondary)', opacity: 0.7 }}
                  >
                    edit
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 3,
                  fontSize: 11.5,
                  fontFamily: 'var(--studio-font-body)',
                  color: 'var(--c-text-secondary)',
                }}
              >
                <span>{formatDateI18n(take.createdAt, t.vocalex)}</span>
                <span>•</span>
                <span
                  style={{
                    color:
                      recordState === 'recording' ? '#ef4444' : 'var(--studio-accent, #007aff)',
                    fontWeight: 700,
                  }}
                >
                  {recordState === 'recording'
                    ? isSpanish
                      ? 'GRABANDO'
                      : 'RECORDING'
                    : recordState === 'countdown'
                      ? isSpanish
                        ? 'PREPARANDO'
                        : 'COUNTDOWN'
                      : isSpanish
                        ? 'ESTUDIO DE PROYECTO'
                        : 'PROJECT STUDIO'}
                </span>
              </div>
            </div>

            {/* Cancel re-recording if previous take exists */}
            {take.durationMs > 0 && recordState === 'idle' && (
              <button
                type="button"
                onClick={() => setIsRecordingMode(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--c-border, rgba(128,128,128,0.2))',
                  borderRadius: 12,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--studio-font-body)',
                  color: 'var(--c-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {t.vocalex.cancelAction || (isSpanish ? 'Cancelar' : 'Cancel')}
              </button>
            )}
          </div>

          {/* Real-time Frequency Visualizer Card */}
          <div
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: 20,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: cardShadow,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Live Visualizer Bars */}
            <div
              style={{
                width: '100%',
                height: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                marginBottom: 20,
              }}
            >
              {freqBars.map((bar, i) => {
                const heightPct =
                  recordState === 'recording'
                    ? Math.max(8, Math.min(100, bar * 100))
                    : recordState === 'countdown'
                      ? Math.max(12, Math.sin(i * 0.4 + Date.now() / 200) * 30 + 35)
                      : 6;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      maxWidth: 6,
                      height: `${heightPct}%`,
                      borderRadius: 9999,
                      background:
                        recordState === 'recording'
                          ? 'var(--studio-accent, #007aff)'
                          : recordState === 'countdown'
                            ? '#f59e0b'
                            : isLight
                              ? 'rgba(0,0,0,0.12)'
                              : 'rgba(255,255,255,0.12)',
                      transition:
                        recordState === 'recording' ? 'height 50ms ease' : 'height 200ms ease',
                    }}
                  />
                );
              })}
            </div>

            {/* Live Elapsed Counter / Countdown Display */}
            {recordState === 'countdown' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: 44,
                    fontWeight: 900,
                    color: '#f59e0b',
                    lineHeight: 1,
                  }}
                >
                  {countdownNum}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--c-text-secondary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isSpanish ? 'Prepárate para cantar' : 'Get ready'}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: recordState === 'recording' ? '#ef4444' : 'var(--c-text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDuration(elapsed)}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 11.5,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  {recordState === 'recording'
                    ? isSpanish
                      ? 'Grabando audio de alta fidelidad...'
                      : 'Recording high-fidelity audio...'
                    : recordState === 'processing'
                      ? isSpanish
                        ? 'Analizando afinación...'
                        : 'Analyzing pitch...'
                      : isSpanish
                        ? 'Toca para iniciar la toma'
                        : 'Tap to start recording take'}
                </span>
              </div>
            )}

            {/* Big Recording Action Controls */}
            {recordState === 'idle' && (
              <button
                type="button"
                aria-label={isSpanish ? 'Iniciar grabación' : 'Start recording'}
                onClick={handleStartRecording}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '2.5px solid #ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
                  transition: 'all 200ms ease',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  }}
                />
              </button>
            )}

            {recordState === 'recording' && (
              <button
                type="button"
                aria-label={isSpanish ? 'Detener grabación' : 'Stop recording'}
                onClick={handleStopRecording}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '2.5px solid #ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#ef4444',
                  }}
                />
              </button>
            )}

            {recordState === 'processing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16 }}>
                <Loader />
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--c-text-primary)',
                  }}
                >
                  {isSpanish ? 'Guardando y analizando...' : 'Saving and analyzing...'}
                </span>
              </div>
            )}

            {recordError && (
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  fontSize: 12,
                  fontFamily: 'var(--studio-font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  error
                </span>
                <span>{recordError}</span>
              </div>
            )}

            {/* Hardware & DSP Badges */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid var(--c-border, rgba(128,128,128,0.12))',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--c-text-primary)',
                  }}
                >
                  48 kHz
                </span>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 10.5,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  Lossless
                </span>
              </div>

              <div
                style={{
                  height: 18,
                  width: 1,
                  background: 'var(--c-border, rgba(128,128,128,0.15))',
                }}
              />

              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: settings.vocalexNoiseSuppression ? '#10b981' : 'var(--c-text-secondary)',
                  }}
                >
                  {settings.vocalexNoiseSuppression ? 'ON' : 'OFF'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 10.5,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  {isSpanish ? 'Supresión' : 'Noise Filter'}
                </span>
              </div>

              <div
                style={{
                  height: 18,
                  width: 1,
                  background: 'var(--c-border, rgba(128,128,128,0.15))',
                }}
              />

              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: settings.vocalexAutoGainControl ? '#10b981' : 'var(--c-text-secondary)',
                  }}
                >
                  {settings.vocalexAutoGainControl ? 'ON' : 'OFF'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 10.5,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  Auto Gain
                </span>
              </div>

              <div
                style={{
                  height: 18,
                  width: 1,
                  background: 'var(--c-border, rgba(128,128,128,0.15))',
                }}
              />

              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--studio-accent, #007aff)',
                  }}
                >
                  {settings.vocalexCountIn ?? 3}s
                </span>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 10.5,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  Count-in
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Take info with inline rename */}
          <div style={{ marginBottom: 20 }}>
            {isEditingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleInput(take.name);
                      setIsEditingTitle(false);
                    }
                  }}
                  style={{
                    background: 'var(--app-surface-low, rgba(255,255,255,0.08))',
                    border: '1px solid var(--studio-accent, #007aff)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    color: 'var(--c-text-primary)',
                    fontSize: 19,
                    fontWeight: 800,
                    fontFamily: 'var(--studio-font-display)',
                    outline: 'none',
                    flex: 1,
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  style={{
                    background: 'var(--studio-accent, #007aff)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSpanish ? 'Guardar' : 'Save'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontWeight: 800,
                    fontSize: 22,
                    color: 'var(--c-text-primary)',
                    margin: 0,
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    letterSpacing: '-0.02em',
                    cursor: 'pointer',
                  }}
                  title={isSpanish ? 'Toca para renombrar' : 'Click to rename'}
                >
                  {take.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--c-text-secondary)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={isSpanish ? 'Renombrar proyecto' : 'Rename project'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    edit
                  </span>
                </button>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--studio-font-body)',
                fontSize: 12,
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
              <span style={{ fontFamily: 'var(--studio-font-mono)', fontWeight: 600 }}>
                {formatDuration(take.durationMs)}
              </span>
            </div>
          </div>

          {/* Player card */}
          <div
            style={{
              background: cardBg,
              border: cardBorder,
              boxShadow: cardShadow,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: playing ? 'var(--studio-accent, #007aff)' : 'transparent',
                transition: 'background 200ms ease',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <button
                onClick={togglePlay}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--studio-accent, #007aff)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px 0 rgba(0, 122, 255, 0.25)',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 26,
                    color: '#fff',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  {playing ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: playing ? 'var(--studio-accent, #007aff)' : 'var(--c-text-secondary)',
                    margin: 0,
                    transition: 'color 200ms ease',
                  }}
                >
                  {playing ? t.vocalex.playing : t.vocalex.tapToPlay}
                </p>
              </div>
            </div>

            {/* Waveform / scrubber */}
            <div
              onClick={seekTo}
              style={{
                height: 72,
                background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.2)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                gap: 1.5,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progress}%`,
                  background: 'rgba(var(--studio-accent-rgb, 0,122,255), 0.08)',
                  borderRight: '2px solid var(--studio-accent, #007aff)',
                  transition: playing ? 'none' : 'width 100ms ease',
                }}
              />
              {take.waveformPeaks.map((h, i) => {
                const isPlayed = (i / take.waveformPeaks.length) * 100 < progress;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(8, h)}%`,
                      borderRadius: 9999,
                      background: isPlayed
                        ? 'var(--studio-accent, #007aff)'
                        : isLight
                          ? '#cbd5e1'
                          : 'rgba(255,255,255,0.2)',
                      position: 'relative',
                      zIndex: 1,
                      minWidth: 1.5,
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 2px 0',
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--c-text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{formatDuration(currentTimeSec * 1000)}</span>
              <span>-{formatDuration((totalTimeSec - currentTimeSec) * 1000)}</span>
            </div>
          </div>

          {/* Analysis section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: 'var(--studio-accent, #007aff)' }}
              >
                insights
              </span>
              <h3
                style={{
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {t.vocalex.vocalAnalysis}
              </h3>
            </div>

            {analyzing ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  background: cardBg,
                  border: cardBorder,
                  boxShadow: cardShadow,
                  borderRadius: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Loader variant="metaballs" size={32} />
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 13,
                    color: 'var(--c-text-secondary)',
                    margin: 0,
                  }}
                >
                  {t.vocalex.analyzing}
                </p>
              </div>
            ) : analysis ? (
              <>
                {/* Stats grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <StatCard
                    label={t.vocalex.avgFrequency}
                    value={
                      analysis.avgFrequency > 0 ? `${analysis.avgFrequency.toFixed(0)} Hz` : '—'
                    }
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    cardShadow={cardShadow}
                  />
                  <StatCard
                    label={t.vocalex.stability}
                    value={`${analysis.stabilityPercent}%`}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    cardShadow={cardShadow}
                    color={
                      analysis.stabilityPercent >= 80
                        ? '#34d399'
                        : analysis.stabilityPercent >= 60
                          ? '#eab308'
                          : '#ef4444'
                    }
                  />
                  <StatCard
                    label={t.vocalex.lowest}
                    value={analysis.lowestNote}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    cardShadow={cardShadow}
                  />
                  <StatCard
                    label={t.vocalex.highest}
                    value={analysis.highestNote}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    cardShadow={cardShadow}
                  />
                </div>

                {/* Pitch timeline */}
                {analysis.pitchTimeline.length > 0 && (
                  <div
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      boxShadow: cardShadow,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 16,
                      height: 100,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--studio-font-body)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--c-text-secondary)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        margin: '0 0 8px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {t.vocalex.pitchTimeline}
                    </p>
                    <svg
                      viewBox={`0 0 ${analysis.pitchTimeline.length} 60`}
                      style={{
                        width: '100%',
                        height: 56,
                        display: 'block',
                      }}
                      preserveAspectRatio="none"
                    >
                      {(() => {
                        const pts = analysis.pitchTimeline;
                        const minF = Math.min(...pts.map((p) => p.frequency));
                        const maxF = Math.max(...pts.map((p) => p.frequency));
                        const range = maxF - minF || 1;
                        const path = pts
                          .map((p, i) => {
                            const y = 56 - ((p.frequency - minF) / range) * 50 - 3;
                            return `${i === 0 ? 'M' : 'L'} ${i} ${y}`;
                          })
                          .join(' ');
                        return (
                          <>
                            <path
                              d={path}
                              fill="none"
                              stroke="var(--studio-accent, #007aff)"
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              d={`${path} L ${pts.length - 1} 60 L 0 60 Z`}
                              fill="url(#pitchGrad)"
                              opacity="0.3"
                            />
                            <defs>
                              <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--studio-accent, #007aff)" />
                                <stop
                                  offset="100%"
                                  stopColor="var(--studio-accent, #007aff)"
                                  stopOpacity="0"
                                />
                              </linearGradient>
                            </defs>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}

                {/* Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {analysis.insights.map((insight, i) => (
                    <div
                      key={i}
                      style={{
                        background: cardBg,
                        border: cardBorder,
                        boxShadow: cardShadow,
                        borderRadius: 14,
                        padding: '16px 18px',
                        borderLeft: `3px solid ${insight.color}`,
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 20,
                            color: insight.color,
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          {insight.icon}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--studio-font-display)',
                              fontWeight: 700,
                              fontSize: 14,
                              color: 'var(--c-text-primary)',
                            }}
                          >
                            {insight.title}
                          </span>
                          {insight.value && (
                            <span
                              style={{
                                fontFamily: 'var(--studio-font-mono)',
                                fontWeight: 800,
                                fontSize: 14,
                                color: insight.color,
                              }}
                            >
                              {insight.value}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontSize: 12.5,
                          color: 'var(--c-text-secondary)',
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        {insight.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  background: cardBg,
                  border: cardBorder,
                  boxShadow: cardShadow,
                  borderRadius: 14,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 13,
                    color: 'var(--c-text-secondary)',
                    margin: 0,
                  }}
                >
                  {t.vocalex.analysisError}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  cardBg,
  cardBorder,
  cardShadow,
}: {
  label: string;
  value: string;
  color?: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
}) {
  return (
    <div
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--studio-font-body)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--c-text-secondary)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin: '0 0 4px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--studio-font-mono)',
          fontSize: 20,
          fontWeight: 700,
          color: color ?? 'var(--c-text-primary)',
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}
