import { Capacitor, registerPlugin } from '@capacitor/core';

export interface MediaSessionMetadata {
  title: string;
  artist: string;
  album?: string;
  duration?: number; // duration in seconds
  artworkUrl?: string;
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'none';

export interface MediaPlaybackState {
  state: PlaybackStatus;
  position?: number; // position in seconds
  duration?: number; // duration in seconds
  speed?: number;
}

export interface MediaSessionProvider {
  id: 'groovex' | 'drumex-beats' | 'drumex-metronome' | string;
  getMetadata: () => MediaSessionMetadata;
  getPlaybackState: () => MediaPlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onSeekTo?: (positionSeconds: number) => void;
  onSkipForward?: (seconds: number) => void;
  onSkipBackward?: (seconds: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onStop?: () => void;
}

interface NativeMediaSessionPlugin {
  updateMetadata(options: {
    title: string;
    artist: string;
    album?: string;
    duration: number; // ms
    artworkUrl?: string;
  }): Promise<void>;

  updatePlaybackState(options: {
    state: string;
    position: number; // ms
    speed: number;
  }): Promise<void>;

  stopSession(): Promise<void>;

  addListener(
    eventName: 'mediaAction',
    listenerFunc: (event: { action: string; position?: number; seconds?: number }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

let nativePlugin: NativeMediaSessionPlugin | null = null;

function getNativePlugin(): NativeMediaSessionPlugin | null {
  if (nativePlugin) return nativePlugin;
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      nativePlugin = registerPlugin<NativeMediaSessionPlugin>('NativeMediaSession');
    } catch (e) {
      console.warn('[MediaSessionCoordinator] Failed to register NativeMediaSession plugin:', e);
    }
  }
  return nativePlugin;
}

export class MediaSessionCoordinator {
  private providers = new Map<string, MediaSessionProvider>();
  private activeProviderId: string | null = null;
  private nativeListenerAttached = false;
  private nativeListenerHandle: { remove: () => Promise<void> } | null = null;
  private lastReportedState: PlaybackStatus = 'none';
  private lastReportedPosition = -1;
  private lastReportedTime = 0;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    // Attach native Capacitor listener if on native platform
    const native = getNativePlugin();
    if (native && !this.nativeListenerAttached) {
      this.nativeListenerAttached = true;
      native
        .addListener('mediaAction', (event) => {
          this.handleAction(event.action, event.position, event.seconds);
        })
        .then((handle) => {
          this.nativeListenerHandle = handle;
        })
        .catch((err) => {
          console.warn('[MediaSessionCoordinator] Error attaching native listener:', err);
          this.nativeListenerAttached = false;
        });
    }

    // Attach standard W3C navigator.mediaSession action handlers
    this.initWebActionHandlers();
  }

