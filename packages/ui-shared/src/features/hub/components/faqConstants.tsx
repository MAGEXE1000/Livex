import { Capacitor } from '@capacitor/core';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../../shared/design-system/buttons';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../../shared/design-system';
import { useT, useSettingsStore, APP_VERSION } from '@workspace/studio-core';

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: Record<string, FAQItem[]> = {
  en: [
    {
      question: 'What is Livex and how do I get started?',
      answer:
        'Livex is an all-in-one music performance and production suite combining chord progression design, drum sequencing, stage layout management, live vocal coaching, and groove exploration. To get started, tap any app icon in the Hub or bottom navigation. Each app works immediately with zero mandatory initial configuration.',
    },
    {
      question: 'What is Chordex and what instruments does it support?',
      answer:
        'Chordex is an intelligent chord progression companion and interactive songbook. It helps you discover chord voicings, test harmonic progressions, transpose keys, and practice in Live Mode. It supports Guitar (standard and alternate tunings), Piano, Ukulele, Bass (4-string and 5-string), and Saxophone.',
    },
    {
      question: 'What is Drumex and how does the pattern sequencer work?',
      answer:
        'Drumex is a high-performance drum machine and pattern sequencer. You can compose multi-instrument drum patterns, adjust tempo (BPM), swing, time signatures, and velocity dynamics. Use the Beats tab to play pre-built rhythm libraries or the Patterns tab to build your own groove step-by-step.',
    },
    {
      question: 'What is Stagex and how does it assist live performances?',
      answer:
        'Stagex is a virtual stage plot designer and live performance coordinator. It enables bands, solo artists, and audio engineers to arrange virtual stage layouts, position instruments, monitors, microphones, and cables, visualize audio dispersion coverage, and organize scene cues for gigs and rehearsals.',
    },
    {
      question: 'What is Groovex and how is it used?',
      answer:
        'Groovex is a rhythm and polyrhythm exploration engine designed for generating syncopated patterns, layered grooves, and dynamic rhythmic foundations to complement your songwriting and live jamming workflows.',
    },
    {
      question: 'What is Vocalex and how does the vocal coach work?',
      answer:
        'Vocalex is a vocal practice companion and take recorder. It utilizes low-latency pitch detection algorithms to graph your singing pitch in real time against reference musical pitches, allowing you to practice intonation, vocal scales, and record multi-take vocal sessions.',
    },
    {
      question: 'How do audio and MIDI permissions work in Livex?',
      answer:
        'Livex requests microphone access solely for acoustic pitch detection (in Vocalex and the Chromatic Tuner) and vocal recording. Web MIDI and native MIDI permissions allow connecting external hardware controllers, keyboards, and master synths. All audio analysis is performed entirely on your device; no audio data is ever uploaded or monitored.',
    },
    {
      question: 'How do I use the built-in Chromatic Tuner?',
      answer:
        'The chromatic tuner is accessible from Chordex and Vocalex. Tap the Tuner icon, allow microphone access, and play or sing a clear single note. The tuner display shows the detected pitch, note name, target frequency (Hz), and exact deviation in cents. For best results, tune in an environment with minimal background noise.',
    },
    {
      question: 'How do I customize my theme, accent color, and Start On preferences?',
      answer:
        'Go to Hub > Preferences to customize the visual appearance (Light, Dark, or true AMOLED black), select an accent color or custom hue using the pipette color picker, and choose your interface language. In each app preferences panel (Chordex, Drumex, Stagex, Vocalex), you can set the "Start On" option to choose which tab opens automatically when launching that tool.',
    },
    {
      question: 'How are my songs, patterns, and preferences stored?',
      answer:
        'Livex employs a local-first storage architecture. Your chord progressions, custom songs, drum sequences, stage plots, and settings are saved directly in your device local database (IndexedDB and SQLite). Cloud Synchronization optionally backs up your creative data to our secure cloud when you are signed in.',
    },
    {
      question: 'How do native Android APK updates work?',
      answer:
        'On Android, Livex features an integrated native updater that verifies releases against our public server in the background. When an update is ready, a notification banner appears. Tapping it downloads the verified, signed APK and launches the Android PackageInstaller, upgrading the app seamlessly without losing any local projects.',
    },
    {
      question: 'Troubleshooting: Why is there no sound coming from Livex?',
      answer:
        'Verify that your device media volume is up and not muted. In web browsers, interactive audio requires an initial user gesture (tapping any button or key) before the Web Audio API context can unlock. On Android, verify that headphones or Bluetooth devices are connected properly and that no other audio app has exclusive hardware control.',
    },
    {
      question: 'Troubleshooting: What if the microphone or tuner is not responding?',
      answer:
        'Ensure microphone permission is granted in your device or browser system settings. In Android Settings > Apps > Livex > Permissions, verify Microphone is set to "Allow while using the app". If permissions were previously declined in a browser, click the lock or settings icon in your browser address bar to reset permissions and reload.',
    },
    {
      question: 'Troubleshooting: How can I reduce audio latency or playback jitter?',
      answer:
        'For minimal latency during practice and live performances, use wired headphones or device built-in speakers. Bluetooth wireless connections introduce an inherent hardware delay of 100-200ms. Closing background resource-intensive apps and disabling battery saver mode can also ensure optimal real-time audio thread scheduling.',
    },
  ],
  es: [
    {
      question: '¿Qué es Livex y cómo empiezo a utilizarlo?',
      answer:
        'Livex es una suite integral de producción y rendimiento musical que reúne diseño de progresiones de acordes, secuenciación de batería, gestión de escenarios, entrenamiento vocal en vivo y exploración de ritmos. Para comenzar, pulsa sobre cualquier aplicación en el Hub o en la barra de navegación inferior. Cada herramienta funciona de forma inmediata sin configuraciones obligatorias.',
    },
    {
      question: '¿Qué es Chordex y qué instrumentos admite?',
      answer:
        'Chordex es un asistente inteligente de acordes y cancionero interactivo. Te ayuda a descubrir digitaciones, probar progresiones armónicas, transportar tonalidades y practicar en Modo Live. Admite Guitarra (afinaciones estándar y alternativas), Piano, Ukelele, Bajo (4 y 5 cuerdas) y Saxofón.',
    },
    {
      question: '¿Qué es Drumex y cómo funciona el secuenciador de ritmos?',
      answer:
        'Drumex es una caja de ritmos y secuenciador de patrones de alto rendimiento. Permite componer patrones de percusión con múltiples instrumentos, ajustar tempo (BPM), swing, compases y dinámicas de velocidad. Utiliza la pestaña Ritmos para explorar librerías prediseñadas o Patrones para construir secuencias paso a paso.',
    },
    {
      question: '¿Qué es Stagex y cómo ayuda en actuaciones en vivo?',
      answer:
        'Stagex es un diseñador visual de planos de escenario y coordinador para actuaciones en vivo. Permite a bandas, músicos y técnicos organizar la disposición del escenario, ubicar instrumentos, monitores, micrófonos y cableado, visualizar la cobertura acústica y gestionar escenas durante ensayos y conciertos.',
    },
    {
      question: '¿Qué es Groovex y para qué se utiliza?',
      answer:
        'Groovex es un motor de exploración de ritmos y polirritmias diseñado para generar patrones sincopados, bases rítmicas en capas y texturas dinámicas que complementan la composición de canciones y sesiones de improvisación.',
    },
    {
      question: '¿Qué es Vocalex y cómo funciona el entrenador vocal?',
      answer:
        'Vocalex es un compañero de práctica vocal y grabador de tomas. Emplea algoritmos de detección de tono de baja latencia para representar visualmente tu afinación en tiempo real frente a notas musicales de referencia, ayudándote a mejorar tu entonación y registrar sesiones vocales.',
    },
    {
      question: '¿Cómo funcionan los permisos de audio y MIDI en Livex?',
      answer:
        'Livex solicita acceso al micrófono únicamente para la detección acústica de tono (en Vocalex y en el Afinador Cromático) y para la grabación de tomas vocales. Los permisos MIDI permiten conectar teclados controladores e instrumentos externos. Todo el procesamiento se realiza localmente en tu dispositivo; ningún dato de audio se transmite a servidores externos.',
    },
    {
      question: '¿Cómo utilizo el afinador cromático integrado?',
      answer:
        'El afinador cromático es accesible desde Chordex y Vocalex. Pulsa el icono del Afinador, autoriza el acceso al micrófono y toca o canta una nota limpia. La aguja mostrará el tono detectado, nombre de la nota, frecuencia en hercios (Hz) y desviación en centésimas de semitono. Se recomienda un entorno con poco ruido ambiental.',
    },
    {
      question: '¿Cómo personalizo el tema, color de acento y preferencias de inicio?',
      answer:
        'Accede a Hub > Preferencias para personalizar el aspecto visual (Claro, Oscuro o Negro AMOLED puro), seleccionar un color de acento o un tono personalizado con la pipeta cuentagotas y definir el idioma. En los ajustes de cada aplicación (Chordex, Drumex, Stagex, Vocalex), puedes configurar "Iniciar en" para elegir qué pestaña se abre automáticamente al abrir cada app.',
    },
    {
      question: '¿Cómo se almacenan mis canciones, ritmos y preferencias?',
      answer:
        'Livex funciona bajo una arquitectura orientada a lo local (local-first). Todas tus canciones, acordes, secuencias de batería, montajes de escenario y preferencias se guardan directamente en la base de datos de tu dispositivo (IndexedDB y SQLite). La sincronización en la nube respalda tus datos de forma segura en Firestore cuando inicias sesión.',
    },
    {
      question: '¿Cómo funcionan las actualizaciones nativas de la APK en Android?',
      answer:
        'En Android, Livex incluye un actualizador nativo que consulta periódicamente las nuevas versiones oficiales en segundo plano. Cuando hay una versión lista, se notifica mediante un aviso. Al pulsarlo, se descarga la APK firmada y se inicia el instalador del sistema sin perder tus datos ni proyectos locales.',
    },
    {
      question: 'Solución de problemas: ¿Por qué no se escucha sonido en Livex?',
      answer:
        'Comprueba que el volumen multimedia de tu dispositivo esté activo y no en modo silencio. En navegadores web, el audio interactivo requiere un primer toque o clic en la pantalla para activar el motor Web Audio. En Android, revisa la conexión de tus auriculares o Bluetooth y asegúrate de que otra aplicación no bloquee el audio.',
    },
    {
      question: 'Solución de problemas: ¿Qué hago si el micrófono o el afinador no responden?',
      answer:
        'Verifica que el permiso de micrófono esté habilitado en los ajustes de tu dispositivo o navegador. En Android: Ajustes > Aplicaciones > Livex > Permisos > Micrófono > "Permitir solo con la app en uso". En navegadores, pulsa en el candado o icono de ajustes de la barra de direcciones para restablecer los permisos del sitio.',
    },
    {
      question: 'Solución de problemas: ¿Cómo reduzco la latencia de audio o el retardo?',
      answer:
        'Para obtener la menor latencia posible durante la práctica y el directo, utiliza auriculares con cable o los altavoces de tu dispositivo. Las conexiones inalámbricas Bluetooth agregan un retraso natural de 100-200 ms. Cerrar aplicaciones pesadas en segundo plano y desactivar el modo de ahorro de batería también ayuda a optimizar el rendimiento.',
    },
  ],
  de: [
    {
      question: 'Was ist Livex und wie starte ich?',
      answer:
        'Livex ist eine All-in-One-Musikproduktionssuite, die Akkordfolgen, Drum-Sequencing, Bühnen-Management, Gesangstraining und Rhythmus-Erkundung vereint. Tippen Sie einfach auf ein App-Symbol im Hub, um sofort zu beginnen.',
    },
    {
      question: 'Was ist Chordex und welche Instrumente werden unterstützt?',
      answer:
        'Chordex ist ein intelligenter Begleiter für Akkordfolgen und ein interaktives Songbook. Es unterstützt Gitarre, Klavier, Ukulele, Bass und Saxophon für Übung und Live-Auftritte.',
    },
    {
      question: 'Was ist Drumex und wie funktioniert der Pattern-Sequenzer?',
      answer:
        'Drumex ist eine Drum Machine mit Beat-Bibliotheken und einem detaillierten Step-Sequenzer zur Erstellung individueller Rhythmen.',
    },
    {
      question: 'Was ist Stagex und wie hilft es bei Live-Auftritten?',
      answer:
        'Stagex ermöglicht das visuelle Planen von Bühnenlayouts, Positionieren von Instrumenten und Lautsprechern sowie die Organisation von Szenen.',
    },
    {
      question: 'Was ist Groovex und wofür wird es verwendet?',
      answer:
        'Groovex ist ein Rhythmus- und Polyrhythmus-Generator für komplexe Grooves und Begleitungen.',
    },
    {
      question: 'Was ist Vocalex und wie funktioniert das Gesangstraining?',
      answer:
        'Vocalex bietet Echtzeit-Tonhöhenerkennung und visuelle Intonationskontrolle für Gesangsübungen und Aufnahmen.',
    },
    {
      question: 'Wie funktionieren Audio- und MIDI-Berechtigungen in Livex?',
      answer:
        'Mikrofonzugriff wird ausschließlich für die Tonhöhenerkennung und Aufnahmen benötigt. Alle Audiodaten verbleiben lokal auf Ihrem Gerät.',
    },
    {
      question: 'Wie verwende ich das integrierte chromatische Stimmgerät?',
      answer:
        'Aktivieren Sie das Stimmgerät in Chordex oder Vocalex und spielen Sie einen Ton. Die Anzeige zeigt Note, Frequenz und Abweichung präzise an.',
    },
    {
      question: 'Wie passe ich Design, Akzentfarbe und Start-Einstellungen an?',
      answer:
        'Unter Hub > Einstellungen können Sie Farbthemen (Hell, Dunkel, AMOLED), Akzentfarben sowie die Startansichten der einzelnen Apps festlegen.',
    },
    {
      question: 'Wie werden meine Songs, Rhythmen und Einstellungen gespeichert?',
      answer:
        'Livex speichert alle Daten lokal auf Ihrem Gerät (IndexedDB/SQLite). Bei Anmeldung sichert die Cloud-Synchronisation Ihre Daten zusätzlich ab.',
    },
    {
      question: 'Wie funktionieren native Android APK-Updates?',
      answer:
        'Auf Android prüft Livex Updates im Hintergrund und ermöglicht die direkte Aktualisierung per sicher signierter APK ohne Datenverlust.',
    },
    {
      question: 'Fehlerbehebung: Warum gibt es keinen Ton in Livex?',
      answer:
        'Überprüfen Sie die Lautstärke Ihres Geräts. In Webbrowsern ist ein erster Klick erforderlich, um die Web Audio API zu aktivieren.',
    },
    {
      question: 'Fehlerbehebung: Was tun, wenn Mikrofon oder Stimmgerät nicht reagieren?',
      answer:
        'Prüfen Sie in den Systemeinstellungen Ihres Geräts, ob Livex die Berechtigung zur Mikrofonnutzung erteilt wurde.',
    },
    {
      question: 'Fehlerbehebung: Wie kann ich die Audio-Latenz verringern?',
      answer:
        'Nutzen Sie kabelgebundene Kopfhörer anstelle von Bluetooth und schließen Sie ressourcenintensive Apps im Hintergrund.',
    },
  ],
};

