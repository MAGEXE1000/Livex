/**
 * Cloudflare Pages Function: Livex Music AI Edge Gateway
 * Route: /api/ai/chat (POST)
 */

interface Env {
  AI_ACTIVE_PROVIDER?: string; // 'anthropic' | 'openai' | 'gemini'
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  RATE_LIMIT_KV?: any;
}

// In-memory sliding window rate-limiter fallback
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ipOrUid: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ipOrUid);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ipOrUid, { count: 1, resetAt: now + 3600000 }); // 1 hour
    return true;
  }

  if (entry.count >= 60) {
    return false; // Rate limit exceeded (60 req / hr)
  }

  entry.count += 1;
  return true;
}

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

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 2048) : '';
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  const musicalContext = body?.context || {};

  const systemPrompt = `You are the Livex Music AI Assistant, a professional music theorist, audio engineer, and studio advisor.
Active musical context: ${JSON.stringify(musicalContext)}.

Directives:
- Provide direct, concise, and technically accurate musical answers.
- Respond in the language used by the user.
- Strictly do NOT use emojis or decorative icons anywhere in your response.
- Do NOT use conversational pleasantries, introductory filler (e.g. "Sure!", "Certainly!", "I would be happy to help"), or conversational sign-offs (e.g. "Keep creating!", "Let me know if you need more help!").
- Format chords with clean markdown backticks (e.g. \`Dbmaj9\`, \`G7(b9)\`).
- Format harmonic analysis with Roman numerals (e.g. \`ii9 -> V13 -> Imaj9\`).
- When asked for amplifier settings or pedal chains, specify exact parameter values and signal path order.
- Maintain high information density and professional studio tone at all times.`;

  // 4. Upstream Provider Selection
  const provider = env.AI_ACTIVE_PROVIDER || (env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : 'local');

  // Anthropic Provider Branch (claude-3-5-haiku-20241022)
  if (provider === 'anthropic' && env.ANTHROPIC_API_KEY) {
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
          max_tokens: 1024,
          system: systemPrompt,
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
      console.warn('[Edge Gateway] Anthropic error, falling back to local intelligence:', err);
    }
  }

  // OpenAI Provider Branch (gpt-4o-mini)
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            { role: 'user', content: prompt },
          ],
          stream: true,
          max_tokens: 1024,
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
      console.warn('[Edge Gateway] OpenAI error:', err);
    }
  }

  // 5. Built-in Edge Stream Fallback (Concise, technical, emoji-free)
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const header = `### Livex Music Assistant\n\n`;
      await writer.write(encoder.encode(`data: ${JSON.stringify({ delta: header })}\n\n`));

      const advice = `Analysis for: "${prompt}"\n\nRelevant tools in Livex:\n- **Chordex:** Voicing analysis and chord transposition.\n- **Drumex:** Metronome tempo calibration and groove sync.\n- **Vocalex:** Real-time pitch tracking and interval harmonization.`;
      const words = advice.split(/(\s+)/);

      for (const w of words) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ delta: w })}\n\n`));
      }

      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, { headers: corsHeaders });
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
