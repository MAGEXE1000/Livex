#!/usr/bin/env node
/**
 * Canonical Android Launcher Icon & PWA Asset Synchronization Tool
 *
 * Single Source of Truth:
 * - Master Badge: packages/ui-shared/src/assets/livex-logo.png
 * - Master Symbol: packages/ui-shared/src/assets/livex-symbol.png
 *
 * Cross-platform generation via sharp (Linux, macOS, Windows) with PowerShell GDI+ fallback.
 * Strict multi-point verification gate for CI and release preflight.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Retired/Obsolete Waveform Hashes (Must NEVER appear in active resources)
const RETIRED_WAVEFORM_HASHES = new Set([
  '4202380abc7816c6e6c99f6c35960861d063969315a56ecfbc0ca8da25c3e1ce', // xxxhdpi foreground
]);

// Default Canonical Source Assets
const defaultMasterBadge = path.join(repoRoot, 'packages', 'ui-shared', 'src', 'assets', 'livex-logo.png');
const defaultMasterSymbol = path.join(repoRoot, 'packages', 'ui-shared', 'src', 'assets', 'livex-symbol.png');

// Target Directories
const androidResDir = path.join(repoRoot, 'apps', 'studio-android', 'android', 'app', 'src', 'main', 'res');
const androidManifestPath = path.join(repoRoot, 'apps', 'studio-android', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const androidPublicDir = path.join(repoRoot, 'apps', 'studio-android', 'public');
const webPublicDir = path.join(repoRoot, 'apps', 'studio-web', 'public');

// Android Density Matrix (108dp adaptive canvas, 48dp legacy launcher)
const densityMatrix = [
  { density: 'mdpi', scale: 1.0, launcher: 48, round: 48, foreground: 108 },
  { density: 'hdpi', scale: 1.5, launcher: 72, round: 72, foreground: 162 },
  { density: 'xhdpi', scale: 2.0, launcher: 96, round: 96, foreground: 216 },
  { density: 'xxhdpi', scale: 3.0, launcher: 144, round: 144, foreground: 324 },
  { density: 'xxxhdpi', scale: 4.0, launcher: 192, round: 192, foreground: 432 }
];

// Helper to read PNG dimensions from IHDR chunk
function getPngDimensions(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
      return null;
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height, size: buf.length };
  } catch {
    return null;
  }
}

// Compute sha256 checksum
function getSha256(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return 'MISSING';
  }
}

// Parse Command Line Arguments
const args = process.argv.slice(2);
const isVerifyOnly = args.includes('--verify');
let customSource = null;
let customSymbol = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source' && args[i + 1]) {
    customSource = path.resolve(process.cwd(), args[i + 1]);
    i++;
  } else if (args[i] === '--symbol' && args[i + 1]) {
    customSymbol = path.resolve(process.cwd(), args[i + 1]);
    i++;
  }
}

const masterBadgePath = customSource || defaultMasterBadge;
const masterSymbolPath = customSymbol || defaultMasterSymbol;

console.log('================================================================');
console.log('    CANONICAL ANDROID LAUNCHER ICON & ASSET SYNCHRONIZATION     ');
console.log('================================================================');
console.log('Master Badge:  ' + path.relative(repoRoot, masterBadgePath));
console.log('Master Symbol: ' + path.relative(repoRoot, masterSymbolPath));

if (!fs.existsSync(masterBadgePath)) {
  console.error('✗ ERROR: Master badge asset does not exist: ' + masterBadgePath);
  process.exit(1);
}
if (!fs.existsSync(masterSymbolPath)) {
  console.error('✗ ERROR: Master symbol asset does not exist: ' + masterSymbolPath);
  process.exit(1);
}

// Compile list of expected targets
const targets = [];

// 1. Android Native Mipmaps (15 files)
for (const item of densityMatrix) {
  const dir = path.join(androidResDir, 'mipmap-' + item.density);
  targets.push({
    category: 'Android Mipmap (' + item.density + ')',
    relPath: path.relative(repoRoot, path.join(dir, 'ic_launcher.png')),
    absPath: path.join(dir, 'ic_launcher.png'),
    source: masterBadgePath,
    width: item.launcher,
    height: item.launcher,
    isRound: false,
    isForeground: false
  });
  targets.push({
    category: 'Android Mipmap (' + item.density + ')',
    relPath: path.relative(repoRoot, path.join(dir, 'ic_launcher_round.png')),
    absPath: path.join(dir, 'ic_launcher_round.png'),
    source: masterBadgePath,
    width: item.round,
    height: item.round,
    isRound: true,
    isForeground: false
  });
  targets.push({
    category: 'Android Mipmap (' + item.density + ')',
    relPath: path.relative(repoRoot, path.join(dir, 'ic_launcher_foreground.png')),
    absPath: path.join(dir, 'ic_launcher_foreground.png'),
    source: masterSymbolPath,
    width: item.foreground,
    height: item.foreground,
    isRound: false,
    isForeground: true
  });
}

// 2. Android Public / Web Assets
targets.push({
  category: 'Android Web/PWA Asset',
  relPath: path.relative(repoRoot, path.join(androidPublicDir, 'icon-192.png')),
  absPath: path.join(androidPublicDir, 'icon-192.png'),
  source: masterBadgePath,
  width: 192,
  height: 192,
  isRound: false,
  isForeground: false
});
targets.push({
  category: 'Android Web/PWA Asset',
  relPath: path.relative(repoRoot, path.join(androidPublicDir, 'icon-512.png')),
  absPath: path.join(androidPublicDir, 'icon-512.png'),
  source: masterBadgePath,
  width: 512,
  height: 512,
  isRound: false,
  isForeground: false
});
targets.push({
  category: 'Android Web/PWA Asset',
  relPath: path.relative(repoRoot, path.join(androidPublicDir, 'studio-icon-1024.png')),
  absPath: path.join(androidPublicDir, 'studio-icon-1024.png'),
  source: masterBadgePath,
  width: 1024,
  height: 1024,
  isRound: false,
  isForeground: false
});
targets.push({
  category: 'Android Web/PWA Asset',
  relPath: path.relative(repoRoot, path.join(androidPublicDir, 'studio-icon-android.png')),
  absPath: path.join(androidPublicDir, 'studio-icon-android.png'),
  source: masterBadgePath,
  width: 512,
  height: 512,
  isRound: false,
  isForeground: false
});
targets.push({
  category: 'Android Web/PWA Asset',
  relPath: path.relative(repoRoot, path.join(androidPublicDir, 'studio-icon-foreground.png')),
  absPath: path.join(androidPublicDir, 'studio-icon-foreground.png'),
  source: masterSymbolPath,
  width: 432,
  height: 432,
  isRound: false,
  isForeground: true
});

async function runVerify() {
  console.log('\n[VERIFY MODE] Running 7-point launcher icon & manifest integrity check...');
  let hasErrors = false;

  // 1. Asset existence, PNG validity & dimension check
  for (const t of targets) {
    if (!fs.existsSync(t.absPath)) {
      console.error('✗ MISSING: ' + t.relPath);
      hasErrors = true;
      continue;
    }
    const dims = getPngDimensions(t.absPath);
    if (!dims) {
      console.error('✗ INVALID PNG: ' + t.relPath);
      hasErrors = true;
      continue;
    }
    if (dims.width !== t.width || dims.height !== t.height) {
      console.error('✗ DIMENSION MISMATCH: ' + t.relPath + ' expected ' + t.width + 'x' + t.height + ', got ' + dims.width + 'x' + dims.height);
      hasErrors = true;
      continue;
    }

    // 2. Obsolete waveform hash check
    const sha = getSha256(t.absPath);
    if (RETIRED_WAVEFORM_HASHES.has(sha)) {
      console.error('✗ CRITICAL REGRESSION: Retired waveform icon detected in ' + t.relPath + ' (SHA-256: ' + sha + ')');
      hasErrors = true;
      continue;
    }

    console.log('✓ OK: ' + t.relPath + ' (' + dims.width + 'x' + dims.height + ', ' + dims.size + ' bytes)');
  }

  // 3. AndroidManifest.xml launcher integrity
  if (fs.existsSync(androidManifestPath)) {
    const manifestSrc = fs.readFileSync(androidManifestPath, 'utf8');

    // Reject activity-alias
    if (manifestSrc.includes('<activity-alias')) {
      console.error('✗ ARCHITECTURAL DEFECT: <activity-alias> found in AndroidManifest.xml. Activity aliases for launcher icons are prohibited.');
      hasErrors = true;
    } else {
      console.log('✓ Manifest Invariant: No <activity-alias> elements found.');
    }

    // Ensure android:icon and android:roundIcon point to mipmap/ic_launcher
    if (!manifestSrc.includes('android:icon="@mipmap/ic_launcher"') || !manifestSrc.includes('android:roundIcon="@mipmap/ic_launcher_round"')) {
      console.error('✗ Manifest Invariant: android:icon or android:roundIcon not configured with @mipmap/ic_launcher.');
      hasErrors = true;
    } else {
      console.log('✓ Manifest Invariant: android:icon and roundIcon configured to @mipmap/ic_launcher.');
    }

    // Ensure MainActivity is the launchable activity
    if (!manifestSrc.includes('android:name=".MainActivity"')) {
      console.error('✗ Manifest Invariant: .MainActivity not found in AndroidManifest.xml.');
      hasErrors = true;
    } else {
      console.log('✓ Manifest Invariant: .MainActivity registered.');
    }
  } else {
    console.error('✗ MISSING: ' + androidManifestPath);
    hasErrors = true;
  }

  // 4. Adaptive icon XML configuration check
  const adaptiveXmlPath = path.join(androidResDir, 'mipmap-anydpi-v26', 'ic_launcher.xml');
  if (fs.existsSync(adaptiveXmlPath)) {
    const xml = fs.readFileSync(adaptiveXmlPath, 'utf8');
    if (!xml.includes('foreground') || !xml.includes('background') || !xml.includes('monochrome')) {
      console.error('✗ Adaptive Icon XML: Missing foreground, background, or monochrome tags in ' + adaptiveXmlPath);
      hasErrors = true;
    } else {
      console.log('✓ Adaptive Icon XML: Full adaptive + monochrome configuration verified.');
    }
  } else {
    console.error('✗ MISSING: ' + adaptiveXmlPath);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\n✗ Icon verification failed! Run pnpm sync:icons to regenerate.');
    process.exit(1);
  } else {
    console.log('\n✓ All 7-point launcher icon and manifest integrity checks passed.');
    console.log('================================================================\n');
    process.exit(0);
  }
}

async function runGenerate() {
  console.log('\n[GENERATION MODE] Deriving and synchronizing ' + targets.length + ' icon assets...');

  let sharp = null;
  try {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
    console.log('✓ Loaded high-performance cross-platform engine: sharp v' + sharp.versions.sharp);
  } catch (e) {
    console.warn('Notice: sharp not available (' + e.message + '), will evaluate fallback methods.');
  }

  if (sharp) {
    // Pure Node.js cross-platform deterministic rendering
    for (const t of targets) {
      const dir = path.dirname(t.absPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (t.isRound) {
        const circleSvg = Buffer.from(
          `<svg width="${t.width}" height="${t.height}"><circle cx="${t.width / 2}" cy="${t.height / 2}" r="${t.width / 2}" fill="#fff" /></svg>`
        );
        await sharp(t.source)
          .resize(t.width, t.height, { fit: 'fill' })
          .composite([{ input: circleSvg, blend: 'dest-in' }])
          .png()
          .toFile(t.absPath);
      } else if (t.isForeground) {
        // Safe zone: 66dp / 108dp = 0.61111
        const safeDim = Math.round(t.width * (66 / 108));
        const meta = await sharp(t.source).metadata();
        const aspect = (meta.width || 1) / (meta.height || 1);
        let drawW, drawH;
        if (aspect >= 1.0) {
          drawW = safeDim;
          drawH = Math.round(safeDim / aspect);
        } else {
          drawH = safeDim;
          drawW = Math.round(safeDim * aspect);
        }
        const padLeft = Math.floor((t.width - drawW) / 2);
        const padTop = Math.floor((t.height - drawH) / 2);
        const padRight = t.width - drawW - padLeft;
        const padBottom = t.height - drawH - padTop;

        await sharp(t.source)
          .resize(drawW, drawH, { fit: 'fill' })
          .extend({
            top: padTop,
            bottom: padBottom,
            left: padLeft,
            right: padRight,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(t.absPath);
      } else {
        await sharp(t.source)
          .resize(t.width, t.height, { fit: 'fill' })
          .png()
          .toFile(t.absPath);
      }
      console.log('✓ Generated: ' + t.relPath);
    }
  } else if (process.platform === 'win32') {
    // Windows PowerShell GDI+ fallback
    console.log('→ Using Windows PowerShell GDI+ fallback generator...');
    const psCommands = [
      'Add-Type -AssemblyName System.Drawing',
      '$pngFormat = [System.Drawing.Imaging.ImageFormat]::Png',
      '',
      'function Render-Asset {',
      '    param([string]$srcPath, [string]$dstPath, [int]$w, [int]$h, [bool]$round, [bool]$foreground)',
      '    $src = [System.Drawing.Bitmap]::FromFile($srcPath)',
      '    $dst = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)',
      '    $g = [System.Drawing.Graphics]::FromImage($dst)',
      '    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic',
      '    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality',
      '    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality',
      '    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality',
      '    $g.Clear([System.Drawing.Color]::Transparent)',
      '    if ($round) {',
      '        $path = New-Object System.Drawing.Drawing2D.GraphicsPath',
      '        $path.AddEllipse(0, 0, $w, $h)',
      '        $g.SetClip($path)',
      '        $g.DrawImage($src, 0, 0, $w, $h)',
      '        $path.Dispose()',
      '    } elseif ($foreground) {',
      '        $safeDim = [int]($w * (66.0 / 108.0))',
      '        $aspect = $src.Width / [double]$src.Height',
      '        if ($aspect -ge 1.0) { $drawW = $safeDim; $drawH = [int]($safeDim / $aspect) } else { $drawH = $safeDim; $drawW = [int]($safeDim * $aspect) }',
      '        $offX = [int](($w - $drawW) / 2)',
      '        $offY = [int](($h - $drawH) / 2)',
      '        $g.DrawImage($src, $offX, $offY, $drawW, $drawH)',
      '    } else {',
      '        $g.DrawImage($src, 0, 0, $w, $h)',
      '    }',
      '    $g.Dispose()',
      '    $src.Dispose()',
      '    $dir = [System.IO.Path]::GetDirectoryName($dstPath)',
      '    if (-not (Test-Path $dir)) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }',
      '    if (Test-Path $dstPath) { Remove-Item -Force $dstPath }',
      '    $dst.Save($dstPath, $pngFormat)',
      '    $dst.Dispose()',
      '}'
    ];

    for (const t of targets) {
      const normSrc = t.source.replace(/\\/g, '/');
      const normDst = t.absPath.replace(/\\/g, '/');
      psCommands.push(
        'Render-Asset "' + normSrc + '" "' + normDst + '" ' + t.width + ' ' + t.height + ' ' +
        (t.isRound ? '$true' : '$false') + ' ' + (t.isForeground ? '$true' : '$false')
      );
    }

    const tempPsFile = path.join(repoRoot, '.temp', 'sync-icons-' + Date.now() + '.ps1');
    const tempDir = path.dirname(tempPsFile);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempPsFile, psCommands.join('\r\n'), 'utf8');

    try {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', tempPsFile
      ], { stdio: 'inherit' });
    } finally {
      try { if (fs.existsSync(tempPsFile)) fs.unlinkSync(tempPsFile); } catch {}
    }
  } else {
    console.error('✗ ERROR: Neither sharp nor Windows PowerShell is available for icon generation.');
    process.exit(1);
  }

  // Copy raw master assets to public folders for parity
  const masterBadgeCopy1 = path.join(androidPublicDir, 'livex-logo.png');
  const masterSymbolCopy1 = path.join(androidPublicDir, 'livex-symbol.png');
  fs.copyFileSync(masterBadgePath, masterBadgeCopy1);
  fs.copyFileSync(masterSymbolPath, masterSymbolCopy1);

  if (fs.existsSync(webPublicDir)) {
    fs.copyFileSync(masterBadgePath, path.join(webPublicDir, 'livex-logo.png'));
    fs.copyFileSync(masterSymbolPath, path.join(webPublicDir, 'livex-symbol.png'));
    fs.copyFileSync(path.join(androidPublicDir, 'icon-192.png'), path.join(webPublicDir, 'icon-192.png'));
    fs.copyFileSync(path.join(androidPublicDir, 'icon-512.png'), path.join(webPublicDir, 'icon-512.png'));
  }

  // Mirror to secondary Capacitor resources folders
  const secondaryResDirs = [
    path.join(repoRoot, 'resources'),
    path.join(repoRoot, 'apps', 'studio-android', 'resources')
  ];

  for (const secDir of secondaryResDirs) {
    if (fs.existsSync(secDir)) {
      try {
        fs.copyFileSync(masterBadgePath, path.join(secDir, 'icon.png'));
        fs.copyFileSync(masterBadgePath, path.join(secDir, 'icon-only.png'));
        fs.copyFileSync(masterSymbolPath, path.join(secDir, 'icon-foreground.png'));
        for (const item of densityMatrix) {
          const srcMipmap = path.join(androidResDir, 'mipmap-' + item.density);
          const dstMipmap = path.join(secDir, 'mipmap-' + item.density);
          if (!fs.existsSync(dstMipmap)) fs.mkdirSync(dstMipmap, { recursive: true });
          for (const file of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
            const s = path.join(srcMipmap, file);
            const d = path.join(dstMipmap, file);
            if (fs.existsSync(s)) fs.copyFileSync(s, d);
          }
        }
      } catch (e) {
        console.warn('Notice: Could not mirror to ' + secDir + ': ' + e.message);
      }
    }
  }

  console.log('\n✓ Generated and synchronized all ' + targets.length + ' targets.');

  // Final verification pass
  let passCount = 0;
  for (const t of targets) {
    const dims = getPngDimensions(t.absPath);
    if (dims && dims.width === t.width && dims.height === t.height) {
      passCount++;
    } else {
      console.error('✗ Verification failed for ' + t.relPath);
    }
  }

  if (passCount === targets.length) {
    console.log('✓ Validation PASSED: All ' + passCount + ' assets are verified and mathematically aligned.');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error('✗ Validation FAILED: Only ' + passCount + '/' + targets.length + ' assets verified.');
    process.exit(1);
  }
}

if (isVerifyOnly) {
  runVerify();
} else {
  runGenerate();
}
