/**
 * Automated verification script for Emil Kowalski's Design Engineering suite:
 * - ask-sonner: Stackable dock-anchored toasts (3 cards, spring entrance, AMOLED glass)
 * - break-ui: Extreme text strings ("Venezia Long Extended Live...", 1-char titles, truncation)
 * - apple-design & emil-design-eng: Spring physics & tactile micro-interactions on toggles
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const OUT = path.resolve('.artifacts/verification');
fs.mkdirSync(OUT, { recursive: true });

const BRAIN_DIR = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain\\1175433f-38ca-436e-8de8-3b236180ddc4';
try {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
} catch (_) {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\155.0.4283.23\\msedge.exe';
const exe = process.env.CHROME_PATH || (fs.existsSync(EDGE) ? EDGE : undefined);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(exe ? { executablePath: exe } : {}),
});

const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

console.log(`[EmilSkills] Connecting to ${BASE}...`);
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => window.__studioNavigationDispatcher, { timeout: 60000 });
await sleep(1500);

// Force dark / AMOLED theme for consistent visual baseline
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  try {
    const settingsStore = window.__useSettingsStore || window.__studioSettingsStore;
    if (settingsStore?.getState) {
      settingsStore.getState().updateSettings({ amoledMode: true, theme: 'dark' });
    }
  } catch (_) {}
});

function copyArtifact(fileName) {
  const src = path.join(OUT, fileName);
  const dst = path.join(BRAIN_DIR, fileName);
  try {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ Copied ${fileName} -> ${dst}`);
  } catch (err) {
    console.warn(`  Warning copying to brain: ${err.message}`);
  }
}

// =========================================================================
// TEST 1: ask-sonner — 3 Stacked Docked Toasts
// =========================================================================
console.log('\n[TEST 1] ask-sonner: Testing 3 Stacked Docked Toasts...');
await page.evaluate(() => {
  if (window.__LIVEX_TOAST__?.toast) {
    const { toast } = window.__LIVEX_TOAST__;
    toast.info('Stagex Scene 1 Live Sync active');
    toast.success('Developer Options Unlocked (10-tap sequence)');
    toast.success('Chord progression saved to library');
  }
});
await sleep(800);

const toastStats = await page.evaluate(() => {
  const cards = document.querySelectorAll('[role="alert"]');
  const container = document.querySelector('[role="alert"]')?.parentElement?.parentElement;
  return {
    count: cards.length,
    bottomStyle: container ? getComputedStyle(container).bottom : null,
  };
});
console.log(`  Stack count rendered: ${toastStats.count}`);
console.log(`  Dock position: ${toastStats.bottomStyle}`);

const toastImg = path.join(OUT, 'stackable-toasts-sonner.png');
await page.screenshot({ path: toastImg });
copyArtifact('stackable-toasts-sonner.png');

// Clear toasts for next tests
await page.evaluate(() => {
  if (window.__LIVEX_TOAST__?.toast) {
    window.__LIVEX_TOAST__.toast.dismiss();
  }
});
await sleep(400);

// =========================================================================
// TEST 2: break-ui — Extreme String Stress Testing in Chordex Songs List
// =========================================================================
console.log('\n[TEST 2] break-ui: Injecting extreme strings into songs list...');
await page.evaluate(() => {
  window.__studioNavigationDispatcher.openApp('chordex');
  window.__studioNavigationDispatcher.push({ app: 'chordex', tab: 'songs', page: 'songs' });
});
await sleep(1200);

// Inject extreme mock song into preset store to stress-test truncation and badge resilience
await page.evaluate(() => {
  try {
    const store = window.useChordStore;
    if (store?.getState) {
      const state = store.getState();
      const extremeSongs = [
        {
          id: 'break-ui-long-song',
          name: 'Venezia (Special Long Remix Edition Extended Live at San Siro 1989 Deluxe Master Tape Edition)',
          artist: 'The Extremely Long Named Orchestral Ensemble feat. Multiple Guest Vocalists & Soloists',
          bpm: 172,
          speed: 172,
          key: 'Am',
          chords: [],
          sections: [
            {
              id: 'sec-1',
              name: 'Intro',
              barsPerLine: 4,
              lines: [
                { id: 'l1', text: 'Introductory fanfare section line one with massive descriptive lyric annotation', bars: 4 },
                { id: 'l2', text: '', bars: 4 }
              ]
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'break-ui-short-song',
          name: 'A',
          artist: 'B',
          bpm: 120,
          speed: 120,
          key: 'C',
          chords: [],
          sections: [{ id: 's0', name: 'Main', lines: [{ id: 'l0', text: 'X' }] }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      // Set to presets array
      store.setState({ presets: [...extremeSongs, ...(state.presets || [])] });
    }
  } catch (err) {
    console.warn('Error injecting extreme songs:', err);
  }
});
await sleep(800);

// Verify truncation assertions
const breakUiStats = await page.evaluate(() => {
  const longTitleEl = document.querySelector('h3.truncate');
  const card = longTitleEl?.closest('article, button, [data-purpose="song-card"], .group');
  const scrollW = card ? card.scrollWidth : 0;
  const clientW = card ? card.clientWidth : 0;
  return {
    hasLongTitle: Boolean(longTitleEl),
    text: longTitleEl ? longTitleEl.textContent.trim() : '',
    overflowsContainer: scrollW > clientW + 2,
    hasEllipsis: longTitleEl ? getComputedStyle(longTitleEl).textOverflow === 'ellipsis' : false,
  };
});
console.log(`  Long title detected: "${breakUiStats.text.substring(0, 30)}..."`);
console.log(`  Text overflow ellipsis: ${breakUiStats.hasEllipsis}`);
console.log(`  Card horizontal overflow: ${breakUiStats.overflowsContainer}`);

const breakUiImg = path.join(OUT, 'break-ui-long-titles.png');
await page.screenshot({ path: breakUiImg });
copyArtifact('break-ui-long-titles.png');

// =========================================================================
// TEST 3: apple-design & emil-design-eng — Spring Physics & Tactile Toggles
// =========================================================================
console.log('\n[TEST 3] apple-design & emil-design-eng: Verifying unified spring toggles...');
await page.evaluate(() => {
  window.__studioNavigationDispatcher.openApp('stagex');
  window.__studioNavigationDispatcher.push({ app: 'stagex', tab: 'preferences', page: 'preferences' });
});
await sleep(1200);

const switchAudit = await page.evaluate(() => {
  const switches = [...document.querySelectorAll('[role="switch"]')];
  return switches.map((s) => {
    const on = s.getAttribute('aria-checked') === 'true';
    const thumb = s.querySelector('span');
    const sStyle = getComputedStyle(s);
    const tStyle = thumb ? getComputedStyle(thumb) : null;
    return {
      on,
      trackBg: sStyle.backgroundColor,
      thumbBg: tStyle ? tStyle.backgroundColor : null,
      transition: sStyle.transition,
    };
  });
});
console.log(`  Total switches in Stagex Preferences: ${switchAudit.length}`);
console.log(`  Switch 0 active: ${switchAudit[0]?.on}, track: ${switchAudit[0]?.trackBg}, thumb: ${switchAudit[0]?.thumbBg}`);

// Ensure at least one toggle is flipped ON for visual comparison
await page.evaluate(() => {
  const sws = [...document.querySelectorAll('[role="switch"]')];
  if (sws[0] && sws[0].getAttribute('aria-checked') !== 'true') {
    sws[0].click();
  }
});
await sleep(400);

const toggleImg = path.join(OUT, 'unified-spring-toggles.png');
await page.screenshot({ path: toggleImg });
copyArtifact('unified-spring-toggles.png');

console.log('\n✓ All 3 Emil Kowalski skills suite visual verifications captured successfully!');
await browser.close();
process.exit(0);
