#!/usr/bin/env node

/**
 * Livex Google Play Store Screenshot Generation Pipeline
 *
 * Automates the capture and compositing of official 1080x1920 px (9:16)
 * marketing screenshots for Google Play Store listing:
 *
 *   Slide 1: Livex Hub Workspace (Rehearsal suite overview featuring Groovex)
 *   Slide 2: Chordex Chord Library (Open chord detail morph modal)
 *   Slide 3: Chordex Live Prompter (Synchronized chords, lyrics & beat tracking)
 *   Slide 4: Drumex Multi-Track Step Sequencer (Populated beat with note hits)
 *   Slide 5: Stagex Interactive Stage Plot (Spatial stage grid with equipment nodes)
 *   Slide 6: Vocalex Exercises (Guided vocal coaching routines & category list)
 *
 * Standards:
 * - Single centered device frame per slide anchored at an identical vertical baseline
 * - Uniform top headline margins and typography
 * - Zero artificial badges/pills, pure AMOLED dark backdrops (#000000)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import {
  buildHubSlideHtml,
  buildChordMorphSlideHtml,
  buildLivePrompterSlideHtml,
  buildDrumexSlideHtml,
  buildStagexSlideHtml,
  buildVocalexSlideHtml,
} from './playstore/slide-templates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLAYSTORE_DIR = path.resolve(REPO_ROOT, '.artifacts', 'marketing', 'playstore');
const RAW_CAPTURE_DIR = path.resolve(PLAYSTORE_DIR, '.raw');

for (const dir of [PLAYSTORE_DIR, RAW_CAPTURE_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getBrainArtifactDir() {
  if (process.env.BRAIN_ARTIFACT_DIR && fs.existsSync(process.env.BRAIN_ARTIFACT_DIR)) {
    return process.env.BRAIN_ARTIFACT_DIR;
  }
  const baseBrain = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain';
  if (fs.existsSync(baseBrain)) {
    const currentConv = '1175433f-38ca-436e-8de8-3b236180ddc4';
    const specific = path.join(baseBrain, currentConv);
    if (fs.existsSync(specific)) return specific;
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

async function ensureDevServer() {
  for (const port of [5174, 5173]) {
    const isUp =
      (await checkServerListening(`http://127.0.0.1:${port}/`, 800)) ||
      (await checkServerListening(`http://localhost:${port}/`, 800));
    if (isUp) {
      console.log(`[DEV-SERVER] Active Vite server found on port ${port}`);
      return { port, process: null };
    }
  }

  console.log('[DEV-SERVER] Starting Vite preview server on port 5174...');
  const devProcess = spawn('cmd.exe', ['/c', 'pnpm.cmd --filter @workspace/studio-android dev --port 5174'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: '5174' },
  });

  const start = Date.now();
  while (Date.now() - start < 60000) {
    await sleep(1000);
    if (await checkServerListening('http://127.0.0.1:5174/', 800)) {
      console.log('[DEV-SERVER] Server ready on http://127.0.0.1:5174/');
      return { port: 5174, process: devProcess };
    }
  }

  throw new Error('[DEV-SERVER] Timeout waiting for Vite server on port 5174');
}

/**
 * Seed canonical rehearsal data across stores
 */
