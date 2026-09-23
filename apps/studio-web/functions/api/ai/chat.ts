/**
 * Cloudflare Pages Function: Livex Music AI Edge Gateway
 * Route: /api/ai/chat (POST)
 *
 * Professional Music Assistant Backend:
 * - Google Gemini 2.5 Flash / 2.0 Flash with native Google Search Grounding
 * - Anthropic & OpenAI resilient fallback cascade
 * - Real-time lifecycle state emission ('searching' | 'solving' | 'composing' | 'completed')
 * - Grounding sources extraction and streaming
 * - Multimodal attachment processing (images, audio, sheet music)
 * - Strict professional musicologist persona: zero emojis, zero filler, dense technical reasoning
 */

interface Env {
  AI_ACTIVE_PROVIDER?: string; // 'gemini' | 'anthropic' | 'openai' | 'local'
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
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

const SYSTEM_PROMPT = `You are the Livex Music AI, an expert music theorist, multi-instrumentalist producer, audio engineer, and global musicologist.

Core Directives:
1. Conciseness & Directness:
   - Provide direct, dense, and technically rigorous musical answers.
   - Strictly do NOT use emojis or decorative icons anywhere in your response.
   - Strictly do NOT use conversational pleasantries, introductory filler (e.g. "Sure!", "Certainly!", "I would be happy to help", "Great question"), or conversational sign-offs (e.g. "Keep creating!", "Let me know if you need more help!").
   - Respond in the language used by the user (multilingual fluency in English, Spanish, Japanese, Portuguese, German, French, etc.).

2. Music Theory Rigor:
   - Always format chords with clean markdown backticks: e.g. \`Dbmaj9\`, \`F#m7(b5)\`, \`G7(#9)\`, \`C13\`.
   - Format harmonic analysis with Roman numerals and extensions: e.g. \`ii9 -> V13(b9) -> Imaj9\` or \`i -> bVImaj7 -> iv7 -> V7(b9)\`.
   - Detail voice leading, chord inversions, modal interchange, secondary dominants, and tritone substitutions with precision.

3. Instrument & Signal Chain Staging:
   - Electric Guitar / Bass: Specify exact pickup selection (e.g. "Neck single-coil with tone rolled to 7"), string gauge, tuning (Standard, Eb, Drop D, DADGAD), amplifier staging (gain, bass, mid, treble, presence dials), and exact serial pedal chain order: Dynamics (Comp/Wah) -> Preamp/Boost -> Overdrive/Fuzz -> Modulation -> Delay -> Reverb.
   - Drums: Detail specific groove rudiments, subdivision grids (16th swing %, triplets, linear fills), ghost-note placements, dynamic velocities, and drum shell/head tuning tensions.
   - Vocals: Address register management (chest, mixed, head, pharyngeal), passagio smoothing, breath compression, formant resonance, and intonation warmups.

4. Global Music & Scene Awareness:
   - Demonstrate deep, culturally nuanced understanding of music traditions and contemporary scenes worldwide:
     * Latin America & Mexico: Rock en español, Mexican alternative, Son Jarocho (jarana/requinto), Trova, Cumbia (sonidera, villera), Bossa Nova, Samba, Tango, Corrido Tumbado, Latin Jazz.
     * East Asia: Japanese Math-Rock, City Pop, Shibuya-kei, Visual Kei, J-Rock, Korean Indie/K-Rock.
     * Africa: Highlife, Afrobeat, Amapiano, Desert Blues (Tuareg guitar music like Tinariwen/Mdou Moctar), Soukous, Ethio-jazz.
     * Europe & UK: Shoegaze, Post-punk, Krautrock, NWOBHM, Progressive Metal, Nordic Folk/Metal.
     * North America & Diaspora: Bluegrass, Gospel, Delta/Chicago/Texas Blues, Motown, Neo-Soul, Hip-Hop production.
   - Treat international artists and local scenes with the same depth, accuracy, and technical respect as Western mainstream staples.
   - If asked about an obscure or emerging artist, analyze their instrumentation, lineage, musical scene, and stylistic predecessors accurately rather than making unsubstantiated claims.

5. Time-Sensitive & Current Music Facts:
   - When asked about recent artists, 2024-2026 releases, current lineups, tours, or newly released instruments and pedal gear, prioritize current and verified facts grounded in web search.`;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // 1. CORS Preflight & Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // 4. Provider Selection: Gemini (Primary with Google Search Grounding) -> Anthropic -> OpenAI
  const userApiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    (typeof body?.apiKey === 'string' ? body.apiKey.trim() : '');

  const geminiApiKey = userApiKey || env.GEMINI_API_KEY;
  const anthropicApiKey = env.ANTHROPIC_API_KEY;
  const openAiApiKey = env.OPENAI_API_KEY;

  const explicitProvider = env.AI_ACTIVE_PROVIDER;
  const hasGemini = Boolean(geminiApiKey);
  const hasAnthropic = Boolean(anthropicApiKey);
  const hasOpenAI = Boolean(openAiApiKey);

  const provider =
    explicitProvider ||
    (hasGemini ? 'gemini' : hasAnthropic ? 'anthropic' : hasOpenAI ? 'openai' : 'none');

  // =========================================================================
  // PROVIDER 1: GOOGLE GEMINI (2.5 Flash / 2.0 Flash + Google Search Grounding)
  // =========================================================================
  if ((provider === 'gemini' || !explicitProvider) && geminiApiKey) {
    try {
      const modelName = env.GEMINI_MODEL || 'gemini-2.5-flash';
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

      // Build conversation contents
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

          try {
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

                          // Emit standard delta token
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

            // Stream completed
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
      } else {
        const errorText = await response.text().catch(() => '');
        console.warn(`[Edge Gateway] Gemini API status ${response.status}:`, errorText);
      }
    } catch (err) {
      console.warn('[Edge Gateway] Gemini error, cascading to fallback:', err);
    }
  }

  // =========================================================================
  // PROVIDER 2: ANTHROPIC (Claude 3.5 Haiku Fallback)
  // =========================================================================
  if ((provider === 'anthropic' || hasAnthropic) && env.ANTHROPIC_API_KEY) {
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
  // PROVIDER 3: OPENAI (GPT-4o-mini Fallback)
  // =========================================================================
  if ((provider === 'openai' || hasOpenAI) && env.OPENAI_API_KEY) {
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
  // NO PROVIDER AVAILABLE / HONEST ERROR RESPONSE
  // =========================================================================
  return new Response(
    JSON.stringify({
      error:
        'AI Gateway: No AI provider is configured or available. Please configure GEMINI_API_KEY in your environment or enter your API key in Livex Assistant Settings.',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
