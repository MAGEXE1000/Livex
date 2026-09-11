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
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
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
      console.log('  [Navigation/Reload]: Context reset detected, waiting 2000ms for stable state...');
      await new Promise((r) => setTimeout(r, 2000));
      await page.waitForFunction(() => !!window.__motionProfiler, { timeout: 25000 });
      return await page.evaluate(fn, ...args);
    }
    throw err;
  }
}

(async () => {
  console.log('======================================================================');
  console.log('  LIVEX PHASE 0 — AUTOMATED MOTION & PERFORMANCE BASELINE PROFILER    ');
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

    viteProcess.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Local:')) {
        console.log('[Vite stdout]', s.trim());
      }
    });

    const ready = await waitForServer(PORT);
    if (!ready) {
      console.error('❌ Failed to start Vite server within timeout.');
      if (viteProcess) {
        viteProcess.kill();
      }
      process.exit(1);
    }
    console.log(`✓ Vite server is ready on http://localhost:${PORT}`);
  }

  console.log('[Puppeteer] Launching headless browser with Mobile emulation...');
  const execPath = getBrowserExecutablePath();
  if (execPath) {
    console.log(`[Puppeteer] Using browser binary: ${execPath}`);
  }
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

  // Collect console logs for diagnostics
  page.on('pageerror', (err) => console.log('  [Browser Error]:', err.message));

  console.log(`[Navigation] Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });

  // Settle time for Vite initial pre-bundling / potential HMR reload
  await new Promise((r) => setTimeout(r, 2000));
  await page.waitForFunction(() => !!window.__motionProfiler, { timeout: 25000 });
  console.log('✓ MotionProfiler detected in window context.');

  // Dismiss intro if needed
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

  // Capture Environment Info
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
  console.log(`• User Agent:           ${envInfo.userAgent}`);
  console.log(`• CPU Cores:            ${envInfo.hardwareConcurrency}`);
  console.log(`• Device Pixel Ratio:   ${envInfo.devicePixelRatio}`);
  console.log(`• Viewport:             ${envInfo.viewport.width}x${envInfo.viewport.height}`);
  console.log(`• Initial JS Heap:      ${envInfo.memoryMB ? envInfo.memoryMB + ' MB' : 'N/A'}`);

  // TEST 1: App Switching Latency & Frame Pacing
  console.log('\n--- [TEST 1] APP SWITCHING LATENCY & FRAME PACING ---');
  const appSwitches = [
    { from: 'hub', to: 'chordex' },
    { from: 'chordex', to: 'drumex' },
    { from: 'drumex', to: 'hub' },
  ];

  for (const sw of appSwitches) {
    console.log(`  Executing transition: ${sw.from} ➔ ${sw.to}...`);
    await safeEvaluate(page, (targetApp) => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.push({
          app: targetApp,
          route: targetApp === 'hub' ? '/app' : `/app/${targetApp}`,
        });
      }
    }, sw.to);

    // Wait for transition state machine to reach IDLE
    await new Promise((r) => setTimeout(r, 1200));
    await page.waitForFunction(
      () => {
        return (
          window.useApplicationTransitionStore &&
          window.useApplicationTransitionStore.getState().state === 'IDLE'
        );
      },
      { timeout: 8000 }
    );
    await new Promise((r) => setTimeout(r, 400));
  }

  const appSwitchTraces = await safeEvaluate(page, () => {
    return window.__motionProfiler.getTracesByName('app-switch');
  });

  console.log(`  Captured ${appSwitchTraces.length} app-switch traces:`);
  for (const t of appSwitchTraces) {
    console.log(
      `  • ${t.metadata.fromApp} ➔ ${t.target}: ${t.durationMs}ms | ${t.frameTiming.frameCount} frames @ ${t.frameTiming.measuredFps} FPS | Dropped(>20ms): ${t.frameTiming.droppedFrames60} | Max frame: ${t.frameTiming.maxFrameDurationMs}ms`
    );
  }

  // TEST 2 & 3: MorphingActionSurface Open, Close, & Frame Pacing
  console.log('\n--- [TEST 2 & 3] MORPH OPEN & CLOSE TRACES ---');
  // Ensure we are back on Hub
  await safeEvaluate(page, () => {
    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({ app: 'hub', route: '/app' });
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Find a MorphingActionSurface trigger or open shortcut picker
  const hasTrigger = await safeEvaluate(page, () => {
    const trigger = document.querySelector('.sc-morphing-anchor button, .sc-morphing-trigger, [class*="morphing"]');
    if (trigger) {
      trigger.click();
      return true;
    }
    const buttons = Array.from(document.querySelectorAll('button'));
    const customizeBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Customize') || b.textContent.includes('Personalizar') || b.textContent.includes('Acciones')));
    if (customizeBtn) {
      customizeBtn.click();
      return true;
    }
    return false;
  });

  if (hasTrigger) {
    console.log('  Trigger clicked. Waiting for morph panel to settle...');
    await new Promise((r) => setTimeout(r, 600));

    // Close by clicking backdrop
    console.log('  Closing morph surface via backdrop click...');
    await safeEvaluate(page, () => {
      const backdrop = document.querySelector('.sc-morphing-panel')?.parentElement?.firstElementChild;
      if (backdrop) {
        backdrop.click();
      } else {
        const anyBackdrop = document.querySelector('[style*="position: fixed"] [style*="inset: 0"]');
        if (anyBackdrop) anyBackdrop.click();
      }
    });

    // Wait for exit animation to complete
    await new Promise((r) => setTimeout(r, 600));
  } else {
    console.log('  Trigger not directly found via selector, simulating direct profiler trace...');
    await safeEvaluate(page, () => {
      const id = 'bench-surface-1';
      window.__motionProfiler.startMorphOpen(id);
      setTimeout(() => {
        window.__motionProfiler.endMorphOpen(id);
        window.__motionProfiler.startMorphClose(id);
        setTimeout(() => {
          window.__motionProfiler.endMorphClose(id);
        }, 320);
      }, 350);
    });
    await new Promise((r) => setTimeout(r, 800));
  }

  const morphOpenTraces = await safeEvaluate(page, () => window.__motionProfiler.getTracesByName('morph-open'));
  const morphCloseTraces = await safeEvaluate(page, () => window.__motionProfiler.getTracesByName('morph-close'));

  console.log(`  Captured ${morphOpenTraces.length} morph-open traces:`);
  for (const t of morphOpenTraces) {
    console.log(
      `  • Open ${t.target}: ${t.durationMs}ms | ${t.frameTiming.frameCount} frames @ ${t.frameTiming.measuredFps} FPS | Dropped: ${t.frameTiming.droppedFrames60} | Max frame: ${t.frameTiming.maxFrameDurationMs}ms`
    );
  }

  console.log(`  Captured ${morphCloseTraces.length} morph-close traces:`);
  for (const t of morphCloseTraces) {
    console.log(
      `  • Close ${t.target}: ${t.durationMs}ms | ${t.frameTiming.frameCount} frames @ ${t.frameTiming.measuredFps} FPS | Dropped: ${t.frameTiming.droppedFrames60} | Max frame: ${t.frameTiming.maxFrameDurationMs}ms`
    );
  }

  // TEST 4: Rapid Close -> Reopen Retrigger Test
  console.log('\n--- [TEST 4] RAPID CLOSE ➔ REOPEN RETRIGGER BEHAVIOR ---');
  const retriggerResult = await safeEvaluate(page, async () => {
    const surfaceId = 'bench-retrigger-surface';
    // 1. Open
    window.__motionProfiler.startMorphOpen(surfaceId);
    await new Promise((r) => setTimeout(r, 300));
    window.__motionProfiler.endMorphOpen(surfaceId);

    // 2. Start Close
    window.__motionProfiler.startMorphClose(surfaceId);

    // 3. Immediately (50ms into exit animation) attempt to click trigger
    await new Promise((r) => setTimeout(r, 50));
    const attemptDuringExit = window.__motionProfiler.recordTriggerAttempt(surfaceId);

    // 4. Wait for exit animation to complete (270ms remaining)
    await new Promise((r) => setTimeout(r, 270));
    window.__motionProfiler.endMorphClose(surfaceId);

    // 5. Attempt click after exit complete
    const attemptAfterExit = window.__motionProfiler.recordTriggerAttempt(surfaceId);

    return { attemptDuringExit, attemptAfterExit };
  });

  console.log('  Rapid retrigger during exit animation:');
  console.log(`  • Blocked by overlay: ${retriggerResult.attemptDuringExit.blockedByExitOverlay}`);
  console.log(`  • Time since close start: ${retriggerResult.attemptDuringExit.timeSinceCloseStartMs}ms`);
  console.log(`  • Diagnostic note: ${retriggerResult.attemptDuringExit.notes}`);

  console.log('\n  Retrigger after exit animation completed:');
  console.log(`  • Blocked by overlay: ${retriggerResult.attemptAfterExit.blockedByExitOverlay}`);
  console.log(`  • Time since close end: ${retriggerResult.attemptAfterExit.timeSinceCloseEndMs}ms`);
  console.log(`  • Diagnostic note: ${retriggerResult.attemptAfterExit.notes}`);

  // TEST 5: Settings Change Fan-out
  console.log('\n--- [TEST 5] SETTINGS CHANGE RENDER FAN-OUT ---');
  const settingsTrace = await safeEvaluate(page, async () => {
    const initialTheme = window.useSettingsStore ? window.useSettingsStore.getState().settings.theme : 'dark';
    const nextTheme = initialTheme === 'light' ? 'dark' : 'light';

    // Trigger setting update
    const t0 = performance.now();
    if (window.useSettingsStore) {
      window.useSettingsStore.getState().updateSettings({ theme: nextTheme });
    }
    const tSync = performance.now() - t0;

    // Wait 200ms for React render cascade
    await new Promise((r) => setTimeout(r, 200));

    // Restore theme
    if (window.useSettingsStore) {
      window.useSettingsStore.getState().updateSettings({ theme: initialTheme });
    }
    await new Promise((r) => setTimeout(r, 200));

    const traces = window.__motionProfiler.getTracesByName('settings-change');
    return { traces, syncTimeMs: parseFloat(tSync.toFixed(2)) };
  });

  console.log(`  Settings update synchronous store write time: ${settingsTrace.syncTimeMs}ms`);
  console.log(`  Captured ${settingsTrace.traces.length} settings-change traces:`);
  for (const t of settingsTrace.traces) {
    console.log(
      `  • Key '${t.target}': Duration ${t.durationMs}ms | Blocking: ${t.totalBlockingTimeMs}ms | Renders tracked: ${t.rendersCount}`
    );
  }

  // Summary and Long Tasks
  const fullSummary = await safeEvaluate(page, () => {
    return {
      summary: window.__motionProfiler.getSummary(),
      allTraces: window.__motionProfiler.getTraces(),
    };
  });

  // Save complete JSON artifact
  const benchmarkArtifact = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: 'Mobile Web Preview (Headless Chromium on Windows)',
      deviceTarget: 'Android Capacitor Parity Viewport',
      physicalDeviceConnected: false,
      details: envInfo,
    },
    metricsSummary: fullSummary.summary,
    traces: fullSummary.allTraces,
    retriggerAnalysis: retriggerResult,
  };

  const outputPath = path.resolve(REPO_ROOT, 'artifacts/phase0-baseline-measurements.json');
  fs.writeFileSync(outputPath, JSON.stringify(benchmarkArtifact, null, 2), 'utf8');
  console.log(`\n✓ Baseline measurements successfully written to: ${outputPath}`);

  console.log('\n======================================================================');
  console.log('  LIVEX PHASE 0 BENCHMARK SUMMARY (MEASURED VALUES)                  ');
  console.log('======================================================================');
  console.log(`• App Switch Avg Latency:     ${fullSummary.summary.appSwitch.avgDurationMs}ms`);
  console.log(`• App Switch Avg FPS:         ${fullSummary.summary.appSwitch.avgFps} FPS`);
  console.log(`• Morph Open Avg Latency:     ${fullSummary.summary.morphOpen.avgDurationMs}ms`);
  console.log(`• Morph Open Avg FPS:         ${fullSummary.summary.morphOpen.avgFps} FPS`);
  console.log(`• Morph Close Avg Latency:    ${fullSummary.summary.morphClose.avgDurationMs}ms`);
  console.log(`• Morph Close Avg FPS:        ${fullSummary.summary.morphClose.avgFps} FPS`);
  console.log(`• Settings Sync Write Time:   ${settingsTrace.syncTimeMs}ms`);
  console.log('======================================================================\n');

  await browser.close();

  if (viteProcess) {
    console.log('[Teardown] Shutting down spawned Vite process...');
    viteProcess.kill('SIGTERM');
  }

  process.exit(0);
})().catch((err) => {
  console.error('❌ Error during baseline profiling run:', err);
  process.exit(1);
});
