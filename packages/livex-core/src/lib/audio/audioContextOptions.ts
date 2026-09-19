import { useChordStore } from '../../store/useChordStore';
import { useSettingsStore } from '../../store/useSettingsStore';;

export function getAudioContextOptions(): AudioContextOptions {
  try {
    const s = useSettingsStore.getState().settings;
    return s.lowLatencyMode ? { latencyHint: 'interactive' } : { latencyHint: 'balanced' };
  } catch {
    return {};
  }
}

export function createAudioContext(): AudioContext {
  const AC =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : (globalThis as any).AudioContext;
  return new AC(getAudioContextOptions());
}
