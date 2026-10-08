#!/usr/bin/env node
/**
 * Livex Film Render Pipeline
 *
 * Drives engine.html through Puppeteer (Edge), samples 8 sub-frames per output
 * frame for motion blur accumulation, then pipes JPEG to ffmpeg-static for H.264
 * encoding. Output: .artifacts/marketing/livex-film-15s.mp4 (1440x1080 @ 60fps).
 *
 * Usage:
 *   node scripts/marketing/film/render.mjs                 # full 15s render
 *   node scripts/marketing/film/render.mjs --preview-stills # 8 keyframe PNGs only
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..', '..');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const W          = 1440;
const H          = 1080;
const FPS        = 60;
const DURATION   = 15.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION);   // 900
const SUBFRAMES  = 8;    // motion blur accumulation sub-samples per output frame
const CRF        = 16;   // H.264 quality (lower = larger file, better quality)

const ENGINE_HTML   = path.resolve(__dirname, 'engine.html');
const ASSETS_DIR    = path.resolve(REPO_ROOT, 'packages', 'ui-shared', 'src', 'assets');
const OUTPUT_DIR    = path.resolve(REPO_ROOT, '.artifacts', 'marketing');
const STILLS_DIR    = path.resolve(OUTPUT_DIR, 'stills');
const OUTPUT_VIDEO  = path.resolve(OUTPUT_DIR, 'livex-film-15s.mp4');

// Keyframe times (seconds) for preview-stills mode
const KEYFRAME_TIMES = [0.3, 1.5, 2.8, 3.8, 5.5, 7.8, 10.5, 14.2];

// ─────────────────────────────────────────────
// BROWSER EXECUTABLE
// ─────────────────────────────────────────────
function getBrowserExecutablePath() {
  const edgeCoreDir = 'C:\\Program Files (x86)\\Microsoft\\EdgeCore';
  if (fs.existsSync(edgeCoreDir)) {
    const versions = fs.readdirSync(edgeCoreDir)
      .filter(v => fs.existsSync(path.join(edgeCoreDir, v, 'msedge.exe')))
      .sort();
    if (versions.length > 0) {
      return path.join(edgeCoreDir, versions[versions.length - 1], 'msedge.exe');
    }
  }
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return undefined;
}

// ─────────────────────────────────────────────
// FFMPEG
// ─────────────────────────────────────────────
function getFfmpegPath() {
  try {
    return require('ffmpeg-static');
  } catch {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
    throw new Error('ffmpeg-static not found. Run: pnpm add -D -w ffmpeg-static');
  }
}

// ─────────────────────────────────────────────
// ASSET HELPERS
// ─────────────────────────────────────────────
function fileToDataUrl(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

// ─────────────────────────────────────────────
// MOTION BLUR: blend N subframes into one
// Each subframe is captured at t + (s/SUBFRAMES)/FPS
// ─────────────────────────────────────────────
async function captureBlurredFrame(page, blurCanvas, blurCtx, frameIndex) {
  const outputFrame = frameIndex;
  const baseT = frameIndex / FPS;

  // We accumulate on a separate canvas by averaging JPEG pixel data
  // For simplicity in headless context: we take the final subframe and a
  // weighted-alpha composite of the surrounding ones.
  // Since seek() is deterministic, we render each sub-sample and average.

  // Clear accumulator
  blurCtx.clearRect(0, 0, W, H);

  const weight = 1 / SUBFRAMES;

  for (let s = 0; s < SUBFRAMES; s++) {
    const subT = baseT + (s / SUBFRAMES) / FPS;
    const clampedT = Math.min(subT, DURATION - 0.001);
    const subFrame = Math.floor(subT * FPS);

    // Draw sub-frame in engine
    await page.evaluate(
      (t, fi) => window.seek(t, fi),
      clampedT, subFrame
    );

    // Screenshot the canvas
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 95,
      omitBackground: false,
    });

    // Draw into accumulator with fractional alpha
    const img = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' }))
      .catch(() => null);

    if (img) {
      blurCtx.save();
      // Triangular weight: middle subframes weighted more
      const w = weight * (1 - Math.abs((s - (SUBFRAMES - 1) / 2) / SUBFRAMES) * 0.4);
      blurCtx.globalAlpha = w;
      blurCtx.drawImage(img, 0, 0);
      blurCtx.restore();
    }
  }

  // Return composited JPEG
  return new Promise(resolve => {
    blurCanvas.toBlob(blob => {
      blob.arrayBuffer().then(ab => resolve(Buffer.from(ab)));
    }, 'image/jpeg', 0.92);
  });
}

// Simple single-frame capture (faster, used for stills)
async function captureFrame(page, t, frameIndex) {
  await page.evaluate((ts, fi) => window.seek(ts, fi), t, frameIndex);
  return page.screenshot({ type: 'png', omitBackground: false });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
const isPreviewStills = process.argv.includes('--preview-stills');

async function main() {
  const startTime = Date.now();
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Livex Film Engine — 15s Promo Render');
  console.log(`  Mode: ${isPreviewStills ? 'Preview Stills (8 keyframes)' : 'Full 60fps Render (900 frames)'}`);
  console.log('══════════════════════════════════════════════════════════════');

  // Ensure output dirs
  [OUTPUT_DIR, STILLS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Asset paths
  const symbolPath = path.join(ASSETS_DIR, 'livex-symbol.png');
  const logoPath   = path.join(ASSETS_DIR, 'livex-logo.png');
  const symbolData = fileToDataUrl(symbolPath);
  const logoData   = fileToDataUrl(logoPath);
  console.log(`[ASSETS] symbol: ${symbolData ? 'OK' : 'not found (using fallback)'}`);
  console.log(`[ASSETS] logo:   ${logoData   ? 'OK' : 'not found (using fallback)'}`);

  // Browser
  const execPath = getBrowserExecutablePath();
  console.log(`[BROWSER] ${execPath || '(bundled Chromium)'}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--window-size=${W},${H}`,
      '--force-device-scale-factor=1',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  // Load engine
  const engineUrl = `file:///${ENGINE_HTML.replace(/\\/g, '/')}`;
  console.log(`[ENGINE] Loading ${engineUrl}...`);
  await page.goto(engineUrl, { waitUntil: 'load', timeout: 30000 });

  // Wait for Geist font from CDN (best-effort; falls back gracefully)
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 800));

  // Inject assets and init
  console.log('[ENGINE] Initializing...');
  await page.evaluate(
    (sym, logo) => {
      window.injectAssets(sym || '', logo || '');
      return window.initEngine();
    },
    symbolData, logoData
  );
  await new Promise(r => setTimeout(r, 400));

  // ── PREVIEW STILLS MODE ──────────────────────
  if (isPreviewStills) {
    console.log(`[STILLS] Capturing ${KEYFRAME_TIMES.length} keyframes...`);
    for (const [i, t] of KEYFRAME_TIMES.entries()) {
      const fi = Math.floor(t * FPS);
      const buf = await captureFrame(page, t, fi);
      const name = `keyframe-${String(i + 1).padStart(2, '0')}-t${t.toFixed(1)}s.png`;
      const out  = path.join(STILLS_DIR, name);
      fs.writeFileSync(out, buf);
      console.log(`  ✓ ${name}`);
    }
    await browser.close();
    console.log(`\n[STILLS] Saved to .artifacts/marketing/stills/`);
    console.log(`  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return;
  }

  // ── FULL RENDER MODE ────────────────────────
  const ffmpegPath = getFfmpegPath();
  console.log(`[FFMPEG] ${ffmpegPath}`);

  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-preset', 'medium',
    '-crf', String(CRF),
    '-movflags', '+faststart',
    OUTPUT_VIDEO,
  ];

  const ffmpegProc = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  ffmpegProc.on('error', err => { console.error('[FFMPEG ERROR]', err); });

  // For motion blur: note that createImageBitmap is a browser API, not Node.
  // In the Node/Puppeteer context we render each sub-frame directly inside
  // the browser page and accumulate on a second canvas element.
  // We inject a compositor canvas into the page for blending.
  await page.evaluate((subs, width, height) => {
    window._blurCanvas = document.createElement('canvas');
    window._blurCanvas.width  = width;
    window._blurCanvas.height = height;
    window._blurCtx = window._blurCanvas.getContext('2d');
    window._SUBFRAMES = subs;
    window._W = width;
    window._H = height;

    // Accumulate N subframes into _blurCanvas, return data-url
    window.renderBlurredFrame = async function(frameIndex, fps, duration) {
      const _blurCtx = window._blurCtx;
      const _blurCanvas = window._blurCanvas;
      _blurCtx.clearRect(0, 0, width, height);

      const weight = 1 / subs;
      const baseT  = frameIndex / fps;

      for (let s = 0; s < subs; s++) {
        let subT = baseT + (s / subs) / fps;
        if (subT > duration - 0.001) subT = duration - 0.001;
        const subFI = Math.floor(subT * fps);
        window.seek(subT, subFI);

        // Grab current canvas content
        const mainC = document.getElementById('c');
        // Triangle weight: center subframes heavier
        const w = weight * (1 - Math.abs((s - (subs - 1) / 2) / subs) * 0.35);
        _blurCtx.save();
        _blurCtx.globalAlpha = w;
        _blurCtx.drawImage(mainC, 0, 0);
        _blurCtx.restore();
      }

      return _blurCanvas.toDataURL('image/jpeg', 0.92);
    };
  }, SUBFRAMES, W, H);

  console.log(`[RENDER] Streaming ${TOTAL_FRAMES} frames (${SUBFRAMES}x motion blur)...`);
  const renderStart = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    // Render blurred frame inside the browser page
    const dataUrl = await page.evaluate(
      (fi, fps, dur) => window.renderBlurredFrame(fi, fps, dur),
      frame, FPS, DURATION
    );

    // Strip data-url prefix, decode base64 to buffer
    const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(b64, 'base64');

    const canWrite = ffmpegProc.stdin.write(buffer);
    if (!canWrite) {
      await new Promise(resolve => ffmpegProc.stdin.once('drain', resolve));
    }

    if (frame % 60 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct       = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      const elapsed   = (Date.now() - renderStart) / 1000;
      const fpsRate   = (frame / elapsed).toFixed(1);
      const etaSec    = elapsed / (frame + 1) * (TOTAL_FRAMES - frame - 1);
      process.stdout.write(
        `  Frame ${frame + 1}/${TOTAL_FRAMES} (${pct}%) @ ${fpsRate} fps — ETA ${etaSec.toFixed(0)}s   \r`
      );
    }
  }

  process.stdout.write('\n');
  console.log('[RENDER] All frames delivered. Finalizing MP4...');
  ffmpegProc.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpegProc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  await browser.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(OUTPUT_VIDEO);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('══════════════════════════════════════════════════════════════');
  console.log(`✓ Livex film rendered in ${totalTime}s`);
  console.log(`  File : .artifacts/marketing/livex-film-15s.mp4`);
  console.log(`  Size : ${sizeMb} MB  |  ${W}x${H} @ ${FPS}fps  |  ${DURATION}s`);
  console.log('══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n[ERROR]', err.message || err);
  process.exit(1);
});
