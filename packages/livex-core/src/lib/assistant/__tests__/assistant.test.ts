import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMusicalContextSnapshot } from '../contextAggregator';
import { useAssistantStore } from '../../../store/useAssistantStore';
import { normalizeAndValidateRoute } from '../../navigation/validation';
import { resolveAiGatewayUrl } from '../assistantApiClient';

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

  describe('Gateway URL Resolution', () => {
    it('resolves relative endpoint in web environment', () => {
      const url = resolveAiGatewayUrl();
      expect(url).toContain('/api/ai/chat');
    });

    it('respects custom gateway URL when specified', () => {
      const custom = 'https://ai.example.com/v1';
      const resolved = resolveAiGatewayUrl(custom);
      expect(resolved).toBe('https://ai.example.com/v1/api/ai/chat');
    });

    it('preserves exact path if custom URL already ends with /api/ai/chat', () => {
      const custom = 'https://ai.example.com/api/ai/chat';
      const resolved = resolveAiGatewayUrl(custom);
      expect(resolved).toBe('https://ai.example.com/api/ai/chat');
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
        'data: {"type": "state", "state": "solving"}\n\n',
        'data: {"delta": "Here is a "}\n\n',
        'data: {"delta": "heavy rock progression: `E5` -> `G5` -> `A5` -> `C5`"}\n\n',
        'data: {"recommendation": {"id": "rec-1", "type": "chord_progression", "title": "Heavy Rock Power Chords", "data": {"chords": ["E5", "G5", "A5", "C5"], "romanNumerals": ["i", "bIII", "IV", "bVI"], "key": "E", "mode": "Aeolian"}}}\n\n',
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
        const sendPromise = store.sendMessage('Make me a chord progression of heavy rock');

        // Immediate state check
        expect(useAssistantStore.getState().status).toBe('streaming');

        await sendPromise;

        const finalState = useAssistantStore.getState();
        expect(finalState.status).toBe('idle');
        expect(finalState.messages.length).toBe(2);
        expect(finalState.messages[0].role).toBe('user');
        expect(finalState.messages[0].content).toBe('Make me a chord progression of heavy rock');
        expect(finalState.messages[1].role).toBe('assistant');
        expect(finalState.messages[1].content).toContain('`E5` -> `G5` -> `A5` -> `C5`');
        expect(finalState.messages[1].status).toBe('complete');
        expect(finalState.messages[1].recommendations?.[0].type).toBe('chord_progression');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles deep reasoning transition states without corrupting message content', async () => {
      const ssePayload = [
        'data: {"type": "state", "state": "connecting"}\n\n',
        'data: {"type": "state", "state": "solving"}\n\n',
        'data: {"type": "state", "state": "composing"}\n\n',
        'data: {"delta": "Negative harmony in C major reflects across the C-G axis."}\n\n',
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
        await store.sendMessage('Explain negative harmony');

        const finalState = useAssistantStore.getState();
        expect(finalState.messages[1].content).toBe('Negative harmony in C major reflects across the C-G axis.');
        expect(finalState.messages[1].status).toBe('complete');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles gateway failure honestly with error card and no static fallback', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'AI Gateway: No AI provider is configured or available.' }),
      });

      try {
        const store = useAssistantStore.getState();
        await store.sendMessage('Poop');

        const finalState = useAssistantStore.getState();
        expect(finalState.status).toBe('error');
        expect(finalState.messages[finalState.messages.length - 1].status).toBe('error');
        expect(finalState.messages[finalState.messages.length - 1].content).toContain(
          'No AI provider is configured'
        );
        // CRITICAL CHECK: Verify static menu is NOT returned
        expect(finalState.messages[finalState.messages.length - 1].content).not.toContain('Livex Music Assistant');
        expect(finalState.messages[finalState.messages.length - 1].content).not.toContain('Supported technical queries');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('supports retryLastMessage() to resubmit prompt on failure', async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ error: 'Upstream gateway timeout' }),
          };
        }
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/event-stream' }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('data: {"delta": "Recovered response"}\n\ndata: [DONE]\n\n'));
              controller.close();
            },
          }),
        };
      });

      try {
        const store = useAssistantStore.getState();
        await store.sendMessage('Retry test query');

        expect(useAssistantStore.getState().status).toBe('error');

        // Execute retry
        await store.retryLastMessage();

        expect(useAssistantStore.getState().status).toBe('idle');
        const msgs = useAssistantStore.getState().messages;
        expect(msgs[msgs.length - 1].content).toBe('Recovered response');
        expect(msgs[msgs.length - 1].status).toBe('complete');
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
