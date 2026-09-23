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
 * Curated tone recipes matching industry-standard rigs and iconic international scenes.
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
        settings: { Drive: '4.5', Tone: '5.0', Level: '6.0' },
      },
    ],
    tips: [
      'Place reverse or modulated reverb BEFORE overdrive for authentic shoegaze density.',
      'Use volume pedal swells to eliminate percussive string attack transients.',
      'Slight pitch vibrato or tremolo arm gentle depression creates the characteristic glide sensation.',
    ],
  },
  motown_bass: {
    title: 'James Jamerson Motown P-Bass Punch',
    targetInstrument: 'bass',
    ampModel: 'Ampeg B-15 Portaflex Flip-Top Tube Amp',
    gain: 5.5,
    bass: 7.0,
    mid: 6.5,
    treble: 3.5,
    presence: 3.0,
    reverb: 0.0,
    pedalChain: [
      {
        name: 'Vintage Tube Direct Box (Wolfbox / Reddi)',
        type: 'compressor',
        settings: { InputGain: '+4dB', Saturation: 'Warm' },
      },
    ],
    tips: [
      'Fender Precision Bass with high-action flatwound strings (La Bella .052-.110).',
      'Foam rubber mute placed under strings against the bridge saddle to dampen overtone decay.',
      'Plucking strictly with the index finger ("The Hook") over the pickup.',
    ],
  },
  caifanes_marcovich: {
    title: 'Caifanes Dark Rock En Español (Alejandro Marcovich)',
    targetInstrument: 'electric_guitar',
    ampModel: 'Roland JC-120 Jazz Chorus / Fender Twin Reverb',
    gain: 3.8,
    bass: 5.2,
    mid: 6.8,
    treble: 7.2,
    presence: 7.0,
    reverb: 4.5,
    pedalChain: [
      {
        name: 'Compressor / Sustainer (Boss CS-3)',
        type: 'compressor',
        settings: { Level: '7.0', Tone: '6.0', Attack: '5.0', Sustain: '6.5' },
      },
      {
        name: 'Stereo Chorus (Boss CE-2)',
        type: 'modulation',
        settings: { Rate: '4.2', Depth: '6.5' },
      },
      {
        name: 'Digital Delay (Boss DD-3)',
        type: 'delay',
        settings: { Time: '380 ms (Dotted 8th)', Feedback: '4.5', 'E.Level': '5.0' },
      },
      {
        name: 'Overdrive / Distortion (ProCo Rat 2)',
        type: 'distortion',
        settings: { Distortion: '4.0', Filter: '6.5', Volume: '6.0' },
      },
    ],
    tips: [
      'Stratocaster bridge or bridge+middle pickup positions.',
      'Arpeggiate minor triads with deliberate palm-muting to emphasize rhythmic delay repeats.',
      'Incorporate harmonic minor intervals (raised 7th degree) and Phrygian dominant inflections.',
    ],
  },
  post_punk_bass: {
    title: 'Post-Punk Melodic Chorus Bass (The Cure / Joy Division / Caifanes)',
    targetInstrument: 'bass',
    ampModel: 'Ampeg SVT-CL / Trace Elliot 4x10',
    gain: 5.0,
    bass: 6.5,
    mid: 7.2,
    treble: 7.5,
    presence: 6.5,
    reverb: 1.5,
    pedalChain: [
      {
        name: 'Fast Optical Compressor',
        type: 'compressor',
        settings: { Ratio: '4:1', Attack: 'Fast', Threshold: '-18dB' },
      },
      {
        name: 'Analog Chorus (Boss CE-2B / Small Clone)',
        type: 'modulation',
        settings: { Rate: '4.0', Depth: '7.0' },
      },
      {
        name: 'Bass Flanger (Boss BF-2B)',
        type: 'modulation',
        settings: { Manual: '6.0', Depth: '5.0', Rate: '3.0', Res: '5.5' },
      },
    ],
    tips: [
      'Play with a heavy pick (.88mm to 1.0mm) close to the bridge for harmonic definition.',
      'Roundwound strings (.045-.105) provide bright treble bite.',
      'Lead melodic lines played on G and D strings between the 7th and 14th frets.',
    ],
  },
  modern_metal: {
    title: 'Modern Progressive High-Gain Metal Chug',
    targetInstrument: 'electric_guitar',
    ampModel: 'Peavey 5150 / EVH 5150 III / Mesa Dual Rectifier',
    gain: 6.8,
    bass: 5.8,
    mid: 6.5,
    treble: 6.5,
    presence: 7.0,
    reverb: 0.5,
    pedalChain: [
      {
        name: 'Clean Overdrive Boost (Ibanez TS9 / Precision Drive)',
        type: 'overdrive',
        settings: { Drive: '0.0', Level: '10.0', Tone: '6.5', Attack: 'Tight' },
      },
      {
        name: 'High-Speed Noise Gate (ISP Decimator / Fortin Zuul)',
        type: 'compressor',
        settings: { Threshold: '-28dB', KeyInput: 'Direct Guitar' },
      },
    ],
    tips: [
      'TS9 with Drive at zero cuts sub-100Hz rumble before preamp saturation, eliminating palm-muted mud.',
      'Bridge humbucker with ceramic or high-output alnico magnet.',
      'Tune to Drop D, Drop C, or 7-String Drop A with heavy bottom strings (.010-.052 or .011-.056).',
    ],
  },
};

