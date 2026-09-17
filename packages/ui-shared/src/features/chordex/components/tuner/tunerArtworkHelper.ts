import { useState, useEffect } from 'react';

const transparentArtworkCache = new Map<string, string>();

/**
 * Hook to resolve tuner artwork (headstock and drum photos).
 * In Dark / AMOLED modes, returns the original image asset directly.
 * In Light mode, automatically removes outer black photographic studio backgrounds
 * via seamless edge flood-fill so the artwork blends naturally into the Light theme surface.
 */
export function useTunerArtwork(originalSrc: string, isLight: boolean): string {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => {
    if (!isLight || typeof window === 'undefined') return originalSrc;
    return transparentArtworkCache.get(originalSrc) || originalSrc;
  });

  useEffect(() => {
    if (!isLight || typeof window === 'undefined') {
      setResolvedSrc(originalSrc);
      return;
    }

    if (transparentArtworkCache.has(originalSrc)) {
      setResolvedSrc(transparentArtworkCache.get(originalSrc)!);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        // BFS flood fill starting from outer edge corners to remove exterior dark backdrop
        const visited = new Uint8Array(w * h);
        const queue: number[] = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
        for (const idx of queue) visited[idx] = 1;

        while (queue.length > 0) {
          const p = queue.pop()!;
          const x = p % w;
          const y = Math.floor(p / w);
          const idx = p * 4;

          d[idx + 3] = 0; // Transparent

          const neighbors: number[] = [];
          if (x > 0) neighbors.push(p - 1);
          if (x < w - 1) neighbors.push(p + 1);
          if (y > 0) neighbors.push(p - w);
          if (y < h - 1) neighbors.push(p + w);

          for (const n of neighbors) {
            if (!visited[n]) {
              visited[n] = 1;
              const nIdx = n * 4;
              // Pixel threshold: studio black background (< 25 in R, G, and B)
              if (d[nIdx] < 25 && d[nIdx + 1] < 25 && d[nIdx + 2] < 25) {
                queue.push(n);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');
        transparentArtworkCache.set(originalSrc, transparentDataUrl);

        if (isMounted) {
          setResolvedSrc(transparentDataUrl);
        }
      } catch (_) {
        // In case of any canvas security exception, gracefully keep original source
        if (isMounted) {
          setResolvedSrc(originalSrc);
        }
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setResolvedSrc(originalSrc);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [originalSrc, isLight]);

  return resolvedSrc;
}
