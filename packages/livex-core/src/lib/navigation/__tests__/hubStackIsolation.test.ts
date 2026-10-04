import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { NavigationDispatcher } from '../NavigationDispatcher';

const apps = () => useNavigationStore.getState().history.map((r) => r.app);

describe('Hub stack isolation (Stagex back-loop regression)', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      history: [{ app: 'hub', tab: 'home' }],
      activeHandlers: [],
      isTransitioning: false,
      transitionType: null,
    });
  });

  it('pushing a hub route from inside Stagex flushes every Stagex entry', () => {
    NavigationDispatcher.openApp('stagex');
    expect(apps()).toContain('stagex');

    NavigationDispatcher.push({ app: 'hub', tab: 'settings' });
    NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'updater' });

    expect(apps().every((a) => a === 'hub')).toBe(true);
  });

  it('Back from Updater pops to Hub settings/home and never re-enters Stagex', () => {
    NavigationDispatcher.openApp('stagex');
    NavigationDispatcher.push({ app: 'hub', tab: 'settings' });
    NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'updater' });

    for (let i = 0; i < 6; i++) {
      NavigationDispatcher.pop();
      expect(apps()).not.toContain('stagex');
    }
    expect(NavigationDispatcher.currentApp()).toBe('hub');
  });

  it('defensively skips a stale sub-app entry when popping a hub route', () => {
    useNavigationStore.setState({
      history: [
        { app: 'hub', tab: 'home' },
        { app: 'stagex' } as never,
        { app: 'hub', tab: 'settings' },
      ],
    });
    NavigationDispatcher.pop();
    expect(apps()).toEqual(['hub']);
  });

  it('Hub -> Stagex -> Hub -> Settings -> Updater: Back goes Settings -> Hub, never Stagex', () => {
    NavigationDispatcher.openApp('stagex');
    NavigationDispatcher.openApp('hub');
    NavigationDispatcher.push({ app: 'hub', page: 'main', tab: 'settings' });
    NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'updater' });

    NavigationDispatcher.pop();
    expect(NavigationDispatcher.currentRoute()).toMatchObject({ app: 'hub', tab: 'settings' });
    NavigationDispatcher.pop();
    expect(NavigationDispatcher.currentRoute()).toMatchObject({ app: 'hub', tab: 'home' });
    expect(apps()).toEqual(['hub']);
  });

  it('closeApp resets to a clean hub root', () => {
    NavigationDispatcher.openApp('stagex');
    NavigationDispatcher.closeApp();
    expect(apps()).toEqual(['hub']);
  });
});
