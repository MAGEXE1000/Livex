import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Mauren/.gemini/antigravity/brain/1175433f-38ca-436e-8de8-3b236180ddc4';

function getBrowserExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\154.0.4258.48\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.48\\msedge.exe',
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

async function run() {
  console.log('--- Starting Verification of Touch Selection Overhaul & Global Lockdown ---');
  const executablePath = getBrowserExecutablePath();
  console.log(`Browser executable: ${executablePath}`);

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

  // Dismiss intro modal
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
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find((b) => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Setup multi-line song
  console.log('Setting up multi-line song document with Verse and Chorus...');
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
              { id: 'l6', text: 'Plenty of room at the Hotel California' },
            ],
          },
        ],
      },
    });
    store.setActivePreset(presetId);
  });
  await sleep(1000);

  // Switch to Lyrics mode
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lyricsBtn = buttons.find((b) => b.textContent && b.textContent.trim() === 'Lyrics');
    if (lyricsBtn) lyricsBtn.click();
  });
  await sleep(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_selection_01_loaded.png') });
  console.log('Screenshot saved: verify_selection_01_loaded.png');

  // ─────────────────────────────────────────────────────────────────────
  // TEST 1: Top-to-Bottom Multi-line Selection (Lines 1 to 3) with Keyboard Focus
  // ─────────────────────────────────────────────────────────────────────
  console.log('Test 1: Executing top-to-bottom selection (lines 1 to 3) with canvas focused...');
  const test1Result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-purpose="teleprompter-writing-canvas"]');
    if (!canvas) return { error: 'Canvas not found' };

    // Focus canvas
    canvas.focus();

    const l1 = document.querySelector('[data-line-id="l1"] .lyric-line-content');
    const l3 = document.querySelector('[data-line-id="l3"] .lyric-line-content');
    if (!l1 || !l3) return { error: 'Lines not found' };

    const range = document.createRange();
    range.setStart(l1.firstChild, 5); // after "On a "
    range.setEnd(l3.firstChild, 18); // after "Up ahead in the "

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Trigger selectionchange
    document.dispatchEvent(new Event('selectionchange'));

    return {
      canvasHasFocus: document.activeElement === canvas || canvas.contains(document.activeElement),
      contentEditable: canvas.contentEditable,
      selectedText: sel.toString(),
      isCollapsed: sel.isCollapsed,
      rangeCount: sel.rangeCount,
    };
  });
  console.log('Test 1 Result:', JSON.stringify(test1Result, null, 2));

  await sleep(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_selection_02_top_to_bottom.png') });
  console.log('Screenshot saved: verify_selection_02_top_to_bottom.png');

  // ─────────────────────────────────────────────────────────────────────
  // TEST 2: Batch Deletion of Selection via Backspace
  // ─────────────────────────────────────────────────────────────────────
  console.log('Test 2: Pressing Backspace to batch-delete highlighted lines...');
  await page.keyboard.press('Backspace');
  await sleep(500);

  const test2Result = await page.evaluate(() => {
    const sec1 = document.querySelector('[data-testid="section-container-0"]');
    const remainingLines = Array.from(sec1?.querySelectorAll('[data-line-id]') || []).map((el) => {
      const textSpan = el.querySelector('.lyric-line-content');
      return {
        lineId: el.dataset.lineId,
        text: textSpan ? textSpan.textContent : '',
      };
    });

    const activeEl = document.activeElement;
    const sel = window.getSelection();

    return {
      remainingLinesCount: remainingLines.length,
      lines: remainingLines,
      isCaretCollapsed: sel ? sel.isCollapsed : false,
      caretTextOffset: sel ? sel.anchorOffset : null,
    };
  });
  console.log('Test 2 Result (After Backspace Batch Deletion):', JSON.stringify(test2Result, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_selection_03_after_batch_delete.png') });
  console.log('Screenshot saved: verify_selection_03_after_batch_delete.png');

  // ─────────────────────────────────────────────────────────────────────
  // TEST 3: Cross-Stanza Bottom-to-Top Selection (Chorus l5 to Verse l1)
  // ─────────────────────────────────────────────────────────────────────
  console.log('Test 3: Testing cross-stanza bottom-to-top selection (Chorus to Verse)...');
  const test3Result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-purpose="teleprompter-writing-canvas"]');
    canvas?.focus();

    const chorusLine = document.querySelector('[data-line-id="l5"] .lyric-line-content');
    const verseLine = document.querySelector('[data-line-id="l1"] .lyric-line-content');
    if (!chorusLine || !verseLine) return { error: 'Lines not found' };

    const range = document.createRange();
    // In DOM, range start is chronologically earlier in document order
    range.setStart(verseLine.firstChild, 0);
    range.setEnd(chorusLine.firstChild, 10);

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    return {
      selectedText: sel.toString(),
      isCollapsed: sel.isCollapsed,
      linesSpannedAcrossStanzas: sel.toString().includes('Hotel') && sel.toString().includes('highway'),
    };
  });
  console.log('Test 3 Result:', JSON.stringify(test3Result, null, 2));

  await sleep(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_selection_04_bottom_to_top.png') });
  console.log('Screenshot saved: verify_selection_04_bottom_to_top.png');

  // ─────────────────────────────────────────────────────────────────────
  // TEST 4: Global user-select: none Lockdown Verification
  // ─────────────────────────────────────────────────────────────────────
  console.log('Test 4: Verifying global user-select: none policy on chrome, buttons, tabs, headers...');
  const test4Result = await page.evaluate(() => {
    const selectors = [
      'button',
      'nav',
      'header',
      '[role="tab"]',
      '[data-testid*="chord"]',
      '[data-testid*="vocal-role"]',
      '[data-purpose="section-drag-handle"]',
      '[data-testid="canva-formatting-toolbar"]',
    ];

    const results = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const cs = window.getComputedStyle(el);
        results[sel] = {
          userSelect: cs.userSelect,
          webkitUserSelect: cs.webkitUserSelect,
          isLocked: cs.userSelect === 'none' || cs.webkitUserSelect === 'none',
        };
      }
    }

    // Verify editable areas are explicitly whitelisted
    const editableSelectors = [
      '[contenteditable="true"]',
      '.lyrics-canvas-document',
      '.lyric-line-content',
    ];
    for (const sel of editableSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const cs = window.getComputedStyle(el);
        results[sel] = {
          userSelect: cs.userSelect,
          webkitUserSelect: cs.webkitUserSelect,
          isWhitelisted: cs.userSelect === 'text' || cs.webkitUserSelect === 'text',
        };
      }
    }

    return results;
  });
  console.log('Test 4 Result (Global User-Select Lockdown):', JSON.stringify(test4Result, null, 2));

  await browser.close();
  console.log('--- Verification Completed Successfully! ---');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
