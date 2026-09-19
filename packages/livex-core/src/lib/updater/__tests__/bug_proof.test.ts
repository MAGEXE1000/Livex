import { describe, it, expect, vi, beforeEach } from 'vitest';
import { globalUpdateState, transitionToState, updateGlobalState } from '../stateMachine';

// Mock localStorage
(global as any).localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
// Mock window
(global as any).window = {
  location: { href: '' },
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
};
(global as any).document = {
  addEventListener: vi.fn(),
};

describe('Updater Bug Proof', () => {
  beforeEach(() => {
    transitionToState('IDLE', 'Reset');
    updateGlobalState({ updateAvailable: false, error: null });
  });

  it('should reproduce the Studio is up to date bug during PACKAGEINSTALLER_VISIBLE', async () => {
    transitionToState('INITIALIZING', 'Mock');
    transitionToState('FETCH_REMOTE_METADATA', 'Mock');
    transitionToState('VALIDATE_METADATA', 'Mock');
    transitionToState('COMPARE_VERSION', 'Mock');
    transitionToState('UPDATE_AVAILABLE', 'Mock');
    transitionToState('FETCH_APK_INFORMATION', 'Mock');
    transitionToState('DOWNLOAD_APK', 'Mock');
    transitionToState('VERIFY_SHA256', 'Mock');
    transitionToState('PREPARING_INSTALL', 'Mock');
    transitionToState('WAITING_USER_CONFIRMATION', 'Mock');
    expect(globalUpdateState.updateState).toBe('WAITING_USER_CONFIRMATION');
    transitionToState('PACKAGEINSTALLER_VISIBLE', 'Simulated applyUpdate start');
    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');
    // The background check finishes and attempts to set UPDATE_AVAILABLE
    // using safeTransition, which internally calls transitionToState.
    updateGlobalState({ updateAvailable: true });

    // Simulate safeTransition('COMPARE_VERSION', 'UPDATE_AVAILABLE')
    // Wait, safeTransition internally does:
    // commitTransition('UPDATE_AVAILABLE', 'New update found', false)
    transitionToState('UPDATE_AVAILABLE', 'Simulated background check complete');
    // The state machine now correctly blocks this invalid transition.
    // PACKAGEINSTALLER_VISIBLE must not be overwritten by a background check.
    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');
    expect(globalUpdateState.updateAvailable).toBe(true);
  });
});
