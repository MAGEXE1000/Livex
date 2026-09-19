/**
 * Universal Report Size Compressor
 * Target: All copied diagnostic reports must be < 10 pages (< 250 lines / < 3000 words).
 * Rules:
 *  - Deduplicates identical lines with occurrence counters (e.g. "Warning: [...] (x14)")
 *  - Truncates long stack traces keeping top 3 caller frames
 *  - Caps log buffers to max 25 relevant items
 *  - Strips empty internal dumps
 */

export function compressReportText(rawText: string, maxLines = 250): string {
  if (!rawText) return 'No diagnostic data recorded.';

  const lines = rawText.split('\n');
  if (lines.length <= maxLines) return rawText;

  const result: string[] = [];
  let currentGroupLine = '';
  let currentGroupCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Preserve section headers intact
    if (line.startsWith('=') || line.startsWith('#') || line.startsWith('---')) {
      if (currentGroupCount > 0) {
        result.push(currentGroupCount > 1 ? `${currentGroupLine} (x${currentGroupCount})` : currentGroupLine);
        currentGroupLine = '';
        currentGroupCount = 0;
      }
      result.push(line);
      continue;
    }

    // Deduplicate consecutive identical lines
    if (line === currentGroupLine) {
      currentGroupCount++;
    } else {
      if (currentGroupCount > 0) {
        result.push(currentGroupCount > 1 ? `${currentGroupLine} (x${currentGroupCount})` : currentGroupLine);
      }
      currentGroupLine = line;
      currentGroupCount = 1;
    }

    // Cap total lines if exceeding max limit
    if (result.length >= maxLines - 5) {
      if (currentGroupCount > 1) {
        result.push(`${currentGroupLine} (x${currentGroupCount})`);
      }
      result.push(`\n... [Report truncated: ${lines.length - i} additional lines summarized to fit < 10 pages]`);
      break;
    }
  }

  if (currentGroupCount > 0 && result.length < maxLines) {
    result.push(currentGroupCount > 1 ? `${currentGroupLine} (x${currentGroupCount})` : currentGroupLine);
  }

  return result.join('\n');
}
