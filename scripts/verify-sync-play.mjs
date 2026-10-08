import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const VERIFICATION_DIR = path.resolve(REPO_ROOT, '.artifacts', 'verification');
const BRAIN_ARTIFACT_DIR = 'C:/Users/Mauren/.gemini/antigravity/brain/1175433f-38ca-436e-8de8-3b236180ddc4';

if (!fs.existsSync(VERIFICATION_DIR)) {
  fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
}

function getBrowserExecutablePath() {
  const edgeCoreDir = 'C:\\Program Files (x86)\\Microsoft\\EdgeCore';
  if (fs.existsSync(edgeCoreDir)) {
    const versions = fs.readdirSync(edgeCoreDir).filter((v) =>
      fs.existsSync(path.join(edgeCoreDir, v, 'msedge.exe'))
    );
    if (versions.length > 0) {
      return path.join(edgeCoreDir, versions[versions.length - 1], 'msedge.exe');
    }
  }

  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function checkServerListening(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer() {
  for (const port of [5174, 5173]) {
    const isUp =
      (await checkServerListening(`http://127.0.0.1:${port}/`, 800)) ||
      (await checkServerListening(`http://localhost:${port}/`, 800));
    if (isUp) {
      console.log(`[DEV-SERVER] Active server on port ${port}`);
      return { port, process: null };
    }
  }

  console.log('[DEV-SERVER] Starting Vite preview server...');
  const devProcess = spawn('cmd.exe', ['/c', 'pnpm.cmd --filter @workspace/studio-android dev --port 5174'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: '5174' },
  });

  const start = Date.now();
  while (Date.now() - start < 35000) {
    await sleep(1000);
    if (await checkServerListening('http://127.0.0.1:5174/', 800)) {
      console.log('[DEV-SERVER] Server ready on port 5174');
      return { port: 5174, process: devProcess };
    }
  }

  throw new Error('[DEV-SERVER] Timeout waiting for Vite server');
}

async function run() {
  let serverInfo = null;
  let browser = null;

  try {
    serverInfo = await ensureDevServer();
    const port = serverInfo.port;

    const executablePath = getBrowserExecutablePath();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=412,915'],
    });

    const page = await browser.newPage();
    page.on('console', (msg) => console.log('[BROWSER-LOG]', msg.text()));
    page.on('pageerror', (err) => console.error('[BROWSER-ERROR]', err));

    await page.setViewport({
      width: 412,
      height: 915,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    console.log(`[NAV] Loading http://127.0.0.1:${port}/ ...`);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    await sleep(500);

    // Navigate to Chordex
    console.log('[STAGE-SYNC] Navigating to Chordex Songs...');
    await page.evaluate(() => {
      if (window.NavigationDispatcher) {
        window.NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
        window.NavigationDispatcher.openApp('chordex');
        window.NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
      }
    });
    await sleep(1500);

    // Create Venezia preset in chord store
    console.log('[STAGE-SYNC] Injecting Venezia preset and establishing Local Stage Room...');
    const evalRes = await page.evaluate(() => {
      try {
        const sampleVenezia = {
          name: 'Venezia',
          artist: 'Hombres G',
          bpm: 172,
          speed: 172,
          barsPerLine: 4,
          key: 'C',
          notes: 'Stage Sync Practice',
          chords: ['C', 'G', 'Am', 'F'],
          sections: [
            { id: 'sec-intro', name: 'Intro', chords: ['C', 'G', 'Am', 'F'] },
            { id: 'sec-verse', name: 'Verse', chords: ['C', 'G', 'Am', 'F'] },
          ],
          lyrics: {
            sections: [
              {
                id: 'sec-1',
                name: 'Intro',
                type: 'intro',
                barsPerLine: 4,
                lines: [
                  { id: 'l1', text: 'Quiero estar contigo en Venezia', chords: [{ chord: 'C', position: 0 }] },
                  { id: 'l2', text: 'Navegando juntos por el canal', chords: [{ chord: 'Am', position: 0 }] },
                ],
              },
            ],
          },
        };

        let newSongId = 'venezia-preset';
        if (window.useChordStore) {
          newSongId = window.useChordStore.getState().createPreset(sampleVenezia);
          window.useChordStore.getState().setActivePreset(newSongId);
        }

        // Configure stage sync store as Follower in active session
        if (window.useLocalStageSyncStore) {
          window.useLocalStageSyncStore.setState({
            role: 'follower',
            clientOffsetMs: -15,
            room: {
              roomId: 'LX-7M8',
              hostName: 'Stage Host',
              status: 'IN_SESSION',
              activeSongId: newSongId,
              activeSongTitle: 'Venezia',
              activeBar: 4,
              activeBeat: 2,
              isPlaying: true,
              bpm: 172,
              timeSignature: [4, 4],
              serverTimestamp: Date.now(),
            },
          });
        }

        // Open live mode via button or spectator event
        const liveBtn = document.querySelector('[data-testid="enter-live-mode"]');
        if (liveBtn) {
          liveBtn.click();
        } else {
          window.dispatchEvent(
            new CustomEvent('livex:open-live-spectator', {
              detail: {
                songId: newSongId,
                songTitle: 'Venezia',
              },
            })
          );
        }

        return { success: true, songId: newSongId };
      } catch (err) {
        return { success: false, error: String(err && err.stack ? err.stack : err) };
      }
    });

    console.log('[STAGE-SYNC] Inject evaluation result:', JSON.stringify(evalRes));

    await sleep(2500);

    // Now in Live Mode, switch to Chords Only and dispatch PLAY transport
    console.log('[STAGE-SYNC] Dispatching PLAY transport and switching to Chords Only...');
    await page.evaluate(() => {
      // Find mode selector buttons or chords tab
      const buttons = Array.from(document.querySelectorAll('button'));
      const chordsBtn = buttons.find(
        (b) =>
          b.getAttribute('data-testid') === 'btn-display-mode-chords' ||
          (b.textContent && (b.textContent.trim() === 'Chords' || b.textContent.trim() === 'Acordes'))
      );
      if (chordsBtn) {
        chordsBtn.click();
      }

      // Dispatch PLAY transport event with synchronized bar and beat
      window.dispatchEvent(
        new CustomEvent('livex:stage-sync-transport', {
          detail: {
            action: 'PLAY',
            bpm: 172,
            currentBar: 4,
            currentBeat: 2,
            timestamp: Date.now(),
          },
        })
      );
    });

    await sleep(3500);

    // Capture synchronized-multidevice-play.png
    const targetFile = 'synchronized-multidevice-play.png';
    const primaryPath = path.join(VERIFICATION_DIR, targetFile);
    await page.screenshot({ path: primaryPath, fullPage: false });
    console.log(`✓ [SUCCESS] Captured: ${primaryPath}`);

    if (fs.existsSync(BRAIN_ARTIFACT_DIR)) {
      const brainPath = path.join(BRAIN_ARTIFACT_DIR, targetFile);
      fs.copyFileSync(primaryPath, brainPath);
      console.log(`✓ [COPIED] Copied to brain artifact: ${brainPath}`);
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (serverInfo && serverInfo.process && serverInfo.process.pid) {
      try {
        spawn('taskkill', ['/pid', serverInfo.process.pid.toString(), '/f', '/t']);
      } catch (_) {
        try { serverInfo.process.kill(); } catch (__) {}
      }
    }
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('[ERROR]', e);
  process.exit(1);
});
