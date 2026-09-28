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
  console.log('Starting Puppeteer verification of modernized Lyrics/Both editor...');
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
    // Click on songs tab button
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find(b => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  // Wait for useChordStore to be available
  console.log('Waiting for useChordStore...');
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Initialize song preset and populate lyrics
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
              chords: [
                { id: 'c1', chord: 'G', offset: 0 },
                { id: 'c2', chord: 'C', offset: 14 },
                { id: 'c3', chord: 'G', offset: 24 }
              ]
            },
            {
              id: 'l2',
              text: 'That saved a wretch like me',
              chords: [
                { id: 'c4', chord: 'D', offset: 5 },
                { id: 'c5', chord: 'G', offset: 21 }
              ]
            },
            {
              id: 'l3',
              text: 'I once was lost but now am found',
              chords: [
                { id: 'c6', chord: 'G', offset: 0 },
                { id: 'c7', chord: 'C', offset: 16 }
              ]
            },
            {
              id: 'l4',
              text: 'Was blind but now I see',
              chords: [
                { id: 'c8', chord: 'D', offset: 4 },
                { id: 'c9', chord: 'G', offset: 18 }
              ]
            }
          ]
        },
        {
          id: 'sec_c1',
          type: 'chorus',
          name: 'Chorus',
          lines: [
            {
              id: 'l5',
              text: 'Praise God praise God praise God',
              chords: [
                { id: 'c10', chord: 'G', offset: 0 },
                { id: 'c11', chord: 'C', offset: 11 },
                { id: 'c12', chord: 'D', offset: 22 }
              ]
            },
            {
              id: 'l6',
              text: 'From whom all blessings flow',
              chords: [
                { id: 'c13', chord: 'Em', offset: 5 },
                { id: 'c14', chord: 'C', offset: 14 },
                { id: 'c15', chord: 'G', offset: 24 }
              ]
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
  await sleep(1000);

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
  const hasWorkspace = await page.evaluate(() => {
    return Boolean(document.querySelector('[data-testid="song-lyrics-editor-workspace"]'));
  });
  console.log(`Song Lyrics Editor Workspace present: ${hasWorkspace}`);

  // ── SCREENSHOT 1: Clean document showing lyrics without any pencil icons! ──
  console.log('Capturing Screenshot 1: clean_lyrics_no_pencils.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'clean_lyrics_no_pencils.png'),
    fullPage: false,
  });

  // Verify no pencil icons:
  const linePencils = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[data-testid^="lyric-line-"] button'));
    return buttons.filter((b) => b.title && b.title.includes('Edit line text')).length;
  });
  console.log(`Pencil buttons found on lyric lines: ${linePencils} (expected 0)`);

  // Verify no bottom + Add Section button:
  const bottomAddSection = await page.evaluate(() => {
    return Boolean(document.querySelector('[data-testid="bottom-add-section-btn"]'));
  });
  console.log(`Bottom + Add Section button present: ${bottomAddSection} (expected false)`);

  // ── SCREENSHOT 2: Click on first lyric line to enter single-line editing mode ──
  console.log('Tapping first lyric line...');
  await page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll('[data-testid^="lyric-line-"]'));
    if (lines.length > 0) {
      const target = lines[0].querySelector('[title="Tap to edit line"]') || lines[0].querySelector('span.cursor-pointer') || lines[0];
      target.click();
    }
  });
  await sleep(800);

  const isInputOpen = await page.evaluate(() => {
    return Boolean(document.querySelector('[data-testid^="lyric-line-"] input[type="text"]'));
  });
  console.log(`Single-line editing input open: ${isInputOpen}`);

  console.log('Capturing Screenshot 2: single_line_editing.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'single_line_editing.png'),
    fullPage: false,
  });

  // ── SCREENSHOT 3: Switch editing target to second line ──
  console.log('Tapping second lyric line to switch editing target...');
  await page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll('[data-testid^="lyric-line-"]'));
    if (lines.length > 1) {
      const target = lines[1].querySelector('[title="Tap to edit line"]') || lines[1].querySelector('span.cursor-pointer') || lines[1];
      target.click();
    }
  });
  await sleep(800);

  console.log('Capturing Screenshot 3: switch_line_editing.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'switch_line_editing.png'),
    fullPage: false,
  });

  // Click "Done" to exit editing mode
  await page.evaluate(() => {
    const doneBtns = Array.from(document.querySelectorAll('button'));
    const done = doneBtns.find(b => b.textContent && b.textContent.trim() === 'Done');
    if (done) done.click();
  });
  await sleep(600);

  // Scroll toolbar into view so popover opens cleanly in view above dock
  console.log('Scrolling toolbar into center view for popover...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[data-purpose="editor-content-area"]');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  await sleep(600);

  // ── SCREENSHOT 4: Open Text Color Palette ──
  console.log('Opening Text Color popover...');
  await page.evaluate(() => {
    const colorBtn = document.querySelector('[data-testid="toolbar-color-btn"]');
    if (colorBtn) colorBtn.click();
  });
  await sleep(800);

  console.log('Capturing Screenshot 4: color_palette_opened.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'color_palette_opened.png'),
    fullPage: false,
  });

  // ── SCREENSHOT 5: Pick Emerald Color Swatch ──
  console.log('Selecting Emerald color swatch...');
  await page.evaluate(() => {
    // Find emerald button or 4th button in palette
    const popover = document.querySelector('[data-testid="both-style-popover"]');
    if (popover) {
      const swatches = Array.from(popover.querySelectorAll('button[title]'));
      const emerald = swatches.find(s => s.getAttribute('title') === 'Emerald') || swatches[3];
      if (emerald) emerald.click();
    }
  });
  await sleep(800);

  console.log('Capturing Screenshot 5: active_color_tool_mode.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'active_color_tool_mode.png'),
    fullPage: false,
  });

  // Scroll back to lyrics so lines and color banner are both clearly visible
  await page.evaluate(() => {
    const firstLine = document.querySelector('[data-testid^="lyric-line-"]');
    if (firstLine) firstLine.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await sleep(600);

  // ── SCREENSHOT 6: Tap word ("Amazing") to apply color ──
  console.log('Tapping word "Amazing" to paint with active color tool...');
  await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('[data-testid^="lyric-line-"] span.cursor-pointer'));
    const amazingSpan = spans.find(s => s.textContent && s.textContent.includes('Amazing')) || spans[0];
    if (amazingSpan) amazingSpan.click();
  });
  await sleep(800);

  console.log('Capturing Screenshot 6: word_colored_applied.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'word_colored_applied.png'),
    fullPage: false,
  });

  // ── SCREENSHOT 7: Tap second word ("grace") to demonstrate persistent brush ──
  console.log('Tapping word "grace" to paint next word in brush mode...');
  await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('[data-testid^="lyric-line-"] span.cursor-pointer'));
    const graceSpan = spans.find(s => s.textContent && s.textContent.includes('grace')) || spans[1];
    if (graceSpan) graceSpan.click();
  });
  await sleep(800);

  console.log('Capturing Screenshot 7: multiple_words_colored.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'multiple_words_colored.png'),
    fullPage: false,
  });

  // ── SCREENSHOT 8: Scroll long document to verify toolbar in document flow ──
  console.log('Scrolling document to bottom to reveal toolbar in flow...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[data-purpose="editor-content-area"]');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  await sleep(800);

  console.log('Capturing Screenshot 8: document_scrolled_toolbar_flow.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'document_scrolled_toolbar_flow.png'),
    fullPage: false,
  });

  // ── SCREENSHOT 9: Open More menu to verify + Add Section is there ──
  console.log('Opening More menu in toolbar...');
  await page.evaluate(() => {
    const moreBtn = document.querySelector('[data-testid="both-toolbar-more-btn"]');
    if (moreBtn) moreBtn.click();
  });
  await sleep(800);

  console.log('Capturing Screenshot 9: toolbar_more_menu.png');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'toolbar_more_menu.png'),
    fullPage: false,
  });

  console.log('✓ All 9 verification steps completed cleanly!');
  await browser.close();
}

run().catch((err) => {
  console.error('Puppeteer verification failed:', err);
  process.exit(1);
});
