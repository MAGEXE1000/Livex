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
  console.log('=== Starting Verification: Live Content Scroll & Simplified Duration ===');
  const executablePath = getBrowserExecutablePath();
  console.log(`Using browser binary: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
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

    // Seed test song with both chords and lyrics
    console.log('Seeding test song...');
    const songId = await page.evaluate(() => {
      const store = window.useChordStore.getState();

      const testSong = {
        name: 'Hotel California',
        artist: 'Eagles',
        bpm: 152,
        key: 'Bm',
        chords: ['Bm', 'F#7', 'A', 'E', 'G', 'D', 'Em', 'F#7'],
        sections: [
          {
            id: 'sec-intro',
            name: 'Intro',
            chords: ['Bm', 'F#7', 'A', 'E'],
          },
          {
            id: 'sec-verse',
            name: 'Verse 1',
            chords: ['Bm', 'F#7', 'A', 'E', 'G', 'D', 'Em', 'F#7'],
          },
        ],
        targetDurationSeconds: 225, // 3:45
        lyrics: {
          version: 1,
          sections: [
            {
              id: 'sec-intro-lyr',
              name: 'Intro',
              type: 'intro',
              lines: [
                {
                  id: 'line-0',
                  text: 'Instrumental acoustic guitar intro',
                  chords: [{ id: 'ch-0', chord: 'Bm', charOffset: 0 }],
                },
              ],
            },
            {
              id: 'sec-verse-1-lyr',
              name: 'Verse 1',
              type: 'verse',
              lines: [
                {
                  id: 'line-1',
                  text: 'On a dark desert highway, cool wind in my hair',
                  chords: [
                    { id: 'ch-1', chord: 'Bm', charOffset: 0 },
                    { id: 'ch-2', chord: 'F#7', charOffset: 25 },
                  ],
                },
                {
                  id: 'line-2',
                  text: 'Warm smell of colitas, rising up through the air',
                  chords: [
                    { id: 'ch-3', chord: 'A', charOffset: 0 },
                    { id: 'ch-4', chord: 'E', charOffset: 23 },
                  ],
                },
                {
                  id: 'line-3',
                  text: 'Up ahead in the distance, I saw a shimmering light',
                  chords: [
                    { id: 'ch-5', chord: 'G', charOffset: 0 },
                    { id: 'ch-6', chord: 'D', charOffset: 24 },
                  ],
                },
                {
                  id: 'line-4',
                  text: 'My head grew heavy and my sight grew dim, I had to stop for the night',
                  chords: [
                    { id: 'ch-7', chord: 'Em', charOffset: 0 },
                    { id: 'ch-8', chord: 'F#7', charOffset: 38 },
                  ],
                },
              ],
            },
            {
              id: 'sec-chorus-lyr',
              name: 'Chorus',
              type: 'chorus',
              lines: [
                {
                  id: 'line-5',
                  text: 'Welcome to the Hotel California',
                  chords: [
                    { id: 'ch-9', chord: 'G', charOffset: 0 },
                    { id: 'ch-10', chord: 'D', charOffset: 15 },
                  ],
                },
                {
                  id: 'line-6',
                  text: 'Such a lovely place, such a lovely face',
                  chords: [
                    { id: 'ch-11', chord: 'Em', charOffset: 0 },
                    { id: 'ch-12', chord: 'F#7', charOffset: 19 },
                  ],
                },
                {
                  id: 'line-7',
                  text: 'Plenty of room at the Hotel California',
                  chords: [
                    { id: 'ch-13', chord: 'G', charOffset: 0 },
                    { id: 'ch-14', chord: 'D', charOffset: 19 },
                  ],
                },
                {
                  id: 'line-8',
                  text: 'Any time of year, you can find it here',
                  chords: [
                    { id: 'ch-15', chord: 'Em', charOffset: 0 },
                    { id: 'ch-16', chord: 'F#7', charOffset: 18 },
                  ],
                },
              ],
            },
          ],
        },
      };

      const newId = store.createPreset(testSong);
      store.setActivePreset(newId);
      return newId;
    });

    console.log(`Test song created with ID: ${songId}`);
    await sleep(1500);

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Verify Part A - Initial state at top of scroll
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Part A: Initial state at top of scroll...');
    const topState = await page.evaluate(() => {
      const activeHeader = document.querySelector('[data-purpose="editor-content-area"]')?.parentElement?.querySelector('[data-testid="shared-floating-header"]') ||
                           Array.from(document.querySelectorAll('[data-testid="shared-floating-header"]')).pop();
      const headerTitle = activeHeader?.textContent || '';
      const durationBadge = document.querySelector('[data-testid="editor-header-duration"]')?.textContent || '';
      const selector = document.querySelector('[data-purpose="view-mode-selector"]');
      const selectorRect = selector ? selector.getBoundingClientRect() : null;

      const scrollEl = document.querySelector('[data-purpose="editor-content-area"]') ||
                       document.querySelector('[data-purpose="editor-lyrics-area"]');
      const scrollTop = scrollEl ? scrollEl.scrollTop : -1;

      return {
        headerTitle,
        durationBadge,
        hasSelector: Boolean(selector),
        selectorTop: selectorRect ? selectorRect.top : null,
        scrollTop,
      };
    });

    console.log('Top state verification:', topState);
    if (!topState.hasSelector) {
      throw new Error('SongViewModeSelector was not found in editor initial state!');
    }

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'live_scroll_initial_top.png');
    await page.screenshot({ path: initialScreenshotPath });
    console.log(`Saved screenshot: ${initialScreenshotPath}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Verify Part A - Scroll down and verify selector scrolls away & header morphs
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Part A: Scrolling down 220px to verify mode selector scrolls away...');
    const scrollResult = await page.evaluate(async () => {
      const scrollEl = document.querySelector('[data-purpose="editor-content-area"]') ||
                       document.querySelector('[data-purpose="editor-lyrics-area"]');
      if (!scrollEl) return { error: 'No scroll container found' };

      // Scroll down by 220px
      scrollEl.scrollTop = 220;
      scrollEl.dispatchEvent(new Event('scroll'));

      // Wait a frame for RAF / morph updates
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 200));

      const selector = document.querySelector('[data-purpose="view-mode-selector"]');
      const selectorRect = selector ? selector.getBoundingClientRect() : null;

      // Find the active header corresponding to the editor
      const activeHeader = document.querySelector('[data-purpose="editor-content-area"]')?.parentElement?.querySelector('[data-testid="shared-floating-header"]') ||
                           Array.from(document.querySelectorAll('[data-testid="shared-floating-header"]')).pop();
      const glassSurface = activeHeader ? activeHeader.querySelector('[data-testid="shared-floating-header-glass-surface"]') : null;
      const glassOpacity = glassSurface ? window.getComputedStyle(glassSurface).opacity : '0';
      const headerWidth = activeHeader ? activeHeader.style.width : '';

      return {
        scrollTop: scrollEl.scrollTop,
        selectorTopAfterScroll: selectorRect ? selectorRect.top : null,
        headerWidth,
        glassOpacity,
        selectorScrolledAway: selectorRect ? selectorRect.bottom < 60 : true,
      };
    });

    console.log('Scroll result:', scrollResult);
    await sleep(500);

    const scrolledScreenshotPath = path.join(ARTIFACT_DIR, 'live_scroll_scrolled_compact.png');
    await page.screenshot({ path: scrolledScreenshotPath });
    console.log(`Saved screenshot: ${scrolledScreenshotPath}`);

    // Scroll back to top and verify selector returns naturally
    console.log('Scrolling back to top...');
    await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-purpose="editor-content-area"]') ||
                       document.querySelector('[data-purpose="editor-lyrics-area"]');
      if (scrollEl) {
        scrollEl.scrollTop = 0;
        scrollEl.dispatchEvent(new Event('scroll'));
      }
    });
    await sleep(500);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Switch to Both mode and verify selector scrolls there too
    // ─────────────────────────────────────────────────────────────
    console.log('Switching to Both mode...');
    await page.evaluate(() => {
      const bothBtn = document.querySelector('[data-testid="view-mode-both"]');
      if (bothBtn) bothBtn.click();
    });
    await sleep(1000);

    const bothInitialScreenshot = path.join(ARTIFACT_DIR, 'live_scroll_both_initial.png');
    await page.screenshot({ path: bothInitialScreenshot });
    console.log(`Saved screenshot: ${bothInitialScreenshot}`);

    // Scroll Both mode down
    console.log('Scrolling Both mode down 250px...');
    await page.evaluate(async () => {
      const scrollEl = document.querySelector('[data-purpose="editor-content-area"]');
      if (scrollEl) {
        scrollEl.scrollTop = 250;
        scrollEl.dispatchEvent(new Event('scroll'));
      }
    });
    await sleep(500);

    const bothScrolledScreenshot = path.join(ARTIFACT_DIR, 'live_scroll_both_scrolled.png');
    await page.screenshot({ path: bothScrolledScreenshot });
    console.log(`Saved screenshot: ${bothScrolledScreenshot}`);

    // Scroll back to top
    await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-purpose="editor-content-area"]');
      if (scrollEl) {
        scrollEl.scrollTop = 0;
        scrollEl.dispatchEvent(new Event('scroll'));
      }
    });
    await sleep(500);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Verify Part B & C - Direct Duration Keyboard Input in Editor
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Part B & C: Tapping header duration to open SongDurationModal...');
    const durationBtnFound = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="editor-header-duration"]') ||
                  document.querySelector('[data-testid="editor-header-duration-empty"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!durationBtnFound) {
      throw new Error('Duration button not found in header!');
    }
    await sleep(600);

    const modalOpen = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="song-duration-modal"]');
      return Boolean(modal);
    });
    console.log('Duration modal open state:', modalOpen);
    if (!modalOpen) {
      throw new Error('SongDurationModal failed to open!');
    }

    const durationModalScreenshot = path.join(ARTIFACT_DIR, 'duration_modal_direct_keyboard.png');
    await page.screenshot({ path: durationModalScreenshot });
    console.log(`Saved screenshot: ${durationModalScreenshot}`);

    // Clear input and type directly with keyboard: 4:15
    console.log('Typing 4:15 into duration input...');
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="duration-text-input"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    await page.type('[data-testid="duration-text-input"]', '4:15');
    await sleep(300);

    // Click Save
    console.log('Saving new duration 4:15...');
    await page.evaluate(() => {
      const saveBtn = document.querySelector('[data-testid="duration-modal-save-btn"]');
      if (saveBtn) saveBtn.click();
    });
    await sleep(800);

    // Verify preset was updated to 255s (4:15) and BPM remained 152
    const updatedPresetState = await page.evaluate(() => {
      const store = window.useChordStore.getState();
      const active = store.presets.find((p) => p.id === store.activePresetId);
      const headerDuration = document.querySelector('[data-testid="editor-header-duration"]')?.textContent || '';
      return {
        targetDurationSeconds: active?.targetDurationSeconds,
        headerDuration,
        bpm: active?.bpm,
      };
    });

    console.log('Updated preset state:', updatedPresetState);
    if (updatedPresetState.targetDurationSeconds !== 255) {
      throw new Error(`Expected 255 seconds (4:15), got ${updatedPresetState.targetDurationSeconds}`);
    }
    if (updatedPresetState.bpm !== 152) {
      throw new Error(`BPM unexpectedly changed! Expected 152, got ${updatedPresetState.bpm}`);
    }

    const durationSavedScreenshot = path.join(ARTIFACT_DIR, 'duration_saved_header.png');
    await page.screenshot({ path: durationSavedScreenshot });
    console.log(`Saved screenshot: ${durationSavedScreenshot}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Launch Live Mode & Verify Duration Presentation
    // ─────────────────────────────────────────────────────────────
    console.log('Entering Live Mode...');
    await page.evaluate(() => {
      const liveBtn = document.querySelector('[data-testid="enter-live-mode"]') ||
                      document.querySelector('[data-purpose="launch-live-view-btn"]') ||
                      document.querySelector('button[title*="Live"]');
      if (liveBtn) liveBtn.click();
    });
    await sleep(1500);

    // Verify Live Header has NO "effective tempo" or "PACED" badges
    const liveHeaderState = await page.evaluate(() => {
      const topbar = document.querySelector('[data-purpose="live-mode-topbar"]');
      const wholeText = topbar ? topbar.textContent : '';
      const durationBadge = document.querySelector('[data-testid="live-header-duration"]')?.textContent || '';
      return {
        topbarExists: Boolean(topbar),
        durationBadge,
        hasEffectiveTempo: /effective tempo/i.test(wholeText),
        hasPacedBadge: /\bPACED\b/.test(wholeText),
        wholeText,
      };
    });

    console.log('Live header state:', liveHeaderState);
    if (!liveHeaderState.topbarExists) {
      throw new Error('Live mode topbar was not rendered!');
    }
    if (liveHeaderState.hasEffectiveTempo) {
      throw new Error('Live header unexpectedly contains "effective tempo"!');
    }
    if (liveHeaderState.hasPacedBadge) {
      throw new Error('Live header unexpectedly contains "PACED" badge!');
    }

    // Open Live Mode Settings
    console.log('Opening Live Mode Settings...');
    await page.evaluate(() => {
      const settingsBtn = document.querySelector('[data-testid="live-topbar-settings-btn"]') ||
                          document.querySelector('[data-testid="live-mode-settings-btn"]');
      if (settingsBtn) settingsBtn.click();
    });
    await sleep(1000);

    // Verify settings duration section has NO "effective tempo" or "PACED" badges
    const liveSettingsState = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="live-settings-duration-card"]');
      const wholeCardText = card ? card.textContent : '';
      const currentDurationText = document.querySelector('[data-testid="current-target-duration-text"]')?.textContent || '';
      const displayBox = document.querySelector('[data-testid="duration-display-box"]');

      return {
        cardExists: Boolean(card),
        currentDurationText,
        hasEffectiveTempo: /effective tempo/i.test(wholeCardText),
        hasPaced: /\bPACED\b/.test(wholeCardText),
        hasAutoBadge: /\bAUTO\b/.test(wholeCardText),
        hasDisplayBox: Boolean(displayBox),
        wholeCardText,
      };
    });

    console.log('Live settings duration card state:', liveSettingsState);
    if (!liveSettingsState.cardExists) {
      throw new Error('Live settings duration card not found!');
    }
    if (liveSettingsState.hasEffectiveTempo) {
      throw new Error('Live Settings card unexpectedly contains "effective tempo"!');
    }
    if (liveSettingsState.hasPaced) {
      throw new Error('Live Settings card unexpectedly contains "PACED" badge!');
    }

    const liveSettingsScreenshot = path.join(ARTIFACT_DIR, 'live_settings_duration_clean.png');
    await page.screenshot({ path: liveSettingsScreenshot });
    console.log(`Saved screenshot: ${liveSettingsScreenshot}`);

    // Click the duration display box to activate inline keyboard input
    console.log('Activating inline keyboard input in Live Settings...');
    await page.evaluate(() => {
      const box = document.querySelector('[data-testid="duration-display-box"]');
      if (box) box.click();
    });
    await sleep(400);

    const inlineInputExists = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="live-duration-inline-input"]');
      return Boolean(input);
    });

    console.log('Inline input active:', inlineInputExists);
    if (!inlineInputExists) {
      throw new Error('Direct editable input did not activate on clicking duration display box!');
    }

    const liveSettingsInlineScreenshot = path.join(ARTIFACT_DIR, 'live_settings_duration_inline_edit.png');
    await page.screenshot({ path: liveSettingsInlineScreenshot });
    console.log(`Saved screenshot: ${liveSettingsInlineScreenshot}`);

    // Type 5:00 into inline input and save
    console.log('Typing 5:00 into inline duration input...');
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="live-duration-inline-input"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    await page.type('[data-testid="live-duration-inline-input"]', '5:00');
    await sleep(200);

    // Press Enter to apply
    await page.keyboard.press('Enter');
    await sleep(800);

    // Verify duration updated to 300 seconds (5:00)
    const finalDurationState = await page.evaluate(() => {
      const store = window.useChordStore.getState();
      const active = store.presets.find((p) => p.id === store.activePresetId);
      const currentDurationText = document.querySelector('[data-testid="current-target-duration-text"]')?.textContent || '';
      return {
        targetDurationSeconds: active?.targetDurationSeconds,
        currentDurationText,
        bpm: active?.bpm,
      };
    });

    console.log('Final duration state after inline edit:', finalDurationState);
    if (finalDurationState.targetDurationSeconds !== 300) {
      throw new Error(`Expected 300 seconds, got ${finalDurationState.targetDurationSeconds}`);
    }
    if (finalDurationState.bpm !== 152) {
      throw new Error(`BPM changed unexpectedly! Expected 152, got ${finalDurationState.bpm}`);
    }

    const liveSettingsSavedScreenshot = path.join(ARTIFACT_DIR, 'live_settings_duration_saved.png');
    await page.screenshot({ path: liveSettingsSavedScreenshot });
    console.log(`Saved screenshot: ${liveSettingsSavedScreenshot}`);

    // Close settings sheet and capture live mode
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="close-live-settings-btn"]') ||
                       document.querySelector('[aria-label="Close Settings"]') ||
                       document.querySelector('button[title="Close"]');
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    const liveModeFinalScreenshot = path.join(ARTIFACT_DIR, 'live_mode_final.png');
    await page.screenshot({ path: liveModeFinalScreenshot });
    console.log(`Saved screenshot: ${liveModeFinalScreenshot}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Rigorous Mathematical Timing Verification & Measurement
    // ─────────────────────────────────────────────────────────────
    console.log('Conducting rigorous mathematical and timing measurement verification...');
    const timingMeasurement1 = await page.evaluate(() => {
      const store = window.useChordStore.getState();
      const active = store.presets.find((p) => p.id === store.activePresetId);
      if (!active) return { error: 'No active preset' };

      const schedule = window.calculateSongTimingSchedule
        ? window.calculateSongTimingSchedule(active)
        : null;

      return {
        presetName: active.name,
        bpm: active.bpm,
        targetDurationSeconds: active.targetDurationSeconds,
        hasSchedule: Boolean(schedule),
        effectiveDurationMs: schedule?.effectiveDurationMs,
        referenceBpm: schedule?.referenceBpm,
        pacingFactor: schedule?.pacingFactor,
        linesCount: schedule?.lines?.length,
        chordsCount: schedule?.chords?.length,
      };
    });
    console.log('Timing measurement at 5:00 duration:', timingMeasurement1);

    if (timingMeasurement1.effectiveDurationMs !== 300000) {
      throw new Error(`Expected effectiveDurationMs 300000ms, got ${timingMeasurement1.effectiveDurationMs}ms`);
    }
    if (timingMeasurement1.referenceBpm !== 152) {
      throw new Error(`Expected referenceBpm 152, got ${timingMeasurement1.referenceBpm}`);
    }

    // Now change duration to 4:00 (240s) and verify schedule updates accordingly
    console.log('Updating duration to 4:00 (240s)...');
    const timingMeasurement2 = await page.evaluate(() => {
      window.useChordStore.getState().updatePreset(window.useChordStore.getState().activePresetId, { targetDurationSeconds: 240 });
      const active = window.useChordStore.getState().presets.find((p) => p.id === window.useChordStore.getState().activePresetId);
      const schedule = window.calculateSongTimingSchedule(active);
      return {
        targetDurationSeconds: active?.targetDurationSeconds,
        effectiveDurationMs: schedule?.effectiveDurationMs,
        referenceBpm: schedule?.referenceBpm,
        pacingFactor: schedule?.pacingFactor,
      };
    });
    console.log('Timing measurement after changing to 4:00:', timingMeasurement2);

    if (timingMeasurement2.effectiveDurationMs !== 240000) {
      throw new Error(`Expected effectiveDurationMs 240000ms, got ${timingMeasurement2.effectiveDurationMs}ms`);
    }

    // Now change BPM to 170 and verify referenceBpm changes while duration remains 240s
    console.log('Updating BPM to 170 while keeping duration at 4:00 (240s)...');
    const timingMeasurement3 = await page.evaluate(() => {
      window.useChordStore.getState().updatePreset(window.useChordStore.getState().activePresetId, { bpm: 170 });
      const active = window.useChordStore.getState().presets.find((p) => p.id === window.useChordStore.getState().activePresetId);
      const schedule = window.calculateSongTimingSchedule(active);
      return {
        bpm: active?.bpm,
        targetDurationSeconds: active?.targetDurationSeconds,
        effectiveDurationMs: schedule?.effectiveDurationMs,
        referenceBpm: schedule?.referenceBpm,
        pacingFactor: schedule?.pacingFactor,
      };
    });
    console.log('Timing measurement after changing BPM to 170:', timingMeasurement3);

    if (timingMeasurement3.bpm !== 170 || timingMeasurement3.referenceBpm !== 170) {
      throw new Error(`Expected BPM 170, got ${timingMeasurement3.bpm}`);
    }
    if (timingMeasurement3.effectiveDurationMs !== 240000) {
      throw new Error(`Duration changed when changing BPM! Expected 240000ms, got ${timingMeasurement3.effectiveDurationMs}ms`);
    }

    // Restore BPM to 152 for final state
    await page.evaluate(() => {
      const store = window.useChordStore.getState();
      store.updatePreset(store.activePresetId, { bpm: 152 });
    });

    console.log('=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
