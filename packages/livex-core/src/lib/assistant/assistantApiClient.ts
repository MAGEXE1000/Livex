import {
  type AssistantMessage,
  type MusicalContextSnapshot,
  type StructuredRecommendation,
} from '../../types/assistant';
import { getFirebaseAuth } from '../firebase';
import { queryLocalMusicIntelligence } from './localMusicIntelligence';

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onRecommendation?: (recommendation: StructuredRecommendation) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface StreamChatOptions {
  prompt: string;
  history: AssistantMessage[];
  contextSnapshot?: MusicalContextSnapshot;
  signal?: AbortSignal;
  callbacks: StreamChatCallbacks;
}

/**
 * Streams chat completion from the Cloudflare Pages edge gateway,
 * falling back gracefully to Livex's built-in local music intelligence engine.
 */
export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const { prompt, history, contextSnapshot, signal, callbacks } = options;

  // Check cancellation before initiating
  if (signal?.aborted) {
    callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
    return;
  }

  // 1. Try Remote Edge Gateway if running in a supported web/production environment
  let remoteAttemptSucceeded = false;

  try {
    const rawUser = getFirebaseAuth()?.currentUser;
    const token = rawUser ? await rawUser.getIdToken().catch(() => null) : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
      prompt,
      history: history.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      context: contextSnapshot,
    };

    // Use a short connection timeout so offline musicians aren't left waiting
    const controller = new AbortController();
    const connectTimeout = setTimeout(() => controller.abort(), 3500);

    const abortHandler = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(connectTimeout);
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (signal?.aborted) {
          await reader.cancel().catch(() => {});
          callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') {
              callbacks.onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.delta) {
                callbacks.onToken(parsed.delta);
              }
              if (parsed.recommendation && callbacks.onRecommendation) {
                callbacks.onRecommendation(parsed.recommendation);
              }
            } catch {
              // Non-JSON SSE line, yield raw text delta
              callbacks.onToken(jsonStr);
            }
          }
        }
      }

      callbacks.onComplete();
      remoteAttemptSucceeded = true;
      return;
    }
  } catch (err: any) {
    if (signal?.aborted) {
      callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
      return;
    }
    // Remote gateway unreachable or timed out -> gracefully route to local intelligence
    remoteAttemptSucceeded = false;
  }

  // 2. Local Intelligence Engine Fallback (Instant & 100% offline capable)
  if (!remoteAttemptSucceeded) {
    await streamLocalIntelligence(prompt, contextSnapshot, signal, callbacks);
  }
}

/**
 * Simulates a natural chunked streaming cadence (15-25ms per word) for local intelligence
 * so the animated mascot, thinking orbs, and chat UI behave identically and smoothly.
 */
async function streamLocalIntelligence(
  prompt: string,
  contextSnapshot: MusicalContextSnapshot | undefined,
  signal: AbortSignal | undefined,
  callbacks: StreamChatCallbacks
): Promise<void> {
  const result = queryLocalMusicIntelligence(prompt, contextSnapshot);

  // Deliver structured recommendation cards
  if (result.recommendations && result.recommendations.length > 0) {
    for (const rec of result.recommendations) {
      callbacks.onRecommendation?.(rec);
    }
  }

  // Split into natural word chunks for progressive rendering
  const words = result.content.split(/(\s+)/);

  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) {
      callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
      return;
    }

    callbacks.onToken(words[i]);

    // Fast, organic cadence
    if (i % 2 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  }

  callbacks.onComplete();
}
