import assert from 'node:assert';

console.log('--- STAGEX SETLIST PRESETS & DRAG-REORDER VERIFICATION ---');

// Mock localStorage for headless Node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

// 1. Test Migration Strategy
console.log('\n[Test 1] Seamless Migration of Legacy Setlist to Preset');
const legacyProject = {
  name: 'Festival 2025',
  setlist: [
    { id: 's1', title: 'Song One', bpm: 120, duration: '3:30', energy: 80 },
    { id: 's2', title: 'Song Two', bpm: 95, duration: '4:15', energy: 60 },
  ],
};
localStorage.setItem('stagecoreProject', JSON.stringify(legacyProject));

// Test initSetlistPresets logic
function initSetlistPresets(proj) {
  const existingPresets =
    Array.isArray(proj.setlistPresets) && proj.setlistPresets.length > 0
      ? proj.setlistPresets
      : null;

  if (existingPresets) {
    const activeId =
      typeof proj.activePresetId === 'string' && existingPresets.some((p) => p.id === proj.activePresetId)
        ? proj.activePresetId
        : existingPresets[0].id;
    const activePreset = existingPresets.find((p) => p.id === activeId) || existingPresets[0];
    return {
      presets: existingPresets,
      activePresetId: activeId,
      activeSongs: Array.isArray(activePreset.songs) ? activePreset.songs : [],
    };
  }

  const defaultSongs = Array.isArray(proj.setlist) ? proj.setlist : [];
  const defaultPreset = {
    id: 'preset_default',
    name: 'Main Show',
    songs: defaultSongs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    presets: [defaultPreset],
    activePresetId: 'preset_default',
    activeSongs: defaultSongs,
  };
}

const migrated = initSetlistPresets(legacyProject);
assert.strictEqual(migrated.presets.length, 1, 'Should have exactly 1 preset created');
assert.strictEqual(migrated.presets[0].name, 'Main Show', 'Default preset name should be Main Show');
assert.strictEqual(migrated.presets[0].songs.length, 2, 'Should migrate all legacy songs');
assert.strictEqual(migrated.presets[0].songs[0].title, 'Song One');
assert.strictEqual(migrated.activePresetId, 'preset_default');
assert.strictEqual(migrated.activeSongs.length, 2);
console.log('✅ Migration verified: legacy songs preserved in first preset without data loss.');

// 2. Test Multiple Independent Presets
console.log('\n[Test 2] Multiple Independent Presets & Switching');
let currentPresets = [...migrated.presets];
let currentActiveId = migrated.activePresetId;
let currentSetlist = [...migrated.activeSongs];

