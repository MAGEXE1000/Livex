import { createAudioContext } from './audioContextOptions';
import { loadAudioSample } from './audioSampleLoader';

export type MetronomeTimeSignature = '4/4' | '3/4' | '6/8' | '2/4' | '5/4' | '7/8' | '9/8' | '12/8';
export type MetronomeSubdivision = '1/4' | '1/8' | '1/16' | '1/32' | '3let' | '6let';
export type MetronomeSoundId =
  | 'woodblock'
  | 'click'
  | 'sidestick'
  | 'drystick'
  | 'studioclick'
  | 'rimclick'
  | 'digital'
  // Legacy aliases retained for backward compatibility with existing user presets
  | 'soft'
  | 'tick'
  | 'shaker'
  | 'claves'
  | 'cowbell'
  | 'rimshot';

export interface MetronomeTempoRampConfig {
  enabled: boolean;
  mode?: 'bars' | 'time'; // Progression mode: 'bars' (by musical bars) or 'time' (by clock duration)
  startBpm: number; // 40 - 280
  targetBpm: number; // 40 - 280
  stepBpm?: number; // BPM increment amount (e.g. 5 BPM, default 5)
  // Progression By Bars
  startDelayBars?: number; // Initial bars before progression starts (default 0)
  intervalBars?: number; // Bars between BPM increments (default 8)
  // Progression By Time
  startDelaySec?: number; // Delay in seconds before ramp begins (e.g. 0 to 600s, default 0s)
  intervalSec?: number; // Interval in seconds between BPM increments (e.g. 15 to 300s, default 30s)
  durationSec?: number; // Optional duration for continuous time ramp (default 120s)
  holdFinalBpm?: boolean; // Whether target BPM persists after ramp completion (default true)
}

export type MetronomeAccentType = 'normal' | 'accent' | 'strong';

export interface MetronomeBeatEvent {
  beatIndex: number;
  subdivisionIndex: number;
  isAccent: boolean;
  accentType: MetronomeAccentType;
  isCountIn: boolean;
  countInNumber?: number; // Beat number during count-in: 1, 2, 3, 4
  countInBar?: number; // 1-indexed bar number during multi-bar count-in: 1, 2, 3
  countInTotalBars?: number; // Total count-in bars configured
  time: number;
  effectiveBpm: number;
  rampProgress?: number; // 0 to 1 if ramp is active, undefined otherwise
}

export interface MetronomeAudioConfig {
  bpm: number;
  timeSignature: MetronomeTimeSignature;
  subdivision: MetronomeSubdivision;
  sound: MetronomeSoundId;
  accentBeat?: number;
  accentPattern?: MetronomeAccentType[];
  volume: number; // 0 to 1
  isMuted: boolean;
  countInEnabled: boolean;
  countInBars: number;
  countInVoiceEnabled?: boolean;
  tempoRamp?: MetronomeTempoRampConfig;
}

const LOOKAHEAD_TIME = 0.12; // 120ms lookahead
const SCHEDULER_TICK_MS = 25; // 25ms timer pump

export function getBeatsPerMeasure(signature: MetronomeTimeSignature): number {
  switch (signature) {
    case '2/4':
      return 2;
    case '3/4':
      return 3;
    case '4/4':
      return 4;
    case '5/4':
      return 5;
    case '6/8':
      return 6;
    case '7/8':
      return 7;
    case '9/8':
      return 9;
    case '12/8':
      return 12;
    default:
      return 4;
  }
}

export function getSubdivisionsPerBeat(subdivision: MetronomeSubdivision): number {
  switch (subdivision) {
    case '1/8':
      return 2;
    case '1/16':
      return 4;
    case '1/32':
      return 8;
    case '3let':
      return 3;
    case '6let':
      return 6;
    case '1/4':
    default:
      return 1;
  }
}

export class MetronomeAudioEngine {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _voiceGain: GainNode | null = null;
  private _timerId: any = null;
  private _rafId: number | null = null;

  // Config
  private _bpm: number = 120;
  private _timeSignature: MetronomeTimeSignature = '4/4';
  private _subdivision: MetronomeSubdivision = '1/16';
  private _sound: MetronomeSoundId = 'woodblock';
  private _accentBeat: number = 0;
  private _accentPattern: MetronomeAccentType[] = ['strong', 'normal', 'normal', 'normal'];
  private _volume: number = 0.85;
  private _isMuted: boolean = false;
  private _countInEnabled: boolean = true;
  private _countInBars: number = 1;
  private _countInVoiceEnabled: boolean = true;
  private _tempoRamp: MetronomeTempoRampConfig | null = null;
  private _mainStartTime: number = 0;

  // Playback state
  private _isPlaying: boolean = false;
  private _inCountIn: boolean = false;
  private _countInTotalBeats: number = 0;
  private _countInCurrentBeat: number = 0; // 0-indexed count-in beat sequence
  private _t0: number = 0;
  private _beatIndexTotal: number = 0;
  private _currentMeasureBeat: number = 0;
  private _measureIndex: number = 0; // Completed measures since playback start
  private _nextBeatTime: number = 0;

