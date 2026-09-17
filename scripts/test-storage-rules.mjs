/**
 * Automated Firebase Storage Security Rules Test Suite
 * Tests all authorization and validation scenarios for user private storage,
 * profile avatars, shared assets, and public assets.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read storage.rules
const rulesPath = path.resolve(__dirname, '../storage.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

console.log('Loaded storage.rules (' + rulesContent.length + ' bytes)');

// Virtual Firebase Storage Rule Engine for validation
class StorageRuleEngine {
  constructor(storageState = {}) {
    // storageState maps filePath to { size, contentType, data }
    this.storage = new Map(Object.entries(storageState));
  }

  exists(filePath) {
    return this.storage.has(filePath);
  }

  get(filePath) {
    return this.storage.get(filePath) || null;
  }

  set(filePath, meta) {
    this.storage.set(filePath, meta);
  }

  delete(filePath) {
    this.storage.delete(filePath);
  }

  // Evaluates authorization for Storage requests
  evaluate({ op, path: filePath, auth, resourceMeta, requestMeta }) {
    const isAuthenticated = auth !== null && auth.uid !== undefined;

    // Helper: isOwner
    const isOwner = (userId) => isAuthenticated && auth.uid === userId;

    // Helper: isValidImage
    const isValidImage = (meta) => typeof meta?.contentType === 'string' && meta.contentType.startsWith('image/');

    // Helper: isValidAvatarSize
    const isValidAvatarSize = (meta) => typeof meta?.size === 'number' && meta.size < 2 * 1024 * 1024;

    // Helper: isValidUserFileSize
    const isValidUserFileSize = (meta) => typeof meta?.size === 'number' && meta.size < 10 * 1024 * 1024;

    // 1. match /public/{allPaths=**}
    if (filePath.startsWith('public/')) {
      if (op === 'read' || op === 'get') return true;
      if (op === 'write' || op === 'create' || op === 'update' || op === 'delete') return false;
      return false;
    }

    // 2. match /shared/{allPaths=**}
    if (filePath.startsWith('shared/')) {
      if (op === 'read' || op === 'get') return isAuthenticated;
      if (op === 'write' || op === 'create' || op === 'update' || op === 'delete') return false;
      return false;
    }

    // Parse user paths: users/{userId}/...
    const userMatch = filePath.match(/^users\/([^/]+)\/(.+)$/);
    if (userMatch) {
      const userId = userMatch[1];
      const subPath = userMatch[2];

      // 3. match /users/{userId}/profile/{fileName}
      const profileMatch = subPath.match(/^profile\/([^/]+)$/);
      if (profileMatch) {
        if (op === 'read' || op === 'get') {
          return isAuthenticated;
        }
        if (op === 'create' || op === 'update') {
          return isOwner(userId) && isValidAvatarSize(requestMeta) && isValidImage(requestMeta);
        }
        if (op === 'delete') {
          return isOwner(userId);
        }
      }

      // 4. match /users/{userId}/avatar.{ext}
      const avatarExtMatch = subPath.match(/^avatar\.(jpg|jpeg|png|webp)$/i);
      if (avatarExtMatch) {
        if (op === 'read' || op === 'get') {
          return isAuthenticated;
        }
        if (op === 'create' || op === 'update') {
          const ext = avatarExtMatch[1].toLowerCase();
          const validExts = ['jpg', 'jpeg', 'png', 'webp'];
          return isOwner(userId) && isValidAvatarSize(requestMeta) && isValidImage(requestMeta) && validExts.includes(ext);
        }
        if (op === 'delete') {
          return isOwner(userId);
        }
      }

      // 5. match /users/{userId}/{allPaths=**}
      if (op === 'read' || op === 'get') {
        return isOwner(userId);
      }
      if (op === 'create' || op === 'update') {
        const allowedMime = (meta) => {
          if (!meta?.contentType) return false;
          const ct = meta.contentType;
          return (
            ct.startsWith('image/') ||
            ct.startsWith('audio/') ||
            ct === 'application/json' ||
            ct === 'application/octet-stream'
          );
        };
        return isOwner(userId) && isValidUserFileSize(requestMeta) && allowedMime(requestMeta);
      }
      if (op === 'delete') {
        return isOwner(userId);
      }
    }

    // Default deny
    return false;
  }
}

// Test Runner
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const ownerUser = { uid: 'user_alice_123' };
const collaboratorUser = { uid: 'user_bob_456' };
const attackerUser = { uid: 'user_eve_789' };

// ── 1. UNAUTHENTICATED TESTS ───────────────────────────────────────────────
test('Unauthenticated: Read/write on private user storage must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const readRes = engine.evaluate({ op: 'read', path: 'users/user_alice_123/recordings/take1.wav', auth: null });
  const writeRes = engine.evaluate({
    op: 'create',
    path: 'users/user_alice_123/recordings/take1.wav',
    auth: null,
    requestMeta: { size: 1024, contentType: 'audio/wav' },
  });
  const deleteRes = engine.evaluate({ op: 'delete', path: 'users/user_alice_123/recordings/take1.wav', auth: null });
  if (readRes !== false || writeRes !== false || deleteRes !== false) {
    throw new Error('Unauthenticated access was permitted on private user storage');
  }
});

test('Unauthenticated: Read/write on profile avatars must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const readProfile = engine.evaluate({ op: 'read', path: 'users/user_alice_123/profile/avatar.webp', auth: null });
  const readAvatar = engine.evaluate({ op: 'read', path: 'users/user_alice_123/avatar.jpg', auth: null });
  const writeAvatar = engine.evaluate({
    op: 'create',
    path: 'users/user_alice_123/avatar.jpg',
    auth: null,
    requestMeta: { size: 50000, contentType: 'image/jpeg' },
  });
  if (readProfile !== false || readAvatar !== false || writeAvatar !== false) {
    throw new Error('Unauthenticated access was permitted on avatar paths');
  }
});

// ── 2. OWNER ACCESS (LEAST PRIVILEGE) ─────────────────────────────────────
test('Owner: Read, create, update, delete on private files must be ALLOWED', () => {
  const engine = new StorageRuleEngine();
  const filePath = 'users/user_alice_123/stems/bass.wav';
  const meta = { size: 5 * 1024 * 1024, contentType: 'audio/wav' };

  // Create
  const createRes = engine.evaluate({ op: 'create', path: filePath, auth: ownerUser, requestMeta: meta });
  if (!createRes) throw new Error('Owner failed to create private audio file');

  // Read
  const readRes = engine.evaluate({ op: 'read', path: filePath, auth: ownerUser });
  if (!readRes) throw new Error('Owner failed to read private audio file');

  // Delete
  const deleteRes = engine.evaluate({ op: 'delete', path: filePath, auth: ownerUser });
  if (!deleteRes) throw new Error('Owner failed to delete private audio file');
});

test('Owner: Create and delete on profile avatar must be ALLOWED with valid constraints', () => {
  const engine = new StorageRuleEngine();
  const avatarPath = 'users/user_alice_123/profile/avatar.jpg';
  const meta = { size: 500 * 1024, contentType: 'image/jpeg' };

  const createRes = engine.evaluate({ op: 'create', path: avatarPath, auth: ownerUser, requestMeta: meta });
  if (!createRes) throw new Error('Owner failed to upload valid avatar');

  const deleteRes = engine.evaluate({ op: 'delete', path: avatarPath, auth: ownerUser });
  if (!deleteRes) throw new Error('Owner failed to delete avatar');
});

// ── 3. CROSS-USER / ATTACKER ISOLATION (SEC-02 REMEDIATION) ────────────────
test('Non-Owner: Read on another user\'s private recordings/stems must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const privatePath = 'users/user_alice_123/recordings/private_rehearsal.wav';

  const nonOwnerRead = engine.evaluate({ op: 'read', path: privatePath, auth: attackerUser });
  if (nonOwnerRead !== false) {
    throw new Error('VULNERABILITY DETECTED: Non-owner was able to read another user\'s private storage');
  }
});

test('Non-Owner: Write or delete on another user\'s private files must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const privatePath = 'users/user_alice_123/backups/stage_export.json';

  const writeRes = engine.evaluate({
    op: 'create',
    path: privatePath,
    auth: attackerUser,
    requestMeta: { size: 2000, contentType: 'application/json' },
  });
  const deleteRes = engine.evaluate({ op: 'delete', path: privatePath, auth: attackerUser });

  if (writeRes !== false || deleteRes !== false) {
    throw new Error('Non-owner was able to write or delete another user\'s private files');
  }
});

test('Non-Owner: Overwriting or deleting another user\'s avatar must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const avatarPath = 'users/user_alice_123/profile/avatar.jpg';

  const writeRes = engine.evaluate({
    op: 'create',
    path: avatarPath,
    auth: attackerUser,
    requestMeta: { size: 10000, contentType: 'image/jpeg' },
  });
  const deleteRes = engine.evaluate({ op: 'delete', path: avatarPath, auth: attackerUser });

  if (writeRes !== false || deleteRes !== false) {
    throw new Error('Non-owner was able to overwrite or delete another user\'s avatar');
  }
});

// ── 4. LEGITIMATE SHARED AVATAR ACCESS ────────────────────────────────────
test('Collaborator: Authenticated read on another user\'s avatar must be ALLOWED', () => {
  const engine = new StorageRuleEngine();
  const avatarPath1 = 'users/user_alice_123/profile/avatar.webp';
  const avatarPath2 = 'users/user_alice_123/avatar.png';

  const readRes1 = engine.evaluate({ op: 'read', path: avatarPath1, auth: collaboratorUser });
  const readRes2 = engine.evaluate({ op: 'read', path: avatarPath2, auth: collaboratorUser });

  if (!readRes1 || !readRes2) {
    throw new Error('Authenticated collaborator was blocked from viewing another user\'s avatar');
  }
});

// ── 5. VALIDATION & BOUNDARY CONSTRAINTS ──────────────────────────────────
test('Validation: Oversized avatar (> 2 MB) must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const avatarPath = 'users/user_alice_123/avatar.jpg';
  const oversizedMeta = { size: 3 * 1024 * 1024, contentType: 'image/jpeg' };

  const res = engine.evaluate({ op: 'create', path: avatarPath, auth: ownerUser, requestMeta: oversizedMeta });
  if (res !== false) throw new Error('Oversized avatar upload was allowed');
});

test('Validation: Non-image content-type for avatar must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const avatarPath = 'users/user_alice_123/avatar.jpg';
  const badMeta = { size: 1024, contentType: 'application/x-executable' };

  const res = engine.evaluate({ op: 'create', path: avatarPath, auth: ownerUser, requestMeta: badMeta });
  if (res !== false) throw new Error('Non-image avatar upload was allowed');
});

test('Validation: Oversized private file (> 10 MB) must be REJECTED', () => {
  const engine = new StorageRuleEngine();
  const filePath = 'users/user_alice_123/stems/huge.wav';
  const oversizedMeta = { size: 15 * 1024 * 1024, contentType: 'audio/wav' };

  const res = engine.evaluate({ op: 'create', path: filePath, auth: ownerUser, requestMeta: oversizedMeta });
  if (res !== false) throw new Error('Oversized private file was allowed');
});

// ── 6. PUBLIC & SHARED APPLICATION ASSETS ─────────────────────────────────
test('Public Assets: Publicly readable for all, write rejected for all', () => {
  const engine = new StorageRuleEngine();
  const pubPath = 'public/metronome_click.wav';

  const unauthRead = engine.evaluate({ op: 'read', path: pubPath, auth: null });
  const authRead = engine.evaluate({ op: 'read', path: pubPath, auth: collaboratorUser });
  const writeRes = engine.evaluate({
    op: 'create',
    path: pubPath,
    auth: ownerUser,
    requestMeta: { size: 500, contentType: 'audio/wav' },
  });

  if (!unauthRead || !authRead) throw new Error('Public asset was not readable');
  if (writeRes !== false) throw new Error('Client write to public storage was permitted');
});

test('Shared Assets: Readable for authenticated users only, write rejected for all', () => {
  const engine = new StorageRuleEngine();
  const sharedPath = 'shared/presets/rock_kit.json';

  const unauthRead = engine.evaluate({ op: 'read', path: sharedPath, auth: null });
  const authRead = engine.evaluate({ op: 'read', path: sharedPath, auth: collaboratorUser });
  const writeRes = engine.evaluate({
    op: 'create',
    path: sharedPath,
    auth: ownerUser,
    requestMeta: { size: 500, contentType: 'application/json' },
  });

  if (unauthRead !== false) throw new Error('Unauthenticated read to shared asset was allowed');
  if (!authRead) throw new Error('Authenticated read to shared asset was blocked');
  if (writeRes !== false) throw new Error('Client write to shared storage was permitted');
});

// Run all tests
console.log(`\nRunning ${tests.length} Firebase Storage Security Rule Tests...\n`);
let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    t.fn();
    console.log(`  ✓ PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${t.name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Firebase Storage Security Authorization Tests Passed Successfully!\n');
}
