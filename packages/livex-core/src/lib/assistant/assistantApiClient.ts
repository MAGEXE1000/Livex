import {
  type AssistantMessage,
  type AssistantAttachment,
  type AssistantState,
  type MusicalContextSnapshot,
  type StructuredRecommendation,
  type GroundingSource,
} from '../../types/assistant';
import { getFirebaseAuth } from '../firebase';

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onRecommendation?: (recommendation: StructuredRecommendation) => void;
  onStateChange?: (state: AssistantState) => void;
  onSources?: (sources: GroundingSource[]) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface StreamChatOptions {
  prompt: string;
  history: AssistantMessage[];
  contextSnapshot?: MusicalContextSnapshot;
  language?: string;
  attachments?: AssistantAttachment[];
  apiKey?: string;
  gatewayUrl?: string;
  model?: string;
  signal?: AbortSignal;
  callbacks: StreamChatCallbacks;
}

/**
 * Resolves the remote gateway endpoint.
 * In development preview (`pnpm dev:mobile` / `pnpm dev:web`), requests route to
 * the local Vite dev server endpoint `/api/ai/chat`.
 * In native Capacitor/Android, it routes to `VITE_AI_GATEWAY_URL` or production host.
 */
export function resolveAiGatewayUrl(customGatewayUrl?: string): string {
  if (customGatewayUrl && customGatewayUrl.trim()) {
    const trimmed = customGatewayUrl.trim();
    return trimmed.endsWith('/api/ai/chat')
      ? trimmed
      : trimmed.replace(/\/$/, '') + '/api/ai/chat';
  }

  const envUrl = (import.meta as any).env?.VITE_AI_GATEWAY_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim();
    return trimmed.endsWith('/api/ai/chat')
      ? trimmed
      : trimmed.replace(/\/$/, '') + '/api/ai/chat';
  }

  // Detect native Android / Capacitor environment (installed native APK)
  const isNative =
    typeof window !== 'undefined' &&
    (Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      window.location?.protocol === 'capacitor:');

  if (isNative) {
    // When running inside native Android APK, default to the production host
    return 'https://studio-30f44.web.app/api/ai/chat';
  }

  // In Node test environment or server-side without window origin
  if (typeof window === 'undefined' || !window.location?.origin || window.location.origin === 'null') {
    return 'http://127.0.0.1:5174/api/ai/chat';
  }

  // In browser web preview (Vite dev server or production web)
  return '/api/ai/chat';
}

/**
 * Streams chat completion directly from the live AI model via edge gateway.
 * Emits real lifecycle states ('connecting' -> 'searching' -> 'solving' -> 'composing' -> 'completed')
 * directly into ThinkingOrb, with zero artificial delays and honest error propagation.
 */
export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const { prompt, history, contextSnapshot, signal, callbacks, apiKey, gatewayUrl } = options;

  // Check cancellation before initiating
  if (signal?.aborted) {
    callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
    return;
  }

  const targetUrl = resolveAiGatewayUrl(gatewayUrl);

  try {
    callbacks.onStateChange?.('connecting');

    const rawUser = getFirebaseAuth()?.currentUser;
    const token = rawUser ? await rawUser.getIdToken().catch(() => null) : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const payload = {
      prompt,
      history: history.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      context: contextSnapshot,
      language: options.language || 'en',
      apiKey: apiKey || undefined,
      model: options.model || undefined,
      attachments: options.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
        dataUrl: a.dataUrl,
      })),
    };

    // 25-second connection watchdog to accommodate cold starts and deep reasoning
    const controller = new AbortController();
    const connectTimeout = setTimeout(() => controller.abort(), 25000);

    const abortHandler = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    const response = await fetch(targetUrl, {
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

    if (!response.ok) {
      let errorDetail = `Gateway returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.error) {
          errorDetail = errJson.error;
        }
      } catch {
        const errText = await response.text().catch(() => '');
        if (errText) {
          errorDetail = errText.slice(0, 240);
        }
      }
      callbacks.onError(new Error(errorDetail));
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      // Check if server returned a non-stream JSON response or error
      try {
        const json = await response.json();
        if (json?.error) {
          callbacks.onError(new Error(json.error));
          return;
        }
        if (json?.content) {
          callbacks.onToken(json.content);
          callbacks.onComplete();
          return;
        }
      } catch {}
      callbacks.onError(new Error(`Unexpected response format from gateway: ${contentType || 'unknown'}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('Streaming response body is unavailable.'));
      return;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let hasReceivedToken = false;

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

            if (parsed.error) {
              callbacks.onError(new Error(parsed.error));
              return;
            }

            if (parsed.type === 'state' && parsed.state) {
              callbacks.onStateChange?.(parsed.state);
            }

            if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
              callbacks.onSources?.(parsed.sources);
            }

            if (parsed.delta) {
              if (!hasReceivedToken) {
                hasReceivedToken = true;
                callbacks.onStateChange?.('composing');
              }
              callbacks.onToken(parsed.delta);
            }

            if (parsed.recommendation) {
              callbacks.onRecommendation?.(parsed.recommendation);
            }
          } catch {
            if (jsonStr) {
              callbacks.onToken(jsonStr);
            }
          }
        }
      }
    }

    callbacks.onComplete();
  } catch (err: any) {
    if (signal?.aborted) {
      callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
      return;
    }
    const message = err?.message || 'Connection to AI gateway failed. Please check network and retry.';
    callbacks.onError(new Error(message));
  }
}
