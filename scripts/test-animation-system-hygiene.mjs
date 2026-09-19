import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n--- Running Livex Animation-System Hygiene Validation Suite ---\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`PASS: ${description}`);
    testsPassed++;
  } catch (err) {
    console.error(`FAIL: ${description}`);
    console.error(err);
    testsFailed++;
  }
}

// 1. LaunchAnimationEngine hygiene
runTest('LaunchAnimationEngine: No dead telemetry rAF loop or unused frameTimes array', () => {
  const filePath = path.join(
    rootDir,
    'packages/ui-shared/src/shared/animation/LaunchAnimationEngine.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    !content.includes('frameTimes.current.push'),
    'LaunchAnimationEngine should not contain frameTimes telemetry recording'
  );
  assert.ok(
    !content.includes('trackFrame'),
    'LaunchAnimationEngine should not contain dead trackFrame rAF loop'
  );
  assert.ok(
    content.includes("document.getElementById('intro')"),
    'LaunchAnimationEngine must preserve #intro dismissal'
  );
});

// 2. CSS Compositor Spinner Offload
runTest('loader.tsx: Spinner offloaded to CSS compositor, no JS motion.svg loop', () => {
  const filePath = path.join(rootDir, 'packages/ui-shared/src/components/motion/loader.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    !content.includes('motion.svg'),
    'Spinner in loader.tsx should not use motion.svg'
  );
  assert.ok(
    content.includes('spin ${speed}s linear infinite'),
    'Spinner in loader.tsx should use CSS spin animation'
  );
  assert.ok(
    content.includes('pulse 1.4s ease-in-out infinite'),
    'Spinner in loader.tsx should use calm pulse on reduced motion'
  );
});

// 3. RenderActivityReason Invariant Compliance
runTest('renderScheduler.ts: Obsolete ota_update enum removed, native_updater present', () => {
  const filePath = path.join(
    rootDir,
    'packages/livex-core/src/lib/performance/renderScheduler.ts'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    !content.includes("'ota_update'"),
    'renderScheduler.ts must not contain obsolete ota_update enum'
  );
  assert.ok(
    content.includes("'native_updater'"),
    'renderScheduler.ts must contain native_updater enum'
  );
});

// 4. Reduced-Motion Unified Enforcement
runTest('Reduced-Motion: Canonical hook useAppReducedMotion used consistently', () => {
  const pageTrans = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/components/StudioPageTransition.tsx'),
    'utf-8'
  );
  assert.ok(
    pageTrans.includes('useAppReducedMotion()'),
    'StudioPageTransition must use useAppReducedMotion()'
  );
  assert.ok(
    !pageTrans.includes('window.matchMedia?.('),
    'StudioPageTransition must not duplicate manual matchMedia checks'
  );

  const countUp = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/progress/StudioCountUpPercentage.tsx'),
    'utf-8'
  );
  assert.ok(
    countUp.includes('useAppReducedMotion()'),
    'StudioCountUpPercentage must use useAppReducedMotion()'
  );
  assert.ok(
    !countUp.includes('window.matchMedia('),
    'StudioCountUpPercentage must not create duplicate matchMedia listeners'
  );

  const encrypted = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/ui/encrypted-text.tsx'),
    'utf-8'
  );
  assert.ok(
    encrypted.includes('useAppReducedMotion()'),
    'EncryptedText must use useAppReducedMotion()'
  );
});

// 5. AnimatedIcon Polish & State Connection
runTest('AnimatedIcon.tsx: State prop connected to animate, no console spam or unused controls', () => {
  const filePath = path.join(
    rootDir,
    'packages/ui-shared/src/shared/icons/AnimatedIcon.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('animate={isSpinning ? { rotate: [0, 360] } : state}'),
    'AnimatedIcon must pass state to animate prop'
  );
  assert.ok(
    !content.includes('[AnimatedIcon] START ANIMATION'),
    'AnimatedIcon must not log to console on every state change'
  );
  assert.ok(
    !content.includes('const controls = useAnimation()'),
    'AnimatedIcon must not instantiate unused controls'
  );
});

// 6. PerformanceProfiler Visibility & Lifecycle Guards
runTest('performanceProfiler.ts: Visibility change handling and pause/resume lifecycle', () => {
  const filePath = path.join(
    rootDir,
    'packages/livex-core/src/lib/performance/performanceProfiler.ts'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes("document.addEventListener('visibilitychange', this.handleVisibilityChange)"),
    'PerformanceProfiler must listen to visibilitychange'
  );
  assert.ok(
    content.includes('public pause()'),
    'PerformanceProfiler must expose pause()'
  );
  assert.ok(
    content.includes('public resume()'),
    'PerformanceProfiler must expose resume()'
  );
  assert.ok(
    content.includes('if (this.isPaused)'),
    'PerformanceProfiler loops must halt when paused'
  );
});

// 7. MotionProfiler Safety Watchdog
runTest('motionProfiler.ts: 15-second safety watchdog to prevent orphaned rAF loops', () => {
  const filePath = path.join(
    rootDir,
    'packages/livex-core/src/lib/performance/motionProfiler.ts'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('this.watchdogTimer = setTimeout('),
    'MotionTraceInstance must set safety watchdog timer'
  );
  assert.ok(
    content.includes('clearTimeout(this.watchdogTimer)'),
    'MotionTraceInstance must clear watchdog timer in stop()'
  );
});

// 8. TakeDetailView Progress rAF Guard
runTest('TakeDetailView.tsx: updateProgress gates rAF loop when audio is paused or ended', () => {
  const filePath = path.join(
    rootDir,
    'packages/ui-shared/src/features/vocalex/components/TakeDetailView.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('if (!audio.paused && !audio.ended)'),
    'TakeDetailView updateProgress must check audio.paused and audio.ended'
  );
});

// Summary
console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed\n`);
if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('All animation system hygiene checks PASSED successfully.\n');
  process.exit(0);
}
