export interface TrackEffect {
  type: 'reverb' | 'delay' | 'chorus' | 'distortion' | 'highpass' | 'lowpass';
  enabled: boolean;
  params: Record<string, number>;
}

export interface LabLayer {
  id: string;
  name: string;
  audioBlob: Blob;
  durationMs: number;
  createdAt: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  effects: TrackEffect[];
  sourceType: 'recorded' | 'take' | 'file';
  order: number;
}

export interface LabSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layers: LabLayer[];
  icon: string;
  bpm?: number;
  key?: string;
  masterVolume?: number;
}

export interface TakeRecord {
  id: string;
  name: string;
  createdAt: number;
  durationMs: number;
  audioBlob: Blob;
  waveformPeaks: number[];
  sampleRate: number;
}

export function createDefaultEffects(): TrackEffect[] {
  return [
    { type: 'reverb', enabled: false, params: { mix: 0.3, decay: 2.0 } },
    { type: 'delay', enabled: false, params: { time: 0.3, feedback: 0.3, mix: 0.25 } },
    { type: 'chorus', enabled: false, params: { rate: 1.5, depth: 0.5, mix: 0.3 } },
    { type: 'distortion', enabled: false, params: { amount: 0.3, mix: 0.2 } },
    { type: 'highpass', enabled: false, params: { frequency: 200, q: 0.7 } },
    { type: 'lowpass', enabled: false, params: { frequency: 8000, q: 0.7 } },
  ];
}

export function createLayer(
  partial: Pick<LabLayer, 'name' | 'audioBlob' | 'durationMs'> & Partial<LabLayer>
): LabLayer {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    effects: createDefaultEffects(),
    sourceType: 'recorded',
    order: Date.now(),
    createdAt: Date.now(),
    ...partial,
  };
}

export function extractWaveformPeaks(audioBuffer: AudioBuffer, barCount = 60): number[] {
  const raw = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(raw.length / barCount);
  const peaks: number[] = [];
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, raw.length);
    for (let j = start; j < end; j++) {
      sum += Math.abs(raw[j]);
    }
    peaks.push(sum / (end - start));
  }
  const maxPeak = Math.max(...peaks, 0.001);
  return peaks.map((p) => Math.round((p / maxPeak) * 100));
}

export async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  return ctx.decodeAudioData(arrayBuffer);
}

const LAB_DB_NAME = 'vocalex-lab';
const LAB_DB_VERSION = 2;
const LAB_STORE_NAME = 'sessions';

const TAKES_DB_NAME = 'vocalex-takes';
const TAKES_DB_VERSION = 1;
const TAKES_STORE_NAME = 'takes';

/**
 * Repository to handle Vocalex persistence.
 * Isolates IndexedDB implementation details.
 */
export class VocalexRepository {
  // === Lab Sessions ===

  private openLabDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(LAB_DB_NAME, LAB_DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LAB_STORE_NAME)) {
          const store = db.createObjectStore(LAB_STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private migrateLayer(l: any): LabLayer {
    return {
      ...l,
      volume: l.volume ?? 0.8,
      pan: l.pan ?? 0,
      muted: l.muted ?? false,
      solo: l.solo ?? false,
      effects: l.effects ?? [
        { type: 'reverb', enabled: false, params: { mix: 0.3, decay: 2.0 } },
        { type: 'delay', enabled: false, params: { time: 0.3, feedback: 0.3, mix: 0.25 } },
        { type: 'chorus', enabled: false, params: { rate: 1.5, depth: 0.5, mix: 0.3 } },
        { type: 'distortion', enabled: false, params: { amount: 0.3, mix: 0.2 } },
        { type: 'highpass', enabled: false, params: { frequency: 200, q: 0.7 } },
        { type: 'lowpass', enabled: false, params: { frequency: 8000, q: 0.7 } },
      ],
      sourceType: l.sourceType ?? 'recorded',
      order: l.order ?? l.createdAt ?? Date.now(),
    };
  }

  private migrateSession(s: any): LabSession {
    return {
      ...s,
      layers: (s.layers || []).map(this.migrateLayer.bind(this)),
      masterVolume: s.masterVolume ?? 0.8,
    };
  }

  public async saveSession(session: LabSession): Promise<void> {
    const db = await this.openLabDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LAB_STORE_NAME, 'readwrite');
      tx.objectStore(LAB_STORE_NAME).put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllSessions(): Promise<LabSession[]> {
    const db = await this.openLabDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LAB_STORE_NAME, 'readonly');
      const req = tx.objectStore(LAB_STORE_NAME).index('updatedAt').getAll();
      req.onsuccess = () => resolve((req.result as any[]).map(this.migrateSession.bind(this)).reverse());
      req.onerror = () => reject(req.error);
    });
  }

  public async getSession(id: string): Promise<LabSession | undefined> {
    const db = await this.openLabDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LAB_STORE_NAME, 'readonly');
      const req = tx.objectStore(LAB_STORE_NAME).get(id);
      req.onsuccess = () => {
        const r = req.result;
        resolve(r ? this.migrateSession(r) : undefined);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteSession(id: string): Promise<void> {
    const db = await this.openLabDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LAB_STORE_NAME, 'readwrite');
      tx.objectStore(LAB_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // === Takes ===

  private openTakesDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(TAKES_DB_NAME, TAKES_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(TAKES_STORE_NAME)) {
          const store = db.createObjectStore(TAKES_STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveTake(take: TakeRecord): Promise<void> {
    const db = await this.openTakesDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TAKES_STORE_NAME, 'readwrite');
      tx.objectStore(TAKES_STORE_NAME).put(take);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllTakes(): Promise<TakeRecord[]> {
    const db = await this.openTakesDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TAKES_STORE_NAME, 'readonly');
      const req = tx.objectStore(TAKES_STORE_NAME).index('createdAt').getAll();
      req.onsuccess = () => resolve((req.result as TakeRecord[]).reverse());
      req.onerror = () => reject(req.error);
    });
  }

  public async getTake(id: string): Promise<TakeRecord | undefined> {
    const db = await this.openTakesDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TAKES_STORE_NAME, 'readonly');
      const req = tx.objectStore(TAKES_STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as TakeRecord | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteTake(id: string): Promise<void> {
    const db = await this.openTakesDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TAKES_STORE_NAME, 'readwrite');
      tx.objectStore(TAKES_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const vocalexRepository = new VocalexRepository();
