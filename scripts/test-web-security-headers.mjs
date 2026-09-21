/**
 * Automated Verification for Production Web Content Security Policy and Security Headers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('=== Starting Web Security Headers & CSP Test Suite ===\n');

// ── 1. Cloudflare Pages _headers Configuration Tests ─────────────────────────
console.log('--- Suite 1: Cloudflare Pages _headers Configuration ---');

const publicHeadersPath = path.join(process.cwd(), 'apps/studio-web/public/_headers');
const publicHeaders = fs.readFileSync(publicHeadersPath, 'utf-8');

test('public/_headers exists and has headers configuration for /*', () => {
  assert(publicHeaders.includes('/*'), '_headers must define headers for /*');
});

test('public/_headers contains X-Content-Type-Options: nosniff', () => {
  assert(publicHeaders.includes('X-Content-Type-Options: nosniff'));
});

test('public/_headers contains X-Frame-Options: SAMEORIGIN', () => {
  assert(publicHeaders.includes('X-Frame-Options: SAMEORIGIN'));
});

test('public/_headers contains Referrer-Policy: strict-origin-when-cross-origin', () => {
  assert(publicHeaders.includes('Referrer-Policy: strict-origin-when-cross-origin'));
});

test('public/_headers contains Permissions-Policy with microphone and audio allowed', () => {
  assert(publicHeaders.includes('Permissions-Policy: '));
  assert(publicHeaders.includes('microphone=(self)'));
  assert(publicHeaders.includes('camera=()'));
  assert(publicHeaders.includes('geolocation=()'));
  assert(publicHeaders.includes('payment=()'));
  assert(publicHeaders.includes('usb=()'));
  assert(publicHeaders.includes('midi=(self)'));
  assert(publicHeaders.includes('autoplay=(self)'));
});

test('public/_headers contains Strict-Transport-Security with long max-age and includeSubDomains', () => {
  assert(publicHeaders.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains'));
});

test('public/_headers contains Cross-Origin-Opener-Policy: same-origin-allow-popups', () => {
  assert(publicHeaders.includes('Cross-Origin-Opener-Policy: same-origin-allow-popups'));
});

test('public/_headers contains Content-Security-Policy', () => {
  assert(publicHeaders.includes('Content-Security-Policy: default-src'));
});


// ── 2. Detailed CSP Directive Verification ──────────────────────────────────
console.log('\n--- Suite 2: CSP Directives Deep Verification ---');

// Extract CSP string from public/_headers
const cspMatch = publicHeaders.match(/Content-Security-Policy:\s*([^\r\n]+)/);
assert(cspMatch, 'Could not extract CSP string from _headers');
const csp = cspMatch[1].trim();

// Helper to parse directives into a map of directive -> Set of tokens
function parseCsp(cspString) {
  const directives = {};
  const parts = cspString.split(';').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const name = tokens[0];
    directives[name] = new Set(tokens.slice(1));
  }
  return directives;
}

const parsedCsp = parseCsp(csp);

test('default-src is strictly set to self', () => {
  assert.deepEqual(Array.from(parsedCsp['default-src']), ["'self'"]);
});

test('script-src allows self, inline, eval, wasm, and Google/Firebase auth', () => {
  const scripts = parsedCsp['script-src'];
  assert(scripts.has("'self'"), "script-src must include 'self'");
  assert(scripts.has("'unsafe-inline'"), "script-src must include 'unsafe-inline'");
  assert(scripts.has("'unsafe-eval'"), "script-src must include 'unsafe-eval' for lottie-web");
  assert(scripts.has("'wasm-unsafe-eval'"), "script-src must include 'wasm-unsafe-eval' for DSP WebAssembly");
  assert(scripts.has('https://apis.google.com'), 'script-src must include Google APIs');
  assert(scripts.has('https://www.gstatic.com'), 'script-src must include gstatic');
  assert(scripts.has('https://*.firebaseapp.com'), 'script-src must include firebaseapp');
});

test('style-src allows self, inline styles, and Google Fonts', () => {
  const styles = parsedCsp['style-src'];
  assert(styles.has("'self'"));
  assert(styles.has("'unsafe-inline'"));
  assert(styles.has('https://fonts.googleapis.com'));
});

test('font-src allows self, data, and fonts.gstatic.com', () => {
  const fonts = parsedCsp['font-src'];
  assert(fonts.has("'self'"));
  assert(fonts.has('data:'));
  assert(fonts.has('https://fonts.gstatic.com'));
});

test('img-src allows self, data, blob, Firebase Storage, and Google profile avatars', () => {
  const imgs = parsedCsp['img-src'];
  assert(imgs.has("'self'"));
  assert(imgs.has('data:'));
  assert(imgs.has('blob:'));
  assert(imgs.has('https://studio-30f44.web.app'));
  assert(imgs.has('https://*.firebasestorage.app'));
  assert(imgs.has('https://firebasestorage.googleapis.com'));
  assert(imgs.has('https://storage.googleapis.com'));
  assert(imgs.has('https://lh3.googleusercontent.com'));
});

test('connect-src allows all verified API, Firebase, R2, and audio endpoints', () => {
  const connects = parsedCsp['connect-src'];
  assert(connects.has("'self'"));
  assert(connects.has('https://identitytoolkit.googleapis.com'));
  assert(connects.has('https://securetoken.googleapis.com'));
  assert(connects.has('https://studio-30f44.firebaseapp.com'));
  assert(connects.has('https://firestore.googleapis.com'));
  assert(connects.has('https://*.firestore.googleapis.com'));
  assert(connects.has('https://firebasestorage.googleapis.com'));
  assert(connects.has('https://*.firebasestorage.app'));
  assert(connects.has('https://pub-b6a593f7d45247389f1accd1a54fec5c.r2.dev'));
  assert(connects.has('https://oramics.github.io'));
  assert(connects.has('https://raw.githubusercontent.com'));
  assert(connects.has('https://tonejs.github.io'));
  assert(connects.has('https://lrclib.net'));
  assert(connects.has('https://app.tolgee.io'));
  assert(connects.has('https://api.github.com'));
  assert(connects.has('https://github.com'));
  assert(connects.has('https://studio-30f44.web.app'));
  assert(connects.has('wss://*.firebaseio.com'));
  assert(connects.has('wss://*.firestore.googleapis.com'));
});

test('media-src allows self, blob, data, R2 stems, and audio samples', () => {
  const media = parsedCsp['media-src'];
  assert(media.has("'self'"));
  assert(media.has('blob:'));
  assert(media.has('data:'));
  assert(media.has('https://pub-b6a593f7d45247389f1accd1a54fec5c.r2.dev'));
  assert(media.has('https://oramics.github.io'));
  assert(media.has('https://raw.githubusercontent.com'));
  assert(media.has('https://tonejs.github.io'));
  assert(media.has('https://*.firebasestorage.app'));
  assert(media.has('https://firebasestorage.googleapis.com'));
});

test('frame-src allows self, Firebase auth, and Google Sign-In', () => {
  const frames = parsedCsp['frame-src'];
  assert(frames.has("'self'"), "frame-src must allow 'self' for Stagex /stage-core/index.html");
  assert(frames.has('https://studio-30f44.firebaseapp.com'));
  assert(frames.has('https://*.firebaseapp.com'));
  assert(frames.has('https://apis.google.com'));
  assert(frames.has('https://accounts.google.com'));
});

test('worker-src allows self and blob', () => {
  const workers = parsedCsp['worker-src'];
  assert(workers.has("'self'"));
  assert(workers.has('blob:'));
});

test('frame-ancestors is strictly self', () => {
  assert.deepEqual(Array.from(parsedCsp['frame-ancestors']), ["'self'"]);
});

test('object-src is none and base-uri is self', () => {
  assert.deepEqual(Array.from(parsedCsp['object-src']), ["'none'"]);
  assert.deepEqual(Array.from(parsedCsp['base-uri']), ["'self'"]);
});


// ── 3. Static _headers and firebase.json Verification ────────────────────────
console.log('\n--- Suite 3: Static _headers & firebase.json Verification ---');

const distHeadersPath = path.join(process.cwd(), 'dist/web/_headers');
const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');

test('apps/studio-web/public/_headers exists and matches canonical security headers', () => {
  assert(fs.existsSync(publicHeadersPath), 'public/_headers must exist');
  const content = fs.readFileSync(publicHeadersPath, 'utf-8');
  assert(content.includes('X-Content-Type-Options: nosniff'));
  assert(content.includes('X-Frame-Options: SAMEORIGIN'));
  assert(content.includes('Referrer-Policy: strict-origin-when-cross-origin'));
  assert(content.includes('Content-Security-Policy: default-src'));
});

test('dist/web/_headers exists in built production bundle', () => {
  assert(fs.existsSync(distHeadersPath), 'dist/web/_headers must exist after build');
  const content = fs.readFileSync(distHeadersPath, 'utf-8');
  assert(content.includes('Content-Security-Policy: default-src'));
});

test('firebase.json includes X-Content-Type-Options: nosniff, Referrer-Policy, and X-Frame-Options: DENY', () => {
  const content = fs.readFileSync(firebaseJsonPath, 'utf-8');
  const parsed = JSON.parse(content);
  const globalHeaderRule = parsed.hosting.headers.find((h) => h.source === '**');
  assert(globalHeaderRule, 'Must find ** header rule in firebase.json');
  const keys = globalHeaderRule.headers.reduce((acc, cur) => {
    acc[cur.key] = cur.value;
    return acc;
  }, {});
  assert.equal(keys['X-Content-Type-Options'], 'nosniff');
  assert.equal(keys['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(keys['X-Frame-Options'], 'DENY');
});

const publicRedirectsPath = path.join(process.cwd(), 'apps/studio-web/public/_redirects');
const distRedirectsPath = path.join(process.cwd(), 'dist/web/_redirects');
const wranglerTomlPath = path.join(process.cwd(), 'wrangler.toml');

test('apps/studio-web/public/_redirects exists and defines Cloudflare Pages SPA and external redirects', () => {
  assert(fs.existsSync(publicRedirectsPath), 'public/_redirects must exist');
  const content = fs.readFileSync(publicRedirectsPath, 'utf-8');
  assert(content.includes('/* /index.html 200'), '_redirects must define SPA fallback /* /index.html 200');
  assert(content.includes('/app-release.json'), '_redirects must define /app-release.json');
  assert(content.includes('/apk/*'), '_redirects must define /apk/*');
});

test('dist/web/_redirects exists in built production bundle', () => {
  assert(fs.existsSync(distRedirectsPath), 'dist/web/_redirects must exist after build');
  const content = fs.readFileSync(distRedirectsPath, 'utf-8');
  assert(content.includes('/* /index.html 200'));
});

test('wrangler.toml exists and configures Cloudflare Pages output directory', () => {
  assert(fs.existsSync(wranglerTomlPath), 'wrangler.toml must exist');
  const content = fs.readFileSync(wranglerTomlPath, 'utf-8');
  assert(content.includes('pages_build_output_dir = "dist/web"'));
});


// ── 4. Live Static Server Verification ───────────────────────────────────────
console.log('\n--- Suite 4: Live HTTP Server Header Verification ---');

// Parse _headers format
function parseHeadersFile(content) {
  const lines = content.split('\n');
  const rules = [];
  let currentPath = null;
  let currentHeaders = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('/')) {
      if (currentPath) {
        rules.push({ path: currentPath, headers: currentHeaders });
      }
      currentPath = line;
      currentHeaders = {};
    } else if (line.includes(':') && currentPath) {
      const idx = line.indexOf(':');
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      currentHeaders[key.toLowerCase()] = val;
    }
  }
  if (currentPath) {
    rules.push({ path: currentPath, headers: currentHeaders });
  }
  return rules;
}

await asyncTest('Live HTTP Server delivers expected headers for web routes', async () => {
  const rules = parseHeadersFile(fs.readFileSync(distHeadersPath, 'utf-8'));
  const rootRule = rules.find((r) => r.path === '/*');
  assert(rootRule, 'Must find /* rule in dist/web/_headers');

  const server = http.createServer((req, res) => {
    // Apply matching headers
    for (const [k, v] of Object.entries(rootRule.headers)) {
      res.setHeader(k, v);
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html><body>Livex Test</body></html>');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, { agent: false }, (response) => {
        response.resume();
        resolve(response);
      }).on('error', reject);
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert(res.headers['permissions-policy'].includes('microphone=(self)'));
    assert(res.headers['strict-transport-security'].includes('max-age=31536000'));
    assert.equal(res.headers['cross-origin-opener-policy'], 'same-origin-allow-popups');

    const receivedCsp = res.headers['content-security-policy'];
    assert(receivedCsp, 'Must receive content-security-policy header');
    const parsedReceived = parseCsp(receivedCsp);
    assert(parsedReceived['default-src'].has("'self'"));
    assert(parsedReceived['media-src'].has('https://pub-b6a593f7d45247389f1accd1a54fec5c.r2.dev'));
    assert(parsedReceived['frame-ancestors'].has("'self'"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

console.log(`\n========================================`);
console.log(`Tests finished: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
