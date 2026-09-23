export type Theme = 'dark' | 'light' | 'system';

export type HubTab = 'home' | 'settings' | 'profile' | 'help' | 'assistant';
export type HelpPageId =
  | 'help-center'
  | 'faq'
  | 'release-notes'
  | 'download-apps'
  | 'keyboard-shortcuts'
  | 'terms'
  | 'privacy-policy'
  | 'bug-report';
export type TargetApp = 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex';

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Auto' },
];

export type TimeWord = 'morning' | 'afternoon' | 'evening';
export const TIME_WORD_ES: Record<TimeWord, string> = {
  morning: 'mañana',
  afternoon: 'tarde',
  evening: 'noche',
};
export const TIME_GREETING_ES: Record<TimeWord, string> = {
  morning: 'Buenos días',
  afternoon: 'Buenas tardes',
  evening: 'Buenas noches',
};

// ── Session index — stable within one app open, advances each fresh launch ─────
// A module-level variable resets to null on every page load (fresh JS context)
// but stays stable across React re-renders, avoiding sessionStorage/PWA quirks.
export const _INDEX_KEY = 'sx_idx';
let _cachedIdx: number | null = null;

export function getSessionIndex(): number {
  if (_cachedIdx !== null) return _cachedIdx;
  const prev = parseInt(localStorage.getItem(_INDEX_KEY) ?? '-1', 10);
  _cachedIdx = prev + 1;
  localStorage.setItem(_INDEX_KEY, String(_cachedIdx));
  return _cachedIdx;
}

// ── Greeting pairs — greeting + subtitle are always shown together ─────────────
export interface GreetingPair {
  greeting: string;
  subtitle: string;
}

export const _NAMED_PAIRS_EN: Array<(n: string, t: string) => GreetingPair> = [
  (n, t) => ({ greeting: `Good ${t}, ${n}.`, subtitle: 'What are we picking today?' }),
  (n) => ({ greeting: `Welcome back, ${n}.`, subtitle: 'Ready to lay something down?' }),
  (n) => ({ greeting: `Good to see you, ${n}.`, subtitle: "What's on the setlist today?" }),
  (n) => ({ greeting: `Ready to create, ${n}.`, subtitle: 'New progressions await.' }),
  (n) => ({ greeting: `The studio is yours, ${n}.`, subtitle: 'Choose your weapon.' }),
  (n) => ({ greeting: `Back at it, ${n}.`, subtitle: 'Consistency builds masters.' }),
  (n) => ({ greeting: `Let's make something, ${n}.`, subtitle: 'Every great song starts here.' }),
  (n) => ({ greeting: `Fresh session, ${n}.`, subtitle: 'Where will today take you?' }),
  (n) => ({ greeting: `In the zone, ${n}.`, subtitle: 'Time to make something great.' }),
  (n, t) => ({ greeting: `Good ${t}, ${n}.`, subtitle: 'Your next idea is waiting.' }),
  (n) => ({ greeting: `Ready to groove, ${n}.`, subtitle: 'The rhythm is already in you.' }),
  (n) => ({ greeting: `Something's brewing, ${n}.`, subtitle: 'Follow the sound.' }),
  (n) => ({ greeting: `Let's create, ${n}.`, subtitle: 'This session is yours.' }),
  (n) => ({ greeting: `Make it count, ${n}.`, subtitle: 'Lay it down.' }),
  (n) => ({ greeting: `Here we go, ${n}.`, subtitle: 'Your next track starts now.' }),
  (n) => ({ greeting: `Pick up where you left off, ${n}.`, subtitle: 'The studio remembers.' }),
  (n) => ({ greeting: `What's the plan, ${n}.`, subtitle: 'The studio is listening.' }),
  (n) => ({ greeting: `Time to play, ${n}.`, subtitle: 'Ready when you are.' }),
  (n) => ({ greeting: `Feel the rhythm, ${n}.`, subtitle: 'Let it flow.' }),
  (n) => ({ greeting: `Let's lay it down, ${n}.`, subtitle: 'Give it everything.' }),
  (n) => ({ greeting: `Hey ${n}.`, subtitle: 'Something great is one tap away.' }),
  (n, t) => ({ greeting: `Good ${t}, ${n}.`, subtitle: "Capture it before it's gone." }),
];

