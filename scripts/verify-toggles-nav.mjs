/**
 * Automated visual + navigation verification (Puppeteer, headless).
 * Requires a running dev server:  pnpm dev:mobile  (default http://localhost:5174)
 * Usage: node scripts/verify-toggles-nav.mjs   (BASE_URL env overrides)
 * Output: .artifacts/verification/*.png + assertions on the Back flow.
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
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => window.__studioNavigationDispatcher, { timeout: 60000 });
await sleep(1500);

const nav = (route) => page.evaluate((r) => window.__studioNavigationDispatcher.push(r), route);
const openApp = (a) => page.evaluate((x) => window.__studioNavigationDispatcher.openApp(x), a);
const back = () =>
  page.evaluate(() =>
    window.BackDispatcher?.handleBackEvent?.() ?? (window.__studioNavigationDispatcher.pop(), true)
  );
const route = () => page.evaluate(() => window.__studioNavigationDispatcher.currentRoute());
const stackApps = () =>
  page.evaluate(() => window.__useNavigationStore.getState().history.map((r) => r.app));

/** Collects computed colors for every switch on screen and asserts the canonical design. */
async function auditSwitches(label) {
  const res = await page.evaluate(() =>
    [...document.querySelectorAll('[role="switch"]')].map((el) => {
      const on = el.getAttribute('aria-checked') === 'true';
      const thumb = el.querySelector('span,div');
      return {
        on,
        track: getComputedStyle(el).backgroundColor,
        thumb: thumb ? getComputedStyle(thumb).backgroundColor : null,
        canonical: el.getAttribute('data-toggle') === 'switch',
      };
    })
  );
  const bad = res.filter(
    (s) =>
      !s.canonical ||
      (s.on && (s.track !== 'rgb(255, 255, 255)' || s.thumb !== 'rgb(0, 0, 0)'))
  );
  console.log(
    `[${label}] switches=${res.length} on=${res.filter((s) => s.on).length} violations=${bad.length}`
  );
  if (bad.length) console.log(JSON.stringify(bad));
  return bad.length;
}

let failures = 0;
async function shot(name, label) {
  try {
    await page.waitForSelector('[role="switch"]', { timeout: 10000 });
  } catch (_) {}
  await sleep(1000);

  // If no switch is ON, toggle the first switch to guarantee testing both ON and OFF states
  await page.evaluate(() => {
    const sws = [...document.querySelectorAll('[role="switch"]')];
    if (sws.length > 0 && !sws.some((s) => s.getAttribute('aria-checked') === 'true')) {
      sws[0].click();
    }
  });
  await sleep(400);

  failures += await auditSwitches(label || name);
  const localOut = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: localOut });
  try {
    fs.copyFileSync(localOut, path.join(BRAIN_DIR, `${name}.png`));
  } catch (_) {}
}

// Force AMOLED/dark so the standard is visible.
await page.evaluate(() => document.documentElement.classList.add('dark'));

await openApp('groovex');
await nav({ app: 'groovex', tab: 'preferences', page: 'preferences' });
await shot('groovex-toggles');

await openApp('hub');
await openApp('vocalex');
await nav({ app: 'vocalex', tab: 'preferences', page: 'preferences' });
await shot('vocalex-toggles');

await openApp('hub');
await nav({ app: 'hub', tab: 'settings', page: 'appearance' });
await shot('settings-accessibility-toggles');

await openApp('hub');
await openApp('stagex');
await nav({ app: 'stagex', page: 'Preferences', tab: 'Preferences' });
await shot('stagex-preferences-toggles');

// ---- Navigation flow: Hub -> Stagex -> Stagex Preferences -> Hub -> Settings -> Updater -> Back ----
await openApp('hub');
await openApp('stagex');
await sleep(600);
await nav({ app: 'stagex', page: 'Preferences', tab: 'Preferences' });
await sleep(600);
await openApp('hub');
await sleep(600);
await nav({ app: 'hub', tab: 'settings', page: 'main' });
await sleep(400);
await nav({ app: 'hub', tab: 'settings', page: 'updater' });
await sleep(800);
const updaterShot = path.join(OUT, 'nav-updater.png');
await page.screenshot({ path: updaterShot });
try {
  fs.copyFileSync(updaterShot, path.join(BRAIN_DIR, 'nav-updater.png'));
} catch (_) {}

await back();
await sleep(500);
const afterFirst = await route();
const afterBack1Shot = path.join(OUT, 'nav-after-back-1-settings.png');
await page.screenshot({ path: afterBack1Shot });
try {
  fs.copyFileSync(afterBack1Shot, path.join(BRAIN_DIR, 'nav-after-back-1-settings.png'));
} catch (_) {}

await sleep(400);
await back();
await sleep(500);
const afterSecond = await route();
const afterBack2Shot = path.join(OUT, 'nav-after-back-2-hub.png');
await page.screenshot({ path: afterBack2Shot });
try {
  fs.copyFileSync(afterBack2Shot, path.join(BRAIN_DIR, 'nav-after-back-2-hub.png'));
} catch (_) {}

const apps = await stackApps();

const navOk =
  afterFirst.app === 'hub' &&
  afterFirst.tab === 'settings' &&
  afterSecond.app === 'hub' &&
  !apps.includes('stagex');
console.log('after back #1:', JSON.stringify(afterFirst));
console.log('after back #2:', JSON.stringify(afterSecond), 'stack apps:', apps.join(','));
console.log(navOk ? 'NAV PASS' : 'NAV FAIL');
if (!navOk) failures++;

await browser.close();
console.log(failures ? `FAILED (${failures})` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