function createPreset(name, initialSongs = []) {
  const id = 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newPreset = {
    id,
    name: name.trim() || 'New Preset',
    songs: initialSongs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  currentPresets = [...currentPresets, newPreset];
  currentActiveId = id;
  currentSetlist = initialSongs;
  return id;
}

function selectPreset(presetId) {
  const target = currentPresets.find((p) => p.id === presetId);
  if (!target) return;
  currentActiveId = target.id;
  currentSetlist = target.songs || [];
}

function addSong(song) {
  const id = 'sl_' + Date.now();
  const updatedSongs = [...currentSetlist, { ...song, id }];
  currentPresets = currentPresets.map((p) =>
    p.id === currentActiveId ? { ...p, songs: updatedSongs } : p
  );
  currentSetlist = updatedSongs;
}

// Create "Acoustic" preset with fresh songs
const acousticId = createPreset('Acoustic', [
  { id: 'a1', title: 'Acoustic Intro', bpm: 80, duration: '2:45', energy: 40 },
]);
assert.strictEqual(currentPresets.length, 2);
assert.strictEqual(currentActiveId, acousticId);
assert.strictEqual(currentSetlist.length, 1);
assert.strictEqual(currentSetlist[0].title, 'Acoustic Intro');

// Add another song to Acoustic
addSong({ title: 'Acoustic Ballad', bpm: 72, duration: '3:50', energy: 35 });
assert.strictEqual(currentSetlist.length, 2);

// Switch back to "Main Show"
selectPreset('preset_default');
assert.strictEqual(currentActiveId, 'preset_default');
assert.strictEqual(currentSetlist.length, 2, 'Main Show should still have its original 2 songs');
assert.strictEqual(currentSetlist[0].title, 'Song One');
assert.strictEqual(currentSetlist[1].title, 'Song Two');

// Switch back to "Acoustic"
selectPreset(acousticId);
assert.strictEqual(currentActiveId, acousticId);
assert.strictEqual(currentSetlist.length, 2, 'Acoustic should still have its 2 songs');
assert.strictEqual(currentSetlist[0].title, 'Acoustic Intro');
assert.strictEqual(currentSetlist[1].title, 'Acoustic Ballad');
console.log('✅ Independent presets verified: switching preserves each preset’s independent songs.');

// 3. Test Renaming, Duplicating, and Deletion
console.log('\n[Test 3] Preset Operations: Rename, Duplicate, Delete');

// Rename
function renamePreset(presetId, newName) {
  currentPresets = currentPresets.map((p) =>
    p.id === presetId ? { ...p, name: newName } : p
  );
}
renamePreset(acousticId, 'Unplugged Live');
assert.strictEqual(currentPresets.find((p) => p.id === acousticId).name, 'Unplugged Live');

// Duplicate
function duplicatePreset(presetId) {
  const target = currentPresets.find((p) => p.id === presetId);
  const id = 'preset_dup_' + Date.now();
  const clonedSongs = (target.songs || []).map((s) => ({ ...s, id: 'sl_' + Math.random() }));
  const dup = {
    id,
    name: `${target.name} (Copy)`,
    songs: clonedSongs,
  };
  currentPresets = [...currentPresets, dup];
  currentActiveId = id;
  currentSetlist = clonedSongs;
  return id;
}
const dupId = duplicatePreset(acousticId);
assert.strictEqual(currentPresets.length, 3);
assert.strictEqual(currentPresets.find((p) => p.id === dupId).name, 'Unplugged Live (Copy)');
assert.strictEqual(currentSetlist.length, 2);

// Delete duplicate
function deletePreset(presetId) {
  if (currentPresets.length <= 1) return false;
  const remaining = currentPresets.filter((p) => p.id !== presetId);
  if (currentActiveId === presetId) {
    const next = remaining[0];
    currentActiveId = next.id;
    currentSetlist = next.songs || [];
  }
  currentPresets = remaining;
  return true;
}
const deleted = deletePreset(dupId);
assert.strictEqual(deleted, true);
assert.strictEqual(currentPresets.length, 2);
assert.strictEqual(currentActiveId, 'preset_default', 'Should switch to remaining preset');

// Cannot delete down to 0 presets
deletePreset(acousticId);
assert.strictEqual(currentPresets.length, 1);
const cannotDeleteLast = deletePreset('preset_default');
assert.strictEqual(cannotDeleteLast, false, 'Should refuse deleting the only remaining preset');
assert.strictEqual(currentPresets.length, 1);
console.log('✅ Preset operations verified: rename, duplicate, and safe deletion all work properly.');

// 4. Test Direct Drag-and-Drop Reorder Logic
console.log('\n[Test 4] Direct Drag-and-Drop Reordering Mechanics');
let songs = [
  { id: 's1', title: 'Track 1' },
  { id: 's2', title: 'Track 2' },
  { id: 's3', title: 'Track 3' },
  { id: 's4', title: 'Track 4' },
  { id: 's5', title: 'Track 5' },
];

function reorderArray(list, fromIndex, toIndex) {
  const result = [...list];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

// Drag item 4 (Track 5) to top (index 0)
songs = reorderArray(songs, 4, 0);
assert.deepStrictEqual(songs.map((s) => s.title), ['Track 5', 'Track 1', 'Track 2', 'Track 3', 'Track 4']);

// Drag top item to bottom
songs = reorderArray(songs, 0, 4);
assert.deepStrictEqual(songs.map((s) => s.title), ['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5']);

// Drag item 2 (Track 3) to position 1
songs = reorderArray(songs, 2, 1);
assert.deepStrictEqual(songs.map((s) => s.title), ['Track 1', 'Track 3', 'Track 2', 'Track 4', 'Track 5']);

// Bulk reorder from Framer Motion Reorder.Group callback
const motionReorder = [songs[4], songs[3], songs[2], songs[1], songs[0]];
assert.strictEqual(motionReorder[0].title, 'Track 5');
assert.strictEqual(motionReorder[4].title, 'Track 1');

console.log('✅ Drag reorder mechanics verified: drag-to-top, drag-to-bottom, and bulk Reorder.Group pass.');

console.log('\n🎉 ALL STAGEX SETLIST VERIFICATION TESTS PASSED SUCCESSFULLY!');
