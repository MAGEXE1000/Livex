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
  console.log('Starting Puppeteer verification of Chord Insertion Flow...');
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

  // Dismiss intro if needed
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

  // Switch to Songs tab in Chordex
  console.log('Switching to Songs tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find(b => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  // Wait for useChordStore to be available
  console.log('Waiting for useChordStore...');
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Initialize song preset with clean lyrics ("Amazing grace how sweet the sound")
  console.log('Initializing song preset with lyrics in useChordStore...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    const sampleLyrics = {
      version: 1,
      sections: [
        {
          id: 'sec_v1',
          type: 'verse',
          name: 'Verse 1',
          lines: [
            {
              id: 'l1',
              text: 'Amazing grace how sweet the sound',
              chords: []
            },
            {
              id: 'l2',
              text: 'That saved a wretch like me',
              chords: []
            }
          ]
        }
      ]
    };

    let presets = store.presets || [];
    let presetId;
    if (presets.length === 0) {
      presetId = store.createPreset({
        name: 'Amazing Grace',
        artist: 'John Newton',
        bpm: 120,
        key: 'G',
        notes: 'Classic hymn',
        chords: ['G', 'C', 'D', 'Em'],
        sections: [
          {
            id: 'sec-1',
            name: 'Verse 1',
            chords: ['G', 'C', 'G', 'D']
          }
        ]
      });
    } else {
      presetId = presets[0].id;
    }

    store.setActivePreset(presetId);
    store.setSongLyrics(presetId, sampleLyrics);
  });
  await sleep(1500);

  // Switch to Both mode
  console.log('Switching to Both view mode...');
  await page.evaluate(() => {
    const bothBtn = document.querySelector('[data-testid="view-mode-both"]');
    if (bothBtn) {
      bothBtn.click();
    } else {
      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(b => b.textContent && b.textContent.trim() === 'Both');
      if (found) found.click();
    }
  });
  await sleep(1500);

  // Verify workspace is rendered
  await page.waitForSelector('[data-testid="song-lyrics-editor-workspace"]', { timeout: 10000 });

  // ── STEP 1: Capture chord_entry_clean_toolbar.png ──
  console.log('Capturing chord_entry_clean_toolbar.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_entry_clean_toolbar.png'),
    fullPage: false,
  });

  // ── STEP 2: Open compact chords popover via blue Chords FAB ──
  console.log('Clicking blue Chords FAB to open compact popover...');
  const chordsFab = await page.waitForSelector('[data-testid="both-toolbar-chords-btn"]', { timeout: 5000 });
  await chordsFab.click();
  await sleep(600);

  await page.waitForSelector('[data-testid="both-chords-popover"]', { timeout: 5000 });
  console.log('Capturing chord_picker_compact_opened.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_picker_compact_opened.png'),
    fullPage: false,
  });

  // ── STEP 3: Open Full Canonical Chord Library Modal ──
  console.log('Clicking "Browse Full Library..." button...');
  const browseBtn = await page.waitForSelector('[data-testid="toolbar-chord-btn"]', { timeout: 5000 });
  await browseBtn.click();
  await sleep(800);

  await page.waitForSelector('[data-testid="chord-library-dialog"]', { timeout: 5000 });
  console.log('Capturing chord_full_library_opened.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_full_library_opened.png'),
    fullPage: false,
  });

  // ── STEP 4: Search inside Full Chord Library ──
  console.log('Searching for "sus4" in Chord Library...');
  const searchInput = await page.waitForSelector('[data-testid="chord-library-search-input"]', { timeout: 5000 });
  await searchInput.type('sus4', { delay: 50 });
  await sleep(800);

  console.log('Capturing chord_full_library_searched.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_full_library_searched.png'),
    fullPage: false,
  });

  // ── STEP 5: Attach chord from Library at exact target position ──
  console.log('Clearing search via clear button...');
  const clearSearchBtn = await page.waitForSelector('[data-testid="chord-library-search-clear-btn"]', { timeout: 3000 });
  await clearSearchBtn.click();
  await sleep(600);

  // Click on chord card G in library
  console.log('Selecting chord G from library to attach to targeted position...');
  const chordCard = await page.waitForSelector('[data-testid="library-chord-G"]', { timeout: 5000 });
  await chordCard.click();
  await sleep(1000);

  console.log('Capturing chord_attached_exact_position.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_attached_exact_position.png'),
    fullPage: false,
  });

  // ── STEP 6: Target word "sweet" and attach chord C via quick popover ──
  console.log('Targeting word "sweet" via direct tap...');
  const sweetWord = await page.waitForSelector('[data-testid="lyric-word-sweet"]', { timeout: 5000 });
  await sweetWord.click();
  await sleep(600);

  // Click blue Chords FAB
  console.log('Opening Chords popover for targeted word "sweet"...');
  const chordsFab2 = await page.waitForSelector('[data-testid="both-toolbar-chords-btn"]');
  await chordsFab2.click();
  await sleep(600);

  // Select quick chord "C"
  console.log('Selecting quick chord C...');
  const quickChordC = await page.waitForSelector('[data-testid="quick-chord-C"]', { timeout: 5000 });
  await quickChordC.click();
  await sleep(1000);

  // Target word "sound" and attach chord D
  console.log('Targeting word "sound" via direct tap...');
  const soundWord = await page.waitForSelector('[data-testid="lyric-word-sound"]', { timeout: 5000 });
  await soundWord.click();
  await sleep(600);

  const chordsFab3 = await page.waitForSelector('[data-testid="both-toolbar-chords-btn"]');
  await chordsFab3.click();
  await sleep(600);

  console.log('Selecting quick chord D...');
  const quickChordD = await page.waitForSelector('[data-testid="quick-chord-D"]', { timeout: 5000 });
  await quickChordD.click();
  await sleep(1000);

  console.log('Capturing chord_multiple_positions_attached.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_multiple_positions_attached.png'),
    fullPage: false,
  });

  // ── STEP 7: Verify persistence after reload ──
  console.log('Reloading page to verify persistence...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);

  // Dismiss intro if needed
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

  // Navigate back to Chordex Songs
  await page.evaluate(() => {
    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({
        app: 'chordex',
        route: '/app/chordex',
      });
    }
  });
  await sleep(1500);

  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find(b => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  await page.evaluate(() => {
    const store = window.useChordStore ? window.useChordStore.getState() : null;
    if (store) {
      const presets = store.presets || [];
      if (presets.length > 0 && !store.activePresetId) {
        store.setActivePreset(presets[0].id);
      }
    }
  });
  await sleep(1000);

  await page.evaluate(() => {
    const bothBtn = document.querySelector('[data-testid="view-mode-both"]');
    if (bothBtn) {
      bothBtn.click();
    } else {
      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(b => b.textContent && b.textContent.trim().toLowerCase() === 'both');
      if (found) found.click();
    }
  });
  await sleep(1500);

  console.log('Capturing chord_persisted_after_reload.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'chord_persisted_after_reload.png'),
    fullPage: false,
  });

  console.log('All verification steps completed successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
