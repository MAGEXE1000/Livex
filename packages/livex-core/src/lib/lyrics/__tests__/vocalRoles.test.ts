import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomVocalRoles,
  saveCustomVocalRole,
  deleteCustomVocalRole,
  getCombinedVocalRoles,
  CUSTOM_VOCAL_ROLES_STORAGE_KEY,
} from '../vocalRoles';
import { VOCAL_ROLE_PRESETS, type SongLyricsDocument } from '../../../types/lyrics';

const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => mockStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    mockStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    mockStore.delete(key);
  },
  clear: () => {
    mockStore.clear();
  },
};
(globalThis as any).localStorage = mockLocalStorage;

describe('Vocal Roles Management', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns empty array when no custom roles are stored', () => {
    expect(getCustomVocalRoles()).toEqual([]);
  });

  it('saves and retrieves custom vocal roles', () => {
    const roles = saveCustomVocalRole({ label: 'Tenor', color: '#14b8a6' });
    expect(roles).toHaveLength(1);
    expect(roles[0]).toEqual({
      type: 'custom',
      label: 'Tenor',
      color: '#14b8a6',
    });

    const stored = getCustomVocalRoles();
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe('Tenor');
  });

  it('updates existing custom vocal role if same label is used', () => {
    saveCustomVocalRole({ label: 'Tenor', color: '#14b8a6' });
    const updated = saveCustomVocalRole({ label: 'Tenor', color: '#6366f1' });
    expect(updated).toHaveLength(1);
    expect(updated[0].color).toBe('#6366f1');
  });

  it('prevents creating custom roles that conflict with default 5 roles', () => {
    for (const preset of VOCAL_ROLE_PRESETS) {
      const result = saveCustomVocalRole({ label: preset.label });
      expect(result).toHaveLength(0);
      const lowerResult = saveCustomVocalRole({ label: preset.label.toLowerCase() });
      expect(lowerResult).toHaveLength(0);
    }
    expect(getCustomVocalRoles()).toHaveLength(0);
  });

  it('deletes custom vocal roles by label', () => {
    saveCustomVocalRole({ label: 'Baritone', color: '#f97316' });
    saveCustomVocalRole({ label: 'Soprano', color: '#ec4899' });
    expect(getCustomVocalRoles()).toHaveLength(2);

    const remaining = deleteCustomVocalRole('Baritone');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe('Soprano');

    const stored = getCustomVocalRoles();
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe('Soprano');
  });

  it('getCombinedVocalRoles merges defaults, stored custom roles, and document roles', () => {
    saveCustomVocalRole({ label: 'Guest Star', color: '#a855f7' });

    const doc: SongLyricsDocument = {
      version: 1,
      sections: [
        {
          id: 'sec_1',
          type: 'verse',
          name: 'Verse 1',
          vocalRole: { type: 'custom', label: 'Congregation', color: '#0ea5e9' },
          lines: [{ id: 'l1', text: 'Sing together' }],
        },
        {
          id: 'sec_2',
          type: 'chorus',
          name: 'Chorus',
          vocalRole: { type: 'lead', label: 'Lead', color: '#3b82f6' },
          lines: [{ id: 'l2', text: 'Chorus line' }],
        },
      ],
    };

    const combined = getCombinedVocalRoles(doc);
    expect(combined.defaults).toHaveLength(6);
    // Custom roles should have Guest Star (from storage) and Congregation (from doc)
    const customLabels = combined.customs.map((c) => c.label);
    expect(customLabels).toContain('Guest Star');
    expect(customLabels).toContain('Congregation');
    expect(customLabels).not.toContain('Lead'); // Lead is in defaults
  });
});
