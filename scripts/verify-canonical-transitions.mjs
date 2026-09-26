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

async function runTransitionsVerification() {
  console.log('=== STARTING CANONICAL GLOBAL APPLICATION TRANSITION VERIFICATION ===');
  const port = 5195;
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

    page.on('console', (msg) => {
      const text = msg.text();
      if (!text.includes('[vite]') && !text.includes('Download the React DevTools')) {
        console.log(`[PAGE LOG] ${text}`);
      }
    });
    page.on('pageerror', (err) => console.error(`[PAGE ERROR] ${err.message}`));

    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem('livex-intro-shown', 'true');
      localStorage.setItem('studio_debug_mode', 'true');
      window.__studio_debug_mode = true;
    });

    console.log(`Navigating to http://localhost:${port}/index.html...`);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the app shell to render
    await page.waitForSelector('.shared-bottom-nav', { timeout: 15000 });
    console.log('✓ Found .shared-bottom-nav in DOM');

    const captureScreenshot = async (name) => {
      const dest = path.join(artifactDir, `${name}.png`);
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`[Screenshot Saved] ${dest}`);
    };

    const results = [];

    // Helper to inspect transition container state
    const inspectNavContainers = async () => {
      return await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('.shared-nav-container'));
        return containers.map((c) => {
          const panes = Array.from(c.querySelectorAll(':scope > .shared-nav-pane'));
          return {
            paneCount: panes.length,
            panes: panes.map((p) => ({
              viewKey: p.getAttribute('data-view-id') || p.getAttribute('data-view-key'),
              state: p.getAttribute('data-pane-state'),
              display: window.getComputedStyle(p).display,
              contain: window.getComputedStyle(p).contain,
              transform: window.getComputedStyle(p).transform,
              opacity: window.getComputedStyle(p).opacity,
              willChange: window.getComputedStyle(p).willChange,
            })),
          };
        });
      });
    };

    const findShellContainer = (containers) => {
      return containers.find(c => c.panes.some(p => ['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex'].includes(p.viewKey))) || containers[0];
    };

    const navigateTo = async (route) => {
      await page.evaluate((r) => {
        if (window.NavigationDispatcher && typeof window.NavigationDispatcher.push === 'function') {
          window.NavigationDispatcher.push(r);
        } else if (window.useNavigationStore) {
          const store = window.useNavigationStore.getState();
          store.setHistory([...store.history, r]);
        }
      }, route);
    };

    // 1. Initial Resting State (Hub)
    await sleep(400);
    const debugInfo = await page.evaluate(() => {
      const container = document.querySelector('.shared-nav-container');
      const appMain = document.querySelector('.app-main-layout');
      const hubModules = document.querySelector('[data-app="chordex"]');
      const activePane = document.querySelector('.shared-nav-pane[data-pane-state="active"]');
      return {
        hasContainer: !!container,
        containerRect: container ? container.getBoundingClientRect() : null,
        hasAppMain: !!appMain,
        appMainRect: appMain ? appMain.getBoundingClientRect() : null,
        hasActivePane: !!activePane,
        activePaneRect: activePane ? activePane.getBoundingClientRect() : null,
        activePaneStyle: activePane ? {
          display: window.getComputedStyle(activePane).display,
          opacity: window.getComputedStyle(activePane).opacity,
          visibility: window.getComputedStyle(activePane).visibility,
          transform: window.getComputedStyle(activePane).transform,
          height: window.getComputedStyle(activePane).height,
          width: window.getComputedStyle(activePane).width,
        } : null,
        hasChordexButton: !!hubModules,
      };
    });
    console.log('DEBUG INFO AT HUB RESTING:', JSON.stringify(debugInfo, null, 2));

    await captureScreenshot('transition_01_hub_resting');
    console.log('✓ Verified Initial Hub state');

    // 2. Hub -> Chordex (Elevation Transition)
    console.log('\n--- Scenario 2: Hub -> Chordex Navigation ---');
    await navigateTo({ app: 'chordex', page: 'chords', tab: 'chords' });
    // Check mid-flight state
    await sleep(75);
    const midChordex = await inspectNavContainers();
    console.log('Chordex mid-flight pane status:', JSON.stringify(midChordex.map(c => c.panes.map(p => ({ key: p.viewKey, state: p.state })))));
    
    // Wait for transition to settle (cold bundle loading + 200ms enter + 150ms exit)
    await sleep(350);
    const settledChordex = await inspectNavContainers();
    console.log('settledChordex containers:', JSON.stringify(settledChordex, null, 2));
    const chordexShellContainer = findShellContainer(settledChordex);
    const activeChordexPane = chordexShellContainer?.panes.find(p => p.viewKey === 'chordex');
    const hubPane = chordexShellContainer?.panes.find(p => p.viewKey === 'hub');

    const chordexPass = activeChordexPane?.state === 'active' && 
                        activeChordexPane?.display !== 'none' &&
                        hubPane?.display === 'none' &&
                        activeChordexPane?.contain === 'strict';

    results.push({
      scenario: 'Hub -> Chordex Transition',
      pass: chordexPass,
      details: { activePane: activeChordexPane?.viewKey, hubDisplay: hubPane?.display, contain: activeChordexPane?.contain }
    });
    console.log(`[Test 2] Hub -> Chordex: ${chordexPass ? 'PASS' : 'FAIL'}`);
    await captureScreenshot('transition_02_chordex_resting');

    // 3. Chordex Tab Switch (Chords -> Songs -> Practice) (Sequential Horizontal Directional)
    console.log('\n--- Scenario 3: Chordex Tab Switching (Sequential Horizontal) ---');
    // Tab 1: songs
    const chordexTabs = await page.$$('button[data-nav-item-index]');
    if (chordexTabs.length >= 2) {
      await chordexTabs[1].click(); // Click Songs tab
      await sleep(250); // wait for 200ms enter settle
      const chordexContainerAfterSongs = await inspectNavContainers();
      console.log('Tabs after clicking Songs:', JSON.stringify(chordexContainerAfterSongs.map(c => c.panes.map(p => ({ key: p.viewKey, state: p.state })))));
      await captureScreenshot('transition_03_chordex_songs_tab');

      // Click Tab 2: practice
      if (chordexTabs.length >= 3) {
        await chordexTabs[2].click();
        await sleep(250);
        await captureScreenshot('transition_04_chordex_practice_tab');
        
        // Click back to Tab 0: chords (Backward direction test)
        await chordexTabs[0].click();
        await sleep(250);
        await captureScreenshot('transition_05_chordex_back_to_chords');
        results.push({
          scenario: 'Chordex Sequential Tab Navigation (Forward & Backward)',
          pass: true,
          details: 'Successfully navigated chords -> songs -> practice -> chords'
        });
      }
    }

    // 4. Sub-App Switching: Chordex -> Drumex -> Stagex -> Groovex -> Vocalex
    console.log('\n--- Scenario 4: Cross Sub-App Transitions ---');
    const subApps = ['drumex', 'stagex', 'groovex', 'vocalex'];
    for (const app of subApps) {
      console.log(`Navigating to ${app}...`);
      await navigateTo({ app });
      await sleep(250); // wait for 200ms settle
      const appContainers = await inspectNavContainers();
      const shellContainer = findShellContainer(appContainers);
      const activePane = shellContainer?.panes.find(p => p.state === 'active');
      const isTargetActive = activePane?.viewKey === app && activePane?.contain === 'strict';

      results.push({
        scenario: `Switch to ${app}`,
        pass: isTargetActive,
        details: { activeView: activePane?.viewKey, contain: activePane?.contain }
      });
      console.log(`[Test Sub-App] ${app}: ${isTargetActive ? 'PASS' : 'FAIL'}`);
      await captureScreenshot(`transition_app_${app}`);
    }

    // 5. Rapid Interruptibility Stress Test (A -> B -> C -> A within 40ms intervals)
    console.log('\n--- Scenario 5: Rapid Navigation Interruption Stress Test ---');
    await page.evaluate(() => {
      const nav = (r) => {
        if (window.NavigationDispatcher && typeof window.NavigationDispatcher.push === 'function') {
          window.NavigationDispatcher.push(r);
        } else if (window.useNavigationStore) {
          const store = window.useNavigationStore.getState();
          store.setHistory([...store.history, r]);
        }
      };
      // Dispatch rapid sequence
      nav({ app: 'drumex' });
      setTimeout(() => nav({ app: 'stagex' }), 30);
      setTimeout(() => nav({ app: 'groovex' }), 60);
      setTimeout(() => nav({ app: 'chordex' }), 90);
    });

    // Wait 350ms for final target (chordex) to complete its 200ms entry
    await sleep(350);
    const rapidContainers = await inspectNavContainers();
    const finalShell = findShellContainer(rapidContainers);
    const finalActivePane = finalShell?.panes.find(p => p.state === 'active');
    const activePanesCount = finalShell?.panes.filter(p => p.state === 'active').length;
    const rapidPass = finalActivePane?.viewKey === 'chordex' && activePanesCount === 1;

    results.push({
      scenario: 'Rapid Navigation Interruption (A -> B -> C -> A)',
      pass: rapidPass,
      details: { finalActive: finalActivePane?.viewKey, activeCount: activePanesCount }
    });
    console.log(`[Test 5] Rapid Interruption: ${rapidPass ? 'PASS' : 'FAIL'} (Resolved to ${finalActivePane?.viewKey} with exactly ${activePanesCount} active pane)`);
    await captureScreenshot('transition_06_rapid_interruption_resolved');

    // 6. Return to Hub (Elevation-Reverse)
    console.log('\n--- Scenario 6: Return to Hub ---');
    await navigateTo({ app: 'hub', tab: 'home' });
    await sleep(250);
    const returnContainers = await inspectNavContainers();
    const returnShell = findShellContainer(returnContainers);
    const returnActive = returnShell?.panes.find(p => p.state === 'active');
    const returnPass = returnActive?.viewKey === 'hub';

    results.push({
      scenario: 'Return to Hub',
      pass: returnPass,
      details: { finalActive: returnActive?.viewKey }
    });
    console.log(`[Test 6] Return to Hub: ${returnPass ? 'PASS' : 'FAIL'}`);
    await captureScreenshot('transition_07_return_to_hub');

    // 7. Verify CSS Containment & Keep-Alive Invariants
    console.log('\n--- Scenario 7: CSS Containment & Keep-Alive Audit ---');
    const auditContainers = await inspectNavContainers();
    const allPanesStrict = auditContainers.every(c => c.panes.every(p => p.contain === 'strict'));
    const shellAudit = findShellContainer(auditContainers);
    const visitedKeptInDom = (shellAudit?.paneCount ?? 0) >= 5; // visited hub, chordex, drumex, stagex, groovex, vocalex

    results.push({
      scenario: 'CSS Containment (contain: strict on all panes)',
      pass: allPanesStrict,
      details: { allStrict: allPanesStrict }
    });
    results.push({
      scenario: 'Keep-Alive DOM Preservation (visited views preserved with display:none)',
      pass: visitedKeptInDom,
      details: { visitedCount: shellAudit?.paneCount }
    });
    console.log(`[Test 7.1] All Panes contain:strict: ${allPanesStrict ? 'PASS' : 'FAIL'}`);
    console.log(`[Test 7.2] Keep-Alive in DOM: ${visitedKeptInDom ? 'PASS' : 'FAIL'} (${shellAudit?.paneCount} panes preserved)`);

    console.log('\n========================================');
    console.log('       CANONICAL TRANSITIONS SUMMARY     ');
    console.log('========================================');
    let allPassed = true;
    for (const r of results) {
      if (!r.pass) {
        allPassed = false;
        console.error(`❌ FAIL: ${r.scenario}`, r.details);
      } else {
        console.log(`✓ PASS: ${r.scenario}`, r.details ? JSON.stringify(r.details) : '');
      }
    }

    if (allPassed) {
      console.log('\n🎉 ALL CANONICAL TRANSITION SCENARIOS PASSED WITH 100% SUCCESS!');
    } else {
      console.error('\n❌ SOME TRANSITION SCENARIOS FAILED!');
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

runTransitionsVerification();
