#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

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
  const img1 = fs.readFileSync(path.join(artifactDir, 'verify_continuous_1_checking.png')).toString('base64');
  const img2 = fs.readFileSync(path.join(artifactDir, 'verify_continuous_2_available.png')).toString('base64');
  const img3 = fs.readFileSync(path.join(artifactDir, 'verify_continuous_3_downloading.png')).toString('base64');
  const img4 = fs.readFileSync(path.join(artifactDir, 'verify_continuous_4_download_100.png')).toString('base64');
  const img5 = fs.readFileSync(path.join(artifactDir, 'verify_continuous_5_installing.png')).toString('base64');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    padding: 32px;
    background: #09090b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .header {
    text-align: center;
    margin-bottom: 28px;
  }
  .header h1 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 8px 0;
    color: #f4f4f5;
  }
  .header p {
    font-size: 14px;
    color: #a1a1aa;
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
  }
  .card {
    background: #141416;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .badge {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 9999px;
    margin-bottom: 12px;
    letter-spacing: -0.01em;
  }
  .badge-1 { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
  .badge-2 { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
  .badge-3 { background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); }
  .badge-4 { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
  .badge-5 { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

  .card img {
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .desc {
    font-size: 11.5px;
    color: #71717a;
    margin-top: 10px;
    text-align: center;
    line-height: 1.4;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Livex Updater: Continuous Surface & State Transitions Verification</h1>
    <p>Zero-unmount DOM persistence throughout full lifecycle: Checking → Update Available → Downloading → 100% → Installing</p>
  </div>
  <div class="grid">
    <div class="card">
      <div class="badge badge-1">1. Checking</div>
      <img src="data:image/png;base64,${img1}" />
      <div class="desc">Compact status card with animated indeterminate blue progress line.</div>
    </div>
    <div class="card">
      <div class="badge badge-2">2. Update Available</div>
      <img src="data:image/png;base64,${img2}" />
      <div class="desc">Spring-morphed in-place on same persistent card node. Title crossfaded.</div>
    </div>
    <div class="card">
      <div class="badge badge-3">3. Downloading</div>
      <img src="data:image/png;base64,${img3}" />
      <div class="desc">Button morphed into progress card (32%). Smooth horizontal progress fill.</div>
    </div>
    <div class="card">
      <div class="badge badge-4">4. 100% Downloaded</div>
      <img src="data:image/png;base64,${img4}" />
      <div class="desc">Download completed to 100%. Full bar fill, transferred bytes match total.</div>
    </div>
    <div class="card">
      <div class="badge badge-5">5. Installing</div>
      <img src="data:image/png;base64,${img5}" />
      <div class="desc">In-place crossfade: "Installing...", "Verifying package", spring height adapt.</div>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: getBrowserExecutablePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(artifactDir, 'verify_updater_continuous_lifecycle.png'), fullPage: true });
  await browser.close();
  console.log('✓ Created verify_updater_continuous_lifecycle.png composite artifact');
}

run().catch(console.error);
