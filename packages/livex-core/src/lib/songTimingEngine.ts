/**
 * Livex Song Timing Engine
 *
 * Real musical timing system for Live performance.
 * Integrates Musical Reference (BPM, meter, chords per line, sections) with
 * Target Performance Duration (user-configured total runtime).
 *
 * Mathematical Invariants:
 * 1. Total scheduled duration matches target duration exactly:
 *    sum(durationMs) === targetDurationMs (when configured)
 * 2. Event start times start at 0 and conclude at target duration:
 *    events[0].startTimeMs === 0, events[last].endTimeMs === targetDurationMs
 * 3. Proportional section and line weighting is preserved:
 *    duration(i) / duration(j) === nominalDuration(i) / nominalDuration(j)
 * 4. Invertible pacing factor:
 *    lambda = targetDurationMs / nominalDurationMs
 *    effectiveBpm = referenceBpm / lambda
 */

import type { SongPreset, SongSection } from '../store/slices/songSlice';
import type { SongLyricsDocument, SongLyricSection, SongLyricLine, LyricChordPlacement } from '../types/lyrics';
import { getBeatsPerMeasure, type MetronomeTimeSignature } from './audio/metronomeAudio';

export interface PerformanceTimingItem {
  id: string;
  type: 'section' | 'line' | 'word' | 'chord';
  globalIndex: number;
  sectionId?: string;
  sectionName?: string;
  nominalDurationMs: number;
  durationMs: number;
  startTimeMs: number;
  endTimeMs: number;
  isFixedDuration?: boolean;
  data?: any;
}

export interface SongTimingSchedule {
  totalNominalDurationMs: number;
  totalTargetDurationMs: number;
  effectiveDurationMs: number;
  pacingFactor: number;
  effectiveSpeed: number;
  referenceSpeed: number;
  effectiveBpm: number;
  referenceBpm: number;
  isDurationPaced: boolean;
  sections: PerformanceTimingItem[];
  lines: PerformanceTimingItem[];
  words: PerformanceTimingItem[];
  chords: PerformanceTimingItem[];
}

export interface TimingEngineOptions {
  speedOverride?: number;
  bpmOverride?: number;
  beatsPerChord?: number;
  beatsPerLine?: number;
  timeSignature?: MetronomeTimeSignature;
  targetDurationOverride?: number; // In seconds
}

/**
 * Format duration in seconds to "mm:ss"
 */
export function formatDurationMmSs(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Parse "mm:ss", "mm.ss", or total seconds string into integer seconds
 */
export function parseDurationMmSs(input: string): number | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim();
  if (clean.includes(':') || clean.includes('.')) {
    const delimiter = clean.includes(':') ? ':' : '.';
    const parts = clean.split(delimiter);
    if (parts.length === 2) {
      if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(s) || m < 0 || s < 0 || s >= 60) return null;
      const total = m * 60 + s;
      return total > 0 ? total : null;
    }
    if (parts.length === 3) {
      if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);
      if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m >= 60 || s < 0 || s >= 60) return null;
      const total = h * 3600 + m * 60 + s;
      return total > 0 ? total : null;
    }
    return null;
  }
  if (!/^\d+$/.test(clean)) return null;
  const sec = parseInt(clean, 10);
  return !isNaN(sec) && sec > 0 ? sec : null;
}

/**
 * Calculate the complete, deterministic timing schedule for a song
 */
