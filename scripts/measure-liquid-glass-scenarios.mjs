// Scenarios Profiling Script for Liquid Glass Optimization
import { performance } from 'perf_hooks';

// Math helpers
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

// -------------------------------------------------------------
// UNOPTIMIZED PIPELINE
// -------------------------------------------------------------
class UnoptimizedPipeline {
  constructor() {
    this.generations = 0;
    this.totalCpuTimeMs = 0;
    this.bridgeCalls = 0;
    this.domMeasurements = 0;
    this.styleWrites = 0;
  }

  regenerateMap(width, height) {
    if (width <= 0 || height <= 0) return;
    this.generations++;
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
    // Simulate canvas.toDataURL() overhead (typically 3-8ms depending on size)
    const mockDataUrlOverhead = 0.0001 * (w * h);
    const t1 = performance.now();
    this.totalCpuTimeMs += (t1 - t0) + mockDataUrlOverhead;
  }

  onResize(rawWidth, rawHeight, currentShaderW, currentShaderH) {
    this.domMeasurements++; // host.getBoundingClientRect()
    if (rawWidth !== currentShaderW || rawHeight !== currentShaderH) {
      this.regenerateMap(Math.round(rawWidth), Math.round(rawHeight));
    }
  }

  onScroll(deltaY, steps = 10) {
    let shine = 50;
    let target = Math.max(10, Math.min(90, 50 + deltaY * 0.4));
    for (let i = 0; i < steps; i++) {
      shine += (target - shine) * 0.18;
      this.styleWrites++; // el.style.setProperty('--lg-shine-x', ...)
    }
  }

  findScroller(ancestorCount = 8) {
    for (let i = 0; i < ancestorCount; i++) {
      this.domMeasurements += 3; // getComputedStyle + scrollHeight + clientHeight
    }
  }

  updateBridge(left, top, width, height, visible, theme, cornerRadius) {
    this.bridgeCalls++;
  }
}

// -------------------------------------------------------------
// OPTIMIZED PIPELINE
// -------------------------------------------------------------
class OptimizedPipeline {
  constructor() {
    this.generations = 0;
    this.totalCpuTimeMs = 0;
    this.bridgeCalls = 0;
    this.domMeasurements = 0;
    this.styleWrites = 0;
    this.cache = new Map();
    this.scrollerCache = new WeakMap();
    this.lastBridgeState = null;
  }

  regenerateMap(width, height) {
    if (width <= 0 || height <= 0) return;
    const key = `${width}x${height}`;
    if (this.cache.has(key)) {
      // Instant cache hit!
      return;
    }

    this.generations++;
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

    const mockDataUrlOverhead = 0.0001 * (w * h);
    const t1 = performance.now();
    this.totalCpuTimeMs += (t1 - t0) + mockDataUrlOverhead;
    this.cache.set(key, { maxScale, dataUrl: 'mockDataUrl' });
  }

  onResize(entryW, entryH, currentShaderW, currentShaderH) {
    // Read from ResizeObserverEntry without getBoundingClientRect() forced reflow
    const w = Math.round(entryW);
    const h = Math.round(entryH);
    if (w <= 0 || h <= 0 || (w === currentShaderW && h === currentShaderH)) {
      return; // Dimensions unchanged after rounding!
    }
    this.regenerateMap(w, h);
  }

  onScroll(deltaY, steps = 10) {
    let shine = 50;
    let lastWritten = 50;
    let target = Math.max(10, Math.min(90, 50 + deltaY * 0.4));
    for (let i = 0; i < steps; i++) {
      shine += (target - shine) * 0.18;
      // Write only on meaningful threshold delta (>= 0.2%)
      if (Math.abs(shine - lastWritten) >= 0.2) {
        this.styleWrites++;
        lastWritten = shine;
      }
    }
  }

  findScroller(elKey, ancestorCount = 8) {
    if (this.scrollerCache.has(elKey)) {
      return this.scrollerCache.get(elKey);
    }
    for (let i = 0; i < ancestorCount; i++) {
      this.domMeasurements += 3;
    }
    const mockScroller = {};
    this.scrollerCache.set(elKey, mockScroller);
    return mockScroller;
  }

  updateBridge(left, top, width, height, visible, theme, cornerRadius) {
    if (
      this.lastBridgeState &&
      this.lastBridgeState.visible === visible &&
      this.lastBridgeState.theme === theme &&
      Math.abs(this.lastBridgeState.left - left) < 0.5 &&
      Math.abs(this.lastBridgeState.top - top) < 0.5 &&
      Math.abs(this.lastBridgeState.width - width) < 0.5 &&
      Math.abs(this.lastBridgeState.height - height) < 0.5 &&
      Math.abs(this.lastBridgeState.cornerRadius - cornerRadius) < 0.5
    ) {
      return; // Deduplicated!
    }
    this.lastBridgeState = { left, top, width, height, visible, theme, cornerRadius };
    this.bridgeCalls++;
  }
}

