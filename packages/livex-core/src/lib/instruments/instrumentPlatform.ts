import type { Instrument } from '../../data/chords';

export type InstrumentStatus = 'active' | 'coming_soon';

export interface InstrumentMetadata {
  id: Instrument;
  name: string;
  subtitle: string;
  status: InstrumentStatus;
  icon: string;
  badge?: string;
  defaultTab: string;
}

export interface InstrumentNavigationConfig {
  tabs: { id: string; labelKey: string; icon: string }[];
  defaultTab: string;
}

export interface InstrumentAudioOptions {
  note: string;
  variant?: string;
  duration?: number;
  gain?: number;
}

export interface InstrumentAudioProvider {
  playNote: (options: InstrumentAudioOptions) => () => void;
  stopAll: () => void;
  preload?: () => Promise<void>;
}

export interface InstrumentModule {
  metadata: InstrumentMetadata;
  navigation: InstrumentNavigationConfig;
  audio: InstrumentAudioProvider;
}

class InstrumentPlatformManager {
  private modules = new Map<Instrument, InstrumentModule>();

  register(module: InstrumentModule): void {
    this.modules.set(module.metadata.id, module);
  }

  getModule(id: Instrument): InstrumentModule | undefined {
    return this.modules.get(id);
  }

  getAllModules(): InstrumentModule[] {
    return Array.from(this.modules.values());
  }

  getNavTabs(id: Instrument): string[] {
    const mod = this.modules.get(id);
    return mod ? mod.navigation.tabs.map((t) => t.id) : ['songs', 'library', 'settings'];
  }
}

export const instrumentPlatform = new InstrumentPlatformManager();
