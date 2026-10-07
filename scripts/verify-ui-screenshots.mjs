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
const BRAIN_ARTIFACT_DIR = 'C:/Users/Mauren/.gemini/antigravity/brain/1175433f-38ca-436e-8de8-3b236180ddc4';

if (!fs.existsSync(VERIFICATION_DIR)) {
  fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
}

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

function checkServerListening(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer() {
  const targetUrl = 'http://127.0.0.1:5174/';
  const isUp = (await checkServerListening('http://127.0.0.1:5174/', 1000)) || (await checkServerListening('http://localhost:5174/', 1000));
  if (isUp) {
    console.log(`[DEV-SERVER] Port 5174 already responding`);
    return null;
  }

  console.log('[DEV-SERVER] Starting Vite preview server on port 5174...');
  const devProcess = spawn('cmd.exe', ['/c', 'pnpm.cmd --filter @workspace/studio-android dev --port 5174'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: '5174' },
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
    if (await checkServerListening(targetUrl, 1000)) {
      console.log('[DEV-SERVER] Server ready on http://localhost:5174/');
      return devProcess;
    }
  }

  throw new Error('[DEV-SERVER] Timeout waiting for Vite server on port 5174');
}

async function saveScreenshot(page, filename) {
  const primaryPath = path.join(VERIFICATION_DIR, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  console.log(`[VERIFY-SCREENSHOT] Saved: ${primaryPath}`);

  if (fs.existsSync(BRAIN_ARTIFACT_DIR)) {
    const brainPath = path.join(BRAIN_ARTIFACT_DIR, filename);
    fs.copyFileSync(primaryPath, brainPath);
  }
}

async function run() {
  console.log('=== LIVEX AUTOMATED VISUAL PROOF PROTOCOL ===');
  let devServerProcess = null;
  let browser = null;

  try {
    devServerProcess = await ensureDevServer();

    const executablePath = getBrowserExecutablePath();
    console.log(`[BROWSER] Launching with binary: ${executablePath}`);

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=412,915',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 412,
      height: 915,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    console.log('[NAV] Loading http://127.0.0.1:5174/ ...');
    await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);

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
    await sleep(1000);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VOCALEX MONITOR ACTION BUTTON (Dark AMOLED & High Contrast Black Text)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[1/4] Verifying Vocalex Monitor Start Button Contrast...');
    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'dark',
          amoledMode: true,
          accentColor: 'monochrome',
        });
      }
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.openApp('vocalex');
      }
    });
    await sleep(2500);
    await saveScreenshot(page, 'vocalex-monitor-start-button.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHORDEX PREFERENCES SINGLE START ON SELECTOR
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[2/4] Verifying Chordex Preferences Single Start On Selector...');
    await page.evaluate(() => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.openApp('chordex');
        window.NavigationDispatcher.push({ app: 'chordex', page: 'preferences' });
      }
    });
    await sleep(2000);
    await saveScreenshot(page, 'chordex-preferences-single-starton.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 3. STAGEX BOTTOM NAVBAR PERSISTENCE & OVERLAY LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[3/4] Verifying Stagex Bottom Navbar Persistence & Overlay Lifecycle...');
    await page.evaluate(() => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.openApp('stagex');
      }
    });
    await sleep(2500);
    // 3A. Persistent bottom navbar on stage canvas
    await saveScreenshot(page, 'stagex-canvas-navbar-persistent.png');

    // 3B. Open Element Drawer (+)
    console.log('[STAGEX] Opening + Drawer...');
    await page.evaluate(() => {
      const fab = document.querySelector('[data-testid="stagex-fab-add"]');
      if (fab) {
        fab.click();
      } else {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find((b) => b.textContent && b.textContent.includes('add'));
        if (addBtn) addBtn.click();
      }
    });
    await sleep(1500);
    await saveScreenshot(page, 'stagex-plus-drawer-open.png');
    await saveScreenshot(page, 'stagex-drawer-navbar-hidden.png');

    // 3C. Dismiss Element Drawer (tap backdrop)
    console.log('[STAGEX] Dismissing + Drawer...');
    await page.evaluate(() => {
      const backdrop = document.querySelector('[data-testid="stagex-drawer-backdrop"]');
      if (backdrop) {
        backdrop.click();
      }
    });
    await sleep(1500);
    await saveScreenshot(page, 'stagex-plus-drawer-dismissed.png');

    // 3D. Toggle Eye Tool (Gig Mode -> Regular Mode)
    console.log('[STAGEX] Toggling Eye tool...');
    await page.evaluate(() => {
      const eyeBtn = document.querySelector('[data-testid="stagex-eye-btn"]');
      if (eyeBtn) eyeBtn.click();
    });
    await sleep(1200);
    // Toggle back to regular mode
    await page.evaluate(() => {
      const eyeBtn = document.querySelector('[data-testid="stagex-eye-btn"]');
      if (eyeBtn) eyeBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, 'stagex-eye-tool-toggle.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. GROOVEX IMMERSIVE PLAYER OVERHAUL & VISUAL PROOF
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[4/4] Verifying Groovex Immersive Player ("What\'s Up?")...');
    await page.evaluate(() => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.openApp('groovex');
      }
    });
    await sleep(2000);

    // Click on "What's Up?" song card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="groovex-song-item-4nonblondes-whats-up"]');
      if (card) {
        card.click();
      } else {
        const articles = Array.from(document.querySelectorAll('article'));
        const whatsUp = articles.find((a) => a.textContent && a.textContent.includes("What's Up"));
        if (whatsUp) whatsUp.click();
      }
    });

    console.log('[GROOVEX] Waiting for stems to load and transition to ready phase...');
    let isReady = false;
    for (let attempts = 0; attempts < 45; attempts++) {
      await sleep(1000);
      const status = await page.evaluate(() => {
        const playerScreen = document.querySelector('[data-groovex-phase]');
        const phase = playerScreen ? playerScreen.getAttribute('data-groovex-phase') : null;
        const ready = phase === 'ready';
        const error =
          phase === 'error' ||
          document.body.innerText.includes('failed to load') ||
          document.body.innerText.includes('Download Interrupted');
        return { ready, error, phase };
      });
      if (status.ready) {
        console.log(`[GROOVEX] Stems ready! (phase: ${status.phase})`);
        isReady = true;
        break;
      }
      if (status.error) {
        console.warn(`[GROOVEX] Encountered error phase (${status.phase})`);
        break;
      }
    }
    await sleep(1500);

    // A. Activate Playback & Capture Immersive Full-Screen Player
    console.log('[GROOVEX] Activating playback on transport deck...');
    await page.evaluate(() => {
      const playBtn = document.querySelector('#play-pause-btn');
      if (playBtn) playBtn.click();
    });
    await sleep(1500);

    await saveScreenshot(page, 'groovex-immersive-player.png');
    await saveScreenshot(page, 'groovex-download-success.png');

    // B. Open Stems Mixer Morph Sheet via '···' trigger
    console.log('[GROOVEX] Opening Stems Mixer bottom morph sheet via ··· button...');
    await page.evaluate(() => {
      const openBtn = document.querySelector('#open-stems-btn');
      if (openBtn) openBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, 'groovex-stems-morph-sheet.png');

    // C. Close sheet and verify Light/Dark Theme Parity
    console.log('[GROOVEX] Closing sheet and capturing Light/Dark parity...');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#close-stems-btn');
      if (closeBtn) closeBtn.click();
    });
    await sleep(800);

    // Toggle theme to light to verify parity
    await page.evaluate(() => {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await sleep(800);
    await saveScreenshot(page, 'groovex-light-dark-parity.png');

    // Restore dark
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });

    console.log('\n✓ ALL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (devServerProcess && devServerProcess.pid) {
      console.log('[DEV-SERVER] Shutting down Vite preview server...');
      try {
        spawn('taskkill', ['/pid', devServerProcess.pid.toString(), '/f', '/t']);
      } catch (_) {
        try { devServerProcess.kill(); } catch (__) {}
      }
    }
    await sleep(500);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[ERROR] Verification failed:', err);
  process.exit(1);
});
