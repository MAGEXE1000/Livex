import { type NavigationRoute, type NavigationHistory } from './navigationTypes';
import { useSettingsStore } from '../../store/useSettingsStore.js';

export class NavigationCoordinator {
  /**
   * Resolves default landing pages/tabs for sub-apps if not explicitly provided.
   */
  public static resolveDefaultRoute(route: Partial<NavigationRoute>): NavigationRoute {
    const timestamp = new Date().toISOString();
    const nextRoute: NavigationRoute = {
      app: route.app || 'hub',
      tab: route.tab,
      page: route.page,
      subView: route.subView,
      id: route.id,
      type: route.type,
    };

    const settings = useSettingsStore.getState().settings;

    if (nextRoute.app === 'chordex' && !nextRoute.page) {
      nextRoute.page = settings.defaultTab || 'library';
    } else if (nextRoute.app === 'groovex' && !nextRoute.page) {
      nextRoute.page = settings.defaultGroovexView || 'library';
    } else if (nextRoute.app === 'vocalex' && !nextRoute.page) {
      const vTab = settings.defaultVocalexTab as any;
      nextRoute.page =
        vTab === 'practice' || vTab === 'vocalLab' || vTab === 'pitch' ? 'coach' : vTab || 'coach';
    } else if (nextRoute.app === 'drumex' && !nextRoute.page) {
      const dTab = settings.defaultDrumTab;
      nextRoute.page = (dTab === 'songs' ? 'beats' : dTab) || 'beats';
    } else if (nextRoute.app === 'stagex' && !nextRoute.page) {
      nextRoute.page = settings.defaultStageView || 'Editor';
    }
    return nextRoute;
  }

  /**
   * Restores navigation state based on user store preferences.
   */
  public static restoreLastSession(
    rememberSession: boolean,
    savedApp: string | null,
    savedTab?: string | null,
    savedPage?: string | null
  ): NavigationHistory {
    const timestamp = new Date().toISOString();
    const defaultHistory: NavigationHistory = [{ app: 'hub', tab: 'home' }];

    if (!rememberSession || !savedApp || savedApp === 'hub') {
      return defaultHistory;
    }

    const appRoute: Partial<NavigationRoute> = {
      app: savedApp as any,
      tab: savedTab as any,
      page: savedPage || undefined,
    };

    const resolved = this.resolveDefaultRoute(appRoute);
    const resultHistory = [...defaultHistory, resolved];
    return resultHistory;
  }
}
