import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaSessionCoordinator, type MediaSessionProvider } from '../mediaSessionCoordinator';

describe('MediaSessionCoordinator', () => {
  let coordinator: MediaSessionCoordinator;
  let mockGroovex: MediaSessionProvider;
  let mockMetronome: MediaSessionProvider;

  beforeEach(() => {
    coordinator = new MediaSessionCoordinator();

    mockGroovex = {
      id: 'groovex',
      getMetadata: vi.fn(() => ({
        title: 'Feel Good Inc.',
        artist: 'Gorillaz',
        album: 'Demon Days',
        duration: 220,
      })),
      getPlaybackState: vi.fn(() => ({
        state: 'playing' as const,
        position: 45,
        duration: 220,
        speed: 1.0,
      })),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onSeekTo: vi.fn(),
      onSkipForward: vi.fn(),
      onSkipBackward: vi.fn(),
      onNext: vi.fn(),
      onPrevious: vi.fn(),
      onStop: vi.fn(),
    };

    mockMetronome = {
      id: 'drumex-metronome',
      getMetadata: vi.fn(() => ({
        title: '120 BPM Metronome',
        artist: 'Drumex Metronome',
        album: '4/4 · Acoustic Woodblock',
      })),
      getPlaybackState: vi.fn(() => ({
        state: 'stopped' as const,
        position: 0,
      })),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onNext: vi.fn(),
      onPrevious: vi.fn(),
    };
  });

  it('should register a provider and set it as active if playing', () => {
    coordinator.registerProvider(mockGroovex);
    expect(coordinator.getActiveProviderId()).toBe('groovex');
  });

  it('should route playback actions to the active provider', () => {
    coordinator.registerProvider(mockGroovex);

    coordinator.handleAction('play');
    expect(mockGroovex.onPlay).toHaveBeenCalledTimes(1);

    coordinator.handleAction('pause');
    expect(mockGroovex.onPause).toHaveBeenCalledTimes(1);

    coordinator.handleAction('seek', 65000); // 65 seconds
    expect(mockGroovex.onSeekTo).toHaveBeenCalledWith(65);

    coordinator.handleAction('skipForward', undefined, 10);
    expect(mockGroovex.onSkipForward).toHaveBeenCalledWith(10);

    coordinator.handleAction('skipBackward', undefined, 10);
    expect(mockGroovex.onSkipBackward).toHaveBeenCalledWith(10);

    coordinator.handleAction('next');
    expect(mockGroovex.onNext).toHaveBeenCalledTimes(1);

    coordinator.handleAction('previous');
    expect(mockGroovex.onPrevious).toHaveBeenCalledTimes(1);

    coordinator.handleAction('stop');
    expect(mockGroovex.onStop).toHaveBeenCalledTimes(1);
  });

  it('should switch active provider when a different provider starts playing', () => {
    coordinator.registerProvider(mockGroovex);
    expect(coordinator.getActiveProviderId()).toBe('groovex');

    coordinator.registerProvider(mockMetronome);
    // GrooveX is still playing
    expect(coordinator.getActiveProviderId()).toBe('groovex');

    // Metronome starts playing
    coordinator.updatePlaybackState('drumex-metronome', {
      state: 'playing',
      position: 0,
    });

    expect(coordinator.getActiveProviderId()).toBe('drumex-metronome');

    // Action now goes to Metronome
    coordinator.handleAction('pause');
    expect(mockMetronome.onPause).toHaveBeenCalledTimes(1);
    expect(mockGroovex.onPause).not.toHaveBeenCalled();
  });

  it('should unregister a provider and reset active provider if it was active', () => {
    coordinator.registerProvider(mockGroovex);
    expect(coordinator.getActiveProviderId()).toBe('groovex');

    coordinator.unregisterProvider('groovex');
    expect(coordinator.getActiveProviderId()).toBeNull();

    // Calling actions when no provider is active should be safe
    expect(() => coordinator.handleAction('play')).not.toThrow();
  });
});
