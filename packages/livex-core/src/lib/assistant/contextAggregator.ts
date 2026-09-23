import { type MusicalContextSnapshot } from '../../types/assistant';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useChordStore } from '../../store/useChordStore';
import { useDrumStore } from '../../store/useDrumStore';
import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * Aggregates a non-intrusive snapshot of Livex's current musical state.
 * Safely handles null/undefined sub-stores so it never throws.
 */
export function getMusicalContextSnapshot(): MusicalContextSnapshot {
  try {
    const navState = useNavigationStore.getState();
    const activeRoute = navState?.history?.[navState.history.length - 1];
    const activeApp = (activeRoute?.app || 'hub') as MusicalContextSnapshot['activeApp'];

    const chordState = useChordStore.getState?.() as any;
    const drumState = useDrumStore.getState?.() as any;
    const settingsState = useSettingsStore.getState?.() as any;

    const currentSongTitle = chordState?.activeSong?.title || chordState?.currentSong?.title;
    const activeKey = chordState?.selectedKey || chordState?.activeKey || chordState?.key;
    const activeBpm = drumState?.bpm || chordState?.bpm || 120;
    const activeProgression = Array.isArray(chordState?.activeProgression)
      ? chordState.activeProgression
      : Array.isArray(chordState?.chords)
        ? chordState.chords
        : undefined;

    const instrument = settingsState?.instrument || chordState?.instrument || 'guitar';
    const tuning = chordState?.tuning || 'E Standard (E A D G B E)';

    return {
      activeApp,
      currentSongTitle,
      activeKey,
      activeBpm,
      activeProgression,
      instrument,
      tuning,
    };
  } catch (err) {
    console.warn('[LivexAssistant] Context aggregation fallback:', err);
    return {
      activeApp: 'hub',
      instrument: 'guitar',
    };
  }
}
