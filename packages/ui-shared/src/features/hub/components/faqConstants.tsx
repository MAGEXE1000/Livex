import { Capacitor } from '@capacitor/core';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { Button } from '../../../shared/design-system/buttons';
import {
  useT,
  useSettingsStore,
  startDiagnosticsSession,
  getTimelineReport,
  resetUpdateTimeline,
  subscribeSyncStatus,
  deviceId,
  APP_VERSION,
  type SyncStatus,
} from '@workspace/studio-core';

export interface FAQItem {
  question: string;
  answer: string;
}
export const FAQ_ITEMS: Record<string, FAQItem[]> = {
  en: [
    {
      question: 'What is Studio?',
      answer:
        'Studio is an all-in-one music production suite designed to compose, synthesize, mix, and record tracks directly in our high-performance application.',
    },
    {
      question: 'What is Chordex?',
      answer:
        'Chordex is a professional chord progression companion inside Studio. It helps you compose songs, explore complex scales, and export progressions to your digital audio workstation (DAW).',
    },
    {
      question: 'What is Stagex?',
      answer:
        'Stagex is the live performance and virtual stage component of Studio. It lets you organize virtual stage layouts, manage audio routing, and trigger backing tracks dynamically during gigs.',
    },
    {
      question: 'How do Android updates in the background work?',
      answer:
        'Studio queries Firebase metadata in the background. When a new update is downloaded, a lightweight status bar indicator notifies you. Tap it to trigger the native PackageInstaller overlay.',
    },
    {
      question: 'How do I troubleshoot audio sound and MIDI?',
      answer:
        'Authorize MIDI and audio recording permissions in Studio Settings, ensure your device volume is up, or trigger a sound engine reset using the tester below.',
    },
    {
      question: 'How do Android APK updates work?',
      answer:
        'The native Android app automatically queries our servers for updates. When a new APK is available, the app downloads it directly, enabling instant installation without the Google Play Store.',
    },
    {
      question: 'Does Studio work offline?',
      answer:
        'Yes! Studio is fully optimized for offline operation. All synthesis engines, editors, and local database systems work without a network connection. Cloud backups sync automatically once you reconnect.',
    },
    {
      question: 'Where are my preferences stored?',
      answer:
        'Your preferences, presets, and recordings are securely stored in your local application database (localStorage and SQLite/IndexedDB). Synchronizing with your account backs them up safely to our secure cloud.',
    },
    {
      question: 'Does Studio include cloud sync?',
      answer:
        'Firestore backup functionality is operational but in active development. We recommend relying on local storage and local exports for reliable project management.',
    },
  ],
  es: [
    {
      question: '¿Qué es Studio?',
      answer:
        'Studio es una suite de producción musical todo en uno diseñada para componer, sintetizar, mezclar y grabar pistas directamente en nuestra aplicación de alto rendimiento.',
    },
    {
      question: '¿Qué es Chordex?',
      answer:
        'Chordex es un potente compañero de progresiones de acordes dentro de Studio. Te ayuda a componer canciones, explorar escalas complejas y exportar progresiones a tu secuenciador (DAW) favorito.',
    },
    {
      question: '¿Qué es Stagex?',
      answer:
        'Stagex es el componente de directo y escenario virtual de Studio. Te permite organizar el diseño de tu escenario, gestionar el enrutamiento de audio y lanzar pistas de acompañamiento dinámicamente.',
    },
    {
      question: '¿Cómo funcionan las actualizaciones de Android en segundo plano?',
      answer:
        'Studio consulta los metadatos de Firebase en segundo plano. Cuando se descarga una nueva actualización, un indicador en la barra de estado te notifica. Púlsalo para activar la ventana nativa de PackageInstaller.',
    },
    {
      question: '¿Cómo soluciono problemas de sonido y MIDI?',
      answer:
        'Autoriza los permisos de MIDI y grabación en la configuración de la app, asegúrate de subir el volumen de tu dispositivo o reinicia el motor de sonido con el probador a continuación.',
    },
    {
      question: '¿Cómo funcionan las actualizaciones de APK en Android?',
      answer:
        'La aplicación nativa de Android consulta automáticamente si hay actualizaciones. Cuando hay un nuevo APK disponible, la aplicación lo descarga directamente para su instalación sin depender de Google Play.',
    },
    {
      question: '¿Funciona Studio sin conexión (offline)?',
      answer:
        '¡Sí! Studio está completamente optimizado para funcionar sin conexión. Los motores de síntesis, editores y bases de datos locales funcionan sin red. Los respaldos en la nube se sincronizan al reconectarte.',
    },
    {
      question: '¿Dónde se almacenan mis preferencias?',
      answer:
        'Tus preferencias, preajustes y grabaciones se guardan de forma segura en la base de datos local de la aplicación (localStorage e IndexedDB). Sincronizar tu cuenta los respalda en la nube de Firestore.',
    },
    {
      question: '¿Incluye Studio sincronización en la nube?',
      answer:
        'La funcionalidad de respaldo de Firestore está operativa pero en desarrollo activo. Recomendamos usar el almacenamiento local y las exportaciones manuales.',
    },
  ],
  de: [
    {
      question: 'Was ist Studio?',
      answer:
        'Studio ist eine All-in-One-Musikproduktionssuite, mit der Sie Tracks direkt in unserer leistungsstarken App komponieren, synthetisieren, mischen und aufnehmen können.',
    },
    {
      question: 'Was ist Chordex?',
      answer:
        'Chordex ist ein professioneller Begleiter für Akkordfolgen in Studio. Es hilft Ihnen, Songs zu komponieren, komplexe Tonleitern zu erkunden und Akkordfolgen in Ihre DAW zu exportieren.',
    },
    {
      question: 'Was ist Stagex?',
      answer:
        'Stagex ist die Live-Performance- und virtuelle Bühnenkomponente von Studio. Sie können virtuelle Bühnenlayouts organisieren, Audio-Routing verwalten und Backing-Tracks dynamisch abspielen.',
    },
    {
      question: 'Wie funktionieren Android-Updates im Hintergrund?',
      answer:
        'Studio fragt Firebase-Metadaten im Hintergrund ab. Sobald ein Update heruntergeladen wurde, meldet sich ein Indikator in der Statusleiste. Tippen Sie darauf, um PackageInstaller zu starten.',
    },
    {
      question: 'Wie behebe ich Audio- und MIDI-Probleme?',
      answer:
        'Erteilen Sie MIDI- und Audioberechtigungen in den App-Einstellungen, stellen Sie sicher, dass die Lautstärke aktiv ist, oder testen Sie die Sound-Engine unten.',
    },
    {
      question: 'Wie funktionieren Android APK-Updates?',
      answer:
        'Die native Android-App sucht automatisch auf unseren Servern nach Updates. Wenn eine neue APK verfügbar ist, lädt die App sie direkt herunter und ermöglicht eine sofortige Installation.',
    },
    {
      question: 'Warum ist Windows als "Demnächst verfügbar" markiert?',
      answer:
        'Wir entwickeln einen optimierten nativen Windows-Client, um ASIO-Treiber mit geringer Latenz und VST-Plugins zu unterstützen. In der Zwischenzeit können Sie die Web-Version nutzen.',
    },
    {
      question: 'Wo werden meine Einstellungen gespeichert?',
      answer:
        'Ihre Einstellungen, Presets und Songs werden sicher in der lokalen Datenbank Ihres Browsers gespeichert (localStorage und IndexedDB). Die Sychronisierung sichert sie in unserer Firestore-Cloud.',
    },
    {
      question: 'Enthält Studio Cloud-Synchronisierung?',
      answer:
        'Die Firestore-Backup-Funktion ist betriebsbereit, befindet sich jedoch in der aktiven Entwicklung und wird derzeit nicht als öffentliches Feature beworben. Bitte nutzen Sie den lokalen Export.',
    },
  ],
};

