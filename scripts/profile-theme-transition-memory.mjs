// scripts/profile-theme-transition-memory.mjs
// Memory and allocation profiling for Android ThemeTransition ink flow transition.

const SCREEN_PROFILES = [
  { name: 'Standard 1080p (FHD+)', width: 1080, height: 2400 },
  { name: 'Premium 1440p (QHD+)', width: 1440, height: 3200 },
  { name: 'Mid-tier 720p (HD+)', width: 720, height: 1600 },
];

function calculateMemory(width, height, bytesPerPixel, offscreenBuffer = true) {
  const pixelCount = width * height;
  const bitmapBytes = pixelCount * bytesPerPixel;
  // CompositingStrategy.Offscreen allocates a matching GPU render target buffer
  const gpuBufferBytes = offscreenBuffer ? pixelCount * 4 : 0;
  const totalBytes = bitmapBytes + gpuBufferBytes;
  return {
    pixelCount,
    bitmapBytes,
    gpuBufferBytes,
    totalBytes,
    bitmapMB: (bitmapBytes / (1024 * 1024)).toFixed(2),
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
  };
}

console.log('========================================================================');
console.log('   ANDROID THEME TRANSITION MEMORY PROFILER: SCREEN RESOLUTIONS');
console.log('========================================================================');

for (const p of SCREEN_PROFILES) {
  const unopt = calculateMemory(p.width, p.height, 4, true);
  const optHalfScale = calculateMemory(Math.round(p.width * 0.5), Math.round(p.height * 0.5), 4, true);

  console.log(`\nScreen: ${p.name} (${p.width}x${p.height})`);
  console.log(`  Unoptimized (1.0x ARGB_8888):`);
  console.log(`    Bitmap: ${unopt.bitmapMB} MB (${unopt.bitmapBytes.toLocaleString()} B)`);
  console.log(`    Offscreen Layer: ${unopt.gpuBufferBytes ? (unopt.gpuBufferBytes / 1048576).toFixed(2) + ' MB' : 'None'}`);
  console.log(`    Total Graphic Memory: ${unopt.totalMB} MB`);
  console.log(`  Optimized (0.5x Scale ARGB_8888):`);
  console.log(`    Bitmap: ${optHalfScale.bitmapMB} MB (${optHalfScale.bitmapBytes.toLocaleString()} B)`);
  console.log(`    Offscreen Layer: ${(optHalfScale.gpuBufferBytes / 1048576).toFixed(2)} MB`);
  console.log(`    Total Graphic Memory: ${optHalfScale.totalMB} MB`);
  console.log(`    Savings: -${((1 - optHalfScale.bitmapBytes / unopt.bitmapBytes) * 100).toFixed(1)}%`);
}

// SCENARIO SIMULATION: 1080p Device
const W = 1080;
const H = 2400;

console.log('\n========================================================================');
console.log('   SCENARIO SIMULATION: 1080p FHD+ (1080 x 2400)');
console.log('========================================================================');

function simulateScenario(name, triggers, unoptimizedAllowsOverlap, unoptimizedLeaksOnCancel) {
  let unoptPeakBytes = 0;
  let unoptActiveBitmaps = 0;
  let unoptSurvivedBitmaps = 0;

  let optPeakBytes = 0;
  let optActiveBitmaps = 0;
  let optSurvivedBitmaps = 0;

  const unoptPerBitmap = W * H * 4;
  const optPerBitmap = Math.round(W * 0.5) * Math.round(H * 0.5) * 4;

  // Simulate Timeline
  const unoptTimeline = [];
  const optTimeline = [];

  for (const t of triggers) {
    if (unoptimizedAllowsOverlap) {
      unoptActiveBitmaps++;
    } else {
      unoptActiveBitmaps = 1;
    }
    const currentUnoptBytes = unoptActiveBitmaps * unoptPerBitmap;
    if (currentUnoptBytes > unoptPeakBytes) unoptPeakBytes = currentUnoptBytes;

    // Optimized: always cancels/recycles prior before starting new
    optActiveBitmaps = 1;
    const currentOptBytes = optActiveBitmaps * optPerBitmap;
    if (currentOptBytes > optPeakBytes) optPeakBytes = currentOptBytes;

    if (t.cancelled && unoptimizedLeaksOnCancel) {
      unoptSurvivedBitmaps++;
      unoptActiveBitmaps--;
    } else if (t.completed) {
      unoptActiveBitmaps = Math.max(0, unoptActiveBitmaps - 1);
    }

    // In opt, cancelled or completed always releases
    optActiveBitmaps = 0;
  }

  return {
    scenario: name,
    unoptPeakMB: (unoptPeakBytes / 1048576).toFixed(2),
    optPeakMB: (optPeakBytes / 1048576).toFixed(2),
    reduction: `${((1 - optPeakBytes / unoptPeakBytes) * 100).toFixed(1)}%`,
    unoptSurvivedBitmaps,
    optSurvivedBitmaps,
  };
}

const scenarios = [
  {
    name: '1. Single Theme Switch',
    triggers: [{ completed: true }],
    unoptAllowsOverlap: false,
    unoptLeaksOnCancel: true,
  },
  {
    name: '2. Ten Consecutive Switches (Sequential)',
    triggers: Array(10).fill({ completed: true }),
    unoptAllowsOverlap: false,
    unoptLeaksOnCancel: true,
  },
  {
    name: '3. Rapid Theme Switching (5 rapid taps within 400ms - Overlapping)',
    triggers: [
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: true },
    ],
    unoptAllowsOverlap: true,
    unoptLeaksOnCancel: true,
  },
  {
    name: '4. Interrupted / Detached Switch (Coroutine cancelled during animation)',
    triggers: [{ cancelled: true }],
    unoptAllowsOverlap: false,
    unoptLeaksOnCancel: true,
  },
  {
    name: '5. Stress Test: 10 Rapid Taps with 3 Early Cancellations',
    triggers: [
      { completed: false },
      { cancelled: true },
      { completed: false },
      { cancelled: true },
      { completed: false },
      { cancelled: true },
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: true },
    ],
    unoptAllowsOverlap: true,
    unoptLeaksOnCancel: true,
  },
];

console.log('\nSCENARIO                                 | UNOPT PEAK  | OPT PEAK   | REDUCTION | LEAKED UNOPT | LEAKED OPT');
console.log('-----------------------------------------|-------------|------------|-----------|--------------|-----------');
for (const s of scenarios) {
  const res = simulateScenario(s.name, s.triggers, s.unoptAllowsOverlap, s.unoptLeaksOnCancel);
  const nameCol = res.scenario.padEnd(40);
  const unoptCol = (res.unoptPeakMB + ' MB').padEnd(12);
  const optCol = (res.optPeakMB + ' MB').padEnd(11);
  const redCol = res.reduction.padEnd(10);
  const leakUnopt = String(res.unoptSurvivedBitmaps).padEnd(13);
  const leakOpt = String(res.optSurvivedBitmaps);
  console.log(`${nameCol} | ${unoptCol}| ${optCol}| ${redCol}| ${leakUnopt}| ${leakOpt}`);
}
console.log('========================================================================\n');
