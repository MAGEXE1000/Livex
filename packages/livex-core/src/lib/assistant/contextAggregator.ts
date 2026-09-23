import { type MusicalContextSnapshot } from '../../types/assistant';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useChordStore } from '../../store/useChordStore';
import { useDrumStore } from '../../store/useDrumStore';
import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * Aggregates a compact, non-intrusive snapshot of Livex's current musical state.
 * Omits default/empty values to keep transmission payload minimal.
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
    const activeBpm = drumState?.bpm || chordState?.bpm;
    const activeProgression = Array.isArray(chordState?.activeProgression)
      ? chordState.activeProgression
      : Array.isArray(chordState?.chords)
        ? chordState.chords
        : undefined;

    const instrument = settingsState?.instrument || chordState?.instrument || 'guitar';
    const tuning = chordState?.tuning;

    const snapshot: MusicalContextSnapshot = {
      activeApp,
      instrument,
    };

    if (currentSongTitle) snapshot.currentSongTitle = currentSongTitle;
    if (activeKey) snapshot.activeKey = activeKey;
    if (activeBpm && activeBpm !== 120) snapshot.activeBpm = activeBpm;
    if (activeProgression && activeProgression.length > 0) snapshot.activeProgression = activeProgression;
    if (tuning && tuning !== 'E Standard (E A D G B E)') snapshot.tuning = tuning;

    return snapshot;
  } catch (err) {
    return {
      activeApp: 'hub',
      instrument: 'guitar',
    };
  }
}
