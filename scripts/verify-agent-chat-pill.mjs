#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist', 'android-web');
const artifactDir = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain\\1175433f-38ca-436e-8de8-3b236180ddc4';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[/\\])+/, '');
    const resolvedPath = path.resolve(distDir, '.' + path.sep + safePath);

    let filePath = resolvedPath;
    if (!resolvedPath.startsWith(distDir) || !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[Static Server] Serving dist/android-web on http://localhost:${port}`);
      resolve(server);
    });
  });
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.EDGE_BIN,
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.48\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.32\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\153.0.4234.13\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return undefined;
}

async function run() {
  const PORT = 5198;
  const server = await createStaticServer(PORT);
  const targetUrl = `http://localhost:${PORT}/`;

  console.log('[Puppeteer] Launching mobile emulator...');
  const execPath = getBrowserExecutablePath();
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.setViewport({
    width: 393,
    height: 851,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  page.on('pageerror', (err) => console.error('[Page Error]:', err.message));

  console.log(`[Test] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Wait for app mount
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 500, { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));

  // First, capture the Hub Home showing the separate AI satellite button next to the dock!
  console.log('[Test] Capturing Hub Home with separate AI satellite button...');
  const hubHomePath = path.join(artifactDir, 'verify_hub_ai_satellite.png');
  await page.screenshot({ path: hubHomePath });
  console.log(`Saved screenshot: ${hubHomePath}`);

  // Clear any existing chat history so we test clean initial state
  await page.evaluate(() => {
    if (window.__studioAssistantStore) {
      window.__studioAssistantStore.getState().clearConversation();
    }
  });

  // Navigate to assistant tab by clicking the dedicated satellite button!
  console.log('[Test] Clicking AI Assistant satellite button...');
  const satelliteBtn = await page.$('button[aria-label="AI Assistant"]');
  if (satelliteBtn) {
    await satelliteBtn.click();
  } else {
    console.log('[Test] Fallback to NavigationDispatcher...');
    await page.evaluate(() => {
      if (window.__studioNavigationDispatcher) {
        window.__studioNavigationDispatcher.push({ app: 'hub', tab: 'assistant' });
      }
    });
  }

  await new Promise((r) => setTimeout(r, 1500));

  // 1. Capture Ready / Empty State (Headerless layout + large animated mascot)
  console.log('[Test] Capturing Ready State...');
  const readyPath = path.join(artifactDir, 'verify_agent_chat_pill_ready.png');
  const proEmptyPath = path.join(artifactDir, 'verify_pro_empty_state.png');
  await page.screenshot({ path: readyPath });
  await page.screenshot({ path: proEmptyPath });
  console.log(`Saved screenshot: ${proEmptyPath}`);

  // 2. Click the mascot to test interactive tap reaction (sparkles, hop, wink)
  console.log('[Test] Tapping animated mascot hero...');
  const mascotEl = await page.$('.livex-assistant-mascot[role="button"]');
  if (mascotEl) {
    await mascotEl.click();
    await new Promise((r) => setTimeout(r, 200));
    const mascotTapPath = path.join(artifactDir, 'verify_mascot_tap_reaction.png');
    await page.screenshot({ path: mascotTapPath });
    console.log(`Saved screenshot: ${mascotTapPath}`);
  }
  await new Promise((r) => setTimeout(r, 600));

  // 3. Type multiline prompt with Puppeteer typing
  console.log('[Test] Typing multiline prompt into textarea...');
  await page.focus('.agent-chat-pill-root textarea');
  const promptText = 'Suggest a lush Neo-Soul chord progression with 9th and 13th extensions for guitar and bass.';
  await page.keyboard.type(promptText, { delay: 10 });
  await new Promise((r) => setTimeout(r, 400));
  
  const typingPath = path.join(artifactDir, 'verify_agent_chat_pill_typing.png');
  const proTypingPath = path.join(artifactDir, 'verify_pro_typing.png');
  await page.screenshot({ path: typingPath });
  await page.screenshot({ path: proTypingPath });
  console.log(`Saved screenshot: ${proTypingPath}`);

  // 4. Submit message to trigger streaming and capture Stop button morph
  console.log('[Test] Submitting message to trigger streaming mode...');
  await page.evaluate(() => {
    if (window.__studioAssistantStore) {
      window.__studioAssistantStore.getState().sendMessage('Suggest a lush Neo-Soul chord progression with 9th and 13th extensions for guitar and bass.');
    }
  });

  // Brief pause to capture active streaming with stop button
  await new Promise((r) => setTimeout(r, 120));
  const streamingPath = path.join(artifactDir, 'verify_agent_chat_pill_streaming.png');
  const proStreamingPath = path.join(artifactDir, 'verify_pro_streaming.png');
  await page.screenshot({ path: streamingPath });
  await page.screenshot({ path: proStreamingPath });
  console.log(`Saved screenshot: ${proStreamingPath}`);

  // 5. Wait for streaming to complete (local intelligence takes ~1.5s)
  console.log('[Test] Waiting for response to stream and render cards...');
  await page.waitForFunction(() => {
    return window.__studioAssistantStore && window.__studioAssistantStore.getState().status === 'idle';
  }, { timeout: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  const completedPath = path.join(artifactDir, 'verify_assistant_response_completed.png');
  const proCompletedPath = path.join(artifactDir, 'verify_pro_completed_chat.png');
  await page.screenshot({ path: completedPath });
  await page.screenshot({ path: proCompletedPath });
  console.log(`Saved screenshot: ${proCompletedPath}`);

  // Scroll to top so user bubble and start of bot response are visible
  await page.evaluate(() => {
    const scroller = document.querySelector('[data-assistant-chat-view="true"] > div:nth-child(2)');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'instant' });
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  const userVisiblePath = path.join(artifactDir, 'verify_pro_user_message.png');
  await page.screenshot({ path: userVisiblePath });
  console.log(`Saved screenshot: ${userVisiblePath}`);

  await browser.close();
  server.close();
  console.log('[Test] All verification screenshots captured successfully!');
}

run().catch((err) => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
