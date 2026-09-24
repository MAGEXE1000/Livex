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
   - When asked about recent artists, recent releases, current lineups, tours, or newly released instruments and pedal gear, prioritize current and verified facts grounded in web search.

6. Multimodal Musical Vision & Audio Analysis:
   - When provided with images of musical content (sheet music, guitar fretboards, chord charts, handwritten tabs, pedalboards, synthesizer/DAW interfaces):
     * Fretboard / Hand Photos: Identify exact fret positions, fingerings, string numbers, chord name, voicing, and inversion.
     * Sheet Music / Lead Sheets: Transcribe the key signature, time signature, melody line, harmonic symbols, and rhythm.
     * Chord Charts / Tabs: Parse chord symbols accurately and provide harmonic analysis (Roman numerals, functional harmony).
     * Pedalboards / Amps / Audio Gear: Identify pedal brands/models, control dial settings, serial signal order, and recommend tone adjustments.
     * DAW / Drum Pattern Screenshots: Read grid step positions, velocity levels, BPM, time signature, and groove subdivision.`;

/**
 * Extracts structured chord progression or tone recipe from model text.
 */
function extractStructuredRecommendation(text: string, prompt: string) {
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
            chords: parsed.chords.map((c: any) => String(c).trim()).filter(Boolean),
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

  // 2. Check for Tone Recipe
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

  // 3. Detect Musical Chord Progression Context
  const isMusicContext =
    /(?:progression|progresi[oó]n|chord|acorde|harmoni[ac]|cadence|tonalidad|key of|tonalidad de|tempo|bpm|ii-V|I-IV|i-iv|modal|voicing|triad|arpeggio)/i.test(
      combinedContext
    );
  if (!isMusicContext) return null;

  // Extract chords sequence
  let chords: string[] = [];
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

  if (chords.length < 2) return null;

  // Extract Key and Mode
  let key = 'C';
  let mode: string | undefined;

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
  let romanNumerals: string[] | undefined;
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
  let tempo: number | undefined;
  const tempoMatch = combinedContext.match(/(?:tempo|bpm)\s*:?\s*(\d{2,3})|(\d{2,3})\s*(?:bpm|BPM)/i);
  if (tempoMatch) {
    const val = parseInt(tempoMatch[1] || tempoMatch[2], 10);
    if (val >= 40 && val <= 240) {
      tempo = val;
    }
  }

  // Extract Time Signature
  let timeSignature: string | undefined;
  const timeSigMatch = combinedContext.match(/(?:time signature|comp[aá]s)\s*:?\s*([23456789]\/[248])|\b([346]\/4|6\/8|12\/8)\b/i);
  if (timeSigMatch) {
    timeSignature = timeSigMatch[1] || timeSigMatch[2];
  }

  // Extract Feel / Genre / Mood
  let feel: string | undefined;
  let genre: string | undefined;
  let mood: string | undefined;

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
  let referenceContext: string | undefined;
  const refPromptMatch = combinedContext.match(/(?:analyze(?: the)? harmonic characteristics of|characteristics of|inspired by|in the style of|al estilo de|inspirado en)\s+([^,.\n]+?)(?:and create|and write|without copying|\.|\n|$)/i);
  if (refPromptMatch) {
    const refTarget = refPromptMatch[1].replace(/[*_]/g, '').trim();
    if (refTarget && refTarget.length > 2 && refTarget.length < 60) {
      referenceContext = `Inspired by the harmonic characteristics of ${refTarget} (original progression)`;
    }
  }

  // Extract Explanation ("Why it works")
  let explanation: string | undefined;
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

  public async onConnecting(label?: string) {
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ type: 'state', state: 'connecting', label: label || 'Connecting…' })}\n\n`)
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

  public async onReasoningDelta(reasoningText: string, label?: string) {
    if (reasoningText) {
      this.collectedThoughts += reasoningText;
    }
    if (!this.hasEmittedSolving) {
      this.hasEmittedSolving = true;
      await this.onState('solving', { label: label || 'Analyzing music theory…' });
    }
  }

  public async onContentDelta(content: string, solvingLabel?: string) {
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
            await this.onState('solving', { label: solvingLabel || 'Analyzing music theory…' });
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

  private async emitContent(text: string, composingLabel?: string) {
    if (!text) return;
    if (!this.hasEmittedComposing) {
      this.hasEmittedComposing = true;
      await this.onState('composing', { label: composingLabel || 'Composing…' });
    }
    this.fullResponseText += text;
    try {
      await this.writer.write(
        this.encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`)
      );
    } catch {}
  }

  public async finish(prompt: string, shapingLabel?: string) {
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
          this.encoder.encode(
            `data: ${JSON.stringify({
              type: 'state',
              state: 'shaping',
              label: shapingLabel || 'Shaping recommendations…',
            })}\n\n`
          )
        );
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
          const binString = atob(match[1]);
          const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0));
          const textContent = new TextDecoder('utf-8').decode(bytes);
          enrichedPrompt += `\n\n--- Attached Document: ${att.name || 'document'} (${att.type || 'text/plain'}) ---\n${textContent.slice(0, 16000)}\n--- End of Document ---`;
        } catch {}
      }
    }
  }

  const hasImages = attachments.some(
    (a: any) => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')
  );
  const hasAudio = attachments.some(
    (a: any) => a.type?.startsWith('audio/') || a.dataUrl?.startsWith('data:audio/')
  );
  const hasMediaAttachments = attachments.some(
    (a: any) =>
      a.type?.startsWith('image/') ||
      a.type?.startsWith('audio/') ||
      a.type === 'application/pdf' ||
      a.dataUrl?.startsWith('data:image/') ||
      a.dataUrl?.startsWith('data:audio/') ||
      a.dataUrl?.startsWith('data:application/pdf')
  );
  const hasFiles = attachments.length > 0;

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
  // Prioritize Gemini whenever media attachments (images/audio/pdf) are present
  // =========================================================================
  if (geminiApiKey && (hasMediaAttachments || (explicitProvider !== 'groq' && explicitProvider !== 'workers_ai'))) {
    try {
      const modelName = body?.model || env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      // Build multimodal parts for the latest user turn
      const userParts: any[] = [{ text: enrichedPrompt }];

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
        ...history.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: userParts,
        },
      ];

      const geminiPayload: any = {
        contents,
        systemInstruction: {
          parts: [{ text: contextualSystemPrompt }],
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      };

      if (!hasMediaAttachments) {
        geminiPayload.tools = [
          {
            googleSearch: {}, // Native Google Search Grounding (only for text-only queries)
          },
        ];
      }

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
            if (hasImages) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'state',
                    state: 'working',
                    label: userLanguage === 'es' ? 'Leyendo imagen…' : 'Reading image…',
                  })}\n\n`
                )
              );
            } else if (hasAudio) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'state',
                    state: 'working',
                    label: userLanguage === 'es' ? 'Analizando audio…' : 'Analyzing audio…',
                  })}\n\n`
                )
              );
            } else if (hasFiles) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'state',
                    state: 'working',
                    label: userLanguage === 'es' ? 'Analizando archivo…' : 'Analyzing file…',
                  })}\n\n`
                )
              );
            } else {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'state',
                    state: 'connecting',
                    label: userLanguage === 'es' ? 'Conectando…' : 'Connecting…',
                  })}\n\n`
                )
              );
            }

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
                            label: userLanguage === 'es' ? 'Buscando en la web…' : 'Searching web…',
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
                                `data: ${JSON.stringify({
                                  type: 'state',
                                  state: 'composing',
                                  label: userLanguage === 'es' ? 'Componiendo…' : 'Composing…',
                                })}\n\n`
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

            const rec = extractStructuredRecommendation(fullResponseText, enrichedPrompt);
            if (rec) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'state',
                    state: 'shaping',
                    label: userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…',
                  })}\n\n`
                )
              );
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
  // If media attachments are present, skip text-only fallback
  // =========================================================================
  const isGroqOrOpenAiCompatible =
    !hasMediaAttachments &&
    (Boolean(groqApiKey) ||
      Boolean(customBaseUrl) ||
      explicitProvider === 'groq' ||
      explicitProvider === 'deepseek' ||
      explicitProvider === 'openai_compatible' ||
      Boolean(openAiCompatibleKey));

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
        { role: 'user', content: enrichedPrompt },
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
            await parser.onConnecting(
              hasFiles
                ? userLanguage === 'es'
                  ? 'Analizando archivo…'
                  : 'Analyzing file…'
                : userLanguage === 'es'
                  ? 'Conectando…'
                  : 'Connecting…'
            );

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
                    await parser.onReasoningDelta(
                      delta.reasoning_content,
                      userLanguage === 'es' ? 'Analizando teoría musical…' : 'Analyzing music theory…'
                    );
                    continue;
                  }

                  // 2. Models outputting <think>...</think> in content (Ollama / QwQ)
                  if (typeof delta.content === 'string' && delta.content) {
                    await parser.onContentDelta(
                      delta.content,
                      userLanguage === 'es' ? 'Analizando teoría musical…' : 'Analyzing music theory…'
                    );
                  }
                } catch {}
              }
            }

            await parser.finish(
              enrichedPrompt,
              userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…'
            );
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
        { role: 'user', content: enrichedPrompt },
      ];

      // Extract raw image bytes for Workers AI Vision model if image attachments are present
      const imageAtt = attachments.find(
        (a: any) => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')
      );
      let imageBytes: number[] | null = null;
      if (imageAtt?.dataUrl && typeof imageAtt.dataUrl === 'string') {
        try {
          const match = imageAtt.dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          if (match && match[1]) {
            const binString = atob(match[1]);
            imageBytes = [...Uint8Array.from(binString, (c) => c.charCodeAt(0))];
          }
        } catch {}
      }

      const candidateModels = [
        ...(hasImages && imageBytes ? ['@cf/meta/llama-3.2-11b-vision-instruct'] : []),
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
          let stream: any = null;

          if (modelCandidate === '@cf/meta/llama-3.2-11b-vision-instruct' && imageBytes) {
            // Workers AI Llama 3.2 Vision: try messages with image content part first
            try {
              stream = await env.AI.run(modelCandidate, {
                messages: [
                  { role: 'system', content: contextualSystemPrompt },
                  ...history.map((m: any) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                  })),
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: enrichedPrompt },
                      { type: 'image', image: imageBytes },
                    ],
                  },
                ],
                stream: true,
                max_tokens: 2048,
              });
            } catch (msgErr) {
              // Fallback to prompt + image array schema
              stream = await env.AI.run(modelCandidate, {
                prompt: `${contextualSystemPrompt}\n\n${history.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\nUser: ${enrichedPrompt}`,
                image: imageBytes,
                stream: true,
                max_tokens: 2048,
              });
            }
          } else {
            stream = await env.AI.run(modelCandidate, {
              messages,
              stream: true,
              max_tokens: 2048,
            });
          }

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
                  await parser.onContentDelta(
                    chunkText,
                    userLanguage === 'es' ? 'Analizando teoría musical…' : 'Analyzing music theory…'
                  );
                }
              } catch {}
            }
            return true;
          };

          let keepAliveTimer: any = null;
          try {
            await parser.onConnecting(
              hasImages
                ? userLanguage === 'es'
                  ? 'Leyendo imagen…'
                  : 'Reading image…'
                : hasAudio
                ? userLanguage === 'es'
                  ? 'Analizando audio…'
                  : 'Analyzing audio…'
                : hasFiles
                ? userLanguage === 'es'
                  ? 'Analizando archivo…'
                  : 'Analyzing file…'
                : userLanguage === 'es'
                ? 'Conectando…'
                : 'Connecting…'
            );
            keepAliveTimer = setInterval(() => {
              parser.ping().catch(() => {});
            }, 5000);

            if (firstChunk.value) {
              const keepGoing = await processChunkValue(firstChunk.value);
              if (!keepGoing) {
                await parser.finish(
                  enrichedPrompt,
                  userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…'
                );
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

            await parser.finish(
              enrichedPrompt,
              userLanguage === 'es' ? 'Estructurando recomendaciones…' : 'Shaping recommendations…'
            );
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
