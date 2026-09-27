import {
  type MusicalContextSnapshot,
  type DrumexContextSnapshot,
  type SettingsContextSnapshot,
  type HubContextSnapshot,
  type StagexContextSnapshot,
  type GroovexContextSnapshot,
  type VocalexContextSnapshot,
} from '../../types/assistant';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useChordStore } from '../../store/useChordStore';
import { useDrumStore } from '../../store/useDrumStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getAppContext } from './appContextRegistry';

/**
 * Aggregates a compact, non-intrusive snapshot of Livex's current musical state across all apps.
 * Merges core stores (Chordex, Drumex, Settings, Navigation) with registered app providers (Stagex, Groovex, Vocalex).
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

    // Drumex Context
    if (drumState) {
      const activePat = drumState.patterns?.find?.((p: any) => p.id === drumState.activePatternId);
      const drumexSnap: DrumexContextSnapshot = {
        activePatternId: drumState.activePatternId || undefined,
        activePatternName: activePat?.name || undefined,
        bpm: drumState.bpm || activePat?.bpm,
        timeSignature: activePat?.timeSignature || '4/4',
        activeKit: drumState.kitType || 'house',
        activeInstruments: Array.isArray(drumState.activeInstruments)
          ? drumState.activeInstruments.slice(0, 8)
          : undefined,
        patternsCount: drumState.patterns?.length || 0,
      };
      snapshot.drumex = drumexSnap;
    }

    // Settings Context
    const userSettings = settingsState?.settings;
    if (userSettings) {
      const settingsSnap: SettingsContextSnapshot = {
        language: userSettings.language || 'en',
        theme: userSettings.theme || 'dark',
        amoledMode: Boolean(userSettings.amoledMode),
        accentColor: userSettings.accentColor || '#007aff',
        instrument,
      };
      snapshot.settings = settingsSnap;
    }

    // Hub Context from Navigation
    if (navState?.history) {
      const recentApps = Array.from(
        new Set(
          navState.history
            .map((r: any) => r.app)
            .filter((a: string) => Boolean(a) && a !== 'devtools')
        )
      ).slice(-5);

      const registeredHub = getAppContext('hub') as HubContextSnapshot | null;
      snapshot.hub = {
        recentApps,
        pinnedModules: registeredHub?.pinnedModules || ['chordex', 'drumex', 'stagex', 'groovex', 'vocalex'],
      };
    }

    // Registered App Contexts (Stagex, Groovex, Vocalex)
    const stagexContext = getAppContext('stagex') as StagexContextSnapshot | null;
    if (stagexContext) {
      snapshot.stagex = stagexContext;
    }

    const groovexContext = getAppContext('groovex') as GroovexContextSnapshot | null;
    if (groovexContext) {
      snapshot.groovex = groovexContext;
    }

    const vocalexContext = getAppContext('vocalex') as VocalexContextSnapshot | null;
    if (vocalexContext) {
      snapshot.vocalex = vocalexContext;
    }

    return snapshot;
  } catch (err) {
    return {
      activeApp: 'hub',
      instrument: 'guitar',
    };
  }
}