/**
 * Curated progression presets across genres and global traditions.
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
    id: 'modal_interchange_borrowed',
    name: 'Modal Interchange: Borrowed bVI & bVII Minor Cadence',
    genre: 'Progressive Rock / Neo-Soul',
    key: 'C',
    mode: 'Major (Aeolian Borrowing)',
    feel: 'Cinematic, expansive release through submediant major chords',
    chords: ['Cmaj7', 'Abmaj7', 'Bb', 'Cmaj7'],
    romanNumerals: ['Imaj7', 'bVImaj7', 'bVII', 'Imaj7'],
    description: 'Borrowing bVImaj7 and bVII from the parallel C Aeolian into C Major creates soaring harmonic lift without modulating.',
  },
  {
    id: 'japanese_royal_road',
    name: 'Japanese Royal Road Progression (Oudou Shinkou)',
    genre: 'City Pop / J-Rock',
    key: 'F',
    mode: 'Major',
    feel: 'Bittersweet, energetic yearning characteristic of Tokyo 80s City Pop',
    chords: ['Bbmaj7', 'C7', 'Am7', 'Dm7'],
    romanNumerals: ['IVmaj7', 'V7', 'iii7', 'vi7'],
    description: 'The foundational spine of Japanese City Pop (Tatsuro Yamashita, Casiopea). Starts on subdominant major 7th and resolves to the relative minor.',
  },
  {
    id: 'caifanes_dark_rock',
    name: 'Caifanes Dark Aeolian Progression',
    genre: 'Mexican Rock / Post-Punk',
    key: 'Am',
    mode: 'Aeolian / Harmonic Minor',
    feel: 'Mystical, driving minor cadence with suspended resolutions',
    chords: ['Am', 'F', 'Dm', 'G', 'Em', 'Am'],
    romanNumerals: ['i', 'bVI', 'iv', 'bVII', 'v', 'i'],
    description: 'Iconic Mexican rock movement emphasizing the submediant bVI and natural minor tension.',
  },
  {
    id: 'afrobeat_dorian_ostinato',
    name: 'Afrobeat Modal Dorian Ostinato',
    genre: 'Afrobeat',
    key: 'Em',
    mode: 'Dorian',
    feel: 'Hypnotic, buoyant polyrhythmic dance groove',
    chords: ['Em9', 'A13', 'Em9', 'A13'],
    romanNumerals: ['i9', 'IV13', 'i9', 'IV13'],
    description: 'Fela Kuti and Tony Allen signature modal vamp. Natural 6th (C#) establishes open Dorian buoyancy over interlocking percussion.',
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
  {
    name: 'Tony Allen Afrobeat Poly-Groove',
    genre: 'Afrobeat',
    bpm: 114,
    timeSignature: '4/4',
    swing: 30,
    kitRecommendation: 'Vintage Birch Kit with Rivet Sizzle Ride',
    patternPreview: {
      kick: [true, false, false, true, false, false, true, false, false, false, true, false, false, true, false, false],
      snare: [false, false, true, false, false, false, false, true, false, true, false, false, true, false, false, true],
      hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    },
  },
  {
    name: 'Caifanes Tribal Floor-Tom Drive',
    genre: 'Latin Rock',
    bpm: 120,
    timeSignature: '4/4',
    swing: 15,
    kitRecommendation: 'Deep Oak Kit with Mallet Floor Toms',
    patternPreview: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    },
  },
];

/**
 * Solves a music query locally and deterministically using Livex's core datasets.
 * Strictly formatted for professional density: no emojis, no conversational filler.
 */
