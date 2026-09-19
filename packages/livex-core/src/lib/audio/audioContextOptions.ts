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
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC(getAudioContextOptions());
}
