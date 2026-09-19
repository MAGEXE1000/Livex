import type { Instrument } from '../../data/chords';
import { instrumentPlatform, type InstrumentStatus } from './instrumentPlatform';
import { playRecordedSaxophoneSample, stopAllSaxophoneSamples } from '../audio/saxophoneSampleAudio';

export type { InstrumentStatus };

export interface InstrumentConfig {
  id: Instrument;
  name: string;
  subtitle: string;
  status: InstrumentStatus;
  icon: string;
  badge?: string;
  navTabs: string[];
  defaultTab: string;
}

export const INSTRUMENT_REGISTRY: Record<Instrument, InstrumentConfig> = {
  guitar: {
    id: 'guitar',
    name: 'Guitar',
    subtitle: 'Acoustic & Electric 6-String',
    status: 'active',
    icon: 'music_note',
    navTabs: ['songs', 'library', 'settings'],
    defaultTab: 'songs',
  },
  saxophone: {
    id: 'saxophone',
    name: 'Saxophone',
    subtitle: 'Alto, Tenor & Baritone Fingering Chart',
    status: 'active',
    badge: 'NEW',
    icon: 'graphic_eq',
    navTabs: ['practice', 'library', 'settings'],
    defaultTab: 'practice',
  },
  piano: {
    id: 'piano',
    name: 'Piano',
    subtitle: '88-Key Grand & Electric Keyboard',
    status: 'coming_soon',
    badge: 'SOON',
    icon: 'piano',
    navTabs: ['songs', 'library', 'settings'],
    defaultTab: 'songs',
  },
  bass: {
    id: 'bass',
    name: 'Bass',
    subtitle: '4-String & 5-String Bass Guitar',
    status: 'coming_soon',
    badge: 'SOON',
    icon: 'piano_off',
    navTabs: ['songs', 'library', 'settings'],
    defaultTab: 'songs',
  },
};

// Register Saxophone in Platform Manager
instrumentPlatform.register({
  metadata: INSTRUMENT_REGISTRY.saxophone,
  navigation: {
    tabs: [
      { id: 'practice', labelKey: 'practice', icon: 'graphic_eq' },
      { id: 'library', labelKey: 'library', icon: 'library' },
      { id: 'settings', labelKey: 'settings', icon: 'settings' },
    ],
    defaultTab: 'practice',
  },
  audio: {
    playNote: (opt) =>
      playRecordedSaxophoneSample({
        writtenNote: opt.note,
        variant: opt.variant as any,
        duration: opt.duration,
        gain: opt.gain,
      }),
    stopAll: () => stopAllSaxophoneSamples(),
  },
});

export function getInstrumentConfig(inst: Instrument): InstrumentConfig {
  return INSTRUMENT_REGISTRY[inst] || INSTRUMENT_REGISTRY.guitar;
}

export function getNavTabsForInstrument(inst: Instrument): string[] {
  return instrumentPlatform.getNavTabs(inst);
}
