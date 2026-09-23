import fs from 'node:fs';
import path from 'node:path';

function findEnvKey(keyName) {
  if (process.env[keyName]) return process.env[keyName];

  const candidateDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), 'apps/studio-android'),
    path.resolve(process.cwd(), 'apps/studio-web'),
  ];

  const candidateFiles = ['.env.local', '.env', '.env.development.local', '.env.development'];

  for (const dir of candidateDirs) {
    for (const file of candidateFiles) {
      const fullPath = path.join(dir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const match = content.match(new RegExp(`^${keyName}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, 'm'));
          if (match && match[1]) {
            return match[1].trim();
          }
        } catch {}
      }
    }
  }

  return undefined;
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
   - Electric Guitar / Bass: Specify exact pickup selection (e.g. "Neck single-coil with tone rolled to 7"), string gauge, tuning (Standard, Eb, Drop D, DADGAD), amplifier staging (gain, bass, mid, treble dials), and exact serial pedal chain order.
   - Drums: Detail specific groove rudiments, subdivision grids (16th swing %, triplets, linear fills), ghost-note placements, and drum shell tuning.
   - Vocals: Address register management (chest, mixed, head), breath compression, and intonation exercises.

4. Global Music & Scene Awareness:
   - Demonstrate deep, culturally nuanced understanding of music traditions and contemporary scenes worldwide:
     * Latin America & Mexico: Rock en español, Mexican alternative, Son Jarocho, Trova, Cumbia, Bossa Nova, Samba, Tango, Corrido Tumbado, Latin Jazz.
     * East Asia: Japanese Math-Rock, City Pop, Shibuya-kei, Visual Kei, J-Rock, Korean Indie/K-Rock.
     * Africa: Highlife, Afrobeat, Amapiano, Desert Blues (Tinariwen/Mdou Moctar), Soukous, Ethio-jazz.
     * Europe & UK: Shoegaze, Post-punk, Krautrock, NWOBHM, Progressive Metal, Nordic Folk/Metal.
     * North America & Diaspora: Bluegrass, Gospel, Delta/Chicago Blues, Motown, Neo-Soul, Hip-Hop.
   - Treat international artists and local scenes with the same depth, accuracy, and technical respect as Western mainstream staples.
   - If asked about an obscure or emerging artist, analyze their instrumentation, lineage, musical scene, and stylistic predecessors accurately.

5. Time-Sensitive & Current Music Facts:
   - When asked about recent artists, recent releases, current lineups, tours, or newly released instruments and pedal gear, prioritize current and verified facts grounded in web search.`;

/**
 * Extracts structured chord progression or tone recipe from model text if present.
 */
function extractStructuredRecommendation(text, prompt) {
  if (!text || typeof text !== 'string') return null;

  // 1. Detect Chord Progression
  const chordRegex = /`([A-G][b#]?(?:maj|min|m|M|dim|aug|sus|add)?[0-9]?(?:\([^)]+\))?)`/g;
  const matches = [...text.matchAll(chordRegex)].map((m) => m[1]);

  if (matches.length >= 3) {
    const uniqueChords = [...new Set(matches)];
    const keyMatch = text.match(/(?:key of|in the key of|tonalidad de|en la tonalidad de)\s+([A-G][b#]?(?:\s*(?:major|minor|menor|mayor))?)/i);
    const key = keyMatch ? keyMatch[1].trim() : matches[0].replace(/[^A-G#b]/g, '');

    // Extract Roman numerals if present
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
 * Vite Dev Server Middleware Plugin for Livex Music AI
 * Intercepts POST /api/ai/chat and streams live completions from:
 * 1. Open-Source Reasoning Models (DeepSeek-R1 / QwQ-32B / Qwen2.5) via standard OpenAI-compatible endpoints
 *    (vLLM, Ollama, DeepSeek API, Groq, Together, OpenRouter).
 *    - Parses `reasoning_content` delta and `<think>...</think>` tags to drive `ThinkingOrb` into 'solving' state.
 *    - Discards raw chain-of-thought dumps to preserve dense, rigorous UI responses.
 * 2. Google Gemini 2.5 Flash with native Google Search Grounding.
 */
export function viteAiGatewayPlugin() {
  return {
    name: 'vite-plugin-livex-ai-gateway',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (req.method === 'OPTIONS' && (url === '/api/ai/chat' || url.startsWith('/api/ai/chat?'))) {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-ai-base-url',
          });
          res.end();
          return;
        }

        if (req.method === 'POST' && (url === '/api/ai/chat' || url.startsWith('/api/ai/chat?'))) {
          let rawBody = '';
          req.on('data', (chunk) => {
            rawBody += chunk;
          });

          req.on('end', async () => {
            let payload = {};
            try {
              payload = JSON.parse(rawBody || '{}');
            } catch {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              return;
            }

            const prompt = (payload.prompt || '').trim();
            if (!prompt) {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ error: 'Prompt is required' }));
              return;
            }

            const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
            const musicalContext = payload.context || {};
            const userLanguage = payload.language || 'en';
            const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

            // Resolve API Keys & Base URLs
            const userApiKey =
              req.headers['x-api-key'] ||
              req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
              payload.apiKey;

            const customBaseUrl =
              req.headers['x-ai-base-url'] ||
              payload.baseUrl ||
              findEnvKey('OPENAI_COMPATIBLE_BASE_URL') ||
              findEnvKey('AI_BASE_URL') ||
              findEnvKey('DEEPSEEK_BASE_URL') ||
              findEnvKey('OLLAMA_BASE_URL') ||
              findEnvKey('VLLM_BASE_URL');

            const openAiKey =
              userApiKey ||
              findEnvKey('OPENAI_COMPATIBLE_API_KEY') ||
              findEnvKey('DEEPSEEK_API_KEY') ||
              findEnvKey('GROQ_API_KEY') ||
              findEnvKey('OPENAI_API_KEY');

            const geminiApiKey =
              (!userApiKey?.startsWith('sk-') && !userApiKey?.startsWith('gsk_') ? userApiKey : undefined) ||
              findEnvKey('GEMINI_API_KEY') ||
              findEnvKey('VITE_GEMINI_API_KEY');

            const contextualSystemPrompt = `${SYSTEM_PROMPT}

Active Musical Context Snapshot:
${JSON.stringify(musicalContext, null, 2)}
User UI Language Preference: "${userLanguage}". Always reply in the language in which the user queries.`;

            // Write SSE headers to client immediately
            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*',
            });

            // Emit initial connecting state
            res.write(`data: ${JSON.stringify({ type: 'state', state: 'connecting' })}\n\n`);

            // =========================================================================
            // PATH 1: OPEN-SOURCE REASONING MODEL (DeepSeek-R1 / QwQ-32B / vLLM / Ollama)
            // =========================================================================
            const isOpenAiCompatible =
              Boolean(customBaseUrl) ||
              payload.provider === 'openai_compatible' ||
              userApiKey?.startsWith('sk-') ||
              userApiKey?.startsWith('gsk_') ||
              Boolean(findEnvKey('DEEPSEEK_API_KEY')) ||
              Boolean(findEnvKey('OPENAI_COMPATIBLE_BASE_URL')) ||
              Boolean(findEnvKey('OLLAMA_BASE_URL')) ||
              Boolean(findEnvKey('VLLM_BASE_URL'));

            if (isOpenAiCompatible) {
              try {
                let endpointBase = customBaseUrl || 'https://api.deepseek.com/v1';
                if (userApiKey?.startsWith('gsk_') && !customBaseUrl) {
                  endpointBase = 'https://api.groq.com/openai/v1';
                }
                const targetUrl = endpointBase.replace(/\/$/, '').endsWith('/chat/completions')
                  ? endpointBase
                  : `${endpointBase.replace(/\/$/, '')}/chat/completions`;

                const modelName =
                  payload.model ||
                  findEnvKey('OPENAI_COMPATIBLE_MODEL') ||
                  findEnvKey('DEEPSEEK_MODEL') ||
                  (endpointBase.includes('groq')
                    ? 'deepseek-r1-distill-llama-70b'
                    : endpointBase.includes('ollama')
                    ? 'deepseek-r1:32b'
                    : 'deepseek-reasoner');

                const messages = [
                  { role: 'system', content: contextualSystemPrompt },
                  ...history.map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                  })),
                  { role: 'user', content: prompt },
                ];

                const openAiPayload = {
                  model: modelName,
                  messages,
                  stream: true,
                  temperature: 0.3,
                  max_tokens: 2048,
                };

                const headers = { 'Content-Type': 'application/json' };
                if (openAiKey) {
                  headers['Authorization'] = `Bearer ${openAiKey}`;
                }

                const response = await fetch(targetUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(openAiPayload),
                });

                if (!response.ok || !response.body) {
                  const errText = await response.text().catch(() => '');
                  res.write(
                    `data: ${JSON.stringify({
                      error: `Open-Source Model Gateway Error (HTTP ${response.status}): ${errText.slice(0, 160)}`,
                    })}\n\n`
                  );
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let inThinkTag = false;
                let thinkBuffer = '';
                let hasEmittedSolving = false;
                let hasEmittedComposing = false;
                let fullResponseText = '';

                const emitText = (text) => {
                  if (!text) return;
                  if (!hasEmittedComposing) {
                    hasEmittedComposing = true;
                    res.write(`data: ${JSON.stringify({ type: 'state', state: 'composing' })}\n\n`);
                  }
                  fullResponseText += text;
                  res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
                };

                const handleContent = (content) => {
                  if (!content) return;
                  thinkBuffer += content;

                  while (thinkBuffer.length > 0) {
                    if (!inThinkTag) {
                      const openIdx = thinkBuffer.indexOf('<think>');
                      if (openIdx !== -1) {
                        const before = thinkBuffer.slice(0, openIdx);
                        if (before) emitText(before);
                        inThinkTag = true;
                        if (!hasEmittedSolving) {
                          hasEmittedSolving = true;
                          res.write(`data: ${JSON.stringify({ type: 'state', state: 'solving' })}\n\n`);
                        }
                        thinkBuffer = thinkBuffer.slice(openIdx + 7);
                      } else {
                        const partial = thinkBuffer.match(/<t?h?i?n?k?$/);
                        if (partial && partial.index !== undefined) {
                          const safe = thinkBuffer.slice(0, partial.index);
                          if (safe) emitText(safe);
                          thinkBuffer = partial[0];
                          break;
                        } else {
                          emitText(thinkBuffer);
                          thinkBuffer = '';
                        }
                      }
                    } else {
                      const closeIdx = thinkBuffer.indexOf('</think>');
                      if (closeIdx !== -1) {
                        inThinkTag = false;
                        thinkBuffer = thinkBuffer.slice(closeIdx + 8);
                      } else {
                        const partial = thinkBuffer.match(/<\/?t?h?i?n?k?$/);
                        if (partial && partial.index !== undefined) {
                          thinkBuffer = partial[0];
                        } else {
                          thinkBuffer = '';
                        }
                        break;
                      }
                    }
                  }
                };

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
                        res.write(`data: ${JSON.stringify({ error: parsed.error.message || String(parsed.error) })}\n\n`);
                        break;
                      }
                      const delta = parsed.choices?.[0]?.delta;
                      if (!delta) continue;

                      // 1. Explicit reasoning_content (DeepSeek-R1 / vLLM)
                      if (delta.reasoning_content) {
                        if (!hasEmittedSolving) {
                          hasEmittedSolving = true;
                          res.write(`data: ${JSON.stringify({ type: 'state', state: 'solving' })}\n\n`);
                        }
                        continue;
                      }

                      // 2. Models outputting <think>...</think> in content (Ollama / QwQ)
                      if (typeof delta.content === 'string' && delta.content) {
                        handleContent(delta.content);
                      }
                    } catch {}
                  }
                }

                if (thinkBuffer && !inThinkTag) {
                  emitText(thinkBuffer);
                  thinkBuffer = '';
                }

                if (!fullResponseText.trim()) {
                  res.write(`data: ${JSON.stringify({ error: 'AI service produced an empty response. Please retry.' })}\n\n`);
                } else {
                  const recommendation = extractStructuredRecommendation(fullResponseText, prompt);
                  if (recommendation) {
                    res.write(`data: ${JSON.stringify({ recommendation })}\n\n`);
                  }
                  res.write(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`);
                }

                res.write('data: [DONE]\n\n');
                res.end();
                return;
              } catch (err) {
                res.write(
                  `data: ${JSON.stringify({
                    error: `Open-source gateway connection failed: ${err.message}`,
                  })}\n\n`
                );
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            }

            // =========================================================================
            // PATH 2: GOOGLE GEMINI (2.5 Flash / 2.0 Flash + Search Grounding)
            // =========================================================================
            if (geminiApiKey) {
              try {
                // Build user turn parts
                const userParts = [{ text: prompt }];
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
                  ...history.map((m) => ({
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

                const modelName = payload.model || findEnvKey('GEMINI_MODEL') || 'gemini-2.5-flash';
                const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

                const response = await fetch(targetUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(geminiPayload),
                });

                if (!response.ok || !response.body) {
                  let errText = `Gemini API error (HTTP ${response.status})`;
                  try {
                    const parsed = await response.json();
                    if (parsed?.error?.message) {
                      errText = parsed.error.message;
                    }
                  } catch {}
                  res.write(`data: ${JSON.stringify({ error: errText })}\n\n`);
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let hasEmittedSearching = false;
                let hasEmittedComposing = false;
                let sentSources = false;
                let fullResponseText = '';

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

                        // Web Search Queries Grounding -> emit searching state
                        const searchQueries = candidate?.groundingMetadata?.webSearchQueries;
                        if (searchQueries && searchQueries.length > 0 && !hasEmittedSearching) {
                          hasEmittedSearching = true;
                          res.write(
                            `data: ${JSON.stringify({
                              type: 'state',
                              state: 'searching',
                              query: searchQueries.join(', '),
                            })}\n\n`
                          );
                        }

                        // Web Grounding Sources -> emit sources event
                        const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
                        if (groundingChunks && groundingChunks.length > 0 && !sentSources) {
                          sentSources = true;
                          const sources = groundingChunks
                            .map((c) => ({
                              title: c.web?.title || 'Web Source',
                              url: c.web?.uri || '',
                            }))
                            .filter((s) => Boolean(s.url));

                          if (sources.length > 0) {
                            res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
                          }
                        }

                        // Stream text tokens
                        const textParts = candidate?.content?.parts;
                        if (textParts && textParts.length > 0) {
                          for (const part of textParts) {
                            if (part.text) {
                              if (!hasEmittedComposing) {
                                hasEmittedComposing = true;
                                res.write(
                                  `data: ${JSON.stringify({ type: 'state', state: 'composing' })}\n\n`
                                );
                              }
                              fullResponseText += part.text;
                              res.write(`data: ${JSON.stringify({ delta: part.text })}\n\n`);
                            }
                          }
                        }
                      } catch {}
                    }
                  }
                }

                // Check for structured chord / tone recommendations
                const recommendation = extractStructuredRecommendation(fullResponseText, prompt);
                if (recommendation) {
                  res.write(`data: ${JSON.stringify({ recommendation })}\n\n`);
                }

                res.write(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              } catch (err) {
                res.write(
                  `data: ${JSON.stringify({
                    error: `Gemini API connection error: ${err.message}`,
                  })}\n\n`
                );
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            }

            // =========================================================================
            // PATH 3: NO PROVIDER CONFIGURED -> HONEST ERROR RESPONSE
            // =========================================================================
            res.write(
              `data: ${JSON.stringify({
                error:
                  'Livex AI dev gateway: No AI cloud credentials found in local environment (.env.local / GEMINI_API_KEY / GROQ_API_KEY). Real model inference requires server-side configuration.',
              })}\n\n`
            );
            res.write('data: [DONE]\n\n');
            res.end();
          });
          return;
        }

        next();
      });
    },
  };
}