export function HelpAccordion({
  accent,
  lang,
}: {
  accent: { from: string; to: string; mid: string };
  lang: string;
}) {
  const t = useT();
  const theme = useSettingsStore((s) => s.settings.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copiedBugTemplate, setCopiedBugTemplate] = useState(false);

  const faqList = FAQ_ITEMS[lang] ?? FAQ_ITEMS.en;

  const handleCopyBugTemplate = () => {
    const template = `[LIVEX BUG REPORT]
------------------------------------
App Version: v${APP_VERSION} (${Capacitor.isNativePlatform() ? 'Android' : 'Web'})
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
Date: ${new Date().toISOString()}

[Description of Bug]
- 

[Steps to Reproduce]
1. 
2. 
3. 

[Expected Behavior]
- 

[Actual Behavior]
- `;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(template);
    }
    setCopiedBugTemplate(true);
    setTimeout(() => setCopiedBugTemplate(false), 2000);
  };

  // Helper for categorizing FAQ items
  const getFaqCategory = (idx: number): string => {
    if (idx === 0) return 'getting-started';
    if (idx >= 1 && idx <= 5) return 'apps';
    if (idx >= 6 && idx <= 7) return 'audio-tuner';
    if (idx >= 8 && idx <= 10) return 'settings-sync';
    if (idx >= 11 && idx <= 13) return 'troubleshooting';
    return 'getting-started';
  };

  // Filter FAQ items
  const filteredFaqs = faqList
    .map((item, idx) => ({ ...item, originalIdx: idx }))
    .filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !activeCategory || getFaqCategory(item.originalIdx) === activeCategory;

      return matchesSearch && matchesCategory;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 42,
          padding: '0 14px',
          background: 'var(--surface-topbar-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 14,
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          boxShadow: isLight
            ? '0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            : 'var(--surface-topbar-shadow)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 180ms ease, box-shadow 180ms ease',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: 'var(--c-text-secondary)', fontSize: 19, opacity: 0.7 }}
        >
          search
        </span>
        <input
          type="text"
          placeholder={
            t.help?.accordion?.searchPlaceholder ||
            (lang === 'es' ? 'Buscar ayuda y preguntas...' : 'Search help articles & FAQs...')
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--c-text-primary)',
            fontSize: 13.5,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              cursor: 'pointer',
              color: 'var(--c-text-secondary)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              close
            </span>
          </button>
        )}
      </div>

      {/* Category Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--c-text-tertiary, #808080)',
            fontFamily: 'Inter, sans-serif',
            paddingLeft: '4px',
          }}
        >
          {lang === 'es' ? 'Categorías de Ayuda' : 'Help Categories'}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            {
              id: 'getting-started',
              label:
                t.help?.accordion?.categories?.gettingStarted ||
                (lang === 'es' ? 'Inicio' : 'Getting Started'),
              icon: 'play_circle',
            },
            {
              id: 'apps',
              label: lang === 'es' ? 'Apps y Herramientas' : 'Apps & Tools',
              icon: 'apps',
            },
            {
              id: 'audio-tuner',
              label: lang === 'es' ? 'Audio y Afinador' : 'Audio & Tuner',
              icon: 'volume_up',
            },
            {
              id: 'settings-sync',
              label:
                t.help?.accordion?.categories?.syncStorage ||
                (lang === 'es' ? 'Ajustes y Sincro' : 'Settings & Sync'),
              icon: 'cloud_sync',
            },
            {
              id: 'troubleshooting',
              label:
                t.help?.accordion?.categories?.diagnostics ||
                (lang === 'es' ? 'Solución de Problemas' : 'Troubleshooting'),
              icon: 'build',
            },
            {
              id: 'bug-report',
              label: lang === 'es' ? 'Reportar Error' : 'Report a Bug',
              icon: 'bug_report',
            },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(isActive ? null : cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 13px',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid transparent' : '1px solid var(--c-border)',
                  background: isActive
                    ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                    : 'var(--surface-topbar-bg)',
                  backdropFilter: 'var(--surface-float-blur)',
                  WebkitBackdropFilter: 'var(--surface-float-blur)',
                  color: isActive ? '#ffffff' : 'var(--c-text-secondary)',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  boxShadow: isActive
                    ? '0 2px 10px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
                    : isLight
                      ? '0 1px 4px rgba(0, 0, 0, 0.02)'
                      : 'none',
                  transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* FAQs Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--c-text-tertiary, #808080)',
            fontFamily: 'Inter, sans-serif',
            paddingLeft: '4px',
          }}
        >
          {lang === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
        </span>

        {filteredFaqs.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--surface-topbar-bg)',
              border: '1px solid var(--c-border)',
              borderRadius: 18,
              color: 'var(--c-text-secondary)',
              fontSize: 13,
            }}
          >
            {lang === 'es' ? 'No se encontraron preguntas.' : 'No matching FAQs found.'}
          </div>
        ) : (
          <div
            style={{
              border: '1px solid var(--c-border)',
              backgroundColor: 'var(--surface-topbar-bg)',
              borderRadius: 18,
              overflow: 'hidden',
              position: 'relative',
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow: isLight
                ? '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
                : 'var(--surface-topbar-shadow)',
            }}
          >
            {/* Top Specular Rim */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 12,
                right: 12,
                height: '1px',
                background: 'var(--surface-glass-rim)',
                pointerEvents: 'none',
                opacity: 0.6,
              }}
            />

            <Accordion
              type="single"
              value={openIdx !== null ? String(openIdx) : undefined}
              onValueChange={(vals) => setOpenIdx(vals.length > 0 ? Number(vals[0]) : null)}
              className="w-full"
            >
              {filteredFaqs.map((item, idx) => {
                const isOpen = openIdx === item.originalIdx;
                const isLast = idx === filteredFaqs.length - 1;
                return (
                  <AccordionItem
                    key={item.originalIdx}
                    value={String(item.originalIdx)}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--c-border)',
                      transition: 'background 180ms ease',
                    }}
                  >
                    <AccordionTrigger
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--c-text-primary)',
                        fontSize: 13.5,
                        fontWeight: 650,
                        fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                        gap: 12,
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span
                        style={{
                          color: isOpen ? accent.from : 'var(--c-text-primary)',
                          transition: 'color 180ms ease',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div
                        style={{
                          padding: '0 16px 14px 16px',
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: 'var(--c-text-secondary)',
                          borderTop: '1px solid var(--c-border)',
                          paddingTop: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <span>{item.answer}</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </div>

      {/* Report a Bug Section */}
      {(!activeCategory ||
        activeCategory === 'troubleshooting' ||
        activeCategory === 'bug-report') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--c-text-tertiary, #808080)',
              fontFamily: 'Inter, sans-serif',
              paddingLeft: '4px',
            }}
          >
            {lang === 'es' ? 'Reportar un Error' : 'Report a Bug'}
          </span>
          <div
            style={{
              background: 'var(--surface-topbar-bg)',
              border: '1px solid var(--c-border)',
              borderRadius: 18,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow: isLight
                ? '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
                : 'var(--surface-topbar-shadow)',
            }}
          >
            {/* Top Specular Rim */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 12,
                right: 12,
                height: '1px',
                background: 'var(--surface-glass-rim)',
                pointerEvents: 'none',
                opacity: 0.6,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: `${accent.from}18`,
                  border: `1px solid ${accent.from}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: accent.from, fontSize: 18 }}
                >
                  bug_report
                </span>
              </div>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 750,
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  }}
                >
                  {lang === 'es' ? 'Reportar un Error / Incidencia' : 'Report a Bug / Issue'}
                </h4>
                <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', opacity: 0.8 }}>
                  {Capacitor.isNativePlatform()
                    ? lang === 'es'
                      ? 'Copia el diagnóstico del sistema o repórtalo en nuestro repositorio GitHub.'
                      : 'Copy system diagnostics or report on our GitHub repository.'
                    : lang === 'es'
                      ? 'Copia la plantilla con datos del sistema y envíala a GitHub.'
                      : 'Copy pre-filled system diagnostics and submit on GitHub.'}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--c-border)',
                borderRadius: 12,
                fontFamily: 'monospace',
                fontSize: 11.5,
                color: 'var(--c-text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
              }}
            >
              {`[LIVEX BUG REPORT]
App Version: v${APP_VERSION} (${Capacitor.isNativePlatform() ? 'Android' : 'Web'})
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 48) + '...' : '[Auto]'}
Date: ${new Date().toISOString()}`}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyBugTemplate}
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {copiedBugTemplate ? 'check' : 'content_copy'}
                  </span>
                }
              >
                {copiedBugTemplate
                  ? lang === 'es'
                    ? '¡Copiado!'
                    : 'Copied to Clipboard!'
                  : lang === 'es'
                    ? 'Copiar Plantilla'
                    : 'Copy Bug Template'}
              </Button>

              <motion.a
                whileTap={{ scale: 0.95 }}
                href={`https://github.com/MAGEXE1000/Livex/issues/new?title=${encodeURIComponent('Bug: [Enter short title]')}&body=${encodeURIComponent(
                  `**AFFECTED MODULE**\n- [e.g. Chordex, Drumex, Stagex, Groovex, Vocalex, Settings, Help]\n\n` +
                    `**APP VERSION**\n- v${APP_VERSION} (${Capacitor.isNativePlatform() ? 'Android/Native' : 'Web'})\n\n` +
                    `**ANDROID/OS VERSION**\n- [e.g. Android 13 / Windows 11]\n\n` +
                    `**DEVICE MODEL**\n- [e.g. Samsung Galaxy S23 / Laptop]\n\n` +
                    `**REPRODUCTION STEPS**\n1. \n2. \n3. \n\n` +
                    `**EXPECTED RESULT**\n- \n\n` +
                    `**ACTUAL RESULT**\n- \n\n` +
                    `*Generated on ${new Date().toISOString()}*`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  border: '1px solid transparent',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  open_in_new
                </span>
                {lang === 'es' ? 'Reportar en GitHub' : 'Report on GitHub'}
              </motion.a>
            </div>
          </div>
        </div>
      )}

      {/* Direct Assistance Card */}
      <div
        style={{
          background: 'var(--surface-topbar-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          boxShadow: isLight
            ? '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
            : 'var(--surface-topbar-shadow)',
        }}
      >
        {/* Top Specular Rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 12,
            right: 12,
            height: '1px',
            background: 'var(--surface-glass-rim)',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />

        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 750,
              fontFamily: 'var(--studio-font-display)',
              color: 'var(--c-text-primary)',
            }}
          >
            {lang === 'es' ? '¿Necesitas ayuda directa?' : 'Need direct assistance?'}
          </h4>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 12,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.4,
              maxWidth: 380,
            }}
          >
            {lang === 'es'
              ? 'Para asistencia técnica, recuperación o reporte de incidencias, contacta con soporte o visita nuestro repositorio.'
              : 'For technical assistance, project recovery, or bug reports, contact support or visit our repository.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <motion.a
            whileTap={{ scale: 0.95 }}
            href="https://github.com/MAGEXE1000/Livex"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: '9999px',
              background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-primary)',
              fontSize: 12,
              fontWeight: 650,
              fontFamily: 'var(--type-button-font, var(--studio-font-body))',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              code
            </span>
            GitHub Repository
          </motion.a>
          <motion.a
            whileTap={{ scale: 0.95 }}
            href="mailto:stagecore.contact@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: '9999px',
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              border: '1px solid transparent',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--type-button-font, var(--studio-font-body))',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              mail
            </span>
            Contact Support
          </motion.a>
        </div>
      </div>
    </div>
  );
}
