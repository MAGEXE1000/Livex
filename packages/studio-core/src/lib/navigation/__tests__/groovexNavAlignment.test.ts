import { describe, it, expect } from 'vitest';
import { APP_SECTIONS } from '../appRegistry.js';
import { NavigationCoordinator } from '../NavigationCoordinator.js';
import { normalizeAndValidateRoute } from '../validation.js';

describe('Groovex Navigation & Section Alignment', () => {
  it('registers canonical library and preferences sections for groovex', () => {
    const sections = APP_SECTIONS.groovex;
    expect(sections).toBeDefined();
    expect(sections).toHaveLength(2);

    expect(sections[0].id).toBe('library');
    expect(sections[0].labelKey).toBe('groovexRhythms');
    expect(sections[0].icon).toBe('layers');

    expect(sections[1].id).toBe('preferences');
    expect(sections[1].labelKey).toBe('groovexPreferences');
    expect(sections[1].icon).toBe('sliders-horizontal');
  });

  it('resolves default groovex route to library when no page is specified', () => {
    const resolved = NavigationCoordinator.resolveDefaultRoute({ app: 'groovex' });
    expect(resolved.app).toBe('groovex');
    expect(resolved.page).toBe('library');
  });

  it('preserves explicit player page when requested', () => {
    const resolved = NavigationCoordinator.resolveDefaultRoute({
      app: 'groovex',
      page: 'player',
    });
    expect(resolved.app).toBe('groovex');
    expect(resolved.page).toBe('player');
  });

  it('preserves explicit preferences page when requested', () => {
    const resolved = NavigationCoordinator.resolveDefaultRoute({
      app: 'groovex',
      page: 'preferences',
    });
    expect(resolved.app).toBe('groovex');
    expect(resolved.page).toBe('preferences');
  });

  it('normalizes groovex route correctly', () => {
    const route = normalizeAndValidateRoute({
      app: 'groovex',
      page: 'library',
    });
    expect(route.app).toBe('groovex');
    expect(route.page).toBe('library');
  });
});
