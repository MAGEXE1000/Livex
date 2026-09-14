import { Capacitor } from '@capacitor/core';
import { PitchDetector } from 'pitchy';
import { createAudioContext } from '../audioContextOptions';
import {
  calculatePitchMetrics,
  calculateRms,
  calculatePeak,
} from './pitchMath';
import type {
  InstrumentStringTarget,
  InstrumentTuningDefinition,
  InstrumentTuningMode,
  PitchMetrics,
  TunerEngineOptions,
  TunerFramePayload,
  TunerLifecycleState,
} from './tunerTypes';
import {
  getDefaultTuningForMode,
  getTuningById,
} from './tuningDefinitions';
import {
  playTunerReferenceString,
  preloadTunerReferenceAudio,
  stopTunerReferenceAudio,
} from './tunerReferenceAudio';

const BUFFER_SIZE = 2048;
const REQUIRED_IN_TUNE_FRAMES = 3;

export class TunerAudioEngine {
  private mode: InstrumentTuningMode;
  private activeTuning: InstrumentTuningDefinition;
  private refA4: number;
  private inTuneToleranceCents: number;
  private exitTuneToleranceCents: number;
  private noiseFilter: boolean = true;
  private manualTargetString: InstrumentStringTarget | null = null;
  private onFrame?: (payload: TunerFramePayload) => void;
  private onStateChange?: (state: TunerLifecycleState) => void;

  private state: TunerLifecycleState = 'initial';
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private notchFilter50: BiquadFilterNode | null = null;
  private notchFilter60: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;

  private detector: PitchDetector<Float32Array> | null = null;
  private buffer: Float32Array = new Float32Array(BUFFER_SIZE);

  private rafId: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private wasRunningBeforeBackground: boolean = false;

  private consecutiveInTuneFrames: number = 0;
  private currentlyInTune: boolean = false;
  private prevPeak: number = 0;
  private transientCooldownFrames: number = 0;
  private appStateListenerRemover?: () => void;
  private visibilityListener?: () => void;

  constructor(options: TunerEngineOptions) {
    this.mode = options.instrumentMode;
    if (options.activeTuning) {
      this.activeTuning = options.activeTuning;
    } else if (options.tuningId) {
      this.activeTuning = getTuningById(options.tuningId) || getDefaultTuningForMode(this.mode);
    } else {
      this.activeTuning = getDefaultTuningForMode(this.mode);
    }
    this.refA4 = options.referenceA4 ?? 440;
    this.inTuneToleranceCents = options.inTuneToleranceCents ?? 3.5;
    this.exitTuneToleranceCents = options.exitTuneToleranceCents ?? 4.5;
    this.noiseFilter = options.noiseFilter ?? true;
    this.manualTargetString = options.manualTargetString ?? null;
    this.onFrame = options.onFrame;
    this.onStateChange = options.onStateChange;

    this.setupLifecycleListeners();
  }

  public setMode(newMode: InstrumentTuningMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    if (!this.activeTuning.instrumentCompatibility.includes(newMode)) {
      this.activeTuning = getDefaultTuningForMode(newMode);
    }
    this.updateAudioFilters();
  }

  public getMode(): InstrumentTuningMode {
    return this.mode;
  }

  public setTuning(tuning: InstrumentTuningDefinition | string): void {
    const resolved = typeof tuning === 'string' ? getTuningById(tuning) : tuning;
    if (!resolved) return;
    this.activeTuning = resolved;
    if (!resolved.instrumentCompatibility.includes(this.mode)) {
      this.setMode(resolved.instrumentCompatibility[0]);
    }
  }

  public getActiveTuning(): InstrumentTuningDefinition {
    return this.activeTuning;
  }

  public setReferenceA4(freq: number) {
    if (this.refA4 === freq || freq < 415 || freq > 466) return;
    this.refA4 = freq;
  }

  public getReferenceA4(): number {
    return this.refA4;
  }

  public setManualTargetString(target: InstrumentStringTarget | null) {
    this.manualTargetString = target;
  }

  public getManualTargetString(): InstrumentStringTarget | null {
    return this.manualTargetString;
  }

  public setNoiseFilter(enabled: boolean) {
    if (this.noiseFilter === enabled) return;
    this.noiseFilter = enabled;
    this.updateAudioFilters();
  }

  public getNoiseFilter(): boolean {
    return this.noiseFilter;
  }

