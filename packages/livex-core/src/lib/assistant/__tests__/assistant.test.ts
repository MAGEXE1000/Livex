import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMusicalContextSnapshot } from '../contextAggregator';
import { useAssistantStore, getDefaultStatusLabel } from '../../../store/useAssistantStore';
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

    it('resolves production Cloudflare edge endpoint when running in native Android platform', () => {
      (globalThis as any).window = {
        Capacitor: { isNativePlatform: () => true },
        location: { protocol: 'capacitor:', origin: 'capacitor://localhost' },
      };
      const resolved = resolveAiGatewayUrl();
      expect(resolved).toBe('https://livex-5rk.pages.dev/api/ai/chat');
      delete (globalThis as any).window;
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

    it('aborts cleanly on stopStreaming() and finalizes message status', () => {
      const store = useAssistantStore.getState();
      void store.sendMessage('Tell me about delay pedals');
      store.stopStreaming();

      expect(useAssistantStore.getState().status).toBe('idle');
      expect(useAssistantStore.getState().mascotState).toBe('interrupted');
      const messages = useAssistantStore.getState().messages;
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.role).toBe('assistant');
      expect(lastMsg.status).toBe('complete');
    });

    it('operates in Zero-BYOK mode: user needs no API key and payload sends undefined apiKey', async () => {
      let interceptedPayload: any = null;
      let interceptedHeaders: any = null;

      const ssePayload = [
        'data: {"type": "state", "state": "connecting"}\n\n',
        'data: {"delta": "Livex cloud AI streaming response with zero configuration required."}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        interceptedHeaders = opts.headers;
        interceptedPayload = JSON.parse(opts.body);
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/event-stream' }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(ssePayload));
              controller.close();
            },
          }),
        };
      });

      try {
        const store = useAssistantStore.getState();
        // Assert userApiKey is undefined by default (No BYOK)
        expect(store.userApiKey).toBeUndefined();

        await store.sendMessage('How do I tune Drop D?');

        expect(interceptedPayload).toBeDefined();
        expect(interceptedPayload.apiKey).toBeUndefined();
        expect(interceptedHeaders['x-api-key']).toBeUndefined();
        expect(useAssistantStore.getState().messages[1].content).toContain(
          'Livex cloud AI streaming response'
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('collects web grounding sources from SSE stream into assistant message', async () => {
      const ssePayload = [
        'data: {"type": "state", "state": "searching", "query": "current guitar gear 2026"}\n\n',
        'data: {"type": "sources", "sources": [{"title": "Guitar World", "url": "https://guitarworld.com/gear-2026"}]}\n\n',
        'data: {"delta": "The latest DSP modeling amplifiers feature sub-millisecond latency."}\n\n',
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
        await store.sendMessage('What are the latest DSP amps?');

        const assistantMsg = useAssistantStore.getState().messages[1];
        expect(assistantMsg.sources).toBeDefined();
        expect(assistantMsg.sources?.length).toBe(1);
        expect(assistantMsg.sources?.[0].title).toBe('Guitar World');
        expect(assistantMsg.sources?.[0].url).toBe('https://guitarworld.com/gear-2026');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('preserves multi-turn conversation history across consecutive messages', async () => {
      let lastSentHistory: any[] = [];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        const parsed = JSON.parse(opts.body);
        lastSentHistory = parsed.history;
        const reply = parsed.prompt === 'Turn 1' ? 'Answer 1' : 'Answer 2';
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/event-stream' }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(`data: {"delta": "${reply}"}\n\ndata: [DONE]\n\n`)
              );
              controller.close();
            },
          }),
        };
      });

      try {
        const store = useAssistantStore.getState();
        await store.sendMessage('Turn 1');

        expect(lastSentHistory.length).toBe(0);

        await store.sendMessage('Turn 2');

        expect(lastSentHistory.length).toBe(2);
        expect(lastSentHistory[0].content).toBe('Turn 1');
        expect(lastSentHistory[1].content).toBe('Answer 1');
        expect(useAssistantStore.getState().messages.length).toBe(4);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects with error when stream terminates without emitting any content tokens', async () => {
      const ssePayload = [
        'data: {"type": "state", "state": "connecting"}\n\n',
        'data: {"type": "state", "state": "solving"}\n\n',
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
        await store.sendMessage('What is 37 * 48?');

        const state = useAssistantStore.getState();
        expect(state.status).toBe('error');
        expect(state.errorMessage).toContain('AI assistant did not return any content');
        expect(state.mascotState).toBe('error');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('surfaces server-side SSE error events directly to error state and mascot', async () => {
      const ssePayload = [
        'data: {"type": "state", "state": "connecting"}\n\n',
        'data: {"error": "Cloudflare edge inference capacity reached. Please retry."}\n\n',
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
        await store.sendMessage('Generate full orchestral score');

        const state = useAssistantStore.getState();
        expect(state.status).toBe('error');
        expect(state.errorMessage).toBe('Cloudflare edge inference capacity reached. Please retry.');
        expect(state.mascotState).toBe('error');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Multimodal Ingestion & Truthful State Machine', () => {
    it('returns truthful default status labels for all official orb states', () => {
      expect(getDefaultStatusLabel('connecting')).toBe('Connecting…');
      expect(getDefaultStatusLabel('searching')).toBe('Searching web…');
      expect(getDefaultStatusLabel('solving')).toBe('Analyzing music theory…');
      expect(getDefaultStatusLabel('working')).toBe('Thinking…');
      expect(getDefaultStatusLabel('thinking')).toBe('Thinking…');
      expect(getDefaultStatusLabel('composing')).toBe('Composing…');
      expect(getDefaultStatusLabel('responding')).toBe('Composing…');
      expect(getDefaultStatusLabel('shaping')).toBe('Shaping recommendations…');
      expect(getDefaultStatusLabel('weaving')).toBe('Synthesizing harmony…');
      expect(getDefaultStatusLabel('listening')).toBe('Listening…');
      expect(getDefaultStatusLabel('idle')).toBe('Ready');
      expect(getDefaultStatusLabel('sleeping')).toBe('Ready');
      expect(getDefaultStatusLabel('error')).toBe('Error');
      expect(getDefaultStatusLabel('interrupted')).toBe('Stopped');
    });

    it('generates contextual prompt and sets reading state when sending image without text', async () => {
      let interceptedPayload: any = null;
      const ssePayload = [
        'data: {"type": "state", "state": "working", "label": "Reading image…"}\n\n',
        'data: {"type": "state", "state": "solving", "label": "Analyzing music theory…"}\n\n',
        'data: {"delta": "This is a C major 7th barre chord at the 3rd fret."}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        interceptedPayload = JSON.parse(opts.body);
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/event-stream' }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(ssePayload));
              controller.close();
            },
          }),
        };
      });

      try {
        const store = useAssistantStore.getState();
        store.addAttachment({
          id: 'att-img-1',
          name: 'cmaj7_fretboard.jpg',
          type: 'image/jpeg',
          size: 1024,
          dataUrl: 'data:image/jpeg;base64,mockdata',
        });

        const sendPromise = store.sendMessage('');
        // Right after sendMessage starts, initial label and working state are set
        const streamingMsg = useAssistantStore.getState().messages.find((m) => m.role === 'assistant');
        expect(streamingMsg?.statusLabel).toContain('Reading image');
        expect(streamingMsg?.activeState).toBe('working');

        await sendPromise;

        expect(interceptedPayload.prompt).toContain('Analyze this musical image');
        expect(interceptedPayload.attachments.length).toBe(1);
        expect(useAssistantStore.getState().messages[0].content).toBe('');
        expect(useAssistantStore.getState().messages[1].content).toContain('C major 7th barre chord');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('tracks backend-emitted state and status label in real time', async () => {
      const stateHistory: Array<{ state: string; label?: string | null }> = [];
      const ssePayload = [
        'data: {"type": "state", "state": "searching", "label": "Searching web…"}\n\n',
        'data: {"type": "state", "state": "solving", "label": "Analyzing music theory…"}\n\n',
        'data: {"type": "state", "state": "shaping", "label": "Shaping recommendations…"}\n\n',
        'data: {"delta": "Here are recommendations."}\n\n',
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

      const unsub = useAssistantStore.subscribe((state) => {
        stateHistory.push({ state: state.mascotState, label: state.statusLabel });
      });

      try {
        const store = useAssistantStore.getState();
        await store.sendMessage('Suggest scales over D Dorian');

        expect(stateHistory.some((s) => s.state === 'searching' && s.label === 'Searching web…')).toBe(true);
        expect(stateHistory.some((s) => s.state === 'solving' && s.label === 'Analyzing music theory…')).toBe(true);
        expect(stateHistory.some((s) => s.state === 'shaping' && s.label === 'Shaping recommendations…')).toBe(true);
      } finally {
        unsub();
        globalThis.fetch = originalFetch;
      }
    });
  });
});


