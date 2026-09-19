// Profiling script for Liquid Glass rendering pipeline
import { performance } from 'perf_hooks';

function smoothStep(a, b, t) {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function roundedRectSDF(x, y, w, h, r) {
  const qx = Math.abs(x) - w + r;
  const qy = Math.abs(y) - h + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function fragment(uvX, uvY) {
  const ix = uvX - 0.5;
  const iy = uvY - 0.5;
  const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
  const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
  const scaled = smoothStep(0, 1, displacement);
  return { x: ix * scaled + 0.5, y: iy * scaled + 0.5 };
}

// Current implementation: Uncached generation
function generateUncached(width, height) {
  const t0 = performance.now();
  const w = width, h = height;
  const data = new Uint8ClampedArray(w * h * 4);
  let maxScale = 0;
  const raw = [];

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    const pos = fragment(x / w, y / h);
    const dx = pos.x * w - x;
    const dy = pos.y * h - y;
    if (Math.abs(dx) > maxScale) maxScale = Math.abs(dx);
    if (Math.abs(dy) > maxScale) maxScale = Math.abs(dy);
    raw.push(dx, dy);
  }

  maxScale *= 0.5;
  if (maxScale === 0) maxScale = 1;

  let idx = 0;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (raw[idx++] / maxScale + 0.5) * 255;
    data[i + 1] = (raw[idx++] / maxScale + 0.5) * 255;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  const t1 = performance.now();
  return { timeMs: t1 - t0, pixels: w * h, rawLength: raw.length, maxScale };
}

// Optimized implementation with TypedArrays & Memoized Cache
const displacementCache = new Map();

function generateOptimized(width, height) {
  const key = `${width}x${height}`;
  if (displacementCache.has(key)) {
    const t0 = performance.now();
    const cached = displacementCache.get(key);
    const t1 = performance.now();
    return { timeMs: t1 - t0, hit: true, maxScale: cached.maxScale };
  }

  const t0 = performance.now();
  const w = width, h = height;
  const totalPixels = w * h;
  const data = new Uint8ClampedArray(totalPixels * 4);
  const raw = new Float32Array(totalPixels * 2);
  let maxScale = 0;

  let rawIdx = 0;
  for (let py = 0; py < h; py++) {
    const v = py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const pos = fragment(u, v);
      const dx = pos.x * w - px;
      const dy = pos.y * h - py;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > maxScale) maxScale = absDx;
      if (absDy > maxScale) maxScale = absDy;
      raw[rawIdx++] = dx;
      raw[rawIdx++] = dy;
    }
  }

  maxScale *= 0.5;
  if (maxScale === 0) maxScale = 1;

  const invScale = 1 / maxScale;
  let dataIdx = 0;
  let rIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    data[dataIdx] = (raw[rIdx++] * invScale + 0.5) * 255;
    data[dataIdx + 1] = (raw[rIdx++] * invScale + 0.5) * 255;
    data[dataIdx + 2] = 0;
    data[dataIdx + 3] = 255;
    dataIdx += 4;
  }

  const result = { maxScale, data };
  displacementCache.set(key, result);
  const t1 = performance.now();
  return { timeMs: t1 - t0, hit: false, maxScale };
}

console.log('=== LIQUID GLASS PERFORMANCE DIAGNOSTIC ===\n');

const testSizes = [
  { name: 'Pill / Small Target', w: 200, h: 60 },
  { name: 'Mobile Bottom Nav', w: 360, h: 64 },
  { name: 'Tablet Bottom Nav', w: 600, h: 72 },
  { name: 'Desktop Banner / Large Target', w: 800, h: 80 },
];

for (const { name, w, h } of testSizes) {
  console.log(`--- Scenario: ${name} (${w}x${h} = ${w * h} px) ---`);
  
  // Measure unoptimized (5 iterations)
  const uncachedTimes = [];
  for (let i = 0; i < 5; i++) {
    uncachedTimes.push(generateUncached(w, h).timeMs);
  }
  const avgUncached = uncachedTimes.reduce((a, b) => a + b) / uncachedTimes.length;
  console.log(`Uncached execution time (average of 5): ${avgUncached.toFixed(2)} ms`);

  // Measure optimized 1st run (cold)
  const optCold = generateOptimized(w, h);
  console.log(`Optimized 1st execution (cold, typed array): ${optCold.timeMs.toFixed(2)} ms`);

  // Measure optimized cached runs (warm)
  const optWarmTimes = [];
  for (let i = 0; i < 5; i++) {
    optWarmTimes.push(generateOptimized(w, h).timeMs);
  }
  const avgOptWarm = optWarmTimes.reduce((a, b) => a + b) / optWarmTimes.length;
  console.log(`Optimized cached execution (average of 5): ${avgOptWarm.toFixed(4)} ms`);
  console.log(`Speedup on subsequent access: ${(avgUncached / avgOptWarm).toFixed(0)}x faster\n`);
}
