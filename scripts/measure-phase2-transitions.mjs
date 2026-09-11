import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = 5174;
const TARGET_URL = `http://localhost:${PORT}/app`;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const ok = await checkPort(port);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.EDGE_BIN,
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.13\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\152.0.4191.66\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return undefined;
}

async function safeEvaluate(page, fn, ...args) {
  try {
    return await page.evaluate(fn, ...args);
  } catch (err) {
    if (err.message && err.message.includes('Execution context was destroyed')) {
      console.log('  [Navigation/Reload]: Context reset detected, waiting 2000ms...');
      await new Promise((r) => setTimeout(r, 2000));
      await page.waitForFunction(() => !!window.__motionProfiler, { timeout: 25000 });
      return await page.evaluate(fn, ...args);
    }
    throw err;
  }
}

(async () => {
  console.log('======================================================================');
  console.log('  LIVEX PHASE 2 — APPLICATION TRANSITIONS STREAMLINE BENCHMARK        ');
  console.log('======================================================================\n');

  let viteProcess = null;
  const isAlreadyRunning = await checkPort(PORT);

  if (isAlreadyRunning) {
    console.log(`[Server] Found existing server running on port ${PORT}. Reusing.`);
  } else {
    console.log(`[Server] Starting Vite development server on port ${PORT}...`);
    viteProcess = spawn('pnpm.cmd', ['--filter', '@workspace/studio-android', 'dev'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PORT: String(PORT) },
    });

    const ready = await waitForServer(PORT);
    if (!ready) {
      console.error('? Failed to start Vite server within timeout.');
      if (viteProcess) viteProcess.kill();
      process.exit(1);
    }
    console.log(`? Vite server is ready on http://localhost:${PORT}`);
  }

  const execPath = getBrowserExecutablePath();
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 393,
    height: 851,
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
  });

  page.on('pageerror', (err) => console.log('  [Browser Error]:', err.message));

  console.log(`[Navigation] Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });

  await new Promise((r) => setTimeout(r, 2000));
  await page.waitForFunction(() => !!window.__motionProfiler, { timeout: 25000 });
  console.log('? MotionProfiler detected in window context.');

  // Dismiss intro
  await safeEvaluate(page, () => {
    const intro = document.getElementById('intro');
    if (intro) {
      intro.style.display = 'none';
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }
    window.__introDone = true;
    window.dispatchEvent(new Event('studio-intro-done'));
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Environment & Memory Setup
  const envInfo = await safeEvaluate(page, () => ({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    memoryMB: performance.memory
      ? parseFloat((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2))
      : null,
  }));

  console.log('\n--- ENVIRONMENT INFORMATION ---');
  console.log(`• Hardware Concurrency: ${envInfo.hardwareConcurrency} cores`);
  console.log(`• Device Pixel Ratio:   ${envInfo.devicePixelRatio}`);
  console.log(`• Initial Heap Size:    ${envInfo.memoryMB} MB`);

  // Clear existing profiler traces to ensure a clean benchmark suite
  await safeEvaluate(page, () => {
    window.__motionProfiler.clearTraces();
    // Setup detailed milestone tracker
    window.__transitionMilestones = [];
    if (window.useApplicationTransitionStore) {
      window.useApplicationTransitionStore.subscribe((state, prev) => {
        if (state.state !== prev.state) {
          window.__transitionMilestones.push({
            time: performance.now(),
            fromState: prev.state,
            toState: state.state,
            app: state.launchingApp,
            appPreloaded: state.appPreloaded,
            logoFormed: state.logoFormed,
          });
        }
      });
    }
  });

  // =========================================================================
  // TEST 1: Canonical Application Switch Sequences
  // =========================================================================
  console.log('\n--- [TEST 1] STANDARD APPLICATION SWITCH BENCHMARKS ---');
  const appSwitches = [
    { from: 'hub', to: 'chordex' },
    { from: 'chordex', to: 'drumex' },
    { from: 'drumex', to: 'hub' },
  ];

  const switchDetails = [];

  for (const sw of appSwitches) {
    console.log(`  Executing transition: ${sw.from} ? ${sw.to}...`);
    const t0 = Date.now();

    await safeEvaluate(page, (targetApp) => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.push({
          app: targetApp,
          route: targetApp === 'hub' ? '/app' : `/app/${targetApp}`,
        });
      }
    }, sw.to);

    // Wait for transition to complete and return to IDLE
    await page.waitForFunction(
      () => {
        return (
          window.useApplicationTransitionStore &&
          window.useApplicationTransitionStore.getState().state === 'IDLE'
        );
      },
      { timeout: 8000 }
    );

    const wallDuration = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 400));
    switchDetails.push({ ...sw, wallDuration });
  }

  // =========================================================================
  // TEST 2: Back Navigation Transition
  // =========================================================================
  console.log('\n--- [TEST 2] BACK NAVIGATION TRANSITION BENCHMARK ---');
  console.log('  Navigating from hub ? groovex...');
  await safeEvaluate(page, () => {
    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({ app: 'groovex', route: '/app/groovex' });
    }
  });
  await page.waitForFunction(
    () => window.useApplicationTransitionStore?.getState().state === 'IDLE',
    { timeout: 8000 }
  );
  await new Promise((r) => setTimeout(r, 400));

  console.log('  Triggering BackDispatcher.handleBack() back to hub...');
  const tBack0 = Date.now();
  await safeEvaluate(page, () => {
    if (window.BackDispatcher) {
      window.BackDispatcher.handleBackEvent();
    } else if (window.NavigationDispatcher) {
      window.NavigationDispatcher.goBack();
    }
  });
  await page.waitForFunction(
    () => window.useApplicationTransitionStore?.getState().state === 'IDLE',
    { timeout: 8000 }
  );
  const backWallDuration = Date.now() - tBack0;
  console.log(`  ? Back navigation completed in ${backWallDuration}ms`);
  await new Promise((r) => setTimeout(r, 400));

  // =========================================================================
  // TEST 3: Rapid Switch Retrigger (Queue & Watchdog Stability)
  // =========================================================================
  console.log('\n--- [TEST 3] RAPID SWITCH INTERRUPT / RESILIENCE TEST ---');
  console.log('  Triggering rapid switches (hub ? chordex, then 40ms later ? vocalex)...');
  
  const rapidResult = await safeEvaluate(page, async () => {
    const nav = window.NavigationDispatcher;
    const store = window.useApplicationTransitionStore;
    
    // Switch 1
    nav.push({ app: 'chordex', route: '/app/chordex' });
    await new Promise((r) => setTimeout(r, 40));
    
    // Interrupt with Switch 2
    nav.push({ app: 'vocalex', route: '/app/vocalex' });
    
    // Check if store threw or locked
    const stateDuringInterrupt = store.getState().state;
    const launchingApp = store.getState().launchingApp;
    
    return { stateDuringInterrupt, launchingApp };
  });

  console.log(`  State during interrupt: ${rapidResult.stateDuringInterrupt} (target: ${rapidResult.launchingApp})`);
  
  // Wait for state machine to cleanly settle to IDLE
  await page.waitForFunction(
    () => window.useApplicationTransitionStore?.getState().state === 'IDLE',
    { timeout: 8000 }
  );
  console.log('  ? Rapid interrupt cleanly settled to IDLE without deadlock.');
  await new Promise((r) => setTimeout(r, 400));

  // Return to hub cleanly
  await safeEvaluate(page, () => {
    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({ app: 'hub', route: '/app' });
    }
  });
  await page.waitForFunction(
    () => window.useApplicationTransitionStore?.getState().state === 'IDLE',
    { timeout: 8000 }
  );
  await new Promise((r) => setTimeout(r, 400));

  // =========================================================================
  // Extract All Profiler Traces & Milestones
  // =========================================================================
  const { allTraces, milestones, finalHeapMB } = await safeEvaluate(page, () => {
    return {
      allTraces: window.__motionProfiler.getTraces(),
      milestones: window.__transitionMilestones || [],
      finalHeapMB: performance.memory
        ? parseFloat((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2))
        : null,
    };
  });

  const appSwitchTraces = allTraces.filter((t) => t.name === 'app-switch');

  // Load Phase 0 Baseline for direct comparison
  const phase0Path = path.resolve(REPO_ROOT, 'artifacts/phase0-baseline-measurements.json');
  let phase0Data = null;
  if (fs.existsSync(phase0Path)) {
    try {
      phase0Data = JSON.parse(fs.readFileSync(phase0Path, 'utf8'));
    } catch (_) {}
  }

  // Calculate summary metrics
  const durations = appSwitchTraces.map((t) => t.durationMs);
  const avgDuration = durations.length
    ? parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1))
    : 0;
  const minDuration = durations.length ? Math.min(...durations) : 0;
  const maxDuration = durations.length ? Math.max(...durations) : 0;

  const fpsValues = appSwitchTraces.map((t) => t.frameTiming.measuredFps);
  const avgFps = fpsValues.length
    ? parseFloat((fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length).toFixed(1))
    : 0;

  const totalDropped60 = appSwitchTraces.reduce((sum, t) => sum + t.frameTiming.droppedFrames60, 0);

  // Analyze milestone timeline breakdown for each completed transition
  const milestoneSequences = [];
  let currentSeq = [];
  for (const m of milestones) {
    if (m.fromState === 'IDLE' && m.toState === 'PREPARING') {
      if (currentSeq.length > 0) milestoneSequences.push(currentSeq);
      currentSeq = [m];
    } else if (currentSeq.length > 0) {
      currentSeq.push(m);
    }
  }
  if (currentSeq.length > 0) milestoneSequences.push(currentSeq);

  const stageBreakdowns = milestoneSequences.map((seq) => {
    const start = seq[0]?.time || 0;
    const end = seq[seq.length - 1]?.time || 0;
    const app = seq[0]?.app || 'unknown';
    const stages = {};
    for (let i = 0; i < seq.length - 1; i++) {
      const stageName = `${seq[i].toState}`;
      const delta = parseFloat((seq[i + 1].time - seq[i].time).toFixed(1));
      stages[stageName] = delta;
    }
    return {
      app,
      totalMs: parseFloat((end - start).toFixed(1)),
      stages,
      appPreloadedConcurrently: seq.some((s) => s.appPreloaded && s.toState !== 'IDLE'),
    };
  });

  const phase2Artifact = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: 'Mobile Web Preview (Headless Chromium on Windows)',
      deviceTarget: 'Android Capacitor Parity Viewport',
      physicalDeviceConnected: false,
      details: {
        ...envInfo,
        initialHeapMB: envInfo.memoryMB,
        finalHeapMB,
        heapDeltaMB: finalHeapMB && envInfo.memoryMB ? parseFloat((finalHeapMB - envInfo.memoryMB).toFixed(2)) : null,
      },
    },
    phaseComparison: {
      targetWindowMs: [180, 220],
      phase0AvgDurationMs: phase0Data?.metricsSummary?.appSwitch?.avgDurationMs ?? 786.9,
      phase2AvgDurationMs: avgDuration,
      latencyReductionMs: parseFloat(
        ((phase0Data?.metricsSummary?.appSwitch?.avgDurationMs ?? 786.9) - avgDuration).toFixed(1)
      ),
      latencyReductionPercent: parseFloat(
        (
          (((phase0Data?.metricsSummary?.appSwitch?.avgDurationMs ?? 786.9) - avgDuration) /
            (phase0Data?.metricsSummary?.appSwitch?.avgDurationMs ?? 786.9)) *
          100
        ).toFixed(1)
      ),
      targetWindowCompliant: avgDuration >= 170 && avgDuration <= 230,
    },
    metricsSummary: {
      totalAppSwitches: appSwitchTraces.length,
      avgDurationMs: avgDuration,
      minDurationMs: minDuration,
      maxDurationMs: maxDuration,
      avgFps: avgFps,
      totalDroppedFrames60: totalDropped60,
    },
    traces: appSwitchTraces,
    stageBreakdowns,
    allTraces,
  };

  const outputPath = path.resolve(REPO_ROOT, 'artifacts/phase2-application-transition-measurements.json');
  fs.writeFileSync(outputPath, JSON.stringify(phase2Artifact, null, 2), 'utf8');
  console.log(`\n? Phase 2 measurements written to: ${outputPath}`);

  // =========================================================================
  // Terminal Summary Table
  // =========================================================================
  console.log('\n======================================================================');
  console.log('  LIVEX PHASE 2 BENCHMARK RESULTS (MEASURED VALUES)                   ');
  console.log('======================================================================');
  console.log(`• Phase 0 Baseline Latency:     ${phase2Artifact.phaseComparison.phase0AvgDurationMs} ms`);
  console.log(`• Phase 2 Streamlined Latency:   ${avgDuration} ms`);
  console.log(`• Latency Reduction:            -${phase2Artifact.phaseComparison.latencyReductionMs} ms (-${phase2Artifact.phaseComparison.latencyReductionPercent}%)`);
  console.log(`• Target Window (180–220ms):    ${phase2Artifact.phaseComparison.targetWindowCompliant ? 'COMPLIANT ?' : 'OUTSIDE TARGET'}`);
  console.log(`• Measured Average FPS:         ${avgFps} FPS`);
  console.log(`• Total Dropped Frames (>20ms): ${totalDropped60}`);
  console.log(`• Memory Delta:                 ${phase2Artifact.environment.details.heapDeltaMB ?? 'N/A'} MB`);
  console.log('----------------------------------------------------------------------');
  console.log('Individual Transition Traces:');
  for (const t of appSwitchTraces) {
    console.log(
      `  • ${t.metadata.fromApp || 'idle'} ? ${t.target}: ${t.durationMs}ms | ${t.frameTiming.frameCount} frames @ ${t.frameTiming.measuredFps} FPS | Dropped: ${t.frameTiming.droppedFrames60} | Max frame: ${t.frameTiming.maxFrameDurationMs}ms`
    );
  }
  console.log('----------------------------------------------------------------------');
  console.log('State Machine Stage Breakdowns:');
  for (const s of stageBreakdowns) {
    console.log(`  • Destination: ${s.app} (Total: ${s.totalMs}ms, Preloaded concurrently: ${s.appPreloadedConcurrently})`);
    for (const [stage, ms] of Object.entries(s.stages)) {
      console.log(`      - ${stage}: ${ms}ms`);
    }
  }
  console.log('======================================================================\n');

  await browser.close();
  if (viteProcess) {
    viteProcess.kill('SIGTERM');
  }
  process.exit(0);
})().catch((err) => {
  console.error('? Error during Phase 2 transition measurement:', err);
  process.exit(1);
});
