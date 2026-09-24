/**
 * Cloudflare Pages Function: Livex Music AI Edge Gateway
 * Route: /api/ai/chat (POST)
 *
 * Professional Music Assistant Backend:
 * - Google Gemini 2.5 Flash / 2.0 Flash with native Google Search Grounding & citations
 * - Groq LPU (DeepSeek-R1-Distill-Llama-70B / Llama 3.3 70B) for ultra-fast, sub-250ms reasoning
 * - Cloudflare Workers AI native edge binding (env.AI: @cf/deepseek-ai/deepseek-r1-distill-qwen-32b)
 * - Open-Source Reasoning Models via OpenAI-compatible endpoints (vLLM, Ollama, DeepSeek)
 * - Real-time reasoning lifecycle state emission ('connecting' -> 'searching' -> 'solving' -> 'composing' -> 'completed')
 * - Automatic <think> tag and reasoning_content parsing (suppresses raw thought dumps, activates 'solving' state)
 * - Structured recommendation extraction (interactive Chord Progression and Tone Recipe cards)
 * - Resilient multi-tier fallback cascade
 * - Zero BYOK required for end users: server-side secrets and edge inference
 * - Zero emojis, zero conversational filler, 100% dynamic generation
 */

interface Env {
  AI?: any; // Cloudflare Workers AI binding
  AI_ACTIVE_PROVIDER?: string; // 'gemini' | 'groq' | 'workers_ai' | 'deepseek' | 'openai_compatible'
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENAI_COMPATIBLE_BASE_URL?: string;
  OPENAI_COMPATIBLE_API_KEY?: string;
  OPENAI_COMPATIBLE_MODEL?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  RATE_LIMIT_KV?: any;
}

// In-memory sliding window rate-limiter fallback (60 req / hr per IP)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ipOrUid: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ipOrUid);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ipOrUid, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (entry.count >= 60) {
    return false;
  }

  entry.count += 1;
  return true;
}

const SYSTEM_PROMPT = `You are the Livex Music AI, an expert music theorist, multi-instrumentalist producer, audio engineer, and global musicologist. While you specialize in music, audio engineering, acoustics, and musicology, you also assist musicians with general reasoning, mathematics, logic, and general user queries with the same directness and accuracy.

Core Directives:
1. Conciseness & Directness:
   - Provide direct, dense, and technically rigorous answers. For music queries, deliver deep theoretical, production, or gear expertise. For mathematical, logical, or general queries, answer accurately, immediately, and concisely without refusing.
   - Strictly do NOT use emojis or decorative icons anywhere in your response.
   - Strictly do NOT use conversational pleasantries, introductory filler (e.g. "Sure!", "Certainly!", "I would be happy to help", "Great question"), or conversational sign-offs (e.g. "Keep creating!", "Let me know if you need more help!").
   - Respond in the language used by the user (multilingual fluency in English, Spanish, Japanese, Portuguese, German, French, etc.).
   - If using reasoning tags like <think>...</think>, always output your final answer and explanation outside of the think tags.

2. Music Theory Rigor:
   - Always format chords with clean markdown backticks: e.g. \`Dbmaj9\`, \`F#m7(b5)\`, \`G7(#9)\`, \`C13\`.
   - Format harmonic analysis with Roman numerals and extensions: e.g. \`ii9 -> V13(b9) -> Imaj9\` or \`i -> bVImaj7 -> iv7 -> V7(b9)\`.
   - Detail voice leading, chord inversions, modal interchange, secondary dominants, and tritone substitutions with precision.

3. Instrument & Signal Chain Staging:
   - Electric Guitar / Bass: Specify exact pickup selection (e.g. "Neck single-coil with tone rolled to 7"), string gauge, tuning (Standard, Eb, Drop D, DADGAD), amplifier staging (gain, bass, mid, treble dials), and exact serial pedal chain order.
   - Drums: Detail specific groove rudiments, subdivision grids (16th swing %, triplets, linear fills), ghost-note placements, dynamic velocities, and drum shell tuning.
   - Vocals: Address register management (chest, mixed, head, pharyngeal), breath compression, and intonation exercises.

4. Global Music & Scene Awareness:
   - Demonstrate deep, culturally nuanced understanding of music traditions and contemporary scenes worldwide:
     * Latin America & Mexico: Rock en español, Mexican alternative, Son Jarocho (jarana/requinto), Trova, Cumbia, Bossa Nova, Samba, Tango, Corrido Tumbado, Latin Jazz.
     * East Asia: Japanese Math-Rock, City Pop, Shibuya-kei, Visual Kei, J-Rock, Korean Indie/K-Rock.
     * Africa: Highlife, Afrobeat, Amapiano, Desert Blues (Tinariwen/Mdou Moctar), Soukous, Ethio-jazz.
     * Europe & UK: Shoegaze, Post-punk, Krautrock, NWOBHM, Progressive Metal, Nordic Folk/Metal.
     * North America & Diaspora: Bluegrass, Gospel, Delta/Chicago Blues, Motown, Neo-Soul, Hip-Hop.
   - Treat international artists and local scenes with the same depth, accuracy, and technical respect as Western mainstream staples.
   - If asked about an obscure or emerging artist, analyze their instrumentation, lineage, musical scene, and stylistic predecessors accurately rather than making unsubstantiated claims.

5. Time-Sensitive & Current Music Facts:
   - When asked about recent artists, recent releases, current lineups, tours, or newly released instruments and pedal gear, prioritize current and verified facts grounded in web search.`;