export const _NAMED_PAIRS_ES: Array<(n: string, t: string) => GreetingPair> = [
  (n, t) => ({
    greeting: `${TIME_GREETING_ES[t as TimeWord]}, ${n}.`,
    subtitle: '¿Qué tocamos hoy?',
  }),
  (n) => ({ greeting: `De vuelta, ${n}.`, subtitle: '¿Listo para grabar algo?' }),
  (n) => ({ greeting: `Qué bueno verte, ${n}.`, subtitle: '¿Qué hay en el setlist hoy?' }),
  (n) => ({ greeting: `A crear, ${n}.`, subtitle: 'Nuevas progresiones te esperan.' }),
  (n) => ({ greeting: `El estudio es tuyo, ${n}.`, subtitle: 'Elige tu arma.' }),
  (n) => ({ greeting: `Otra vez aquí, ${n}.`, subtitle: 'La constancia hace al maestro.' }),
  (n) => ({ greeting: `Hagamos algo, ${n}.`, subtitle: 'Toda gran canción empieza aquí.' }),
  (n) => ({ greeting: `Sesión nueva, ${n}.`, subtitle: '¿A dónde te lleva hoy?' }),
  (n) => ({ greeting: `En la zona, ${n}.`, subtitle: 'Es hora de hacer algo grande.' }),
  (n, t) => ({
    greeting: `${TIME_GREETING_ES[t as TimeWord]}, ${n}.`,
    subtitle: 'Tu próxima idea te espera.',
  }),
  (n) => ({ greeting: `Listo para el groove, ${n}.`, subtitle: 'El ritmo ya está en ti.' }),
  (n) => ({ greeting: `Algo se viene, ${n}.`, subtitle: 'Sigue el sonido.' }),
  (n) => ({ greeting: `Vamos a crear, ${n}.`, subtitle: 'Esta sesión es tuya.' }),
  (n) => ({ greeting: `Que cuente, ${n}.`, subtitle: 'Dale con todo.' }),
  (n) => ({ greeting: `Arrancamos, ${n}.`, subtitle: 'Tu próximo track empieza ahora.' }),
  (n) => ({ greeting: `Retoma donde lo dejaste, ${n}.`, subtitle: 'El estudio recuerda.' }),
  (n) => ({ greeting: `¿Cuál es el plan, ${n}?`, subtitle: 'El estudio escucha.' }),
  (n) => ({ greeting: `A tocar, ${n}.`, subtitle: 'Listo cuando quieras.' }),
  (n) => ({ greeting: `Siente el ritmo, ${n}.`, subtitle: 'Déjalo fluir.' }),
  (n) => ({ greeting: `A grabar, ${n}.`, subtitle: 'Dale con todo.' }),
  (n) => ({ greeting: `Hey ${n}.`, subtitle: 'Algo grande está a un toque.' }),
  (n, t) => ({
    greeting: `${TIME_GREETING_ES[t as TimeWord]}, ${n}.`,
    subtitle: 'Atrápalo antes de que se vaya.',
  }),
];

export const _ANON_PAIRS_EN: GreetingPair[] = [
  { greeting: 'Good morning.', subtitle: 'What are we picking today?' },
  { greeting: 'Welcome back.', subtitle: 'Ready to lay something down?' },
  { greeting: 'The studio is open.', subtitle: 'Choose your weapon.' },
  { greeting: 'Ready to create.', subtitle: 'New progressions await.' },
  { greeting: 'Good to have you here.', subtitle: 'Let the music lead.' },
  { greeting: "Let's make music.", subtitle: 'One chord at a time.' },
  { greeting: 'Fresh session.', subtitle: 'Where will today take you?' },
  { greeting: 'Ready to groove.', subtitle: 'The rhythm is already in you.' },
  { greeting: 'In the zone.', subtitle: 'Time to make something great.' },
  { greeting: 'Pick up where you left off.', subtitle: 'Your next idea is waiting.' },
  { greeting: 'The keys are waiting.', subtitle: 'Give them something to play.' },
  { greeting: "Something's in the air.", subtitle: "Capture it before it's gone." },
  { greeting: "Let's create.", subtitle: 'Every great song starts here.' },
  { greeting: 'Make it count.', subtitle: 'This session is yours.' },
  { greeting: 'Here we go.', subtitle: 'Lay it down.' },
  { greeting: 'Good to see you.', subtitle: "What's on the setlist today?" },
  { greeting: "What's the plan?", subtitle: 'The studio is listening.' },
  { greeting: 'Back at it.', subtitle: 'Consistency builds masters.' },
  { greeting: 'Time to play.', subtitle: 'Ready when you are.' },
  { greeting: 'Feel the rhythm.', subtitle: 'Let it flow.' },
  { greeting: "Something's brewing.", subtitle: 'Follow the sound.' },
  { greeting: "Let's lay it down.", subtitle: 'Your next track starts now.' },
];

export const _ANON_PAIRS_ES: GreetingPair[] = [
  { greeting: 'Buenos días.', subtitle: '¿Qué tocamos hoy?' },
  { greeting: 'De vuelta.', subtitle: '¿Listo para grabar algo?' },
  { greeting: 'El estudio está listo.', subtitle: 'Elige tu arma.' },
  { greeting: 'A crear.', subtitle: 'Nuevas progresiones te esperan.' },
  { greeting: 'Qué bueno tenerte aquí.', subtitle: 'Que la música guíe.' },
  { greeting: 'Hagamos música.', subtitle: 'Un acorde a la vez.' },
  { greeting: 'Sesión nueva.', subtitle: '¿A dónde te lleva hoy?' },
  { greeting: 'Listo para el groove.', subtitle: 'El ritmo ya está en ti.' },
  { greeting: 'En la zona.', subtitle: 'Es hora de hacer algo grande.' },
  { greeting: 'Retoma donde lo dejaste.', subtitle: 'Tu próxima idea te espera.' },
  { greeting: 'Las teclas esperan.', subtitle: 'Dales algo que tocar.' },
  { greeting: 'Algo se siente en el aire.', subtitle: 'Atrápalo antes de que se vaya.' },
  { greeting: 'Vamos a crear.', subtitle: 'Toda gran canción empieza aquí.' },
  { greeting: 'Que cuente.', subtitle: 'Esta sesión es tuya.' },
  { greeting: 'Arrancamos.', subtitle: 'Dale con todo.' },
  { greeting: 'Qué bueno verte.', subtitle: '¿Qué hay en el setlist?' },
  { greeting: '¿Cuál es el plan?', subtitle: 'El estudio escucha.' },
  { greeting: 'Otra vez aquí.', subtitle: 'La constancia hace al maestro.' },
  { greeting: 'A tocar.', subtitle: 'Listo cuando quieras.' },
  { greeting: 'Siente el ritmo.', subtitle: 'Déjalo fluir.' },
  { greeting: 'Algo se viene.', subtitle: 'Sigue el sonido.' },
  { greeting: 'A grabar.', subtitle: 'Tu próximo track empieza ahora.' },
];
