import { searchIndex, SearchableItem } from '../navigation/searchIndex';
import { useChordStore } from '../../store/useChordStore';
import { useDrumStore } from '../../store/useDrumStore';
import { NavigationDispatcher } from '../navigation/NavigationDispatcher';

export class GlobalSearchService {
  public static buildIndex() {
    // chordex
    const chordStore = useChordStore.getState();
    const presets = chordStore.presets || [];
    presets.forEach((p: any) => {
      searchIndex.register({
        id: `chordex-preset-${p.id || p.name}`,
        category: 'projects',
        titleEn: p.name || 'Untitled Chordex Preset',
        titleEs: p.name || 'Preajuste de Chordex sin título',
        subtitleEn: 'Chordex Preset',
        subtitleEs: 'Preajuste de Chordex',
        keywordsEn: ['chord', 'preset', 'chordex', 'progression'],
        keywordsEs: ['acorde', 'preajuste', 'chordex', 'progresión'],
        target: {
          app: 'chordex',
          action: () => {
            NavigationDispatcher.push({ app: 'chordex', page: 'library' as any });
          },
        },
      });
    });

    const progressions = chordStore.progressions || [];
    progressions.forEach((p: any) => {
      searchIndex.register({
        id: `chordex-prog-${p.id || p.name}`,
        category: 'projects',
        titleEn: p.name || 'Untitled Progression',
        titleEs: p.name || 'Progresión sin título',
        subtitleEn: 'Chordex Progression',
        subtitleEs: 'Progresión de Chordex',
        keywordsEn: ['progression', 'chords', 'chordex'],
        keywordsEs: ['progresión', 'acordes', 'chordex'],
        target: {
          app: 'chordex',
          action: () => {
            NavigationDispatcher.push({ app: 'chordex', page: 'songs' as any });
          },
        },
      });
    });

    // drumex
    const drumStore = useDrumStore.getState();
    const drumSongs = drumStore.drumSongs || [];
    drumSongs.forEach((s: any) => {
      searchIndex.register({
        id: `drumex-song-${s.id || s.name}`,
        category: 'songs',
        titleEn: s.name || 'Untitled Drum Song',
        titleEs: s.name || 'Canción de batería sin título',
        subtitleEn: 'Drumex Song',
        subtitleEs: 'Canción de Drumex',
        keywordsEn: ['drum', 'song', 'pattern', 'drumex'],
        keywordsEs: ['batería', 'canción', 'patrón', 'drumex'],
        target: {
          app: 'drumex',
          action: () => {
            NavigationDispatcher.push({ app: 'drumex', page: 'songs' as any });
          },
        },
      });
    });

    // groovex
    try {
      const groovex = localStorage.getItem('groovex-storage-v1');
      if (groovex) {
        const parsed = JSON.parse(groovex);
        const state = parsed.state || {};
        (state.recentSongs || []).forEach((s: any) => {
          searchIndex.register({
            id: `groovex-song-${s.id || s.name || s.title}`,
            category: 'songs',
            titleEn: s.name || s.title || s.artist || 'Untitled Groovex Song',
            titleEs: s.name || s.title || s.artist || 'Canción de Groovex sin título',
            subtitleEn: 'Groovex Recent Song',
            subtitleEs: 'Canción reciente de Groovex',
            keywordsEn: ['groove', 'song', 'recent', 'groovex'],
            keywordsEs: ['groove', 'canción', 'reciente', 'groovex'],
            target: {
              app: 'groovex',
            },
          });
        });
      }
    } catch {}
  }

  public static scoreMatch(query: string, text: string): number {
    const q = query.toLowerCase().trim();
    const t = text.toLowerCase();
    if (!q) return 0;
    if (t === q) return 150;
    if (t.startsWith(q)) return 100;
    if (t.includes(q)) return 80;

    let qIdx = 0;
    let tIdx = 0;
    let matchDistance = 0;
    while (qIdx < q.length && tIdx < t.length) {
      if (q[qIdx] === t[tIdx]) {
        if (qIdx > 0) {
          matchDistance += tIdx - qIdx;
        }
        qIdx++;
      }
      tIdx++;
    }
    if (qIdx === q.length) {
      return Math.max(10, 50 - matchDistance);
    }
    return 0;
  }

  public static getSearchResults(query: string, searchCategory: string = 'all'): SearchableItem[] {
    const q = query.trim();
    if (!q) return [];

    const allItems = searchIndex.getItems();

    const categoryWeights: Record<string, number> = {
      apps: 100,
      actions: 90,
      recent: 80,
      songs: 70,
      projects: 60,
      settings: 50,
      updater: 40,
      documents: 30,
    };

    const scored = allItems.map((item) => {
      const titleScore = Math.max(GlobalSearchService.scoreMatch(q, item.titleEn), GlobalSearchService.scoreMatch(q, item.titleEs));
      const subtitleScore =
        Math.max(GlobalSearchService.scoreMatch(q, item.subtitleEn), GlobalSearchService.scoreMatch(q, item.subtitleEs)) * 0.5;

      const keywordsEnScore = (item.keywordsEn || []).some((k) =>
        k.toLowerCase().includes(q.toLowerCase())
      )
        ? 70
        : 0;
      const keywordsEsScore = (item.keywordsEs || []).some((k) =>
        k.toLowerCase().includes(q.toLowerCase())
      )
        ? 70
        : 0;

      const baseScore = Math.max(titleScore, subtitleScore, keywordsEnScore, keywordsEsScore);
      const categoryWeight = categoryWeights[item.category] || 0;
      const finalScore = baseScore > 0 ? baseScore + categoryWeight * 0.1 : 0;

      return { item, score: finalScore };
    });

    const seenIds = new Set<string>();
    const deduplicatedScored: { item: SearchableItem; score: number }[] = [];

    scored.forEach((x) => {
      if (x.score > 0) {
        const id = x.item.id || `${x.item.category}-${x.item.titleEn}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          deduplicatedScored.push(x);
        }
      }
    });

    let results = deduplicatedScored
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    if (searchCategory !== 'all') {
      results = results.filter((x) => x.category === searchCategory);
    }

    return results;
  }
}
