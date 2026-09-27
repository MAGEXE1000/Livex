import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerAppContextProvider,
  unregisterAppContextProvider,
  getAppContext,
  getAppProvider,
  type AppContextProvider,
  type AppActionResult,
} from '../appContextRegistry';
import { getMusicalContextSnapshot } from '../contextAggregator';
import { validateAssistantAction, executeAssistantAction } from '../actionDispatcher';
import { extractClientRecommendations } from '../actionExtractor';
import { useAssistantStore } from '../../../store/useAssistantStore';
import { useDrumStore } from '../../../store/useDrumStore';
import { useChordStore } from '../../../store/useChordStore';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { type AssistantActionPayload, type StagexContextSnapshot } from '../../../types/assistant';

describe('Cross-App Context-Aware Assistant Verification Suite', () => {
  beforeEach(() => {
    useAssistantStore.getState().clearConversation();
    unregisterAppContextProvider('stagex');
    unregisterAppContextProvider('groovex');
    unregisterAppContextProvider('vocalex');
  });

  afterEach(() => {
    unregisterAppContextProvider('stagex');
    unregisterAppContextProvider('groovex');
    unregisterAppContextProvider('vocalex');
  });

  // Scenario 1: Hub General Question
  describe('Scenario 1: Hub General Question', () => {
    it('provides context-aware reasoning on general queries without creating extraneous actions', () => {
      useNavigationStore.setState({
        history: [{ app: 'hub', tab: 'home' }],
      });

      const snapshot = getMusicalContextSnapshot();
      expect(snapshot.activeApp).toBe('hub');
      expect(snapshot.hub).toBeDefined();
      expect(snapshot.hub?.recentApps).toBeDefined();

      const generalAnswer =
        'In music theory, an inverted pedal point occurs when a persistent tone is held in an upper voice (usually the soprano) rather than in the bass. While a traditional bass pedal point grounds harmonic movement, an inverted pedal creates tension and brilliance across changing chord progressions below it.';

      const recs = extractClientRecommendations(
        generalAnswer,
        'What is an inverted pedal point and how is it used?'
      );

      // No app action should be erroneously generated for general musicology queries
      expect(recs.length).toBe(0);
    });
  });

  // Scenario 2: Stagex Setlist Analysis
  describe('Scenario 2: Stagex Setlist Analysis', () => {
    it('captures active preset and songs with keys, tempos, and energy in context snapshot', () => {
      const mockStagexContext: StagexContextSnapshot = {
        setlists: [{ id: 'preset-festival', name: 'Festival Setlist', songCount: 4, isDefault: true }],
        activePresetId: 'preset-festival',
        activePresetName: 'Festival Setlist',
        activeSongs: [
          { id: 's1', title: 'Intro Jam', key: 'Em', bpm: 120, duration: '3:00', energy: 80 },
          { id: 's2', title: 'Acoustic Breeze', key: 'C', bpm: 85, duration: '4:15', energy: 45 },
          { id: 's3', title: 'Mid-Set Anthem', key: 'G', bpm: 130, duration: '3:50', energy: 90 },
          { id: 's4', title: 'Grand Finale', key: 'D', bpm: 140, duration: '5:00', energy: 98 },
        ],
        scenes: [{ id: 'sc1', name: 'Main Stage', elementCount: 5 }],
        performerCount: 4,
        gearCount: 8,
      };

      registerAppContextProvider({
        app: 'stagex',
        getContext: () => mockStagexContext,
      });

      const snapshot = getMusicalContextSnapshot();
      expect(snapshot.stagex).toBeDefined();
      expect(snapshot.stagex?.activePresetName).toBe('Festival Setlist');
      expect(snapshot.stagex?.activeSongs).toHaveLength(4);
      expect(snapshot.stagex?.activeSongs?.[0].key).toBe('Em');
      expect(snapshot.stagex?.activeSongs?.[3].bpm).toBe(140);
    });
  });

  // Scenario 3: Stagex Multiple-Preset Clarification
  describe('Scenario 3: Stagex Multiple-Preset Clarification', () => {
    it('identifies ambiguity when multiple presets exist without a specified target', () => {
      const mockMultiplePresetsContext: StagexContextSnapshot = {
        setlists: [
          { id: 'p1', name: 'Festival', songCount: 12 },
          { id: 'p2', name: 'Acoustic Club', songCount: 8 },
          { id: 'p3', name: 'Arena Tour', songCount: 18 },
        ],
        activePresetId: 'p1',
        activePresetName: 'Festival',
      };

      registerAppContextProvider({
        app: 'stagex',
        getContext: () => mockMultiplePresetsContext,
      });

      const snapshot = getMusicalContextSnapshot();
      const presets = snapshot.stagex?.setlists || [];

      // Logic verifies multi-preset detection
      expect(presets.length).toBeGreaterThan(1);
      const presetNames = presets.map((p) => p.name);
      expect(presetNames).toEqual(['Festival', 'Acoustic Club', 'Arena Tour']);

      // Clarification prompt generator
      const needsClarification = (userQuery: string): boolean => {
        const queryLower = userQuery.toLowerCase();
        const mentionsAny = presetNames.some((name) => queryLower.includes(name.toLowerCase()));
        return !mentionsAny;
      };

      expect(needsClarification('What do you think about the order of my repertoire?')).toBe(true);
      expect(needsClarification('What do you think about Festival?')).toBe(false);
    });
  });

  // Scenario 4: Stagex Reorder Suggestion + Apply Action
  describe('Scenario 4: Stagex Reorder Suggestion + Apply Action', () => {
    it('executes reordering action on Stagex preset and preserves all songs', async () => {
      let currentSongs = [
        { id: 's1', title: 'Heavy Opener' },
        { id: 's2', title: 'Slow Ballad' },
        { id: 's3', title: 'Mid-tempo Groove' },
        { id: 's4', title: 'High-energy Closer' },
      ];

      const stagexProvider: AppContextProvider = {
        app: 'stagex',
        getContext: () => ({
          setlists: [{ id: 'preset-1', name: 'Tour Setlist', songCount: 4 }],
          activePresetId: 'preset-1',
          activeSongs: currentSongs,
        }),
        validateAction: (type, params) => {
          if (type === 'stagex:reorder_setlist') {
            if (!params.presetId && !params.songs && !params.songIds) {
              return { valid: false, error: 'Missing reorder parameters' };
            }
          }
          return { valid: true };
        },
        executeAction: async (type, params) => {
          if (type === 'stagex:reorder_setlist') {
            const requestedOrder: string[] = params.songIds || [];
            const reordered = requestedOrder
              .map((id) => currentSongs.find((s) => s.id === id || s.title === id))
              .filter(Boolean) as typeof currentSongs;

            currentSongs = reordered;
            return {
              success: true,
              message: `Reordered ${reordered.length} songs`,
            };
          }
          return { success: false, error: 'Unknown action' };
        },
      };

      registerAppContextProvider(stagexProvider);

      const action: AssistantActionPayload = {
        id: 'act-reorder-1',
        app: 'stagex',
        actionType: 'stagex:reorder_setlist',
        title: 'Optimized Repertoire Order',
        description: 'Reorders songs for optimal dynamic arc and singer vocal recovery.',
        actionLabel: 'Apply suggested order',
        requiresConfirmation: true,
        params: {
          presetId: 'preset-1',
          songIds: ['s1', 's3', 's2', 's4'], // Opener -> Mid-tempo -> Ballad -> Closer
        },
      };

      // Execution with confirmation
      const result = await executeAssistantAction(action, { confirmed: true });
      expect(result.success).toBe(true);
      expect(currentSongs.map((s) => s.id)).toEqual(['s1', 's3', 's2', 's4']);
    });
  });

  // Scenario 5: Stage Scene Analysis + Apply Arrangement
  describe('Scenario 5: Stage Scene Analysis + Apply Arrangement', () => {
    it('proposes and applies 5-piece band layout coordinates on Stage plot', async () => {
      let stageElements: any[] = [];

      const stagexProvider: AppContextProvider = {
        app: 'stagex',
        getContext: () => ({
          scenes: [{ id: 'scene-1', name: 'Main Scene', elementCount: stageElements.length }],
        }),
        executeAction: async (type, params) => {
          if (type === 'stagex:arrange_stage') {
            stageElements = params.elements;
            return {
              success: true,
              message: `Arranged ${stageElements.length} elements on stage`,
            };
          }
          return { success: false };
        },
      };

      registerAppContextProvider(stagexProvider);

      const action: AssistantActionPayload = {
        id: 'act-stage-1',
        app: 'stagex',
        actionType: 'stagex:arrange_stage',
        title: '5-Piece Band Arrangement',
        description: 'Positions Drums, Bass, Guitars, Keys, and Lead Vocal for optimal sightlines.',
        actionLabel: 'Apply arrangement',
        requiresConfirmation: true,
        params: {
          elements: [
            { name: 'Drums', x: 50, y: 15, label: 'Drums' },
            { name: 'Bass', x: 25, y: 45, label: 'Bass' },
            { name: 'Electric Guitar', x: 75, y: 45, label: 'Guitar' },
            { name: 'Keys', x: 20, y: 70, label: 'Keys' },
            { name: 'Lead Vocal', x: 50, y: 80, label: 'Lead Vocal' },
          ],
        },
      };

      const result = await executeAssistantAction(action, { confirmed: true });
      expect(result.success).toBe(true);
      expect(stageElements).toHaveLength(5);
      expect(stageElements[0].name).toBe('Drums');
      expect(stageElements[4].name).toBe('Lead Vocal');
    });
  });

  // Scenario 6: Drumex Beat Creation + Create Action
  describe('Scenario 6: Drumex Beat Creation + Create Action', () => {
    it('creates a new drum pattern in Drumex store with specified BPM and step hits', async () => {
      const initialCount = useDrumStore.getState().patterns.length;

      const action: AssistantActionPayload = {
        id: 'act-drum-1',
        app: 'drumex',
        actionType: 'drumex:create_pattern',
        title: 'Energetic Rock Groove',
        description: 'Syncopated snare placements at 128 BPM.',
        actionLabel: 'Create in Drumex',
        requiresConfirmation: false,
        params: {
          name: 'Syncopated Rock',
          bpm: 128,
          timeSignature: '4/4',
          patternPreview: {
            kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
            snare: [false, false, false, false, true, false, false, false, false, false, true, false, true, false, false, false],
            hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
          },
        },
      };

      const result = await executeAssistantAction(action);
      expect(result.success).toBe(true);

      const patterns = useDrumStore.getState().patterns;
      expect(patterns.length).toBe(initialCount + 1);

      const created = patterns[patterns.length - 1];
      expect(created.name).toBe('Syncopated Rock');
      expect(created.bpm).toBe(128);
    });
  });

  // Scenario 7: Chordex Progression Assistance + Apply Action
  describe('Scenario 7: Chordex Progression Assistance + Apply Action', () => {
    it('stages pending chord import in Chordex store for Neo-Soul progression', async () => {
      const action: AssistantActionPayload = {
        id: 'act-chord-1',
        app: 'chordex',
        actionType: 'chordex:import_progression',
        title: 'Neo-Soul D Minor Extensions',
        description: 'Lush 9th and 13th voice leading in D minor.',
        actionLabel: 'Import to Chordex',
        requiresConfirmation: false,
        params: {
          title: 'Neo-Soul D Minor',
          key: 'Dm',
          tempo: 84,
          chords: ['Dm9', 'G13', 'Cmaj9', 'A7#9'],
          romanNumerals: ['i9', 'IV13', 'VIImaj9', 'V7#9'],
        },
      };

      const result = await executeAssistantAction(action);
      expect(result.success).toBe(true);

      const pending = useChordStore.getState().pendingImport;
      expect(pending).toBeDefined();
      expect(pending?.title).toBe('Neo-Soul D Minor');
      expect(pending?.chordNames).toEqual(['Dm9', 'G13', 'Cmaj9', 'A7#9']);
      expect(pending?.key).toBe('Dm');
    });
  });

  // Scenario 8: Groovex Context-Aware Question
  describe('Scenario 8: Groovex Context-Aware Question', () => {
    it('reads stem volumes and configures solo practice balance in Groovex', async () => {
      const stemVolumes: Record<string, number> = {
        drums: 1.0,
        bass: 0.9,
        guitar: 0.8,
        vocals: 0.85,
      };
      const stemMutes: Record<string, boolean> = {
        guitar: false,
      };

      const groovexProvider: AppContextProvider = {
        app: 'groovex',
        getContext: () => ({
          currentSongId: 'song-solo-1',
          currentSongTitle: 'Hotel Solo Practice',
          stemVolumes,
          stemMutes,
          recentSongsCount: 3,
        }),
        executeAction: async (type, params) => {
          if (type === 'groovex:configure_stems') {
            for (const s of params.stems || []) {
              if (s.name) {
                if (typeof s.volume === 'number') stemVolumes[s.name.toLowerCase()] = s.volume;
                if (typeof s.isMuted === 'boolean') stemMutes[s.name.toLowerCase()] = s.isMuted;
              }
            }
            return { success: true, message: 'Applied practice setup' };
          }
          return { success: false };
        },
      };

      registerAppContextProvider(groovexProvider);

      const snapshot = getMusicalContextSnapshot();
      expect(snapshot.groovex?.currentSongId).toBe('song-solo-1');
      expect(snapshot.groovex?.stemVolumes?.guitar).toBe(0.8);

      const action: AssistantActionPayload = {
        id: 'act-groove-1',
        app: 'groovex',
        actionType: 'groovex:configure_stems',
        title: 'Solo Practice Setup',
        description: 'Mute lead guitar and boost backing tracks.',
        actionLabel: 'Apply practice setup',
        params: {
          stems: [
            { name: 'guitar', isMuted: true, volume: 0 },
            { name: 'drums', isMuted: false, volume: 1.1 },
          ],
        },
      };

      const result = await executeAssistantAction(action);
      expect(result.success).toBe(true);
      expect(stemMutes.guitar).toBe(true);
      expect(stemVolumes.drums).toBe(1.1);
    });
  });

  // Scenario 9: Vocalex Context-Aware Question
  describe('Scenario 9: Vocalex Context-Aware Question', () => {
    it('proposes pre-show vocal warmup routine and launches Vocalex', async () => {
      registerAppContextProvider({
        app: 'vocalex',
        getContext: () => ({
          exerciseCategories: ['warmup', 'breath', 'pitch', 'agility'],
          recentTakesCount: 5,
        }),
      });

      const snapshot = getMusicalContextSnapshot();
      expect(snapshot.vocalex?.exerciseCategories).toContain('warmup');

      const action: AssistantActionPayload = {
        id: 'act-vocal-1',
        app: 'vocalex',
        actionType: 'vocalex:start_exercise',
        title: 'Pre-Show 10-Minute Warmup',
        description: 'Gentle lip trills, sirening, and resonance hums.',
        actionLabel: 'Start Warmup',
        params: {
          routine: 'Pre-Show Warmup',
          durationMinutes: 10,
        },
      };

      const result = await executeAssistantAction(action);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Launched Vocalex warmup');
    });
  });

  // Scenario 10: Ambiguous Request Requiring Clarification
  describe('Scenario 10: Ambiguous Request Requiring Clarification', () => {
    it('detects missing parameters and rejects execution with actionable error', async () => {
      const ambiguousAction: AssistantActionPayload = {
        id: 'act-ambiguous',
        app: 'chordex',
        actionType: 'chordex:import_progression',
        title: 'Ambiguous Request',
        description: 'Missing chords',
        actionLabel: 'Apply',
        params: {}, // Empty parameters
      };

      const validation = validateAssistantAction(ambiguousAction);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Missing chords array');

      const result = await executeAssistantAction(ambiguousAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing chords array');
    });
  });

  // Scenario 11: Action Requiring Confirmation
  describe('Scenario 11: Action Requiring Confirmation', () => {
    it('blocks execution when confirmation is required and not granted, succeeds when confirmed', async () => {
      let executed = false;

      registerAppContextProvider({
        app: 'stagex',
        getContext: () => null,
        executeAction: async () => {
          executed = true;
          return { success: true };
        },
      });

      const dangerousAction: AssistantActionPayload = {
        id: 'act-destructive-1',
        app: 'stagex',
        actionType: 'stagex:reorder_setlist',
        title: 'Overwrite Full Repertoire',
        description: 'Replaces song sequence',
        actionLabel: 'Apply new order',
        requiresConfirmation: true,
        params: { presetId: 'p1', songIds: ['s1', 's2'] },
      };

      // 1. Without confirmation: must be blocked
      const blockedResult = await executeAssistantAction(dangerousAction, { confirmed: false });
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.error).toContain('requires confirmation');
      expect(executed).toBe(false);

      // 2. With confirmation: must proceed
      const confirmedResult = await executeAssistantAction(dangerousAction, { confirmed: true });
      expect(confirmedResult.success).toBe(true);
      expect(executed).toBe(true);
    });
  });

  // Scenario 12: Invalid or Unavailable Action
  describe('Scenario 12: Invalid or Unavailable Action', () => {
    it('rejects execution when app provider is unregistered or BPM is outside safety bounds', async () => {
      // 1. Invalid BPM
      const invalidBpmAction: AssistantActionPayload = {
        id: 'act-invalid-bpm',
        app: 'drumex',
        actionType: 'drumex:create_pattern',
        title: 'Extreme Speed',
        description: 'Invalid tempo',
        actionLabel: 'Create',
        params: { bpm: 999 }, // Outside 30 - 300 range
      };

      const bpmValidation = validateAssistantAction(invalidBpmAction);
      expect(bpmValidation.valid).toBe(false);
      expect(bpmValidation.error).toContain('Invalid BPM');

      // 2. Unregistered app
      const unregisteredAction: AssistantActionPayload = {
        id: 'act-unregistered',
        app: 'stagex',
        actionType: 'stagex:arrange_stage',
        title: 'Stage plot',
        description: 'No provider',
        actionLabel: 'Apply',
        params: { elements: [] },
      };

      const unregResult = await executeAssistantAction(unregisteredAction, { confirmed: true });
      expect(unregResult.success).toBe(false);
      expect(unregResult.error).toContain('not registered');
    });
  });

  // Scenario 13: App State Changing While Response is Generated (Stale State)
  describe('Scenario 13: App State Changing While Response is Generated (Stale State)', () => {
    it('detects deleted target preset and aborts execution cleanly with friendly error', async () => {
      // Active presets: only 'Tour-2027' exists; 'Festival-Old' was deleted by user
      const existingPresets = [{ id: 'tour-2027', name: 'Tour 2027' }];

      registerAppContextProvider({
        app: 'stagex',
        getContext: () => ({ setlistPresets: existingPresets }),
        validateAction: (_type, params) => {
          const found = existingPresets.find((p) => p.id === params.presetId);
          if (!found) {
            return {
              valid: false,
              error: `Target setlist preset "${params.presetName || params.presetId}" does not exist or was deleted`,
            };
          }
          return { valid: true };
        },
        executeAction: async () => ({ success: true }),
      });

      // User had prompt about 'festival-old', but deleted it in another tab before clicking Apply
      const staleAction: AssistantActionPayload = {
        id: 'act-stale',
        app: 'stagex',
        actionType: 'stagex:reorder_setlist',
        title: 'Reorder Deleted Festival',
        description: 'Apply to festival preset',
        actionLabel: 'Apply suggested order',
        requiresConfirmation: true,
        params: {
          presetId: 'festival-old',
          presetName: 'Festival',
          songIds: ['s1', 's2'],
        },
      };

      const result = await executeAssistantAction(staleAction, { confirmed: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist or was deleted');
    });
  });
});