export function calculateSongTimingSchedule(
  preset: SongPreset,
  options?: TimingEngineOptions
): SongTimingSchedule {
  const referenceSpeed = Math.max(
    20,
    Math.min(1200, options?.speedOverride || options?.bpmOverride || preset.speed || preset.bpm || 120)
  );
  const referenceBpm = referenceSpeed;
  const timeSignature: MetronomeTimeSignature =
    options?.timeSignature || (preset as any)?.timeSignature || '4/4';
  const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
  const beatsPerChord = options?.beatsPerChord || beatsPerMeasure;
  const barsPerLine = preset.barsPerLine || 2;
  const beatsPerLine = options?.beatsPerLine || (barsPerLine * beatsPerMeasure);
  const beatDurationMs = 60000 / referenceSpeed;

  const targetSec =
    options && 'targetDurationOverride' in options
      ? options.targetDurationOverride
      : preset.targetDurationSeconds;

  const targetDurationMs = targetSec && targetSec > 0 ? Math.round(targetSec * 1000) : 0;

  const sections: PerformanceTimingItem[] = [];
  const lines: PerformanceTimingItem[] = [];
  const words: PerformanceTimingItem[] = [];
  const chords: PerformanceTimingItem[] = [];

  const lyricsSections = preset.lyrics?.sections || [];
  const hasLyrics = lyricsSections.some((s) => s.lines && s.lines.length > 0);

  let runningNominalTotal = 0;
  let totalFixedDurationMs = 0;

  if (hasLyrics) {
    // ── LYRICS & HYBRID TIMING CALCULATION ──
    let lineGlobalIdx = 0;
    let wordGlobalIdx = 0;
    let chordGlobalIdx = 0;

    lyricsSections.forEach((sec, secIdx) => {
      const secLines = sec.lines || [];
      let secNominalDuration = 0;
      const sectionLineIndices: number[] = [];

      secLines.forEach((line, lIdx) => {
        const isFixed = line.type === 'interlude' || line.explicitDurationMs !== undefined;
        let lineNominalMs = 0;

        if (isFixed) {
          lineNominalMs = Math.max(0, line.explicitDurationMs || 0);
          totalFixedDurationMs += lineNominalMs;
        } else {
          lineNominalMs = Math.round(beatsPerLine * beatDurationMs);
        }

        secNominalDuration += lineNominalMs;

        if (line.type === 'interlude') {
          const text = line.text || '';
          words.push({
            id: `word-${lineGlobalIdx}-0`,
            type: 'word',
            globalIndex: wordGlobalIdx++,
            sectionId: sec.id,
            sectionName: sec.name,
            nominalDurationMs: lineNominalMs,
            durationMs: lineNominalMs,
            startTimeMs: 0,
            endTimeMs: 0,
            isFixedDuration: true,
            data: {
              text,
              chord: undefined,
              lineIdx: lineGlobalIdx,
              wordIdxInLine: 0,
              startOffset: 0,
              endOffset: text.length,
            },
          });
        } else {
          // Extract discrete words
          const text = line.text || '';
          const regex = /\S+/g;
          let match: RegExpExecArray | null;
          const lineWordMatches: { text: string; start: number; end: number }[] = [];
          while ((match = regex.exec(text)) !== null) {
            lineWordMatches.push({
              text: match[0],
              start: match.index,
              end: match.index + match[0].length,
            });
          }

          const wordCount = Math.max(1, lineWordMatches.length);
          const wordNominalMs = lineNominalMs / wordCount;

          lineWordMatches.forEach((wm, wIdx) => {
            const matchingChord =
              line.chords?.find((c) => c.offset >= wm.start && c.offset < wm.end) ||
              (wIdx === 0 ? line.chords?.find((c) => c.offset < wm.start) : undefined);

            words.push({
              id: `word-${lineGlobalIdx}-${wIdx}`,
              type: 'word',
              globalIndex: wordGlobalIdx++,
              sectionId: sec.id,
              sectionName: sec.name,
              nominalDurationMs: wordNominalMs,
              durationMs: wordNominalMs,
              startTimeMs: 0,
              endTimeMs: 0,
              isFixedDuration: isFixed,
              data: {
                text: wm.text,
                chord: matchingChord?.chord,
                lineIdx: lineGlobalIdx,
                wordIdxInLine: wIdx,
                startOffset: wm.start,
                endOffset: wm.end,
              },
            });
          });
        }

        // Add chords placed on line
        (line.chords || []).forEach((c, cIdx) => {
          const chordNominalMs = Math.round(beatsPerChord * beatDurationMs);
          chords.push({
            id: c.id || `chord-${lineGlobalIdx}-${cIdx}`,
            type: 'chord',
            globalIndex: chordGlobalIdx++,
            sectionId: sec.id,
            sectionName: sec.name,
            nominalDurationMs: chordNominalMs,
            durationMs: chordNominalMs,
            startTimeMs: 0,
            endTimeMs: 0,
            isFixedDuration: isFixed,
            data: { chord: c.chord, offset: c.offset, lineIdx: lineGlobalIdx },
          });
        });

        lines.push({
          id: line.id || `line-${sec.id}-${lIdx}`,
          type: 'line',
          globalIndex: lineGlobalIdx++,
          sectionId: sec.id,
          sectionName: sec.name,
          nominalDurationMs: lineNominalMs,
          durationMs: lineNominalMs,
          startTimeMs: 0,
          endTimeMs: 0,
          isFixedDuration: isFixed,
          data: { line, sectionType: sec.type, isFirstOfSection: lIdx === 0, isLastOfSection: lIdx === secLines.length - 1 },
        });

        sectionLineIndices.push(lines.length - 1);
      });

      sections.push({
        id: sec.id || `section-${secIdx}`,
        type: 'section',
        globalIndex: secIdx,
        nominalDurationMs: secNominalDuration,
        durationMs: secNominalDuration,
        startTimeMs: 0,
        endTimeMs: 0,
        data: { name: sec.name, type: sec.type, lineCount: secLines.length },
      });

      runningNominalTotal += secNominalDuration;
    });
  } else {
    // ── CHORDS-ONLY PROGRESSION TIMING CALCULATION ──
    let chordGlobalIdx = 0;
    let secIdx = 0;

    const allChords: { chord: string; secName: string; secId: string }[] = [];
    (preset.chords || []).forEach((c) => {
      allChords.push({ chord: c, secName: 'Progression', secId: 'default' });
    });
    (preset.sections || []).forEach((s) => {
      (s.chords || []).forEach((c) => {
        allChords.push({ chord: c, secName: s.name, secId: s.id });
      });
    });

    // Group chords into logical sections
    const secMap = new Map<string, { chords: string[]; name: string; id: string }>();
    allChords.forEach((ac) => {
      if (!secMap.has(ac.secId)) {
        secMap.set(ac.secId, { chords: [], name: ac.secName, id: ac.secId });
      }
      secMap.get(ac.secId)!.chords.push(ac.chord);
    });

    secMap.forEach((s) => {
      const chordCount = s.chords.length;
      const secNominalMs = Math.round(chordCount * beatsPerChord * beatDurationMs);

      s.chords.forEach((c) => {
        const chordNominalMs = Math.round(beatsPerChord * beatDurationMs);
        chords.push({
          id: `chord-${chordGlobalIdx}`,
          type: 'chord',
          globalIndex: chordGlobalIdx++,
          sectionId: s.id,
          sectionName: s.name,
          nominalDurationMs: chordNominalMs,
          durationMs: chordNominalMs,
          startTimeMs: 0,
          endTimeMs: 0,
          data: { chord: c },
        });
      });

      sections.push({
        id: s.id,
        type: 'section',
        globalIndex: secIdx++,
        nominalDurationMs: secNominalMs,
        durationMs: secNominalMs,
        startTimeMs: 0,
        endTimeMs: 0,
        data: { name: s.name, chordCount },
      });

      runningNominalTotal += secNominalMs;
    });
  }

  // Ensure non-zero total nominal duration
  const totalNominalDurationMs = Math.max(1000, runningNominalTotal);

  // ── PACING SCALING FACTOR (lambda) ──
  const isDurationPaced = targetDurationMs > 0;
  const scalableNominalMs = totalNominalDurationMs - totalFixedDurationMs;
  const scalableTargetMs = targetDurationMs - totalFixedDurationMs;
  const pacingFactor = (isDurationPaced && scalableNominalMs > 0) ? Math.max(0, scalableTargetMs) / scalableNominalMs : 1.0;
  const effectiveDurationMs = isDurationPaced ? Math.max(totalFixedDurationMs, targetDurationMs) : totalNominalDurationMs;
  const effectiveSpeed = Math.round((referenceSpeed / pacingFactor) * 10) / 10;
  const effectiveBpm = effectiveSpeed;

  // ── MAP MONOTONIC START/END TIMESTAMPS ──
  const mapTimeline = (items: PerformanceTimingItem[], targetTotal: number) => {
    let cursor = 0;
    let lastScalableIndex = -1;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let scaled = it.nominalDurationMs;
      if (!it.isFixedDuration && isDurationPaced) {
         scaled = Math.round(it.nominalDurationMs * pacingFactor);
         lastScalableIndex = i;
      }
      it.durationMs = scaled;
      it.startTimeMs = cursor;
      cursor += scaled;
      it.endTimeMs = cursor;
    }
    // Correct minor rounding delta on last scalable item to guarantee exact total
    if (isDurationPaced && items.length > 0 && cursor !== targetTotal) {
      const diff = targetTotal - cursor;
      if (lastScalableIndex !== -1) {
        const lastIt = items[lastScalableIndex];
        lastIt.durationMs = Math.max(1, lastIt.durationMs + diff);
        
        cursor = lastIt.startTimeMs + lastIt.durationMs;
        lastIt.endTimeMs = cursor;
        for (let i = lastScalableIndex + 1; i < items.length; i++) {
          const it = items[i];
          it.startTimeMs = cursor;
          cursor += it.durationMs;
          it.endTimeMs = cursor;
        }
      }
    }
  };

  mapTimeline(lines, effectiveDurationMs);
  mapTimeline(words, effectiveDurationMs);
  mapTimeline(chords, effectiveDurationMs);

  // Recompute sections from lines/chords to ensure exact alignment with mixed fixed/scalable children
  if (hasLyrics) {
    sections.forEach(sec => {
      const secLines = lines.filter(l => l.sectionId === sec.id);
      if (secLines.length > 0) {
        sec.startTimeMs = secLines[0].startTimeMs;
        sec.endTimeMs = secLines[secLines.length - 1].endTimeMs;
        sec.durationMs = sec.endTimeMs - sec.startTimeMs;
      }
    });
  } else {
    mapTimeline(sections, effectiveDurationMs);
  }

  return {
    totalNominalDurationMs,
    totalTargetDurationMs: targetDurationMs,
    effectiveDurationMs,
    pacingFactor,
    effectiveSpeed,
    referenceSpeed,
    effectiveBpm,
    referenceBpm,
    isDurationPaced,
    sections,
    lines,
    words,
    chords,
  };
}

/**
 * Locate active scheduled item given monotonic elapsed time
 */
export function findActiveScheduleItem(
  items: PerformanceTimingItem[],
  elapsedMs: number
): { activeItem: PerformanceTimingItem | null; index: number; progress: number } {
  if (!items || items.length === 0) {
    return { activeItem: null, index: -1, progress: 0 };
  }

  const clampedMs = Math.max(0, elapsedMs);

  // Before first item
  if (clampedMs <= items[0].startTimeMs) {
    return { activeItem: items[0], index: 0, progress: 0 };
  }

  // After last item
  const last = items[items.length - 1];
  if (clampedMs >= last.endTimeMs) {
    return { activeItem: last, index: items.length - 1, progress: 1 };
  }

  // Binary search for active item
  let low = 0;
  let high = items.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const it = items[mid];
    if (clampedMs >= it.startTimeMs && clampedMs < it.endTimeMs) {
      const dur = Math.max(1, it.durationMs);
      const prog = Math.min(1, Math.max(0, (clampedMs - it.startTimeMs) / dur));
      return { activeItem: it, index: mid, progress: prog };
    }
    if (clampedMs < it.startTimeMs) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return { activeItem: items[0], index: 0, progress: 0 };
}
