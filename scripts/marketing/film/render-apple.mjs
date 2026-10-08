#!/usr/bin/env node
/**
 * Livex Apple-Style Promo Render Pipeline
 *
 * Drives engine-apple.html through Puppeteer (Edge), injects real app
 * screenshots into the Pixel phone mockup, accumulates 4 sub-frames per
 * output frame for crisp motion sampling, then pipes JPEG to ffmpeg for H.264.
 *
 * Output: .artifacts/marketing/livex-apple-promo.mp4  (1440×1080 @ 60fps, 20s)
 *
 * Usage:
 *   node scripts/marketing/film/render-apple.mjs                  # full 20s render
 *   node scripts/marketing/film/render-apple.mjs --preview-stills # 8 keyframe PNGs
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
const W            = 1440;
const H            = 1080;
const FPS          = 60;
const DURATION     = 20.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION);  // 1200
const SUBFRAMES    = 4;   // lighter than film (Apple style has no motion blur)
const CRF          = 15;  // very high quality

const ENGINE_HTML  = path.resolve(__dirname, 'engine-apple.html');
const RAW_DIR      = path.resolve(REPO_ROOT, '.artifacts', 'marketing', '.raw');
const OUTPUT_DIR   = path.resolve(REPO_ROOT, '.artifacts', 'marketing');
const STILLS_DIR   = path.resolve(OUTPUT_DIR, 'stills-apple');
const OUTPUT_VIDEO = path.resolve(OUTPUT_DIR, 'livex-apple-promo.mp4');

// Keyframes spread across the 5 acts (0-4.5s, 4.5-9.5s, 9.5-13.5s, 13.5-17.5s, 17.5-20s)
const KEYFRAME_TIMES = [1.0, 3.5, 5.5, 7.5, 10.5, 12.5, 15.5, 19.0];

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
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found: ${filePath}`);
    return null;
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

// Simple single-frame capture (used for stills)
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
  console.log('  Livex Apple-Style Promo — 20s Render Pipeline');
  console.log(`  Mode: ${isPreviewStills ? 'Preview Stills (8 keyframes)' : `Full 60fps Render (${TOTAL_FRAMES} frames)`}`);
  console.log('══════════════════════════════════════════════════════════════');

  // Ensure output dirs
  [OUTPUT_DIR, STILLS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Load the three app screenshots as base64 data-URLs
  const hubPath     = path.resolve(RAW_DIR, 'hub-library.png');
  const groovexPath = path.resolve(RAW_DIR, 'groovex-player.png');
  const livePath    = path.resolve(RAW_DIR, 'live-teleprompter.png');

  const hubB64    = fileToDataUrl(hubPath);
  const groovexB64 = fileToDataUrl(groovexPath);
  const liveB64   = fileToDataUrl(livePath);

  console.log(`[ASSETS] hub-library:       ${hubB64     ? `OK (${Math.round(fs.statSync(hubPath).size / 1024)} KB)` : 'MISSING'}`);
  console.log(`[ASSETS] groovex-player:    ${groovexB64 ? `OK (${Math.round(fs.statSync(groovexPath).size / 1024)} KB)` : 'MISSING'}`);
  console.log(`[ASSETS] live-teleprompter: ${liveB64    ? `OK (${Math.round(fs.statSync(livePath).size / 1024)} KB)` : 'MISSING'}`);

  if (!hubB64 || !groovexB64 || !liveB64) {
    throw new Error('One or more app screenshots are missing from .artifacts/marketing/.raw/');
  }

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

  // Wait for Geist font from CDN
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 800));

  // Init engine (pre-warm fonts)
  console.log('[ENGINE] Initializing...');
  await page.evaluate(() => window.initEngine());
  await new Promise(r => setTimeout(r, 400));

  // Inject app screenshots into the engine
  console.log('[ENGINE] Injecting app screenshots...');
  await page.evaluate(
    (h, g, l) => window.injectScreenshots(h, g, l),
    hubB64, groovexB64, liveB64
  );
  // Give images time to fully decode inside the engine
  await new Promise(r => setTimeout(r, 600));
  console.log('[ENGINE] Screenshots injected. Ready to render.');

  // ── PREVIEW STILLS MODE ──────────────────────
  if (isPreviewStills) {
    console.log(`[STILLS] Capturing ${KEYFRAME_TIMES.length} keyframes...`);
    for (const [i, t] of KEYFRAME_TIMES.entries()) {
      const fi  = Math.floor(t * FPS);
      const buf = await captureFrame(page, t, fi);
      const name = `apple-${String(i + 1).padStart(2, '0')}-t${t.toFixed(1)}s.png`;
      const out  = path.join(STILLS_DIR, name);
      fs.writeFileSync(out, buf);
      console.log(`  ✓ ${name}`);
    }
    await browser.close();
    console.log(`\n[STILLS] Saved to .artifacts/marketing/stills-apple/`);
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

  // Inject the sub-frame accumulator into the browser page context
  // (avoids Node.js createImageBitmap unavailability)
  await page.evaluate((subs, width, height, dur) => {
    window._blurCanvas = document.createElement('canvas');
    window._blurCanvas.width  = width;
    window._blurCanvas.height = height;
    window._blurCtx = window._blurCanvas.getContext('2d');
    window._SUBS = subs;
    window._DUR  = dur;

    // Accumulate N subframes into _blurCanvas and return as JPEG data-url
    window.renderBlurredFrame = function(frameIndex, fps) {
      const ctx  = window._blurCtx;
      const bc   = window._blurCanvas;
      ctx.clearRect(0, 0, width, height);

      const weight = 1 / subs;
      const baseT  = frameIndex / fps;
      const mainC  = document.getElementById('c');

      for (let s = 0; s < subs; s++) {
        let subT = baseT + (s / subs) / fps;
        if (subT > dur - 0.001) subT = dur - 0.001;
        const subFI = Math.floor(subT * fps);
        window.seek(subT, subFI);

        // Slightly heavier weight toward center subframes for smoothness
        const w = weight * (1 - Math.abs((s - (subs - 1) / 2) / subs) * 0.25);
        ctx.save();
        ctx.globalAlpha = w;
        ctx.drawImage(mainC, 0, 0);
        ctx.restore();
      }

      return bc.toDataURL('image/jpeg', 0.94);
    };
  }, SUBFRAMES, W, H, DURATION);

  console.log(`[RENDER] Streaming ${TOTAL_FRAMES} frames (${SUBFRAMES}x sub-sampling, ${DURATION}s @ ${FPS}fps)...`);
  const renderStart = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const dataUrl = await page.evaluate(
      (fi, fps) => window.renderBlurredFrame(fi, fps),
      frame, FPS
    );

    const b64    = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(b64, 'base64');

    const canWrite = ffmpegProc.stdin.write(buffer);
    if (!canWrite) {
      await new Promise(resolve => ffmpegProc.stdin.once('drain', resolve));
    }

    if (frame % 60 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct     = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      const elapsed = (Date.now() - renderStart) / 1000;
      const fpsRate = (frame / Math.max(elapsed, 0.001)).toFixed(1);
      const etaSec  = elapsed / (frame + 1) * (TOTAL_FRAMES - frame - 1);
      const act     = frame < 270 ? 'Brand Intro'
                    : frame < 570 ? 'Hub Library'
                    : frame < 810 ? 'Groovex'
                    : frame < 1050 ? 'Live Mode'
                    : 'Outro';
      process.stdout.write(
        `  Frame ${String(frame + 1).padStart(4)}/${TOTAL_FRAMES} (${pct}%) [${act}] @ ${fpsRate} fps — ETA ${etaSec.toFixed(0)}s   \r`
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
  const stats  = fs.statSync(OUTPUT_VIDEO);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('══════════════════════════════════════════════════════════════');
  console.log(`✓ Apple promo rendered in ${totalTime}s`);
  console.log(`  File : .artifacts/marketing/livex-apple-promo.mp4`);
  console.log(`  Size : ${sizeMb} MB  |  ${W}x${H} @ ${FPS}fps  |  ${DURATION}s`);
  console.log('══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n[ERROR]', err.message || err);
  process.exit(1);
});
