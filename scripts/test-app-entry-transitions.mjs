#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist', 'android-web');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// 1. Static file server for dist/android-web
function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    // Prevent directory traversal attacks (CWE-22)
    const safePath = path.normalize(reqUrl).replace(/^(\.\.[/\\])+/, '');
    const resolvedPath = path.resolve(distDir, '.' + path.sep + safePath);

    let filePath = resolvedPath;
    if (!resolvedPath.startsWith(distDir) || !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[Static Server] Serving dist/android-web on http://localhost:${port}`);
      resolve(server);
    });
  });
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.EDGE_BIN,
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.48\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.32\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.13\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return undefined;
}

async function run() {
  const PORT = 5199;
  const server = await createStaticServer(PORT);
  const targetUrl = `http://localhost:${PORT}/`;

  console.log('[Puppeteer] Launching mobile emulator for Android transition validation...');
  const execPath = getBrowserExecutablePath();
  if (execPath) {
    console.log(`[Puppeteer] Using browser binary: ${execPath}`);
  }
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 393,
    height: 851,
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
  });

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(msg.text()));
  page.on('pageerror', (err) => console.error('[Page Error]:', err.message));

  console.log(`[Test] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Wait for React and Hub to initialize
  await page.waitForFunction(
    () => typeof window !== 'undefined' && (window.__studioStartupComplete || document.querySelector('[data-livex-hub-root]') || document.querySelector('.sc-subapp-wrapper') || document.body),
    { timeout: 10000 }
  );
  await new Promise((r) => setTimeout(r, 2000));

  console.log('✓ Initial page loaded successfully.');

  const apps = ['chordex', 'drumex', 'stagex', 'groovex', 'vocalex'];
  const themes = ['dark', 'amoled', 'light'];
  const testResults = [];

  for (const app of apps) {
    for (const theme of themes) {
      console.log(`\n================================================================`);
      console.log(`Testing App Transition: ${app.toUpperCase()} [Theme: ${theme.toUpperCase()}]`);
      console.log(`================================================================`);

      // 1. Configure Theme
      await page.evaluate((th) => {
        const isAmoled = th === 'amoled';
        const themeMode = th === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', themeMode);
        if (isAmoled) {
          document.documentElement.setAttribute('data-amoled', 'true');
        } else {
          document.documentElement.removeAttribute('data-amoled');
        }
        if (window.__useSettingsStore) {
          window.__useSettingsStore.getState().updateSettings({
            theme: themeMode,
            amoledMode: isAmoled,
          });
        }
      }, theme);
      await new Promise((r) => setTimeout(r, 100));

      // 2. Trigger Navigation to target app via NavigationDispatcher or card click
      const transitionTriggered = await page.evaluate((targetApp) => {
        if (window.__studioNavigationDispatcher) {
          window.__studioNavigationDispatcher.push({ app: targetApp });
          return true;
        }
        const card = document.querySelector(`button[data-app="${targetApp}"]`) || document.querySelector(`[data-app="${targetApp}"]`);
        if (card) {
          card.click();
          return true;
        }
        return false;
      }, app);

      // Check transition overlay immediately (50-80ms into transition)
      await new Promise((r) => setTimeout(r, 60));

      const overlayDetails = await page.evaluate(() => {
        const overlay = document.querySelector('[data-livex-app-transition="app-identity-transition"]');
        if (!overlay) return null;

        const svg = overlay.querySelector('svg');
        const textNodes = Array.from(overlay.querySelectorAll('span, p, h1, h2, h3, h4, div'))
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t.length > 0);

        let svgRect = null;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          svgRect = { width: Math.round(rect.width), height: Math.round(rect.height) };
        }

        const bg = window.getComputedStyle(overlay).backgroundColor;

        return {
          found: true,
          hasSvg: !!svg,
          svgRect,
          textContents: textNodes,
          backgroundColor: bg,
        };
      });

      console.log(`• Transition Overlay Detected: ${overlayDetails?.found ?? false}`);
      if (overlayDetails) {
        console.log(`• Logo SVG Dimensions: ${overlayDetails.svgRect?.width}x${overlayDetails.svgRect?.height}px (Target ~104px)`);
        console.log(`• Text Nodes Found: [${overlayDetails.textContents.join(', ')}] (Expected: NONE)`);
        console.log(`• Background Color: ${overlayDetails.backgroundColor}`);

        const hasNoText = overlayDetails.textContents.length === 0;
        const hasLargeLogo = overlayDetails.svgRect && overlayDetails.svgRect.width >= 70 && overlayDetails.svgRect.height >= 70;

        testResults.push({
          app,
          theme,
          passed: overlayDetails.found && hasNoText && hasLargeLogo,
          hasNoText,
          hasLargeLogo,
          svgDimensions: overlayDetails.svgRect,
        });
      } else {
        console.warn(`⚠ Overlay missed or completed before evaluation for ${app}`);
        testResults.push({
          app,
          theme,
          passed: false,
          note: 'Overlay was not detected',
        });
      }

      // Wait for transition to complete and destination app to stabilize
      const overlayGone = await page
        .waitForFunction(
          () => !document.querySelector('[data-livex-app-transition="app-identity-transition"]'),
          { timeout: 1500 }
        )
        .then(() => true)
        .catch(() => false);
      console.log(`• Overlay dismissed cleanly: ${overlayGone}`);

      // Navigate back to Hub
      await page.evaluate(() => {
        if (window.__studioNavigationDispatcher) {
          window.__studioNavigationDispatcher.push({ app: 'hub' });
        }
      });
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 3. Rapid repeated navigation test
  console.log('\n================================================================');
  console.log('Testing Rapid Repeated Navigation (Race Condition Guard)');
  console.log('================================================================');
  for (let i = 0; i < 6; i++) {
    const targetApp = apps[i % apps.length];
    await page.evaluate((target) => {
      if (window.__studioNavigationDispatcher) {
        window.__studioNavigationDispatcher.push({ app: target });
      }
    }, targetApp);
    await new Promise((r) => setTimeout(r, 80)); // rapid interruption
  }

  await new Promise((r) => setTimeout(r, 800));

  const finalCheck = await page.evaluate(() => {
    const overlays = document.querySelectorAll('[data-livex-app-transition="app-identity-transition"]');
    return {
      overlayCount: overlays.length,
    };
  });

  console.log(`• Final Overlays remaining after rapid navigation: ${finalCheck.overlayCount} (Expected: 0)`);
  const rapidTestPass = finalCheck.overlayCount === 0;

  await browser.close();
  server.close();

  console.log('\n================================================================');
  console.log('FINAL VALIDATION SUMMARY');
  console.log('================================================================');
  let allPass = rapidTestPass;
  for (const r of testResults) {
    console.log(`• ${r.app.toUpperCase()} (${r.theme}): ${r.passed ? '✓ PASS' : '✗ FAIL'} ${r.svgDimensions ? `[${r.svgDimensions.width}x${r.svgDimensions.height}px, no text: ${r.hasNoText}]` : ''}`);
    if (!r.passed) allPass = false;
  }
  console.log(`• Rapid Navigation Guard: ${rapidTestPass ? '✓ PASS' : '✗ FAIL'}`);
  console.log('================================================================\n');

  if (!allPass) {
    process.exit(1);
  }
  console.log('ALL APP TRANSITION TESTS PASSED CLEANLY!');
}

run().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
