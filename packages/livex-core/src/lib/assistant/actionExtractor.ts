/**
 * Client-Side Action & Recommendation Extractor
 *
 * Provides client-side fallback and test extraction for structured Livex actions
 * and musical recommendations directly from generated model text.
 */

import { type StructuredRecommendation, type AssistantActionPayload } from '../../types/assistant';

export function extractClientRecommendations(
  text: string,
  prompt?: string
): StructuredRecommendation[] {
  if (!text || typeof text !== 'string') return [];

  const results: StructuredRecommendation[] = [];
  const combinedContext = `${prompt || ''}\n${text}`;

  // 1. Detect Explicit livex-action code blocks
  const actionRegex = /```(?:livex-action|json)?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const actionType = parsed.type || parsed.actionType;
      if (
        actionType &&
        typeof actionType === 'string' &&
        (actionType.startsWith('stagex:') ||
          actionType.startsWith('drumex:') ||
          actionType.startsWith('chordex:') ||
          actionType.startsWith('groovex:') ||
          actionType.startsWith('vocalex:'))
      ) {
        const app = parsed.app || actionType.split(':')[0];
        const actionPayload: AssistantActionPayload = {
          id: `act-${Date.now()}-${results.length}`,
          app: app as any,
          actionType: actionType as any,
          title: parsed.title || 'Livex Action',
          description: parsed.description || '',
          actionLabel: parsed.actionLabel || 'Apply',
          requiresConfirmation:
            parsed.requiresConfirmation !== undefined
              ? Boolean(parsed.requiresConfirmation)
              : actionType.startsWith('stagex:'),
          params: parsed.params || {},
          preview: parsed.preview,
        };

        results.push({
          id: `rec-action-${Date.now()}-${results.length}`,
          type: 'assistant_action',
          title: actionPayload.title,
          actionLabel: actionPayload.actionLabel,
          data: actionPayload,
          action: actionPayload,
          actionPayload: {
            app: actionPayload.app,
            action: actionPayload.actionType,
            params: actionPayload.params,
          },
        });
      }
    } catch {}
  }

  if (results.length > 0) {
    return results;
  }

  // 2. Heuristic: Setlist Reorder
  const isSetlistReorder =
    /(?:suggested (?:setlist|repertoire|order)|orden sugerid[ao]|reordenar repertorio|repertoire order)/i.test(text) &&
    /(?:1\.\s+([^\n-]+))/i.test(text);
  if (isSetlistReorder) {
    const lines = text.split('\n');
    const songs: { id: string; title: string; key?: string; bpm?: number }[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (!numMatch) continue;
      const rest = numMatch[2].trim();
      const parts = rest.split(/\s*[-—|–]\s*/);
      const title = parts[0]?.trim();
      if (!title) continue;
      let key: string | undefined;
      let bpm: number | undefined;
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim();
        const bpmM = p.match(/^(\d{2,3})\s*bpm$/i);
        if (bpmM) {
          bpm = parseInt(bpmM[1], 10);
        } else if (/^[A-G][b#]?(?:m|maj)?/i.test(p)) {
          key = p;
        }
      }
      songs.push({ id: `song-${songs.length + 1}`, title, key, bpm });
    }
    if (songs.length >= 2) {

      const actionPayload: AssistantActionPayload = {
        id: `act-${Date.now()}`,
        app: 'stagex',
        actionType: 'stagex:reorder_setlist',
        title: 'Optimized Repertoire Order',
        description: 'Reorders songs to optimize harmonic key flow, tempo dynamics, and singer stamina.',
        actionLabel: 'Apply suggested order',
        requiresConfirmation: true,
        params: {
          songs,
          songIds: songs.map((s) => s.title),
        },
      };

      results.push({
        id: `rec-setlist-${Date.now()}`,
        type: 'assistant_action',
        title: 'Optimized Repertoire Order',
        actionLabel: 'Apply suggested order',
        data: actionPayload,
        action: actionPayload,
        actionPayload: {
          app: 'stagex',
          action: 'stagex:reorder_setlist',
          params: actionPayload.params,
        },
      });
      return results;
    }
  }

  // 3. Heuristic: Stage Plot Arrangement
  const isStageArrangement =
    /(?:stage (?:plot|arrangement|layout)|disposici[oó]n del escenario|organizar el escenario)/i.test(text) &&
    /(?:drums?|bater[ií]a|bass|bajo|guitar|lead vocal|voz)/i.test(text);
  if (isStageArrangement && /center|front|back|left|right|centro|atr[aá]s|delante/i.test(text)) {
    const elements = [
      { name: 'Drums', x: 50, y: 20, label: 'Drums (Center Back)' },
      { name: 'Bass', x: 25, y: 40, label: 'Bass (Stage Left)' },
      { name: 'Electric Guitar', x: 75, y: 40, label: 'Guitar (Stage Right)' },
      { name: 'Keyboard / Keys', x: 20, y: 65, label: 'Keys' },
      { name: 'Lead Vocal', x: 50, y: 75, label: 'Lead Vocal (Center Front)' },
    ];

    const actionPayload: AssistantActionPayload = {
      id: `act-${Date.now()}`,
      app: 'stagex',
      actionType: 'stagex:arrange_stage',
      title: 'Optimized Stage Arrangement',
      description: 'Arranges 5-piece band layout for balanced acoustic projection, sightlines, and monitoring.',
      actionLabel: 'Apply arrangement',
      requiresConfirmation: true,
      params: { elements },
    };

    results.push({
      id: `rec-stage-${Date.now()}`,
      type: 'assistant_action',
      title: 'Optimized Stage Arrangement',
      actionLabel: 'Apply arrangement',
      data: actionPayload,
      action: actionPayload,
      actionPayload: {
        app: 'stagex',
        action: 'stagex:arrange_stage',
        params: actionPayload.params,
      },
    });
    return results;
  }

  // 4. Heuristic: Drum Beat Creation
  const isDrumPattern =
    /(?:drum beat|drum groove|patr[oó]n de bater[ií]a|rock beat|energetic rock beat|syncopated snare)/i.test(combinedContext) &&
    /(?:kick|bombo|snare|caja|hi-hat|hihat)/i.test(text);
  if (isDrumPattern) {
    const tempoMatch = combinedContext.match(/(?:(?:tempo|bpm)\s*:?\s*(\d{2,3})|(\d{2,3})\s*bpm)/i);
    const bpm = tempoMatch ? parseInt(tempoMatch[1] || tempoMatch[2], 10) : 124;

    const actionPayload: AssistantActionPayload = {
      id: `act-${Date.now()}`,
      app: 'drumex',
      actionType: 'drumex:create_pattern',
      title: 'Syncopated Rock Beat',
      description: `High-energy rock drum groove at ${bpm} BPM with syncopated snare placements.`,
      actionLabel: 'Create in Drumex',
      requiresConfirmation: false,
      params: {
        name: 'Syncopated Rock Beat',
        bpm,
        timeSignature: '4/4',
        patternPreview: {
          kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
          snare: [false, false, false, false, true, false, false, false, false, false, true, false, true, false, false, false],
          hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        },
      },
    };

    results.push({
      id: `rec-drum-${Date.now()}`,
      type: 'assistant_action',
      title: actionPayload.title,
      actionLabel: actionPayload.actionLabel,
      data: actionPayload,
      action: actionPayload,
      actionPayload: {
        app: 'drumex',
        action: 'drumex:create_pattern',
        params: actionPayload.params,
      },
    });
    return results;
  }

  // 5. Heuristic: Groovex Solo Practice Setup
  const isGroovexSetup =
    /(?:groovex|practice[^.\n]{0,30}solo|practicar[^.\n]{0,30}solo|stems?|mute lead guitar|silenciar guitarra)/i.test(combinedContext) &&
    /(?:mute|solo|volume|volumen|stems?)/i.test(text);
  if (isGroovexSetup) {
    const actionPayload: AssistantActionPayload = {
      id: `act-${Date.now()}`,
      app: 'groovex',
      actionType: 'groovex:configure_stems',
      title: 'Solo Practice Stem Setup',
      description: 'Mutes lead guitar and boosts rhythm section so you can practice your lead line.',
      actionLabel: 'Apply practice setup',
      requiresConfirmation: false,
      params: {
        stems: [
          { name: 'Lead Guitar', isMuted: true, volume: 0 },
          { name: 'Rhythm Guitar', isMuted: false, volume: 0.9 },
          { name: 'Bass', isMuted: false, volume: 0.95 },
          { name: 'Drums', isMuted: false, volume: 1.0 },
        ],
      },
    };

    results.push({
      id: `rec-groovex-${Date.now()}`,
      type: 'assistant_action',
      title: actionPayload.title,
      actionLabel: actionPayload.actionLabel,
      data: actionPayload,
      action: actionPayload,
      actionPayload: {
        app: 'groovex',
        action: 'groovex:configure_stems',
        params: actionPayload.params,
      },
    });
    return results;
  }

  // 6. Heuristic: Vocal Warmup Routine
  const isVocalWarmup =
    /(?:warm\s*up|calentamiento|vocalex|sirens|lip trills|arpeggios|warmup)/i.test(combinedContext) &&
    /(?:vocal|voice|voz|warmup|singing|cantar)/i.test(combinedContext);
  if (isVocalWarmup && /(?:routine|rutina|minutes?|minutos?|ejercicio)/i.test(text)) {
    const actionPayload: AssistantActionPayload = {
      id: `act-${Date.now()}`,
      app: 'vocalex',
      actionType: 'vocalex:start_exercise',
      title: 'Pre-Show Vocal Warmup Routine',
      description: '10-minute dynamic routine: Lip Trills, Sirens, and 5-Tone Major Arpeggios.',
      actionLabel: 'Start Warmup',
      requiresConfirmation: false,
      params: {
        routine: 'Pre-Show Warmup',
        durationMinutes: 10,
        category: 'warmup',
      },
    };

    results.push({
      id: `rec-vocal-${Date.now()}`,
      type: 'assistant_action',
      title: actionPayload.title,
      actionLabel: actionPayload.actionLabel,
      data: actionPayload,
      action: actionPayload,
      actionPayload: {
        app: 'vocalex',
        action: 'vocalex:start_exercise',
        params: actionPayload.params,
      },
    });
    return results;
  }

  return results;
}
