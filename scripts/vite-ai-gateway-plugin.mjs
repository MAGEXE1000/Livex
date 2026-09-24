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

const SYSTEM_PROMPT = `You are the Livex Music AI, an expert music theorist, multi-instrumentalist producer, audio engineer, and global musicologist. While you specialize in music, audio engineering, acoustics, and musicology, you also assist musicians with general reasoning, mathematics, logic, and general user queries with the same directness and accuracy.

Core Directives:
1. Conciseness & Directness:
   - Provide direct, dense, and technically rigorous answers. For music queries, deliver deep theoretical, production, or gear expertise. For mathematical, logical, or general queries, answer accurately, immediately, and concisely without refusing.
   - Strictly do NOT use emojis or decorative icons anywhere in your response.
   - Strictly do NOT use conversational pleasantries, introductory filler (e.g. "Sure!", "Certainly!", "I would be happy to help", "Great question"), or conversational sign-offs (e.g. "Keep creating!", "Let me know if you need more help!").
   - Respond in the language used by the user (multilingual fluency in English, Spanish, Japanese, Portuguese, German, French, etc.).
   - If using reasoning tags like <think>...</think>, always output your final answer and explanation outside of the think tags.

2. Music Theory Rigor & Chord Progression Generation:
   - Always format chords with clean markdown backticks: e.g. \`Dbmaj9\`, \`F#m7(b5)\`, \`G7(#9)\`, \`C13\`.
   - When requested to generate or analyze a chord progression:
     * Provide a musically coherent, context-aware, and original progression.
     * Respect all requested musical parameters: key, mode, genre, mood, tempo, and harmonic function.
     * When analyzing artist or song references (e.g. "Analyze the harmonic characteristics of [artist/song] and create a new progression inspired by it"): examine the harmonic characteristics, modal flavor, voice leading, and characteristic chord movements; then compose a fresh, original progression embodying those stylistic techniques. Distinguish analytical reference notes from the generated original progression (never copy copyrighted songs or lyrics).
     * Structure the harmonic output cleanly:
       - Clear descriptive title (e.g. "### Melancholic C Major Progression")
       - Metadata line: **Key:** C Major | **Tempo:** 72 BPM | **Feel:** Bittersweet, reflective
       - Progression: \`C\` → \`Em\` → \`F\` → \`Fm\`
       - Harmonic Analysis: \`I\` → \`iii\` → \`IV\` → \`iv\`
       - Why It Works: concise explanation of voice leading, tension, resolution, or modal borrowing.
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
   - When asked about recent artists, recent releases, current lineups, tours, or newly released instruments and pedal gear, prioritize current and verified facts grounded in web search.

6. Multimodal Musical Vision & Audio Analysis:
   - When provided with images of musical content (sheet music, guitar fretboards, chord charts, handwritten tabs, pedalboards, synthesizer/DAW interfaces):
     * Fretboard / Hand Photos: Identify exact fret positions, fingerings, string numbers, chord name, voicing, and inversion.
     * Sheet Music / Lead Sheets: Transcribe the key signature, time signature, melody line, harmonic symbols, and rhythm.
     * Chord Charts / Tabs: Parse chord symbols accurately and provide harmonic analysis (Roman numerals, functional harmony).
     * Pedalboards / Amps / Audio Gear: Identify pedal brands/models, control dial settings, serial signal order, and recommend tone adjustments.
     * DAW / Drum Pattern Screenshots: Read grid step positions, velocity levels, BPM, time signature, and groove subdivision.`;

/**
 * Extracts structured chord progression or tone recipe from model text if present.
 */
