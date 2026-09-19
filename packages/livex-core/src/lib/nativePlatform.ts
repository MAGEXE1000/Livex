import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const shouldUseAndroidApkUpdater = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const lockOrientation = async (orientation: 'portrait' | 'landscape'): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      await ScreenOrientation.lock({ orientation });
    } else if (
      typeof window !== 'undefined' &&
      window.screen &&
      window.screen.orientation &&
      (window.screen.orientation as any).lock
    ) {
      await (window.screen.orientation as any).lock(orientation);
    }
  } catch (e) {
    // Ignore orientation lock errors
  }
};
