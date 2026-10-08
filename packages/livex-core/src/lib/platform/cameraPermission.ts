import { Capacitor } from '@capacitor/core';

/**
 * Requests native camera hardware permission on Android Capacitor.
 * On Web/desktop, returns true (handled directly via getUserMedia browser prompts).
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { AppInstaller } = await import('./apkDownloader');
      const check = await AppInstaller.checkPermissions();
      if (check?.camera === 'granted') {
        return true;
      }
      const req = await AppInstaller.requestPermissions({ aliases: ['camera'] });
      return req?.camera === 'granted';
    } catch (err) {
      console.warn('[CameraPermission] Native permission request fallback:', err);
      return true;
    }
  }
  return true;
}
