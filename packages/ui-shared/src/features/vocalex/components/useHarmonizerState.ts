import { useState, useRef, useCallback, useEffect } from 'react';
import { type TakeRecord, blobToAudioBuffer, createAudioContext, useT } from '@workspace/livex-core';
import {
  HARMONIES,
  DEFAULT_HARMONY_LAYERS,
  startHarmonyPlayback,
  bounceHarmonizedTake,
  layerSemitones,
  detectKey,
  type HarmonyId,
  type HarmonyLayerState,
  type HarmonyPlaybackSession,
} from '../services/harmonyEngine';
import { detectPitch } from '../services/pitchYin';
import { bufferToMono } from '../services/pitchShift';

export interface HarmonizerState {
  take: TakeRecord;
  accent: string;
  layers: HarmonyLayerState[];
  dryGain: number;
  setDryGain: (v: number) => void;
  humanize: number;
  setHumanize: (v: number) => void;
  formant: number;
  setFormant: (v: number) => void;
  isPlaying: boolean;
  isGenerating: boolean;
  playProgress: number;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean | ((prev: boolean) => boolean)) => void;
  showAddLayer: boolean;
  setShowAddLayer: (v: boolean | ((prev: boolean) => boolean)) => void;
  showExport: boolean;
  setShowExport: (v: boolean | ((prev: boolean) => boolean)) => void;
  detectedKey: string | null;
  isBouncing: boolean;
  bounceError: string | null;
  playError: string | null;
  handlePlayStop: () => Promise<void>;
  stopPlayback: () => void;
  updateLayer: (index: number, patch: Partial<HarmonyLayerState>) => void;
  removeLayer: (index: number) => void;
  addLayer: (id: HarmonyId) => void;
  doBounce: (opts?: { harmonyOnly?: boolean; download?: boolean }) => Promise<void>;
  currentTimeSec: number;
  totalDuration: number;
  activeCount: number;
  onClose: () => void;
}

export function useHarmonizerState(
  take: TakeRecord,
  accent: string,
  onClose: () => void,
  onBounce: (newTake: TakeRecord) => void | Promise<void>
): HarmonizerState {
  const t = useT();
  const [layers, setLayers] = useState<HarmonyLayerState[]>(() =>
    DEFAULT_HARMONY_LAYERS.map((l) => ({ ...l }))
  );
  const [dryGain, setDryGain] = useState(1.0);
  const [humanize, setHumanize] = useState(0.28);
  const [formant, setFormant] = useState(0.4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [isBouncing, setIsBouncing] = useState(false);
  const [bounceError, setBounceError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<HarmonyPlaybackSession | null>(null);
  const rafRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(take.durationMs / 1000);

  useEffect(() => {
    blobToAudioBuffer(take.audioBlob)
      .then((buf) => {
        const mono = bufferToMono(buf);
        const chunkSize = 2048;
        const hopSize = 4096;
        const timeline: { noteName: string; frequency: number }[] = [];
        for (let off = 0; off + chunkSize <= mono.length; off += hopSize) {
          const chunk = mono.slice(off, off + chunkSize);
          const result = detectPitch(chunk, buf.sampleRate, 0.8);
          if (result) timeline.push({ noteName: result.noteName, frequency: result.frequency });
        }
        setDetectedKey(detectKey(timeline));
      })
      .catch(() => {});
  }, [take]);

  useEffect(
    () => () => {
      sessionRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close();
    },
    []
  );

  const stopPlayback = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    cancelAnimationFrame(rafRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
    setPlayProgress(0);
  }, []);

  const handlePlayStop = useCallback(async () => {
    if (isPlayingRef.current) {
      stopPlayback();
      return;
    }

    let ctx = ctxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = createAudioContext();
      ctxRef.current = ctx;
    }
    if (ctx.state === 'suspended') await ctx.resume();

    setPlayError(null);
    setIsGenerating(true);
    try {
      const session = await startHarmonyPlayback(take, layers, ctx, {
        dryGain,
        humanize,
        formantCorrection: formant,
      });
      sessionRef.current = session;
      durationRef.current = session.duration;

      const startTime = ctx.currentTime;
      isPlayingRef.current = true;
      setIsGenerating(false);
      setIsPlaying(true);

      session.onEnded(() => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setPlayProgress(0);
        cancelAnimationFrame(rafRef.current);
      });

      const tick = () => {
        if (!isPlayingRef.current) return;
        const elapsed = ctx!.currentTime - startTime;
        setPlayProgress(Math.min(1, elapsed / durationRef.current));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setIsGenerating(false);
      setPlayError('Failed to generate harmonies. Please try again.');
    }
  }, [take, layers, dryGain, humanize, formant, stopPlayback]);

  const updateLayer = useCallback((index: number, patch: Partial<HarmonyLayerState>) => {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }, []);

  const removeLayer = useCallback((index: number) => {
    setLayers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addLayer = useCallback((id: HarmonyId) => {
    const panOptions = [-0.3, 0.3, -0.5, 0.5, -0.15, 0.15, 0, 0.4, -0.4];
    setLayers((prev) => [
      ...prev,
      {
        id,
        enabled: true,
        gain: 0.75,
        pan: panOptions[prev.length % panOptions.length],
        mute: false,
        solo: false,
        fineTune: 0,
        customSemitones: 5,
      },
    ]);
    setShowAddLayer(false);
  }, []);

  const doBounce = useCallback(
    async (opts: { harmonyOnly?: boolean; download?: boolean } = {}) => {
      const { harmonyOnly = false, download = false } = opts;
      stopPlayback();
      setBounceError(null);
      setIsBouncing(true);
      setShowExport(false);
      try {
        const enabledNames = layers
          .filter((l) => l.enabled && !l.mute)
          .map((l) => HARMONIES.find((h) => h.id === l.id)?.short ?? '')
          .filter(Boolean)
          .join(' ');
        const newName =
          `${take.name} (${harmonyOnly ? 'Harmony' : `Harmonized ${enabledNames}`})`.trim();
        const newTake = await bounceHarmonizedTake(take, layers, newName, {
          dryGain: harmonyOnly ? 0 : dryGain,
          humanize,
          formantCorrection: formant,
        });
        if (download) {
          const url = URL.createObjectURL(newTake.audioBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${take.name}${harmonyOnly ? '-harmony' : '-mix'}.wav`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          await onBounce(newTake);
          onClose();
        }
      } catch {
        setBounceError('Export failed. Please try again.');
      }
      setIsBouncing(false);
    },
    [take, layers, dryGain, humanize, formant, stopPlayback, onBounce, onClose]
  );

  const totalDuration = take.durationMs / 1000;
  const currentTimeSec = playProgress * durationRef.current;
  const activeCount = layers.filter((l) => l.enabled && !l.mute).length;

  return {
    take, accent, layers, dryGain, setDryGain, humanize, setHumanize, formant, setFormant,
    isPlaying, isGenerating, playProgress, showAdvanced, setShowAdvanced, showAddLayer, setShowAddLayer,
    showExport, setShowExport, detectedKey, isBouncing, bounceError, playError,
    handlePlayStop, stopPlayback, updateLayer, removeLayer, addLayer, doBounce,
    currentTimeSec, totalDuration, activeCount, onClose
  };
}
