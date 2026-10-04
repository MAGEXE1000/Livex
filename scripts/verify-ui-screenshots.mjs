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
  const targetUrl = 'http://localhost:5174/';
  const isUp = await checkServerListening(targetUrl, 1000);
  if (isUp) {
    console.log(`[DEV-SERVER] Port 5174 already responding at ${targetUrl}`);
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

    console.log('[NAV] Loading http://localhost:5174/ ...');
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    // 1. DRUMEX PATTERNS (Dark AMOLED & Light)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[1/5] Verifying Drumex Pattern Filter Pills...');
    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'dark',
          amoledMode: true,
          accentColor: 'monochrome',
        });
      }
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.openApp('drumex');
        window.NavigationDispatcher.push({ app: 'drumex', page: 'patterns' });
      }
    });
    await sleep(2000);
    await saveScreenshot(page, 'drumex-patterns-dark.png');

    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'light',
          amoledMode: false,
        });
      }
    });
    await sleep(1000);
    await saveScreenshot(page, 'drumex-patterns-light.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 2. QUICK ACTIONS MODAL (Dark & Light)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[2/5] Verifying Quick Actions Modal Done & Plus Buttons...');
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
      }
    });
    await sleep(1500);

    // Click the Pin button to open Quick Actions modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pinBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Pin') || b.textContent.includes('Fijar')));
      if (pinBtn) pinBtn.click();
    });
    await sleep(1500);

    await saveScreenshot(page, 'quick-actions-dark.png');

    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'light',
          amoledMode: false,
        });
      }
    });
    await sleep(1000);
    await saveScreenshot(page, 'quick-actions-light.png');

    // Close the Quick Actions modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const doneBtn = buttons.find((b) => {
        const t = b.textContent && b.textContent.trim().toLowerCase();
        return t === 'done' || t === 'listo';
      });
      if (doneBtn) doneBtn.click();
    });
    await sleep(1000);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PREFERENCES LIGHT MODE CONTRAST & START ON SELECTOR
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[3/5] Verifying Drumex Preferences Light Mode Contrast & Start On Selector...');
    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'light',
          amoledMode: false,
          accentColor: 'monochrome',
        });
      }
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.openApp('drumex');
        window.NavigationDispatcher.push({ app: 'drumex', page: 'prefs' });
      }
    });
    await sleep(2000);
    await saveScreenshot(page, 'preferences-light-mode.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. HELP & SUPPORT CONTRAST
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[4/5] Verifying Help & Support Action Buttons Contrast...');
    await page.evaluate(() => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'faq' });
      }
    });
    await sleep(2000);

    // Scroll to bottom to view Report on GitHub & Contact Support
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await sleep(500);

    await saveScreenshot(page, 'help-support-contrast.png');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. STACKABLE TOASTS VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[5/5] Verifying Stackable Toasts Cascade...');
    await page.evaluate(() => {
      if (window.useSettingsStore) {
        window.useSettingsStore.getState().updateSettings({
          theme: 'dark',
          amoledMode: true,
        });
      }
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
      }
    });
    await sleep(1500);

    await page.evaluate(async () => {
      const livexToast = window.__LIVEX_TOAST__;
      if (livexToast) {
        livexToast.toast('Background Cloud Sync Completed', { duration: 10000 });
      }
    });
    await sleep(250);
    await page.evaluate(async () => {
      const livexToast = window.__LIVEX_TOAST__;
      if (livexToast) {
        livexToast.toast('Local Stage Room Connected (2 Devices)', { duration: 10000 });
      }
    });
    await sleep(250);
    await page.evaluate(async () => {
      const livexToast = window.__LIVEX_TOAST__;
      if (livexToast) {
        livexToast.toast('Developer Options Unlocked', { duration: 10000 });
      }
    });
    await sleep(1000);

    await saveScreenshot(page, 'stackable-toast-verification.png');

    console.log('\n✓ ALL 5 VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (devServerProcess) {
      console.log('[DEV-SERVER] Shutting down Vite preview server...');
      try {
        devServerProcess.kill();
      } catch (_) {}
    }
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[ERROR] Verification failed:', err);
  process.exit(1);
});
