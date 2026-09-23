import {
  type MusicalContextSnapshot,
  type StructuredRecommendation,
  type ChordProgressionRecommendation,
  type ToneRecipeRecommendation,
  type DrumGrooveRecommendation,
  type PracticeRoutineRecommendation,
} from '../../types/assistant';

export interface LocalIntelligenceResponse {
  content: string;
  recommendations: StructuredRecommendation[];
}

/**
 * Curated tone recipes matching industry-standard rigs.
 */
const TONE_RECIPES: Record<string, ToneRecipeRecommendation> = {
  gilmour: {
    title: 'Gilmour Pink Floyd "Comfortably Numb" Lead',
    targetInstrument: 'electric_guitar',
    ampModel: 'Hiwatt Custom 100 / Clean Tube Amp with High Headroom',
    gain: 6.5,
    bass: 5.5,
    mid: 7.0,
    treble: 6.0,
    presence: 6.5,
    reverb: 4.5,
    pedalChain: [
      {
        name: 'Compressor (Ross / Dyna Comp)',
        type: 'compressor',
        settings: { Output: '7.5', Sensitivity: '4.0' },
      },
      {
        name: 'Big Muff Style Fuzz (Rams Head)',
        type: 'fuzz',
        settings: { Sustain: '7.0', Tone: '5.5', Volume: '6.5' },
      },
      {
        name: 'Transparent Overdrive (Tube Driver)',
        type: 'overdrive',
        settings: { Level: '7.0', Hi: '5.0', Lo: '6.0', Drive: '4.5' },
      },
      {
        name: 'Analog Delay (Binson / Tape Style)',
        type: 'delay',
        settings: { Time: '380 ms', Feedback: '4.5', Mix: '4.0' },
      },
      {
        name: 'Rotary / Electric Mistress Flanger',
        type: 'modulation',
        settings: { Rate: '2.5', Range: '6.0', Color: '5.0' },
      },
    ],
    tips: [
      'Use the Strat bridge pickup with the tone rolled down slightly to ~8.',
      'Sustain comes from stacking the compressor into the Muff into the warm overdrive.',
      'Practice slow, deliberate bends with wide finger vibrato.',
    ],
  },
  funk_clean: {
    title: 'Modern Neo-Funk Clean Snap',
    targetInstrument: 'electric_guitar',
    ampModel: 'Fender Twin Reverb / Deluxe Reverb',
    gain: 3.2,
    bass: 4.5,
    mid: 5.0,
    treble: 7.2,
    presence: 6.8,
    reverb: 3.0,
    pedalChain: [
      {
        name: 'Fast Optical Compressor',
        type: 'compressor',
        settings: { Attack: 'Fast', Ratio: '4:1', MakeupGain: '+3dB' },
      },
      {
        name: 'Clean Boost / Preamp',
        type: 'overdrive',
        settings: { Gain: '1.5', BassCut: 'Enabled' },
      },
      {
        name: 'Stereo Chorus / Dimension',
        type: 'modulation',
        settings: { Depth: '3.0', Speed: '2.0', Mix: '2.5' },
      },
    ],
    tips: [
      'Select pickup position 4 (neck + middle) on a Stratocaster.',
      'Keep the right wrist relaxed for effortless 16th-note ghost strumming.',
      'A compressor tightens peak dynamics so muted chucks stay punchy in the mix.',
    ],
  },
  srv_blues: {
    title: 'Stevie Ray Vaughan Texas Blues Crunch',
    targetInstrument: 'electric_guitar',
    ampModel: 'Fender Super Reverb / Vibroverb (Pushed clean)',
    gain: 6.8,
    bass: 5.0,
    mid: 7.5,
    treble: 6.5,
    presence: 6.0,
    reverb: 4.0,
    pedalChain: [
      {
        name: 'Ibanez TS808 / TS9 Tube Screamer',
        type: 'overdrive',
        settings: { Drive: '2.5', Level: '9.0', Tone: '6.0' },
      },
      {
        name: 'Analog Wah Pedal',
        type: 'modulation',
        settings: { Q: 'Wide', HeelToe: 'Dynamic' },
      },
    ],
    tips: [
      'Tune down a half-step to Eb Standard (Eb Ab Db Gb Bb Eb) for thicker tone and easier bends.',
      'Use heavy gauge strings (.011 or .012) if your fingers can handle the tension.',
      'Pick hard near the bridge for percussive bite, and roll to neck pickup for singing leads.',
    ],
  },
  ambient_wash: {
    title: 'Ambient Shoegaze Dream Wash',
    targetInstrument: 'electric_guitar',
    ampModel: 'AC30 Top Boost / Clean Head',
    gain: 4.0,
    bass: 5.0,
    mid: 6.0,
    treble: 5.5,
    presence: 5.0,
    reverb: 8.5,
    pedalChain: [
      {
        name: 'Modulated Reverb (Hall / Shimmer)',
        type: 'reverb',
        settings: { Decay: '6.5s', PreDelay: '40ms', Mix: '6.5' },
      },
      {
        name: 'Reverse / Dotted Eighth Delay',
        type: 'delay',
        settings: { Time: '450 ms', Repeats: '7.0', Mix: '5.5' },
      },
      {
        name: 'Lush Analog Chorus',
        type: 'modulation',
        settings: { Rate: '3.0', Depth: '6.5' },
      },
      {
        name: 'Warm Overdrive (Morning Glory / Bluesbreaker)',
        type: 'overdrive',
        settings: { Gain: '4.5', Tone: '5.0', Volume: '6.0' },
      },
    ],
    tips: [
      'Place the reverb before the overdrive for authentic textured shoegaze distortion bloom.',
      'Use a volume pedal or guitar volume knob for expressive swells without pick attack.',
    ],
  },
  motown_bass: {
    title: 'James Jamerson Motown P-Bass Thump',
    targetInstrument: 'bass',
    ampModel: 'Ampeg B-15 Portaflex Flip-Top Tube Amp',
    gain: 4.5,
    bass: 7.5,
    mid: 6.8,
    treble: 2.5,
    presence: 2.0,
    pedalChain: [
      {
        name: 'Passive DI Box / Transformer Saturation',
        type: 'compressor',
        settings: { Warmth: 'High', Ratio: '3:1' },
      },
      {
        name: 'Vintage Opto Compressor (LA-2A style)',
        type: 'compressor',
        settings: { PeakReduction: '6.0', Gain: '5.5' },
      },
    ],
    tips: [
      'Use flatwound strings that have broken in for months (never clean them!).',
      'Pluck with only your index finger ("The Hook") directly over the neck joint.',
      'Slide a piece of foam rubber underneath the strings against the bridge saddle to damp overtones.',
    ],
  },
};

