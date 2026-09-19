import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useT,
  createAudioContext,
  NavigationDispatcher,
  useBackHandler,
  useSettingsStore,
} from '@workspace/livex-core';
import {
  blobToAudioBuffer,
  extractWaveformPeaks,
  type TakeRecord,
  vocalexRepository,
} from '@workspace/livex-core';

const SMOOTHING_FACTOR = 0.8;
const VIZ_BARS = 64;

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RecordingView({
  onComplete,
  onCancel,
}: {
  onComplete: (take: TakeRecord) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'countdown' | 'recording' | 'processing'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [freqBars, setFreqBars] = useState<number[]>(() => new Array(VIZ_BARS).fill(0));
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useBackHandler(
    'nested',
    () => {
      onCancel();
      return true;
    },
    [onCancel]
  );

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const smoothedBarsRef = useRef<number[]>(new Array(VIZ_BARS).fill(0));
  const nameRef = useRef('');
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const monitorFrequency = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    const bucketSize = Math.floor(freqData.length / VIZ_BARS);
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
    rafRef.current = requestAnimationFrame(monitorFrequency);
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
    } catch (constraintsErr) {
      console.info(
        '[TakesPanel] getUserMedia with constraints failed, falling back to simple audio:',
        constraintsErr
      );
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (unmountedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return { stream, ctx: null as any, analyser: null as any };
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

    rafRef.current = requestAnimationFrame(monitorFrequency);
    return { stream, ctx, analyser };
  }, [monitorFrequency]);

  const beginRecording = useCallback(() => {
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
    setState('recording');

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50);
  }, []);

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      await acquireMic();

      const s = useSettingsStore.getState().settings;
      const countIn = s.vocalexCountIn ?? 3;

      if (countIn <= 0) {
        beginRecording();
      } else {
        setState('countdown');
        setCountdownNum(countIn);

        let count = countIn;
        const cdInterval = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(cdInterval);
            beginRecording();
          } else {
            setCountdownNum(count);
          }
        }, 1000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, [acquireMic, beginRecording]);

  const stopRecording = useCallback(async () => {
    setState('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const durationMs = elapsedRef.current;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

    let waveformPeaks: number[] = [];
    let sampleRate = 44100;
    try {
      const audioBuffer = await blobToAudioBuffer(blob);
      waveformPeaks = extractWaveformPeaks(audioBuffer, 60);
      sampleRate = audioBuffer.sampleRate;
    } catch {
      /* fallback */
    }

    const id = `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const currentName = nameRef.current;
    const takeName =
      currentName.trim() ||
      `Take_${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}_${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '')}`;

    const take: TakeRecord = {
      id,
      name: takeName,
      createdAt: Date.now(),
      durationMs,
      audioBlob: blob,
      waveformPeaks,
      sampleRate,
    };

    onComplete(take);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
    };
  }, []);

  const isActive = state === 'recording' || state === 'countdown';
  const centerR = 56;
  const vizR = 100;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '24px 20px',
        gap: 24,
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes countPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {state === 'processing' && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid var(--studio-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--vx-text-2)' }}>
            {t.vocalex.processing}
          </p>
        </div>
      )}

      {state !== 'processing' && (
        <>
          {/* Circular visualizer + button */}
          <div
            style={{
              width: vizR * 2 + 40,
              height: vizR * 2 + 40,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Frequency bars radiating from center */}
            <svg
              viewBox={`0 0 ${(vizR + 20) * 2} ${(vizR + 20) * 2}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {freqBars.map((val, i) => {
                const angle = (i / VIZ_BARS) * Math.PI * 2 - Math.PI / 2;
                const innerR = centerR + 8;
                const barLen = Math.max(2, val * (vizR - centerR - 4));
                const cx = vizR + 20;
                const cy = vizR + 20;
                const x1 = cx + Math.cos(angle) * innerR;
                const y1 = cy + Math.sin(angle) * innerR;
                const x2 = cx + Math.cos(angle) * (innerR + barLen);
                const y2 = cy + Math.sin(angle) * (innerR + barLen);

                const hue = 210 + val * 30;
                const alpha = 0.3 + val * 0.7;

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={`hsla(${hue}, 100%, 60%, ${alpha})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}

              {isActive && (
                <circle
                  cx={vizR + 20}
                  cy={vizR + 20}
                  r={centerR + 6}
                  fill="none"
                  stroke="rgba(var(--studio-accent-rgb), 0.15)"
                  strokeWidth="1"
                />
              )}
            </svg>

            {/* Center button */}
            <div
              onClick={
                state === 'idle' ? handleStart : state === 'recording' ? stopRecording : undefined
              }
              style={{
                width: centerR * 2,
                height: centerR * 2,
                borderRadius: '50%',
                background:
                  state === 'recording'
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'var(--studio-accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  state === 'recording'
                    ? '0 0 60px rgba(239,68,68,0.25), 0 0 120px rgba(239,68,68,0.1)'
                    : '0 0 60px rgba(var(--studio-accent-rgb), 0.2), 0 0 120px rgba(var(--studio-accent-rgb), 0.08)',
                cursor: state === 'countdown' ? 'default' : 'pointer',
                position: 'relative',
                zIndex: 2,
                transition: 'background 300ms ease, box-shadow 300ms ease',
              }}
            >
              {state === 'countdown' ? (
                <span
                  key={countdownNum}
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: 64,
                    fontWeight: 800,
                    color: '#fff',
                    animation: 'countPop 0.6s ease-out forwards',
                  }}
                >
                  {countdownNum}
                </span>
              ) : state === 'recording' ? (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#fff',
                    transition: 'border-radius 200ms ease',
                  }}
                />
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 44,
                    color: '#fff',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  mic
                </span>
              )}
            </div>
          </div>

          {/* Timer / status */}
          <div style={{ textAlign: 'center' }}>
            {state === 'recording' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'recPulse 1.2s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#ef4444',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.vocalex.rec}
                </span>
              </div>
            )}
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 48,
                fontWeight: 800,
                color: 'var(--vx-text)',
                margin: 0,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDuration(elapsed)}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--vx-text-2)',
                margin: '8px 0 0',
              }}
            >
              {state === 'countdown'
                ? t.vocalex.getReady
                : state === 'recording'
                  ? t.vocalex.tapToStop
                  : t.vocalex.tapToStart}
            </p>
          </div>

          {/* Name input */}
          {(state === 'idle' || state === 'recording') && (
            <input
              type="text"
              placeholder={t.vocalex.takeNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                maxWidth: 300,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'var(--vx-card-2)',
                border: '1px solid var(--vx-text-4)',
                color: 'var(--vx-text)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--studio-accent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--vx-text-4)';
              }}
            />
          )}

          {error && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                maxWidth: 300,
                width: '100%',
              }}
            >
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
