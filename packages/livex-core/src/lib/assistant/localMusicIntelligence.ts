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
      'Bridge pickup with tone rolled down to approximately 8.',
      'Stack compressor into fuzz into transparent overdrive for harmonic sustain.',
      'Deliberate bends with wide, controlled vibrato.',
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
      'Position 4 (neck + middle) on Stratocaster-style instruments.',
      'Relaxed right-wrist motion for 16th-note ghost strums.',
      'Fast optical compression stabilizes peak transient dynamics.',
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
      'Tuning down one half-step to Eb Standard (Eb Ab Db Gb Bb Eb) reduces string tension and enhances low-mid resonance.',
      'Heavy gauge strings (.011 or .012) produce higher acoustic output and fuller fundamental response.',
      'Pick near the bridge for percussive bite; switch to neck pickup for sustained melodic lines.',
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
        settings: { Drive: '3.5', Tone: '5.0', Level: '6.0' },
      },
    ],
    tips: [
      'Place modulation after reverb to smear repeats into an evolving pad texture.',
      'Use volume swells with guitar volume pot or dedicated volume pedal before the delay/reverb section.',
    ],
  },
  motown_bass: {
    title: 'James Jamerson Classic Motown P-Bass',
    targetInstrument: 'bass',
    ampModel: 'Ampeg B-15 Portaflex / Direct Tube DI',
    gain: 4.5,
    bass: 8.0,
    mid: 5.0,
    treble: 2.5,
    presence: 2.0,
    reverb: 0.0,
    pedalChain: [
      {
        name: 'Vintage Opto Compressor (LA-2A Style)',
        type: 'compressor',
        settings: { PeakReduction: '6.0', Gain: '5.5' },
      },
      {
        name: 'Warm Analog Preamp / Saturator',
        type: 'overdrive',
        settings: { Drive: '2.0', Warmth: 'High' },
      },
    ],
    tips: [
      'Precision Bass with flatwound strings.',
      'Roll tone knob completely down (0-2) to isolate low fundamental frequencies.',
      'Pluck with index finger ("the hook") over the pickup.',
    ],
  },
};

/**
 * Standard chord progression library with Roman numeral harmonic analysis.
 */
const PROGRESSION_PRESETS: Array<{
  id: string;
  name: string;
  genre: string;
  key: string;
  mode?: string;
  feel: string;
  chords: string[];
  romanNumerals: string[];
  description: string;
}> = [
  {
    id: 'neosoul_extended',
    name: 'Neo-Soul Extended 9th & 13th Cycle',
    genre: 'Neo-Soul / R&B',
    key: 'Db',
    mode: 'Major',
    feel: 'Lush, velvety harmonic movement with secondary dominant resolution',
    chords: ['Dbmaj9', 'Fm7', 'Bbm7', 'Ebm9', 'Ab13'],
    romanNumerals: ['Imaj9', 'iii7', 'vi7', 'ii9', 'V13'],
    description: 'Stepwise voice leading with 9th and 13th extensions over a circular circle-of-fifths turnaround.',
  },
  {
    id: 'jazz_turnaround_251',
    name: 'Bebop Major 2-5-1 Turnaround',
    genre: 'Jazz',
    key: 'C',
    mode: 'Ionian',
    feel: 'Diatonic tension and resolution with altered dominant substitution',
    chords: ['Dm9', 'G13(b9)', 'Cmaj9', 'A7(alt)'],
    romanNumerals: ['ii9', 'V13(b9)', 'Imaj9', 'VI7(alt)'],
    description: 'Foundational jazz cadence. The altered dominant creates smooth half-step voice leading into the tonic.',
  },
  {
    id: 'spanish_rock_enjambre',
    name: 'Vintage Rock Romance',
    genre: 'Latin Rock / Ballad',
    key: 'Am',
    mode: 'Aeolian / Harmonic Minor',
    feel: 'Melancholic, driving cadence with minor dominant resolution',
    chords: ['Am', 'C', 'Dm', 'E7'],
    romanNumerals: ['i', 'bIII', 'iv', 'V7'],
    description: 'Minor tonic to relative major, passing subdominant, resolving strongly through the major V7.',
  },
  {
    id: 'andalusian_cadence',
    name: 'Andalusian Tetrachord Descent',
    genre: 'Flamenco / Latin',
    key: 'Am',
    mode: 'Phrygian Dominant',
    feel: 'Stepwise descending tension resolving to dominant tonic',
    chords: ['Am', 'G', 'F', 'E'],
    romanNumerals: ['i', 'bVII', 'bVI', 'V'],
    description: 'Descending minor tetrachord through natural minor scale degrees resolving to Phrygian dominant.',
  },
  {
    id: 'modal_dorian_funk',
    name: 'Dorian Modal Vamp',
    genre: 'Funk / Fusion',
    key: 'Dm',
    mode: 'Dorian',
    feel: 'Stable modal vamp centered on major 6th degree',
    chords: ['Dm7', 'G7', 'Dm7', 'G7', 'Bbmaj7', 'C'],
    romanNumerals: ['i7', 'IV7', 'i7', 'IV7', 'bVImaj7', 'bVII'],
    description: 'The alternating i7-IV7 establishes the Dorian mode via the natural 6th (B in D Dorian).',
  },
  {
    id: 'epic_cinematic_pop',
    name: 'Cinematic Stepwise Progression',
    genre: 'Soundtrack / Pop',
    key: 'G',
    mode: 'Major',
    feel: 'Anthemic harmonic arc with pedal point voice leading',
    chords: ['G', 'D/F#', 'Em7', 'Cadd9'],
    romanNumerals: ['I', 'V6', 'vi7', 'IVadd9'],
    description: 'Descending bassline with sustained high common tones (D and G) throughout.',
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
    kitRecommendation: 'Studio Maple Kit',
    patternPreview: {
      kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    },
  },
  {
    name: 'Half-Time Shuffle (Purdie Cadence)',
    genre: 'Rock / R&B',
    bpm: 110,
    timeSignature: '4/4',
    swing: 65,
    kitRecommendation: 'Vintage Birch Kit with Sizzle Ride',
    patternPreview: {
      kick: [true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
      snare: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      hihat: [true, false, true, true, false, true, true, false, true, true, false, true, true, false, true, true],
    },
  },
  {
    name: 'Four-on-the-Floor Driving Cadence',
    genre: 'Indie Rock',
    bpm: 128,
    timeSignature: '4/4',
    swing: 0,
    kitRecommendation: 'Power Rock Kit with Open Hi-Hats',
    patternPreview: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    },
  },
];