  private initWebActionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.handleAction('play'));
      navigator.mediaSession.setActionHandler('pause', () => this.handleAction('pause'));
      navigator.mediaSession.setActionHandler('stop', () => this.handleAction('stop'));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.handleAction('previous'));
      navigator.mediaSession.setActionHandler('nexttrack', () => this.handleAction('next'));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.handleAction('seek', details.seekTime * 1000);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        this.handleAction('skipForward', undefined, details.seekOffset || 10);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.handleAction('skipBackward', undefined, details.seekOffset || 10);
      });
    } catch (e) {
      console.warn('[MediaSessionCoordinator] Failed to bind W3C mediaSession handlers:', e);
    }
  }

  public registerProvider(provider: MediaSessionProvider) {
    this.providers.set(provider.id, provider);
    // If no provider is active, or new provider is starting, set it as active
    if (!this.activeProviderId || provider.getPlaybackState().state === 'playing') {
      this.setActiveProvider(provider.id);
    }
  }

  public unregisterProvider(id: string) {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      this.activeProviderId = null;
      this.stopSession();
    }
  }

  public setActiveProvider(id: string) {
    if (!this.providers.has(id)) return;
    this.activeProviderId = id;
    const provider = this.providers.get(id)!;
    this.syncMetadata(provider.getMetadata());
    this.syncPlaybackState(provider.getPlaybackState());
  }

  public getActiveProviderId(): string | null {
    return this.activeProviderId;
  }

  public updateMetadata(id: string, metadata: MediaSessionMetadata) {
    if (id !== this.activeProviderId && this.activeProviderId !== null) return;
    this.syncMetadata(metadata);
  }

  public updatePlaybackState(id: string, state: MediaPlaybackState) {
    // If this provider is playing and wasn't active, activate it
    if (state.state === 'playing' && this.activeProviderId !== id && this.providers.has(id)) {
      this.setActiveProvider(id);
      return;
    }

    if (id !== this.activeProviderId) return;

    // Rate-limit position updates when playing to avoid saturating native bridge
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pos = state.position ?? 0;
    const isStateTransition = state.state !== this.lastReportedState;
    const isBigJump = Math.abs(pos - this.lastReportedPosition) > 1.5;
    const isIntervalElapsed = now - this.lastReportedTime > 4000;

    if (isStateTransition || isBigJump || isIntervalElapsed || state.state !== 'playing') {
      this.lastReportedState = state.state;
      this.lastReportedPosition = pos;
      this.lastReportedTime = now;
      this.syncPlaybackState(state);
    }
  }

  public stopSession(id?: string) {
    if (id && id !== this.activeProviderId) return;

    this.lastReportedState = 'stopped';
    const native = getNativePlugin();
    if (native) {
      native.stopSession().catch(() => {});
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
  }

  private syncMetadata(metadata: MediaSessionMetadata) {
    const durationMs = Math.round((metadata.duration ?? 0) * 1000);

    // 1. Native Android MediaSession
    const native = getNativePlugin();
    if (native) {
      native
        .updateMetadata({
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album || '',
          duration: durationMs,
          artworkUrl: metadata.artworkUrl,
        })
        .catch((e) => console.warn('[MediaSessionCoordinator] Native updateMetadata error:', e));
    }

    // 2. W3C MediaSession API
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      typeof MediaMetadata !== 'undefined'
    ) {
      try {
        const artwork: MediaImage[] = [];
        if (metadata.artworkUrl) {
          artwork.push({
            src: metadata.artworkUrl,
            sizes: '512x512',
            type: 'image/png',
          });
        }
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album || '',
          artwork: artwork.length > 0 ? artwork : undefined,
        });
      } catch (e) {
        console.warn('[MediaSessionCoordinator] W3C metadata error:', e);
      }
    }
  }

  private syncPlaybackState(state: MediaPlaybackState) {
    const positionMs = Math.round((state.position ?? 0) * 1000);
    const speed = state.speed ?? 1.0;

    // 1. Native Android MediaSession
    const native = getNativePlugin();
    if (native) {
      native
        .updatePlaybackState({
          state: state.state,
          position: positionMs,
          speed,
        })
        .catch((e) =>
          console.warn('[MediaSessionCoordinator] Native updatePlaybackState error:', e)
        );
    }

    // 2. W3C MediaSession API
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState =
          state.state === 'playing' ? 'playing' : state.state === 'paused' ? 'paused' : 'none';

        if (state.duration && 'setPositionState' in navigator.mediaSession) {
          const clampedPos = Math.max(0, Math.min(state.duration, state.position ?? 0));
          navigator.mediaSession.setPositionState({
            duration: state.duration,
            playbackRate: speed,
            position: clampedPos,
          });
        }
      } catch (e) {
        // Some browsers may reject setPositionState if duration is not positive
      }
    }
  }

  public handleAction(action: string, positionMs?: number, seconds?: number) {
    if (!this.activeProviderId) return;
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) return;

    switch (action) {
      case 'play':
        provider.onPlay();
        break;
      case 'pause':
        provider.onPause();
        break;
      case 'seek':
        if (positionMs !== undefined) {
          const targetSeconds = positionMs / 1000;
          provider.onSeekTo?.(targetSeconds);
        }
        break;
      case 'skipForward': {
        const sec = seconds ?? 10;
        if (provider.onSkipForward) {
          provider.onSkipForward(sec);
        } else if (provider.onSeekTo) {
          const currentPos = provider.getPlaybackState().position ?? 0;
          provider.onSeekTo(currentPos + sec);
        }
        break;
      }
      case 'skipBackward': {
        const sec = seconds ?? 10;
        if (provider.onSkipBackward) {
          provider.onSkipBackward(sec);
        } else if (provider.onSeekTo) {
          const currentPos = provider.getPlaybackState().position ?? 0;
          provider.onSeekTo(Math.max(0, currentPos - sec));
        }
        break;
      }
      case 'next':
        provider.onNext?.();
        break;
      case 'previous':
        provider.onPrevious?.();
        break;
      case 'stop':
        if (provider.onStop) {
          provider.onStop();
        } else {
          provider.onPause();
        }
        this.stopSession();
        break;
      default:
        console.warn('[MediaSessionCoordinator] Unknown media action:', action);
    }
  }
}

export const mediaSessionCoordinator = new MediaSessionCoordinator();
