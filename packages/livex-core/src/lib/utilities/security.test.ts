import { encryptAESGCM, decryptAESGCM, encryptSync, decryptSync, deriveUserKey } from './security.js';
import assert from 'node:assert';

async function runSecurityTests() {
  console.log('=== RUNNING WEB CRYPTO API & SECURITY TESTS ===');

  const keySeed = deriveUserKey('test_user');
  const secretPayload = JSON.stringify({ song: 'Acoustic Melody', bpm: 120, key: 'G' });

  // 1. Web Crypto AES-GCM 256 test
  console.log('Testing AES-GCM 256 encryption & decryption...');
  const cipherV3 = await encryptAESGCM(secretPayload, keySeed);
  assert(cipherV3.startsWith('v3:'), 'Encrypted payload must start with v3: header.');

  const decryptedV3 = await decryptAESGCM(cipherV3, keySeed);
  assert.strictEqual(decryptedV3, secretPayload, 'Decrypted AES-GCM payload must match original secret.');
  console.log('✓ AES-GCM 256 Encryption & Decryption passed.');

  // 2. Tamper detection test
  console.log('Testing Tamper Detection...');
  const tamperedCipher = cipherV3.slice(0, -4) + 'ffff';
  const tamperedResult = await decryptAESGCM(tamperedCipher, keySeed);
  assert.strictEqual(tamperedResult, null, 'Tampered ciphertext must fail authentication and return null.');
  console.log('✓ Tamper Detection passed.');

  // 3. Legacy v2 synchronous encryption/decryption test
  console.log('Testing Legacy v2 cipher reader...');
  const cipherV2 = encryptSync(secretPayload, keySeed);
  assert(cipherV2.startsWith('v2:'), 'Sync encrypted payload must start with v2: header.');

  const decryptedV2 = decryptSync(cipherV2, keySeed);
  assert.strictEqual(decryptedV2, secretPayload, 'Decrypted v2 payload must match original text.');
  console.log('✓ Legacy v2 cipher reader passed.');

  console.log('\x1b[32m=== ALL SECURITY TESTS PASSED CLEANLY ===\x1b[0m');
}

runSecurityTests().catch((err) => {
  console.error('Security tests failed:', err);
  process.exit(1);
});