/**
 * Solves a music query locally and deterministically using Livex's core datasets.
 * Strictly formatted for professional density: no emojis, no conversational filler.
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
      content: `### ${recipe.title}

Signal chain and amplifier staging:

**Amplifier Specifications:**
- **Model:** ${recipe.ampModel}
- **Gain:** \`${recipe.gain}/10\`
- **EQ:** Bass \`${recipe.bass}/10\` | Mid \`${recipe.mid}/10\` | Treble \`${recipe.treble}/10\`
- **Presence:** \`${recipe.presence}/10\` | **Reverb:** \`${recipe.reverb ?? 3}/10\`

**Pedalboard Order:**
${pedalSummary}

**Technical Considerations:**
${tipsSummary}`,
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

    const chordList = preset.chords.map((c) => `\`${c}\``).join('  ->  ');
    const numeralList = preset.romanNumerals.map((r) => `\`${r}\``).join('  ->  ');

    return {
      content: `### ${preset.name}

Harmonic progression in **${preset.key} ${preset.mode || 'Major'}**:

**Chords:**
${chordList}

**Roman Numeral Analysis:**
${numeralList}

**Harmonic Structure:**
- **Genre:** ${preset.genre}
- **Feel:** ${preset.feel}
- **Voice Leading:** ${preset.description}`,
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
      content: `### ${groove.name}

Rhythm template parameters:

- **Tempo:** \`${groove.bpm} BPM\`
- **Meter:** \`${groove.timeSignature}\`
- **Swing Factor:** \`${groove.swing ?? 0}%\`
- **Recommended Sound Profile:** ${groove.kitRecommendation}

**Rhythmic Dynamics:**
Ghost notes on off-beat subdivisions establish pocket and forward momentum. Align the bass fundamental with primary kick hits to maintain low-frequency clarity.`,
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
        content: `### Dorian vs. Aeolian (Natural Minor)

Both Dorian and Aeolian are minor modes sharing identical root, minor third, fourth, fifth, and minor seventh intervals. The sole differentiating factor is the sixth scale degree:

| Feature | Dorian (Mode II) | Aeolian (Mode VI / Natural Minor) |
| :--- | :--- | :--- |
| **Interval Formula** | \`1 - 2 - b3 - 4 - 5 - 6 - b7\` | \`1 - 2 - b3 - 4 - 5 - b6 - b7\` |
| **Defining Degree** | **Natural 6th** (\`6\`) | **Minor 6th** (\`b6\`) |
| **Tonal Character** | Bright minor, fusion / modal jazz | Dark, melancholic, classical minor |
| **Cadential Marker** | \`i7 - IV7\` (e.g., \`Dm7 - G7\`) | \`i - bVI\` (e.g., \`Am - F\`) |
| **Reference Context** | *"So What"* (Miles Davis) | *"Stairway to Heaven"* |

**Application:**
When improvising over a minor tonic chord, raising the sixth degree by a half-step eliminates the tritone interval with the third degree, generating Dorian's characteristic open harmonic resonance without altering the tonic triad.`,
        recommendations,
      };
    }

    return {
      content: `### Western Harmonic Tension and Resolution

Functional harmony organizes musical momentum via harmonic gravity:

1. **Dissonance and Tension:**
   - **Tritone Interval:** The 3-whole-tone interval between the 3rd and 7th degrees of a dominant 7th chord (e.g., \`B\` and \`F\` in \`G7\`). Its inherent instability seeks inward or outward half-step resolution to tonic chord tones.
   - **Secondary Dominants (\`V7/x\`):** Chromatic alterations targeting diatonic chords outside the tonic to intensify harmonic anticipation.
   - **Tritone Substitution:** Substituting a dominant chord with one a tritone away (e.g., \`Db7\` for \`G7\`), retaining the identical active tritone while creating chromatic bass resolution (\`Db -> C\`).

2. **Stability and Voice Leading:**
   - **Tonic Resolution:** Point of lowest harmonic tension.
   - **Stepwise Voice Leading:** Movement by half-step or whole-step between voices yields optimal acoustic cohesion and natural transition.`,
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
        { title: 'Lip Trills', description: 'Ascending and descending 5-tone scales to regulate subglottic air pressure.', durationMinutes: 1 },
        { title: 'Sirens on "Ng"', description: 'Continuous pitch glides between chest and head registers to smooth passagio transitions.', durationMinutes: 1.5 },
        { title: 'Pharyngeal Resonance on "Nay"', description: 'Focused placement targeting pharyngeal resonating chambers.', durationMinutes: 1.5 },
        { title: 'Vowel Unification', description: 'Sustained pitches transitioning [a] - [e] - [i] - [o] - [u] with neutral jaw position.', durationMinutes: 1 },
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
      content: `### Vocal Warmup and Technical Execution

Key mechanics for vocal performance:

1. **Subglottic Breath Management:** Engage lower abdominal and intercostal expansion. Maintain consistent air pressure without pushing from the larynx.
2. **Acoustic Placement:** Focus sensation toward the hard palate and zygomatic regions to maximize resonance efficiency without muscular strain.
3. **Pitch Tracking:** Equal-temperament intonation stabilizes fundamental frequency detection when tracking with harmonizer algorithms.

**5-Minute Vocal Warmup Protocol:**
- 1.0 min: Lip trills across 5-note scales
- 1.5 min: Continuous sirens on nasal consonants
- 1.5 min: Narrow vowel resonance exercises
- 1.0 min: Sustained vowel equalization`,
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
      content: `### Livex Architecture Overview

- **Chordex:** Harmonic library, voicing diagrams, transpositions, and real-time chord charts.
- **Drumex:** Step-sequencer drum machine, tempo calibration, metronome, and rhythm practice engine.
- **Groovex:** Multi-track stem player and backing track rehearsal mixer.
- **Vocalex:** Pitch tracking, tuner, vocal practice tools, and interval harmonizer.
- **Stagex:** Stage plot designer, audio routing planner, monitor placement, and live gear coordinator.`,
      recommendations,
    };
  }

  // 7. DEFAULT CONTEXT-AWARE RESPONSE
  const activeApp = context?.activeApp || 'hub';
  const songTitle = context?.currentSongTitle ? `("${context.currentSongTitle}")` : '';

  return {
    content: `### Livex Music Assistant

Active context: ${activeApp.toUpperCase()} ${songTitle}

Supported technical queries:
- Harmonic analysis and chord progressions
- Instrument signal chains, amplifier staging, and pedal parameters
- Modal theory, voice leading, and scale relationships
- Rhythm structures, tempos, and swing timing
- Vocal performance and warmup protocols`,
    recommendations,
  };
}