/**
 * Standard chord progression library for quick intelligent suggestions.
 */
const PROGRESSION_PRESETS: Array<ChordProgressionRecommendation & { id: string; name: string; genre: string }> = [
  {
    id: 'neo_soul_maj9',
    name: 'Neo-Soul Lush Movement',
    genre: 'R&B / Neo-Soul',
    key: 'Db',
    mode: 'Major',
    feel: 'Smooth, late-night groove',
    chords: ['Dbmaj9', 'Fm7', 'Bbm7', 'Ebm9', 'Ab13'],
    romanNumerals: ['Imaj9', 'iii7', 'vi7', 'ii9', 'V13'],
    description: 'Classic velvety voice leading with gentle extensions and warm secondary dominants.',
  },
  {
    id: 'jazz_turnaround_251',
    name: 'Bebop Major 2-5-1 Turnaround',
    genre: 'Jazz',
    key: 'C',
    mode: 'Ionian',
    feel: 'Swinging, sophisticated harmonic resolution',
    chords: ['Dm9', 'G13(b9)', 'Cmaj9', 'A7(alt)'],
    romanNumerals: ['ii9', 'V13(b9)', 'Imaj9', 'VI7(alt)'],
    description: 'The foundation of jazz harmony. Altered 5th degree pulls magnetically into the tonic.',
  },
  {
    id: 'spanish_rock_enjambre',
    name: 'Vintage Spanish Rock Romance (Enjambre Style)',
    genre: 'Spanish Rock / Vintage Pop',
    key: 'Am',
    mode: 'Aeolian / Harmonic Minor',
    feel: 'Melancholic, driving ballad with 60s romantic nostalgia',
    chords: ['Am', 'C', 'Dm', 'E7'],
    romanNumerals: ['i', 'bIII', 'iv', 'V7'],
    description: 'Dynamic nostalgic progression with sharp dominant 7th resolution into the minor tonic.',
  },
  {
    id: 'andalusian_cadence',
    name: 'Andalusian Flamenco Descent',
    genre: 'Flamenco / Latin Rock',
    key: 'Am',
    mode: 'Phrygian Dominant',
    feel: 'Passionate, dramatic descending tension',
    chords: ['Am', 'G', 'F', 'E'],
    romanNumerals: ['i', 'bVII', 'bVI', 'V'],
    description: 'Timeless descending tetrachord used in flamenco, rock solos, and dramatic interludes.',
  },
  {
    id: 'modal_dorian_funk',
    name: 'Dorian Funk Vamp',
    genre: 'Funk / Fusion',
    key: 'Dm',
    mode: 'Dorian',
    feel: 'Cool, confident groove that never grows stale',
    chords: ['Dm7', 'G7', 'Dm7', 'G7', 'Bbmaj7', 'C'],
    romanNumerals: ['i7', 'IV7', 'i7', 'IV7', 'bVImaj7', 'bVII'],
    description: 'Santana and Miles Davis signature sound. The major 6th interval provides the bright Dorian flavor.',
  },
  {
    id: 'epic_cinematic_pop',
    name: 'Emotional Cinematic 4-Chord Journey',
    genre: 'Pop / Epic Rock',
    key: 'G',
    mode: 'Major',
    feel: 'Uplifting, anthemic, instantly memorable',
    chords: ['G', 'D/F#', 'Em7', 'Cadd9'],
    romanNumerals: ['I', 'V6', 'vi7', 'IVadd9'],
    description: 'Stepwise descending bassline with constant common-tone chime on the high strings.',
  },
];

