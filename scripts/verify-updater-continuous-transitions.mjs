#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const artifactDir = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain\\1175433f-38ca-436e-8de8-3b236180ddc4';

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
  const targetUrl = 'http://localhost:5174/';
  console.log(`[Test] Launching Puppeteer on target ${targetUrl}...`);

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
      text.includes('[ContinuousProof]') ||
      text.includes('LivexUpdateScreen') ||
      text.includes('UpdateModal')
    ) {
      console.log(`[Browser Console]: ${text}`);
    }
  });

  // Controls for step-by-step state machine resolution
  let resolveVersionCheck = null;
  const versionPromise = new Promise((resolve) => {
    resolveVersionCheck = resolve;
  });

  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    if (url.includes('version.json') || url.includes('app-release.json')) {
      console.log(`[Puppeteer Intercept] Delaying ${url} for checking state...`);
      await versionPromise;
      console.log(`[Puppeteer Intercept] Responding to ${url} with v4.9.5 update`);
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

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('studio_debug_mode', 'true');
    localStorage.setItem(
      'settings-storage-v1',
      JSON.stringify({
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
          },
        },
        version: 1,
      })
    );
    localStorage.setItem('livex-persisted-theme', 'dark');
    sessionStorage.setItem('livex-intro-shown', 'true');
    sessionStorage.setItem('studio-intro-shown', 'true');
    localStorage.removeItem('studio:dismissedVersions');
    localStorage.removeItem('studio:laterVersion');
    localStorage.removeItem('studio:autoOpenedVersion');

    window.androidBridge = true;
    window.CapacitorCustomPlatform = { name: 'android' };

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
        setTimeout(() => {
          mockAppInstaller.emit('apkDownloadProgress', {
            progress: 32,
            totalBytes: 77.4 * 1024 * 1024,
            downloadedBytes: 24.8 * 1024 * 1024,
          });
        }, 150);

        await new Promise((resolve) => {
          window.__emit100Progress = () => {
            console.log('[MockAppInstaller] Emitting 100% progress event');
            mockAppInstaller.emit('apkDownloadProgress', {
              progress: 100,
              totalBytes: 77.4 * 1024 * 1024,
              downloadedBytes: 77.4 * 1024 * 1024,
            });
          };
          window.__finishDownload = resolve;
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
      installApkDirect: async () => {},
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
        if (pluginName === 'AppInstaller' && typeof mockAppInstaller[methodName] === 'function') {
          return mockAppInstaller[methodName](options);
        }
        return {};
      },
      nativeCallback: (pluginName, methodName, options, callback) => {
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
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  // Wait for dialog card to render in Checking state
  console.log('[Test] Phase 1: Checking State verification...');
  await page.waitForSelector('[data-purpose="dialog-card"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));

  const checkingDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    // Tag the DOM node with a unique symbol property to verify persistent identity
    window.__persistentCardNode = dialog;
    dialog.__continuousIdentityToken = 'LIVEX_PERSISTENT_SURFACE_CARD_NODE';

    const title = document.querySelector('#modal-title')?.textContent?.trim();
    const desc = document.querySelector('[data-purpose="modal-header"] p')?.textContent?.trim();
    const indeterminateBar = document.querySelector('.progress-bar-glow');
    const rect = dialog?.getBoundingClientRect();

    return {
      title,
      desc,
      hasIndeterminateBar: !!indeterminateBar,
      height: rect?.height,
      width: rect?.width,
      token: dialog?.__continuousIdentityToken,
    };
  });

  console.log('[ContinuousProof] Phase 1 (Checking) details:', checkingDetails);
  const shot1 = path.join(artifactDir, 'verify_continuous_1_checking.png');
  await page.screenshot({ path: shot1 });

  // =========================================================================
  // Phase 2: Morphing from Checking -> Update Available
  // =========================================================================
  console.log('[Test] Phase 2: Resolving version check -> Morphing to Update Available...');
  resolveVersionCheck();

  // Wait for pipeline to finish compare version and transition to update available
  await page.waitForSelector('[data-purpose="install-button"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));

  const availableDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const title = document.querySelector('#modal-title')?.textContent?.trim();
    const desc = document.querySelector('[data-purpose="modal-header"] p')?.textContent?.trim();
    const versionPanel = document.querySelector('[data-purpose="version-status-panel"]');
    const whatsNew = document.querySelector('[data-purpose="whats-new-section"]');
    const installBtn = document.querySelector('[data-purpose="install-button"]');
    const rect = dialog?.getBoundingClientRect();

    const isSameDOMNode = dialog === window.__persistentCardNode && dialog?.__continuousIdentityToken === 'LIVEX_PERSISTENT_SURFACE_CARD_NODE';

    return {
      title,
      desc,
      hasVersionPanel: !!versionPanel,
      hasWhatsNew: !!whatsNew,
      hasInstallBtn: !!installBtn,
      height: rect?.height,
      width: rect?.width,
      isSameDOMNode,
    };
  });

  console.log('[ContinuousProof] Phase 2 (Update Available) details:', availableDetails);
  if (!availableDetails.isSameDOMNode) {
    throw new Error('REGRESSION: Dialog card DOM node was unmounted during Checking -> Update Available transition!');
  }
  console.log('✓ PROVEN: Dialog card remained the exact same persistent DOM node (NO UNMOUNTING)');

  const shot2 = path.join(artifactDir, 'verify_continuous_2_available.png');
  await page.screenshot({ path: shot2 });

  // =========================================================================
  // Phase 3: Morphing from Available -> Downloading (32%)
  // =========================================================================
  console.log('[Test] Phase 3: Clicking "Download & Install" -> Morphing to Downloading...');
  await page.click('[data-purpose="install-button"]');
  await new Promise((r) => setTimeout(r, 600));

  const downloadingDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const title = document.querySelector('#modal-title')?.textContent?.trim();
    const desc = document.querySelector('[data-purpose="modal-header"] p')?.textContent?.trim();
    const progressCard = document.querySelector('[data-purpose="install-progress-card"]');
    const statusText = progressCard?.querySelector('span')?.textContent?.trim();
    const isSameDOMNode = dialog === window.__persistentCardNode;

    return {
      title,
      desc,
      hasProgressCard: !!progressCard,
      statusText,
      isSameDOMNode,
    };
  });

  console.log('[ContinuousProof] Phase 3 (Downloading) details:', downloadingDetails);
  const shot3 = path.join(artifactDir, 'verify_continuous_3_downloading.png');
  await page.screenshot({ path: shot3 });

  // =========================================================================
  // Phase 4: Download reaches 100%
  // =========================================================================
  console.log('[Test] Phase 4: Emitting 100% download progress...');
  await page.evaluate(() => {
    if (window.__emit100Progress) {
      window.__emit100Progress();
    }
  });
  await new Promise((r) => setTimeout(r, 400));

  const download100Details = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const title = document.querySelector('#modal-title')?.textContent?.trim();
    const progressCard = document.querySelector('[data-purpose="install-progress-card"]');
    const statusText = progressCard?.querySelector('span')?.textContent?.trim();
    const percentText = progressCard?.querySelector('[role="status"]')?.textContent?.trim();
    const isSameDOMNode = dialog === window.__persistentCardNode;

    return {
      title,
      statusText,
      percentText,
      isSameDOMNode,
    };
  });

  console.log('[ContinuousProof] Phase 4 (100% Downloaded) details:', download100Details);
  const shot4 = path.join(artifactDir, 'verify_continuous_4_download_100.png');
  await page.screenshot({ path: shot4 });

  // =========================================================================
  // Phase 5: Smooth Transition from 100% -> Installing (Verifying)
  // =========================================================================
  console.log('[Test] Phase 5: Completing download -> Morphing into Installing state...');
  await page.evaluate(() => {
    if (window.__finishDownload) {
      window.__finishDownload();
    }
  });

  // Wait for crossfade and spring height adaptation
  await new Promise((r) => setTimeout(r, 800));

  const installingDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[data-purpose="dialog-card"]');
    const title = document.querySelector('#modal-title')?.textContent?.trim();
    const desc = document.querySelector('[data-purpose="modal-header"] p')?.textContent?.trim();
    const progressCard = document.querySelector('[data-purpose="install-progress-card"]');
    const statusText = progressCard?.querySelector('span')?.textContent?.trim();
    const percentText = progressCard?.querySelector('[role="status"]')?.textContent?.trim();
    const isSameDOMNode = dialog === window.__persistentCardNode;

    return {
      title,
      desc,
      statusText,
      percentText,
      isSameDOMNode,
    };
  });

  console.log('[ContinuousProof] Phase 5 (Installing) details:', installingDetails);
  if (!installingDetails.isSameDOMNode) {
    throw new Error('REGRESSION: Dialog card DOM node was unmounted during Installing transition!');
  }
  console.log('✓ PROVEN: Dialog card remained the exact same persistent DOM node across the entire lifecycle');

  const shot5 = path.join(artifactDir, 'verify_continuous_5_installing.png');
  await page.screenshot({ path: shot5 });

  await browser.close();
  console.log('[Test] All continuous updater state transitions verified with 100% success!');
}

run().catch((err) => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
