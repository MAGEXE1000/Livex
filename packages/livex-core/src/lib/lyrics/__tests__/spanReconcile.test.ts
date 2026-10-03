import { describe, expect, it } from 'vitest';
import { reconcileSpansOnTextEdit } from '../spanReconcile';
import type { LyricTextSpan } from '../../../types/lyrics';

const join = (s?: LyricTextSpan[]): string => (s ?? []).map((x) => x.text).join('');
const spans: LyricTextSpan[] = [
  { text: 'hello ' },
  { text: 'big', format: { bold: true } },
  { text: ' world' },
];
const OLD = 'hello big world';

describe('reconcileSpansOnTextEdit', () => {
  it('returns input unchanged when text is identical or spans are absent', () => {
    expect(reconcileSpansOnTextEdit(spans, OLD, OLD)).toBe(spans);
    expect(reconcileSpansOnTextEdit(undefined, OLD, 'x')).toBeUndefined();
  });

  it('insert at line start keeps invariant and downstream formatting', () => {
    const out = reconcileSpansOnTextEdit(spans, OLD, 'x' + OLD);
    expect(join(out)).toBe('x' + OLD);
    expect(out!.find((s) => s.format?.bold)!.text).toBe('big');
  });

  it('typing at the end of a bold span extends bold', () => {
    const out = reconcileSpansOnTextEdit(spans, OLD, 'hello bigg world');
    expect(join(out)).toBe('hello bigg world');
    expect(out!.find((s) => s.format?.bold)!.text).toBe('bigg');
  });

  it('deleting across spans keeps invariant', () => {
    expect(join(reconcileSpansOnTextEdit(spans, OLD, 'held'))).toBe('held');
  });

  it('full replace keeps invariant', () => {
    expect(join(reconcileSpansOnTextEdit(spans, OLD, 'zzz'))).toBe('zzz');
  });

  it('clearing the line yields undefined spans', () => {
    expect(reconcileSpansOnTextEdit(spans, OLD, '')).toBeUndefined();
  });

  it('merges adjacent spans with identical formatting after deletion', () => {
    const out = reconcileSpansOnTextEdit(spans, OLD, 'hello  world');
    expect(join(out)).toBe('hello  world');
    expect(out).toHaveLength(1);
  });
});
