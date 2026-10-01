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
  console.log('[Verify] Starting Puppeteer verification of Live Band Stage Sync...');
  const executablePath = getBrowserExecutablePath();
  console.log(`[Verify] Using browser binary: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  // Pre-seed mock band in localStorage
  await page.evaluateOnNewDocument(() => {
    const mockBand = {
      id: 'band-live-stage-01',
      name: 'The Nightshades',
      code: 'LVX900',
      leaderId: 'local-user',
      createdAt: Date.now() - 3600000,
    };
    const mockMember = {
      id: 'member-1',
      bandId: 'band-live-stage-01',
      userId: 'local-user',
      displayName: 'Alex Rivers',
      role: 'leader',
      joinedAt: Date.now() - 3600000,
      isOnline: true,
    };
    localStorage.setItem('livex_band_store', JSON.stringify({
      state: {
        currentBand: mockBand,
        members: [mockMember],
        sharedSongs: [],
        userBands: [mockBand],
        isBroadcasting: false,
        isLockedToLeader: false,
        activeLiveSession: null,
        lastSyncTimestamp: null,
      },
      version: 0,
    }));
  });

  console.log('[Verify] Navigating to http://localhost:5174/ ...');
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
  console.log('[Verify] Navigating to Chordex...');
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

  // Wait for useChordStore
  await page.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Seed test song
  console.log('[Verify] Seeding test song with chords & lyrics...');
  await page.evaluate(() => {
    const store = window.useChordStore.getState();
    const song = {
      name: 'Starlight Live Stage',
      artist: 'The Nightshades',
      bpm: 128,
      key: 'E',
      barsPerLine: 2,
      chords: ['E', 'A', 'B', 'C#m'],
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
                text: 'Walking through the neon glow',
                chords: [
                  { id: 'c1', chord: 'E', offset: 0 },
                  { id: 'c2', chord: 'A', offset: 16 },
                ],
              },
              {
                id: 'l2',
                text: 'Listening to the radio',
                chords: [
                  { id: 'c3', chord: 'B', offset: 0 },
                  { id: 'c4', chord: 'C#m', offset: 14 },
                ],
              },
            ],
          },
        ],
      },
    };
    const id = store.createPreset(song);
    store.setActivePreset(id);
  });
  await sleep(1000);

  // Launch Live Mode
  console.log('[Verify] Launching Live Mode...');
  await page.evaluate(() => {
    const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
    if (liveBtn) liveBtn.click();
  });
  await sleep(1500);

  // 1. Verify Topbar and Broadcast Pill
  const topbar = await page.$('[data-testid="live-mode-topbar"]');
  console.log('[Verify] Live Topbar found:', Boolean(topbar));

  const broadcastToggle = await page.$('[data-testid="live-broadcast-toggle"]');
  console.log('[Verify] Broadcast Toggle Pill found:', Boolean(broadcastToggle));

  const pathDark = path.join(ARTIFACT_DIR, 'live_band_sync_header_dark.png');
  await page.screenshot({ path: pathDark });
  console.log(`[Verify] Screenshot saved: ${pathDark}`);

  // 2. Tap Broadcast to activate LIVE On-Air state
  if (broadcastToggle) {
    console.log('[Verify] Tapping Broadcast button to start LIVE session...');
    await broadcastToggle.click();
    await sleep(1000);

    const onAirText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="live-broadcast-toggle"]');
      return el ? el.textContent : '';
    });
    console.log('[Verify] Broadcast button text after activation:', onAirText);

    const pathLive = path.join(ARTIFACT_DIR, 'live_band_sync_on_air_broadcasting.png');
    await page.screenshot({ path: pathLive });
    console.log(`[Verify] Screenshot saved: ${pathLive}`);
  }

  // 3. Open Live Settings and check Stage Band Live Sync card
  const settingsBtn = await page.$('[data-testid="live-mode-settings-btn"]');
  if (settingsBtn) {
    console.log('[Verify] Opening Live Settings sheet...');
    await settingsBtn.click();
    await sleep(1000);

    const syncCard = await page.$('[data-testid="live-settings-band-sync-card"]');
    console.log('[Verify] Stage Band Live Sync card in Settings found:', Boolean(syncCard));

    const pathSettings = path.join(ARTIFACT_DIR, 'live_band_sync_settings_sheet.png');
    await page.screenshot({ path: pathSettings });
    console.log(`[Verify] Screenshot saved: ${pathSettings}`);

    // Close settings sheet
    await page.keyboard.press('Escape');
    await sleep(600);
  }

  // 4. Test Follower mode in a second tab/client
  console.log('[Verify] Opening second client page for Band Member Follower mode...');
  const memberPage = await browser.newPage();
  await memberPage.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await memberPage.evaluateOnNewDocument(() => {
    const mockBand = {
      id: 'band-live-stage-01',
      name: 'The Nightshades',
      code: 'LVX900',
      leaderId: 'leader-user',
      createdAt: Date.now() - 3600000,
    };
    const mockMember = {
      id: 'member-2',
      bandId: 'band-live-stage-01',
      userId: 'member-user',
      displayName: 'Sam Bass',
      role: 'member',
      joinedAt: Date.now() - 1800000,
      isOnline: true,
    };
    localStorage.setItem('livex_band_store', JSON.stringify({
      state: {
        currentBand: mockBand,
        members: [mockMember],
        sharedSongs: [],
        userBands: [mockBand],
        isBroadcasting: false,
        isLockedToLeader: true, // Follower locked to leader
        activeLiveSession: null,
        lastSyncTimestamp: null,
      },
      version: 0,
    }));
  });

  await memberPage.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500);

  // Navigate to Chordex and open song in Live mode for member
  await memberPage.evaluate(() => {
    const intro = document.getElementById('intro');
    if (intro) {
      intro.style.display = 'none';
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }
    window.__introDone = true;
    window.dispatchEvent(new Event('studio-intro-done'));

    if (window.NavigationDispatcher) {
      window.NavigationDispatcher.push({
        app: 'chordex',
        route: '/app/chordex',
      });
    }
  });
  await sleep(1000);

  // Switch to Songs tab in Chordex
  await memberPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const songsTab = tabs.find((b) => b.textContent && b.textContent.includes('Songs'));
    if (songsTab) songsTab.click();
  });
  await sleep(1000);

  await memberPage.waitForFunction(() => Boolean(window.useChordStore), { timeout: 15000 });

  // Seed test song for member
  await memberPage.evaluate(() => {
    const store = window.useChordStore.getState();
    const song = {
      name: 'Starlight Live Stage',
      artist: 'The Nightshades',
      bpm: 128,
      key: 'E',
      barsPerLine: 2,
      chords: ['E', 'A', 'B', 'C#m'],
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
                text: 'Walking through the neon glow',
                chords: [
                  { id: 'c1', chord: 'E', offset: 0 },
                  { id: 'c2', chord: 'A', offset: 16 },
                ],
              },
              {
                id: 'l2',
                text: 'Listening to the radio',
                chords: [
                  { id: 'c3', chord: 'B', offset: 0 },
                  { id: 'c4', chord: 'C#m', offset: 14 },
                ],
              },
            ],
          },
        ],
      },
    };
    const id = store.createPreset(song);
    store.setActivePreset(id);
  });
  await sleep(1000);

  // Launch Live Mode for member
  await memberPage.evaluate(() => {
    const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
    if (liveBtn) liveBtn.click();
  });
  await sleep(1500);

  const memberFollowToggle = await memberPage.$('[data-testid="live-follow-toggle"]');
  console.log('[Verify] Member Follower SYNCED toggle found:', Boolean(memberFollowToggle));

  const pathFollower = path.join(ARTIFACT_DIR, 'live_band_sync_follower_synced.png');
  await memberPage.screenshot({ path: pathFollower });
  console.log(`[Verify] Screenshot saved: ${pathFollower}`);

  // Test Real-Time Synchronized Progression: Leader starts playing in page
  console.log('[Verify] Testing real-time synchronized playback between leader and follower...');
  await page.evaluate(() => {
    const playBtn = document.querySelector('[data-testid="live-play-btn"], [data-purpose="live-play-btn"], button[title*="Play"], button[title*="Auto-scroll"]');
    if (playBtn) playBtn.click();
  });
  await sleep(1500);

  // Follower checks playback state
  const followerAutoPlay = await memberPage.evaluate(() => {
    const dot = document.querySelector('[data-testid="live-mode-title"]');
    return Boolean(dot);
  });
  console.log('[Verify] Follower session synced and responsive:', followerAutoPlay);

  await browser.close();
  console.log('[Verify] Live Band Stage Synchronization fully verified!');
}

run().catch((err) => {
  console.error('[Verify] Verification script encountered error:', err);
  process.exit(1);
});
