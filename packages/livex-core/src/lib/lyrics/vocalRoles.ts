import {
  VOCAL_ROLE_PRESETS,
  type VocalRoleAnnotation,
  type SongLyricsDocument,
} from '../../types/lyrics';

export const CUSTOM_VOCAL_ROLES_STORAGE_KEY = 'livex:custom_vocal_roles:v1';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

/**
 * Retrieves user-defined custom vocal roles from persistent storage.
 */
export function getCustomVocalRoles(): VocalRoleAnnotation[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(CUSTOM_VOCAL_ROLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is VocalRoleAnnotation =>
        Boolean(
          r &&
            typeof r === 'object' &&
            typeof r.label === 'string' &&
            r.label.trim().length > 0
        )
    );
  } catch {
    return [];
  }
}

/**
 * Saves a new or updated custom vocal role.
 * Prevents overwriting canonical default role labels ('Lead', 'Solo', 'Backing', 'All', 'Choir').
 */
export function saveCustomVocalRole(role: {
  label: string;
  color?: string;
}): VocalRoleAnnotation[] {
  const trimmed = (role.label || '').trim();
  if (!trimmed) return getCustomVocalRoles();

  // Guard against collision with default roles (case-insensitive)
  const isDefaultConflict = VOCAL_ROLE_PRESETS.some(
    (preset) => preset.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDefaultConflict) {
    return getCustomVocalRoles();
  }

  const current = getCustomVocalRoles();
  const existingIndex = current.findIndex(
    (r) => (r.label || '').toLowerCase() === trimmed.toLowerCase()
  );

  const newRole: VocalRoleAnnotation = {
    type: 'custom',
    label: trimmed,
    color: role.color || '#ec4899',
  };

  let updated: VocalRoleAnnotation[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = newRole;
  } else {
    updated = [...current, newRole];
  }

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(
        CUSTOM_VOCAL_ROLES_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to persist custom vocal roles:', err);
    }
  }

  return updated;
}

/**
 * Deletes a custom vocal role by label.
 */
export function deleteCustomVocalRole(label: string): VocalRoleAnnotation[] {
  const trimmed = (label || '').trim().toLowerCase();
  if (!trimmed) return getCustomVocalRoles();

  const current = getCustomVocalRoles();
  const updated = current.filter((r) => (r.label || '').toLowerCase() !== trimmed);

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(
        CUSTOM_VOCAL_ROLES_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to persist custom vocal roles after deletion:', err);
    }
  }

  return updated;
}

/**
 * Merges persistent custom roles with any custom roles embedded
 * in the provided SongLyricsDocument (e.g. from imported presets).
 */
export function getCombinedVocalRoles(doc?: SongLyricsDocument): {
  defaults: typeof VOCAL_ROLE_PRESETS;
  customs: VocalRoleAnnotation[];
} {
  const saved = getCustomVocalRoles();
  const customMap = new Map<string, VocalRoleAnnotation>();

  saved.forEach((r) => {
    if (r.label) {
      customMap.set(r.label.toLowerCase(), r);
    }
  });

  if (doc?.sections) {
    for (const sec of doc.sections) {
      if (sec.vocalRole && sec.vocalRole.label) {
        const isDefault = VOCAL_ROLE_PRESETS.some(
          (p) => p.label.toLowerCase() === sec.vocalRole!.label!.toLowerCase()
        );
        if (!isDefault && !customMap.has(sec.vocalRole.label.toLowerCase())) {
          customMap.set(sec.vocalRole.label.toLowerCase(), {
            type: 'custom',
            label: sec.vocalRole.label,
            color: sec.vocalRole.color || '#ec4899',
          });
        }
      }
    }
  }

  return {
    defaults: VOCAL_ROLE_PRESETS,
    customs: Array.from(customMap.values()),
  };
}
