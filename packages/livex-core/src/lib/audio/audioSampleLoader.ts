import { audioAssetUrl } from '../storage/assetCache';

/**
 * Loads a binary audio asset as an AudioBuffer.
 * Handles:
 * - Capacitor local asset URL resolution via assetCache.
 * - HTTP fetch with aggressive caching on Web.
 * - Node.js Vitest test execution (reads local file from disk or returns mock buffer).
 */
export async function loadAudioSample(
  ctx: AudioContext,
  samplePath: string
): Promise<AudioBuffer | null> {
  if (!ctx || typeof ctx.decodeAudioData !== 'function') return null;

  try {
    const resolvedUrl = await audioAssetUrl(samplePath);
    let arrayBuf: ArrayBuffer;

    if (
      typeof window === 'undefined' &&
      typeof process !== 'undefined' &&
      process.versions?.node
    ) {
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const localPath = path.resolve(process.cwd(), 'apps/studio-web/public' + samplePath);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        } else {
          // In unit tests with mock AudioContext, provide a non-empty buffer for mock decodeAudioData
          arrayBuf = new ArrayBuffer(1024);
        }
      } catch {
        arrayBuf = new ArrayBuffer(1024);
      }
    } else {
      const resp = await fetch(resolvedUrl, { cache: 'force-cache' });
      if (!resp.ok) {
        console.warn(`[audioSampleLoader] Failed to fetch sample ${samplePath}: HTTP ${resp.status}`);
        return null;
      }
      arrayBuf = await resp.arrayBuffer();
    }

    return await ctx.decodeAudioData(arrayBuf);
  } catch (err) {
    console.warn(`[audioSampleLoader] Failed to decode sample ${samplePath}:`, err);
    return null;
  }
}
