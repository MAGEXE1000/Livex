#!/usr/bin/env node

/**
 * Livex Google Play Store Feature Graphic Generator
 *
 * Automates the rendering and generation of the official 1024 x 500 px
 * Google Play Store Feature Graphic (Gráfico de funciones):
 *
 * Specifications:
 * - Dimensions: Exactly 1024 x 500 px
 * - Format: PNG (32-bit sRGB, 0 transparent margins)
 * - Safe Zone: Essential typography and branding within central 80% safe zone
 * - Design Language: Pure AMOLED #000000, subtle ambient specular wash,
 *   disciplined Geist typography, and authentic hardware-grade workstation aesthetics.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { buildFeatureGraphicHtml } from './playstore/feature-graphic-template.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLAYSTORE_DIR = path.resolve(REPO_ROOT, '.artifacts', 'marketing', 'playstore');
const OUTPUT_FILE = path.join(PLAYSTORE_DIR, 'feature-graphic-1024x500.png');

if (!fs.existsSync(PLAYSTORE_DIR)) {
  fs.mkdirSync(PLAYSTORE_DIR, { recursive: true });
}

function getBrainArtifactDir() {
  if (process.env.BRAIN_ARTIFACT_DIR && fs.existsSync(process.env.BRAIN_ARTIFACT_DIR)) {
    return process.env.BRAIN_ARTIFACT_DIR;
  }
  const baseBrain = 'C:\\Users\\Mauren\\.gemini\\antigravity\\brain';
  if (fs.existsSync(baseBrain)) {
    const currentConv = '1175433f-38ca-436e-8de8-3b236180ddc4';
    const specific = path.join(baseBrain, currentConv);
    if (fs.existsSync(specific)) return specific;
  }
  return null;
}

const BRAIN_ARTIFACT_DIR = getBrainArtifactDir();

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
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function toBase64DataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  console.log('========================================================================');
  console.log('        LIVEX GOOGLE PLAY STORE — FEATURE GRAPHIC GENERATOR             ');
  console.log('        Target: 1024 x 500 px (Landscape Banner)                        ');
  console.log('        Aesthetic: AMOLED #000000 • Geist Sans • Hardware Console Rig   ');
  console.log('========================================================================');

  // 1. Resolve source graphic inputs
  const iconCandidate = path.join(PLAYSTORE_DIR, 'livex-playstore-icon-transparent-512.png');
  const fallbackIcon = path.resolve(REPO_ROOT, 'packages', 'ui-shared', 'src', 'assets', 'livex-logo.png');
  const iconPath = fs.existsSync(iconCandidate) ? iconCandidate : fallbackIcon;

  const stemsSheetCandidate = path.resolve(REPO_ROOT, '.artifacts', 'verification', 'groovex-stems-morph-sheet.png');
  const groovexCandidate = path.join(PLAYSTORE_DIR, '.raw', '02-groovex-stems.png');
  const fallbackGroovex = path.join(PLAYSTORE_DIR, '02-groovex-stems.png');
  const groovexPath = fs.existsSync(stemsSheetCandidate) 
    ? stemsSheetCandidate 
    : (fs.existsSync(groovexCandidate) ? groovexCandidate : fallbackGroovex);

  const stagexCandidate = path.join(PLAYSTORE_DIR, '.raw', '05-stagex-plot.png');
  const fallbackStagex = path.join(PLAYSTORE_DIR, '05-stagex-plot-export.png');
  const stagexPath = fs.existsSync(stagexCandidate) ? stagexCandidate : fallbackStagex;

  console.log(`[ASSETS] Using Icon:    ${path.basename(iconPath)}`);
  console.log(`[ASSETS] Using Groovex: ${path.basename(groovexPath)}`);
  console.log(`[ASSETS] Using Stagex:  ${path.basename(stagexPath)}`);

  const iconBase64 = toBase64DataUrl(iconPath);
  const groovexBase64 = toBase64DataUrl(groovexPath);
  const stagexBase64 = toBase64DataUrl(stagexPath);

  // 2. Generate HTML
  const html = buildFeatureGraphicHtml({
    iconBase64,
    groovexBase64,
    stagexBase64,
    title: 'Livex',
    tagline: 'The Audio Rehearsal & Live Performance Engine',
    eyebrow: 'PRO AUDIO WORKSTATION',
    badges: ['Low-Latency DSP', 'Multi-Track Stems', 'Offline-First', 'Spatial Stage Plots'],
  });

  // 3. Launch Puppeteer
  const executablePath = getBrowserExecutablePath();
  console.log(`[BROWSER] Launching headless browser (${executablePath || 'default'})...`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();

  // Render at 2x scale for pristine typography antialiasing and subpixel borders
  await page.setViewport({
    width: 1024,
    height: 500,
    deviceScaleFactor: 2,
  });

  console.log('[RENDER] Loading template and waiting for web fonts...');
  await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
  
  // Extra pause to ensure font rasterization and layout settling
  await new Promise((r) => setTimeout(r, 600));

  console.log('[CAPTURE] Capturing raw high-DPI viewport buffer...');
  const rawCaptureBuffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: 1024, height: 500 },
  });

  await browser.close();

  console.log('[COMPOSITE] Downsampling with Sharp Lanczos3 to exact 1024x500 pixels...');
  await sharp(rawCaptureBuffer)
    .resize(1024, 500, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_FILE);

  // 4. Validate output
  const meta = await sharp(OUTPUT_FILE).metadata();
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log('\n------------------ VERIFICATION REPORT ------------------');
  console.log(`✓ Output Path:  ${OUTPUT_FILE}`);
  console.log(`✓ Resolution:   ${meta.width} x ${meta.height} px (Must be 1024 x 500)`);
  console.log(`✓ Channels:     ${meta.channels} (${meta.hasAlpha ? '32-bit RGBA' : '24-bit RGB'})`);
  console.log(`✓ File Size:    ${sizeKb} KB (< 15 MB Play Store limit)`);
  console.log('---------------------------------------------------------');

  if (meta.width !== 1024 || meta.height !== 500) {
    throw new Error(`Invalid dimensions: expected 1024x500, got ${meta.width}x${meta.height}`);
  }

  // Mirror to brain artifact directory if available
  if (BRAIN_ARTIFACT_DIR && fs.existsSync(BRAIN_ARTIFACT_DIR)) {
    try {
      const mirrorPath = path.join(BRAIN_ARTIFACT_DIR, 'feature-graphic-1024x500.png');
      fs.copyFileSync(OUTPUT_FILE, mirrorPath);
      console.log(`✓ Mirrored to session brain artifacts: ${mirrorPath}`);
    } catch (err) {
      console.warn(`[WARN] Could not mirror to brain artifact dir: ${err.message}`);
    }
  }

  console.log('\n[SUCCESS] Feature Graphic successfully generated and ready for Google Play Console.');
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err);
  process.exit(1);
});