export function queryLocalMusicIntelligence(
  userQuery: string,
  context?: MusicalContextSnapshot,
  language?: string
): LocalIntelligenceResponse {
  const q = userQuery.toLowerCase().trim();
  const isSpanish =
    Boolean(language?.startsWith('es')) ||
    q.includes(' en español') ||
    q.includes('acordes') ||
    q.includes('progresion') ||
    q.includes('progresión') ||
    q.includes('guitarra') ||
    q.includes('tono') ||
    q.includes('ritmo') ||
    q.includes('bateria') ||
    q.includes('batería') ||
    q.includes('calentamiento') ||
    q.includes('cantar') ||
    q.includes('voz');
  const recommendations: StructuredRecommendation[] = [];

  // =========================================================================
  // 1. GLOBAL BANDS & REGIONAL SCENE INTELLIGENCE
  // =========================================================================

  // Latin America & Mexico: Caifanes / Jaguares / Marcovich / Alfonso André
  if (
    q.includes('caifanes') ||
    q.includes('jaguares') ||
    q.includes('marcovich') ||
    q.includes('alfonso andre') ||
    q.includes('alfonso andré')
  ) {
    const tone = TONE_RECIPES.caifanes_marcovich;
    const prog = PROGRESSION_PRESETS.find((p) => p.id === 'caifanes_dark_rock')!;
    recommendations.push({
      id: `rec-caifanes-${Date.now()}`,
      type: 'tone_recipe',
      title: tone.title,
      data: tone,
      actionLabel: isSpanish ? 'Ver Cadena de Pedales' : 'View Pedal Chain',
    });
    recommendations.push({
      id: `rec-caifanes-prog-${Date.now()}`,
      type: 'chord_progression',
      title: prog.name,
      data: prog,
      actionLabel: isSpanish ? 'Cargar en Chordex' : 'Open in Chordex',
      actionPayload: { app: 'chordex', action: 'load_progression', params: { chords: prog.chords, key: prog.key } },
    });

    if (isSpanish) {
      return {
        content: `### Caifanes: Análisis Técnico e Identidad Sonora

**Cadena de Señal y Arquitectura Sonora:**
- **Guitarra (Alejandro Marcovich):** Fender Stratocaster en pastilla del puente. Uso característico de Roland JC-120 (amplificador de estado sólido con coro estéreo integrado) y Boss DD-3 en subdivisión de corchea con puntillo (380 ms). Uso intensivo de escalas menores armónicas, frigia dominante y adornos modales de son tradicional mexicano adaptados al post-punk gótico.
- **Batería (Alfonso André):** Ritmos de tom de piso en semicorcheas con acentos tribales ("Mátenme Porque Me Muero", "Afuera", "Viento"), prescindiendo en pasajes clave del contratiempo tradicional.
- **Bajo (Sabo Romo):** Líneas melódicas con ataque de púa, afinación estándar con cuerdas entorchadas brillantes, procesado con coro analógico Boss CE-2B y saturación leve para sobresalir en el rango medio.

**Cadencia Armónica Representativa (\`Am\`):**
\`Am\` -> \`F\` -> \`Dm\` -> \`G\` -> \`Em\` -> \`Am\` (\`i -> bVI -> iv -> bVII -> v -> i\`)`,
        recommendations,
      };
    }

    return {
      content: `### Caifanes: Technical Acoustic Profile & Rig Staging

**Core Sonic Framework:**
- **Guitar (Alejandro Marcovich):** Fender Stratocaster on bridge single-coil into Roland JC-120 stereo chorus. Boss DD-3 set to dotted-eighth repeats (380 ms) for cascading arpeggios. Scale choices heavily blend Aeolian minor with Harmonic Minor raised 7ths and Phrygian dominant inflections.
- **Drums (Alfonso André):** Signature 16th-note floor tom syncopation ("Afuera", "Mátenme Porque Me Muero"), displacing the standard hi-hat pulse with dark, resonant shell dynamics.
- **Bass (Sabo Romo):** Melodic lead-bass counterpoint using plectrum attack, roundwound strings, and Boss CE-2B analog chorus cutting through the 800Hz-2kHz register.

**Harmonic Sequence (\`Am\`):**
\`Am\` -> \`F\` -> \`Dm\` -> \`G\` -> \`Em\` -> \`Am\` (\`i -> bVI -> iv -> bVII -> v -> i\`)`,
      recommendations,
    };
  }

  // Latin America: Soda Stereo / Gustavo Cerati
  if (q.includes('soda stereo') || q.includes('cerati') || q.includes('gustavo cerati')) {
    if (isSpanish) {
      return {
        content: `### Soda Stereo / Gustavo Cerati: Análisis Técnico de Rig

**Cadena de Señal y Tono (Cerati):**
- **Guitarras:** Jackson Soloist / Pensa-Suhr Custom / PRS Multifoil.
- **Amplificadores:** Roland JC-120 para limpios brillantes con coro estéreo; Marshall JCM800 / VOX AC30 para crunch dinámico.
- **Pedales Clave:** Boss CE-2 Chorus, Boss DD-2/DD-3 Delay (tiempos cortos de modulación), Electro-Harmonix Electric Mistress (Flanger), ProCo Rat para distorsión New Wave.
- **Vocabulario Armónico:** Uso constante de acordes suspendidos y extensiones abiertas: \`Asus2\`, \`Dsus2\`, \`Em9\`, \`F#m11\` ("En la Ciudad de la Furia", "Prófugos").

**Sección Rítmica:**
- **Zeta Bosio (Bajo):** Warwick Thumb Bass con ecualización en V (realce en 60Hz y 3kHz, atenuación en 400Hz), tocado con dedos con gran compresión.
- **Charly Alberti (Batería):** Caja sintonizada alta con compuerta de ruido (gated reverb) típica del post-punk y new wave de los 80s.`,
        recommendations,
      };
    }

    return {
      content: `### Soda Stereo / Gustavo Cerati: Technical Rig & Harmonic Analysis

**Guitar Staging & Signal Path:**
- **Instruments:** Jackson Soloist, Pensa-Suhr Custom, and PRS Multifoil.
- **Amplifiers:** Roland JC-120 for pristine stereo chorus cleans; Marshall JCM800 / Vox AC30 for medium-gain bite.
- **Signal Chain:** Boss CE-2 Chorus -> Boss DD-2/DD-3 Digital Delay -> EHX Electric Mistress Flanger -> ProCo Rat.
- **Voicings:** Frequent use of open suspended chords: \`Asus2\`, \`Dsus2\`, \`Em9\`, \`F#m11\` ("En la Ciudad de la Furia", "Prófugos").

**Rhythm Section Precision:**
- **Zeta Bosio (Bass):** Warwick Thumb Bass with mid-scooped EQ and optical compression for percussive fundamental stability.
- **Charly Alberti (Drums):** High-tension snare with gated digital plate reverb and snappy transient punch.`,
      recommendations,
    };
  }

  // Japan: City Pop & Math Rock (Casiopea, Tatsuro Yamashita, toe, Tricot)
  if (
    q.includes('city pop') ||
    q.includes('casiopea') ||
    q.includes('tatsuro') ||
    q.includes('math rock') ||
    q.includes('tricot') ||
    q.includes('toe')
  ) {
    const isMath = q.includes('math rock') || q.includes('tricot') || q.includes('toe');
    if (isMath) {
      const mathGroove = DRUM_GROOVE_PRESETS.find((g) => g.genre === 'Math Rock') || DRUM_GROOVE_PRESETS[0];
      recommendations.push({
        id: `rec-math-${Date.now()}`,
        type: 'drum_groove',
        title: mathGroove.name,
        data: mathGroove,
        actionLabel: 'Load into Drumex',
      });

      return {
        content: `### Japanese Math Rock: Technical Composition & Execution

**Key Rhythmic & Harmonic Mechanics (toe, Tricot, Elephant Gym):**
- **Odd Meter Subdivisions:** Alternating meters such as \`7/8\` (grouped as 3+2+2 or 2+2+3), \`5/8\`, and compound \`11/8\`.
- **Guitar Techniques:** Two-handed fretboard tapping, open alternate tunings (FACGCE, DAEAC#E), and Telecaster middle pickup setting for transparent percussive chime.
- **Dynamic Envelopes:** Rapid transitions between sub-vocal ambient clean passages and explosive wide-band overdrive.
- **Drum Micro-Timing:** Continuous ghost notes on snare with splash cymbal accents and un-quantized polyrhythms over the bass pulse.`,
        recommendations,
      };
    }

    const prog = PROGRESSION_PRESETS.find((p) => p.id === 'japanese_royal_road')!;
    recommendations.push({
      id: `rec-royal-${Date.now()}`,
      type: 'chord_progression',
      title: prog.name,
      data: prog,
      actionLabel: 'Open in Chordex',
      actionPayload: { app: 'chordex', action: 'load_progression', params: { chords: prog.chords, key: prog.key } },
    });

    return {
      content: `### Japanese City Pop: Production & Harmonic Architecture

**Harmonic Foundation ("Royal Road" / Oudou Shinkou):**
- **Progression:** \`Bbmaj7\` -> \`C7\` -> \`Am7\` -> \`Dm7\` in key of **F Major**
- **Roman Numerals:** \`IVmaj7 -> V7 -> iii7 -> vi7\`
- **Function:** Initiates on the subdominant major 7th, climbs through dominant V7, and resolves into the relative minor via mediant minor, capturing characteristic wistful momentum.

**Production & Instrument Staging (Tatsuro Yamashita, Casiopea):**
- **Bass:** Slap and pop technique with high-frequency thumb click, compressed with UREI 1176 (4:1 ratio, fastest attack and release).
- **Guitars:** 16th-note funk chops on Stratocaster position 4 (neck + middle), clean studio DI compressed with dbx 160.
- **Keys:** Fender Rhodes Mark I / Yamaha DX7 electric piano with lush stereo chorus.`,
      recommendations,
    };
  }

  // Africa: Afrobeat & Desert Blues (Fela Kuti, Tony Allen, Tinariwen, Mdou Moctar)
  if (
    q.includes('afrobeat') ||
    q.includes('fela') ||
    q.includes('tony allen') ||
    q.includes('desert blues') ||
    q.includes('tinariwen') ||
    q.includes('mdou moctar') ||
    q.includes('tuareg')
  ) {
    const isTuareg = q.includes('desert blues') || q.includes('tinariwen') || q.includes('mdou moctar') || q.includes('tuareg');
    if (isTuareg) {
      return {
        content: `### Tuareg Desert Blues (Assouf): Technical Analysis

**Stylistic Framework (Tinariwen, Mdou Moctar, Bombino):**
- **Tunings:** Open G (\`D-G-D-G-B-D\`) or Open D (\`D-A-D-F#-A-D\`) with high capos allowing open string drones.
- **Riff Mechanics:** Cyclical pentatonic minor ostinatos with hammer-on/pull-off trills played strictly against an open bass drone string.
- **Rhythmic Pulse:** Polyrhythmic 6/8 and 12/8 clapping patterns interlocking with djembe/calabash strokes.
- **Guitar Rig:** Fender Stratocaster neck pickup into pushed Fender Twin or Marshall Bluesbreaker with analog germanium overdrive and mild spring reverb.`,
        recommendations,
      };
    }

    const afrobeatGroove = DRUM_GROOVE_PRESETS.find((g) => g.name.includes('Tony Allen')) || DRUM_GROOVE_PRESETS[0];
    const afrobeatProg = PROGRESSION_PRESETS.find((p) => p.id === 'afrobeat_dorian_ostinato')!;
    recommendations.push({
      id: `rec-afro-${Date.now()}`,
      type: 'drum_groove',
      title: afrobeatGroove.name,
      data: afrobeatGroove,
      actionLabel: 'Load into Drumex',
    });
    recommendations.push({
      id: `rec-afro-prog-${Date.now()}`,
      type: 'chord_progression',
      title: afrobeatProg.name,
      data: afrobeatProg,
      actionLabel: 'Open in Chordex',
      actionPayload: { app: 'chordex', action: 'load_progression', params: { chords: afrobeatProg.chords, key: afrobeatProg.key } },
    });

    return {
      content: `### Afrobeat: Orchestration & Rhythm Engineering (Fela Kuti & Tony Allen)

**Harmonic & Rhythmic Rules:**
- **Modal Dorian Vamp:** Continuous interlocking groove based on \`i9 -> IV13\` (\`Em9 -> A13\`). The natural 6th degree provides open modal tension.
- **Guitar Weaving:** Two distinct clean single-coil guitars:
  1. *Tenor Guitar:* Repetitive 16th-note single-string muted ostinato.
  2. *Rhythm Guitar:* Intermittent staccato Dorian chord stabs on off-beats.
- **Tony Allen Drumming:** Four-limb independence: hi-hat stepping on every beat, syncopated kick mimicking talking drum speech patterns, and snare rim clicks on unexpected subdivisions.`,
      recommendations,
    };
  }

  // =========================================================================
  // 2. ADVANCED MUSIC THEORY (Negative Harmony, Secondary Dominants, Modal Interchange)
  // =========================================================================
  if (
    q.includes('negative harmony') ||
    q.includes('armonia negativa') ||
    q.includes('armonía negativa') ||
    q.includes('secondary dominant') ||
    q.includes('dominante secundaria') ||
    q.includes('modal interchange') ||
    q.includes('intercambio modal')
  ) {
    if (q.includes('negative') || q.includes('negativa')) {
      return {
        content: `### Negative Harmony: Theoretical Axioms & Conversion

**The Polar Reflection Axis:**
Negative harmony reflects pitch classes across an axis positioned halfway between the tonic (\`1\`) and the fifth (\`5\`).
In the key of **C Major** (Tonic = \`C\`, Dominant = \`G\`):
- The axis lies between \`Eb\` and \`E\` on one side, and \`Bb\` and \`B\` on the other.

**Pitch Class Reflections (Key of C):**
- \`C <-> G\` | \`G <-> C\`
- \`D <-> F\` | \`F <-> D\`
- \`E <-> Eb\` | \`Eb <-> E\`
- \`A <-> Bb\` | \`Bb <-> A\`
- \`B <-> Ab\` | \`Ab <-> B\`

**Chord Inversion Transformations:**
- Dominant 7th \`G7\` (\`G - B - D - F\`) inverts to Minor 6th \`Fm6\` (\`C - Ab - F - D\`).
- Authentic Cadence (\`G7 -> C\`) reflects to Plagal Minor Cadence (\`Fm6 -> C\`).
- Both cadences possess equivalent harmonic gravity through symmetrical voice leading.`,
        recommendations,
      };
    }

    if (q.includes('secondary dominant') || q.includes('secundaria')) {
      return {
        content: `### Secondary Dominants (\`V7/x\`): Voice Leading & Mechanics

A secondary dominant is an altered dominant 7th chord resolving down a perfect fifth to any diatonic chord other than the tonic.

**Common Formulations in C Major:**
- **\`V7/V\` (\`D7\`):** Contains \`F#\` (leading tone to \`G\`). Resolves: \`D7 -> G7\`.
- **\`V7/ii\` (\`A7\`):** Contains \`C#\` (leading tone to \`D\`). Resolves: \`A7 -> Dm7\`.
- **\`V7/vi\` (\`E7\`):** Contains \`G#\` (leading tone to \`A\`). Resolves: \`E7 -> Am7\`.
- **\`V7/IV\` (\`C7\`):** Contains \`Bb\` (flattened 7th creating tritone with \`E\`). Resolves: \`C7 -> Fmaj7\`.

**Voice Leading Rule:**
The chromatic alteration introduced by the secondary dominant is the leading tone that resolves upward by a half-step into the root or third of the target chord.`,
        recommendations,
      };
    }

    if (q.includes('modal interchange') || q.includes('intercambio')) {
      const prog = PROGRESSION_PRESETS.find((p) => p.id === 'modal_interchange_borrowed')!;
      recommendations.push({
        id: `rec-interchange-${Date.now()}`,
        type: 'chord_progression',
        title: prog.name,
        data: prog,
        actionLabel: 'Open in Chordex',
      });

      return {
        content: `### Modal Interchange: Borrowed Chords from Parallel Modes

Modal interchange introduces harmonic color into a major key by borrowing chords from its parallel minor (Aeolian) or other parallel modes without a formal key modulation.

**Primary Borrowed Chords in C Major (from C Aeolian):**
- **\`bVImaj7\` (\`Abmaj7\`):** Dramatic submediant expansion. Smooth chromatic voice leading: \`C -> B -> Bb -> A\`.
- **\`bVII\` (\`Bb\`):** Subtonic major triad. Used in rock and fusion as a substitute for dominant resolution ("Backdoor Cadence": \`iv7 -> bVII7 -> Imaj7\`).
- **\`iv6\` or \`iv7\` (\`Fm6\` / \`Fm7\`):** Minor subdominant. The \`Ab\` (minor 6th degree) creates tender melancholy resolving to \`G\` of the tonic.
- **\`bIIImaj7\` (\`Ebmaj7\`):** Mediante bemol. Energetic shift often paired with \`bVImaj7\`.`,
        recommendations,
      };
    }
  }

  // =========================================================================
  // 3. TONE & GEAR RECIPES (Gilmour, SRV, Funk, Ambient, Metal, Bass)
  // =========================================================================
  if (
    q.includes('tone') ||
    q.includes('pedal') ||
    q.includes('amp') ||
    q.includes('fuzz') ||
    q.includes('distortion') ||
    q.includes('delay') ||
    q.includes('overdrive') ||
    q.includes('sound like') ||
    q.includes('settings') ||
    q.includes('tono') ||
    q.includes('amplificador')
  ) {
    let recipe = TONE_RECIPES.gilmour;
    if (q.includes('funk') || q.includes('clean') || q.includes('strat')) {
      recipe = TONE_RECIPES.funk_clean;
    } else if (q.includes('blues') || q.includes('srv') || q.includes('vaughan') || q.includes('texas')) {
      recipe = TONE_RECIPES.srv_blues;
    } else if (q.includes('ambient') || q.includes('shoegaze') || q.includes('reverb') || q.includes('dream')) {
      recipe = TONE_RECIPES.ambient_wash;
    } else if (q.includes('metal') || q.includes('chug') || q.includes('high gain') || q.includes('5150') || q.includes('rectifier')) {
      recipe = TONE_RECIPES.modern_metal;
    } else if (q.includes('caifanes') || q.includes('marcovich')) {
      recipe = TONE_RECIPES.caifanes_marcovich;
    } else if (q.includes('post-punk') || q.includes('cure') || q.includes('joy division')) {
      recipe = TONE_RECIPES.post_punk_bass;
    } else if (q.includes('bass') || q.includes('motown') || q.includes('jamerson')) {
      recipe = TONE_RECIPES.motown_bass;
    }

    recommendations.push({
      id: `rec-tone-${Date.now()}`,
      type: 'tone_recipe',
      title: recipe.title,
      data: recipe,
      actionLabel: isSpanish ? 'Ver Controles de Tono' : 'View Dial Settings',
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

  // =========================================================================
  // 4. CHORD PROGRESSIONS & HARMONY
  // =========================================================================
  if (
    q.includes('progression') ||
    q.includes('chord') ||
    q.includes('harmony') ||
    q.includes('acordes') ||
    q.includes('progresion') ||
    q.includes('progresión') ||
    q.includes('neo soul') ||
    q.includes('jazz') ||
    q.includes('flamenco')
  ) {
    let preset = PROGRESSION_PRESETS[0]; // Neo-soul default
    if (q.includes('jazz') || q.includes('ii-v-i') || q.includes('2-5-1')) {
      preset = PROGRESSION_PRESETS[1];
    } else if (q.includes('borrowed') || q.includes('modal interchange')) {
      preset = PROGRESSION_PRESETS[2];
    } else if (q.includes('city pop') || q.includes('royal road')) {
      preset = PROGRESSION_PRESETS[3];
    } else if (q.includes('caifanes') || q.includes('rock en espanol')) {
      preset = PROGRESSION_PRESETS[4];
    } else if (q.includes('afrobeat')) {
      preset = PROGRESSION_PRESETS[5];
    } else if (q.includes('enjambre') || q.includes('vintage')) {
      preset = PROGRESSION_PRESETS[6];
    } else if (q.includes('flamenco') || q.includes('andalusian')) {
      preset = PROGRESSION_PRESETS[7];
    } else if (q.includes('dorian') || q.includes('funk')) {
      preset = PROGRESSION_PRESETS[8];
    } else if (q.includes('pop') || q.includes('epic') || q.includes('anthem')) {
      preset = PROGRESSION_PRESETS[9];
    }

    recommendations.push({
      id: `rec-prog-${Date.now()}`,
      type: 'chord_progression',
      title: `${preset.name} (Key of ${preset.key})`,
      data: preset,
      actionLabel: isSpanish ? 'Cargar en Chordex' : 'Open in Chordex',
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

  // =========================================================================
  // 5. DRUMS & GROOVES
  // =========================================================================
  if (
    q.includes('drum') ||
    q.includes('groove') ||
    q.includes('bateria') ||
    q.includes('batería') ||
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
    } else if (q.includes('afrobeat') || q.includes('tony allen')) {
      groove = DRUM_GROOVE_PRESETS[3];
    } else if (q.includes('caifanes') || q.includes('tribal')) {
      groove = DRUM_GROOVE_PRESETS[4];
    }

    recommendations.push({
      id: `rec-drum-${Date.now()}`,
      type: 'drum_groove',
      title: `${groove.name} (${groove.bpm} BPM)`,
      data: groove,
      actionLabel: isSpanish ? 'Cargar en Drumex' : 'Load into Drumex',
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

  // =========================================================================
  // 6. MUSIC THEORY MODES (Dorian, Aeolian, Mixolydian, etc.)
  // =========================================================================
  if (
    q.includes('theory') ||
    q.includes('teoria') ||
    q.includes('teoría') ||
    q.includes('mode') ||
    q.includes('modo') ||
    q.includes('dorian') ||
    q.includes('dorico') ||
    q.includes('aeolian') ||
    q.includes('eolico') ||
    q.includes('mixolydian') ||
    q.includes('scale') ||
    q.includes('escala') ||
    q.includes('tritone') ||
    q.includes('tritono')
  ) {
    if (q.includes('dorian') || q.includes('aeolian') || q.includes('dorico') || q.includes('eolico')) {
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

  // =========================================================================
  // 7. VOCALS & PERFORMANCE COACHING
  // =========================================================================
  if (
    q.includes('vocal') ||
    q.includes('voice') ||
    q.includes('sing') ||
    q.includes('voz') ||
    q.includes('cantar') ||
    q.includes('warmup') ||
    q.includes('calentamiento') ||
    q.includes('harmonizer')
  ) {
    const routine: PracticeRoutineRecommendation = {
      title: isSpanish ? 'Calentamiento Vocal Escenario (5 Minutos)' : '5-Minute Stage Vocal Warmup',
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
      actionLabel: isSpanish ? 'Abrir Vocalex' : 'Open Vocalex',
      actionPayload: { app: 'vocalex', action: 'open', params: {} },
    });

    if (isSpanish) {
      return {
        content: `### Calentamiento y Ejecución Técnica Vocal

Mecánica fundamental para el rendimiento vocal en vivo:

1. **Gestión de Presión Subglótica:** Activación intercostal y abdominal baja. Mantener flujo de aire constante sin empujar desde la laringe.
2. **Resonancia Faríngea y Máscara:** Proyectar la vibración hacia los pómulos y paladar óseo duro para ganar volumen sin fatiga muscular.
3. **Puntos de Quiebre (Passagio):** Utilizar vocales cerradas ([i], [u]) y sonido nasal para coordinar la voz mixta entre registro de pecho y cabeza.

**Protocolo de Calentamiento Vocal (5 Minutos):**
- 1.0 min: Vibración labial (Lip trills) en escalas de 5 tonos
- 1.5 min: Sirenas continuas sobre consonante nasal ("Ng")
- 1.5 min: Resonancia faríngea sobre sílaba "Nay"
- 1.0 min: Ecualización de vocales sostenidas`,
        recommendations,
      };
    }

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

  // =========================================================================
  // 8. LIVEX APP GUIDANCE
  // =========================================================================
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
    if (isSpanish) {
      return {
        content: `### Arquitectura de Producción Livex

- **Chordex:** Biblioteca armónica, diagramas de digitación, transposición tonal y enlaces vocales.
- **Drumex:** Secuenciador por pasos, calibrador de tempo metronómico y práctica rítmica.
- **Groovex:** Reproductor de pistas separadas (stems) y mezclador de ensayo.
- **Vocalex:** Afinador cromático, seguimiento de tono fundamental y armonizador de intervalos.
- **Stagex:** Diseñador de plano de escenario, ruteo de audio, monitoreo y coordinación de equipo.`,
        recommendations,
      };
    }

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

  // =========================================================================
  // 9. DEFAULT CONTEXT-AWARE RESPONSE
  // =========================================================================
  const activeApp = context?.activeApp || 'hub';
  const songTitle = context?.currentSongTitle ? `("${context.currentSongTitle}")` : '';

  if (isSpanish) {
    return {
      content: `### Asistente Musical Livex

Contexto activo: ${activeApp.toUpperCase()} ${songTitle}

Consultas técnicas admitidas:
- Análisis armónico, acordes extendidos y modos
- Cadena de pedales, amplificadores y tono instrumental
- Estructura rítmica, compases y grooves de batería
- Calentamiento vocal y resonancia acústica
- Conocimiento de bandas y escenas musicales globales`,
      recommendations,
    };
  }

  return {
    content: `### Livex Music Assistant

Active context: ${activeApp.toUpperCase()} ${songTitle}

Supported technical queries:
- Harmonic analysis, chord progressions, and modal theory
- Instrument signal chains, amplifier staging, and pedal parameters
- Global music scenes, artists, and regional production styles
- Rhythm structures, tempos, and swing timing
- Vocal performance and warmup protocols`,
    recommendations,
  };
}