  // Queue of scheduled events for visual sync
  private _scheduledEvents: MetronomeBeatEvent[] = [];
  private _lastDispatchedEventTime: number = -1;

  // Sound kit cache (AudioBuffers)
  private _soundBuffers: Map<string, AudioBuffer> = new Map();
  // Voice sample cache (AudioBuffers for numbers 1 to 12)
  private _voiceBuffers: Map<number, AudioBuffer> = new Map();

  // Callbacks
  public onBeat?: (event: MetronomeBeatEvent) => void;
  public onPlayStateChange?: (isPlaying: boolean) => void;

  constructor() {
    // Lazy audio context init on user gesture
  }

  private initAudio() {
    if (!this._ctx || this._ctx.state === 'closed') {
      this._ctx = createAudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.setValueAtTime(this._isMuted ? 0 : this._volume, this._ctx.currentTime);
      this._masterGain.connect(this._ctx.destination);

      // Independent voice channel connected to masterGain
      this._voiceGain = this._ctx.createGain();
      this._voiceGain.gain.setValueAtTime(
        this._countInVoiceEnabled ? 1.0 : 0.0,
        this._ctx.currentTime
      );
      this._voiceGain.connect(this._masterGain);

      this.synthesizeAllSounds();
      if (this._countInVoiceEnabled) {
        this.preloadVoiceBuffers();
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  /**
   * Preloads and decodes high-quality natural female voice count-in AudioBuffers (1-12).
   * Ensures sub-millisecond hardware-accurate scheduling with 0 network latency.
   */
  private async preloadVoiceBuffers() {
    if (!this._ctx || typeof this._ctx.decodeAudioData !== 'function') return;
    const ctx = this._ctx;
    for (let i = 1; i <= 12; i++) {
      if (this._voiceBuffers.has(i)) continue;
      try {
        const buf = await loadAudioSample(ctx, `/audio/metronome/${i}.wav`);
        if (buf) {
          this._voiceBuffers.set(i, buf);
        }
      } catch {
        // Silently continue if decoding is unsupported in test mock
      }
    }
  }

  /**
   * Synthesize clean, professional percussive samples locally into AudioBuffers.
   * Guarantees 0 network latency, consistent loudness, and 0 external dependencies.
   */
  private synthesizeAllSounds() {
    if (!this._ctx) return;
    const sounds: MetronomeSoundId[] = [
      'woodblock',
      'click',
      'sidestick',
      'drystick',
      'studioclick',
      'rimclick',
      'digital',
      'soft',
      'tick',
      'shaker',
      'claves',
      'cowbell',
      'rimshot',
    ];
    for (const s of sounds) {
      this._soundBuffers.set(`${s}-strong`, this.synthesizeBuffer(s, 'strong'));
      this._soundBuffers.set(`${s}-accent`, this.synthesizeBuffer(s, 'accent'));
      this._soundBuffers.set(`${s}-normal`, this.synthesizeBuffer(s, 'normal'));
      this._soundBuffers.set(`${s}-sub`, this.synthesizeBuffer(s, 'normal', true));
    }
    // Dedicated count-in sound
    this._soundBuffers.set('count-in-high', this.synthesizeCountInBuffer(true));
    this._soundBuffers.set('count-in-low', this.synthesizeCountInBuffer(false));
  }

  private synthesizeBuffer(
    sound: MetronomeSoundId,
    accentType: MetronomeAccentType | boolean,
    isSub = false
  ): AudioBuffer {
    const ctx = this._ctx!;
    const sampleRate = ctx.sampleRate;
    const duration =
      sound === 'woodblock' || sound === 'cowbell'
        ? 0.055
        : sound === 'sidestick' || sound === 'rimshot'
          ? 0.048
          : sound === 'rimclick'
            ? 0.04
            : sound === 'claves'
              ? 0.045
              : sound === 'click'
                ? 0.042
                : sound === 'studioclick'
                  ? 0.036
                  : sound === 'shaker'
                    ? 0.035
                    : sound === 'drystick' || sound === 'tick'
                      ? 0.026
                      : 0.035;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const resolvedType: MetronomeAccentType =
      typeof accentType === 'boolean' ? (accentType ? 'strong' : 'normal') : accentType;

    const isStrong = resolvedType === 'strong';
    const isMedAccent = resolvedType === 'accent';
    const gainMult = isSub ? 0.35 : isStrong ? 1.0 : isMedAccent ? 0.84 : 0.68;

    switch (sound) {
      case 'woodblock':
      case 'cowbell': {
        // Dual-resonant cavity wood strike with fast impact transient
        const f1 = isStrong ? 1680 : isMedAccent ? 1360 : 1080;
        const f2 = isStrong ? 2500 : isMedAccent ? 2000 : 1650;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 90);
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 800) * (isStrong ? 0.35 : 0.25);
          const tone =
            Math.sin(2 * Math.PI * f1 * t) * 0.65 + Math.sin(2 * Math.PI * f2 * t) * 0.35;
          data[i] = (tone + noise) * env * gainMult;
        }
        break;
      }
      case 'click': {
        // Crisp acoustic wooden stick transient with sharp attack
        const f1 = isStrong ? 3600 : isMedAccent ? 2900 : 2250;
        const f2 = isStrong ? 5200 : isMedAccent ? 4200 : 3400;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 160);
          const click = (Math.random() * 2 - 1) * Math.exp(-t * 1100) * 0.4;
          const tone =
            Math.sin(2 * Math.PI * f1 * t) * 0.45 + Math.sin(2 * Math.PI * f2 * t) * 0.25;
          data[i] = (tone + click) * env * gainMult * 0.92;
        }
        break;
      }
      case 'sidestick':
      case 'rimshot': {
        // Crisp maple drumstick cross-stick across metal snare rim
        const f1 = isStrong ? 2450 : isMedAccent ? 1950 : 1520;
        const f2 = isStrong ? 3900 : isMedAccent ? 3200 : 2650;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 110);
          const snap = (Math.random() * 2 - 1) * Math.exp(-t * 900) * 0.45;
          const ring =
            Math.sin(2 * Math.PI * f1 * t) * 0.55 + Math.sin(2 * Math.PI * f2 * t) * 0.25;
          data[i] = (ring + snap) * env * gainMult * 0.9;
        }
        break;
      }
      case 'drystick':
      case 'tick': {
        // Ultra-dry, close-mic'd high-velocity hickory drumstick tip strike with zero resonance
        const f1 = isStrong ? 4300 : isMedAccent ? 3400 : 2600;
        const f2 = isStrong ? 7200 : isMedAccent ? 5800 : 4500;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 220);
          const snap = (Math.random() * 2 - 1) * Math.exp(-t * 1600) * 0.45;
          const tone =
            Math.sin(2 * Math.PI * f1 * t) * 0.55 + Math.sin(2 * Math.PI * f2 * t) * 0.25;
          data[i] = (tone + snap) * env * gainMult * 0.95;
        }
        break;
      }
      case 'studioclick': {
        // Reference studio master click: defined low-mid body punch with sharp attack transient
        const f1 = isStrong ? 2850 : isMedAccent ? 2200 : 1650;
        const f2 = isStrong ? 5600 : isMedAccent ? 4400 : 3300;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 140);
          const click = (Math.random() * 2 - 1) * Math.exp(-t * 1200) * 0.4;
          const tone = Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.25;
          data[i] = (tone + click) * env * gainMult * 0.94;
        }
        break;
      }
      case 'rimclick': {
        // Vintage snare hoop rim click: acoustic wood body + focused metallic rim ping
        const f1 = isStrong ? 3200 : isMedAccent ? 2500 : 1900;
        const f2 = isStrong ? 6400 : isMedAccent ? 5200 : 4100;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 120);
          const ping = Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * t) * 0.35;
          const snap = (Math.random() * 2 - 1) * Math.exp(-t * 1000) * 0.35;
          data[i] = (ping + snap) * env * gainMult * 0.92;
        }
        break;
      }
      case 'digital': {
        // Subtle, minimalist electronic click with smooth Hann envelope
        const f = isStrong ? 2800 : isMedAccent ? 2000 : 1350;
        const envDur = 0.024;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          if (t > envDur) {
            data[i] = 0;
            continue;
          }
          const env = Math.sin((Math.PI * t) / envDur);
          data[i] = Math.sin(2 * Math.PI * f * t) * env * gainMult * 0.9;
        }
        break;
      }
      case 'soft': {
        // Warm, rounded non-fatiguing practice click
        const f = isStrong ? 1100 : isMedAccent ? 880 : 640;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const attack = Math.min(1, t / 0.003);
          const decay = Math.exp(-t * 110);
          data[i] = Math.sin(2 * Math.PI * f * t) * attack * decay * gainMult * 0.85;
        }
        break;
      }
      case 'shaker': {
        // Clean acoustic shaker: shaped high-frequency grain burst with tight envelope
        const fCenter = isStrong ? 8500 : isMedAccent ? 7200 : 5800;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 130);
          const noise = (Math.random() * 2 - 1) * 0.7;
          const tone = Math.sin(2 * Math.PI * fCenter * t) * 0.3;
          data[i] = (noise + tone) * env * gainMult * 0.88;
        }
        break;
      }
      case 'claves': {
        // High-density Latin hardwood claves strike: resonant ping with wooden click
        const f1 = isStrong ? 3500 : isMedAccent ? 2950 : 2450;
        const f2 = isStrong ? 6200 : isMedAccent ? 5400 : 4600;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 95);
          const click = (Math.random() * 2 - 1) * Math.exp(-t * 1200) * 0.35;
          const ring =
            Math.sin(2 * Math.PI * f1 * t) * 0.65 + Math.sin(2 * Math.PI * f2 * t) * 0.25;
          data[i] = (ring + click) * env * gainMult * 0.92;
        }
        break;
      }
    }
    return buffer;
  }

  private synthesizeCountInBuffer(isHigh: boolean): AudioBuffer {
    const ctx = this._ctx!;
    const sampleRate = ctx.sampleRate;
    const duration = 0.045;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const f = isHigh ? 2400 : 1600;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 140);
      const tone = Math.sin(2 * Math.PI * f * t);
      data[i] = tone * env * 0.95;
    }
    return buffer;
  }

  // ── Metrics Calculation ──────────────────────────────────────────────────

  public getBeatsPerMeasure(): number {
    return getBeatsPerMeasure(this._timeSignature);
  }

  public getSubdivisionsPerBeat(): number {
    return getSubdivisionsPerBeat(this._subdivision);
  }

  public getBeatInterval(): number {
    return 60 / this._bpm;
  }

  /**
   * Computes the exact instantaneous BPM on the audio timeline.
   * Progression Modes:
   * 1. By Bars: Evaluated strictly at bar boundaries (measure index). Increases by stepBpm every intervalBars.
   * 2. By Time: Evaluated on monotonic audio clock. Increases by stepBpm every intervalSec or continuous duration ramp.
   */
  public computeEffectiveBpm(time: number, measureIndex?: number): number {
    if (!this._tempoRamp || !this._tempoRamp.enabled) {
      return this._bpm;
    }

    if (this._inCountIn || this._mainStartTime <= 0) {
      return this._tempoRamp.startBpm;
    }

    const mode =
      this._tempoRamp.mode ||
      (this._tempoRamp.intervalBars
        ? 'bars'
        : this._tempoRamp.durationSec || this._tempoRamp.intervalSec
          ? 'time'
          : 'bars');
    const startBpm = this._tempoRamp.startBpm;
    const targetBpm = this._tempoRamp.targetBpm;
    const isAscending = targetBpm >= startBpm;
    const step = Math.max(1, this._tempoRamp.stepBpm ?? 5);

    if (mode === 'bars') {
      const curMeasure = measureIndex !== undefined ? measureIndex : this._measureIndex;
      const startDelay = Math.max(0, this._tempoRamp.startDelayBars ?? 0);
      if (curMeasure < startDelay) {
        return startBpm;
      }
      const effectiveBars = curMeasure - startDelay;
      const intervalBars = Math.max(1, this._tempoRamp.intervalBars ?? 8);
      const stepsCount = Math.floor(effectiveBars / intervalBars);
      const computed = isAscending ? startBpm + stepsCount * step : startBpm - stepsCount * step;

      if (isAscending) {
        if (computed >= targetBpm) {
          return this._tempoRamp.holdFinalBpm !== false ? targetBpm : startBpm;
        }
        return Math.max(40, Math.min(280, computed));
      } else {
        if (computed <= targetBpm) {
          return this._tempoRamp.holdFinalBpm !== false ? targetBpm : startBpm;
        }
        return Math.max(40, Math.min(280, computed));
      }
    } else {
      // By Time mode
      const elapsed = Math.max(0, time - this._mainStartTime);
      const delay = Math.max(0, this._tempoRamp.startDelaySec ?? 0);
      if (elapsed < delay) {
        return startBpm;
      }
      const rampElapsed = elapsed - delay;
      const intervalSec = this._tempoRamp.intervalSec;

      if (intervalSec && intervalSec > 0 && !this._tempoRamp.durationSec) {
        const stepsCount = Math.floor(rampElapsed / intervalSec);
        const computed = isAscending ? startBpm + stepsCount * step : startBpm - stepsCount * step;
        if (isAscending) {
          if (computed >= targetBpm) {
            return this._tempoRamp.holdFinalBpm !== false ? targetBpm : startBpm;
          }
          return Math.max(40, Math.min(280, computed));
        } else {
          if (computed <= targetBpm) {
            return this._tempoRamp.holdFinalBpm !== false ? targetBpm : startBpm;
          }
          return Math.max(40, Math.min(280, computed));
        }
      } else {
        // Continuous duration interpolation fallback
        const duration = Math.max(1, this._tempoRamp.durationSec ?? 120);
        if (rampElapsed >= duration) {
          return this._tempoRamp.holdFinalBpm !== false ? targetBpm : startBpm;
        }
        const progress = rampElapsed / duration;
        const interpolated = startBpm + progress * (targetBpm - startBpm);
        return Math.max(40, Math.min(280, interpolated));
      }
    }
  }

  public computeRampProgress(time: number, measureIndex?: number): number | undefined {
    if (
      !this._tempoRamp ||
      !this._tempoRamp.enabled ||
      this._inCountIn ||
      this._mainStartTime <= 0
    ) {
      return undefined;
    }
    const current = this.computeEffectiveBpm(time, measureIndex);
    const start = this._tempoRamp.startBpm;
    const target = this._tempoRamp.targetBpm;
    if (start === target) return 1;
    const progress = (current - start) / (target - start);
    return Math.max(0, Math.min(1, progress));
  }

  // ── Playback Controls ────────────────────────────────────────────────────

  public start() {
    this.initAudio();
    if (!this._ctx) return;
    if (this._voiceGain) {
      this._voiceGain.gain.setValueAtTime(
        this._countInVoiceEnabled ? 1.0 : 0.0,
        this._ctx.currentTime
      );
    }

    this.stop();
    this._isPlaying = true;
    this._scheduledEvents = [];
    this._lastDispatchedEventTime = -1;
    this._measureIndex = 0;

    const beatsPerBar = this.getBeatsPerMeasure();
    if (this._countInEnabled && this._countInBars > 0) {
      this._inCountIn = true;
      this._countInTotalBeats = beatsPerBar * Math.max(1, this._countInBars);
      this._countInCurrentBeat = 0;
      this._mainStartTime = 0;
    } else {
      this._inCountIn = false;
      this._countInTotalBeats = 0;
      this._countInCurrentBeat = 0;
      this._mainStartTime = this._ctx.currentTime + 0.05;
    }

    // Lead-time: 50ms into the future for rock-solid start
    this._t0 = this._ctx.currentTime + 0.05;
    this._beatIndexTotal = 0;
    this._currentMeasureBeat = 0;
    this._nextBeatTime = this._t0;

    this.scheduleLookahead();
    this._timerId = setInterval(() => this.scheduleLookahead(), SCHEDULER_TICK_MS);
    this.startVisualSyncLoop();

    this.onPlayStateChange?.(true);
  }

  public stop() {
    this._isPlaying = false;
    this._inCountIn = false;
    this._countInTotalBeats = 0;
    this._countInCurrentBeat = 0;

    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._scheduledEvents = [];
    this.onPlayStateChange?.(false);
  }

  public togglePlay() {
    if (this._isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  // ── Authoritative Web Audio Lookahead Scheduler ──────────────────────────

  private scheduleLookahead() {
    if (!this._isPlaying || !this._ctx || !this._masterGain) return;

    const currentTime = this._ctx.currentTime;
    const windowEnd = currentTime + LOOKAHEAD_TIME;
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const subsPerBeat = this.getSubdivisionsPerBeat();

    while (this._nextBeatTime < windowEnd) {
      const beatTime = this._nextBeatTime;
      const isCountIn = this._inCountIn;

      let isAccent = false;
      let accentType: MetronomeAccentType = 'normal';
      let countInNumber: number | undefined = undefined;
      let countInBar: number | undefined = undefined;
      let countInTotalBars: number | undefined = undefined;

      if (isCountIn) {
        const beatInBar = (this._countInCurrentBeat % beatsPerMeasure) + 1;
        const currentBar = Math.floor(this._countInCurrentBeat / beatsPerMeasure) + 1;
        countInNumber = beatInBar;
        countInBar = currentBar;
        countInTotalBars = this._countInBars;
        const isHigh = beatInBar === 1;
        accentType = isHigh ? 'strong' : 'normal';
        isAccent = isHigh;

        // 1. Schedule count-in click (high pitch on Beat 1 of each bar)
        this.scheduleAudioPulse(beatTime, accentType, false, true, isHigh);

        // 2. Schedule spoken voice count-in if enabled
        if (this._countInVoiceEnabled) {
          this.scheduleVoicePulse(beatTime, beatInBar);
        }
      } else {
        accentType = this._accentPattern[this._currentMeasureBeat] || 'normal';
        isAccent = accentType !== 'normal';
        this.scheduleAudioPulse(beatTime, accentType, false, false, false);
      }

      const currentBpm = this.computeEffectiveBpm(beatTime, this._measureIndex);
      const beatInterval = 60 / currentBpm;
      const subInterval = beatInterval / subsPerBeat;
      const rampProgress = this.computeRampProgress(beatTime, this._measureIndex);

      // Record in queue for visual UI
      this._scheduledEvents.push({
        beatIndex: isCountIn ? countInNumber! - 1 : this._currentMeasureBeat,
        subdivisionIndex: 0,
        isAccent,
        accentType,
        isCountIn,
        countInNumber,
        countInBar,
        countInTotalBars,
        time: beatTime,
        effectiveBpm: Math.round(currentBpm),
        rampProgress,
      });

      // 2. Schedule intermediate subdivisions (if not in count-in)
      if (!isCountIn && subsPerBeat > 1) {
        for (let subIdx = 1; subIdx < subsPerBeat; subIdx++) {
          const subTime = beatTime + subIdx * subInterval;
          this.scheduleAudioPulse(subTime, 'normal', true, false, false);
          this._scheduledEvents.push({
            beatIndex: this._currentMeasureBeat,
            subdivisionIndex: subIdx,
            isAccent: false,
            accentType: 'normal',
            isCountIn: false,
            time: subTime,
            effectiveBpm: Math.round(currentBpm),
            rampProgress,
          });
        }
      }

      // 3. Advance to next beat
      this._beatIndexTotal++;
      if (!isCountIn) {
        const prevMeasureBeat = this._currentMeasureBeat;
        this._currentMeasureBeat = (this._currentMeasureBeat + 1) % beatsPerMeasure;
        if (prevMeasureBeat === beatsPerMeasure - 1) {
          this._measureIndex++;
        }
      }

      // When tempo is variable, each beat advances by its instantaneous beat interval
      this._nextBeatTime = beatTime + beatInterval;

      // Handle count-in countdown
      if (this._inCountIn) {
        this._countInCurrentBeat++;
        if (this._countInCurrentBeat >= this._countInTotalBeats) {
          this._inCountIn = false;
          // Synchronize main metronome to start right on the next measure boundary
          this._currentMeasureBeat = 0;
          this._measureIndex = 0;
          this._t0 = this._nextBeatTime;
          this._beatIndexTotal = 0;
          this._mainStartTime = this._nextBeatTime;
        }
      }
    }

    // Prune events that are older than 300ms from queue
    const pruneThreshold = currentTime - 0.3;
    if (this._scheduledEvents.length > 50) {
      this._scheduledEvents = this._scheduledEvents.filter((e) => e.time >= pruneThreshold);
    }
  }

  private scheduleVoicePulse(time: number, countNumber: number) {
    if (!this._countInVoiceEnabled || !this._ctx || !this._voiceGain) return;
    const buf = this._voiceBuffers.get(countNumber);
    if (!buf) return;

    const source = this._ctx.createBufferSource();
    source.buffer = buf;
    source.connect(this._voiceGain);

    const safeTime = Math.max(time, this._ctx.currentTime + 0.002);
    source.start(safeTime);
  }

  public playVoicePreview(count: number = 1) {
    this.initAudio();
    if (!this._ctx) return;
    const buf = this._voiceBuffers.get(count);
    if (!buf) return;

    const source = this._ctx.createBufferSource();
    source.buffer = buf;
    source.connect(this._masterGain || this._ctx.destination);
    source.start(this._ctx.currentTime);
  }

  private scheduleAudioPulse(
    time: number,
    accentType: MetronomeAccentType | boolean,
    isSub: boolean,
    isCountIn: boolean,
    countInHigh: boolean
  ) {
    if (!this._ctx || !this._masterGain) return;

    let bufferKey: string;
    if (isCountIn) {
      bufferKey = countInHigh ? 'count-in-high' : 'count-in-low';
    } else if (isSub) {
      bufferKey = `${this._sound}-sub`;
    } else {
      const resolvedType: MetronomeAccentType =
        typeof accentType === 'boolean' ? (accentType ? 'strong' : 'normal') : accentType;
      bufferKey = `${this._sound}-${resolvedType}`;
    }

    let buffer = this._soundBuffers.get(bufferKey);
    if (!buffer) {
      buffer = this.synthesizeBuffer(this._sound, accentType, isSub);
      this._soundBuffers.set(bufferKey, buffer);
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this._masterGain);

    const safeTime = Math.max(time, this._ctx.currentTime + 0.002);
    source.start(safeTime);

    // Auto-clean: AudioBufferSourceNode is automatically garbage collected once ended
  }

  // ── Visual UI Synchronization Loop (rAF) ─────────────────────────────────

  private startVisualSyncLoop() {
    const loop = () => {
      if (!this._isPlaying) return;

      if (this._ctx) {
        const now = this._ctx.currentTime;
        // Find the latest scheduled event that has started playing
        let latestEvent: MetronomeBeatEvent | null = null;
        for (let i = 0; i < this._scheduledEvents.length; i++) {
          const ev = this._scheduledEvents[i];
          if (ev.time <= now) {
            latestEvent = ev;
          } else {
            break;
          }
        }

        if (latestEvent && latestEvent.time > this._lastDispatchedEventTime) {
          this._lastDispatchedEventTime = latestEvent.time;
          this.onBeat?.(latestEvent);
        }
      }

      this._rafId = requestAnimationFrame(loop);
    };

    this._rafId = requestAnimationFrame(loop);
  }

  // ── Dynamic Property Setters ─────────────────────────────────────────────

  public setBpm(newBpm: number) {
    const clamped = Math.max(40, Math.min(280, Math.round(newBpm)));
    if (this._bpm === clamped) return;

    if (this._isPlaying && this._ctx) {
      // Re-anchor timeline smoothly without stutter or beat jumps
      const now = this._ctx.currentTime;
      this._t0 = Math.max(this._nextBeatTime, now + 0.01);
      this._beatIndexTotal = 0;
      this._nextBeatTime = this._t0;
    }
    this._bpm = clamped;
  }

  public setTimeSignature(sig: MetronomeTimeSignature) {
    if (this._timeSignature === sig) return;
    this._timeSignature = sig;
    const newBeatsCount = this.getBeatsPerMeasure();
    const maxBeat = newBeatsCount - 1;

    if (this._accentBeat > maxBeat) {
      this._accentBeat = 0;
      const newPattern: MetronomeAccentType[] = Array(newBeatsCount).fill('normal');
      newPattern[0] = 'strong';
      this._accentPattern = newPattern;
    } else if (this._accentBeat === -1) {
      this._accentPattern = Array(newBeatsCount).fill('normal');
    } else {
      const newPattern: MetronomeAccentType[] = [];
      for (let i = 0; i < newBeatsCount; i++) {
        newPattern.push(this._accentPattern[i] || (i === this._accentBeat ? 'strong' : 'normal'));
      }
      if (newPattern[this._accentBeat] === 'normal') {
        newPattern[this._accentBeat] = 'strong';
      }
      this._accentPattern = newPattern;
      this._accentBeat = this._accentPattern.findIndex((t) => t !== 'normal');
    }

    if (this._isPlaying && this._ctx) {
      const now = this._ctx.currentTime;
      this._t0 = Math.max(this._nextBeatTime, now + 0.01);
      this._beatIndexTotal = 0;
      this._currentMeasureBeat = 0;
      this._nextBeatTime = this._t0;
    }
  }

  public setAccentBeat(beatIndex: number) {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    if (beatIndex < 0) {
      this._accentBeat = -1;
      this._accentPattern = Array(beatsPerMeasure).fill('normal');
      return;
    }
    const maxBeat = beatsPerMeasure - 1;
    const clamped = Math.max(0, Math.min(maxBeat, Math.round(beatIndex)));
    this._accentBeat = clamped;
    const pattern: MetronomeAccentType[] = Array(beatsPerMeasure).fill('normal');
    pattern[clamped] = 'strong';
    this._accentPattern = pattern;
  }

  public get accentBeat(): number {
    return this._accentBeat;
  }

  public get accentPattern(): MetronomeAccentType[] {
    return [...this._accentPattern];
  }

  public setAccentPattern(pattern: MetronomeAccentType[]) {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const newPattern: MetronomeAccentType[] = [];
    for (let i = 0; i < beatsPerMeasure; i++) {
      const val = pattern[i];
      if (val === 'strong' || val === 'accent' || val === 'normal') {
        newPattern.push(val);
      } else {
        newPattern.push(i === 0 ? 'strong' : 'normal');
      }
    }
    this._accentPattern = newPattern;
    this._accentBeat = this._accentPattern.findIndex((t) => t !== 'normal');
  }

  public setBeatAccent(beatIndex: number, type: MetronomeAccentType) {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    if (beatIndex < 0 || beatIndex >= beatsPerMeasure) return;
    this._accentPattern[beatIndex] = type;
    this._accentBeat = this._accentPattern.findIndex((t) => t !== 'normal');
  }

  public setSubdivision(sub: MetronomeSubdivision) {
    this._subdivision = sub;
  }

  public setSound(sound: MetronomeSoundId) {
    this._sound = sound;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this._volume = clamped;
    if (this._masterGain && this._ctx) {
      const t = this._ctx.currentTime;
      this._masterGain.gain.cancelScheduledValues(t);
      this._masterGain.gain.linearRampToValueAtTime(this._isMuted ? 0 : clamped, t + 0.015);
    }
  }

  public setMuted(muted: boolean) {
    this._isMuted = muted;
    if (this._masterGain && this._ctx) {
      const t = this._ctx.currentTime;
      this._masterGain.gain.cancelScheduledValues(t);
      this._masterGain.gain.linearRampToValueAtTime(muted ? 0 : this._volume, t + 0.015);
    }
  }

  public setCountIn(
    enabled: boolean,
    bars: number = 1,
    voiceEnabled: boolean = this._countInVoiceEnabled
  ) {
    this._countInEnabled = enabled && bars > 0;
    this._countInBars = Math.max(0, Math.min(3, bars));
    this._countInVoiceEnabled = Boolean(voiceEnabled);
    if (this._voiceGain && this._ctx) {
      this._voiceGain.gain.setValueAtTime(
        this._countInVoiceEnabled ? 1.0 : 0.0,
        this._ctx.currentTime
      );
    }
    if (this._countInVoiceEnabled && this._countInEnabled) {
      this.preloadVoiceBuffers();
    }
  }

  public setVoiceCountIn(enabled: boolean) {
    this._countInVoiceEnabled = Boolean(enabled);
    if (this._voiceGain && this._ctx) {
      this._voiceGain.gain.setValueAtTime(
        this._countInVoiceEnabled ? 1.0 : 0.0,
        this._ctx.currentTime
      );
    }
    if (this._countInVoiceEnabled) {
      this.preloadVoiceBuffers();
    }
  }

  public setTempoRamp(config: MetronomeTempoRampConfig | null) {
    if (!config || !config.enabled) {
      if (this._tempoRamp?.enabled && this._isPlaying && this._ctx) {
        // Disabling an active ramp mid-flight!
        // Preserve current playback, return control to normal BPM behavior, avoid restarting audio engine
        const now = this._ctx.currentTime;
        const currentBpm = Math.round(this.computeEffectiveBpm(now, this._measureIndex));
        this._bpm = currentBpm;
        this._t0 = Math.max(this._nextBeatTime, now + 0.01);
        this._beatIndexTotal = 0;
        this._nextBeatTime = this._t0;
      }
      this._tempoRamp = config ? { ...config, enabled: false } : null;
      return;
    }

    const detectedMode =
      config.mode ??
      (config.intervalBars !== undefined || config.startDelayBars !== undefined
        ? 'bars'
        : config.durationSec !== undefined || config.intervalSec !== undefined
          ? 'time'
          : 'bars');

    const clampedConfig: MetronomeTempoRampConfig = {
      enabled: true,
      mode: detectedMode,
      startBpm: Math.max(40, Math.min(280, Math.round(config.startBpm))),
      targetBpm: Math.max(40, Math.min(280, Math.round(config.targetBpm))),
      stepBpm: Math.max(1, Math.min(50, Math.round(config.stepBpm ?? 5))),
      startDelayBars: Math.max(0, Math.min(200, Math.round(config.startDelayBars ?? 0))),
      intervalBars: Math.max(1, Math.min(100, Math.round(config.intervalBars ?? 8))),
      startDelaySec: Math.max(0, Math.min(600, Math.round(config.startDelaySec ?? 0))),
      intervalSec: config.intervalSec
        ? Math.max(1, Math.min(600, Math.round(config.intervalSec)))
        : 30,
      durationSec: config.durationSec
        ? Math.max(5, Math.min(1200, Math.round(config.durationSec)))
        : undefined,
      holdFinalBpm: config.holdFinalBpm ?? true,
    };

    this._tempoRamp = clampedConfig;

    if (this._isPlaying && this._ctx) {
      const now = this._ctx.currentTime;
      this._mainStartTime = now;
      this._t0 = Math.max(this._nextBeatTime, now + 0.01);
      this._beatIndexTotal = 0;
      this._measureIndex = 0;
      this._nextBeatTime = this._t0;
    } else {
      this._bpm = clampedConfig.startBpm;
    }
  }

  public get tempoRamp(): MetronomeTempoRampConfig | null {
    return this._tempoRamp;
  }

  public getEffectiveBpm(time?: number, measureIndex?: number): number {
    if (time !== undefined) {
      return Math.round(this.computeEffectiveBpm(time, measureIndex));
    }
    if (!this._ctx) return this._tempoRamp?.enabled ? this._tempoRamp.startBpm : this._bpm;
    return Math.round(this.computeEffectiveBpm(this._ctx.currentTime, measureIndex));
  }

  // ── Cleanup & Teardown ───────────────────────────────────────────────────

  public dispose() {
    this.stop();
    if (this._voiceGain) {
      try {
        this._voiceGain.disconnect();
      } catch {}
      this._voiceGain = null;
    }
    if (this._masterGain) {
      try {
        this._masterGain.disconnect();
      } catch {}
      this._masterGain = null;
    }
    if (this._ctx && this._ctx.state !== 'closed') {
      try {
        this._ctx.close();
      } catch {}
      this._ctx = null;
    }
    this._soundBuffers.clear();
    this._voiceBuffers.clear();
    this._scheduledEvents = [];
  }

  // Getters
  public get isPlaying(): boolean {
    return this._isPlaying;
  }
  public get bpm(): number {
    return this._bpm;
  }
  public get timeSignature(): MetronomeTimeSignature {
    return this._timeSignature;
  }
  public get subdivision(): MetronomeSubdivision {
    return this._subdivision;
  }
  public get sound(): MetronomeSoundId {
    return this._sound;
  }
  public get volume(): number {
    return this._volume;
  }
  public get isMuted(): boolean {
    return this._isMuted;
  }
  public get countInEnabled(): boolean {
    return this._countInEnabled;
  }
  public get countInBars(): number {
    return this._countInBars;
  }
  public get countInVoiceEnabled(): boolean {
    return this._countInVoiceEnabled;
  }
}

// Global shared instance
export const metronomeAudioEngine = new MetronomeAudioEngine();
