import { describe, it, expect } from 'vitest';
import { extractStructuredReleaseNotes } from '../releaseMetadata';

// Emulate displayState logic from UpdateIndicator.tsx
function getDisplayState(updateState: string, error: string | null) {
  const s = updateState;
  if (
    s === 'INITIALIZING' ||
    s === 'FETCH_REMOTE_METADATA' ||
    s === 'VALIDATE_METADATA' ||
    s === 'COMPARE_VERSION'
  )
    return 'checking';
  if (s === 'NO_UPDATE_AVAILABLE' || s === 'IDLE') return 'idle';
  if (s === 'UPDATE_AVAILABLE') return 'update_available';
  if (s === 'FETCH_APK_INFORMATION' || s === 'DOWNLOAD_APK') return 'downloading';
  if (s === 'VERIFY_SHA256') return 'verifying_sha';
  if (s === 'PREPARING_INSTALL') return 'verifying_eligibility';
  if (s === 'WAITING_USER_CONFIRMATION') return 'ready_to_install';
  if (s === 'PACKAGEINSTALLER_VISIBLE') return 'packageinstaller_visible';
  if (s === 'INSTALLING') return 'installing';
  if (s === 'INSTALL_SUCCESS') {
    return 'installing';
  }
  if (s === 'INSTALL_CANCELLED') return 'cancelled';
  if (s === 'INSTALL_FAILED') return 'failed';
  if (s === 'RECOVERY') {
    if (error?.includes('Signature mismatch') || error?.includes('Conflicting Package'))
      return 'signature_mismatch';
    if (error?.includes('versionCode_low')) return 'versionCode_low';
    return 'failed';
  }
  return s;
}

// Emulate state logic from UpdateIndicator.tsx
function getState(
  displayState: string,
  installFailedReason: string | null,
  permissionBlocked: boolean,
  reinstallRequired: boolean,
  apkUpdateRequired: boolean,
  isAppInstallerAvailable: boolean,
  error: string | null
) {
  let state = installFailedReason
    ? 'install_failed'
    : permissionBlocked
      ? 'permission_blocked'
      : displayState;
  if (state === 'update_available') {
    if (reinstallRequired) {
      state = 'reinstall_warning';
    } else if (apkUpdateRequired && !isAppInstallerAvailable) {
      state = 'manual_apk_required';
    } else {
      state = 'available';
    }
  } else if (state === 'waiting_for_confirmation') {
    state = 'waitingForUserInstallConfirmation';
  } else if (displayState === 'ready_to_install') {
    state = 'readyForInstallPrompt';
  } else if (displayState === 'completed') {
    state = 'installedOrReady';
  } else if (displayState === 'idle') {
    if (error) {
      if (error.includes('Signature mismatch') || error.includes('Conflicting Package')) {
        state = 'signature_mismatch';
      } else if (error.includes('versionCode_low')) {
        state = 'versionCode_low';
      } else {
        state = 'failed';
      }
    } else {
      state = 'idle';
    }
  }
  return state;
}

// Canonical notesList resolution logic matching UpdateIndicator.tsx
function resolveNotesList(
  releaseNotes: any,
  changelog: string | null | undefined,
  toVersion: string | null | undefined
): string[] {
  if (releaseNotes) {
    if (Array.isArray(releaseNotes)) {
      const filtered = releaseNotes.filter(
        (item: any) => typeof item === 'string' && item.trim().length > 0
      );
      if (filtered.length > 0) return filtered;
    } else if (typeof releaseNotes === 'object') {
      const extracted = extractStructuredReleaseNotes(releaseNotes);
      if (extracted.bullets.length > 0) {
        return extracted.bullets;
      }
    }
  }

  if (changelog && typeof changelog === 'string' && changelog.trim().length > 0) {
    const extracted = extractStructuredReleaseNotes(changelog);
    if (extracted.bullets.length > 0) {
      return extracted.bullets;
    }
  }

  if (toVersion) {
    return [
      `Studio update v${toVersion} includes performance optimizations, UI refinements, and stability improvements.`,
    ];
  }

  return [];
}

// Emulate showChangelog conditional flag
function getShowChangelog(updateAvailable: boolean, state: string) {
  return (
    updateAvailable &&
    [
      'available',
      'downloading',
      'readyForInstallPrompt',
      'installing',
      'installedOrReady',
    ].includes(state)
  );
}

