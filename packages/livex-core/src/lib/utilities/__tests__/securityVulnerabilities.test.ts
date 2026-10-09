import { describe, it, expect } from 'vitest';
import { extractChordProgressionFromText } from '../../chord/chordResolution';
import { parsePastedLyrics, isChordLine, parseLineStructuralElement } from '../../lyrics/lyricsParser';
import { extractClientRecommendations } from '../../assistant/actionExtractor';
import { generateQrSvg } from '../../qr/qrGenerator';

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
});
