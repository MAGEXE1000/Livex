import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Mauren/.gemini/antigravity/brain/1175433f-38ca-436e-8de8-3b236180ddc4';

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

async function run() {
  console.log('Starting Puppeteer verification for Chord Unification & Live Grid Refactor...');
  const executablePath = getBrowserExecutablePath();
  console.log(`Using browser binary: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Navigating to http://localhost:5174/ ...');
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Dismiss intro
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

  // Navigate to Chordex
  console.log('Navigating to Chordex...');
  await page.evaluate(() => {
    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({
        app: 'chordex',
        route: '/app/chordex',
      });
    }
  });
  await sleep(1500);

  // Wait for useChordStore
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Theme helper
  const setTheme = async (theme) => {
    await page.evaluate((t) => {
      if (window.useSettingsStore) {
        const store = window.useSettingsStore.getState();
        store.updateSettings({
          theme: t === 'amoled' ? 'dark' : t,
          amoledMode: t === 'amoled',
        });
      }
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-amoled', 'dark');
      if (t === 'light') {
        document.documentElement.classList.add('theme-light');
      } else if (t === 'amoled') {
        document.documentElement.classList.add('theme-amoled', 'dark');
      } else {
        document.documentElement.classList.add('theme-dark', 'dark');
      }
    }, theme);
    await sleep(800);
  };

  // 1. VERIFY CHORD LIBRARY
  console.log('1. Testing Chord Library...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const libTab = tabs.find((b) => b.textContent && (b.textContent.includes('Library') || b.textContent.includes('Biblioteca') || b.textContent.includes('Chords')));
    if (libTab) libTab.click();
  });
  await sleep(1500);

  // Capture Library screenshot
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_library_canonical_diagram.png'),
  });
  console.log('Saved chord_library_canonical_diagram.png');

  // 2. SEED SONG & TEST LIVE CHORDS GRID
  console.log('2. Setting up test song with 4 chords for Live Mode grid...');
  const songId = await page.evaluate(() => {
    localStorage.removeItem('chordex_live_display_mode');
    localStorage.removeItem('chordex_live_visual_style');

    const store = window.useChordStore.getState();
    const testSong = {
      name: 'Stand By Me (Live Grid Test)',
      artist: 'Ben E. King',
      bpm: 118,
      key: 'A',
      chords: ['A', 'F#m', 'D', 'E'],
      sections: [
        {
          id: 'verse-1',
          name: 'Verse',
          chords: ['A', 'F#m', 'D', 'E'],
        },
        {
          id: 'chorus-1',
          name: 'Chorus',
          chords: ['A', 'F#m', 'D', 'E'],
        },
      ],
      lyrics: {
        version: 1,
        sections: [
          {
            id: 'verse-1',
            type: 'verse',
            name: 'Verse',
            lines: [
              {
                id: 'l1',
                text: 'When the night has come',
                chords: [{ id: 'c1', chord: 'A', offset: 0 }, { id: 'c2', chord: 'F#m', offset: 14 }],
              },
              {
                id: 'l2',
                text: 'And the land is dark',
                chords: [{ id: 'c3', chord: 'D', offset: 0 }, { id: 'c4', chord: 'E', offset: 12 }],
              },
            ],
          },
        ],
      },
    };

    let pId;
    const existing = store.presets.find((p) => p.name === testSong.name);
    if (existing) {
      store.updatePreset(existing.id, testSong);
      pId = existing.id;
    } else {
      pId = store.createPreset(testSong);
    }
    store.setActivePreset(pId);
    return pId;
  });
  await sleep(1000);

  // Switch to Songs tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find((b) => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1500);

  // Launch Live mode using data-testid="enter-live-mode"
  console.log('Clicking data-testid="enter-live-mode" to launch Live mode...');
  await page.evaluate(() => {
    localStorage.setItem('chordex_live_display_mode', 'chords_both');
    const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
    if (liveBtn) liveBtn.click();
  });
  await sleep(2000);

  // Capture Live Chords Grid across themes
  console.log('Capturing Live Chords Grid across themes...');
  await setTheme('dark');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'live_chords_grid_dark.png'),
  });
  console.log('Saved live_chords_grid_dark.png');

  await setTheme('light');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'live_chords_grid_light.png'),
  });
  console.log('Saved live_chords_grid_light.png');

  await setTheme('amoled');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'live_chords_grid_amoled.png'),
  });
  console.log('Saved live_chords_grid_amoled.png');

  // Test Floating Settings FAB
  console.log('Clicking Floating Settings FAB in Live Chords...');
  await page.evaluate(() => {
    const fab = document.querySelector('[data-testid="chords-grid-settings-btn"]');
    if (fab) fab.click();
  });
  await sleep(1000);

  // Capture Live Settings Sheet popup
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'live_chords_settings_sheet_amoled.png'),
  });
  console.log('Saved live_chords_settings_sheet_amoled.png');

  // Close Settings Sheet
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]') || document.querySelector('button[title*="Close"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(800);

  // Exit Live mode
  console.log('Exiting Live Mode...');
  await page.evaluate(() => {
    const exitBtn = document.querySelector('[data-testid="live-topbar-exit-btn"]') || document.querySelector('[data-testid="live-mode-back-btn"]');
    if (exitBtn) {
      exitBtn.click();
    } else {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const closeLive = allBtns.find((b) => b.getAttribute('title')?.includes('Exit') || b.textContent.includes('close') || b.textContent.includes('arrow_back'));
      if (closeLive) closeLive.click();
    }
  });
  await sleep(1500);

  // 3. TEST PDF EXPORT MODAL
  console.log('3. Opening PDF Export Modal...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="editor-back-btn"]') || document.querySelector('button[title*="Back"]');
    if (backBtn) backBtn.click();
  });
  await sleep(1200);

  // Click PDF button on the test song card
  await page.evaluate((id) => {
    const pdfBtn = document.querySelector(`[data-testid="pdf-${id}"]`);
    if (pdfBtn) {
      pdfBtn.click();
    } else {
      const allPdf = Array.from(document.querySelectorAll('button'));
      const btn = allPdf.find((b) => b.textContent && b.textContent.includes('PDF'));
      if (btn) btn.click();
    }
  }, songId);
  await sleep(2500);

  // Capture PDF Export Modal in Dark, Light, AMOLED
  console.log('Capturing PDF Export Preview across themes...');
  await setTheme('dark');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'pdf_export_canonical_diagram_dark.png'),
  });
  console.log('Saved pdf_export_canonical_diagram_dark.png');

  await setTheme('light');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'pdf_export_canonical_diagram_light.png'),
  });
  console.log('Saved pdf_export_canonical_diagram_light.png');

  await setTheme('amoled');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'pdf_export_canonical_diagram_amoled.png'),
  });
  console.log('Saved pdf_export_canonical_diagram_amoled.png');

  await browser.close();
  console.log('Puppeteer verification complete!');
}

run().catch((err) => {
  console.error('Puppeteer verification error:', err);
  process.exit(1);
});
