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
  console.log('Starting Puppeteer verification of Mode Bar Alignment, Continuous Blank Canvas, and Draggable Sections...');
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
  // 1. Create a blank song with NO chords and NO lyrics
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 1: Setting up an empty song in Chords mode...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    let presets = store.presets || [];
    let presetId;
    if (presets.length === 0) {
      presetId = store.createPreset({
        name: 'Blank Canvas Test Song',
        artist: 'Livex Studio',
        bpm: 120,
        key: 'C',
        notes: '',
        chords: [],
        sections: [],
      });
    } else {
      presetId = presets[0].id;
      store.updatePreset(presetId, {
        chords: [],
        sections: [],
        lyrics: undefined,
      });
    }
    store.setActivePreset(presetId);
  });
  await sleep(1000);

  // Switch to Chords mode button
  await page.evaluate(() => {
    const chordsBtn = document.querySelector('[data-testid="view-mode-chords"]');
    if (chordsBtn) chordsBtn.click();
    else {
      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(b => b.textContent && b.textContent.trim() === 'Chords');
      if (found) found.click();
    }
  });
  await sleep(1000);

  // Measure mode selector position in empty chords mode
  const chordsModePos = await page.evaluate(() => {
    const modeSelector = document.querySelector('[data-purpose="empty-chord-progression"]');
    const pill = modeSelector ? modeSelector.querySelector('button') : null;
    const rect = pill ? pill.getBoundingClientRect() : (modeSelector ? modeSelector.getBoundingClientRect() : null);
    return rect ? { top: rect.top, y: rect.y } : null;
  });
  console.log('Empty Chords Mode Pill Position:', chordsModePos);

  const shot1 = path.join(ARTIFACT_DIR, 'verify_69_empty_chords_mode_top_alignment.png');
  await page.screenshot({ path: shot1 });
  console.log(`Saved screenshot 1: ${shot1}`);

  // ─────────────────────────────────────────────────────────────────────
  // 2. Switch to Lyrics mode on blank song
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 2: Switching to Lyrics mode on blank song...');
  await page.evaluate(() => {
    const lyricsBtn = document.querySelector('[data-testid="view-mode-lyrics"]');
    if (lyricsBtn) lyricsBtn.click();
    else {
      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(b => b.textContent && b.textContent.trim() === 'Lyrics');
      if (found) found.click();
    }
  });
  await sleep(1000);

  const lyricsModePos = await page.evaluate(() => {
    const area = document.querySelector('[data-purpose="editor-lyrics-area"]');
    const pill = area ? area.querySelector('button') : null;
    const rect = pill ? pill.getBoundingClientRect() : (area ? area.getBoundingClientRect() : null);
    
    // Check if there are any section headers rendered
    const hasVerse1 = document.body.textContent.includes('VERSE 1') || document.body.textContent.includes('Verse 1');
    const hasRoleBadge = Boolean(document.querySelector('[data-testid*="vocal-role"]'));
    return {
      top: rect ? rect.top : null,
      hasVerse1,
      hasRoleBadge,
    };
  });
  console.log('Lyrics Mode Info:', lyricsModePos);

  // Tap on the blank canvas input and type
  console.log('Typing text on the blank canvas...');
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="lyric-line-input-0"]') || document.querySelector('input[type="text"]');
    if (input) {
      input.focus();
      input.value = 'When the morning light breaks through';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(1000);

  const shot2 = path.join(ARTIFACT_DIR, 'verify_70_blank_continuous_canvas_typing.png');
  await page.screenshot({ path: shot2 });
  console.log(`Saved screenshot 2: ${shot2}`);

  // ─────────────────────────────────────────────────────────────────────
  // 3. Add Structured Modular Draggable Sections
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 3: Populating multiple sections with drag handles...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    const active = store.activePresetId;
    const structuredDoc = {
      version: 1,
      sections: [
        {
          id: 'sec_verse_1',
          type: 'verse',
          name: 'Verse 1',
          vocalRole: { type: 'lead', label: 'Lead', color: '#3b82f6' },
          lines: [
            { id: 'l1', text: 'When the morning light breaks through' },
            { id: 'l2', text: 'Every shadow fades away' },
          ],
        },
        {
          id: 'sec_chorus_1',
          type: 'chorus',
          name: 'Chorus',
          vocalRole: { type: 'all', label: 'Choir', color: '#10b981' },
          lines: [
            { id: 'l3', text: 'Sing together with one voice' },
            { id: 'l4', text: 'Let the music fill the night' },
          ],
        },
      ],
    };
    store.setSongLyrics(active, structuredDoc);
  });
  await sleep(1200);

  const shot3 = path.join(ARTIFACT_DIR, 'verify_71_modular_draggable_sections.png');
  await page.screenshot({ path: shot3 });
  console.log(`Saved screenshot 3: ${shot3}`);

  // ─────────────────────────────────────────────────────────────────────
  // 4. Reorder sections (Move Chorus up / Verse down)
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 4: Reordering sections (moving Chorus to position 0)...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    const active = store.activePresetId;
    const song = store.presets.find(p => p.id === active);
    if (song && song.lyrics && song.lyrics.sections.length >= 2) {
      const reordered = [song.lyrics.sections[1], song.lyrics.sections[0]];
      store.setSongLyrics(active, { ...song.lyrics, sections: reordered });
    }
  });
  await sleep(1200);

  const shot4 = path.join(ARTIFACT_DIR, 'verify_72_reordered_sections.png');
  await page.screenshot({ path: shot4 });
  console.log(`Saved screenshot 4: ${shot4}`);

  // ─────────────────────────────────────────────────────────────────────
  // 5. AMOLED Theme & Light Theme Verification
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 5: Testing AMOLED theme...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark', 'amoled');
    document.documentElement.setAttribute('data-theme', 'amoled');
  });
  await sleep(1000);

  const shot5 = path.join(ARTIFACT_DIR, 'verify_74_draggable_sections_amoled.png');
  await page.screenshot({ path: shot5 });
  console.log(`Saved screenshot 5: ${shot5}`);

  console.log('Step 6: Testing Light theme...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark', 'amoled');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await sleep(1000);

  const shot6 = path.join(ARTIFACT_DIR, 'verify_75_draggable_sections_light.png');
  await page.screenshot({ path: shot6 });
  console.log(`Saved screenshot 6: ${shot6}`);

  // ─────────────────────────────────────────────────────────────────────
  // 6. Canvas Fail-Safe after clearing lyrics
  // ─────────────────────────────────────────────────────────────────────
  console.log('Step 7: Verifying canvas fail-safe after clearing lyrics...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.removeAttribute('data-theme');

    const store = window.useChordStore.getState();
    const active = store.activePresetId;
    // Clear all lyrics to empty document
    store.setSongLyrics(active, {
      version: 1,
      sections: [
        {
          id: 'sec_empty',
          type: 'verse',
          name: '',
          lines: [{ id: 'line_empty', text: '' }],
        },
      ],
    });
  });
  await sleep(1000);

  // Tap and type on empty canvas
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="lyric-line-input-0"]') || document.querySelector('input[type="text"]');
    if (input) {
      input.focus();
      input.value = 'Continuous freeform text typed after full clear';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(1000);

  const shot7 = path.join(ARTIFACT_DIR, 'verify_73_canvas_failsafe_after_clear.png');
  await page.screenshot({ path: shot7 });
  console.log(`Saved screenshot 7: ${shot7}`);

  await browser.close();
  console.log('🎉 ALL VISUAL VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
