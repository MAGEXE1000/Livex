import { StateCreator } from 'zustand';
import {
  DrumPattern, DrumInstrument, DrumHit, DrumMeasure, DrumSong, GrooveEntry, GrooveTag, KitType,
  uid, defaultPattern, emptyMeasure, randomNewNoteVelocity, clampVelocity, clampLoopRange, INST_VARIATIONS
} from './drumTypes';
export interface DrumPatternSlice {
  patterns: DrumPattern[];
  activePatternId: string | null;
  drumSongs: DrumSong[];
  grooves: GrooveEntry[];

  createPattern: () => string;
  addBlankPattern: () => string;
  duplicatePattern: (id: string) => string;
  deletePattern: (id: string) => void;
  renamePattern: (id: string, name: string) => void;
  updatePattern: (id: string, patch: Partial<Pick<DrumPattern, 'bpm' | 'timeSignature' | 'subdivision' | 'measures' | 'swing' | 'loopRange'>>) => void;
  setActivePattern: (id: string) => void;

  toggleHit: (patternId: string, measureId: string, instrument: DrumInstrument, step: number) => void;
  simpleToggleHit: (patternId: string, measureId: string, instrument: DrumInstrument, step: number) => void;
  setHitVelocity: (patternId: string, measureId: string, instrument: DrumInstrument, step: number, velocity: number) => void;
  addMeasure: (patternId: string) => string;
  deleteMeasure: (patternId: string, measureId: string) => void;
  clearMeasure: (patternId: string, measureId: string) => void;
  duplicateMeasure: (patternId: string, measureId: string) => void;
  insertMeasureAfter: (patternId: string, afterMeasureId: string, hitsTemplate: DrumMeasure['hits']) => string;
  togglePatternMute: (patternId: string, inst: DrumInstrument) => void;

  saveDrumSong: (name: string, artist: string, notes: string) => string;
  createBlankDrumSong: (name: string, artist: string, bpm: number, notes: string, kitType?: KitType) => string;
  loadDrumSong: (id: string) => void;
  deleteDrumSong: (id: string) => void;
  updateDrumSong: (id: string, patch: Partial<Pick<DrumSong, 'name' | 'artist' | 'notes' | 'patterns' | 'activePatternId' | 'kitType'>>) => void;

  restorePatterns: (patterns: DrumPattern[], activePatternId: string | null) => void;
  importDrumSong: (name: string, artist: string, notes: string, patterns: DrumPattern[], activePatternId: string, kitType?: KitType | null) => string;

  saveGroove: (name: string, tag: GrooveTag) => string;
  deleteGroove: (id: string) => void;
  renameGroove: (id: string, name: string, tag: GrooveTag) => void;
  loadGrooveReplace: (id: string) => void;
  loadGrooveAppend: (id: string) => void;
  duplicateGroove: (id: string) => string;
}

