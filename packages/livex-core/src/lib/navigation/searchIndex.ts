import { ENJAMBRE_SONGS } from '../../data/songs';
import { NavigationDispatcher } from './NavigationDispatcher';

export interface SearchableItem {
  id: string;
  category: 'apps' | 'settings' | 'projects' | 'songs' | 'actions';
  titleEn: string;
  titleEs: string;
  subtitleEn: string;
  subtitleEs: string;
  keywordsEn?: string[];
  keywordsEs?: string[];
  target: {
    app?: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex';
    tab?: 'home' | 'settings' | 'profile' | 'help';
    page?: string;
    action?: () => void;
  };
}

class CentralizedSearchIndex {
  private items: SearchableItem[] = [];

  constructor() {
    this.registerDefaults();
  }

  public register(item: SearchableItem) {
    const idx = this.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      this.items[idx] = item;
    } else {
      this.items.push(item);
    }
  }

  public getItems(): SearchableItem[] {
    return this.items;
  }

  private registerDefaults() {
    // 1. Applications
    this.register({
      id: 'app-chords',
      category: 'apps',
      titleEn: 'Chordex',
      titleEs: 'Chordex',
      subtitleEn: 'Build chord progressions & study harmony',
      subtitleEs: 'Construye progresiones de acordes y estudia armonía',
      keywordsEn: ['chords', 'progressions', 'guitar', 'piano', 'scales'],
      keywordsEs: ['acordes', 'progresiones', 'guitarra', 'piano', 'escalas'],
      target: { app: 'chordex' },
    });
    this.register({
      id: 'app-drums',
      category: 'apps',
      titleEn: 'Drumex',
      titleEs: 'Drumex',
      subtitleEn: 'Program drum sequences & beat grids',
      subtitleEs: 'Programa secuencias de batería y cuadrículas de ritmo',
      keywordsEn: ['drums', 'beats', 'sequencer', 'patterns'],
      keywordsEs: ['batería', 'ritmos', 'secuenciador', 'patrones'],
      target: { app: 'drumex' },
    });
    this.register({
      id: 'app-stage',
      category: 'apps',
      titleEn: 'Stagex',
      titleEs: 'Stagex',
      subtitleEn: 'Live performance console & midi routing',
      subtitleEs: 'Consola de actuación en vivo y enrutamiento midi',
      keywordsEn: ['stage', 'performance', 'midi', 'routing'],
      keywordsEs: ['escenario', 'actuación', 'midi', 'enrutamiento'],
      target: { app: 'stagex' },
    });
    this.register({
      id: 'app-groovex',
      category: 'apps',
      titleEn: 'Groovex',
      titleEs: 'Groovex',
      subtitleEn: 'Audio groove player & tempo sync',
      subtitleEs: 'Reproductor de groove de audio y sincro de tempo',
      keywordsEn: ['groove', 'player', 'mixer', 'tempo', 'sync'],
      keywordsEs: ['groove', 'reproductor', 'mezclador', 'tempo', 'sincronización'],
      target: { app: 'groovex' },
    });
    this.register({
      id: 'app-vocalex',
      category: 'apps',
      titleEn: 'Vocalex',
      titleEs: 'Vocalex',
      subtitleEn: 'Pitch tracker, vocal trainer & voice coach',
      subtitleEs: 'Rastreador de tono, entrenador vocal y coach de voz',
      keywordsEn: ['voice', 'vocal', 'pitch', 'trainer', 'singing'],
      keywordsEs: ['voz', 'vocal', 'tono', 'entrenador', 'canto'],
      target: { app: 'vocalex' },
    });

    // Vocalex sub-pages
    this.register({
      id: 'vocalex-coach',
      category: 'apps',
      titleEn: 'Vocal Coach',
      titleEs: 'Entrenador Vocal',
      subtitleEn: 'Train voice pitch & range intervals',
      subtitleEs: 'Entrena el tono de voz e intervalos de rango',
      keywordsEn: ['vocal', 'coach', 'trainer', 'singing', 'vocalex'],
      keywordsEs: ['vocal', 'entrenador', 'coach', 'canto', 'vocalex'],
      target: { app: 'vocalex', page: 'coach' },
    });
    this.register({
      id: 'vocalex-recorder',
      category: 'apps',
      titleEn: 'Voice Recorder',
      titleEs: 'Grabadora de Voz',
      subtitleEn: 'Record vocal sessions & track pitch history',
      subtitleEs: 'Graba sesiones vocales y rastrea el historial de tono',
      keywordsEn: ['record', 'voice', 'recorder', 'mic', 'vocalex'],
      keywordsEs: ['grabar', 'voz', 'grabadora', 'micro', 'vocalex'],
      target: { app: 'vocalex', page: 'takes' },
    });
    this.register({
      id: 'vocalex-takes',
      category: 'apps',
      titleEn: 'Vocal Takes History',
      titleEs: 'Historial de Tomas Vocales',
      subtitleEn: 'View recent recorded vocal takes & diagnostics',
      subtitleEs: 'Ver tomas vocales grabadas recientemente y diagnósticos',
      keywordsEn: ['takes', 'history', 'recordings', 'vocalex'],
      keywordsEs: ['tomas', 'historial', 'grabaciones', 'vocalex'],
      target: { app: 'vocalex', page: 'takes' },
    });

    // 2. Settings Sections
    this.register({
      id: 'setting-general',
      category: 'settings',
      titleEn: 'General Preferences',
      titleEs: 'Preferencias Generales',
      subtitleEn: 'Configure workspace layout & app behaviors',
      subtitleEs: 'Configura el espacio de trabajo y comportamientos de las apps',
      keywordsEn: ['preferences', 'layout', 'behavior', 'settings'],
      keywordsEs: ['preferencias', 'diseño', 'comportamiento', 'ajustes'],
      target: { app: 'hub', tab: 'settings', page: 'general' },
    });
    this.register({
      id: 'setting-appearance',
      category: 'settings',
      titleEn: 'Appearance Settings',
      titleEs: 'Ajustes de Apariencia',
      subtitleEn: 'Themes, dark mode & motion speeds',
      subtitleEs: 'Temas, modo oscuro y velocidades de animación',
      keywordsEn: ['theme', 'dark', 'light', 'colors', 'motion', 'animations'],
      keywordsEs: ['tema', 'oscuro', 'claro', 'colores', 'animaciones'],
      target: { app: 'hub', tab: 'settings', page: 'appearance' },
    });
    this.register({
      id: 'setting-language',
      category: 'settings',
      titleEn: 'Language Selection',
      titleEs: 'Selección de Idioma',
      subtitleEn: 'Change display language between English & Spanish',
      subtitleEs: 'Cambia el idioma de visualización entre inglés y español',
      keywordsEn: ['language', 'english', 'spanish', 'locale'],
      keywordsEs: ['idioma', 'inglés', 'español', 'lenguaje'],
      target: { app: 'hub', tab: 'settings', page: 'language' },
    });
    this.register({
      id: 'setting-privacy',
      category: 'settings',
      titleEn: 'Privacy & Security',
      titleEs: 'Privacidad y Seguridad',
      subtitleEn: 'Data sync options, encryption keys & local storage',
      subtitleEs: 'Opciones de sincronización, claves de cifrado y almacenamiento local',
      keywordsEn: ['privacy', 'security', 'encryption', 'sync', 'backup'],
      keywordsEs: ['privacidad', 'seguridad', 'cifrado', 'sincronización', 'respaldo'],
      target: { app: 'hub', tab: 'settings', page: 'privacy' },
    });
    this.register({
      id: 'setting-updater',
      category: 'settings',
      titleEn: 'App Updater',
      titleEs: 'Actualizador de App',
      subtitleEn: 'Check for OTA updates & release history',
      subtitleEs: 'Buscar actualizaciones OTA e historial de lanzamientos',
      keywordsEn: ['update', 'ota', 'builds', 'updater'],
      keywordsEs: ['actualización', 'ota', 'versiones', 'actualizador'],
      target: { app: 'hub', tab: 'settings', page: 'updater' },
    });
    this.register({
      id: 'setting-developer',
      category: 'settings',
      titleEn: 'Developer Options',
      titleEs: 'Opciones de Desarrollador',
      subtitleEn: 'Diagnostics, console logs, simulator controls',
      subtitleEs: 'Diagnóstico, registros de consola, controles de simulador',
      keywordsEn: ['developer', 'options', 'logs', 'diagnostics', 'simulation'],
      keywordsEs: ['desarrollador', 'opciones', 'registros', 'diagnóstico', 'simulación'],
      target: { app: 'hub', tab: 'settings', page: 'developer' },
    });
    this.register({
      id: 'setting-about',
      category: 'settings',
      titleEn: 'About Livex',
      titleEs: 'Acerca de Livex',
      subtitleEn: 'Version manifest, credentials & copyright fingerprint',
      subtitleEs: 'Manifiesto de versión, credenciales y derechos de autor',
      keywordsEn: ['about', 'version', 'fingerprint', 'license'],
      keywordsEs: ['acerca de', 'versión', 'licencia', 'sistema'],
      target: { app: 'hub', tab: 'settings', page: 'about' },
    });
    this.register({
      id: 'setting-help',
      category: 'settings',
      titleEn: 'Help Center & FAQ',
      titleEs: 'Centro de Ayuda y FAQ',
      subtitleEn: 'Frequently asked questions, guides & documentation',
      subtitleEs: 'Preguntas frecuentes, guías y documentación',
      keywordsEn: ['help', 'faq', 'support', 'documentation', 'guides'],
      keywordsEs: ['ayuda', 'faq', 'soporte', 'documentación', 'guías'],
      target: { app: 'hub', tab: 'settings', page: 'help-center' },
    });

    // 3. Menus / Pages
    this.register({
      id: 'menu-home',
      category: 'actions',
      titleEn: 'Go to Home Screen',
      titleEs: 'Ir a Pantalla de Inicio',
      subtitleEn: 'Navigate back to the main Hub overview',
      subtitleEs: 'Navega de regreso al resumen del Hub principal',
      keywordsEn: ['home', 'hub', 'overview'],
      keywordsEs: ['inicio', 'hub', 'principal'],
      target: { app: 'hub', tab: 'home' },
    });
    this.register({
      id: 'menu-profile',
      category: 'actions',
      titleEn: 'Go to Profile Page',
      titleEs: 'Ir a la Página de Perfil',
      subtitleEn: 'Edit user profile, nickname & avatar settings',
      subtitleEs: 'Edita el perfil de usuario, apodo y avatar',
      keywordsEn: ['profile', 'avatar', 'user', 'account', 'nickname'],
      keywordsEs: ['perfil', 'avatar', 'usuario', 'cuenta', 'apodo'],
      target: { app: 'hub', tab: 'profile', page: 'profile' },
    });
    this.register({
      id: 'menu-help',
      category: 'actions',
      titleEn: 'Open Help Tab',
      titleEs: 'Abrir Pestaña de Ayuda',
      subtitleEn: 'Access documentation and FAQ search directly',
      subtitleEs: 'Accede a la documentación y búsqueda de FAQ directamente',
      keywordsEn: ['help', 'support', 'tab'],
      keywordsEs: ['ayuda', 'soporte', 'pestaña'],
      target: { app: 'hub', tab: 'help' },
    });

    // 4. Actions
    this.register({
      id: 'action-sync-cloud',
      category: 'actions',
      titleEn: 'Sync Data to Cloud',
      titleEs: 'Sincronizar Datos en la Nube',
      subtitleEn: 'Force trigger a database sync with remote servers',
      subtitleEs: 'Fuerza una sincronización de base de datos con servidores remotos',
      keywordsEn: ['sync', 'cloud', 'backup', 'force'],
      keywordsEs: ['sincronizar', 'nube', 'respaldo', 'forzar'],
      target: {
        app: 'hub',
        tab: 'settings',
        page: 'privacy',
      },
    });

    // 5. Catalog Songs
    ENJAMBRE_SONGS.forEach((song) => {
      this.register({
        id: `song-${song.id}`,
        category: 'songs',
        titleEn: song.title,
        titleEs: song.title,
        subtitleEn: `by ${song.artist} (${song.genre})`,
        subtitleEs: `de ${song.artist} (${song.genre})`,
        keywordsEn: [song.artist, song.genre, 'song', 'catalog', 'chords', 'chart'],
        keywordsEs: [song.artist, song.genre, 'canción', 'catálogo', 'acordes'],
        target: {
          app: 'chordex',
          action: () => {
            // Launch Chords app and direct to practice view
            NavigationDispatcher.push({
              app: 'chordex',
              tab: 'songs',
              page: 'practice',
              params: { songId: song.id },
            } as any);
          },
        },
      });
    });
  }
}

export const searchIndex = new CentralizedSearchIndex();
