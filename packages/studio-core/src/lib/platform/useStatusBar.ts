import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform ? Capacitor.isNativePlatform() : false;

function getThemeColors(theme: string, amoledMode: boolean) {
  const systemIsLight =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
  const isLight = theme === 'light' || (theme === 'system' && systemIsLight);

  if (isLight) return { bg: '#f2f1ef', style: 'LIGHT' as const };
  if (amoledMode) return { bg: '#000000', style: 'DARK' as const };
  return { bg: '#141414', style: 'DARK' as const };
}

export async function syncStatusBar(theme: string, amoledMode: boolean) {
  if (!isNative) return;

  const { bg, style } = getThemeColors(theme, amoledMode);

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.show();
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: bg });
    await StatusBar.setStyle({ style: style === 'DARK' ? Style.Dark : Style.Light });
  } catch (err) {}
}

export function useStatusBar(theme: string, amoledMode: boolean) {
  useEffect(() => {
    void syncStatusBar(theme, amoledMode);
  }, [theme, amoledMode]);
}
