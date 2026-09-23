import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryLocalMusicIntelligence } from '../localMusicIntelligence';
import { getMusicalContextSnapshot } from '../contextAggregator';
import { useAssistantStore } from '../../../store/useAssistantStore';
import { normalizeAndValidateRoute } from '../../navigation/validation';

describe('Livex Music AI Assistant Suite', () => {
  beforeEach(() => {
    useAssistantStore.getState().clearConversation();
  });

  describe('Route & Navigation Validation', () => {
    it('allows hub route with tab "assistant"', () => {
      const route = normalizeAndValidateRoute({
        app: 'hub',
        tab: 'assistant',
      });
      expect(route.app).toBe('hub');
      expect(route.tab).toBe('assistant');
    });

    it('normalizes hub page "assistant" to tab "assistant"', () => {
      const route = normalizeAndValidateRoute({
        app: 'hub',
        page: 'assistant',
      });
      expect(route.app).toBe('hub');
      expect(route.tab).toBe('assistant');
      expect(route.page).toBeUndefined();
    });
  });

  describe('Context Aggregator', () => {
    it('returns a safe snapshot without throwing when stores are default', () => {
      const snapshot = getMusicalContextSnapshot();
      expect(snapshot).toBeDefined();
      expect(typeof snapshot.activeApp).toBe('string');
      expect(snapshot.instrument).toBeDefined();
    });
  });

  describe('Local Music Intelligence Engine', () => {
    it('generates tone recipe recommendation for guitar tone queries', () => {
      const res = queryLocalMusicIntelligence('How can I dial in a Gilmour lead tone?');
      expect(res.content).toContain('Gilmour');
      expect(res.recommendations.length).toBeGreaterThan(0);
      expect(res.recommendations[0].type).toBe('tone_recipe');
      expect((res.recommendations[0].data as any).gain).toBeDefined();
    });

    it('generates chord progression recommendation for harmonic queries', () => {
      const res = queryLocalMusicIntelligence('Suggest a neo soul chord progression');
      expect(res.recommendations.length).toBeGreaterThan(0);
      expect(res.recommendations[0].type).toBe('chord_progression');
      const prog = res.recommendations[0].data as any;
      expect(prog.chords.length).toBeGreaterThan(2);
      expect(prog.romanNumerals.length).toBeGreaterThan(2);
    });

    it('generates drum groove recommendation for rhythm queries', () => {
      const res = queryLocalMusicIntelligence('Give me a 16th note pocket funk drum groove');
      expect(res.recommendations.length).toBeGreaterThan(0);
      expect(res.recommendations[0].type).toBe('drum_groove');
      const drum = res.recommendations[0].data as any;
      expect(drum.bpm).toBeGreaterThan(0);
      expect(drum.patternPreview).toBeDefined();
    });

    it('answers music theory modal questions', () => {
      const res = queryLocalMusicIntelligence('What is the difference between Dorian and Aeolian?');
      expect(res.content).toContain('Dorian');
      expect(res.content).toContain('Aeolian');
      expect(res.content).toContain('Natural 6th');
    });

    it('provides vocal technique guidance', () => {
      const res = queryLocalMusicIntelligence('What are some vocal warmup exercises?');
      expect(res.content).toContain('Vocal Warmup');
      expect(res.recommendations.some((r) => r.type === 'practice_routine')).toBe(true);
    });

    it('answers global bands and scene queries with deep technical context', () => {
      const caifanes = queryLocalMusicIntelligence('How does Alejandro Marcovich achieve the Caifanes guitar tone?');
      expect(caifanes.content).toContain('Caifanes');
      expect(caifanes.content).toContain('Roland JC-120');
      expect(caifanes.content).toContain('Alfonso André');
      expect(caifanes.recommendations.length).toBeGreaterThan(0);

      const cityPop = queryLocalMusicIntelligence('Explain the Japanese City Pop royal road progression');
      expect(cityPop.content).toContain('City Pop');
      expect(cityPop.content).toContain('IVmaj7');
      expect(cityPop.recommendations.some((r) => r.type === 'chord_progression')).toBe(true);

      const afrobeat = queryLocalMusicIntelligence('What is the structure of Afrobeat rhythm and Tony Allen drumming?');
      expect(afrobeat.content).toContain('Afrobeat');
      expect(afrobeat.content).toContain('Tony Allen');
      expect(afrobeat.content).toContain('Dorian');

      const tuareg = queryLocalMusicIntelligence('How is Tuareg desert blues played?');
      expect(tuareg.content).toContain('Desert Blues');
      expect(tuareg.content).toContain('Tinariwen');
      expect(tuareg.content).toContain('Open G');
    });

    it('answers advanced music theory queries (negative harmony, secondary dominants, modal interchange)', () => {
      const negativeHarm = queryLocalMusicIntelligence('Explain negative harmony in C major');
      expect(negativeHarm.content).toContain('Negative Harmony');
      expect(negativeHarm.content).toContain('G7');
      expect(negativeHarm.content).toContain('Fm6');

      const secDom = queryLocalMusicIntelligence('How do secondary dominants resolve?');
      expect(secDom.content).toContain('Secondary Dominants');
      expect(secDom.content).toContain('V7/V');

      const modalInterchange = queryLocalMusicIntelligence('What is modal interchange and borrowed chords?');
      expect(modalInterchange.content).toContain('Modal Interchange');
      expect(modalInterchange.content).toContain('bVImaj7');
    });

    it('supports Spanish localization for music intelligence queries', () => {
      const esCaifanes = queryLocalMusicIntelligence('como lograr el tono de caifanes', undefined, 'es');
      expect(esCaifanes.content).toContain('Caifanes');
      expect(esCaifanes.content).toContain('Cadena de Señal');
      expect(esCaifanes.recommendations.length).toBeGreaterThan(0);

      const esVocal = queryLocalMusicIntelligence('ejercicios de calentamiento vocal', undefined, 'es');
      expect(esVocal.content).toContain('Calentamiento');
      expect(esVocal.content).toContain('Presión Subglótica');
    });

    it('enforces professional tone: zero emojis across all response categories', () => {
      const queries = [
        'Gilmour tone settings',
        'Suggest a jazz progression',
        'Funk drum beat',
        'Dorian vs Aeolian modes',
        'Vocal warmup exercises',
        'What is Livex?',
        'Caifanes guitar tone and chords',
        'Japanese city pop royal road',
        'Afrobeat Tony Allen rhythm',
        'Tuareg desert blues guitar',
        'Negative harmony in C major',
        'Secondary dominants voice leading',
        'Modal interchange borrowed chords',
        'como lograr el tono de caifanes',
        'ejercicios de calentamiento vocal',
        'Unknown random musical query',
      ];

      // Unicode regex matching standard emoji ranges
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const q of queries) {
        const res = queryLocalMusicIntelligence(q);
        expect(emojiRegex.test(res.content)).toBe(false);
      }
    });

    it('enforces concise technical focus: free of conversational filler phrases', () => {
      const queries = [
        'Gilmour tone settings',
        'Suggest a jazz progression',
        'Funk drum beat',
        'What is Livex?',
        'Caifanes guitar tone',
        'Explain negative harmony',
        'como lograr el tono de caifanes',
      ];

      const fillerPhrases = [
        "I'm your musical pair-programmer",
        'What are we creating today?',
        'Keep creating!',
        "I've attached an interactive",
        'You can tap the Chord Progression Card below to explore',
        'Great question!',
        'Certainly!',
        'Hope this helps!',
      ];

      for (const q of queries) {
        const res = queryLocalMusicIntelligence(q);
        for (const filler of fillerPhrases) {
          expect(res.content).not.toContain(filler);
        }
      }
    });
  });

  describe('Assistant Store & Mascot State Transitions', () => {
    it('starts with empty messages and idle mascot state', () => {
      const state = useAssistantStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.mascotState).toBe('idle');
      expect(state.status).toBe('idle');
    });

    it('supports setting mascot state directly', () => {
      useAssistantStore.getState().setMascotState('thinking');
      expect(useAssistantStore.getState().mascotState).toBe('thinking');
      useAssistantStore.getState().setMascotState('idle');
      expect(useAssistantStore.getState().mascotState).toBe('idle');
    });

    it('wakes mascot from sleeping state on wakeMascot()', () => {
      useAssistantStore.getState().setMascotState('sleeping');
      expect(useAssistantStore.getState().mascotState).toBe('sleeping');
      useAssistantStore.getState().wakeMascot();
      expect(useAssistantStore.getState().mascotState).toBe('idle');
    });

    it('handles sendMessage streaming and completion from AI gateway', async () => {
      const ssePayload = [
        'data: {"type": "state", "state": "connecting"}\n\n',
        'data: {"delta": "Here is a "}\n\n',
        'data: {"delta": "jazz progression: `Dm9` -> `G13` -> `Cmaj9`"}\n\n',
        'data: {"recommendation": {"id": "rec-1", "type": "chord_progression", "title": "Jazz ii-V-I", "data": {"chords": ["Dm9", "G13", "Cmaj9"], "key": "C"}}}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(ssePayload));
            controller.close();
          },
        }),
      });

      try {
        const store = useAssistantStore.getState();
        const sendPromise = store.sendMessage('Suggest a jazz progression');

        // Immediate state check
        expect(useAssistantStore.getState().status).toBe('streaming');
        expect(['connecting', 'thinking', 'responding', 'composing']).toContain(
          useAssistantStore.getState().mascotState
        );

        await sendPromise;

        const finalState = useAssistantStore.getState();
        expect(finalState.status).toBe('idle');
        expect(finalState.messages.length).toBe(2);
        expect(finalState.messages[0].role).toBe('user');
        expect(finalState.messages[1].role).toBe('assistant');
        expect(finalState.messages[1].content).toContain('`Dm9` -> `G13` -> `Cmaj9`');
        expect(finalState.messages[1].status).toBe('complete');
        expect(finalState.messages[1].recommendations?.[0].type).toBe('chord_progression');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles gateway failure honestly with error status and no static fallback', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'AI Gateway: GEMINI_API_KEY is not configured.' }),
      });

      try {
        const store = useAssistantStore.getState();
        await store.sendMessage('What is modal interchange?');

        const finalState = useAssistantStore.getState();
        expect(finalState.status).toBe('error');
        expect(finalState.messages[finalState.messages.length - 1].status).toBe('error');
        expect(finalState.messages[finalState.messages.length - 1].content).toContain(
          'GEMINI_API_KEY is not configured'
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('aborts cleanly on stopStreaming()', () => {
      const store = useAssistantStore.getState();
      void store.sendMessage('Tell me about delay pedals');
      store.stopStreaming();

      expect(useAssistantStore.getState().status).toBe('idle');
      expect(useAssistantStore.getState().mascotState).toBe('interrupted');
    });
  });
});
