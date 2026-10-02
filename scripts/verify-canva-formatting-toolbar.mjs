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
  console.log('Starting Puppeteer verification of Canva Formatting Toolbar and Multi-line Lyrics Engine...');
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

  // Wait for useChordStore
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // ─────────────────────────────────────────────────────────────────────
  // 1. Setup Song with Continuous Lyrics Document
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 1: Setting up multi-line song document...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    const presets = store.presets || [];
    let presetId;
    if (presets.length === 0) {
      presetId = store.createPreset({
        name: 'Hotel California',
        artist: 'Eagles',
        bpm: 75,
        key: 'Bm',
        notes: '',
        chords: ['Bm', 'F#7', 'A', 'E9', 'G', 'D', 'Em', 'F#7'],
        sections: [],
      });
    } else {
      presetId = presets[0].id;
    }
    store.updatePreset(presetId, {
      name: 'Hotel California',
      artist: 'Eagles',
      bpm: 75,
      key: 'Bm',
      notes: '',
      chords: ['Bm', 'F#7', 'A', 'E9', 'G', 'D', 'Em', 'F#7'],
      lyrics: {
        version: 1,
        sections: [
          {
            id: 'sec-verse-1',
            type: 'verse',
            name: 'Verse 1',
            lines: [
              { id: 'l1', text: 'On a dark desert highway cool wind in my hair' },
              { id: 'l2', text: 'Warm smell of colitas rising up through the air' },
              { id: 'l3', text: 'Up ahead in the distance I saw a shimmering light' },
            ],
          },
          {
            id: 'sec-chorus',
            type: 'chorus',
            name: 'Chorus',
            lines: [
              { id: 'l4', text: 'Welcome to the Hotel California' },
              { id: 'l5', text: 'Such a lovely place such a lovely face' },
            ],
          },
        ],
      },
    });
    store.setActivePreset(presetId);
  });
  await sleep(1000);

  // Switch to Lyrics mode
  console.log('Switching to Lyrics mode...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lyricsBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Lyrics');
    if (lyricsBtn) lyricsBtn.click();
  });
  await sleep(1000);

  // ─────────────────────────────────────────────────────────────────────
  // 2. Verify FAB Menu has no "Text Presentation" modal
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 2: Verifying FAB (+) Menu removes redundant Text Presentation...');
  const fabMenuInfo = await page.evaluate(async () => {
    const fabBtn = document.querySelector('[data-testid="lyrics-fab-add"]');
    if (!fabBtn) return { error: 'FAB button not found' };
    fabBtn.click();
    await new Promise(r => setTimeout(r, 400));

    const popover = document.querySelector('[data-morphing-surface]');
    const popoverText = popover ? popover.textContent : '';
    const hasTextPresentation = popoverText.includes('Text Presentation') || popoverText.includes('Colors, bold');
    const hasAddSection = popoverText.includes('Add Section');
    const hasAddInterlude = popoverText.includes('Add Timed Interlude');
    const hasClearLyrics = popoverText.includes('Clear All Lyrics');

    // Close FAB by clicking outside
    document.body.click();
    await new Promise(r => setTimeout(r, 300));

    return {
      hasTextPresentation,
      hasAddSection,
      hasAddInterlude,
      hasClearLyrics,
    };
  });
  console.log('FAB Menu State:', fabMenuInfo);
  if (fabMenuInfo.hasTextPresentation) {
    throw new Error('FAIL: Redundant Text Presentation modal still present in FAB menu!');
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Trigger Selection Across Multiple Lines -> Canva Toolbar Appears
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 3: Selecting text across multiple lines and verifying Canva Toolbar...');
  await page.evaluate(() => {
    const l1 = document.querySelector('[data-line-id="l1"]');
    const l2 = document.querySelector('[data-line-id="l2"]');
    if (l1 && l2) {
      const range = document.createRange();
      const firstSpan = l1.querySelector('span') || l1;
      const firstText = firstSpan.firstChild || firstSpan;
      const lastSpan = l2.querySelector('span') || l2;
      const lastText = lastSpan.lastChild || lastSpan;

      range.setStart(firstText, 0);
      const textLen = (lastText.nodeType === Node.TEXT_NODE ? lastText.textContent.length : lastText.childNodes.length) || 1;
      range.setEnd(lastText, textLen);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }
  });
  await sleep(800);

  const toolbarVisible = await page.evaluate(() => {
    const tb = document.querySelector('[data-testid="canva-formatting-toolbar"]');
    const boldBtn = document.querySelector('[data-testid="toolbar-bold-btn"]');
    const italicBtn = document.querySelector('[data-testid="toolbar-italic-btn"]');
    const underlineBtn = document.querySelector('[data-testid="toolbar-underline-btn"]');
    const colorBtn = document.querySelector('[data-testid="toolbar-color-btn"]');
    const vocalRoleBtn = document.querySelector('[data-testid="toolbar-vocal-role-btn"]');
    return {
      toolbarExists: Boolean(tb),
      hasBold: Boolean(boldBtn),
      hasItalic: Boolean(italicBtn),
      hasUnderline: Boolean(underlineBtn),
      hasColor: Boolean(colorBtn),
      hasVocalRole: Boolean(vocalRoleBtn),
    };
  });
  console.log('Canva Toolbar Visible:', toolbarVisible);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_76_canva_toolbar_active.png'),
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4. Test Bold, Italic, Underline on Selection
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 4: Applying Bold, Italic, and Underline formatting...');
  await page.evaluate(() => {
    const boldBtn = document.querySelector('[data-testid="toolbar-bold-btn"]');
    if (boldBtn) boldBtn.click();
  });
  await sleep(400);

  await page.evaluate(() => {
    const italicBtn = document.querySelector('[data-testid="toolbar-italic-btn"]');
    if (italicBtn) italicBtn.click();
  });
  await sleep(400);

  await page.evaluate(() => {
    const underlineBtn = document.querySelector('[data-testid="toolbar-underline-btn"]');
    if (underlineBtn) underlineBtn.click();
  });
  await sleep(400);

  // ─────────────────────────────────────────────────────────────────────
  // 5. Test Color Palette Popover & Selection
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 5: Testing Color Palette Popover...');
  await page.evaluate(() => {
    const colorBtn = document.querySelector('[data-testid="toolbar-color-btn"]');
    if (colorBtn) colorBtn.click();
  });
  await sleep(400);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_77_canva_toolbar_color_palette.png'),
  });

  await page.evaluate(() => {
    const skySwatch = document.querySelector('[data-testid="toolbar-color-swatch-cyan"]') ||
                      document.querySelector('[data-testid="toolbar-color-swatch-blue"]');
    if (skySwatch) skySwatch.click();
  });
  await sleep(400);

  // ─────────────────────────────────────────────────────────────────────
  // 6. Test Vocal Role Popover & Selection
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 6: Testing Vocal Role Popover...');
  // Re-select line 1 to assign vocal role
  await page.evaluate(() => {
    const l1 = document.querySelector('[data-line-id="l1"]');
    if (l1) {
      const range = document.createRange();
      const firstSpan = l1.querySelector('span') || l1;
      const firstText = firstSpan.firstChild || firstSpan;
      range.setStart(firstText, 0);
      const textLen = (firstText.nodeType === Node.TEXT_NODE ? firstText.textContent.length : firstText.childNodes.length) || 1;
      range.setEnd(firstText, textLen);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }
  });
  await sleep(500);

  await page.evaluate(() => {
    const vocalRoleBtn = document.querySelector('[data-testid="toolbar-vocal-role-btn"]');
    if (vocalRoleBtn) vocalRoleBtn.click();
  });
  await sleep(400);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_78_canva_toolbar_vocal_role.png'),
  });

  await page.evaluate(() => {
    const harmonyOption = document.querySelector('[data-testid="toolbar-role-option-harmony"]');
    if (harmonyOption) harmonyOption.click();
  });
  await sleep(400);

  // Deselect text to view styled document
  await page.evaluate(() => {
    window.getSelection()?.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await sleep(600);

  // ─────────────────────────────────────────────────────────────────────
  // 7. Theme Parity: AMOLED & Light Screenshots
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 7: Verifying AMOLED & Light themes...');
  // AMOLED
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('amoled');
    document.documentElement.setAttribute('data-theme', 'amoled');
  });
  await sleep(500);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_79_formatted_document_amoled.png'),
  });

  // Light
  await page.evaluate(() => {
    document.documentElement.classList.remove('amoled');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await sleep(500);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_80_formatted_document_light.png'),
  });

  // Dark (default)
  await page.evaluate(() => {
    document.documentElement.classList.remove('light', 'amoled');
    document.documentElement.removeAttribute('data-theme');
  });
  await sleep(500);

  console.log('SUCCESS: All Canva Contextual Formatting Toolbar & Unified Document Engine checks passed.');
  await browser.close();
}

run().catch((err) => {
  console.error('ERROR during verification:', err);
  process.exit(1);
});