export const createDrumPatternSlice: StateCreator<any, [], [], DrumPatternSlice> = (set, get) => ({
  patterns: [defaultPattern()],
  activePatternId: defaultPattern().id, // Overwritten by state initialisation logic
  drumSongs: [],
  grooves: [],

  createPattern: () => {
    const p = defaultPattern();
    p.name = `Pattern ${get().patterns.length + 1}`;
    set((s) => ({ patterns: [...s.patterns, p], activePatternId: p.id }));
    return p.id;
  },

  addBlankPattern: () => {
    const s = get();
    const src = s.patterns.find((p) => p.id === s.activePatternId) ?? s.patterns[0];
    const num = s.patterns.length + 1;
    const p: DrumPattern = {
      id: `p-${uid()}`,
      name: `Pattern ${num}`,
      bpm: src?.bpm ?? 120,
      timeSignature: src?.timeSignature ?? [4, 4],
      subdivision: src?.subdivision ?? 16,
      measures: [emptyMeasure(), emptyMeasure()],
      swing: src?.swing ?? 0,
    };
    set((st) => ({ patterns: [...st.patterns, p], activePatternId: p.id }));
    return p.id;
  },

  duplicatePattern: (id) => {
    const src = get().patterns.find((p) => p.id === id);
    if (!src) return id;
    const dup: DrumPattern = {
      ...JSON.parse(JSON.stringify(src)),
      id: `p-${uid()}`,
      name: `${src.name} (copy)`,
      measures: JSON.parse(JSON.stringify(src.measures)).map((m: DrumMeasure) => ({
        ...m,
        id: `m-${uid()}`,
      })),
    };
    set((s) => ({ patterns: [...s.patterns, dup], activePatternId: dup.id }));
    return dup.id;
  },

  deletePattern: (id) => {
    set((s) => {
      const patterns = s.patterns.filter((p) => p.id !== id);
      if (patterns.length === 0) {
        const p = defaultPattern();
        return { patterns: [p], activePatternId: p.id };
      }
      return {
        patterns,
        activePatternId: s.activePatternId === id ? patterns[0].id : s.activePatternId,
      };
    });
  },

  renamePattern: (id, name) =>
    set((s) => ({ patterns: s.patterns.map((p) => (p.id === id ? { ...p, name } : p)) })),
  updatePattern: (id, patch) =>
    set((s) => ({ patterns: s.patterns.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  setActivePattern: (id) => set({ activePatternId: id }),

  toggleHit: (patternId, measureId, instrument, step) => {
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        return {
          ...p,
          measures: p.measures.map((m) => {
            if (m.id !== measureId) return m;
            const hits = m.hits[instrument] ?? [];
            const existing = hits.find((h) => h.step === step);
            const varList = INST_VARIATIONS[instrument] ?? ['normal'];
            if (!existing) {
              const newHit: DrumHit = {
                step,
                length: 1,
                variation: 'normal',
                velocity: randomNewNoteVelocity(),
              };
              return {
                ...m,
                hits: {
                  ...m.hits,
                  [instrument]: [...hits, newHit].sort((a, b) => a.step - b.step),
                },
              };
            }
            const curVar = existing.variation ?? 'normal';
            const curIdx = varList.indexOf(curVar);
            const nextIdx = curIdx < 0 ? varList.length : curIdx + 1;
            if (nextIdx >= varList.length) {
              return {
                ...m,
                hits: { ...m.hits, [instrument]: hits.filter((h) => h !== existing) },
              };
            }
            const updated: DrumHit = { ...existing, variation: varList[nextIdx] };
            return {
              ...m,
              hits: {
                ...m.hits,
                [instrument]: hits.map((h) => (h === existing ? updated : h)),
              },
            };
          }),
        };
      }),
    }));
  },

  simpleToggleHit: (patternId, measureId, instrument, step) => {
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        return {
          ...p,
          measures: p.measures.map((m) => {
            if (m.id !== measureId) return m;
            const hits = m.hits[instrument] ?? [];
            const existing = hits.find((h) => h.step === step);
            if (existing) {
              return {
                ...m,
                hits: { ...m.hits, [instrument]: hits.filter((h) => h !== existing) },
              };
            }
            const newHit: DrumHit = {
              step,
              length: 1,
              variation: 'normal',
              velocity: randomNewNoteVelocity(),
            };
            return {
              ...m,
              hits: {
                ...m.hits,
                [instrument]: [...hits, newHit].sort((a, b) => a.step - b.step),
              },
            };
          }),
        };
      }),
    }));
  },

  setHitVelocity: (patternId, measureId, instrument, step, velocity) => {
    const v = clampVelocity(velocity);
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        return {
          ...p,
          measures: p.measures.map((m) => {
            if (m.id !== measureId) return m;
            const hits = m.hits[instrument] ?? [];
            const existing = hits.find((h) => h.step === step);
            if (!existing || existing.velocity === v) return m;
            const updated: DrumHit = { ...existing, velocity: v };
            return {
              ...m,
              hits: {
                ...m.hits,
                [instrument]: hits.map((h) => (h === existing ? updated : h)),
              },
            };
          }),
        };
      }),
    }));
  },

  addMeasure: (patternId) => {
    const m = emptyMeasure();
    set((s) => ({
      patterns: s.patterns.map((p) =>
        p.id === patternId ? { ...p, measures: [...p.measures, m] } : p
      ),
    }));
    return m.id;
  },

  deleteMeasure: (patternId, measureId) => {
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        if (p.measures.length <= 2) return p;
        const finalMeasures = p.measures.filter((m) => m.id !== measureId);
        const loopRange = p.loopRange
          ? clampLoopRange(p.loopRange, finalMeasures.length)
          : p.loopRange;
        return { ...p, measures: finalMeasures, loopRange };
      }),
    }));
  },

  clearMeasure: (patternId, measureId) => {
    set((s) => ({
      patterns: s.patterns.map((p) =>
        p.id !== patternId
          ? p
          : {
              ...p,
              measures: p.measures.map((m) => (m.id === measureId ? { ...m, hits: {} } : m)),
            }
      ),
    }));
  },

  duplicateMeasure: (patternId, measureId) => {
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        const idx = p.measures.findIndex((m) => m.id === measureId);
        if (idx < 0) return p;
        const dup: DrumMeasure = {
          id: `m-${uid()}`,
          hits: JSON.parse(JSON.stringify(p.measures[idx].hits)),
        };
        const measures = [...p.measures];
        measures.splice(idx + 1, 0, dup);
        return { ...p, measures };
      }),
    }));
  },

  insertMeasureAfter: (patternId, afterMeasureId, hitsTemplate) => {
    const newM: DrumMeasure = {
      id: `m-${uid()}`,
      hits: JSON.parse(JSON.stringify(hitsTemplate)),
    };
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        const idx = p.measures.findIndex((m) => m.id === afterMeasureId);
        if (idx < 0) return p;
        const measures = [...p.measures];
        measures.splice(idx + 1, 0, newM);
        return { ...p, measures };
      }),
    }));
    return newM.id;
  },

  togglePatternMute: (patternId, inst) =>
    set((s) => ({
      patterns: s.patterns.map((p) => {
        if (p.id !== patternId) return p;
        const muted = p.mutedInstruments ?? [];
        return {
          ...p,
          mutedInstruments: muted.includes(inst)
            ? muted.filter((i) => i !== inst)
            : [...muted, inst],
        };
      }),
    })),

  saveDrumSong: (name, artist, notes) => {
    const s = get();
    const song: DrumSong = {
      id: `ds-${uid()}`,
      name: name.trim() || 'Untitled Beat',
      artist: artist.trim(),
      notes: notes.trim(),
      patterns: JSON.parse(JSON.stringify(s.patterns)),
      activePatternId: s.activePatternId ?? s.patterns[0]?.id ?? '',
      kitType: s.kitType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((st) => ({ drumSongs: [song, ...st.drumSongs] }));
    return song.id;
  },

  createBlankDrumSong: (name, artist, bpm, notes, kitType) => {
    const p = defaultPattern();
    p.bpm = Math.max(40, Math.min(280, bpm));
    const normalizedKit = kitType && kitType !== 'house' ? 'house' : (kitType ?? 'house');
    const song: DrumSong = {
      id: `ds-${uid()}`,
      name: name.trim() || 'Untitled Beat',
      artist: artist.trim(),
      notes: notes.trim(),
      patterns: [p],
      activePatternId: p.id,
      kitType: normalizedKit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((st) => ({
      drumSongs: [song, ...st.drumSongs],
      patterns: song.patterns,
      activePatternId: song.activePatternId,
      kitType: song.kitType,
      cymbalPack: 'default',
    }));
    return song.id;
  },

  loadDrumSong: (id) => {
    const song = get().drumSongs.find((s) => s.id === id);
    if (!song) return;
    const kit = song.kitType && song.kitType !== 'house' ? 'house' : (song.kitType ?? 'house');
    set({
      patterns: JSON.parse(JSON.stringify(song.patterns)),
      activePatternId: song.activePatternId,
      kitType: kit,
      cymbalPack: 'default',
      instFX: {},
    });
  },

  deleteDrumSong: (id) => set((s) => ({ drumSongs: s.drumSongs.filter((x) => x.id !== id) })),

  updateDrumSong: (id, patch) =>
    set((s) => ({
      drumSongs: s.drumSongs.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x
      ),
    })),

  restorePatterns: (pts, actId) => set({ patterns: pts, activePatternId: actId }),

  saveGroove: (name, tag) => {
    const s = get();
    const pat = s.patterns.find((p) => p.id === s.activePatternId) ?? s.patterns[0];
    if (!pat) return '';
    const entry: GrooveEntry = {
      id: `g-${uid()}`,
      name: name.trim() || pat.name,
      tag,
      bpm: pat.bpm,
      bars: pat.measures.length,
      subdivision: pat.subdivision,
      measures: JSON.parse(JSON.stringify(pat.measures)),
      savedAt: Date.now(),
    };
    set((st) => ({ grooves: [entry, ...st.grooves] }));
    return entry.id;
  },

  deleteGroove: (id) => set((s) => ({ grooves: s.grooves.filter((g) => g.id !== id) })),

  renameGroove: (id, name, tag) =>
    set((s) => ({
      grooves: s.grooves.map((g) =>
        g.id === id ? { ...g, name: name.trim() || g.name, tag } : g
      ),
    })),

  loadGrooveReplace: (id) => {
    const { grooves, activePatternId } = get();
    const groove = grooves.find((g) => g.id === id);
    if (!groove) return;
    const newMeasures: DrumMeasure[] = JSON.parse(JSON.stringify(groove.measures)).map(
      (m: DrumMeasure) => ({ ...m, id: `m-${uid()}` })
    );
    set((s) => ({
      patterns: s.patterns.map((p) =>
        p.id === activePatternId
          ? { ...p, bpm: groove.bpm, subdivision: groove.subdivision, measures: newMeasures }
          : p
      ),
    }));
  },

  loadGrooveAppend: (id) => {
    const { grooves, activePatternId } = get();
    const groove = grooves.find((g) => g.id === id);
    if (!groove) return;
    const appendMeasures: DrumMeasure[] = JSON.parse(JSON.stringify(groove.measures)).map(
      (m: DrumMeasure) => ({ ...m, id: `m-${uid()}` })
    );
    set((s) => ({
      patterns: s.patterns.map((p) =>
        p.id === activePatternId ? { ...p, measures: [...p.measures, ...appendMeasures] } : p
      ),
    }));
  },

  duplicateGroove: (id) => {
    const groove = get().grooves.find((g) => g.id === id);
    if (!groove) return id;
    const dup: GrooveEntry = {
      ...JSON.parse(JSON.stringify(groove)),
      id: `g-${uid()}`,
      name: `${groove.name} (copy)`,
      savedAt: Date.now(),
    };
    set((s) => {
      const idx = s.grooves.findIndex((g) => g.id === id);
      const next = [...s.grooves];
      next.splice(idx + 1, 0, dup);
      return { grooves: next };
    });
    return dup.id;
  },

  importDrumSong: (name, artist, notes, patterns, activePatternId, kitType) => {
    const normalizedKit = kitType && kitType !== 'house' ? 'house' : (kitType ?? 'house');
    const song: DrumSong = {
      id: `ds-${uid()}`,
      name: name.trim() || 'Imported Beat',
      artist: artist.trim(),
      notes: notes.trim(),
      patterns: JSON.parse(JSON.stringify(patterns)),
      activePatternId,
      kitType: normalizedKit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((st) => ({
      drumSongs: [song, ...st.drumSongs],
      patterns: song.patterns,
      activePatternId: song.activePatternId,
      kitType: song.kitType,
      cymbalPack: 'default',
    }));
    return song.id;
  },
});
