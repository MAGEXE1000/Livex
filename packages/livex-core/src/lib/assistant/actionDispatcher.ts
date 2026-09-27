/**
 * Livex Assistant Action Dispatcher
 *
 * Canonical execution and validation engine for assistant-initiated actions across all apps.
 * Enforces parameter validation, confirmation guards, stale-state detection, and canonical store updates.
 */

import { type AssistantActionPayload, type AssistantActionType } from '../../types/assistant';
import { getAppProvider, type AppActionResult, type AppActionValidation } from './appContextRegistry';
import { useDrumStore, DrumInstrument, DrumPattern } from '../../store/useDrumStore';
import { importProgressionToChordex } from '../chord/chordResolution';
import { NavigationDispatcher } from '../navigation/NavigationDispatcher';

export interface ActionExecutionOptions {
  confirmed?: boolean;
}

/**
 * Validates an assistant action payload against canonical application constraints.
 */
export function validateAssistantAction(action: AssistantActionPayload): AppActionValidation {
  if (!action || !action.id || !action.actionType || !action.app) {
    return { valid: false, error: 'Invalid action payload: missing required fields' };
  }

  const { app, actionType, params } = action;

  // 1. Drumex actions
  if (actionType === 'drumex:create_pattern') {
    if (!params) {
      return { valid: false, error: 'Missing drum pattern parameters' };
    }
    if (params.bpm !== undefined) {
      const bpm = Number(params.bpm);
      if (isNaN(bpm) || bpm < 30 || bpm > 300) {
        return { valid: false, error: 'Invalid BPM: must be between 30 and 300' };
      }
    }
    return { valid: true };
  }

  // 2. Chordex actions
  if (actionType === 'chordex:import_progression') {
    if (!params || (!params.chords && !params.progression)) {
      return { valid: false, error: 'Missing chords array for progression import' };
    }
    const chords = params.chords || params.progression;
    if (!Array.isArray(chords) || chords.length < 2) {
      return { valid: false, error: 'Progression must contain at least 2 chords' };
    }
    return { valid: true };
  }

  // 3. Vocalex actions
  if (actionType === 'vocalex:start_exercise') {
    return { valid: true };
  }

  // 4. Delegated app actions (Stagex, Groovex, etc.)
  const provider = getAppProvider(app);
  if (provider?.validateAction) {
    return provider.validateAction(actionType, params || {});
  }

  // If no validator is registered yet, ensure provider exists
  if (!provider && (app === 'stagex' || app === 'groovex')) {
    return { valid: false, error: `App provider for "${app}" is not registered or unavailable` };
  }

  return { valid: true };
}

/**
 * Executes a validated assistant action on canonical application stores.
 */
export async function executeAssistantAction(
  action: AssistantActionPayload,
  options?: ActionExecutionOptions
): Promise<AppActionResult> {
  // Pre-execution validation
  const validation = validateAssistantAction(action);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Action validation failed',
    };
  }

  // Enforce confirmation guard
  if (action.requiresConfirmation && !options?.confirmed) {
    return {
      success: false,
      error: 'Action requires confirmation before execution',
    };
  }

  const { app, actionType, params = {} } = action;

  try {
    // 1. Drumex: create_pattern
    if (actionType === 'drumex:create_pattern') {
      const drumStore = useDrumStore.getState();
      const patternName = params.name || params.title || 'AI Drum Groove';
      const bpm = params.bpm ? Math.round(Number(params.bpm)) : 120;
      const timeSignature = params.timeSignature || '4/4';

      // Create new pattern in store
      const patternId = drumStore.createPattern();
      drumStore.renamePattern(patternId, patternName);
      // Parse time signature (default [4, 4])
      let timeSigTuple: [number, number] = [4, 4];
      if (typeof timeSignature === 'string' && timeSignature.includes('/')) {
        const [num, den] = timeSignature.split('/').map(Number);
        if (!isNaN(num) && !isNaN(den) && num > 0 && den > 0) {
          timeSigTuple = [num, den];
        }
      }

      drumStore.updatePattern(patternId, {
        bpm,
        timeSignature: timeSigTuple,
      });

      // Populate pattern preview hits if provided
      if (params.patternPreview || params.pattern) {
        const preview = params.patternPreview || params.pattern;
        const currentPattern = drumStore.patterns.find((p) => p.id === patternId);
        const measureId = currentPattern?.measures?.[0]?.id;

        if (measureId) {
          const instMap: Record<string, DrumInstrument> = {
            kick: 'kick',
            snare: 'snare',
            hihat: 'hihat-closed',
            'hihat-closed': 'hihat-closed',
            'hihat-open': 'hihat-open',
            crash: 'crash',
            ride: 'ride',
          };

          for (const [instKey, steps] of Object.entries(preview)) {
            const mappedInst = instMap[instKey.toLowerCase()];
            if (mappedInst && Array.isArray(steps)) {
              steps.forEach((hit, stepIdx) => {
                if (hit && stepIdx >= 0 && stepIdx < 16) {
                  drumStore.toggleHit(patternId, measureId, mappedInst, stepIdx);
                }
              });
            }
          }
        }
      }

      // Navigate to Drumex editor
      try {
        NavigationDispatcher.push({ app: 'drumex', page: 'beats' });
      } catch (_) {}

      return {
        success: true,
        message: `Created "${patternName}" at ${bpm} BPM in Drumex`,
      };
    }

    // 2. Chordex: import_progression
    if (actionType === 'chordex:import_progression') {
      const chords = params.chords || params.progression;
      const title = params.title || 'AI Chord Progression';
      const key = params.key || 'C';
      const tempo = params.tempo || params.bpm || 120;

      importProgressionToChordex({
        chords,
        key,
        tempo,
        title,
        romanNumerals: params.romanNumerals,
        feel: params.feel,
        genre: params.genre,
        explanation: params.explanation,
        description: params.description,
      });

      return {
        success: true,
        message: `Imported "${title}" to Chordex`,
      };
    }

    // 3. Vocalex: start_exercise
    if (actionType === 'vocalex:start_exercise') {
      try {
        NavigationDispatcher.push({ app: 'vocalex', page: 'exercises' });
      } catch (_) {}

      return {
        success: true,
        message: `Launched Vocalex warmup: ${params.title || params.routine || 'Warmup Routine'}`,
      };
    }

    // 4. Delegated app actions (Stagex, Groovex, etc.)
    const provider = getAppProvider(app);
    if (provider?.executeAction) {
      return await provider.executeAction(actionType, params);
    }

    return {
      success: false,
      error: `No action executor found for action "${actionType}" in app "${app}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Action execution failed: ${err?.message || String(err)}`,
    };
  }
}