// -------------------------------------------------------------
// BENCHMARK EXECUTION
// -------------------------------------------------------------
console.log('===============================================================');
console.log('     LIQUID GLASS 6-SCENARIO COMPREHENSIVE BENCHMARK');
console.log('===============================================================\n');

const unopt = new UnoptimizedPipeline();
const opt = new OptimizedPipeline();
const mockEl = {};

// Scenario 1: Cold Startup (BottomNav + UpdateIndicator tagged)
unopt.regenerateMap(360, 64);
unopt.regenerateMap(200, 60);
unopt.findScroller(8);
unopt.updateBridge(16, 700, 360, 64, true, 'dark', 24);

opt.regenerateMap(360, 64);
opt.regenerateMap(200, 60);
opt.findScroller(mockEl, 8);
opt.updateBridge(16, 700, 360, 64, true, 'dark', 24);

// Scenario 2: Bottom Navigation Interaction (Switching tabs 5 times, re-tagging)
for (let i = 0; i < 5; i++) {
  unopt.regenerateMap(360, 64);
  unopt.updateBridge(16, 700, 360, 64, true, 'dark', 24);

  opt.regenerateMap(360, 64);
  opt.updateBridge(16, 700, 360, 64, true, 'dark', 24);
}

// Scenario 3: Scrolling (10 scroll events with rAF steps)
for (let i = 0; i < 10; i++) {
  unopt.onScroll(15 * (i % 2 === 0 ? 1 : -1));
  opt.onScroll(15 * (i % 2 === 0 ? 1 : -1));
}

// Scenario 4: Resize (Subpixel jitter: 359.8 -> 360.2 -> 360 -> 360.1, then actual resize to 400)
const resizeEvents = [
  { w: 359.8, h: 64 },
  { w: 360.2, h: 64 },
  { w: 360.0, h: 64 },
  { w: 360.1, h: 64 },
  { w: 400.0, h: 64 },
];
let uCurrentW = 360, uCurrentH = 64;
let oCurrentW = 360, oCurrentH = 64;

for (const e of resizeEvents) {
  unopt.onResize(e.w, e.h, uCurrentW, uCurrentH);
  uCurrentW = Math.round(e.w);
  uCurrentH = Math.round(e.h);

  opt.onResize(e.w, e.h, oCurrentW, oCurrentH);
  oCurrentW = Math.round(e.w);
  oCurrentH = Math.round(e.h);
}

// Scenario 5: Theme Change (Dark -> Light -> Dark)
for (let i = 0; i < 2; i++) {
  unopt.findScroller(8);
  unopt.regenerateMap(360, 64);
  unopt.updateBridge(16, 700, 360, 64, true, i % 2 === 0 ? 'light' : 'dark', 24);

  opt.findScroller(mockEl, 8);
  opt.regenerateMap(360, 64);
  opt.updateBridge(16, 700, 360, 64, true, i % 2 === 0 ? 'light' : 'dark', 24);
}

// Scenario 6: Rapid Navigation (Fast route transitions between Chordex, Drumex, Hub)
for (let i = 0; i < 10; i++) {
  unopt.regenerateMap(360, 64);
  unopt.findScroller(8);
  unopt.updateBridge(16, 700, 360, 64, true, 'dark', 24);

  opt.regenerateMap(360, 64);
  opt.findScroller(mockEl, 8);
  opt.updateBridge(16, 700, 360, 64, true, 'dark', 24);
}

console.log('METRIC                         | UNOPTIMIZED       | OPTIMIZED         | REDUCTION');
console.log('-------------------------------|-------------------|-------------------|-----------');
console.log(`Displacement Map Generations   | ${String(unopt.generations).padEnd(17)} | ${String(opt.generations).padEnd(17)} | -${(((unopt.generations - opt.generations) / unopt.generations) * 100).toFixed(1)}%`);
console.log(`Total CPU Compute Time (ms)    | ${String(unopt.totalCpuTimeMs.toFixed(2)).padEnd(17)} | ${String(opt.totalCpuTimeMs.toFixed(2)).padEnd(17)} | -${(((unopt.totalCpuTimeMs - opt.totalCpuTimeMs) / unopt.totalCpuTimeMs) * 100).toFixed(1)}%`);
console.log(`DOM Measurements / Reflows     | ${String(unopt.domMeasurements).padEnd(17)} | ${String(opt.domMeasurements).padEnd(17)} | -${(((unopt.domMeasurements - opt.domMeasurements) / unopt.domMeasurements) * 100).toFixed(1)}%`);
console.log(`Style Mutations (Shine X)      | ${String(unopt.styleWrites).padEnd(17)} | ${String(opt.styleWrites).padEnd(17)} | -${(((unopt.styleWrites - opt.styleWrites) / unopt.styleWrites) * 100).toFixed(1)}%`);
console.log(`Native Bridge Calls            | ${String(unopt.bridgeCalls).padEnd(17)} | ${String(opt.bridgeCalls).padEnd(17)} | -${(((unopt.bridgeCalls - opt.bridgeCalls) / unopt.bridgeCalls) * 100).toFixed(1)}%`);
console.log('===============================================================\n');
