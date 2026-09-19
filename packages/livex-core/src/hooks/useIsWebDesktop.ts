import { Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';

function checkIsWebDesktop(): boolean {
  if (Capacitor.isNativePlatform()) return false;
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_APP_TARGET === 'android'
  ) {
    return false;
  }
  if (
    typeof document !== 'undefined' &&
    (document.querySelector('[data-mobile-preview]') ||
      document.querySelector('.studio-mobile-shell') ||
      document.body.classList.contains('mobile-preview-mode'))
  ) {
    return false;
  }
  return typeof window !== 'undefined' && window.innerWidth >= 768;
}

export function useIsWebDesktop() {
  const [isDesktop, setIsDesktop] = useState(checkIsWebDesktop);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (
      typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_APP_TARGET === 'android'
    ) {
      return;
    }

    const handleResize = () => {
      setIsDesktop(checkIsWebDesktop());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
}