describe('Updater Changelog Display & Release Notes Parsing', () => {
  it('1. checking state: changelog should not render', () => {
    const displayState = getDisplayState('FETCH_REMOTE_METADATA', null);
    const state = getState(displayState, null, false, false, false, true, null);
    const showChangelog = getShowChangelog(false, state);

    expect(state).toBe('checking');
    expect(showChangelog).toBe(false);
  });

  it('2. idle (up to date) state: changelog should not render', () => {
    const displayState = getDisplayState('NO_UPDATE_AVAILABLE', null);
    const state = getState(displayState, null, false, false, false, true, null);
    const showChangelog = getShowChangelog(false, state);

    expect(state).toBe('idle');
    expect(showChangelog).toBe(false);
  });

  it('3. available state: changelog should render with real structured release notes', () => {
    const displayState = getDisplayState('UPDATE_AVAILABLE', null);
    const state = getState(displayState, null, false, false, false, true, null);
    const showChangelog = getShowChangelog(true, state);

    const rawReleaseNotes = {
      added: ['Dynamic BPM visualizer', 'BeUI BouncyAccordion support'],
      improved: ['Core audio loop latency reduced by 15ms'],
      fixed: ['Crash on rapid theme toggling'],
    };

    const notesList = resolveNotesList(rawReleaseNotes, null, '4.5.43');

    expect(state).toBe('available');
    expect(showChangelog).toBe(true);
    expect(notesList).toEqual([
      '[Added] Dynamic BPM visualizer',
      '[Added] BeUI BouncyAccordion support',
      '[Improved] Core audio loop latency reduced by 15ms',
      '[Fixed] Crash on rapid theme toggling',
    ]);
  });

  it('4. raw markdown from GitHub release body is accurately parsed into structured categories', () => {
    const githubBody = `# Version 4.5.42\n\nRelease Date: 2026-08-24\n\n### Fixed\n\n- Developer Inspector Usability: Fixed broken refresh behavior.\n- Performance Diagnostics Layout Overflow: Applied flexWrap.\n\n### Added\n\n- Tap-to-select capturing handler in Developer Inspector overlay.`;

    const extracted = extractStructuredReleaseNotes(githubBody);
    expect(extracted.releaseNotes.fixed).toEqual([
      'Developer Inspector Usability: Fixed broken refresh behavior.',
      'Performance Diagnostics Layout Overflow: Applied flexWrap.',
    ]);
    expect(extracted.releaseNotes.added).toEqual([
      'Tap-to-select capturing handler in Developer Inspector overlay.',
    ]);
    expect(extracted.bullets).toEqual([
      '[Fixed] Developer Inspector Usability: Fixed broken refresh behavior.',
      '[Fixed] Performance Diagnostics Layout Overflow: Applied flexWrap.',
      '[Added] Tap-to-select capturing handler in Developer Inspector overlay.',
    ]);
  });

  it('5. multi-version test: Version A (4.5.41) -> Version B (4.5.42)', () => {
    const v41Notes = {
      added: [
        'Global HeroUI Dialog & Modal Migration',
        'Global HeroUI Button & ButtonGroup System',
      ],
    };
    const v42Notes = {
      fixed: ['Developer Inspector Usability: Fixed broken refresh behavior.'],
      added: ['Tap-to-select capturing handler in Developer Inspector overlay.'],
    };

    // When updater detects v4.5.42, notes must belong to v4.5.42, not v4.5.41
    const notesListB = resolveNotesList(v42Notes, null, '4.5.42');
    expect(notesListB).toEqual([
      '[Added] Tap-to-select capturing handler in Developer Inspector overlay.',
      '[Fixed] Developer Inspector Usability: Fixed broken refresh behavior.',
    ]);
    expect(notesListB).not.toContain('[Added] Global HeroUI Dialog & Modal Migration');
  });

  it('6. multi-version test: Version B (4.5.42) -> Version C (4.5.43)', () => {
    const v43Changelog = `• Modal Surface Transparency: Eliminated excessive transparency across modal surfaces.\n• Navigation Icon Mapping: Resolved unmapped icon warnings.`;

    // When updater detects v4.5.43, notes must belong to v4.5.43, not v4.5.42
    const notesListC = resolveNotesList(null, v43Changelog, '4.5.43');
    expect(notesListC).toEqual([
      'Modal Surface Transparency: Eliminated excessive transparency across modal surfaces.',
      'Navigation Icon Mapping: Resolved unmapped icon warnings.',
    ]);
    expect(notesListC).not.toContain(
      '[Fixed] Developer Inspector Usability: Fixed broken refresh behavior.'
    );
  });

  it('7. fallback notes usage when release notes are completely empty', () => {
    const notesList = resolveNotesList(null, null, '4.5.99');
    expect(notesList).toEqual([
      'Studio update v4.5.99 includes performance optimizations, UI refinements, and stability improvements.',
    ]);
    // Stale hardcoded text must NEVER be present
    expect(notesList).not.toContain(
      'Completely separated Chordex preferences from Hub/Studio Settings.'
    );
  });
});
