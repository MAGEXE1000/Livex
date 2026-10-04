import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Keeps human-readable titles while stripping characters illegal across
 * Android, Windows, macOS, and Linux file systems.
 */
export function sanitizeFilename(title: string | null | undefined, fallback = 'file'): string {
  const cleaned = (title || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 100)
    .trim();
  return cleaned || fallback;
}