/**
 * Standard drum groove presets.
 */
const DRUM_GROOVE_PRESETS: DrumGrooveRecommendation[] = [
  {
    name: 'Classic 16th-Note Pocket Funk',
    genre: 'Funk',
    bpm: 96,
    timeSignature: '4/4',
    swing: 25,
    kitRecommendation: 'Crisp Studio Maple Kit',
    patternPreview: {
      kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    },
  },
  {
    name: 'Half-Time Shuffle (Purdie Groove)',
    genre: 'Rock / R&B',
    bpm: 110,
    timeSignature: '4/4',
    swing: 65,
    kitRecommendation: 'Deep Vintage Birch Kit with Sizzle Ride',
    patternPreview: {
      kick: [true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
      snare: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      hihat: [true, false, true, true, false, true, true, false, true, true, false, true, true, false, true, true],
    },
  },
  {
    name: 'Driving 4-on-the-Floor Indie Rock',
    genre: 'Indie Rock',
    bpm: 128,
    timeSignature: '4/4',
    swing: 0,
    kitRecommendation: 'Aggressive Power Kit with Open Hats',
    patternPreview: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    },
  },
];

/**
 * Solves a music query locally and deterministically using Livex's core datasets.
 */
export function queryLocalMusicIntelligence(
  userQuery: string,
  context?: MusicalContextSnapshot
): LocalIntelligenceResponse {
  const q = userQuery.toLowerCase().trim();
  const recommendations: StructuredRecommendation[] = [];

  // 1. TONE & GEAR RECIPES
  if (
    q.includes('tone') ||
    q.includes('pedal') ||
    q.includes('amp') ||
    q.includes('fuzz') ||
    q.includes('distortion') ||
    q.includes('delay') ||
    q.includes('overdrive') ||
    q.includes('sound like') ||
    q.includes('settings')
  ) {
    let recipe = TONE_RECIPES.gilmour;
    if (q.includes('funk') || q.includes('clean') || q.includes('strat')) {
      recipe = TONE_RECIPES.funk_clean;
    } else if (q.includes('blues') || q.includes('srv') || q.includes('vaughan') || q.includes('texas')) {
      recipe = TONE_RECIPES.srv_blues;
    } else if (q.includes('ambient') || q.includes('shoegaze') || q.includes('reverb') || q.includes('dream')) {
      recipe = TONE_RECIPES.ambient_wash;
    } else if (q.includes('bass') || q.includes('motown') || q.includes('jamerson')) {
      recipe = TONE_RECIPES.motown_bass;
    }

    recommendations.push({
      id: `rec-tone-${Date.now()}`,
      type: 'tone_recipe',
      title: recipe.title,
      data: recipe,
      actionLabel: 'View Dial Settings',
    });

    const pedalSummary = (recipe.pedalChain || [])
      .map((p, i) => `${i + 1}. **${p.name}** (${p.type})`)
      .join('\n');

    const tipsSummary = (recipe.tips || []).map((t) => `- ${t}`).join('\n');

    return {
      content: `### 🎸 ${recipe.title}

To dial in this iconic tone, here is the complete signal chain and amplifier configuration:

**Amplifier Architecture:**
- **Amp Type:** ${recipe.ampModel}
- **Gain:** \`${recipe.gain}/10\` | **Bass:** \`${recipe.bass}/10\` | **Mid:** \`${recipe.mid}/10\` | **Treble:** \`${recipe.treble}/10\`
- **Reverb:** \`${recipe.reverb ?? 3}/10\`

**Pedalboard Signal Order:**
${pedalSummary}

**Pro-Performance Tips:**
${tipsSummary}

I've attached an interactive **Tone Recipe Card** below with exact knob values!`,
      recommendations,
    };
  }

  // 2. CHORD PROGRESSIONS & HARMONY
  if (
    q.includes('progression') ||
    q.includes('chord') ||
    q.includes('harmony') ||
    q.includes('acordes') ||
    q.includes('progresion') ||
    q.includes('neo soul') ||
    q.includes('jazz') ||
    q.includes('flamenco')
  ) {
    let preset = PROGRESSION_PRESETS[0]; // Neo-soul default
    if (q.includes('jazz') || q.includes('ii-v-i') || q.includes('2-5-1')) {
      preset = PROGRESSION_PRESETS[1];
    } else if (q.includes('enjambre') || q.includes('spanish') || q.includes('rock en espanol') || q.includes('vintage')) {
      preset = PROGRESSION_PRESETS[2];
    } else if (q.includes('flamenco') || q.includes('andalusian') || q.includes('spanish')) {
      preset = PROGRESSION_PRESETS[3];
    } else if (q.includes('dorian') || q.includes('funk') || q.includes('vamp')) {
      preset = PROGRESSION_PRESETS[4];
    } else if (q.includes('pop') || q.includes('epic') || q.includes('anthem')) {
      preset = PROGRESSION_PRESETS[5];
    }

    recommendations.push({
      id: `rec-prog-${Date.now()}`,
      type: 'chord_progression',
      title: `${preset.name} (Key of ${preset.key})`,
      data: preset,
      actionLabel: 'Open in Chordex',
      actionPayload: {
        app: 'chordex',
        action: 'load_progression',
        params: { chords: preset.chords, key: preset.key },
      },
    });

    const chordList = preset.chords.map((c) => `\`${c}\``).join('  ⟶  ');
    const numeralList = preset.romanNumerals.map((r) => `\`${r}\``).join('  ⟶  ');

    return {
      content: `### 🎼 ${preset.name}

Here is a sophisticated harmonic progression in **${preset.key} ${preset.mode || 'Major'}**:

**Chords:**
${chordList}

**Harmonic Function (Roman Numerals):**
${numeralList}

**Musical Feel & Characteristics:**
- **Genre:** ${preset.genre}
- **Vibe:** ${preset.feel}
- **Analysis:** ${preset.description}

You can tap the **Chord Progression Card** below to explore the voicings or load them directly into **Chordex**!`,
      recommendations,
    };
  }

  // 3. DRUMS & GROOVES
  if (
    q.includes('drum') ||
    q.includes('groove') ||
    q.includes('bateria') ||
    q.includes('ritmo') ||
    q.includes('beat') ||
    q.includes('bpm') ||
    q.includes('tempo') ||
    q.includes('shuffle')
  ) {
    let groove = DRUM_GROOVE_PRESETS[0];
    if (q.includes('shuffle') || q.includes('purdie') || q.includes('half time')) {
      groove = DRUM_GROOVE_PRESETS[1];
    } else if (q.includes('rock') || q.includes('4-on-the-floor') || q.includes('indie')) {
      groove = DRUM_GROOVE_PRESETS[2];
    }

    recommendations.push({
      id: `rec-drum-${Date.now()}`,
      type: 'drum_groove',
      title: `${groove.name} (${groove.bpm} BPM)`,
      data: groove,
      actionLabel: 'Load into Drumex',
      actionPayload: {
        app: 'drumex',
        action: 'set_tempo',
        params: { bpm: groove.bpm, kit: groove.kitRecommendation },
      },
    });

    return {
      content: `### 🥁 ${groove.name}

Here is a high-energy groove template ready for your rhythm section:

- **Tempo:** \`${groove.bpm} BPM\`
- **Time Signature:** \`${groove.timeSignature}\`
- **Swing / Humanize:** \`${groove.swing ?? 0}%\`
- **Recommended Kit:** ${groove.kitRecommendation}

**Rhythmic Dynamics:**
Ghost notes on the snare during the upbeat offsets give this groove its signature breath and pocket. Lock your bassline onto the kick placements for a tight mix!

I've generated a visual **Drum Groove Card** below. Tap to audition and sync with **Drumex**!`,
      recommendations,
    };
  }

  // 4. MUSIC THEORY QUESTIONS
  if (
    q.includes('theory') ||
    q.includes('mode') ||
    q.includes('dorian') ||
    q.includes('aeolian') ||
    q.includes('mixolydian') ||
    q.includes('scale') ||
    q.includes('secondary dominant') ||
    q.includes('tritone') ||
    q.includes('circle of fifths')
  ) {
    if (q.includes('dorian') || q.includes('aeolian')) {
      return {
        content: `### 🎵 Dorian vs. Aeolian (Natural Minor)

Both **Dorian** and **Aeolian** are minor modes, but their emotional character is defined by a single crucial scale degree:

| Characteristic | **Dorian** (2nd Mode) | **Aeolian** (Natural Minor / 6th Mode) |
| :--- | :--- | :--- |
| **Formula** | \`1 - 2 - b3 - 4 - 5 - 6 - b7\` | \`1 - 2 - b3 - 4 - 5 - b6 - b7\` |
| **Signature Note** | **Natural 6th** (\`♮6\`) | **Flat 6th** (\`b6\`) |
| **Color / Mood** | Bright, hopeful minor, sophisticated funk | Dark, melancholic, serious, classical |
| **Famous Example** | *"Oye Como Va"*, *"So What"* (Miles Davis) | *"Stairway to Heaven"*, *"Losing My Religion"* |
| **Characteristic Chord** | \`i7\` to \`IV7\` (e.g. \`Dm7 - G7\`) | \`i\` to \`bVI\` (e.g. \`Am - F\`) |

**Quick Musician Tip:**
When soloing over a minor chord, raising the 6th by a half-step immediately gives you that silky Carlos Santana / Pink Floyd fusion flavor without altering the root chord!`,
        recommendations,
      };
    }

    return {
      content: `### 🎼 Music Theory Analysis

In Western tonal harmony, tension and release are driven by harmonic gravity:

1. **Tension Builders:**
   - **Tritone interval:** The 3 whole-step dissonance between the 3rd and 7th degrees of a Dominant 7th chord (e.g., \`B\` and \`F\` in \`G7\`).
   - **Secondary Dominants:** Borrowing a dominant chord from another key (e.g., \`V7/V\`) to create anticipation before landing on the target chord.
   - **Tritone Substitution:** Replacing a dominant chord with one a tritone away (e.g., \`Db7\` substituting for \`G7\` resolving to \`Cmaj7\`), producing smooth chromatic bass descent (\`Db ⟶ C\`).

2. **Resolution Anchors:**
   - **Tonic (\`I\` / \`i\`):** Complete stability and rest.
   - **Voice Leading:** Notes moving by step (half-steps or whole-steps) into chord tones produce the most natural-sounding transitions.

Would you like me to map out a specific key or chord substitution for your song?`,
      recommendations,
    };
  }

  // 5. VOCALS & COACHING
  if (
    q.includes('vocal') ||
    q.includes('voice') ||
    q.includes('sing') ||
    q.includes('voz') ||
    q.includes('cantar') ||
    q.includes('warmup') ||
    q.includes('harmonizer')
  ) {
    const routine: PracticeRoutineRecommendation = {
      title: '5-Minute Stage Vocal Warmup',
      focusArea: 'vocals',
      durationMinutes: 5,
      steps: [
        { title: 'Lip Trills (Brimming)', description: 'Gentle 5-tone ascending and descending scales to balance breath pressure.', durationMinutes: 1 },
        { title: 'Sirens on "Ng"', description: 'Glide smoothly between chest and head voice without sudden breaks.', durationMinutes: 1.5 },
        { title: 'Resonance on "Nay"', description: 'Bright nasal placement to engage the pharyngeal resonating chambers.', durationMinutes: 1.5 },
        { title: 'Vowel Unification', description: 'Transition "Ah - Eh - Ee - Oh - Oo" on a sustained pitch with relaxed jaw.', durationMinutes: 1 },
      ],
    };

    recommendations.push({
      id: `rec-vocal-${Date.now()}`,
      type: 'practice_routine',
      title: routine.title,
      data: routine,
      actionLabel: 'Open Vocalex',
      actionPayload: { app: 'vocalex', action: 'open', params: {} },
    });

    return {
      content: `### 🎤 Vocal Warmup & Performance Technique

To project with clarity and protect your vocal folds during rehearsals and gigs:

1. **Diaphragmatic Support:** Inhale by allowing your lower belly and ribs to expand naturally, keeping your shoulders relaxed.
2. **Vocal Placement:** Feel the vibration in the "mask" (cheekbones and sinus cavities) rather than squeezing from the throat.
3. **Harmonizer Tip:** When using **Vocalex Harmonizer**, singing in equal temperament pitch helps the intelligent interval engine track your fundamental note and lock 3rd/5th harmonies tightly.

Here is a structured **5-Minute Vocal Warmup Routine** to try right now before tracking takes:`,
      recommendations,
    };
  }

  // 6. LIVEX APP GUIDANCE
  if (
    q.includes('livex') ||
    q.includes('how to use') ||
    q.includes('como uso') ||
    q.includes('chordex') ||
    q.includes('drumex') ||
    q.includes('groovex') ||
    q.includes('stagex') ||
    q.includes('vocalex')
  ) {
    return {
      content: `### ⚡ Welcome to Livex Studio Suite

Livex is an integrated, low-latency ecosystem built for musicians, producers, and live performers:

- **🎸 Chordex:** Visual chord library, guitar & piano voicings, transpositions, and real-time interactive song practice charts.
- **🥁 Drumex:** High-precision drum machine with multi-kit step sequencing, groove swing control, and metronome practice tools.
- **🎛️ Groovex:** Multi-track stem player and backing track engine with real-time waveform navigation and mixer sliders.
- **🎙️ Vocalex:** Low-latency pitch monitor, tuner, take recorder, and intelligent multi-voice vocal harmonizer.
- **🎪 Stagex:** Interactive 2D stage layout planner, audio channel routing, monitor placement, and live gig setup coordinator.

You can switch between any app instantly using the **App Switcher** button on the bottom bar!`,
      recommendations,
    };
  }

  // 7. DEFAULT MUSICAL INTELLIGENCE RESPONSE
  const activeApp = context?.activeApp || 'hub';
  const songTitle = context?.currentSongTitle ? `*"${context.currentSongTitle}"*` : null;

  return {
    content: `### 🎶 Livex Music Assistant

I'm your musical pair-programmer, theory coach, and tone designer. 

${songTitle ? `I see you're currently working on ${songTitle} in **${context?.activeApp}**!` : `You're currently in **${activeApp.toUpperCase()}**.`}

Here are some things you can ask me:
- *"Suggest a neo-soul chord progression with extensions"*
- *"How can I get an ambient Pink Floyd guitar tone?"*
- *"Explain the difference between Dorian and Aeolian modes"*
- *"Give me a 16th-note pocket funk drum groove"*
- *"Warmup routine for vocals before a gig"*
- *"How do I transpose chords in Chordex?"*

What are we creating today?`,
    recommendations,
  };
}
