#!/usr/bin/env node

/**
 * Livex Google Play Store Screenshot Generation Pipeline
 *
 * Automates the capture and compositing of official 1080x1920 px (9:16)
 * marketing screenshots for Google Play Store listing:
 *
 *   Slide 1: Livex Hub Workspace (Rehearsal suite overview)
 *   Slide 2: Chordex Chord Library (Open chord detail morph modal)
 *   Slide 3: Chordex 3 Live Modes in One Image (Left: Chords, Middle: Lyrics, Right: Both)
 *   Slide 4: Drumex Multi-Track Step Sequencer (Populated beat with note hits)
 *   Slide 5: Stagex Stage Plot & PDF Export (Landscape stage plot + portrait PDF rider)
 *   Slide 6: Vocalex Exercises & Recording Takes (Guided exercises + waveform takes)
 *
 * Exclusions: Groovex is completely omitted per explicit user directive.
 * Aesthetics: Zero artificial badges/pills, pure AMOLED dark backdrops.
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
  buildThreeLiveModesSlideHtml,
  buildDrumexSlideHtml,
  buildStagexPlotAndExportSlideHtml,
  buildVocalexExercisesAndTakesSlideHtml,
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

    // 4. Seed Drumex Step Sequencer with illuminated note hits
    if (window.useDrumStore) {
      const drumStore = window.useDrumStore.getState();
      const p = drumStore.patterns[0];
      if (p && p.measures && p.measures[0]) {
        const pId = p.id;
        const mId = p.measures[0].id;
        p.measures[0].hits = {};
        [0, 6, 8, 10].forEach((s) => drumStore.simpleToggleHit(pId, mId, 'kick', s));
        [4, 12].forEach((s) => drumStore.simpleToggleHit(pId, mId, 'snare', s));
        [0, 2, 4, 6, 8, 10, 12, 14].forEach((s) => drumStore.simpleToggleHit(pId, mId, 'hihat-closed', s));
        [0].forEach((s) => drumStore.simpleToggleHit(pId, mId, 'crash', s));
      }
    }

    // 5. Seed Vocalex Takes (Recordings)
    if (window.vocalexRepository) {
      const dummyBlob = new Blob(['sample-audio-data'], { type: 'audio/webm' });
      await window.vocalexRepository.saveTake({
        id: 'take-chorus-1',
        name: 'Lead Vocal — Chorus Harmony Take 3',
        createdAt: Date.now() - 3600000,
        durationMs: 42000,
        audioBlob: dummyBlob,
        waveformPeaks: [0.2, 0.5, 0.8, 0.6, 0.9, 0.7, 0.5, 0.8, 0.4, 0.6, 0.9, 0.7, 0.3, 0.2],
        sampleRate: 48000,
      });
      await window.vocalexRepository.saveTake({
        id: 'take-verse-2',
        name: 'Acoustic Double — Verse 1 Guide',
        createdAt: Date.now() - 7200000,
        durationMs: 28000,
        audioBlob: dummyBlob,
        waveformPeaks: [0.1, 0.3, 0.5, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.5, 0.6, 0.4, 0.2, 0.1],
        sampleRate: 48000,
      });
      await window.vocalexRepository.saveTake({
        id: 'take-main-3',
        name: 'Main Vocal — Full Runthrough Take 1',
        createdAt: Date.now() - 10800000,
        durationMs: 185000,
        audioBlob: dummyBlob,
        waveformPeaks: [0.3, 0.6, 0.8, 0.7, 0.9, 0.8, 0.7, 0.5, 0.6, 0.8, 0.7, 0.4, 0.3, 0.1],
        sampleRate: 48000,
      });
      await window.vocalexRepository.saveTake({
        id: 'take-harm-4',
        name: 'Backing Vocals — High Harmony D4',
        createdAt: Date.now() - 14400000,
        durationMs: 36000,
        audioBlob: dummyBlob,
        waveformPeaks: [0.2, 0.4, 0.7, 0.5, 0.8, 0.6, 0.4, 0.5, 0.7, 0.5, 0.3, 0.2, 0.1, 0.1],
        sampleRate: 48000,
      });
      await window.vocalexRepository.saveTake({
        id: 'take-bridge-5',
        name: 'Bridge Ad-Lib — Warm Ambient Reverb',
        createdAt: Date.now() - 18000000,
        durationMs: 24000,
        audioBlob: dummyBlob,
        waveformPeaks: [0.1, 0.4, 0.6, 0.8, 0.7, 0.9, 0.5, 0.4, 0.6, 0.5, 0.3, 0.2, 0.1, 0.1],
        sampleRate: 48000,
      });
    }

    // 6. Seed Stagex Project (Stage plot & Technical Rider)
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
        { id: 'el-1', name: 'Drum Kit', label: 'DRUMS', icon: 'drum', type: 'Acoustic Drums', x: 325, y: 110, rotation: 0, scale: 100, channelId: 'CH-01', color: '#f59e0b', source: 'Mic', output: 'FOH' },
        { id: 'el-2', name: 'Lead Vocal', label: 'LEAD VOCAL', icon: 'cx-vocalist', type: 'Wireless Mic', x: 325, y: 260, rotation: 0, scale: 100, channelId: 'CH-02', color: '#38bdf8', source: 'Mic', output: 'FOH' },
        { id: 'el-3', name: 'Guitar', label: 'GUITAR', icon: 'cx-guitarist', type: 'Electric Guitar', x: 180, y: 220, rotation: 0, scale: 100, channelId: 'CH-03', color: '#10b981', source: 'Mic', output: 'FOH' },
        { id: 'el-4', name: 'Keys', label: 'KEYBOARD', icon: 'cx-keyboardist', type: 'Keyboard DI', x: 470, y: 220, rotation: 0, scale: 100, channelId: 'CH-04', color: '#a855f7', source: 'DI', output: 'FOH' },
      ],
      scenes: [
        {
          id: 's1',
          name: 'Main Stage',
          elements: [
            { id: 'el-1', name: 'Drum Kit', label: 'DRUMS', icon: 'drum', type: 'Acoustic Drums', x: 325, y: 110, rotation: 0, scale: 100, channelId: 'CH-01', color: '#f59e0b', source: 'Mic', output: 'FOH' },
            { id: 'el-2', name: 'Lead Vocal', label: 'LEAD VOCAL', icon: 'cx-vocalist', type: 'Wireless Mic', x: 325, y: 260, rotation: 0, scale: 100, channelId: 'CH-02', color: '#38bdf8', source: 'Mic', output: 'FOH' },
            { id: 'el-3', name: 'Guitar', label: 'GUITAR', icon: 'cx-guitarist', type: 'Electric Guitar', x: 180, y: 220, rotation: 0, scale: 100, channelId: 'CH-03', color: '#10b981', source: 'Mic', output: 'FOH' },
            { id: 'el-4', name: 'Keys', label: 'KEYBOARD', icon: 'cx-keyboardist', type: 'Keyboard DI', x: 470, y: 220, rotation: 0, scale: 100, channelId: 'CH-04', color: '#a855f7', source: 'DI', output: 'FOH' },
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
    // Purge any lingering modal portal elements or backdrops in document.body
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

  // 1. Hub Workspace View (Groovex strictly hidden)
  console.log('[CAPTURE] 1/10 Capturing Livex Hub Workspace...');
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
  });
  await sleep(1500);
  await page.evaluate(() => {
    // Hide Groovex module button/card in Hub per strict project directive
    const allCards = Array.from(document.querySelectorAll('button, div[role="button"], a'));
    for (const el of allCards) {
      if (el.textContent && el.textContent.includes('Groovex')) {
        el.style.display = 'none';
      }
    }
  });
  const rawHubPath = path.join(RAW_CAPTURE_DIR, '01-hub-workspace.png');
  await page.screenshot({ path: rawHubPath });
  console.log(`✓ Saved: ${rawHubPath}`);

  // 2. Chordex Library with Open Morph Modal
  console.log('[CAPTURE] 2/10 Capturing Chordex Library with Open Chord Morph...');
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

  // Cleanly close the modal so subsequent views are unaffected
  await page.evaluate(() => {
    const closeBtn =
      document.querySelector('.sc-morphing-panel button[aria-label="Close"]') ||
      document.querySelector('button[aria-label="Close"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);
  await ensureNoModals(page);
  await sleep(300);

  // 3. Chordex 3 Live Modes (Chords, Lyrics, Both)
  console.log('[CAPTURE] 3/10 Capturing Live Chords View...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    localStorage.setItem('chordex_live_display_mode', 'chords');
    const store = window.useChordStore.getState();
    const presets = store.presets || [];
    const venezia = presets.find((p) => p.name === 'Venezia') || presets[0];
    if (venezia) store.setActivePreset(venezia.id);
    window.NavigationDispatcher.reset([{ app: 'chordex', page: 'songs' }]);
  });
  await sleep(800);
  await page.evaluate(() => {
    const chordsBtn =
      document.querySelector('[data-testid="view-mode-chords"]') ||
      Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Chords');
    if (chordsBtn) chordsBtn.click();
    window.dispatchEvent(new Event('livex:open-live-spectator'));
  });
  await sleep(1200);
  await ensureNoModals(page);
  const rawLiveChordsPath = path.join(RAW_CAPTURE_DIR, 'v3-live-chords.png');
  await page.screenshot({ path: rawLiveChordsPath });
  console.log(`✓ Saved: ${rawLiveChordsPath}`);

  // Exit live mode
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="live-mode-back-btn"]');
    if (backBtn) backBtn.click();
  });
  await sleep(600);

  console.log('[CAPTURE] 4/10 Capturing Live Lyrics View (Teleprompter)...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    localStorage.setItem('chordex_live_display_mode', 'lyrics');
    const lyricsBtn =
      document.querySelector('[data-testid="view-mode-lyrics"]') ||
      Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Lyrics');
    if (lyricsBtn) lyricsBtn.click();
    window.dispatchEvent(new Event('livex:open-live-spectator'));
  });
  await sleep(1200);
  await ensureNoModals(page);
  const rawLiveLyricsPath = path.join(RAW_CAPTURE_DIR, 'v3-live-lyrics.png');
  await page.screenshot({ path: rawLiveLyricsPath });
  console.log(`✓ Saved: ${rawLiveLyricsPath}`);

  // Exit live mode
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="live-mode-back-btn"]');
    if (backBtn) backBtn.click();
  });
  await sleep(600);

  console.log('[CAPTURE] 5/10 Capturing Live Both View (Synchronized)...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    localStorage.setItem('chordex_live_display_mode', 'both');
    const bothBtn =
      document.querySelector('[data-testid="view-mode-both"]') ||
      Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Both');
    if (bothBtn) bothBtn.click();
    window.dispatchEvent(new Event('livex:open-live-spectator'));
  });
  await sleep(1200);
  await ensureNoModals(page);
  const rawLiveBothPath = path.join(RAW_CAPTURE_DIR, 'v3-live-both.png');
  await page.screenshot({ path: rawLiveBothPath });
  console.log(`✓ Saved: ${rawLiveBothPath}`);

  // Exit live mode
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="live-mode-back-btn"]');
    if (backBtn) backBtn.click();
  });
  await sleep(600);
  await ensureNoModals(page);

  // 4. Drumex Step Sequencer with Note Hits
  console.log('[CAPTURE] 6/10 Capturing Drumex Step Sequencer with notes...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'drumex' }]);
    window.NavigationDispatcher.push({ app: 'drumex', page: 'songs', subView: 'editor' });
  });
  await sleep(1600);
  await ensureNoModals(page);
  const rawDrumexPath = path.join(RAW_CAPTURE_DIR, 'v4-drumex-sequencer.png');
  await page.screenshot({ path: rawDrumexPath });
  console.log(`✓ Saved: ${rawDrumexPath}`);

  // 5. Stagex Stage Plot in Landscape Orientation
  console.log('[CAPTURE] 7/10 Capturing Stagex Stage Plot in Landscape...');
  await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.reset([{ app: 'stagex' }]);
    window.NavigationDispatcher.push({ app: 'stagex', page: 'Editor' });
  });
  await sleep(1500);

  // Trigger iframe loadSaved & renderAll
  const iframeHandle = await page.$('iframe');
  if (iframeHandle) {
    const frame = await iframeHandle.contentFrame();
    if (frame) {
      await frame.evaluate(() => {
        if (typeof loadSaved === 'function') loadSaved();
        if (typeof renderAll === 'function') renderAll();
      });
      await sleep(1000);
    }
  }
  await ensureNoModals(page);
  const rawStagePlotLandscapePath = path.join(RAW_CAPTURE_DIR, 'test-stagex-landscape-pure.png');
  await page.screenshot({ path: rawStagePlotLandscapePath });
  console.log(`✓ Saved: ${rawStagePlotLandscapePath}`);

  // 6. Stagex PDF Export Sheet (Portrait)
  console.log('[CAPTURE] 8/10 Capturing Stagex Technical Rider PDF Export...');
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.push({ app: 'stagex', page: 'Export' });
  });
  await sleep(1500);
  await ensureNoModals(page);
  const rawStageExportPath = path.join(RAW_CAPTURE_DIR, 'v4-stagex-export.png');
  await page.screenshot({ path: rawStageExportPath });
  console.log(`✓ Saved: ${rawStageExportPath}`);

  // 7. Vocalex Coach Exercises
  console.log('[CAPTURE] 9/10 Capturing Vocalex Coach Exercises...');
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
  const rawVocalExercisesPath = path.join(RAW_CAPTURE_DIR, 'v3-vocalex-exercises.png');
  await page.screenshot({ path: rawVocalExercisesPath });
  console.log(`✓ Saved: ${rawVocalExercisesPath}`);

  // 8. Vocalex Takes (Recordings)
  console.log('[CAPTURE] 10/10 Capturing Vocalex Takes (Recordings)...');
  await ensureNoModals(page);
  await page.evaluate(() => {
    window.NavigationDispatcher.push({ app: 'vocalex', page: 'takes' });
  });
  await sleep(1400);
  await ensureNoModals(page);
  const rawVocalTakesPath = path.join(RAW_CAPTURE_DIR, 'v4-vocalex-takes.png');
  await page.screenshot({ path: rawVocalTakesPath });
  console.log(`✓ Saved: ${rawVocalTakesPath}`);

  return {
    hubPath: rawHubPath,
    chordMorphPath: rawChordMorphPath,
    chordsPath: rawLiveChordsPath,
    prompterPath: rawLiveLyricsPath,
    combinedPath: rawLiveBothPath,
    drumexPath: rawDrumexPath,
    stagePlotLandscapePath: rawStagePlotLandscapePath,
    stageExportPath: rawStageExportPath,
    vocalExercisesPath: rawVocalExercisesPath,
    vocalTakesPath: rawVocalTakesPath,
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
  console.log('      LIVEX GOOGLE PLAY STORE — OFFICIAL SCREENSHOT GENERATOR           ');
  console.log('      Target: 1080 x 1920 px (9:16) Ultra-Slim Pixel 9 Pro Frames       ');
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

    console.log('\n--- COMPOSITING PRODUCTION PLAY STORE ASSETS (1080x1920) ---');

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

    // ── SLIDE 3: Chordex 3 Live Performance Modes (Chords, Lyrics, Both) ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '03-live-prompter-chords-both.png'),
      slideName: 'Slide 3: 3 Live Performance Modes',
      html: buildThreeLiveModesSlideHtml({
        headingLine1: '3 live performance modes.',
        headingLine2: 'Chords, lyrics, or both synchronized.',
        chordsImageBase64: toBase64DataUrl(rawCaptures.chordsPath),
        prompterImageBase64: toBase64DataUrl(rawCaptures.prompterPath),
        combinedImageBase64: toBase64DataUrl(rawCaptures.combinedPath),
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

    // ── SLIDE 5: Stagex Stage Plot & PDF Technical Rider ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '05-stagex-plot-export.png'),
      slideName: 'Slide 5: Stagex Plot & PDF Export',
      html: buildStagexPlotAndExportSlideHtml({
        headingLine1: 'Visual stage plots & tech riders.',
        headingLine2: 'Interactive layout with instant PDF export.',
        landscapePlotImageBase64: toBase64DataUrl(rawCaptures.stagePlotLandscapePath),
        portraitExportImageBase64: toBase64DataUrl(rawCaptures.stageExportPath),
      }),
    });

    // ── SLIDE 6: Vocalex Exercises & Recording Takes ──
    await compositeSlide(browser, {
      outputPath: path.join(PLAYSTORE_DIR, '06-vocalex-exercises-takes.png'),
      slideName: 'Slide 6: Vocalex Exercises & Takes',
      html: buildVocalexExercisesAndTakesSlideHtml({
        headingLine1: 'Vocal coach & recording takes.',
        headingLine2: 'Guided training routines & lossless audio.',
        exercisesImageBase64: toBase64DataUrl(rawCaptures.vocalExercisesPath),
        takesImageBase64: toBase64DataUrl(rawCaptures.vocalTakesPath),
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
