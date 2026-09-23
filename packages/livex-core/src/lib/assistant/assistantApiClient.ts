import {
  type AssistantMessage,
  type MusicalContextSnapshot,
  type StructuredRecommendation,
} from '../../types/assistant';
import { getFirebaseAuth } from '../firebase';
import { queryLocalMusicIntelligence, type LocalIntelligenceResponse } from './localMusicIntelligence';

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

interface CachedResponse {
  content: string;
  recommendations: StructuredRecommendation[];
  timestamp: number;
}

// In-memory query cache for instant, zero-latency repeated queries
const responseCache = new Map<string, CachedResponse>();
const MAX_CACHE_ENTRIES = 16;

function getCacheKey(prompt: string, context?: MusicalContextSnapshot): string {
  const normPrompt = prompt.trim().toLowerCase();
  const app = context?.activeApp || 'hub';
  const key = context?.activeKey || '';
  return `${normPrompt}::${app}::${key}`;
}

/**
 * Resolves the remote gateway endpoint.
 * In native Capacitor/Android environments without an explicit VITE_AI_GATEWAY_URL,
 * /api/ai/chat does not exist on localhost. Skipping immediately avoids a 3.5s timeout.
 */
function getRemoteGatewayUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const envUrl = (import.meta as any).env?.VITE_AI_GATEWAY_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '') + '/api/ai/chat';
  }

  // Detect native Android / Capacitor environment
  const isNative =
    (window as any).Capacitor?.isNativePlatform?.() ||
    (import.meta as any).env?.VITE_APP_TARGET === 'android' ||
    window.location?.protocol === 'capacitor:';

  if (isNative) {
    return null;
  }

  // On browser web (Cloudflare Pages), relative /api/ai/chat is supported
  return '/api/ai/chat';
}

/**
 * Streams chat completion from the remote edge gateway when available,
 * falling back instantly to Livex's built-in local music intelligence engine.
 */
export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const { prompt, history, contextSnapshot, signal, callbacks } = options;

  // Check cancellation before initiating
  if (signal?.aborted) {
    callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
    return;
  }

  // Check cache for instant delivery
  const cacheKey = getCacheKey(prompt, contextSnapshot);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) {
    // 5-minute fresh cache
    await streamResponseData(cached, signal, callbacks);
    return;
  }

  const gatewayUrl = getRemoteGatewayUrl();
  let remoteAttemptSucceeded = false;

  // 1. Try Remote Edge Gateway if endpoint is available
  if (gatewayUrl) {
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
        history: history.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        context: contextSnapshot,
      };

      // Tight connection timeout (800ms) to prevent perceived latency on slow networks
      const controller = new AbortController();
      const connectTimeout = setTimeout(() => controller.abort(), 800);

      const abortHandler = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      const response = await fetch(gatewayUrl, {
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

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && response.body && contentType.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullContent = '';
        const collectedRecs: StructuredRecommendation[] = [];

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
                if (fullContent) {
                  cacheResponse(cacheKey, {
                    content: fullContent,
                    recommendations: collectedRecs,
                    timestamp: Date.now(),
                  });
                }
                callbacks.onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.delta) {
                  fullContent += parsed.delta;
                  callbacks.onToken(parsed.delta);
                }
                if (parsed.recommendation) {
                  collectedRecs.push(parsed.recommendation);
                  callbacks.onRecommendation?.(parsed.recommendation);
                }
              } catch {
                fullContent += jsonStr;
                callbacks.onToken(jsonStr);
              }
            }
          }
        }

        if (fullContent) {
          cacheResponse(cacheKey, {
            content: fullContent,
            recommendations: collectedRecs,
            timestamp: Date.now(),
          });
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
      remoteAttemptSucceeded = false;
    }
  }

  // 2. Local Intelligence Engine Fallback (Instant, 100% offline & zero artificial delay)
  if (!remoteAttemptSucceeded) {
    const result = queryLocalMusicIntelligence(prompt, contextSnapshot);
    cacheResponse(cacheKey, {
      content: result.content,
      recommendations: result.recommendations,
      timestamp: Date.now(),
    });
    await streamResponseData(result, signal, callbacks);
  }
}

function cacheResponse(key: string, data: CachedResponse): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, data);
}

/**
 * Progressively streams structured content to the UI with micro-batch chunking.
 * Completely free of artificial setTimeout sleeps.
 */
async function streamResponseData(
  result: LocalIntelligenceResponse,
  signal: AbortSignal | undefined,
  callbacks: StreamChatCallbacks
): Promise<void> {
  // Deliver recommendations immediately
  if (result.recommendations && result.recommendations.length > 0) {
    for (const rec of result.recommendations) {
      callbacks.onRecommendation?.(rec);
    }
  }

  // Natural chunk stream: batch small word groups per frame for smooth 60-120fps UI rendering
  const words = result.content.split(/(\s+)/);
  const CHUNK_SIZE = 4;

  const nextFrame =
    typeof requestAnimationFrame === 'function'
      ? () => new Promise<void>((r) => requestAnimationFrame(() => r()))
      : () => new Promise<void>((r) => setTimeout(r, 0));

  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    if (signal?.aborted) {
      callbacks.onError(new DOMException('Aborted by user', 'AbortError'));
      return;
    }

    const chunk = words.slice(i, i + CHUNK_SIZE).join('');
    callbacks.onToken(chunk);

    // Yield control to render frame without blocking
    if (i + CHUNK_SIZE < words.length) {
      await nextFrame();
    }
  }

  callbacks.onComplete();
}
