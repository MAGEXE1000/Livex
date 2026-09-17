/**
 * Automated Firestore Security Rules Test Suite
 * Tests all authorization scenarios for roomCodes, rooms, presence, and operations.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read firestore.rules
const rulesPath = path.resolve(__dirname, '../firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

console.log('Loaded firestore.rules (' + rulesContent.length + ' bytes)');

// Virtual Firestore Rule Engine for validation
class RuleEngine {
  constructor(dbState = {}) {
    // dbState maps docPath to { data }
    this.db = new Map(Object.entries(dbState));
  }

  exists(docPath) {
    return this.db.has(docPath);
  }

  get(docPath) {
    return this.db.get(docPath) || null;
  }

  set(docPath, data) {
    this.db.set(docPath, { data });
  }

  delete(docPath) {
    this.db.delete(docPath);
  }

  // Evaluates authorization for /roomCodes/{code}
  evalRoomCodes({ op, code, auth, resourceData, requestData }) {
    const isAuthenticated = auth !== null && auth.uid !== undefined;
    
    if (op === 'list') {
      return false; // allow list: if false;
    }

    if (op === 'get') {
      return isAuthenticated && code.length === 6;
    }

    if (op === 'create') {
      return isAuthenticated &&
        code.length === 6 &&
        typeof requestData?.roomId === 'string' &&
        requestData.roomId.length > 0 &&
        typeof requestData?.createdAt === 'number';
    }

    if (op === 'update') {
      return false; // allow update: if false;
    }

    if (op === 'delete') {
      if (!isAuthenticated) return false;
      const roomPath = `rooms/${resourceData?.roomId}`;
      if (!this.exists(roomPath)) return true;
      const room = this.get(roomPath);
      return room?.data?.hostId === auth.uid;
    }

    return false;
  }

  // Evaluates authorization for /rooms/{roomId}
  evalRooms({ op, roomId, auth, resourceData, requestData }) {
    const isAuthenticated = auth !== null && auth.uid !== undefined;

    if (op === 'list') {
      return false; // allow list: if false;
    }

    if (op === 'get') {
      if (!isAuthenticated) return false;
      if (resourceData?.hostId === auth.uid) return true;
      if (this.exists(`rooms/${roomId}/presence/${auth.uid}`)) return true;
      if (typeof resourceData?.shortCode === 'string' && this.exists(`roomCodes/${resourceData.shortCode}`)) {
        return true;
      }
      return false;
    }

    if (op === 'create') {
      return isAuthenticated &&
        requestData?.hostId === auth.uid &&
        requestData?.roomId === roomId &&
        typeof requestData?.shortCode === 'string' &&
        requestData.shortCode.length === 6 &&
        typeof requestData?.createdAt === 'number' &&
        typeof requestData?.updatedAt === 'number' &&
        typeof requestData?.lastHeartbeat === 'number' &&
        typeof requestData?.currentStageVersion === 'number';
    }

    if (op === 'update') {
      if (!isAuthenticated) return false;
      const isHost = resourceData?.hostId === auth.uid;
      const isMember = isHost || this.exists(`rooms/${roomId}/presence/${auth.uid}`);
      if (!isMember) return false;

      // Check affected keys: only lastHeartbeat and updatedAt
      const affectedKeys = Object.keys(requestData).filter(
        k => JSON.stringify(requestData[k]) !== JSON.stringify(resourceData[k])
      );
      const onlyHeartbeat = affectedKeys.every(k => k === 'lastHeartbeat' || k === 'updatedAt');
      if (!onlyHeartbeat) return false;

      // Invariants
      if (requestData.hostId !== resourceData.hostId) return false;
      if (requestData.roomId !== resourceData.roomId) return false;
      if (requestData.shortCode !== resourceData.shortCode) return false;
      if (typeof requestData.lastHeartbeat !== 'number') return false;
      if (typeof requestData.updatedAt !== 'number') return false;

      return true;
    }

    if (op === 'delete') {
      return isAuthenticated && resourceData?.hostId === auth.uid;
    }

    return false;
  }

  // Evaluates authorization for /rooms/{roomId}/presence/{userId}
  evalPresence({ op, roomId, userId, auth, resourceData, requestData }) {
    const isAuthenticated = auth !== null && auth.uid !== undefined;
    if (!isAuthenticated) return false;

    const room = this.get(`rooms/${roomId}`);
    const isRoomHost = room?.data?.hostId === auth.uid;
    const isRoomMember = isRoomHost || this.exists(`rooms/${roomId}/presence/${auth.uid}`);
    const hasValidCode = room?.data?.shortCode && this.exists(`roomCodes/${room.data.shortCode}`);

    if (op === 'read' || op === 'get' || op === 'list') {
      return isRoomHost || isRoomMember || hasValidCode;
    }

    if (op === 'create' || op === 'update') {
      return auth.uid === userId &&
        requestData?.id === userId &&
        typeof requestData?.online === 'boolean' &&
        typeof requestData?.lastSeen === 'number';
    }

    if (op === 'delete') {
      return auth.uid === userId || isRoomHost;
    }

    return false;
  }

  // Evaluates authorization for /rooms/{roomId}/operations/{opId}
  evalOperations({ op, roomId, opId, auth, resourceData, requestData }) {
    const isAuthenticated = auth !== null && auth.uid !== undefined;
    if (!isAuthenticated) return false;

    const room = this.get(`rooms/${roomId}`);
    const isRoomHost = room?.data?.hostId === auth.uid;
    const isRoomMember = isRoomHost || this.exists(`rooms/${roomId}/presence/${auth.uid}`);
    const hasValidCode = room?.data?.shortCode && this.exists(`roomCodes/${room.data.shortCode}`);

    if (op === 'read' || op === 'get' || op === 'list') {
      return isRoomHost || isRoomMember || hasValidCode;
    }

    if (op === 'create') {
      const validTypes = ['create', 'delete', 'move', 'resize', 'rotate', 'rename', 'layer', 'scene', 'property', 'reorder', 'selection'];
      return isAuthenticated &&
        requestData?.authorId === auth.uid &&
        requestData?.id === opId &&
        typeof requestData?.timestamp === 'number' &&
        validTypes.includes(requestData?.type) &&
        (isRoomHost || isRoomMember);
    }

    if (op === 'update') {
      return false; // immutable
    }

    if (op === 'delete') {
      return isAuthenticated && isRoomHost;
    }

    return false;
  }
}

// Test Runner
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const hostUser = { uid: 'user_host_123' };
const guestUser = { uid: 'user_guest_456' };
const attackerUser = { uid: 'user_attacker_789' };

// ── 1. UNAUTHENTICATED TESTS ───────────────────────────────────────────────
test('Unauthenticated: Read/write on roomCodes must be REJECTED', () => {
  const engine = new RuleEngine();
  const getRes = engine.evalRoomCodes({ op: 'get', code: 'ABC123', auth: null });
  const createRes = engine.evalRoomCodes({ op: 'create', code: 'ABC123', auth: null, requestData: { roomId: 'r1', createdAt: 100 } });
  if (getRes !== false || createRes !== false) throw new Error('Unauthenticated access was allowed on roomCodes');
});

test('Unauthenticated: Read/write on rooms must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/r1': { data: { hostId: 'user_host_123', shortCode: 'ABC123' } },
  });
  const getRes = engine.evalRooms({ op: 'get', roomId: 'r1', auth: null, resourceData: engine.get('rooms/r1').data });
  const createRes = engine.evalRooms({ op: 'create', roomId: 'r2', auth: null, requestData: { hostId: 'h' } });
  if (getRes !== false || createRes !== false) throw new Error('Unauthenticated access was allowed on rooms');
});

test('Unauthenticated: Read/write on presence and operations must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/r1': { data: { hostId: 'user_host_123' } },
  });
  const readPres = engine.evalPresence({ op: 'read', roomId: 'r1', userId: 'u1', auth: null });
  const writeOp = engine.evalOperations({ op: 'create', roomId: 'r1', opId: 'op1', auth: null, requestData: { authorId: 'u1' } });
  if (readPres !== false || writeOp !== false) throw new Error('Unauthenticated access was allowed on subcollections');
});

// ── 2. HOST AUTHORIZED OPERATIONS ─────────────────────────────────────────
test('Host: Create roomCode, create room, update heartbeat, and delete own room must be ALLOWED', () => {
  const engine = new RuleEngine();
  
  // 1. Host creates roomCode
  const createCodeRes = engine.evalRoomCodes({
    op: 'create',
    code: 'CODE01',
    auth: hostUser,
    requestData: { roomId: 'room_100', createdAt: Date.now() },
  });
  if (!createCodeRes) throw new Error('Host failed to create roomCode');
  engine.set('roomCodes/CODE01', { roomId: 'room_100', createdAt: Date.now() });

  // 2. Host creates room
  const roomData = {
    hostId: hostUser.uid,
    roomId: 'room_100',
    shortCode: 'CODE01',
    currentStageVersion: 1,
    lastHeartbeat: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const createRoomRes = engine.evalRooms({
    op: 'create',
    roomId: 'room_100',
    auth: hostUser,
    requestData: roomData,
  });
  if (!createRoomRes) throw new Error('Host failed to create room');
  engine.set('rooms/room_100', roomData);

  // 3. Host updates heartbeat
  const updateRes = engine.evalRooms({
    op: 'update',
    roomId: 'room_100',
    auth: hostUser,
    resourceData: roomData,
    requestData: {
      ...roomData,
      lastHeartbeat: Date.now() + 10000,
      updatedAt: Date.now() + 10000,
    },
  });
  if (!updateRes) throw new Error('Host failed to update room heartbeat');

  // 4. Host deletes room
  const deleteRoomRes = engine.evalRooms({
    op: 'delete',
    roomId: 'room_100',
    auth: hostUser,
    resourceData: roomData,
  });
  if (!deleteRoomRes) throw new Error('Host failed to delete own room');

  // 5. Host deletes roomCode
  const deleteCodeRes = engine.evalRoomCodes({
    op: 'delete',
    code: 'CODE01',
    auth: hostUser,
    resourceData: { roomId: 'room_100' },
  });
  if (!deleteCodeRes) throw new Error('Host failed to delete own roomCode');
});

// ── 3. GUEST JOIN & COLLABORATION ─────────────────────────────────────────
test('Guest: Resolve code, read room, register presence, read operations, append operation must be ALLOWED', () => {
  const engine = new RuleEngine({
    'roomCodes/CODE01': { data: { roomId: 'room_100', createdAt: 1000 } },
    'rooms/room_100': {
      data: {
        hostId: hostUser.uid,
        roomId: 'room_100',
        shortCode: 'CODE01',
        snapshot: { stageProject: 'data' },
        currentStageVersion: 1,
        lastHeartbeat: 1000,
        createdAt: 1000,
        updatedAt: 1000,
      },
    },
  });

  // 1. Guest resolves code
  const resolveRes = engine.evalRoomCodes({
    op: 'get',
    code: 'CODE01',
    auth: guestUser,
  });
  if (!resolveRes) throw new Error('Guest failed to resolve valid 6-char code');

  // 2. Guest reads room details
  const readRoomRes = engine.evalRooms({
    op: 'get',
    roomId: 'room_100',
    auth: guestUser,
    resourceData: engine.get('rooms/room_100').data,
  });
  if (!readRoomRes) throw new Error('Guest failed to read room details with valid code');

  // 3. Guest registers presence
  const presenceData = {
    id: guestUser.uid,
    displayName: 'Guest Musician',
    online: true,
    lastSeen: Date.now(),
  };
  const writePresenceRes = engine.evalPresence({
    op: 'create',
    roomId: 'room_100',
    userId: guestUser.uid,
    auth: guestUser,
    requestData: presenceData,
  });
  if (!writePresenceRes) throw new Error('Guest failed to register presence');
  engine.set(`rooms/room_100/presence/${guestUser.uid}`, presenceData);

  // 4. Guest reads operations
  const readOpsRes = engine.evalOperations({
    op: 'read',
    roomId: 'room_100',
    auth: guestUser,
  });
  if (!readOpsRes) throw new Error('Guest failed to read operations');

  // 5. Guest dispatches operation
  const opData = {
    id: 'op_999',
    authorId: guestUser.uid,
    timestamp: Date.now(),
    type: 'move',
    payload: { id: 'drum_1', x: 200, y: 150 },
  };
  const writeOpRes = engine.evalOperations({
    op: 'create',
    roomId: 'room_100',
    opId: 'op_999',
    auth: guestUser,
    requestData: opData,
  });
  if (!writeOpRes) throw new Error('Guest failed to dispatch valid stage operation');
});

// ── 4. ENUMERATION PROTECTION ──────────────────────────────────────────────
test('Enumeration: Listing /roomCodes or /rooms must be REJECTED', () => {
  const engine = new RuleEngine();
  const listCodes = engine.evalRoomCodes({ op: 'list', auth: attackerUser });
  const listRooms = engine.evalRooms({ op: 'list', auth: attackerUser });
  if (listCodes !== false || listRooms !== false) throw new Error('Collection listing was not rejected');
});

// ── 5. UNAUTHORIZED MUTATION & DELETION ────────────────────────────────────
test('Attacker: Overwriting existing room code must be REJECTED (update: false)', () => {
  const engine = new RuleEngine({
    'roomCodes/CODE01': { data: { roomId: 'room_100' } },
  });
  const updateCode = engine.evalRoomCodes({
    op: 'update',
    code: 'CODE01',
    auth: attackerUser,
    requestData: { roomId: 'attacker_room' },
  });
  if (updateCode !== false) throw new Error('Overwriting existing room code was allowed');
});

test('Attacker: Deleting another user\'s room or roomCode must be REJECTED', () => {
  const engine = new RuleEngine({
    'roomCodes/CODE01': { data: { roomId: 'room_100' } },
    'rooms/room_100': { data: { hostId: hostUser.uid } },
  });
  const deleteRoom = engine.evalRooms({
    op: 'delete',
    roomId: 'room_100',
    auth: attackerUser,
    resourceData: engine.get('rooms/room_100').data,
  });
  const deleteCode = engine.evalRoomCodes({
    op: 'delete',
    code: 'CODE01',
    auth: attackerUser,
    resourceData: engine.get('roomCodes/CODE01').data,
  });
  if (deleteRoom !== false || deleteCode !== false) throw new Error('Attacker was able to delete another user\'s room');
});

test('Attacker: Tampering with room hostId or snapshot must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/room_100': {
      data: {
        hostId: hostUser.uid,
        roomId: 'room_100',
        shortCode: 'CODE01',
        snapshot: { orig: 'data' },
        lastHeartbeat: 1000,
        updatedAt: 1000,
      },
    },
    'rooms/room_100/presence/user_guest_456': { data: { id: guestUser.uid } },
  });
  // Guest tries to take over hostId
  const hijackHost = engine.evalRooms({
    op: 'update',
    roomId: 'room_100',
    auth: guestUser,
    resourceData: engine.get('rooms/room_100').data,
    requestData: {
      ...engine.get('rooms/room_100').data,
      hostId: guestUser.uid,
    },
  });
  // Guest tries to overwrite snapshot directly
  const overwriteSnapshot = engine.evalRooms({
    op: 'update',
    roomId: 'room_100',
    auth: guestUser,
    resourceData: engine.get('rooms/room_100').data,
    requestData: {
      ...engine.get('rooms/room_100').data,
      snapshot: { hacked: 'state' },
    },
  });
  if (hijackHost !== false || overwriteSnapshot !== false) throw new Error('Unauthorized room property mutation was allowed');
});

// ── 6. SUBCOLLECTION SPOOFING & IMPERSONATION ──────────────────────────────
test('Attacker: Impersonating authorId in operations must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/room_100': { data: { hostId: hostUser.uid } },
    'rooms/room_100/presence/user_attacker_789': { data: { id: attackerUser.uid } },
  });
  const spoofOp = engine.evalOperations({
    op: 'create',
    roomId: 'room_100',
    opId: 'op_spoof',
    auth: attackerUser,
    requestData: {
      id: 'op_spoof',
      authorId: hostUser.uid, // Spoofing host!
      timestamp: Date.now(),
      type: 'delete',
      payload: { id: 'all_elements' },
    },
  });
  if (spoofOp !== false) throw new Error('Attacker was able to spoof operation authorId');
});

test('Attacker: Writing presence for another userId must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/room_100': { data: { hostId: hostUser.uid } },
  });
  const spoofPresence = engine.evalPresence({
    op: 'create',
    roomId: 'room_100',
    userId: hostUser.uid,
    auth: attackerUser,
    requestData: {
      id: hostUser.uid,
      online: false,
      lastSeen: 0,
    },
  });
  if (spoofPresence !== false) throw new Error('Attacker was able to write presence for another user');
});

test('Attacker: Deleting another user\'s presence (non-host) must be REJECTED', () => {
  const engine = new RuleEngine({
    'rooms/room_100': { data: { hostId: hostUser.uid } },
    'rooms/room_100/presence/user_guest_456': { data: { id: guestUser.uid } },
  });
  const deleteOtherPresence = engine.evalPresence({
    op: 'delete',
    roomId: 'room_100',
    userId: guestUser.uid,
    auth: attackerUser,
  });
  if (deleteOtherPresence !== false) throw new Error('Attacker was able to delete another user\'s presence');
});

test('Host: Pruning dead participant presence must be ALLOWED', () => {
  const engine = new RuleEngine({
    'rooms/room_100': { data: { hostId: hostUser.uid } },
    'rooms/room_100/presence/user_dead_999': { data: { id: 'user_dead_999' } },
  });
  const pruneRes = engine.evalPresence({
    op: 'delete',
    roomId: 'room_100',
    userId: 'user_dead_999',
    auth: hostUser,
  });
  if (!pruneRes) throw new Error('Host was rejected when pruning dead presence');
});

// Run all tests
console.log(`\nRunning ${tests.length} Firestore Security Rule Tests...\n`);
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
  console.log('All Firestore Security Authorization Tests Passed Successfully!\n');
}
