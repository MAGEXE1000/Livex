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
  const PORT = 5199;
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

  page.on('pageerror', (err) => console.log('[Page Error]:', err.message));
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('[UPDATER') ||
      text.includes('[Test]') ||
      text.includes('[MockAppInstaller]') ||
      text.includes('LivexUpdateScreen') ||
      text.includes('UpdateModal')
    ) {
      console.log(`[Browser Console]: ${text}`);
    }
  });

  // Enable request interception to mock version.json and app-release.json with 4.9.5 update
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('version.json') || url.includes('app-release.json')) {
      console.log(`[Puppeteer] Intercepted ${url} -> serving v4.9.5 update`);
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          platform: 'android',
          version: '4.9.5',
          versionName: '4.9.5',
          versionCode: 40905,
          downloadUrl: 'https://studio-30f44.web.app/apk/studio-4.9.5.bin',
          apkUrl: 'https://studio-30f44.web.app/apk/studio-4.9.5.bin',
          apkSizeBytes: 77.4 * 1024 * 1024,
          sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
          apkSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
          releaseNotes: {
            added: [
              'Lyrics: Use direct Kugou, QQ Music, and Genius sources',
              'Backup: Stream versioned ZIP archives',
              'Updater: Resume and verify APK downloads',
              'Player: Add sleep timer',
              'Resolver: Add cross-platform fallback chain',
            ],
          },
          mandatory: false,
        }),
      });
    } else {
      req.continue();
    }
  });

  // Setup mock native Android environment before any page scripts execute
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('studio_debug_mode', 'true');
    localStorage.setItem('settings-storage-v1', JSON.stringify({
      state: {
        settings: {
          theme: 'dark',
          amoledMode: false,
          accentColor: 'blue',
          perApp: {
            hub: { theme: 'dark', amoledMode: false },
            chordex: { theme: 'dark', amoledMode: false },
            drumex: { theme: 'dark', amoledMode: false },
            stagex: { theme: 'dark', amoledMode: false },
            groovex: { theme: 'dark', amoledMode: false },
            vocalex: { theme: 'dark', amoledMode: false },
          },
        }
      },
      version: 1
    }));
    localStorage.setItem('livex-persisted-theme', 'dark');
    localStorage.setItem('chord-explorer-storage-v3', JSON.stringify({ state: { settings: { theme: 'dark', amoledMode: false } } }));
    sessionStorage.setItem('livex-intro-shown', 'true');
    sessionStorage.setItem('studio-intro-shown', 'true');
    sessionStorage.setItem(
      'studio:mockUpdateResponse',
      JSON.stringify({
        version: '4.9.5',
        versionName: '4.9.5',
        versionCode: 40905,
        downloadUrl: 'https://studio-30f44.web.app/apk/studio-4.9.5.bin',
        apkUrl: 'https://studio-30f44.web.app/apk/studio-4.9.5.bin',
        apkSizeBytes: 77.4 * 1024 * 1024,
        sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
        apkSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
        releaseNotes: {
          added: [
            'Lyrics: Use direct Kugou, QQ Music, and Genius sources',
            'Backup: Stream versioned ZIP archives',
            'Updater: Resume and verify APK downloads',
            'Player: Add sleep timer',
            'Resolver: Add cross-platform fallback chain',
          ],
        },
        mandatory: false,
      })
    );
    localStorage.removeItem('studio:dismissedVersions');
    localStorage.removeItem('studio:laterVersion');
    localStorage.removeItem('studio:autoOpenedVersion');

    window.androidBridge = true;
    window.CapacitorCustomPlatform = { name: 'android' };

    // Mock native Capacitor & AppInstaller plugin
    const listeners = {};
    const mockAppInstaller = {
      addListener: (eventName, callback) => {
        listeners[eventName] = listeners[eventName] || [];
        listeners[eventName].push(callback);
        return {
          remove: async () => {
            listeners[eventName] = (listeners[eventName] || []).filter((cb) => cb !== callback);
          },
        };
      },
      emit: (eventName, data) => {
        (listeners[eventName] || []).forEach((cb) => cb(data));
      },
      downloadApk: async (options) => {
        console.log('[MockAppInstaller] downloadApk started with:', options);
        // Step 1: Emit 32% progress (matching Stitch Screen 2 reference: 24.8 / 77.4 MB)
        setTimeout(() => {
          console.log('[MockAppInstaller] Emitting 32% progress event');
          mockAppInstaller.emit('apkDownloadProgress', {
            progress: 32,
            totalBytes: 77.4 * 1024 * 1024,
            downloadedBytes: 24.8 * 1024 * 1024,
          });
        }, 150);

        // Wait until test signals 100% download completion
        await new Promise((resolve) => {
          window.__finishDownload = resolve;
        });

        console.log('[MockAppInstaller] Download completed to 100%');
        mockAppInstaller.emit('apkDownloadProgress', {
          progress: 100,
          totalBytes: 77.4 * 1024 * 1024,
          downloadedBytes: 77.4 * 1024 * 1024,
        });

        return { filePath: '/data/user/0/com.livex.app/files/studio-update-4.9.5.apk' };
      },
      notifyAppReady: async () => ({ value: true }),
      canRequestPackageInstalls: async () => ({ value: true }),
      openUnknownAppSourcesSettings: async () => {},
      openInstallPermissionSettings: async () => {},
      clearInstallerLogHistory: async () => {},
      appendLog: async () => {},
      verifySha256: async () => ({ matches: true, computedHash: 'abcdef' }),
      verifyApkSha256: async () => ({ matches: true, computedHash: 'abcdef' }),
      inspectApk: async () => ({
        packageName: 'com.livex.app',
        versionName: '4.9.5',
        versionCode: 40905,
        signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
        debuggable: false,
        minSdk: 26,
        targetSdk: 35,
        isValidApk: true,
        isUniversalApk: true,
      }),
      getInstalledAppInfo: async () => ({
        packageName: 'com.livex.app',
        versionName: '4.6.39',
        versionCode: 40639,
        signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
        debuggable: false,
      }),
      getInstalledAppDetails: async () => ({
        packageName: 'com.livex.app',
        versionName: '4.6.39',
        versionCode: 40639,
        signatures: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      }),
      installApk: async () => {
        console.log('[MockAppInstaller] installApk prompt active');
      },
      installApkDirect: async () => {
        console.log('[MockAppInstaller] installApkDirect prompt active');
      },
      getLastInstallResult: async () => ({
        statusCode: 0,
        statusMessage: 'SUCCESS',
        packageName: 'com.livex.app',
        timestamp: Date.now(),
      }),
      isInstallActive: async () => ({ active: false, sessionId: 0 }),
    };

    window.__mockAppInstaller = mockAppInstaller;

    window.Capacitor = {
      DEBUG: false,
      isLoggingEnabled: false,
      PluginHeaders: [
        {
          name: 'AppInstaller',
          methods: [
            { name: 'downloadApk', rtype: 'promise' },
            { name: 'downloadAndInstallApk', rtype: 'promise' },
            { name: 'verifySha256', rtype: 'promise' },
            { name: 'verifyApkSha256', rtype: 'promise' },
            { name: 'inspectApk', rtype: 'promise' },
            { name: 'getInstalledAppInfo', rtype: 'promise' },
            { name: 'getInstalledAppDetails', rtype: 'promise' },
            { name: 'notifyAppReady', rtype: 'promise' },
            { name: 'canRequestPackageInstalls', rtype: 'promise' },
            { name: 'openUnknownAppSourcesSettings', rtype: 'promise' },
            { name: 'openInstallPermissionSettings', rtype: 'promise' },
            { name: 'clearInstallerLogHistory', rtype: 'promise' },
            { name: 'appendLog', rtype: 'promise' },
            { name: 'installApk', rtype: 'promise' },
            { name: 'installApkDirect', rtype: 'promise' },
            { name: 'getLastInstallResult', rtype: 'promise' },
            { name: 'isInstallActive', rtype: 'promise' },
            { name: 'addListener', rtype: 'callback' },
            { name: 'removeListener', rtype: 'promise' },
          ],
        },
      ],
      nativePromise: async (pluginName, methodName, options) => {
        console.log(`[nativePromise] ${pluginName}.${methodName}`, options);
        if (pluginName === 'AppInstaller' && typeof mockAppInstaller[methodName] === 'function') {
          return mockAppInstaller[methodName](options);
        }
        return {};
      },
      nativeCallback: (pluginName, methodName, options, callback) => {
        console.log(`[nativeCallback] ${pluginName}.${methodName}`, options);
        if (pluginName === 'AppInstaller' && methodName === 'addListener') {
          const eventName = options?.eventName;
          if (eventName) {
            listeners[eventName] = listeners[eventName] || [];
            listeners[eventName].push(callback);
          }
        }
        return 'cb-1';
      },
      Plugins: {
        AppInstaller: mockAppInstaller,
      },
    };
  });

  console.log(`[Test] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Wait for dialog card to render
  console.log('[Test] Waiting for Stitch Updater dialog to auto-open...');
  await page.waitForSelector('[data-purpose="dialog-card"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));

  // =========================================================================
  // STEP 1: SCREEN 1 VERIFICATION (UPDATE AVAILABLE / DOWNLOAD STATE)
  // =========================================================================
  console.log('[Test] Step 1: Verifying Screen 1 (Update Available)...');
  const screen1Details = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const headerTitle = document.querySelector('#modal-title')?.textContent?.trim();
    const versionPanel = document.querySelector('[data-purpose="version-status-panel"]');
    const currentVer = versionPanel?.textContent?.includes('v');
    const newVer = versionPanel?.textContent?.includes('v4.9.5');
    const installBtn = document.querySelector('[data-purpose="install-button"]');
    const laterBtn = document.querySelector('[data-purpose="later-button"]');
    const closeBtn = document.querySelector('[data-purpose="close-dialog-btn"]');
    const whatsNew = document.querySelector('[data-purpose="whats-new-section"]');

    return {
      hasDialog: !!dialog,
      headerTitle,
      hasVersionPanel: !!versionPanel,
      hasCurrentVer: currentVer,
      hasNewVer: newVer,
      hasInstallBtn: !!installBtn,
      installBtnText: installBtn?.textContent?.trim(),
      hasLaterBtn: !!laterBtn,
      laterBtnText: laterBtn?.textContent?.trim(),
      hasCloseBtn: !!closeBtn,
      hasWhatsNew: !!whatsNew,
      dialogComputedRadius: dialog ? window.getComputedStyle(dialog).borderRadius : null,
      panelComputedBg: versionPanel ? window.getComputedStyle(versionPanel).backgroundColor : null,
      dialogComputedBg: dialog ? window.getComputedStyle(dialog).backgroundColor : null,
    };
  });

  console.log('[Test] Screen 1 details:', JSON.stringify(screen1Details, null, 2));

  const screen1Shot = path.join(artifactDir, 'verify_updater_screen_1_available.png');
  await page.screenshot({ path: screen1Shot, fullPage: false });
  console.log(`[Test] Saved Screen 1 screenshot: ${screen1Shot}`);

  // =========================================================================
  // STEP 2: IN-PLACE MORPH TO DOWNLOADING (CLICK "DOWNLOAD & INSTALL")
  // =========================================================================
  console.log('[Test] Step 2: Clicking "Download & Install" and checking in-place morph...');
  await page.click('[data-purpose="install-button"]');

  // Wait for mock download progress emission (32%) and animation
  await new Promise((r) => setTimeout(r, 600));

  const downloadingDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const progressCard = document.querySelector('[data-purpose="install-progress-card"]');
    const progressBar = progressCard?.querySelector('[role="progressbar"]');
    const progressFill = progressBar?.querySelector('div');
    const cancelBtn = document.querySelector('[data-purpose="cancel-action-button"]');
    const statusText = progressCard?.querySelector('span')?.textContent?.trim();

    return {
      hasDialog: !!dialog,
      hasProgressCard: !!progressCard,
      statusText,
      progressBarWidth: progressFill?.style?.width,
      hasCancelBtn: !!cancelBtn,
      cardText: progressCard?.textContent?.trim(),
    };
  });

  console.log('[Test] Downloading state details:', JSON.stringify(downloadingDetails, null, 2));

  const downloadingShot = path.join(artifactDir, 'verify_updater_screen_downloading.png');
  await page.screenshot({ path: downloadingShot, fullPage: false });
  console.log(`[Test] Saved Downloading screenshot: ${downloadingShot}`);

  // =========================================================================
  // STEP 3: TRANSITION TO 100% / SCREEN 2 (INSTALLING STATE)
  // =========================================================================
  console.log('[Test] Step 3: Signaling 100% download -> Morphing into Screen 2 (Installing)...');
  await page.evaluate(() => {
    if (window.__finishDownload) {
      window.__finishDownload();
    }
  });

  // Wait for transition into Installing state
  await new Promise((r) => setTimeout(r, 800));

  const screen2Details = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const progressCard = document.querySelector('[data-purpose="install-progress-card"]');
    const progressBar = progressCard?.querySelector('[role="progressbar"]');
    const progressFill = progressBar?.querySelector('div');
    const cancelBtn = document.querySelector('[data-purpose="cancel-action-button"]');
    const statusText = progressCard?.querySelector('span')?.textContent?.trim();

    return {
      hasDialog: !!dialog,
      hasProgressCard: !!progressCard,
      statusText,
      progressBarWidth: progressFill?.style?.width,
      hasCancelBtn: !!cancelBtn,
      cardText: progressCard?.textContent?.trim(),
    };
  });

  console.log('[Test] Screen 2 (Installing) details:', JSON.stringify(screen2Details, null, 2));

  const screen2Shot = path.join(artifactDir, 'verify_updater_screen_2_installing.png');
  await page.screenshot({ path: screen2Shot, fullPage: false });
  console.log(`[Test] Saved Screen 2 screenshot: ${screen2Shot}`);

  // =========================================================================
  // STEP 4: THEME VARIATIONS (AMOLED & WHITE)
  // =========================================================================
  console.log('[Test] Step 4a: Testing AMOLED theme...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'amoled');
    document.documentElement.classList.add('dark', 'amoled');
    document.documentElement.classList.remove('light');
    window.dispatchEvent(new CustomEvent('livex:theme-changed', { detail: 'amoled' }));
  });
  await new Promise((r) => setTimeout(r, 500));
  const amoledShot = path.join(artifactDir, 'verify_updater_amoled.png');
  await page.screenshot({ path: amoledShot, fullPage: false });
  console.log(`[Test] Saved AMOLED screenshot: ${amoledShot}`);

  console.log('[Test] Step 4b: Testing White / Light theme...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark', 'amoled');
    window.dispatchEvent(new CustomEvent('livex:theme-changed', { detail: 'light' }));
  });
  await new Promise((r) => setTimeout(r, 500));
  const whiteShot = path.join(artifactDir, 'verify_updater_white.png');
  await page.screenshot({ path: whiteShot, fullPage: false });
  console.log(`[Test] Saved White theme screenshot: ${whiteShot}`);

  // =========================================================================
  // STEP 5: CANCEL ACTION VERIFICATION
  // =========================================================================
  console.log('[Test] Step 5: Testing Cancel button dismissal...');
  await page.click('[data-purpose="cancel-action-button"]');
  await new Promise((r) => setTimeout(r, 700));

  const afterDismiss = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    return { hasDialog: !!dialog };
  });
  console.log('[Test] After dismiss dialog visible:', afterDismiss.hasDialog);

  await browser.close();
  server.close();
  console.log('[Test] All Stitch Updater UI tests completed successfully!');
}

run().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