function extractStructuredRecommendation(text, prompt) {
  if (!text || typeof text !== 'string') return null;

  const combinedContext = `${prompt || ''}\n${text}`;

  // 1. Detect Explicit JSON or code block
  const jsonBlockMatch = text.match(/```(?:chord-progression|json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed && Array.isArray(parsed.chords) && parsed.chords.length >= 2) {
        return {
          id: `rec-chord-${Date.now()}`,
          type: 'chord_progression',
          title: parsed.title || 'Harmonic Progression',
          data: {
            chords: parsed.chords.map((c) => String(c).trim()).filter(Boolean),
            romanNumerals: Array.isArray(parsed.romanNumerals) ? parsed.romanNumerals.map(String) : undefined,
            key: String(parsed.key || 'C').trim(),
            mode: parsed.mode ? String(parsed.mode).trim() : undefined,
            tempo: typeof parsed.tempo === 'number' ? parsed.tempo : undefined,
            timeSignature: parsed.timeSignature ? String(parsed.timeSignature).trim() : undefined,
            feel: parsed.feel ? String(parsed.feel).trim() : undefined,
            genre: parsed.genre ? String(parsed.genre).trim() : undefined,
            mood: parsed.mood ? String(parsed.mood).trim() : undefined,
            title: parsed.title ? String(parsed.title).trim() : undefined,
            harmonicContext: parsed.harmonicContext ? String(parsed.harmonicContext).trim() : undefined,
            referenceContext: parsed.referenceContext || parsed.inspiredBy ? String(parsed.referenceContext || parsed.inspiredBy).trim() : undefined,
            explanation: parsed.explanation || parsed.whyItWorks ? String(parsed.explanation || parsed.whyItWorks).trim() : undefined,
            description: parsed.description || parsed.explanation || undefined,
          },
          actionLabel: 'Import to Chordex',
        };
      }
    } catch {}
  }

  // 2. Detect Musical Chord Progression Context
  const isMusicContext =
    /(?:progression|progresi[oó]n|chord|acorde|harmoni[ac]|cadence|tonalidad|key of|tonalidad de|tempo|bpm|ii-V|I-IV|i-iv|modal|voicing|triad|arpeggio)/i.test(
      combinedContext
    );
  if (isMusicContext) {
    // Extract chords sequence
    let chords = [];
    const cleanText = text.replace(/[*_]/g, '');
    const cleanContext = combinedContext.replace(/[*_]/g, '');

    const progressionLineMatch = cleanText.match(
      /(?:^|\n)[ \t]*(?:Progression|Chords|Acordes|Secuencia):?[ \t]*(?:\r?\n[ \t]*)?(`[A-G][b#]?[^\n]+)/i
    );

    const chordTokenRegex =
      /`([A-G][b#]?[a-zA-Z0-9#b()\/+ø°^-]*)`|(?:\b([A-G][b#]?(?:maj|min|m|M|dim|aug|sus|add)[0-9]*(?:[#b][0-9]+)*(?:\([^)]+\))?(?:\/[A-G][b#]?)?)\b)/g;

    if (progressionLineMatch) {
      const lineChords = [...progressionLineMatch[1].matchAll(chordTokenRegex)]
        .map((m) => m[1] || m[2])
        .filter(Boolean);
      if (lineChords.length >= 2) {
        chords = lineChords;
      }
    }

    if (chords.length < 2) {
      const backtickedRegex = /`([A-G][b#]?[a-zA-Z0-9#b()\/+ø°^-]*)`/g;
      const allMatches = [...text.matchAll(backtickedRegex)].map((m) => m[1]);
      if (allMatches.length >= 2) {
        chords = allMatches.slice(0, 8);
      }
    }

    if (chords.length >= 2) {

  // Extract Key and Mode
  let key = 'C';
  let mode;

  const explicitModeMatch = cleanContext.match(
    /(?:^|\n|\|)[ \t]*(?:Mode|Modo):?[ \t]*([A-Za-z]+)/i
  );
  if (explicitModeMatch) {
    const rawMode = explicitModeMatch[1].toLowerCase();
    mode =
      rawMode === 'mayor'
        ? 'Major'
        : rawMode === 'menor'
          ? 'Minor'
          : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
  }

  const keyHeaderMatch = cleanContext.match(
    /(?:^|\n|\|)[ \t]*(?:Key(?:\s*of)?|Tonalidad(?:\s*de)?):?[ \t]*([A-G][b#]?)(?:[ \t]+(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|locrian|mayor|menor))?/i
  );

  if (keyHeaderMatch) {
    key = keyHeaderMatch[1].trim().toUpperCase();
    if (keyHeaderMatch[2] && !mode) {
      const rawMode = keyHeaderMatch[2].toLowerCase();
      mode =
        rawMode === 'mayor'
          ? 'Major'
          : rawMode === 'menor'
            ? 'Minor'
            : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
    }
  } else {
    const promptKeyMatch = (prompt || '').match(
      /\bin\s+([A-G][b#]?)(?:[ \t]+(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|locrian|mayor|menor))?/i
    );
    if (promptKeyMatch) {
      key = promptKeyMatch[1].trim().toUpperCase();
      if (promptKeyMatch[2] && !mode) {
        const rawMode = promptKeyMatch[2].toLowerCase();
        mode =
          rawMode === 'mayor'
            ? 'Major'
            : rawMode === 'menor'
              ? 'Minor'
              : rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
      }
    } else {
      const rootMatch = chords[0].match(/^[A-G][b#]?/);
      if (rootMatch) {
        key = rootMatch[0].toUpperCase();
      }
    }
  }

  if (!mode) {
    if (/\b(?:minor|menor)\b/i.test(prompt || '')) {
      mode = 'Minor';
    } else if (/\b(?:major|mayor)\b/i.test(prompt || '')) {
      mode = 'Major';
    } else if (/m(?:aj|in)?\b/.test(chords[0])) {
      mode = chords[0].startsWith(key + 'm') && !chords[0].startsWith(key + 'maj') ? 'Minor' : 'Major';
    } else {
      mode = 'Major';
    }
  }

  // Extract Roman Numerals / Harmonic Analysis
  let romanNumerals;
  const analysisLineMatch = cleanText.match(
    /(?:^|\n)[ \t]*(?:Harmonic Analysis|Analysis|An[aá]lisis|Roman Numerals):?[ \t]*(?:\r?\n[ \t]*)?(`?[b#]?[ivIV]+[^\n]+)/i
  );

  const romanTokenRegex =
    /`([b#]?[ivIV]+[a-zA-Z0-9#b()\/+ø°^-]*)`|(?:\b([b#]?[ivIV]+(?:[0-9]|maj|min|m|M|dim|aug|sus|#|b)*(?:\([^)]+\))?)\b)/g;

  if (analysisLineMatch) {
    const lineRomans = [...analysisLineMatch[1].matchAll(romanTokenRegex)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (lineRomans.length >= 2) {
      romanNumerals = lineRomans.slice(0, chords.length);
    }
  }

  if (!romanNumerals) {
    const allRomans = [...text.matchAll(romanTokenRegex)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (allRomans.length >= chords.length) {
      romanNumerals = allRomans.slice(0, chords.length);
    }
  }

  // Extract Tempo / BPM
  let tempo;
  const tempoMatch = combinedContext.match(/(?:tempo|bpm)\s*:?\s*(\d{2,3})|(\d{2,3})\s*(?:bpm|BPM)/i);
  if (tempoMatch) {
    const val = parseInt(tempoMatch[1] || tempoMatch[2], 10);
    if (val >= 40 && val <= 240) {
      tempo = val;
    }
  }

  // Extract Time Signature
  let timeSignature;
  const timeSigMatch = combinedContext.match(/(?:time signature|comp[aá]s)\s*:?\s*([23456789]\/[248])|\b([346]\/4|6\/8|12\/8)\b/i);
  if (timeSigMatch) {
    timeSignature = timeSigMatch[1] || timeSigMatch[2];
  }

  // Extract Feel / Genre / Mood
  let feel;
  let genre;
  let mood;

  const feelMatch = text.match(/(?:feel|sensaci[oó]n|groove)\s*:?\s*([^\n.,]+)/i);
  if (feelMatch) {
    feel = feelMatch[1].replace(/[*_]/g, '').trim();
  }

  const moodMatches = combinedContext.match(/\b(melancholic|melanc[oó]lic[ao]|sad|dark|nostalgic|bittersweet|uplifting|happy|bright|dreamy|tense|chill|relaxed|energetic|emotional)\b/i);
  if (moodMatches) {
    const m = moodMatches[1].toLowerCase();
    mood = m.startsWith('melanc') ? 'Melancholic' : m.charAt(0).toUpperCase() + m.slice(1);
  }

  const genreMatches = combinedContext.match(/\b(neo-soul|jazz|bossa nova|r&b|indie rock|blues|gospel|folk|ambient|city pop|rock en espa[nñ]ol|latin jazz|pop|shoegaze|funk)\b/i);
  if (genreMatches) {
    genre = genreMatches[1]
      .split(/([ -])/)
      .map((w) => (w === '-' || w === ' ' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('');
  }

  // Extract Reference / Inspired By Context
  let referenceContext;
  const refPromptMatch = combinedContext.match(/(?:analyze(?: the)? harmonic characteristics of|characteristics of|inspired by|in the style of|al estilo de|inspirado en)\s+([^,.\n]+?)(?:and create|and write|without copying|\.|\n|$)/i);
  if (refPromptMatch) {
    const refTarget = refPromptMatch[1].replace(/[*_]/g, '').trim();
    if (refTarget && refTarget.length > 2 && refTarget.length < 60) {
      referenceContext = `Inspired by the harmonic characteristics of ${refTarget} (original progression)`;
    }
  }

  // Extract Explanation ("Why it works")
  let explanation;
  const whyMatch = text.match(/(?:(?:\*{1,2})?(?:Why It Works|Por qu[eé] funciona|Harmonic Movement|Voice Leading)(?:\*{1,2})?:?[ \t]*)([\s\S]*?)(?:\n\s*\n|\n###|\n\*\*|$)/i);
  if (whyMatch) {
    const cleanWhy = whyMatch[1].replace(/[*_`]/g, '').replace(/\n+/g, ' ').trim();
    if (cleanWhy.length > 10) {
      explanation = cleanWhy.length > 240 ? cleanWhy.slice(0, 237) + '…' : cleanWhy;
    }
  }

  // Compose Title
  let title = 'Harmonic Progression';
  if (mood && genre) {
    title = `${mood} ${genre} Progression`;
  } else if (mood) {
    title = `${mood} ${key}${mode ? ' ' + mode : ''} Progression`;
  } else if (genre) {
    title = `${genre} Progression in ${key}`;
  } else if (key) {
    title = `${key}${mode ? ' ' + mode : ''} Progression`;
  }

  const harmonicContext = romanNumerals ? romanNumerals.join(' → ') : undefined;

  return {
    id: `rec-chord-${Date.now()}`,
    type: 'chord_progression',
    title,
    data: {
      chords,
      romanNumerals,
      key,
      mode,
      tempo,
      timeSignature: timeSignature || '4/4',
      feel: feel || mood || genre,
      genre,
      mood,
      title,
      harmonicContext,
      referenceContext,
      explanation,
      description: explanation || `${title} (${chords.join(' - ')})`,
    },
    actionLabel: 'Import to Chordex',
  };
  }
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

            // Extract text from document attachments (TXT, MD, CSV, JSON, Tab, ChordPro)
            let enrichedPrompt = prompt;
            for (const att of attachments) {
              const isText =
                att.type?.startsWith('text/') ||
                /\.(txt|md|csv|json|xml|tab|chordpro|cho|crd|pro)$/i.test(att.name || '');

              if (isText && att.dataUrl && typeof att.dataUrl === 'string') {
                const match = att.dataUrl.match(/^data:[^;]+;base64,(.+)$/);
                if (match) {
                  try {
                    const textContent = Buffer.from(match[1], 'base64').toString('utf-8');
                    enrichedPrompt += `\n\n--- Attached Document: ${att.name || 'document'} (${att.type || 'text/plain'}) ---\n${textContent.slice(0, 16000)}\n--- End of Document ---`;
                  } catch {}
                }
              }
            }

            const hasImages = attachments.some(
              (a) => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')
            );
            const hasAudio = attachments.some(
              (a) => a.type?.startsWith('audio/') || a.dataUrl?.startsWith('data:audio/')
            );
            const hasMediaAttachments = attachments.some(
              (a) =>
                a.type?.startsWith('image/') ||
                a.type?.startsWith('audio/') ||
                a.type === 'application/pdf' ||
                a.dataUrl?.startsWith('data:image/') ||
                a.dataUrl?.startsWith('data:audio/') ||
                a.dataUrl?.startsWith('data:application/pdf')
            );
            const hasFiles = attachments.length > 0;

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

            // Emit truthful initial state
            if (hasImages) {
              res.write(
                `data: ${JSON.stringify({
                  type: 'state',
                  state: 'working',
                  label: userLanguage === 'es' ? 'Leyendo imagen…' : 'Reading image…',
                })}\n\n`
              );
            } else if (hasAudio) {
              res.write(
                `data: ${JSON.stringify({
                  type: 'state',
                  state: 'working',
                  label: userLanguage === 'es' ? 'Analizando audio…' : 'Analyzing audio…',
                })}\n\n`
              );
            } else if (hasFiles) {
              res.write(
                `data: ${JSON.stringify({
                  type: 'state',
                  state: 'working',
                  label: userLanguage === 'es' ? 'Analizando archivo…' : 'Analyzing file…',
                })}\n\n`
              );
            } else {
              res.write(
                `data: ${JSON.stringify({
                  type: 'state',
                  state: 'connecting',
                  label: userLanguage === 'es' ? 'Conectando…' : 'Connecting…',
                })}\n\n`
              );
            }

            // =========================================================================
            // PATH 1: OPEN-SOURCE REASONING MODEL (DeepSeek-R1 / QwQ-32B / vLLM / Ollama)
            // If media attachments (images/audio/pdf) are present, skip to Gemini vision
            // =========================================================================
            const isOpenAiCompatible =
              !hasMediaAttachments &&
              (Boolean(customBaseUrl) ||
                payload.provider === 'openai_compatible' ||
                userApiKey?.startsWith('sk-') ||
                userApiKey?.startsWith('gsk_') ||
                Boolean(findEnvKey('DEEPSEEK_API_KEY')) ||
                Boolean(findEnvKey('OPENAI_COMPATIBLE_BASE_URL')) ||
                Boolean(findEnvKey('OLLAMA_BASE_URL')) ||
                Boolean(findEnvKey('VLLM_BASE_URL')));

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
                  { role: 'user', content: enrichedPrompt },
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
                let collectedThoughts = '';
                let hasEmittedSolving = false;
                let hasEmittedComposing = false;
                let fullResponseText = '';

                const emitText = (text) => {
                  if (!text) return;
                  if (!hasEmittedComposing) {
                    hasEmittedComposing = true;
                    res.write(
                      `data: ${JSON.stringify({
                        type: 'state',
                        state: 'composing',
                        label: userLanguage === 'es' ? 'Componiendo…' : 'Composing…',
                      })}\n\n`
                    );
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
                          res.write(
                            `data: ${JSON.stringify({
                              type: 'state',
                              state: 'solving',
                              label: userLanguage === 'es' ? 'Analizando teoría musical…' : 'Analyzing music theory…',
                            })}\n\n`
                          );
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
                        collectedThoughts += thinkBuffer.slice(0, closeIdx);
                        inThinkTag = false;
                        thinkBuffer = thinkBuffer.slice(closeIdx + 8);
                      } else {
                        const partial = thinkBuffer.match(/<\/?t?h?i?n?k?$/);
                        if (partial && partial.index !== undefined) {
                          collectedThoughts += thinkBuffer.slice(0, partial.index);
                          thinkBuffer = partial[0];
                        } else {
                          collectedThoughts += thinkBuffer;
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
                        collectedThoughts += delta.reasoning_content;
                        if (!hasEmittedSolving) {
                          hasEmittedSolving = true;
                          res.write(
                            `data: ${JSON.stringify({
                              type: 'state',
                              state: 'solving',
                              label: userLanguage === 'es' ? 'Analizando teoría musical…' : 'Analyzing music theory…',
                            })}\n\n`
                          );
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

                if (thinkBuffer) {
                  if (inThinkTag) {
                    collectedThoughts += thinkBuffer;
                  } else {
                    emitText(thinkBuffer);
                  }
                  thinkBuffer = '';
                }

                if (!fullResponseText.trim() && collectedThoughts.trim()) {
                  const cleanedThoughts = collectedThoughts
                    .replace(/<\/?think>/gi, '')
                    .trim();
                  if (cleanedThoughts) {
                    emitText(cleanedThoughts);
                  }
                }

                if (!fullResponseText.trim()) {
                  res.write(`data: ${JSON.stringify({ error: 'AI service produced an empty response. Please retry.' })}\n\n`);
                } else {
                  const recommendation = extractStructuredRecommendation(fullResponseText, enrichedPrompt);
                  if (recommendation) {
                    res.write(
                      `data: ${JSON.stringify({
                        type: 'state',
                        state: 'shaping',
                        label: userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…',
                      })}\n\n`
                    );
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
                const userParts = [{ text: enrichedPrompt }];
                for (const att of attachments) {
                  if (att.dataUrl && typeof att.dataUrl === 'string') {
                    const match = att.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                      const mime = match[1] || att.type || 'image/jpeg';
                      const isMedia =
                        mime.startsWith('image/') ||
                        mime.startsWith('audio/') ||
                        mime === 'application/pdf';
                      if (isMedia) {
                        userParts.push({
                          inlineData: {
                            mimeType: mime,
                            data: match[2],
                          },
                        });
                      }
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
                  ...(hasMediaAttachments
                    ? {}
                    : {
                        tools: [
                          {
                            googleSearch: {}, // Native Google Search Grounding (only for text-only queries)
                          },
                        ],
                      }),
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
                              label: userLanguage === 'es' ? 'Buscando en la web…' : 'Searching web…',
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
                                  `data: ${JSON.stringify({
                                    type: 'state',
                                    state: 'composing',
                                    label: userLanguage === 'es' ? 'Componiendo…' : 'Composing…',
                                  })}\n\n`
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
                const recommendation = extractStructuredRecommendation(fullResponseText, enrichedPrompt);
                if (recommendation) {
                  res.write(
                    `data: ${JSON.stringify({
                      type: 'state',
                      state: 'shaping',
                      label: userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…',
                    })}\n\n`
                  );
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
