import {
  NavigationDispatcher,
  useSettingsStore,
  resolveAccent,
  type AppKey,
  useShallow,
} from '@workspace/studio-core';

export function useStudioDesignSystem() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      perApp: s.settings.perApp,
      accentColor: s.settings.accentColor,
    }))
  );
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
