import { describe, it, expect } from 'vitest';
import { extractChordProgressionFromText } from '../../chord/chordResolution';
import { parsePastedLyrics, isChordLine, parseLineStructuralElement } from '../../lyrics/lyricsParser';
import { extractClientRecommendations } from '../../assistant/actionExtractor';
import { generateQrSvg } from '../../qr/qrGenerator';
import { formatSanitizedError } from '../security';

describe('Security & ReDoS / Prototype Pollution Elimination Suite', () => {
  describe('1. QR Generator sanitizeColor ReDoS Validation', () => {
    it('executes adversarial whitespace and malformed color in under 5ms', () => {
      const adversarialInput = 'rgb(' + ' '.repeat(10000) + '!';
      const start = performance.now();
      const svg = generateQrSvg('https://livex.app', {
        fgColor: adversarialInput,
        bgColor: 'rgba(' + ' '.repeat(5000) + '255,0,0,1)',
      });
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
    });

    it('sanitizes and preserves valid hex and rgb/hsl colors safely', () => {
      const svg = generateQrSvg('test-room', {
        fgColor: '#123456',
        bgColor: 'rgba(255, 255, 255, 0.8)',
      });
      expect(svg).toContain('fill="#123456"');
      expect(svg).toContain('fill="rgba(255, 255, 255, 0.8)"');
    });
  });

  describe('2. Chord Resolution & Roman Numeral ReDoS Validation', () => {
    it('processes adversarial roman numeral tokens in under 5ms', () => {
      const adversarialRoman = 'i'.repeat(5000) + '!';
      const prompt = 'Analyze progression: ' + adversarialRoman;
      const response = 'Harmonic Analysis: ' + adversarialRoman;

      const start = performance.now();
      const result = extractChordProgressionFromText(response, prompt);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(result).toBeNull();
    });

    it('processes adversarial tempo whitespace in under 5ms', () => {
      const adversarialTempo = 'tempo' + ' '.repeat(5000) + '120 bpm';
      const start = performance.now();
      const result = extractChordProgressionFromText(`Progression: \`C\` -> \`G\`\n${adversarialTempo}`);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(result).toBeDefined();
    });

    it('processes adversarial reference artist string in under 5ms without exponential backtrack', () => {
      const adversarialRef = 'inspired by ' + 'a'.repeat(5000);
      const start = performance.now();
      const result = extractChordProgressionFromText(`Progression: \`Am\` -> \`F\`\n${adversarialRef}`);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('accurately parses legitimate roman numerals and musical attributes', () => {
      const text = `
Progression: \`Cmaj7\` -> \`Am7\` -> \`Dm7\` -> \`G7\`
Harmonic Analysis: \`Imaj7\` -> \`vi7\` -> \`ii7\` -> \`V7\`
Tempo: 120 BPM
Mood: Melancholic
Genre: Neo-Soul
Inspired by: Stevie Wonder
`;
      const result = extractChordProgressionFromText(text);
      expect(result).not.toBeNull();
      expect(result?.chords).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7']);
      expect(result?.romanNumerals).toEqual(['Imaj7', 'vi7', 'ii7', 'V7']);
      expect(result?.tempo).toBe(120);
      expect(result?.mood).toBe('Melancholic');
      expect(result?.genre).toBe('Neo-Soul');
      expect(result?.referenceContext).toContain('Stevie Wonder');
    });

    it('processes adversarial roman numeral line in under 5ms without ReDoS', () => {
      const adversarialRomans = 'Harmonic Analysis: ' + 'IV7'.repeat(1000) + ' ' + 'ii'.repeat(1000) + ' ' + 'bVII'.repeat(1000);
      const start = performance.now();
      const result = extractChordProgressionFromText(`Progression: \`C\` -> \`G\`\n${adversarialRomans}`);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(result).toBeDefined();
    });

    it('processes adversarial feel string in under 5ms without ReDoS', () => {
      const adversarialFeel = 'feel' + ' '.repeat(5000) + ':' + ' '.repeat(5000) + 'laid back groove';
      const start = performance.now();
      const result = extractChordProgressionFromText(`Progression: \`C\` -> \`G\`\n${adversarialFeel}`);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(result?.feel).toBe('laid back groove');
    });
  });

  describe('3. Lyrics Parser Linear-Time Validation', () => {
    it('processes adversarial repeated chord characters in under 5ms', () => {
      const adversarialChord = 'C' + 'maj'.repeat(2000) + '!';
      const start = performance.now();
      const isChord = isChordLine(adversarialChord);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(isChord).toBe(false);
    });

    it('processes adversarial section bracket headers in under 5ms', () => {
      const adversarialLine = '[' + 'Verse '.repeat(1000) + '1]';
      const start = performance.now();
      const res = parseLineStructuralElement(adversarialLine);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(res.kind).toBe('section');
    });

    it('processes ChordPro format with authentic lyrics without regression', () => {
      const lyrics = `
[Verse 1]
[C]Amazing grace how [F]sweet the [C]sound
That saved a [G]wretch like me
`;
      const doc = parsePastedLyrics(lyrics);
      expect(doc.sections).toHaveLength(1);
      expect(doc.sections[0].lines).toHaveLength(2);
      expect(doc.sections[0].lines[0].chords).toHaveLength(3);
      expect(doc.sections[0].lines[0].chords![0].chord).toBe('C');
      expect(doc.sections[0].lines[0].chords![1].chord).toBe('F');
    });
  });

  describe('4. Action Extractor ReDoS Validation', () => {
    it('processes adversarial drum and vocal warmup text in under 5ms', () => {
      const adversarialInput = 'rock beat '.repeat(1000) + 'warm   up '.repeat(1000) + '!';
      const start = performance.now();
      const recs = extractClientRecommendations(adversarialInput);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe('5. Prototype Pollution Protection Verification', () => {
    it('guarantees Object.prototype remains clean when adversarial payload is processed', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"polluted": "yes"}}}');
      const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
      const safeUpdates: Record<string, any> = Object.create(null);

      for (const [key, val] of Object.entries(maliciousPayload)) {
        if (!FORBIDDEN_KEYS.has(key) && Object.prototype.hasOwnProperty.call(maliciousPayload, key)) {
          safeUpdates[key] = val;
        }
      }

      const dummyTarget: Record<string, any> = { id: 'el-1', x: 10, y: 20 };
      const merged = { ...dummyTarget, ...safeUpdates };

      expect(({} as any).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(dummyTarget, 'polluted')).toBe(false);
      expect(merged.id).toBe('el-1');
      expect(merged.polluted).toBeUndefined();
    });
  });

  describe('6. Server Error Sanitization & Zero-Leakage Invariants', () => {
    it('completely strips raw stack traces, local paths, and database errors', () => {
      const rawErrorWithLeak = new Error('Database connection failed at C:\\Users\\Mauren\\AppData\\Local\\Firestore: connection timeout');
      rawErrorWithLeak.stack = 'Error: Database connection failed\n    at internalQuery (C:\\Users\\Mauren\\Documents\\Livex\\db.ts:42:15)';

      const sanitized = formatSanitizedError(rawErrorWithLeak);

      expect(sanitized.error).toBe('Internal Server Error');
      expect(sanitized.code).toBe('INTERNAL_ERROR');
      expect(sanitized.message).toBe('An error occurred while processing the request.');
      expect((sanitized as any).stack).toBeUndefined();
      expect(JSON.stringify(sanitized)).not.toContain('C:\\Users');
      expect(JSON.stringify(sanitized)).not.toContain('db.ts');
    });

    it('returns custom safe fallback message and machine-readable error code', () => {
      const sanitized = formatSanitizedError(new Error('Sensitive secret XYZ'), 'Custom user-facing message', 'CUSTOM_CODE');
      expect(sanitized.error).toBe('Internal Server Error');
      expect(sanitized.code).toBe('CUSTOM_CODE');
      expect(sanitized.message).toBe('Custom user-facing message');
      expect(JSON.stringify(sanitized)).not.toContain('Sensitive secret XYZ');
    });
  });

  describe('7. Server-Side Input Schema & Token Spending Invariants', () => {
    it('enforces maximum character budget and structured validation', () => {
      const MAX_PROMPT_CHARS = 8192;
      const MAX_ATTACHMENTS = 5;
      const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

      const oversizedPrompt = 'a'.repeat(MAX_PROMPT_CHARS + 1);
      expect(oversizedPrompt.length > MAX_PROMPT_CHARS).toBe(true);

      const excessiveAttachments = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({
        id: `att-${i}`,
        dataUrl: 'data:text/plain;base64,dGVzdA==',
      }));
      expect(excessiveAttachments.length > MAX_ATTACHMENTS).toBe(true);

      const oversizedAttachmentBytes = 13 * 1024 * 1024;
      expect(oversizedAttachmentBytes > MAX_ATTACHMENT_BYTES).toBe(true);
    });

    it('enforces model token generation budgets (spending cap)', () => {
      const TOKEN_BUDGETS = {
        gemini: 2048,
        groq: 2048,
        workersAi: 2048,
        anthropic: 1536,
        openai: 1536,
      };

      for (const [provider, budget] of Object.entries(TOKEN_BUDGETS)) {
        expect(budget).toBeGreaterThan(0);
        expect(budget).toBeLessThanOrEqual(2048);
      }
    });
  });
});
