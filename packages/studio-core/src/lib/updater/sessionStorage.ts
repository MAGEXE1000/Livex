import { Capacitor } from '@capacitor/core';
import { NATIVE_VERSION, NATIVE_VERSION_CODE } from '../appVersion';
/**
 * updater/sessionStorage.ts
 *
 * localStorage / sessionStorage utilities and native version queries
 * used throughout the Updater updater pipeline.
 *
 * Exports: getStoredList, addToStoredList, removeFromStoredList,
 *          getSessionItem, setSessionItem, removeSessionItem,
 *          getNativeVersion, getNativeVersionCode
 */

import { releaseMetadataInspector } from './versionLogger';

export function getStoredList(key: string): string[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToStoredList(key: string, val: string): void {
  try {
    const list = getStoredList(key);
    if (!list.includes(val)) {
      list.push(val);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
}

export function removeFromStoredList(key: string, val: string): void {
  try {
    const list = getStoredList(key);
    const filtered = list.filter((v) => v !== val);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

export function getSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSessionItem(key: string, val: string): void {
  try {
    sessionStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

export function removeSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export async function getNativeVersion(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { AppInstaller } = await import('../apkDownloader');
    const info = await AppInstaller.getInstalledAppInfo();
    if (info && typeof info.versionName === 'string' && info.versionName.trim().length > 0) {
      releaseMetadataInspector.rawVersionName = info.versionName;
      return info.versionName;
    }
    return NATIVE_VERSION;
  } catch (e) {
    return NATIVE_VERSION;
  }
}

export async function getNativeVersionCode(): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { AppInstaller } = await import('../apkDownloader');
    const info = await AppInstaller.getInstalledAppInfo();
    if (info && typeof info.versionCode === 'number' && info.versionCode > 0) {
      return info.versionCode;
    }
    return NATIVE_VERSION_CODE;
  } catch (e) {
    return NATIVE_VERSION_CODE;
  }
}
