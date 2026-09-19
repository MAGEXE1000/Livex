import { useState } from 'react';

const CANONICAL_STORAGE_KEY = 'livex:shortcuts';
const LEGACY_STORAGE_KEY = 'studio:shortcuts';

export function useLivexShortcuts() {
  const [shortcuts, setShortcuts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CANONICAL_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addShortcut = (id: string) => {
    setShortcuts((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(CANONICAL_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeShortcut = (id: string) => {
    setShortcuts((prev) => {
      const next = prev.filter((item) => item !== id);
      try {
        localStorage.setItem(CANONICAL_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { shortcuts, addShortcut, removeShortcut };
}

export const useStudioShortcuts = useLivexShortcuts;