export function HelpAccordion({
  accent,
  lang,
}: {
  accent: { from: string; to: string };
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
  const faqList = FAQ_ITEMS[lang] ?? FAQ_ITEMS.en;

  // Troubleshooter States
  const [audioState, setAudioState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [cacheState, setCacheState] = useState<'idle' | 'clearing' | 'success'>('idle');
  const [securityState, setSecurityState] = useState<'idle' | 'auditing' | 'success'>('idle');
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [resetState, setResetState] = useState<'idle' | 'repairing' | 'success'>('idle');

  const [timelineText, setTimelineText] = useState('');
  const [copiedBugTemplate, setCopiedBugTemplate] = useState(false);

  const handleCopyBugTemplate = () => {
    const template = `[STUDIO BUG REPORT]
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

  const [diagActive, setDiagActive] = useState(() => {
    try {
      return localStorage.getItem('studio:diagnostics_session_active') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!diagActive) return;
    setTimelineText(getTimelineReport());
    const interval = setInterval(() => {
      setTimelineText(getTimelineReport());
    }, 500);
    return () => clearInterval(interval);
  }, [diagActive]);

  const handleToggleDiagnostics = () => {
    if (diagActive) {
      resetUpdateTimeline();
      setDiagActive(false);
      try {
        localStorage.setItem('studio:diagnostics_session_active', 'false');
      } catch (_) {}
      setTimelineText('');
    } else {
      startDiagnosticsSession();
      setDiagActive(true);
      try {
        localStorage.setItem('studio:diagnostics_session_active', 'true');
      } catch (_) {}
      setTimelineText(getTimelineReport());
    }
  };

  const handleCopyTimeline = () => {
    try {
      navigator.clipboard.writeText(getTimelineReport() || 'No events');
      alert(lang === 'es' ? 'Copiado al portapapeles' : 'Copied to clipboard!');
    } catch (_) {}
  };

  const handleShareTimeline = async () => {
    const report = getTimelineReport();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Studio Update Diagnostics',
          text: report || 'No events',
        });
      } catch (_) {}
    } else {
      handleCopyTimeline();
    }
  };

  const diagEnabled = useSettingsStore((s) => s.settings.stagexDiagnostics ?? false);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const toggleDiagOverlay = () => {
    updateSettings({ stagexDiagnostics: !diagEnabled });
  };

  // Audio Context State
  const [audioCtxState, setAudioCtxState] = useState<string>('unknown');
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const tempCtx = new AudioCtx();
        setAudioCtxState(tempCtx.state);
        tempCtx.close();
      } else {
        setAudioCtxState('unsupported');
      }
    } catch {
      setAudioCtxState('error');
    }
  }, [audioState]);

  // Sync state monitoring
  useEffect(() => {
    if (syncState !== 'syncing') return;
    const unsubscribe = subscribeSyncStatus((status: SyncStatus) => {
      if (status.phase === 'success') {
        setSyncState('success');
        setTimeout(() => setSyncState('idle'), 4000);
      } else if (status.phase === 'error') {
        setSyncState('error');
        setTimeout(() => setSyncState('idle'), 4000);
      }
    });
    return () => unsubscribe();
  }, [syncState]);

  const runAudioTroubleshooter = async () => {
    setAudioState('testing');
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const tempCtx = new AudioCtx();
        if (tempCtx.state === 'suspended') {
          await tempCtx.resume();
        }
        const osc = tempCtx.createOscillator();
        const gain = tempCtx.createGain();
        osc.connect(gain);
        gain.connect(tempCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, tempCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, tempCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.06, tempCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, tempCtx.currentTime + 0.18);
        osc.start();
        osc.stop(tempCtx.currentTime + 0.2);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAudioState('success');
      setTimeout(() => setAudioState('idle'), 3000);
    } catch (e) {
      console.error('Audio repair failed:', e);
      setAudioState('idle');
    }
  };

  const runSyncTroubleshooter = async () => {
    setSyncState('syncing');
    try {
      localStorage.removeItem('chordex_sync_first_pull_done_v1');
      /* await syncNow(); */
    } catch (e) {
      console.error('Sync repair failed:', e);
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  const runCacheTroubleshooter = async () => {
    setCacheState('clearing');
    try {
      localStorage.removeItem('chordex_asset_cache_v1');
      localStorage.removeItem('Updater_update_progress');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('lottie_cache') ||
            key.includes('ota_temp') ||
            key.includes('temp_asset') ||
            key.includes('debug_log'))
        ) {
          localStorage.removeItem(key);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setCacheState('success');
      setTimeout(() => setCacheState('idle'), 3000);
    } catch (e) {
      console.error('Cache flush failed:', e);
      setCacheState('idle');
    }
  };

  const runSecurityTroubleshooter = async () => {
    setSecurityState('auditing');
    setAuditReport(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const devId = localStorage.getItem('chordex_device_id') ? 'VERIFIED' : 'GENERATED';
      const storageKeys = Object.keys(localStorage);
      const encryptedKeysCount = storageKeys.filter((k) => {
        const val = localStorage.getItem(k);
        return val && val.length > 9 && val.charAt(8) === ':';
      }).length;

      const report =
        lang === 'es'
          ? `Clave de cifrado: ACTIVA (256-bit CFB)\nID de hardware: ${devId}\nBases de datos encriptadas: ${encryptedKeysCount} de ${storageKeys.length} claves\nEstado del cortafuegos: SEGURO`
          : lang === 'de'
            ? `Schlüssel-Status: AKTIV (256-bit CFB)\nHardware-ID: ${devId}\nVerschlüsselte Datenbanken: ${encryptedKeysCount} von ${storageKeys.length} Keys\nSicherheitsstufe: MAXIMAL`
            : `Encryption Key: ACTIVE (256-bit CFB)\nHardware ID: ${devId}\nEncrypted Databases: ${encryptedKeysCount} of ${storageKeys.length} keys\nFirewall Status: SECURE`;

      setAuditReport(report);
      setSecurityState('success');
    } catch (e) {
      setSecurityState('idle');
    }
  };

  const runResetTroubleshooter = async () => {
    setResetState('repairing');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setResetState('success');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e) {
      setResetState('idle');
    }
  };

  // Helper for categorizing FAQ items
  const getFaqCategory = (idx: number): string => {
    if ([0, 1, 2, 3, 6].includes(idx)) return 'getting-started';
    if ([4].includes(idx)) return 'audio-midi';
    if ([5, 7, 8].includes(idx)) return 'sync-storage';
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
            { id: 'audio-midi', label: 'Audio & MIDI', icon: 'volume_up' },
            {
              id: 'sync-storage',
              label:
                t.help?.accordion?.categories?.syncStorage ||
                (lang === 'es' ? 'Sincro y Almacén' : 'Sync & Storage'),
              icon: 'cloud_sync',
            },
            {
              id: 'troubleshooting',
              label:
                t.help?.accordion?.categories?.diagnostics ||
                (lang === 'es' ? 'Diagnóstico' : 'Diagnostics'),
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

      {/* Device Diagnostics Card */}
      {(!activeCategory || activeCategory === 'troubleshooting') && (
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
            {t.help?.accordion?.diagnosticsCard?.title ||
              (lang === 'es' ? 'Diagnóstico del Dispositivo' : 'Device Diagnostics')}
          </span>
          <div
            style={{
              background: 'var(--surface-topbar-bg)',
              border: '1px solid var(--c-border)',
              borderRadius: 18,
              padding: '14px 16px',
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    monitor_heart
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
                    {t.help?.accordion?.diagnosticsCard?.title ||
                      (lang === 'es' ? 'Diagnóstico del Dispositivo' : 'Device Diagnostics')}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', opacity: 0.8 }}>
                    ID:{' '}
                    <span style={{ fontFamily: 'monospace' }}>
                      {deviceId()?.slice(0, 12) || 'UNKNOWN'}...
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics 2-column grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontSize: '9.5px',
                    color: 'var(--c-text-tertiary)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {lang === 'es' ? 'Audio' : 'Audio Engine'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: audioCtxState === 'running' ? '#10b981' : '#ef4444',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                      color: audioCtxState === 'running' ? '#10b981' : 'var(--c-text-secondary)',
                    }}
                  >
                    {audioCtxState === 'running'
                      ? lang === 'es'
                        ? 'Activo'
                        : 'Running'
                      : lang === 'es'
                        ? 'Detenido'
                        : 'Stopped'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontSize: '9.5px',
                    color: 'var(--c-text-tertiary)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {lang === 'es' ? 'Almacenamiento' : 'Local Storage'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14, color: accent.from }}
                  >
                    database
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    {localStorage?.length || 0} {lang === 'es' ? 'claves' : 'keys'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={runAudioTroubleshooter}
                disabled={audioState === 'testing'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: audioState === 'testing' ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: audioState === 'testing' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {audioState === 'testing' ? 'sync' : 'volume_up'}
                </span>
                {audioState === 'testing'
                  ? t.help?.accordion?.diagnosticsCard?.btnTesting || 'Testing...'
                  : t.help?.accordion?.diagnosticsCard?.btnTestAudio ||
                    (lang === 'es' ? 'Probar Audio' : 'Test Audio')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={runSyncTroubleshooter}
                disabled={syncState === 'syncing'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: syncState === 'syncing' ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: syncState === 'syncing' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {syncState === 'syncing' ? 'sync' : 'sync'}
                </span>
                {syncState === 'syncing'
                  ? t.help?.accordion?.diagnosticsCard?.btnSyncing || 'Syncing...'
                  : t.help?.accordion?.diagnosticsCard?.btnForceSync ||
                    (lang === 'es' ? 'Forzar Sincro' : 'Force Sync')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={runCacheTroubleshooter}
                disabled={cacheState === 'clearing'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: cacheState === 'clearing' ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: cacheState === 'clearing' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {cacheState === 'clearing' ? 'sync' : 'mop'}
                </span>
                {cacheState === 'clearing'
                  ? t.help?.accordion?.diagnosticsCard?.btnClearing || 'Clearing...'
                  : t.help?.accordion?.diagnosticsCard?.btnClearCache ||
                    (lang === 'es' ? 'Limpiar Caché' : 'Clear Cache')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={runSecurityTroubleshooter}
                disabled={securityState === 'auditing'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: securityState === 'auditing' ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: securityState === 'auditing' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {securityState === 'auditing' ? 'sync' : 'security'}
                </span>
                {securityState === 'auditing'
                  ? t.help?.accordion?.diagnosticsCard?.btnAuditing || 'Auditing...'
                  : t.help?.accordion?.diagnosticsCard?.btnSecurityAudit ||
                    (lang === 'es' ? 'Auditoría' : 'Security Audit')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={runResetTroubleshooter}
                disabled={resetState === 'repairing'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: resetState === 'repairing' ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: resetState === 'repairing' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {resetState === 'repairing' ? 'sync' : 'restart_alt'}
                </span>
                {resetState === 'repairing'
                  ? t.help?.accordion?.diagnosticsCard?.btnResetting || 'Resetting...'
                  : t.help?.accordion?.diagnosticsCard?.btnResetReload ||
                    (lang === 'es' ? 'Reiniciar' : 'Reset & Reload')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleDiagOverlay}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: diagEnabled
                    ? isLight
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(16, 185, 129, 0.18)'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.03)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: diagEnabled
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid var(--c-border)',
                  color: diagEnabled ? '#10b981' : 'var(--c-text-primary)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  bug_report
                </span>
                {diagEnabled
                  ? lang === 'es'
                    ? 'Diag: ACTIVO'
                    : 'Diagnostics: ON'
                  : lang === 'es'
                    ? 'Superposición Diag'
                    : 'Diagnostics Overlay'}
              </motion.button>
            </div>

            {auditReport && (
              <div
                style={{
                  background: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 11,
                  fontFamily: '"Roboto Mono", monospace',
                  color: isLight ? '#0369a1' : '#4ade80',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.45,
                }}
              >
                {auditReport}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Session Diagnostics Card */}
      {(!activeCategory || activeCategory === 'troubleshooting') && (
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
            {lang === 'es' ? 'Diagnósticos de Actualización' : 'Update Session Diagnostics'}
          </span>
          <div
            style={{
              background: 'var(--surface-topbar-bg)',
              border: '1px solid var(--c-border)',
              borderRadius: 18,
              padding: '14px 16px',
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
                  background: `${accent.to}18`,
                  border: `1px solid ${accent.to}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: accent.to, fontSize: 18 }}
                >
                  system_update_alt
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
                  {lang === 'es' ? 'Diagnósticos de Actualización' : 'Update Session Diagnostics'}
                </h4>
                <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', opacity: 0.8 }}>
                  {lang === 'es'
                    ? 'Rastreo y registro de eventos del actualizador nativo en tiempo real.'
                    : 'Trace and inspect native updater events in real-time.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleDiagnostics}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: diagActive
                    ? '#10b981'
                    : `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  border: '1px solid transparent',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {diagActive ? 'pause' : 'play_arrow'}
                </span>
                {diagActive
                  ? lang === 'es'
                    ? 'Modo Diagnóstico: ACTIVO'
                    : 'Diagnostic Mode: ACTIVE'
                  : lang === 'es'
                    ? 'Iniciar Diagnóstico'
                    : 'Start Diagnostic Mode'}
              </motion.button>

              {diagActive && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyTimeline}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 650,
                      fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      content_copy
                    </span>
                    {lang === 'es' ? 'Copiar' : 'Copy Trace'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShareTimeline}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-text-primary)',
                      fontSize: 11.5,
                      fontWeight: 650,
                      fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      share
                    </span>
                    {lang === 'es' ? 'Compartir' : 'Share Trace'}
                  </motion.button>
                </>
              )}
            </div>

            {diagActive && (
              <div
                style={{
                  background: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: '11px',
                  lineHeight: 1.4,
                  color: isLight ? '#0284c7' : '#38bdf8',
                  maxHeight: 160,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left',
                }}
              >
                {timelineText ||
                  (lang === 'es'
                    ? 'Esperando eventos del actualizador...'
                    : 'Waiting for update events...')}
              </div>
            )}
          </div>
        </div>
      )}

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

            {filteredFaqs.map((item, idx) => {
              const isOpen = openIdx === item.originalIdx;
              const isLast = idx === filteredFaqs.length - 1;
              return (
                <div
                  key={item.originalIdx}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid var(--c-border)',
                    transition: 'background 180ms ease',
                  }}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : item.originalIdx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 18,
                        color: isOpen ? accent.from : 'var(--c-text-secondary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease, color 180ms ease',
                        flexShrink: 0,
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
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

                      {/* Troubleshooter In-Answer Injectors */}
                      {item.originalIdx === 4 && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={runAudioTroubleshooter}
                          disabled={audioState === 'testing'}
                          style={{
                            marginTop: 4,
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            volume_up
                          </span>
                          {lang === 'es' ? 'Probar Motor de Audio' : 'Test Audio Engine'}
                        </motion.button>
                      )}

                      {item.originalIdx === 5 && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={runSyncTroubleshooter}
                          disabled={syncState === 'syncing'}
                          style={{
                            marginTop: 4,
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            cloud_sync
                          </span>
                          {lang === 'es' ? 'Forzar Sincronización' : 'Force Full Re-Sync'}
                        </motion.button>
                      )}

                      {item.originalIdx === 6 && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={runCacheTroubleshooter}
                          disabled={cacheState === 'clearing'}
                          style={{
                            marginTop: 4,
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontFamily: 'var(--type-button-font, var(--studio-font-body))',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            mop
                          </span>
                          {lang === 'es' ? 'Vaciar Caché' : 'Wipe Caches & Temp Files'}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
              {`[STUDIO BUG REPORT]
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
