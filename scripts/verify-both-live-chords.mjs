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
  console.log('Starting Puppeteer verification of Both Live Chords rendering...');
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
    const songsTab = tabs.find((b) => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  // Wait for useChordStore
  console.log('Waiting for useChordStore...');
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Setup test presets: one with chords on lyrics, one completely empty of chords
  console.log('Seeding test song with chords on lyrics...');
  const presetIds = await page.evaluate(() => {
    // Clear any previous live display mode override from localStorage
    localStorage.removeItem('chordex_live_display_mode');
    localStorage.removeItem('chordex_live_visual_style');

    const store = window.useChordStore.getState();

    const songWithChords = {
      name: 'Amazing Grace (Both Live Test)',
      artist: 'Traditional Hymn',
      bpm: 120,
      key: 'G',
      chords: [], // progression empty to verify lyric chord harvesting
      sections: [],
      lyrics: {
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
                  { id: 'c2', chord: 'C', offset: 14 }, // 'sweet'
                  { id: 'c3', chord: 'D', offset: 24 }, // 'sound'
                ],
              },
              {
                id: 'l2',
                text: 'That saved a wretch like me',
                chords: [
                  { id: 'c4', chord: 'G', offset: 0 },
                  { id: 'c5', chord: 'Em', offset: 13 },
                ],
              },
            ],
          },
        ],
      },
    };

    const songEmptyChords = {
      name: 'Acoustic Intro (No Chords)',
      artist: 'Livex Studio',
      bpm: 90,
      key: 'C',
      chords: [],
      sections: [],
      lyrics: {
        version: 1,
        sections: [
          {
            id: 'sec_v_empty',
            type: 'verse',
            name: 'Intro',
            lines: [
              {
                id: 'l_empty',
                text: 'Gentle acoustic ambient prelude',
                chords: [],
              },
            ],
          },
        ],
      },
    };

    const pWithChordsId = store.createPreset(songWithChords);
    const pEmptyId = store.createPreset(songEmptyChords);

    // Set songWithChords as active
    store.setActivePreset(pWithChordsId);

    return { pWithChordsId, pEmptyId };
  });

  console.log('Preset created:', presetIds);
  await sleep(1500);

  // Wait for SongViewModeSelector to appear
  console.log('Waiting for SongViewModeSelector...');
  try {
    await page.waitForSelector('[data-testid="view-mode-both"]', { timeout: 8000 });
    console.log('Clicking Both view mode in selector...');
    await page.click('[data-testid="view-mode-both"]');
    await sleep(800);
  } catch (e) {
    console.log('view-mode-both selector not immediately visible, searching buttons...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.getAttribute('data-testid')?.includes('both') || el.textContent?.trim() === 'Both');
      if (b) b.click();
    });
    await sleep(800);
  }

  // Click Enter Live Mode button
  console.log('Clicking Enter Live Mode button...');
  await page.evaluate(() => {
    const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
    if (liveBtn) liveBtn.click();
  });
  await sleep(1500);

  // Check if Both mode is active, if not switch via Settings sheet
  let headerSubtitle = await page.evaluate(() => {
    const sub = document.querySelector('[data-testid="live-mode-subtitle"]');
    return sub ? sub.textContent : '';
  });
  console.log(`Live header subtitle: "${headerSubtitle}"`);

  if (!headerSubtitle.includes('CHORDS + LYRICS')) {
    console.log('Switching to Both mode via Live Settings...');
    await page.evaluate(() => {
      const settingsBtn = document.querySelector('[data-testid="live-topbar-settings-btn"]');
      if (settingsBtn) settingsBtn.click();
    });
    await sleep(800);

    await page.evaluate(() => {
      const bothOpt = document.querySelector('[data-testid="live-settings-mode-both"]');
      if (bothOpt) bothOpt.click();
    });
    await sleep(500);

    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]');
      if (closeBtn) closeBtn.click();
    });
    await sleep(800);

    headerSubtitle = await page.evaluate(() => {
      const sub = document.querySelector('[data-testid="live-mode-subtitle"]');
      return sub ? sub.textContent : '';
    });
    console.log(`Updated Live header subtitle: "${headerSubtitle}"`);
  }

  // Verify Stage Chord Card is present and renders "G"
  const stageChordInfo = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="stage-chord-card"]');
    const words = Array.from(document.querySelectorAll('.lyric-word')).map((w) => w.textContent?.trim());
    if (!card) return { card: null, words };
    return {
      text: card.textContent?.trim(),
      visualStyle: card.getAttribute('data-visual-style'),
      hasDots: Boolean(card.querySelector('.fret-dot')),
      words,
    };
  });
  console.log('Initial Stage Chord Card & Words:', stageChordInfo);

  // Capture Screenshot 1: both_live_active_chord_start.png
  console.log('Capturing Screenshot 1: both_live_active_chord_start.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_active_chord_start.png'),
    fullPage: false,
  });

  // Advance to "sweet" word (which has C chord attached)
  console.log('Tapping on lyric word "sweet" to transition to C chord...');
  const clickedWord = await page.evaluate(() => {
    const words = Array.from(document.querySelectorAll('.lyric-word'));
    const sweetWord = words.find((w) => w.textContent && w.textContent.includes('sweet'));
    if (sweetWord) {
      sweetWord.click();
      return true;
    }
    return false;
  });
  console.log(`Clicked "sweet" word: ${clickedWord}`);
  await sleep(1000);

  // Verify Stage Chord Card transitioned to "C"
  const stageChordAfterWord = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="stage-chord-card"]');
    if (!card) return null;
    return {
      text: card.textContent?.trim(),
      visualStyle: card.getAttribute('data-visual-style'),
    };
  });
  console.log('Stage Chord Card after navigating to "sweet":', stageChordAfterWord);

  // Capture Screenshot 2: both_live_progressed_next_chord.png
  console.log('Capturing Screenshot 2: both_live_progressed_next_chord.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_progressed_next_chord.png'),
    fullPage: false,
  });

  // Open Live Settings
  console.log('Opening Live Settings sheet to test Chords Focus...');
  await page.evaluate(() => {
    const settingsBtn =
      document.querySelector('[data-testid="live-topbar-settings-btn"]') ||
      document.querySelector('[data-testid="hybrid-live-settings-btn"]');
    if (settingsBtn) settingsBtn.click();
  });
  await sleep(1000);

  // Setting Chords Focus to Diagram + Name
  console.log('Setting Chords Focus to Diagram + Name...');
  await page.evaluate(() => {
    const optBoth = document.querySelector('[data-testid="mode-option-chords_both"]');
    if (optBoth) optBoth.click();
  });
  await sleep(500);

  // Close settings
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // Capture Screenshot 3: both_live_focus_diagram_name.png
  console.log('Capturing Screenshot 3: both_live_focus_diagram_name.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_focus_diagram_name.png'),
    fullPage: false,
  });

  // Open settings again and set Chords Focus to Diagram Only
  console.log('Setting Chords Focus to Diagram Only...');
  await page.evaluate(() => {
    const settingsBtn =
      document.querySelector('[data-testid="live-topbar-settings-btn"]') ||
      document.querySelector('[data-testid="hybrid-live-settings-btn"]');
    if (settingsBtn) settingsBtn.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const optDiagram = document.querySelector('[data-testid="mode-option-chords_diagram"]');
    if (optDiagram) optDiagram.click();
  });
  await sleep(500);

  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // Capture Screenshot 4: both_live_focus_diagram_only.png
  console.log('Capturing Screenshot 4: both_live_focus_diagram_only.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_focus_diagram_only.png'),
    fullPage: false,
  });

  // Open settings and set Chords Focus to Name Only
  console.log('Setting Chords Focus to Name Only...');
  await page.evaluate(() => {
    const settingsBtn =
      document.querySelector('[data-testid="live-topbar-settings-btn"]') ||
      document.querySelector('[data-testid="hybrid-live-settings-btn"]');
    if (settingsBtn) settingsBtn.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const optName = document.querySelector('[data-testid="mode-option-chords_name"]');
    if (optName) optName.click();
  });
  await sleep(500);

  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // Capture Screenshot 5: both_live_focus_name_only.png
  console.log('Capturing Screenshot 5: both_live_focus_name_only.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_focus_name_only.png'),
    fullPage: false,
  });

  // Exit Live Mode
  console.log('Exiting Live Mode to test empty chord song...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="live-mode-back-btn"]');
    if (backBtn) backBtn.click();
  });
  await sleep(1000);

  // Activate song with no chords
  console.log('Activating song with no chords...');
  await page.evaluate((emptyId) => {
    const store = window.useChordStore.getState();
    store.setActivePreset(emptyId);
  }, presetIds.pEmptyId);
  await sleep(1000);

  // Enter Live Mode for empty song
  console.log('Entering Live Mode for empty song...');
  await page.evaluate(() => {
    const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
    if (liveBtn) liveBtn.click();
  });
  await sleep(1500);

  // If needed, switch to Both mode
  await page.evaluate(() => {
    const settingsBtn = document.querySelector('[data-testid="live-topbar-settings-btn"]');
    if (settingsBtn) settingsBtn.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const bothOpt = document.querySelector('[data-testid="live-settings-mode-both"]');
    if (bothOpt && !bothOpt.disabled) bothOpt.click();
  });
  await sleep(500);

  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // Verify clean empty state is rendered
  const emptyStateInfo = await page.evaluate(() => {
    const emptyCard = document.querySelector('[data-testid="stage-chord-empty"]');
    return {
      rendered: Boolean(emptyCard),
      text: emptyCard ? emptyCard.textContent?.trim() : null,
    };
  });
  console.log('Empty state info:', emptyStateInfo);

  // Capture Screenshot 6: both_live_empty_state.png
  console.log('Capturing Screenshot 6: both_live_empty_state.png ...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'both_live_empty_state.png'),
    fullPage: false,
  });

  console.log('All 6 verification scenarios executed and captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error during Both Live chords verification:', err);
  process.exit(1);
});
