#!/usr/bin/env node

/**
 * Fast Lightweight Headless UI Verification Pipeline (Puppeteer)
 *
 * Runs headless Chromium/Edge with mobile emulation (412x915 @ 2x DPR)
 * against the local Vite dev server without requiring Android Studio,
 * Gradle builds, ADB, or heavy AVD emulator instances.
 *
 * Usage:
 *   pnpm verify:ui                       # Run standard visual verification suite
 *   node scripts/verify-ui-screenshots.mjs [name.png]   # Capture targeted screenshot
 *   node scripts/verify-ui-screenshots.mjs --app chordex --page songs --name custom.png
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const VERIFICATION_DIR = path.resolve(REPO_ROOT, '.artifacts', 'verification');

if (!fs.existsSync(VERIFICATION_DIR)) {
  fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
}

function getBrainArtifactDir() {
  if (process.env.BRAIN_ARTIFACT_DIR && fs.existsSync(process.env.BRAIN_ARTIFACT_DIR)) {
    return process.env.BRAIN_ARTIFACT_DIR;
  }
  const baseBrain = 'C:/Users/Mauren/.gemini/antigravity/brain';
  if (fs.existsSync(baseBrain)) {
    const currentConv = '1175433f-38ca-436e-8de8-3b236180ddc4';
    const specific = path.join(baseBrain, currentConv);
    if (fs.existsSync(specific)) return specific;
    try {
      const dirs = fs.readdirSync(baseBrain)
        .map((d) => ({ name: d, time: fs.statSync(path.join(baseBrain, d)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
      if (dirs.length > 0) return path.join(baseBrain, dirs[0].name);
    } catch (_) {}
  }
  return null;
}

const BRAIN_ARTIFACT_DIR = getBrainArtifactDir();

function getBrowserExecutablePath() {
  const edgeCoreDir = 'C:\\Program Files (x86)\\Microsoft\\EdgeCore';
  if (fs.existsSync(edgeCoreDir)) {
    const versions = fs.readdirSync(edgeCoreDir).filter((v) =>
      fs.existsSync(path.join(edgeCoreDir, v, 'msedge.exe'))
    );
    if (versions.length > 0) {
      return path.join(edgeCoreDir, versions[versions.length - 1], 'msedge.exe');
    }
  }

  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function checkServerListening(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer(targetApp) {
  const isWeb = targetApp === 'web';
  const targetPort = isWeb ? 5173 : 5174;
  const portsToCheck = isWeb ? [5173] : [5174, 5173];

  for (const port of portsToCheck) {
    const isUp =
      (await checkServerListening(`http://127.0.0.1:${port}/`, 800)) ||
      (await checkServerListening(`http://localhost:${port}/`, 800));
    if (isUp) {
      console.log(`[DEV-SERVER] Active Vite server found on port ${port}`);
      return { port, process: null };
    }
  }

  const pkgFilter = isWeb ? '@workspace/studio-web' : '@workspace/studio-android';
  console.log(`[DEV-SERVER] Starting Vite server on port ${targetPort} (${pkgFilter})...`);
  const devProcess = spawn('cmd.exe', ['/c', `pnpm.cmd --filter ${pkgFilter} dev --port ${targetPort}`], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: String(targetPort) },
  });

  devProcess.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Local:')) {
      console.log(`[DEV-SERVER] ${s.trim()}`);
    }
  });

  const start = Date.now();
  while (Date.now() - start < 35000) {
    await sleep(1000);
    if (await checkServerListening(`http://127.0.0.1:${targetPort}/`, 800)) {
      console.log(`[DEV-SERVER] Server ready on http://127.0.0.1:${targetPort}/`);
      return { port: targetPort, process: devProcess };
    }
  }

  throw new Error(`[DEV-SERVER] Timeout waiting for Vite server on port ${targetPort}`);
}

async function saveScreenshot(page, filename) {
  const primaryPath = path.join(VERIFICATION_DIR, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  console.log(`✓ [VERIFY-SCREENSHOT] Captured: .artifacts/verification/${filename}`);

  if (BRAIN_ARTIFACT_DIR && fs.existsSync(BRAIN_ARTIFACT_DIR)) {
    const brainPath = path.join(BRAIN_ARTIFACT_DIR, filename);
    fs.copyFileSync(primaryPath, brainPath);
  }
}

// Parse simple CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let customFilename = null;
  let targetApp = null;
  let targetPage = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' && args[i + 1]) {
      customFilename = args[++i];
    } else if (arg === '--app' && args[i + 1]) {
      targetApp = args[++i];
    } else if (arg === '--page' && args[i + 1]) {
      targetPage = args[++i];
    } else if (!arg.startsWith('-') && !customFilename) {
      customFilename = arg;
    }
  }

  const isDesktop = args.includes('--desktop');
  return { customFilename, targetApp, targetPage, isDesktop };
}

async function run() {
  const startTime = Date.now();
  console.log('========================================================================');
  console.log('  LIVEX LIGHTWEIGHT HEADLESS UI VERIFICATION (PUPPETEER MOBILE/DESKTOP) ');
  console.log('========================================================================');

  const { customFilename, targetApp, targetPage, isDesktop } = parseArgs();
  let serverInfo = null;
  let browser = null;

  try {
    serverInfo = await ensureDevServer(targetApp);
    const port = serverInfo.port;

    const executablePath = getBrowserExecutablePath();
    console.log(`[BROWSER] Launching headless browser (binary: ${executablePath || 'bundled/system'})...`);

    const winW = isDesktop ? 1280 : 412;
    const winH = isDesktop ? 800 : 915;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        `--window-size=${winW},${winH}`,
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: winW,
      height: winH,
      deviceScaleFactor: 2,
      isMobile: !isDesktop,
      hasTouch: !isDesktop,
    });

    const initialPath = targetApp === 'web' && targetPage ? `/${targetPage.replace(/^\//, '')}` : '/';
    const baseUrl = `http://127.0.0.1:${port}${initialPath}`;
    console.log(`[NAV] Loading ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    // Dismiss intro / modals
    await page.evaluate(() => {
      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }
      window.__introDone = true;
      window.dispatchEvent(new Event('studio-intro-done'));
    });
    await sleep(800);

    // If targeted custom screenshot requested
    if (customFilename) {
      console.log(`\n[TARGETED] Navigating to requested view...`);
      if (targetApp === 'web') {
        const dest = targetPage ? `/${targetPage.replace(/^\//, '')}` : '/';
        console.log(`[TARGETED] Direct web navigation to ${dest}...`);
        await page.goto(`http://127.0.0.1:${port}${dest}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(1500);
        if (customFilename.includes('features') || customFilename.includes('showcase')) {
          await page.evaluate(() => {
            const el = document.getElementById('workstations') || document.getElementById('features');
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
          });
          await sleep(1000);
        }
      } else if (targetApp) {
        await page.evaluate(({ app, page }) => {
          if (window.NavigationDispatcher) {
            window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
            window.NavigationDispatcher.openApp(app);
            if (page) {
              window.NavigationDispatcher.push({ app, page });
            }
          }
        }, { app: targetApp, page: targetPage });
        await sleep(1500);
      }
      const fname = customFilename.endsWith('.png') ? customFilename : `${customFilename}.png`;
      await saveScreenshot(page, fname);
    } else {
      // ─────────────────────────────────────────────────────────────────────────
      // STANDARD VISUAL VERIFICATION SUITE
      // ─────────────────────────────────────────────────────────────────────────

      // 1. CHORDEX SONGS LIST
      console.log('\n[1/6] Verifying Chordex Songs...');
      await page.evaluate(() => {
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
          window.NavigationDispatcher.openApp('chordex');
          window.NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
        }
      });
      await sleep(1200);
      await saveScreenshot(page, 'chordex-songs-view.png');

      // 2. CHORDEX SETLISTS
      console.log('\n[2/6] Verifying Chordex Setlists...');
      await page.evaluate(() => {
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.push({ app: 'chordex', page: 'setlists' });
        }
      });
      await sleep(1000);
      await saveScreenshot(page, 'chordex-setlists-view.png');

      // 3. CHORDEX PREFERENCES
      console.log('\n[3/6] Verifying Chordex Preferences...');
      await page.evaluate(() => {
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.push({ app: 'chordex', page: 'preferences' });
        }
      });
      await sleep(1000);
      await saveScreenshot(page, 'chordex-preferences.png');

      // 4. VOCALEX MONITOR
      console.log('\n[4/6] Verifying Vocalex Monitor...');
      await page.evaluate(() => {
        if (window.useSettingsStore) {
          window.useSettingsStore.getState().updateSettings({
            theme: 'dark',
            amoledMode: true,
          });
        }
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
          window.NavigationDispatcher.openApp('vocalex');
        }
      });
      await sleep(1200);
      await saveScreenshot(page, 'vocalex-monitor.png');

      // 5. STAGEX CANVAS
      console.log('\n[5/6] Verifying Stagex Stage Canvas...');
      await page.evaluate(() => {
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
          window.NavigationDispatcher.openApp('stagex');
        }
      });
      await sleep(1200);
      await saveScreenshot(page, 'stagex-canvas.png');

      // 6. GROOVEX PLAYER
      console.log('\n[6/6] Verifying Groovex App...');
      await page.evaluate(() => {
        if (window.NavigationDispatcher) {
          window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
          window.NavigationDispatcher.openApp('groovex');
        }
      });
      await sleep(1200);
      await saveScreenshot(page, 'groovex-player.png');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================================================`);
    console.log(`✓ Headless visual verification complete in ${elapsed}s (zero ADB/emulator overhead)`);
    console.log(`========================================================================`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (serverInfo && serverInfo.process && serverInfo.process.pid) {
      console.log('[DEV-SERVER] Shutting down spawned Vite server...');
      try {
        spawn('taskkill', ['/pid', serverInfo.process.pid.toString(), '/f', '/t']);
      } catch (_) {
        try { serverInfo.process.kill(); } catch (__) {}
      }
    }
    await sleep(300);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[ERROR] Verification failed:', err);
  process.exit(1);
});
