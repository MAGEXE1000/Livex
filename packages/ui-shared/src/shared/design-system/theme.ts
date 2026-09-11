import {
  NavigationDispatcher,
  useSettingsStore,
  resolveAccent,
  type AppKey,
} from '@workspace/studio-core';

export function useStudioDesignSystem() {
  const settings = useSettingsStore((s) => s.settings);
  const appKey = NavigationDispatcher.currentApp() as AppKey;
  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled =
    !isLight && Boolean(settings.amoledMode || settings.perApp?.[appKey]?.amoledMode);
  const activeVis = {
    theme: settings.perApp?.[appKey]?.theme ?? settings.theme ?? 'dark',
    amoledMode: isAmoled,
  };
  const accent = resolveAccent(settings.accentColor);
  const themeMode: 'light' | 'dark' | 'amoled' = isLight ? 'light' : isAmoled ? 'amoled' : 'dark';
  return { isLight, isAmoled, themeMode, activeVis, accent };
}
