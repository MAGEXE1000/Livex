import { describe, it, expect, beforeEach } from 'vitest';
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

    it('handles sendMessage streaming and completion in local mode', async () => {
      const store = useAssistantStore.getState();
      const sendPromise = store.sendMessage('Suggest a jazz progression');

      // Immediate state check
      expect(useAssistantStore.getState().status).toBe('streaming');
      expect(['thinking', 'responding']).toContain(useAssistantStore.getState().mascotState);

      await sendPromise;

      // Completion check
      const finalState = useAssistantStore.getState();
      expect(finalState.status).toBe('idle');
      expect(finalState.messages.length).toBe(2);
      expect(finalState.messages[0].role).toBe('user');
      expect(finalState.messages[1].role).toBe('assistant');
      expect(finalState.messages[1].content.length).toBeGreaterThan(0);
      expect(finalState.messages[1].status).toBe('complete');
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
