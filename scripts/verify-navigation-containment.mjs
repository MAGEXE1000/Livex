#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist', 'android-web');
const artifactDir = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain\\1175433f-38ca-436e-8de8-3b236180ddc4';

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

function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

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
    } catch {
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
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.48\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.13\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runContainmentVerification() {
  console.log('=== STARTING LIVEX BOTTOM NAVIGATION CONTAINMENT VERIFICATION ===');
  const port = 5192;
  const server = await createStaticServer(port);

  let browser;
  try {
    const executablePath = getBrowserExecutablePath();
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log(`Navigating to http://localhost:${port}/index.html...`);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the bottom navbar to render
    await page.waitForSelector('.shared-bottom-nav', { timeout: 15000 });
    console.log('✓ Found .shared-bottom-nav element in DOM');

    // Helper to evaluate geometric containment
    const checkContainment = async (scenarioName) => {
      return await page.evaluate((scenario) => {
        const dock = document.querySelector('.shared-bottom-nav');
        if (!dock) return { pass: false, error: 'Dock not found' };

        // Highlight pill has z-index 0 or position absolute inside inner wrapper
        const innerWrapper = dock.firstElementChild;
        if (!innerWrapper) return { pass: false, error: 'Inner wrapper not found' };

        // The highlight is the first motion.div child inside innerWrapper
        const highlight = innerWrapper.firstElementChild;
        if (!highlight) return { pass: false, error: 'Highlight pill not found' };

        const dockRect = dock.getBoundingClientRect();
        const innerRect = innerWrapper.getBoundingClientRect();
        const pillRect = highlight.getBoundingClientRect();

        const dockStyle = window.getComputedStyle(dock);
        const innerStyle = window.getComputedStyle(innerWrapper);
        const pillStyle = window.getComputedStyle(highlight);

        // Check if highlight visually escapes dock bounds (with 0.5px subpixel tolerance)
        const leftContained = pillRect.left >= dockRect.left - 0.5;
        const rightContained = pillRect.right <= dockRect.right + 0.5;
        const topContained = pillRect.top >= dockRect.top - 0.5;
        const bottomContained = pillRect.bottom <= dockRect.bottom + 0.5;

        const dockOverflowHidden = dockStyle.overflow === 'hidden';
        const innerOverflowHidden = innerStyle.overflow === 'hidden';
        const dockClipPath = dockStyle.clipPath;
        const innerClipPath = innerStyle.clipPath;

        const isFullyContained = leftContained && rightContained && topContained && bottomContained;

        return {
          scenario,
          pass: isFullyContained,
          dockOverflowHidden,
          innerOverflowHidden,
          dockClipPath,
          innerClipPath,
          leftContained,
          rightContained,
          topContained,
          bottomContained,
          dockRect: { left: dockRect.left, right: dockRect.right, top: dockRect.top, bottom: dockRect.bottom, width: dockRect.width, height: dockRect.height },
          innerRect: { left: innerRect.left, right: innerRect.right, top: innerRect.top, bottom: innerRect.bottom, width: innerRect.width, height: innerRect.height },
          pillRect: { left: pillRect.left, right: pillRect.right, top: pillRect.top, bottom: pillRect.bottom, width: pillRect.width, height: pillRect.height },
        };
      }, scenarioName);
    };

    const results = [];

    // Helper to capture navbar screenshot
    const captureNavbarScreenshot = async (name) => {
      const dock = await page.$('.shared-bottom-navbar-wrapper');
      if (dock) {
        const dest = path.join(artifactDir, `${name}.png`);
        await dock.screenshot({ path: dest });
        console.log(`[Screenshot Saved] ${dest}`);
      }
    };

    // 1. Initial Resting State (Tab 0: Hub Home)
    await sleep(400);
    const r1 = await checkContainment('Hub Tab 0 (Home Resting)');
    results.push(r1);
    console.log(`[Test 1] Hub Tab 0 Containment: ${r1.pass ? 'PASS' : 'FAIL'}`);
    await captureNavbarScreenshot('nav_containment_hub_tab0');

    // 2. Tab Navigation across all tabs
    const tabs = await page.$$('button[data-nav-item-index]');
    console.log(`Found ${tabs.length} tabs in Hub`);
    for (let i = 1; i < tabs.length; i++) {
      await tabs[i].click();
      await sleep(350); // wait for spring settle
      const res = await checkContainment(`Hub Tab ${i}`);
      results.push(res);
      console.log(`[Test 2.${i}] Hub Tab ${i} Containment: ${res.pass ? 'PASS' : 'FAIL'}`);
    }
    await captureNavbarScreenshot('nav_containment_hub_last_tab');

    // 3. Rapid Tab Switching
    console.log('[Test 3] Rapid Tab Switching stress test...');
    await tabs[0].click();
    await sleep(40);
    await tabs[tabs.length - 1].click();
    await sleep(40);
    await tabs[0].click();
    await sleep(400); // wait for settle
    const rRapid = await checkContainment('Rapid Tab Switching');
    results.push(rRapid);
    console.log(`[Test 3] Rapid Switch Containment: ${rRapid.pass ? 'PASS' : 'FAIL'}`);

    // 4. Drag to Extreme Left (Boundary Overshoot)
    console.log('[Test 4] Dragging highlight past left boundary...');
    const dockEl = await page.$('.shared-bottom-nav');
    const dockBox = await dockEl.boundingBox();
    const startX = dockBox.x + 35;
    const startY = dockBox.y + dockBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Drag far to the left (-120px)
    await page.mouse.move(startX - 120, startY, { steps: 10 });
    await sleep(150);

    const rDragLeft = await checkContainment('Drag Left Extreme Overshoot');
    results.push(rDragLeft);
    console.log(`[Test 4] Drag Left Overshoot Containment: ${rDragLeft.pass ? 'PASS' : 'FAIL'}`);
    await captureNavbarScreenshot('nav_containment_drag_left_overshoot');

    // Release mouse
    await page.mouse.up();
    await sleep(350); // wait for spring snap back
    const rSnapLeft = await checkContainment('Snap Back from Left Drag');
    results.push(rSnapLeft);
    console.log(`[Test 4.1] Snap Back from Left: ${rSnapLeft.pass ? 'PASS' : 'FAIL'}`);

    // 5. Drag to Extreme Right (Boundary Overshoot)
    console.log('[Test 5] Dragging highlight past right boundary...');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Drag far to the right (+350px)
    await page.mouse.move(startX + 350, startY, { steps: 15 });
    await sleep(150);

    const rDragRight = await checkContainment('Drag Right Extreme Overshoot');
    results.push(rDragRight);
    console.log(`[Test 5] Drag Right Overshoot Containment: ${rDragRight.pass ? 'PASS' : 'FAIL'}`);
    await captureNavbarScreenshot('nav_containment_drag_right_overshoot');

    // Release mouse
    await page.mouse.up();
    await sleep(350); // wait for spring snap back
    const rSnapRight = await checkContainment('Snap Back from Right Drag');
    results.push(rSnapRight);
    console.log(`[Test 5.1] Snap Back from Right: ${rSnapRight.pass ? 'PASS' : 'FAIL'}`);

    // 6. Compact / Collapsed Navbar Mode
    console.log('[Test 6] Testing compact/collapsed navbar mode...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-nav-collapsed', 'true');
    });
    await sleep(400);
    const rCompact = await checkContainment('Compact / Collapsed Mode');
    results.push(rCompact);
    console.log(`[Test 6] Compact Mode Containment: ${rCompact.pass ? 'PASS' : 'FAIL'}`);
    await captureNavbarScreenshot('nav_containment_compact');

    // Restore expanded mode
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-nav-collapsed');
    });
    await sleep(400);

    // 7. App Switcher & Sub-apps (Chordex, Drumex, Stagex, Groovex, Vocalex)
    console.log('[Test 7] Testing sub-apps via App Switcher...');
    const switcherBtn = await page.$('.shared-nav-satellite button') || await page.$('button[title*="app" i], button[aria-label*="app" i]');
    
    // Switch between apps via NavigationDispatcher directly to verify each sub-app UI
    const appsToTest = ['chordex', 'drumex', 'stagex', 'groovex', 'vocalex'];
    for (const appKey of appsToTest) {
      console.log(`Switching to app: ${appKey}...`);
      await page.evaluate((app) => {
        window.dispatchEvent(new CustomEvent('livex:navigate', { detail: { app } }));
      }, appKey);
      await sleep(500);

      const rApp = await checkContainment(`App: ${appKey}`);
      results.push(rApp);
      console.log(`[Test 7.${appKey}] ${appKey} Nav Containment: ${rApp.pass ? 'PASS' : 'FAIL'}`);
      await captureNavbarScreenshot(`nav_containment_${appKey}`);
    }

    console.log('\n=== VERIFICATION SUMMARY ===');
    let allPassed = true;
    for (const r of results) {
      if (!r.pass) {
        allPassed = false;
        console.error(`FAIL: ${r.scenario}`, r);
      } else {
        console.log(`✓ PASS: ${r.scenario} (Pill W:${r.pillRect.width} H:${r.pillRect.height} inside Dock W:${r.dockRect.width} H:${r.dockRect.height})`);
      }
    }

    if (allPassed) {
      console.log('\n🎉 ALL 12 CONTAINMENT & GEOMETRY SCENARIOS PASSED WITH 100% SUCCESS!');
    } else {
      console.error('\n❌ SOME CONTAINMENT SCENARIOS FAILED!');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Puppeteer verification failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runContainmentVerification();