async function seedWorkspaceState(page) {
  console.log('[SEED] Populating clean AMOLED settings and rehearsal data...');
  await page.evaluate(async () => {
    // 1. Dismiss splash/intro overlays
    const intro = document.getElementById('intro');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    window.__introDone = true;
    window.dispatchEvent(new Event('studio-intro-done'));

    // 2. Enforce AMOLED Pure Black
    if (window.useSettingsStore) {
      window.useSettingsStore.getState().updateSettings({
        theme: 'dark',
        amoledMode: true,
      });
    }

    // 3. Seed Chordex Venezia Song
    if (window.useChordStore) {
      const store = window.useChordStore.getState();
      const existing = store.presets || [];
      const hasVenezia = existing.some((p) => p.name === 'Venezia');

      if (!hasVenezia) {
        const veneziaId = store.createPreset({
          name: 'Venezia',
          artist: 'Livex Studio Session',
          key: 'G',
          speed: 128,
          bpm: 128,
          chords: ['G', 'Em7', 'Cadd9', 'Dsus4', 'Am7'],
          timeSignature: '4/4',
          lyrics: {
            formatting: { fontSize: 'medium', lineSpacing: 'normal' },
            sections: [
              {
                id: 'sec-v1',
                name: 'Verse 1',
                type: 'verse',
                barsPerLine: 2,
                lines: [
                  {
                    id: 'lv-1',
                    text: 'Standing on the edge of the ancient canal',
                    bars: 2,
                    chords: [
                      { id: 'c-1', chord: 'G', offset: 0 },
                      { id: 'c-2', chord: 'Cadd9', offset: 24 },
                    ],
                  },
                  {
                    id: 'lv-2',
                    text: 'Golden lanterns glow through the midnight mist',
                    bars: 2,
                    chords: [
                      { id: 'c-3', chord: 'Em7', offset: 0 },
                      { id: 'c-4', chord: 'Dsus4', offset: 26 },
                    ],
                  },
                  {
                    id: 'lv-3',
                    text: 'Every ringing chord echoes in the square',
                    bars: 2,
                    chords: [
                      { id: 'c-5', chord: 'Am7', offset: 0 },
                      { id: 'c-6', chord: 'Dsus4', offset: 25 },
                    ],
                  },
                ],
              },
              {
                id: 'sec-ch',
                name: 'Chorus',
                type: 'chorus',
                barsPerLine: 2,
                lines: [
                  {
                    id: 'lc-1',
                    text: 'Sing it out loud, let the rhythm ignite',
                    bars: 2,
                    chords: [
                      { id: 'c-7', chord: 'Cadd9', offset: 0 },
                      { id: 'c-8', chord: 'G', offset: 24 },
                    ],
                  },
                  {
                    id: 'lc-2',
                    text: 'All across the water till the morning light',
                    bars: 2,
                    chords: [
                      { id: 'c-9', chord: 'Em7', offset: 0 },
                      { id: 'c-10', chord: 'Dsus4', offset: 26 },
                    ],
                  },
                ],
              },
            ],
          },
        });
        store.setActivePreset(veneziaId);
      }
    }

    // 4. Seed Stagex Project with stage equipment nodes
    const stageProject = {
      schemaVersion: 9,
      name: 'Festival Main Stage Plot',
      venue: 'Metropolis Amphitheatre',
      date: '2026-10-14',
      canvasW: 650,
      canvasH: 420,
      stageWidth: 14,
      stageDepth: 10,
      currentSceneIdx: 0,
      elements: [
        { id: 'el-1', name: 'Drum Kit', label: 'DRUMS', icon: 'drum', type: 'Acoustic Drums', x: 200, y: 70, rotation: 0, scale: 100, channelId: 'CH-01', color: '#f59e0b', source: 'Mic', output: 'FOH' },
        { id: 'el-2', name: 'Lead Vocal', label: 'LEAD VOCAL', icon: 'cx-vocalist', type: 'Wireless Mic', x: 200, y: 170, rotation: 0, scale: 100, channelId: 'CH-02', color: '#38bdf8', source: 'Mic', output: 'FOH' },
        { id: 'el-3', name: 'Guitar', label: 'GUITAR', icon: 'cx-guitarist', type: 'Electric Guitar', x: 90, y: 140, rotation: 0, scale: 100, channelId: 'CH-03', color: '#10b981', source: 'Mic', output: 'FOH' },
        { id: 'el-4', name: 'Keys', label: 'KEYBOARD', icon: 'cx-keyboardist', type: 'Keyboard DI', x: 310, y: 140, rotation: 0, scale: 100, channelId: 'CH-04', color: '#a855f7', source: 'DI', output: 'FOH' },
      ],
      scenes: [
        {
          id: 's1',
          name: 'Main Stage',
          elements: [
            { id: 'el-1', name: 'Drum Kit', label: 'DRUMS', icon: 'drum', type: 'Acoustic Drums', x: 200, y: 70, rotation: 0, scale: 100, channelId: 'CH-01', color: '#f59e0b', source: 'Mic', output: 'FOH' },
            { id: 'el-2', name: 'Lead Vocal', label: 'LEAD VOCAL', icon: 'cx-vocalist', type: 'Wireless Mic', x: 200, y: 170, rotation: 0, scale: 100, channelId: 'CH-02', color: '#38bdf8', source: 'Mic', output: 'FOH' },
            { id: 'el-3', name: 'Guitar', label: 'GUITAR', icon: 'cx-guitarist', type: 'Electric Guitar', x: 90, y: 140, rotation: 0, scale: 100, channelId: 'CH-03', color: '#10b981', source: 'Mic', output: 'FOH' },
            { id: 'el-4', name: 'Keys', label: 'KEYBOARD', icon: 'cx-keyboardist', type: 'Keyboard DI', x: 310, y: 140, rotation: 0, scale: 100, channelId: 'CH-04', color: '#a855f7', source: 'DI', output: 'FOH' },
          ],
          connections: [],
          nextId: 5,
        },
      ],
      riderChannels: [
        { ch: 1, source: 'Kick / Snare / Hats', mic: 'Shure Beta 91A / SM57', stand: 'Short Boom', phantom: false, notes: 'Gates on rack' },
        { ch: 2, source: 'Lead Vocal', mic: 'Shure KSM9 Wireless', stand: 'Straight Round', phantom: false, notes: 'Main wedge mix 1' },
        { ch: 3, source: 'Guitar Amp Cab', mic: 'Sennheiser e906', stand: 'Short Boom', phantom: false, notes: 'Stage left' },
        { ch: 4, source: 'Stereo Synth DI', mic: 'Radial ProD2 Stereo DI', stand: 'None', phantom: true, notes: 'Stage right' },
      ],
    };
    localStorage.setItem('stagecoreProject', JSON.stringify(stageProject));
  });
  await sleep(400);
}

