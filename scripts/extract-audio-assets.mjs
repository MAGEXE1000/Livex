#!/usr/bin/env node
/**
 * extract-audio-assets.mjs
 *
 * Extracts base64-encoded audio samples from:
 *   - guitarSampleData.ts (37 notes, MP3)
 *   - tunerSampleData.ts (17 notes across acoustic, electric, bass, MP3)
 *   - metronomeVoiceData.ts (12 counts, WAV)
 * and writes them as authentic, lightweight binary assets into:
 *   packages/livex-core/assets/audio/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Import the existing base64 datasets
import { GUITAR_SAMPLE_DATA } from '../packages/livex-core/src/lib/audio/guitarSampleData.ts';
import { TUNER_SAMPLE_DATA } from '../packages/livex-core/src/lib/tuner/tunerSampleData.ts';
import { VOICE_COUNT_BASE64 } from '../packages/livex-core/src/lib/audio/metronomeVoiceData.ts';

const baseOutDir = path.join(repoRoot, 'packages', 'livex-core', 'assets', 'audio');

// 1. Extract Guitar Samples (37 notes)
const guitarDir = path.join(baseOutDir, 'guitar');
fs.mkdirSync(guitarDir, { recursive: true });

let guitarCount = 0;
for (const [note, b64] of Object.entries(GUITAR_SAMPLE_DATA)) {
  const buf = Buffer.from(b64, 'base64');
  const filePath = path.join(guitarDir, `${note}.mp3`);
  fs.writeFileSync(filePath, buf);
  guitarCount++;
}
console.log(`✓ Extracted ${guitarCount} guitar MP3 samples to ${path.relative(repoRoot, guitarDir)}`);

// 2. Extract Tuner Samples (17 notes)
const tunerDir = path.join(baseOutDir, 'tuner');
let tunerCount = 0;
for (const [family, notes] of Object.entries(TUNER_SAMPLE_DATA)) {
  const famDir = path.join(tunerDir, family);
  fs.mkdirSync(famDir, { recursive: true });
  for (const [note, b64] of Object.entries(notes)) {
    const buf = Buffer.from(b64, 'base64');
    const filePath = path.join(famDir, `${note}.mp3`);
    fs.writeFileSync(filePath, buf);
    tunerCount++;
  }
}
console.log(`✓ Extracted ${tunerCount} tuner MP3 samples to ${path.relative(repoRoot, tunerDir)}`);

// 3. Extract Metronome Voice Samples (12 counts)
const metronomeDir = path.join(baseOutDir, 'metronome');
fs.mkdirSync(metronomeDir, { recursive: true });

let metronomeCount = 0;
for (const [num, b64] of Object.entries(VOICE_COUNT_BASE64)) {
  const buf = Buffer.from(b64, 'base64');
  const filePath = path.join(metronomeDir, `${num}.wav`);
  fs.writeFileSync(filePath, buf);
  metronomeCount++;
}
console.log(`✓ Extracted ${metronomeCount} metronome WAV samples to ${path.relative(repoRoot, metronomeDir)}`);

console.log(`\n=== AUDIO EXTRACTION COMPLETE: ${guitarCount + tunerCount + metronomeCount} files written ===`);