  /**
   * Play realistic recorded reference instrument string audio for a target string
   */
  public async playStringReference(
    target: InstrumentStringTarget,
    mode?: InstrumentTuningMode
  ): Promise<void> {
    const activeMode = mode || this.mode;
    return playTunerReferenceString({
      target,
      mode: activeMode,
      refA4: this.refA4,
      audioCtx: this.audioCtx && this.audioCtx.state !== 'closed' ? this.audioCtx : undefined,
    });
  }

  /**
   * Preload reference audio samples for fast playback on card tap
   */
  public preloadReferenceAudio(mode?: InstrumentTuningMode): void {
    const activeMode = mode || this.mode;
    preloadTunerReferenceAudio(
      activeMode,
      this.audioCtx && this.audioCtx.state !== 'closed' ? this.audioCtx : undefined
    );
  }

  /**
   * Play an audible pure reference pitch tone for string tuning
   */
  public playReferenceTone(frequency: number, durationSeconds: number = 1.4): void {
    try {
      const ctx = this.audioCtx && this.audioCtx.state !== 'closed'
        ? this.audioCtx
        : createAudioContext();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);
    } catch (err) {
      console.warn('[TunerAudioEngine] playReferenceTone error:', err);
    }
  }

  public getState(): TunerLifecycleState {
    return this.state;
  }

  private setState(newState: TunerLifecycleState) {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange?.(newState);
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;
    this.setState('requesting_permission');

    try {
      // 1. Native Capacitor permission check
      if (Capacitor.isNativePlatform()) {
        try {
          const { AppInstaller } = await import('../apkDownloader');
          const check = await AppInstaller.checkPermissions();
          if (check.microphone !== 'granted') {
            const req = await AppInstaller.requestPermissions({ aliases: ['microphone'] });
            if (req.microphone !== 'granted') {
              this.setState('permission_denied');
              this.emitFrame(null, 'Microphone permission denied.');
              return false;
            }
          }
        } catch (capErr) {
          console.warn('[TunerAudioEngine] Capacitor permission check fallback:', capErr);
        }
      }

      // 2. Web / WebView getUserMedia stream acquisition
      if (!navigator.mediaDevices?.getUserMedia) {
        this.setState('no_microphone');
        this.emitFrame(null, 'Microphone API is not supported in this environment.');
        return false;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (err: unknown) {
        console.debug('[TunerAudioEngine] Unconstrained getUserMedia fallback...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (fallbackErr: unknown) {
          const e = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
          if (
            e.name === 'NotAllowedError' ||
            e.name === 'PermissionDeniedError' ||
            e.message.includes('permission')
          ) {
            this.setState('permission_denied');
            this.emitFrame(null, 'Microphone permission was denied by user.');
          } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            this.setState('no_microphone');
            this.emitFrame(null, 'No audio recording device found.');
          } else {
            this.setState('permission_permanently_denied');
            this.emitFrame(null, e.message);
          }
          return false;
        }
      }

      this.stream = stream;
      this.setState('permission_granted');

      // 3. Initialize AudioContext and Web Audio Graph
      const ctx = createAudioContext();
      this.audioCtx = ctx;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // High-pass filter at 65 Hz to reject sub-audio body thumps and handling noise
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(65, ctx.currentTime);
      hp.Q.setValueAtTime(0.707, ctx.currentTime);
      this.highPassFilter = hp;

      // 50 Hz and 60 Hz notch filters for electric guitar pickup hum rejection
      const n50 = ctx.createBiquadFilter();
      n50.type = 'notch';
      n50.frequency.setValueAtTime(50, ctx.currentTime);
      n50.Q.setValueAtTime(6.0, ctx.currentTime);
      this.notchFilter50 = n50;

      const n60 = ctx.createBiquadFilter();
      n60.type = 'notch';
      n60.frequency.setValueAtTime(60, ctx.currentTime);
      n60.Q.setValueAtTime(6.0, ctx.currentTime);
      this.notchFilter60 = n60;

      // Analyser Node
      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0.0; // Raw time domain samples
      this.analyser = analyser;

      // Wire up graph according to current instrument mode
      this.wireAudioGraph();

      // Pitch detector initialization
      this.detector = PitchDetector.forFloat32Array(BUFFER_SIZE);

      this.isRunning = true;
      this.isPaused = false;
      this.consecutiveInTuneFrames = 0;
      this.currentlyInTune = false;
      this.prevPeak = 0;
      this.transientCooldownFrames = 0;

      // Start processing loop
      this.setState('no_signal');
      this.loop();

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setState('permission_denied');
      this.emitFrame(null, msg);
      return false;
    }
  }

  private wireAudioGraph() {
    if (!this.sourceNode || !this.highPassFilter || !this.notchFilter50 || !this.notchFilter60 || !this.analyser || !this.audioCtx) {
      return;
    }

    try {
      this.sourceNode.disconnect();
      this.highPassFilter.disconnect();
      this.notchFilter50.disconnect();
      this.notchFilter60.disconnect();
    } catch {
      // ignore disconnect errors on unlinked nodes
    }

    const isBass = this.mode === 'bass-4';

    if (isBass) {
      // Bass mode: HPF at 25 Hz to permit E1 (41.2 Hz) and B0 (30.87 Hz)
      this.highPassFilter.frequency.setValueAtTime(25, this.audioCtx.currentTime);
      // Do NOT route through 50/60 Hz notch filters in bass mode (A1 is 55 Hz!)
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.analyser);
    } else if (this.mode === 'electric') {
      // Electric guitar mode: HPF 65 Hz + optional 50/60 Hz notch hum rejection
      this.highPassFilter.frequency.setValueAtTime(65, this.audioCtx.currentTime);
      if (this.noiseFilter) {
        this.sourceNode.connect(this.highPassFilter);
        this.highPassFilter.connect(this.notchFilter50);
        this.notchFilter50.connect(this.notchFilter60);
        this.notchFilter60.connect(this.analyser);
      } else {
        this.sourceNode.connect(this.highPassFilter);
        this.highPassFilter.connect(this.analyser);
      }
    } else {
      // Acoustic guitar mode: HPF 65 Hz to reject thumps
      this.highPassFilter.frequency.setValueAtTime(65, this.audioCtx.currentTime);
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.analyser);
    }
  }

  private updateAudioFilters() {
    if (this.isRunning && this.audioCtx) {
      this.wireAudioGraph();
    }
  }

  private loop = () => {
    if (!this.isRunning || this.isPaused) return;

    this.analyzeFrame();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private analyzeFrame() {
    const analyser = this.analyser;
    const ctx = this.audioCtx;
    const detector = this.detector;
    if (!analyser || !ctx || !detector) return;

    analyser.getFloatTimeDomainData(this.buffer);

    const rms = calculateRms(this.buffer);
    const peak = calculatePeak(this.buffer);

    const isBass = this.mode === 'bass-4';

    // Profile-specific noise floors and clarity thresholds
    let minRms: number;
    let minClarity: number;
    let minFreq: number;
    let maxFreq: number;

    if (isBass) {
      minRms = this.noiseFilter ? 0.003 : 0.0015;
      minClarity = 0.70;
      minFreq = 25.0; // Low B0 ~ 30.87 Hz
      maxFreq = 450.0;
    } else if (this.mode === 'electric') {
      minRms = this.noiseFilter ? 0.005 : 0.002;
      minClarity = 0.75;
      minFreq = 60.0; // Drop D/C/B ~ 60 Hz
      maxFreq = 1200.0;
    } else {
      minRms = this.noiseFilter ? 0.008 : 0.003;
      minClarity = 0.78;
      minFreq = 60.0;
      maxFreq = 1200.0;
    }

    // 1. Silence check: Signal below noise floor
    if (rms < minRms || peak < minRms * 1.5) {
      this.consecutiveInTuneFrames = 0;
      this.currentlyInTune = false;
      this.prevPeak = peak;
      this.setState('no_signal');
      this.emitFrame(null);
      return;
    }

    // 2. Pluck transient detection: Sudden sharp rise in amplitude
    if (peak > this.prevPeak * 2.8 && peak > 0.08) {
      this.transientCooldownFrames = 2; // Blank 2 frames (~33ms) to avoid pick scrape noise
    }
    this.prevPeak = peak;

    if (this.transientCooldownFrames > 0) {
      this.transientCooldownFrames--;
      return;
    }

    // 3. Pitch detection using Pitchy (MPM/YIN)
    const [rawFreq, clarity] = detector.findPitch(this.buffer, ctx.sampleRate);

    // 4. Clarity and frequency bounds validation
    if (clarity < minClarity) {
      this.consecutiveInTuneFrames = 0;
      this.currentlyInTune = false;
      this.setState('weak_signal');
      this.emitFrame(null);
      return;
    }

    if (rawFreq < minFreq || rawFreq > maxFreq || !Number.isFinite(rawFreq)) {
      this.consecutiveInTuneFrames = 0;
      this.currentlyInTune = false;
      this.setState('weak_signal');
      this.emitFrame(null);
      return;
    }

    // 5. Octave Error Protection for Low Guitar & Bass Strings
    // When playing Low E (82.41 Hz) or A (110 Hz), second harmonic (164.8 Hz / 220 Hz)
    // can occasionally be tracked as f0 if fundamental is heavily attenuated.
    let detectedFreq = rawFreq;

    if (!isBass) {
      // Guitar: Check for Low E subharmonic candidate (82.41 Hz) from E3 (155-175 Hz)
      if (detectedFreq >= 155 && detectedFreq <= 175) {
        const periodE2 = Math.round(ctx.sampleRate / (detectedFreq / 2));
        if (periodE2 < this.buffer.length) {
          let diffE2 = 0;
          let count = 0;
          for (let i = 0; i < this.buffer.length - periodE2; i += 2) {
            const d = this.buffer[i] - this.buffer[i + periodE2];
            diffE2 += d * d;
            count++;
          }
          const normDiff = count > 0 ? diffE2 / count : 1;
          if (normDiff < 0.25) {
            detectedFreq = detectedFreq / 2;
          }
        }
      }
    } else {
      // Bass: Check for Low E1 (41.2 Hz) from E2 (78-86 Hz) or A1 (55 Hz) from A2 (104-116 Hz)
      if ((detectedFreq >= 78 && detectedFreq <= 86) || (detectedFreq >= 104 && detectedFreq <= 116)) {
        const periodSub = Math.round(ctx.sampleRate / (detectedFreq / 2));
        if (periodSub < this.buffer.length) {
          let diff = 0;
          let count = 0;
          for (let i = 0; i < this.buffer.length - periodSub; i += 2) {
            const d = this.buffer[i] - this.buffer[i + periodSub];
            diff += d * d;
            count++;
          }
          const normDiff = count > 0 ? diff / count : 1;
          if (normDiff < 0.28) {
            detectedFreq = detectedFreq / 2;
          }
        }
      }
    }

    // 6. Calculate exact metrics
    const metrics = calculatePitchMetrics(
      detectedFreq,
      clarity,
      rms,
      this.refA4,
      this.inTuneToleranceCents,
      this.currentlyInTune,
      this.exitTuneToleranceCents,
      this.mode,
      this.manualTargetString,
      this.activeTuning.strings
    );

    // 7. Stable vs In-Tune state evaluation
    if (metrics.tuningStatus === 'in_tune') {
      this.consecutiveInTuneFrames++;
      if (this.consecutiveInTuneFrames >= REQUIRED_IN_TUNE_FRAMES) {
        this.currentlyInTune = true;
        this.setState('in_tune');
      } else {
        this.setState('stable_pitch');
      }
    } else {
      this.consecutiveInTuneFrames = 0;
      this.currentlyInTune = false;
      this.setState('stable_pitch');
    }

    this.emitFrame(metrics);
  }

  private emitFrame(metrics: PitchMetrics | null, error?: string) {
    this.onFrame?.({
      state: this.state,
      metrics,
      error,
    });
  }

  private setupLifecycleListeners() {
    // 1. Native Capacitor appStateChange
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app')
        .then(({ App }) => {
          const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) {
              this.wasRunningBeforeBackground = this.isRunning;
              this.pause();
            } else if (this.wasRunningBeforeBackground) {
              this.resume();
            }
          });
          this.appStateListenerRemover = () => {
            listener.then((l) => l.remove()).catch(() => {});
          };
        })
        .catch(() => {});
    }

    // 2. Web document visibilitychange
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.wasRunningBeforeBackground = this.isRunning;
          this.pause();
        } else if (this.wasRunningBeforeBackground) {
          this.resume();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.visibilityListener = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }

  public pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
    }
    this.setState('no_signal');
    this.emitFrame(null);
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.wasRunningBeforeBackground = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.highPassFilter) {
      try {
        this.highPassFilter.disconnect();
      } catch {}
      this.highPassFilter = null;
    }

    if (this.notchFilter50) {
      try {
        this.notchFilter50.disconnect();
      } catch {}
      this.notchFilter50 = null;
    }

    if (this.notchFilter60) {
      try {
        this.notchFilter60.disconnect();
      } catch {}
      this.notchFilter60 = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    stopTunerReferenceAudio();

    this.consecutiveInTuneFrames = 0;
    this.currentlyInTune = false;
    this.setState('initial');
    this.emitFrame(null);
  }

  public destroy() {
    this.stop();
    this.appStateListenerRemover?.();
    this.visibilityListener?.();
    this.onFrame = undefined;
    this.onStateChange = undefined;
  }
}