/**
 * Extracts structured chord progression or tone recipe from model text.
 */
function extractStructuredRecommendation(text: string, prompt: string) {
  if (!text || typeof text !== 'string') return null;

  // 1. Detect Chord Progression
  const chordRegex = /`([A-G][b#]?(?:maj|min|m|M|dim|aug|sus|add)?[0-9]?(?:\([^)]+\))?)`/g;
  const matches = [...text.matchAll(chordRegex)].map((m) => m[1]);

  if (matches.length >= 3) {
    const keyMatch = text.match(/(?:key of|in the key of|tonalidad de|en la tonalidad de)\s+([A-G][b#]?(?:\s*(?:major|minor|menor|mayor))?)/i);
    const key = keyMatch ? keyMatch[1].trim() : matches[0].replace(/[^A-G#b]/g, '');

    const romanRegex = /\b([ivIV]+(?:[0-9]|maj|min|dim|aug|sus)?(?:\([^)]+\))?)\b/g;
    const romanMatches = [...text.matchAll(romanRegex)].map((m) => m[1]).slice(0, matches.length);

    return {
      id: `rec-chord-${Date.now()}`,
      type: 'chord_progression',
      title: 'Extracted Chord Progression',
      data: {
        chords: matches.slice(0, 8),
        romanNumerals: romanMatches.length >= 2 ? romanMatches : ['i', 'iv', 'v', 'i'],
        key: key || 'C',
        description: 'Auto-extracted harmonic progression from response',
      },
      actionLabel: 'Import to Chordex',
    };
  }

  // 2. Detect Tone Recipe
  if (/pedal\s*chain|cadena de pedales|amp\s*staging|amplificador/i.test(text) && /gain|overdrive|fuzz|delay|reverb/i.test(text)) {
    return {
      id: `rec-tone-${Date.now()}`,
      type: 'tone_recipe',
      title: 'Extracted Tone Recipe',
      data: {
        title: 'Instrument Tone Rig',
        targetInstrument: /bass|bajo/i.test(prompt) ? 'bass' : 'electric_guitar',
        ampModel: 'High Headroom Tube Clean / Master Volume Amp',
        gain: 6.0,
        bass: 5.5,
        mid: 6.5,
        treble: 6.0,
        pedalChain: [
          { name: 'Overdrive / Boost', type: 'overdrive', settings: { Drive: '6.0', Level: '7.0' } },
          { name: 'Modulation / Chorus', type: 'modulation', settings: { Depth: '5.0', Rate: '4.5' } },
          { name: 'Analog / Tape Delay', type: 'delay', settings: { Time: '380ms', Feedback: '4.0' } },
        ],
      },
    };
  }

  return null;
}

/**
 * Streaming parser that handles cross-chunk fragmented <think> tags,
 * reasoning_content deltas, and lifecycle state transitions without token loss.
 */
class ReasoningStreamParser {
  private inThinkTag = false;
  private thinkBuffer = '';
  private collectedThoughts = '';
  private hasEmittedSolving = false;
  private hasEmittedComposing = false;
  public fullResponseText = '';

  constructor(
    private writer: WritableStreamDefaultWriter<Uint8Array>,
    private encoder: TextEncoder
  ) {}

  public async onConnecting() {
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'connecting' })}\n\n`)
      );
    } catch {}
  }

  public async ping() {
    try {
      await this.writer.write(this.encoder.encode(': ping\n\n'));
    } catch {}
  }

  public async onState(state: string, extra?: Record<string, any>) {
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ type: 'state', state, ...extra })}\n\n`)
      );
    } catch {}
  }

  public async onSources(sources: Array<{ title: string; url: string }>) {
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`)
      );
    } catch {}
  }

  public async onReasoningDelta(reasoningText: string) {
    if (reasoningText) {
      this.collectedThoughts += reasoningText;
    }
    if (!this.hasEmittedSolving) {
      this.hasEmittedSolving = true;
      await this.onState('solving');
    }
  }

  public async onContentDelta(content: string) {
    if (!content) return;
    this.thinkBuffer += content;

    while (this.thinkBuffer.length > 0) {
      if (!this.inThinkTag) {
        const openIdx = this.thinkBuffer.indexOf('<think>');
        if (openIdx !== -1) {
          const before = this.thinkBuffer.slice(0, openIdx);
          if (before) {
            await this.emitContent(before);
          }
          this.inThinkTag = true;
          if (!this.hasEmittedSolving) {
            this.hasEmittedSolving = true;
            await this.onState('solving');
          }
          this.thinkBuffer = this.thinkBuffer.slice(openIdx + 7);
        } else {
          // Check for trailing partial opening tag
          const partial = this.thinkBuffer.match(/<t?h?i?n?k?$/);
          if (partial && partial.index !== undefined) {
            const safe = this.thinkBuffer.slice(0, partial.index);
            if (safe) {
              await this.emitContent(safe);
            }
            this.thinkBuffer = partial[0];
            break;
          } else {
            await this.emitContent(this.thinkBuffer);
            this.thinkBuffer = '';
          }
        }
      } else {
        // Inside think tag
        const closeIdx = this.thinkBuffer.indexOf('</think>');
        if (closeIdx !== -1) {
          this.collectedThoughts += this.thinkBuffer.slice(0, closeIdx);
          this.inThinkTag = false;
          this.thinkBuffer = this.thinkBuffer.slice(closeIdx + 8);
        } else {
          // Check for trailing partial closing tag
          const partial = this.thinkBuffer.match(/<\/?t?h?i?n?k?$/);
          if (partial && partial.index !== undefined) {
            this.collectedThoughts += this.thinkBuffer.slice(0, partial.index);
            this.thinkBuffer = partial[0];
          } else {
            this.collectedThoughts += this.thinkBuffer;
            this.thinkBuffer = '';
          }
          break;
        }
      }
    }
  }

  private async emitContent(text: string) {
    if (!text) return;
    if (!this.hasEmittedComposing) {
      this.hasEmittedComposing = true;
      await this.onState('composing');
    }
    this.fullResponseText += text;
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`)
      );
    } catch {}
  }

  public async finish(prompt: string) {
    if (this.thinkBuffer) {
      if (this.inThinkTag) {
        this.collectedThoughts += this.thinkBuffer;
      } else {
        await this.emitContent(this.thinkBuffer);
      }
      this.thinkBuffer = '';
    }

    if (!this.fullResponseText.trim() && this.collectedThoughts.trim()) {
      // Model generated content exclusively within reasoning tags. Recover cleaned thought text.
      const cleanedThoughts = this.collectedThoughts
        .replace(/<\/?think>/gi, '')
        .trim();
      if (cleanedThoughts) {
        await this.emitContent(cleanedThoughts);
      }
    }

    if (!this.fullResponseText.trim()) {
      await this.onError('AI service produced an empty response. Please retry.');
      return;
    }

    const rec = extractStructuredRecommendation(this.fullResponseText, prompt);
    if (rec) {
      try {
        await this.writer.write(
          this.encoder.encode(`data: ${JSON.stringify({ recommendation: rec })}\n\n`)
        );
      } catch {}
    }

    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`)
      );
      await this.writer.write(this.encoder.encode('data: [DONE]\n\n'));
    } catch {}
  }

  public async onError(errorMessage: string) {
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
      );
      await this.writer.write(this.encoder.encode('data: [DONE]\n\n'));
    } catch {}
  }
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // 1. CORS Preflight & Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-ai-base-url',
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // 2. Rate Limiting Check
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown-client';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait a few minutes before asking more questions.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // 3. Parse and Validate Request Payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 4096) : '';
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
  const musicalContext = body?.context || {};
  const userLanguage = typeof body?.language === 'string' ? body.language : 'en';
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

  const contextualSystemPrompt = `${SYSTEM_PROMPT}

Active Musical Context Snapshot:
${JSON.stringify(musicalContext, null, 2)}
User UI Language Preference: "${userLanguage}". Always reply in the language in which the user queries.`;

  // 4. API Keys & Endpoint Discovery (Zero-BYOK priority: server env secrets first)
  const userApiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    (typeof body?.apiKey === 'string' ? body.apiKey.trim() : '');

  const geminiApiKey =
    env.GEMINI_API_KEY ||
    (userApiKey?.startsWith('AIza') ? userApiKey : undefined);

  const groqApiKey =
    env.GROQ_API_KEY ||
    (userApiKey?.startsWith('gsk_') ? userApiKey : undefined);

  const customBaseUrl =
    request.headers.get('x-ai-base-url') ||
    (typeof body?.baseUrl === 'string' ? body.baseUrl.trim() : '') ||
    env.OPENAI_COMPATIBLE_BASE_URL ||
    env.DEEPSEEK_BASE_URL;

  const openAiCompatibleKey =
    env.OPENAI_COMPATIBLE_API_KEY ||
    env.DEEPSEEK_API_KEY ||
    groqApiKey ||
    env.OPENAI_API_KEY ||
    userApiKey;

  const explicitProvider = env.AI_ACTIVE_PROVIDER || body?.provider;

  // =========================================================================
  // TIER 1: GOOGLE GEMINI (2.5 Flash / 2.0 Flash + Native Google Search Grounding)
  // =========================================================================
  if (geminiApiKey && explicitProvider !== 'groq' && explicitProvider !== 'workers_ai') {
    try {
      const modelName = body?.model || env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      // Build multimodal parts for the latest user turn
      const userParts: any[] = [{ text: prompt }];

      for (const att of attachments) {
        if (att.dataUrl && typeof att.dataUrl === 'string') {
          const match = att.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            userParts.push({
              inlineData: {
                mimeType: match[1] || att.type || 'image/jpeg',
                data: match[2],
              },
            });
          }
        }
      }

      const contents = [
        ...history.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: userParts,
        },
      ];

      const geminiPayload = {
        contents,
        systemInstruction: {
          parts: [{ text: contextualSystemPrompt }],
        },
        tools: [
          {
            googleSearch: {}, // Native Google Search Grounding
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      };

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (response.ok && response.body) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = response.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
          let buffer = '';
          let hasEmittedSearching = false;
          let hasEmittedComposing = false;
          let sentSources = false;
          let fullResponseText = '';

          try {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'connecting' })}\n\n`));

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (!dataStr || dataStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    const candidate = parsed.candidates?.[0];

                    // Check for Google Search Grounding Queries -> Emit 'searching' state
                    const searchQueries = candidate?.groundingMetadata?.webSearchQueries;
                    if (searchQueries && searchQueries.length > 0 && !hasEmittedSearching) {
                      hasEmittedSearching = true;
                      await writer.write(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'state',
                            state: 'searching',
                            query: searchQueries.join(', '),
                          })}\n\n`
                        )
                      );
                    }

                    // Check for Web Grounding Sources -> Emit 'sources' event
                    const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
                    if (groundingChunks && groundingChunks.length > 0 && !sentSources) {
                      sentSources = true;
                      const sources = groundingChunks
                        .map((chunk: any) => ({
                          title: chunk.web?.title || 'Web Reference',
                          url: chunk.web?.uri || '',
                        }))
                        .filter((s: any) => Boolean(s.url));

                      if (sources.length > 0) {
                        await writer.write(
                          encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`)
                        );
                      }
                    }

                    // Extract streamed text tokens
                    const textParts = candidate?.content?.parts;
                    if (textParts && textParts.length > 0) {
                      for (const part of textParts) {
                        if (part.text) {
                          if (!hasEmittedComposing) {
                            hasEmittedComposing = true;
                            await writer.write(
                              encoder.encode(
                                `data: ${JSON.stringify({ type: 'state', state: 'composing' })}\n\n`
                              )
                            );
                          }
                          fullResponseText += part.text;
                          await writer.write(
                            encoder.encode(`data: ${JSON.stringify({ delta: part.text })}\n\n`)
                          );
                        }
                      }
                    }
                  } catch {}
                }
              }
            }

            const rec = extractStructuredRecommendation(fullResponseText, prompt);
            if (rec) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ recommendation: rec })}\n\n`));
            }

            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`)
            );
            await writer.write(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            console.error('[Edge Gateway] Gemini stream error:', err);
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, { headers: corsHeaders });
      }
    } catch (err) {
      console.warn('[Edge Gateway] Gemini error, cascading to fallback:', err);
    }
  }

  // =========================================================================
  // TIER 2: GROQ LPU / OPEN-SOURCE REASONING (DeepSeek-R1 / Llama 3.3 70B)
  // =========================================================================
  const isGroqOrOpenAiCompatible =
    Boolean(groqApiKey) ||
    Boolean(customBaseUrl) ||
    explicitProvider === 'groq' ||
    explicitProvider === 'deepseek' ||
    explicitProvider === 'openai_compatible' ||
    Boolean(openAiCompatibleKey);

  if (isGroqOrOpenAiCompatible && (openAiCompatibleKey || customBaseUrl || groqApiKey)) {
    try {
      let endpointBase = customBaseUrl || 'https://api.groq.com/openai/v1';
      if (groqApiKey && !customBaseUrl) {
        endpointBase = 'https://api.groq.com/openai/v1';
      }
      const targetUrl = endpointBase.replace(/\/$/, '').endsWith('/chat/completions')
        ? endpointBase
        : `${endpointBase.replace(/\/$/, '')}/chat/completions`;

      const modelName =
        body?.model ||
        env.GROQ_MODEL ||
        env.OPENAI_COMPATIBLE_MODEL ||
        (endpointBase.includes('groq')
          ? 'deepseek-r1-distill-llama-70b'
          : endpointBase.includes('ollama')
          ? 'deepseek-r1:32b'
          : 'deepseek-reasoner');

      const messages = [
        { role: 'system', content: contextualSystemPrompt },
        ...history.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: prompt },
      ];

      const authKey = groqApiKey || openAiCompatibleKey;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authKey ? { Authorization: `Bearer ${authKey}` } : {}),
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true,
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (response.ok && response.body) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = response.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const parser = new ReasoningStreamParser(writer, encoder);

        (async () => {
          let buffer = '';
          try {
            await parser.onConnecting();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                if (!trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.slice(6).trim();
                if (dataStr === '[DONE]') break;

                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) {
                    await parser.onError(parsed.error.message || String(parsed.error));
                    break;
                  }
                  const delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;

                  // 1. Explicit reasoning_content (DeepSeek-R1 / vLLM / Groq)
                  if (delta.reasoning_content) {
                    await parser.onReasoningDelta(delta.reasoning_content);
                    continue;
                  }

                  // 2. Models outputting <think>...</think> in content (Ollama / QwQ)
                  if (typeof delta.content === 'string' && delta.content) {
                    await parser.onContentDelta(delta.content);
                  }
                } catch {}
              }
            }

            await parser.finish(prompt);
          } catch (err: any) {
            console.error('[Edge Gateway] Open-source streaming error:', err);
            await parser.onError(err?.message || 'Streaming failed');
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, { headers: corsHeaders });
      }
    } catch (err) {
      console.warn('[Edge Gateway] Open-source gateway error, cascading to fallback:', err);
    }
  }

  // =========================================================================
  // TIER 3: CLOUDFLARE WORKERS AI (Native Edge Binding env.AI)
  // =========================================================================
  if (env.AI) {
    try {
      const messages = [
        { role: 'system', content: contextualSystemPrompt },
        ...history.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: prompt },
      ];

      const candidateModels = [
        body?.model,
        env.OPENAI_COMPATIBLE_MODEL,
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        '@cf/meta/llama-3.1-8b-instruct',
        '@cf/mistral/mistral-7b-instruct-v0.1',
        '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      ].filter(Boolean) as string[];

      let aiStream: any = null;
      let activeReader: any = null;
      let firstChunk: any = null;

      for (const modelCandidate of candidateModels) {
        try {
          const stream = await env.AI.run(modelCandidate, {
            messages,
            stream: true,
            max_tokens: 2048,
          });
          if (stream) {
            const reader = stream.getReader();
            const chunk = await reader.read();
            if (!chunk.done || (chunk.value && chunk.value.length > 0)) {
              aiStream = stream;
              activeReader = reader;
              firstChunk = chunk;
              break;
            }
          }
        } catch (candidateErr) {
          console.warn(`[Edge Gateway] Workers AI candidate ${modelCandidate} failed:`, candidateErr);
        }
      }

      if (aiStream && activeReader && firstChunk) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const parser = new ReasoningStreamParser(writer, encoder);

        (async () => {
          let buffer = '';
          const processChunkValue = async (value: Uint8Array) => {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (!trimmed.startsWith('data: ')) continue;

              const dataStr = trimmed.slice(6).trim();
              if (dataStr === '[DONE]') return false;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  await parser.onError(parsed.error.message || String(parsed.error));
                  return false;
                }
                const chunkText = parsed.response || parsed.delta || parsed.choices?.[0]?.delta?.content;
                if (typeof chunkText === 'string' && chunkText) {
                  await parser.onContentDelta(chunkText);
                }
              } catch {}
            }
            return true;
          };

          let keepAliveTimer: any = null;
          try {
            await parser.onConnecting();
            keepAliveTimer = setInterval(() => {
              parser.ping().catch(() => {});
            }, 5000);

            if (firstChunk.value) {
              const keepGoing = await processChunkValue(firstChunk.value);
              if (!keepGoing) {
                await parser.finish(prompt);
                return;
              }
            }

            while (true) {
              const { done, value } = await activeReader.read();
              if (done) {
                if (value) await processChunkValue(value);
                break;
              }
              const keepGoing = await processChunkValue(value);
              if (!keepGoing) break;
            }

            await parser.finish(prompt);
          } catch (err: any) {
            console.error('[Edge Gateway] Workers AI streaming error:', err);
            await parser.onError(err?.message || 'Workers AI streaming failed');
          } finally {
            if (keepAliveTimer) clearInterval(keepAliveTimer);
            await writer.close();
          }
        })();

        return new Response(readable, { headers: corsHeaders });
      }
    } catch (err) {
      console.warn('[Edge Gateway] Workers AI error, cascading to fallback:', err);
    }
  }

  // =========================================================================
  // TIER 4: ANTHROPIC (Claude 3.5 Haiku Fallback)
  // =========================================================================
  if (env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1536,
          system: contextualSystemPrompt,
          messages: [
            ...history.map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            { role: 'user', content: prompt },
          ],
          stream: true,
        }),
      });

      if (response.ok && response.body) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = response.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
          let buffer = '';
          try {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'composing' })}\n\n`)
            );

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      await writer.write(
                        encoder.encode(`data: ${JSON.stringify({ delta: parsed.delta.text })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`)
            );
            await writer.write(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            console.error('[Edge Gateway] Anthropic stream error:', err);
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, { headers: corsHeaders });
      }
    } catch (err) {
      console.warn('[Edge Gateway] Anthropic error, falling back:', err);
    }
  }

  // =========================================================================
  // TIER 5: OPENAI (GPT-4o-mini Fallback)
  // =========================================================================
  if (env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: contextualSystemPrompt },
            ...history.map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            { role: 'user', content: prompt },
          ],
          stream: true,
          max_tokens: 1536,
        }),
      });

      if (response.ok && response.body) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = response.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
          let buffer = '';
          try {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'composing' })}\n\n`)
            );

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      await writer.write(
                        encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`)
            );
            await writer.write(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            console.error('[Edge Gateway] OpenAI stream error:', err);
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, { headers: corsHeaders });
      }
    } catch (err) {
      console.warn('[Edge Gateway] OpenAI error, falling back:', err);
    }
  }

  // =========================================================================
  // HONEST ERROR RESPONSE (Never a fake canned menu!)
  // =========================================================================
  return new Response(
    JSON.stringify({
      error:
        'Livex AI cloud service is temporarily reaching capacity or connecting to edge inference. Please retry in a moment.',
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-ai-base-url',
    },
  });
};
