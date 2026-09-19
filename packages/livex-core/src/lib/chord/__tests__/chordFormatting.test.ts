import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities, cleanHtmlToPlainText } from '../chordFormatting';

// ─── decodeHtmlEntities ──────────────────────────────────────────────────────

describe('decodeHtmlEntities', () => {
  it('returns empty string for falsy input', () => {
    expect(decodeHtmlEntities('')).toBe('');
    expect(decodeHtmlEntities(null as any)).toBe('');
    expect(decodeHtmlEntities(undefined as any)).toBe('');
  });

  it('decodes &nbsp; to space', () => {
    expect(decodeHtmlEntities('hello&nbsp;world')).toBe('hello world');
  });

  it('decodes &amp; to &', () => {
    expect(decodeHtmlEntities('rock&amp;roll')).toBe('rock&roll');
  });

  it('decodes &quot; to double quote', () => {
    expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
  });

  it('decodes &#039; to single quote', () => {
    expect(decodeHtmlEntities("it&#039;s")).toBe("it's");
  });

  it('decodes &lt; and &gt;', () => {
    expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
  });

  it('decodes numeric character references (decimal)', () => {
    expect(decodeHtmlEntities('&#65;')).toBe('A'); // 65 = 'A'
    expect(decodeHtmlEntities('&#8364;')).toBe('€'); // 8364 = '€'
  });

  it('decodes hex character references', () => {
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
    expect(decodeHtmlEntities('&#x2019;')).toBe('\u2019'); // right single quotation mark
  });

  it('handles multiple entities in one string', () => {
    expect(decodeHtmlEntities('&lt;b&gt;bold&lt;/b&gt;&amp;&#65;')).toBe('<b>bold</b>&A');
  });

  it('passes through strings without entities unchanged', () => {
    expect(decodeHtmlEntities('plain text')).toBe('plain text');
  });
});

// ─── cleanHtmlToPlainText ────────────────────────────────────────────────────

describe('cleanHtmlToPlainText', () => {
  it('returns empty string for falsy input', () => {
    expect(cleanHtmlToPlainText('')).toBe('');
    expect(cleanHtmlToPlainText(null as any)).toBe('');
    expect(cleanHtmlToPlainText(undefined as any)).toBe('');
  });

  it('converts <br> tags to newlines', () => {
    expect(cleanHtmlToPlainText('line1<br>line2')).toBe('line1\nline2');
    expect(cleanHtmlToPlainText('line1<br/>line2')).toBe('line1\nline2');
    expect(cleanHtmlToPlainText('line1<br />line2')).toBe('line1\nline2');
  });

  it('converts </p>, </div>, </tr> to newlines', () => {
    expect(cleanHtmlToPlainText('<p>para1</p><p>para2</p>')).toContain('\n');
    expect(cleanHtmlToPlainText('<div>block</div>')).toContain('\n');
    expect(cleanHtmlToPlainText('<tr>row</tr>')).toContain('\n');
  });

  it('extracts content from <pre> tags', () => {
    const html = '<div>header</div><pre>chord content\nline 2</pre><div>footer</div>';
    const result = cleanHtmlToPlainText(html);
    expect(result).toContain('chord content');
    expect(result).toContain('line 2');
  });

  it('strips all remaining HTML tags', () => {
    expect(cleanHtmlToPlainText('<span class="chord">Am</span>')).toBe('Am');
    expect(cleanHtmlToPlainText('<b>bold</b> <i>italic</i>')).toBe('bold italic');
  });

  it('decodes HTML entities in the result', () => {
    expect(cleanHtmlToPlainText('<span>rock&amp;roll</span>')).toBe('rock&roll');
  });

  it('handles complex nested HTML', () => {
    const html = '<div><span class="c">Em</span>&nbsp;<span class="c">Am</span></div>';
    const result = cleanHtmlToPlainText(html);
    expect(result).toContain('Em');
    expect(result).toContain('Am');
  });
});