async function ensureNoModals(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.sc-morphing-panel').forEach((p) => {
      const topContainer = p.closest('div[style*="99999"]') || p.parentElement;
      if (topContainer) topContainer.remove();
      else p.remove();
    });
    document.querySelectorAll('[id^="morph-surface-"]').forEach((el) => el.remove());
    document.querySelectorAll('.sc-morphing-anchor').forEach((el) => el.remove());
    document.querySelectorAll('div[style*="z-index: 99999"], div[style*="zIndex: 99999"]').forEach((el) => el.remove());
  });
}

/**
 * Capture designated screens at high fidelity (3x DPR)
 */
async function captureAppScreens(page) {
  console.log('\n--- CAPTURING RAW HIGH-DPI VIEWS ---');

  // 1. Hub Workspace View (Groovex included with "Multitrack stem mixer")
  console.log('[CAPTURE] 1/6 Capturing Livex Hub Workspace (including Groovex)...');
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
  });
  await sleep(1500);
  await page.evaluate(() => {
    // Ensure Groovex card subtitle matches requested descriptor
    const card = document.querySelector('button[data-app="groovex"]');
    if (card) {
      for (const s of card.querySelectorAll('span')) {
        if (s.textContent && s.textContent.toLowerCase().includes('mixer')) {
          s.textContent = 'Multitrack stem mixer';
        }
      }
    }
  });
  const rawHubPath = path.join(RAW_CAPTURE_DIR, '01-hub-workspace.png');
  await page.screenshot({ path: rawHubPath });
  console.log(`✓ Saved: ${rawHubPath}`);

  // 2. Chordex Library with Open Morph Modal
  console.log('[CAPTURE] 2/6 Capturing Chordex Library with Open Chord Morph...');
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'chordex', page: 'library' }]);
  });
  await sleep(1200);
  const chordCard = await page.$('[data-testid^="chord-card-"], .chord-card, [role="button"]');
  if (chordCard) {
    await chordCard.click();
    await sleep(900);
  }
  const rawChordMorphPath = path.join(RAW_CAPTURE_DIR, '02-chord-morph.png');
  await page.screenshot({ path: rawChordMorphPath });
  console.log(`✓ Saved: ${rawChordMorphPath}`);

  // Cleanly close modal
  await page.evaluate(() => {
    const closeBtn =
      document.querySelector('.sc-morphing-panel button[aria-label="Close"]') ||
      document.querySelector('button[aria-label="Close"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);
  await ensureNoModals(page);
  await sleep(300);

  // 3. Chordex Live Performance Prompter (Both view: Synchronized chords & lyrics)
  console.log('[CAPTURE] 3/6 Capturing Live Prompter (Synchronized Both view)...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    localStorage.setItem('chordex_live_display_mode', 'both');
    const store = window.useChordStore.getState();
    const presets = store.presets || [];
    const venezia = presets.find((p) => p.name === 'Venezia') || presets[0];
    if (venezia) store.setActivePreset(venezia.id);
    window.NavigationDispatcher.reset([{ app: 'chordex', page: 'songs' }]);
  });
  await sleep(800);
  await page.evaluate(() => {
    const bothBtn =
      document.querySelector('[data-testid="view-mode-both"]') ||
      Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Both');
    if (bothBtn) bothBtn.click();
    window.dispatchEvent(new Event('livex:open-live-spectator'));
  });
  await sleep(1200);
  await ensureNoModals(page);
  const rawLivePrompterPath = path.join(RAW_CAPTURE_DIR, '03-live-prompter.png');
  await page.screenshot({ path: rawLivePrompterPath });
  console.log(`✓ Saved: ${rawLivePrompterPath}`);

  // Exit live mode
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="live-mode-back-btn"]');
    if (backBtn) backBtn.click();
  });
  await sleep(600);
  await ensureNoModals(page);

  // 4. Drumex Step Sequencer with Note Hits
  console.log('[CAPTURE] 4/6 Capturing Drumex Step Sequencer with notes...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'drumex' }]);
    window.NavigationDispatcher.push({ app: 'drumex', page: 'songs', subView: 'editor' });
  });
  await sleep(1500);

  // Seed illuminated note hits into the active pattern via React fiber store instance
  const seedResult = await page.evaluate(() => {
    const containers = Array.from(document.querySelectorAll('div[class*="no-scrollbar"]'));
    let foundStore = null;
    let containerIndex = -1;

    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const fiberKey = Object.keys(container).find(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
      );
      let curr = fiberKey ? container[fiberKey] : null;
      while (curr && !foundStore) {
        if (curr.memoizedState) {
          let s = curr.memoizedState;
          while (s) {
            if (s.memoizedState && typeof s.memoizedState === 'object' && s.memoizedState.patterns) {
              foundStore = s.memoizedState;
              containerIndex = i;
              break;
            }
            s = s.next;
          }
        }
        if (curr.memoizedProps && curr.memoizedProps.patterns) {
          foundStore = curr.memoizedProps;
          containerIndex = i;
          break;
        }
        curr = curr.return;
      }
      if (foundStore) break;
    }

    if (!foundStore) return { error: 'no store found', totalContainers: containers.length };

    if (foundStore.patterns && foundStore.patterns[0]) {
      const p = foundStore.patterns[0];
      const pId = p.id;
      const mId = p.measures[0].id;
      p.measures[0].hits = {};
      [0, 6, 8, 10].forEach((s) => foundStore.simpleToggleHit(pId, mId, 'kick', s));
      [4, 12].forEach((s) => foundStore.simpleToggleHit(pId, mId, 'snare', s));
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((s) => foundStore.simpleToggleHit(pId, mId, 'hihat-closed', s));
      [0].forEach((s) => foundStore.simpleToggleHit(pId, mId, 'crash', s));
      return { success: true, containerIndex, pId, mId };
    }
    return { error: 'no pattern 0' };
  });
  console.log('[DEBUG] Drumex seed result:', seedResult);
  await sleep(1200);
  await ensureNoModals(page);
  const rawDrumexPath = path.join(RAW_CAPTURE_DIR, '04-drumex-sequencer.png');
  await page.screenshot({ path: rawDrumexPath });
  console.log(`✓ Saved: ${rawDrumexPath}`);

  // 5. Stagex Interactive Stage Plot in Portrait Orientation
  console.log('[CAPTURE] 5/6 Capturing Stagex Stage Plot with equipment nodes...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'stagex' }]);
    window.NavigationDispatcher.push({ app: 'stagex', page: 'Editor' });
  });
  await sleep(2000);

  // Trigger iframe dark AMOLED mode, loadSaved & renderAll
  const iframeHandle = await page.$('iframe');
  if (iframeHandle) {
    const frame = await iframeHandle.contentFrame();
    if (frame) {
      await frame.evaluate(() => {
        if (typeof injectTheme === 'function') injectTheme('dark');
        if (typeof injectAmoled === 'function') injectAmoled(true);
        if (typeof updateCanvasBg === 'function') updateCanvasBg('#000000');
        if (typeof loadSaved === 'function') loadSaved();
        if (typeof renderAll === 'function') renderAll();
      });
      await sleep(1000);
    }
  }
  await ensureNoModals(page);
  const rawStagePlotPath = path.join(RAW_CAPTURE_DIR, '05-stagex-plot.png');
  await page.screenshot({ path: rawStagePlotPath });
  console.log(`✓ Saved: ${rawStagePlotPath}`);

  // 6. Vocalex Guided Exercises
  console.log('[CAPTURE] 6/6 Capturing Vocalex Guided Exercises list...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'vocalex' }]);
    window.NavigationDispatcher.push({ app: 'vocalex', page: 'coach' });
  });
  await sleep(1000);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exBtn = buttons.find((b) => b.textContent && b.textContent.includes('Exercises'));
    if (exBtn) exBtn.click();
  });
  await sleep(1000);
  await ensureNoModals(page);
  const rawVocalExercisesPath = path.join(RAW_CAPTURE_DIR, '06-vocalex-exercises.png');
  await page.screenshot({ path: rawVocalExercisesPath });
  console.log(`✓ Saved: ${rawVocalExercisesPath}`);

  return {
    hubPath: rawHubPath,
    chordMorphPath: rawChordMorphPath,
    livePrompterPath: rawLivePrompterPath,
    drumexPath: rawDrumexPath,
    stagePlotPath: rawStagePlotPath,
    vocalExercisesPath: rawVocalExercisesPath,
  };
}

