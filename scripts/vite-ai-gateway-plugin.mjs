import https from 'node:https';
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
   - Electric Guitar / Bass: Specify exact pickup selection, string gauge, tuning (Standard, Eb, Drop D, DADGAD), amplifier staging (gain, bass, mid, treble dials), and exact serial pedal chain order.
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
 * Vite Dev Server Middleware Plugin for Livex Music AI
 * Intercepts POST /api/ai/chat and streams live Gemini 2.5 Flash completions.
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
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
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

            // Determine API key
            const apiKey =
              req.headers['x-api-key'] ||
              req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
              payload.apiKey ||
              findEnvKey('GEMINI_API_KEY') ||
              findEnvKey('VITE_GEMINI_API_KEY');

            if (!apiKey) {
              res.writeHead(401, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(
                JSON.stringify({
                  error:
                    'AI Gateway: GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env file or enter an API key in Livex Assistant Settings.',
                })
              );
              return;
            }

            const contextualSystemPrompt = `${SYSTEM_PROMPT}

Active Musical Context Snapshot:
${JSON.stringify(musicalContext, null, 2)}
User UI Language Preference: "${userLanguage}". Always reply in the language in which the user queries.`;

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

            // Build multi-turn conversation
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

            const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            const targetUrl = new URL(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`
            );

            // Write SSE headers to client
            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*',
            });

            // Call Gemini streaming endpoint
            const geminiReq = https.request(
              targetUrl,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              },
              (geminiRes) => {
                if (geminiRes.statusCode && geminiRes.statusCode >= 400) {
                  let errData = '';
                  geminiRes.on('data', (c) => (errData += c));
                  geminiRes.on('end', () => {
                    let errMsg = `Gemini API error (HTTP ${geminiRes.statusCode})`;
                    try {
                      const parsed = JSON.parse(errData);
                      if (parsed?.error?.message) {
                        errMsg = parsed.error.message;
                      }
                    } catch {}
                    res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
                    res.write('data: [DONE]\n\n');
                    res.end();
                  });
                  return;
                }

                let buffer = '';
                let hasEmittedSearching = false;
                let hasEmittedComposing = false;
                let sentSources = false;

                geminiRes.on('data', (chunk) => {
                  buffer += chunk.toString();
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
                              res.write(`data: ${JSON.stringify({ delta: part.text })}\n\n`);
                            }
                          }
                        }
                      } catch {}
                    }
                  }
                });

                geminiRes.on('end', () => {
                  res.write(`data: ${JSON.stringify({ type: 'state', state: 'completed' })}\n\n`);
                  res.write('data: [DONE]\n\n');
                  res.end();
                });
              }
            );

            geminiReq.on('error', (err) => {
              res.write(
                `data: ${JSON.stringify({
                  error: `Network failure connecting to AI provider: ${err.message}`,
                })}\n\n`
              );
              res.write('data: [DONE]\n\n');
              res.end();
            });

            geminiReq.write(JSON.stringify(geminiPayload));
            geminiReq.end();
          });
          return;
        }

        next();
      });
    },
  };
}