function toBase64DataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function compositeSlide(browser, { outputPath, html, slideName }) {
  console.log(`[COMPOSITE] Rendering 1080x1920 canvas for ${slideName}...`);
  const renderPage = await browser.newPage();
  await renderPage.setViewport({
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
  });

  await renderPage.setContent(html, { waitUntil: 'load' });
  await sleep(350);

  await renderPage.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  await renderPage.close();

  const stats = fs.statSync(outputPath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`✓ [SAVED] ${path.basename(outputPath)} (${sizeKb} KB)`);

  // Mirror to brain artifact directory if available
  if (BRAIN_ARTIFACT_DIR && fs.existsSync(BRAIN_ARTIFACT_DIR)) {
    try {
      const mirrorPath = path.join(BRAIN_ARTIFACT_DIR, path.basename(outputPath));
      fs.copyFileSync(outputPath, mirrorPath);
    } catch (_) {}
  }
}

async function main() {
  const startTime = Date.now();
  console.log('========================================================================');
  console.log('      LIVEX GOOGLE PLAY STORE — STANDARDIZED SCREENSHOT GENERATOR       ');
  console.log('      Target: 1080 x 1920 px (9:16) Uniform Centered Device Frames      ');
  console.log('      6 Canonical Slides (Zero AI-slop pills, Pure AMOLED Dark)        ');
  console.log('========================================================================');

  let serverInfo = null;
  let browser = null;

  try {
    serverInfo = await ensureDevServer();
    const port = serverInfo.port;

    const executablePath = getBrowserExecutablePath();
    console.log(`[BROWSER] Launching headless browser (${executablePath || 'default'})...`);

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
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    const baseUrl = `http://127.0.0.1:${port}/?frame=0`;
    console.log(`[NAV] Loading ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);

    await seedWorkspaceState(page);
    const rawCaptures = await captureAppScreens(page);
    await page.close();

    console.log('\n--- COMPOSITING STANDARDIZED PLAY STORE ASSETS (1080x1920) ---');

    // ── SLIDE 1: Livex Hub Workspace ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '01-hub-workspace.png'),
      slideName: 'Slide 1: Hub Workspace',
      html: buildHubSlideHtml({
        headingLine1: 'All-in-one band workspace.',
        headingLine2: 'Rehearsal suite for every musician.',
        imageBase64: toBase64DataUrl(rawCaptures.hubPath),
      }),
    });

    // ── SLIDE 2: Chordex Chord Library & Morph ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '02-chordex-library-morph.png'),
      slideName: 'Slide 2: Chordex Library & Morph',
      html: buildChordMorphSlideHtml({
        headingLine1: 'Smart chord library.',
        headingLine2: 'Interactive fretboards, voicings & keys.',
        imageBase64: toBase64DataUrl(rawCaptures.chordMorphPath),
      }),
    });

    // ── SLIDE 3: Chordex Live Performance Prompter ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '03-live-prompter-chords-both.png'),
      slideName: 'Slide 3: Live Prompter',
      html: buildLivePrompterSlideHtml({
        headingLine1: 'Live performance prompter.',
        headingLine2: 'Synchronized lyrics, chords & beat tracking.',
        imageBase64: toBase64DataUrl(rawCaptures.livePrompterPath),
      }),
    });

    // ── SLIDE 4: Drumex Multi-Track Step Sequencer ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '04-drumex-beat-sequencer.png'),
      slideName: 'Slide 4: Drumex Step Sequencer',
      html: buildDrumexSlideHtml({
        headingLine1: 'Multi-track step sequencer.',
        headingLine2: 'Design punchy beats & rhythm patterns.',
        imageBase64: toBase64DataUrl(rawCaptures.drumexPath),
      }),
    });

    // ── SLIDE 5: Stagex Interactive Stage Plot ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '05-stagex-plot-export.png'),
      slideName: 'Slide 5: Stagex Interactive Stage Plot',
      html: buildStagexSlideHtml({
        headingLine1: 'Visual stage plots & tech riders.',
        headingLine2: 'Interactive stage grid & equipment layouts.',
        imageBase64: toBase64DataUrl(rawCaptures.stagePlotPath),
      }),
    });

    // ── SLIDE 6: Vocalex Guided Exercises ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '06-vocalex-exercises-takes.png'),
      slideName: 'Slide 6: Vocalex Exercises',
      html: buildVocalexSlideHtml({
        headingLine1: 'Vocal coach & exercises.',
        headingLine2: 'Guided warmup routines & vocal training.',
        imageBase64: toBase64DataUrl(rawCaptures.vocalExercisesPath),
      }),
    });

    console.log('\n========================================================================');
    console.log('✓ PLAY STORE ASSETS GENERATION COMPLETE!');
    console.log('========================================================================');
    const files = [
      '01-hub-workspace.png',
      '02-chordex-library-morph.png',
      '03-live-prompter-chords-both.png',
      '04-drumex-beat-sequencer.png',
      '05-stagex-plot-export.png',
      '06-vocalex-exercises-takes.png',
    ];

    for (const f of files) {
      const p = path.join(PLAYSTORE_DIR, f);
      const st = fs.statSync(p);
      console.log(`  • ${f.padEnd(35)} ${(st.size / 1024).toFixed(1)} KB (1080x1920)`);
    }
    console.log(`Total duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error('Fatal error in Play Store generation pipeline:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

main();
