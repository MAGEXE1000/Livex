import { advanceLineClock, applyBarsToLines } from '../pacing';

describe('advanceLineClock', () => {
  it('advances a 4-beat line precisely on the 5th beat event (beat index 4)', () => {
    let state = advanceLineClock(0, 4);
    expect(state).toEqual({ nextElapsed: 1, shouldAdvanceLine: false });

    state = advanceLineClock(state.nextElapsed, 4);
    expect(state).toEqual({ nextElapsed: 2, shouldAdvanceLine: false });

    state = advanceLineClock(state.nextElapsed, 4);
    expect(state).toEqual({ nextElapsed: 3, shouldAdvanceLine: false });

    state = advanceLineClock(state.nextElapsed, 4);
    expect(state).toEqual({ nextElapsed: 4, shouldAdvanceLine: false });

    state = advanceLineClock(state.nextElapsed, 4);
    expect(state).toEqual({ nextElapsed: 1, shouldAdvanceLine: true });
  });

  it('advances a 16-beat line correctly on beat 17', () => {
    let current = 0;
    for (let i = 1; i <= 16; i++) {
      const state = advanceLineClock(current, 16);
      expect(state.shouldAdvanceLine).toBe(false);
      expect(state.nextElapsed).toBe(i);
      current = state.nextElapsed;
    }
    
    const finalState = advanceLineClock(current, 16);
    expect(finalState.shouldAdvanceLine).toBe(true);
    expect(finalState.nextElapsed).toBe(1);
  });
});

describe('applyBarsToLines', () => {
  const mockSections: any[] = [
    {
      id: 's1',
      barsPerLine: 4,
      lines: [
        { id: 'L1', type: 'lyric', text: 'One' },
        { id: 'L2', type: 'lyric', text: 'Two', bars: 2 },
        { id: 'L3', type: 'interlude', text: 'Int' }
      ]
    }
  ];

  it('sets multiple lines, clears when equal to section default, skips interludes, maintains immutability, clamps', () => {
    const res1 = applyBarsToLines(mockSections, ['L1', 'L3'], 2, 4);
    expect(res1).not.toBe(mockSections);
    expect(res1[0].lines[0].bars).toBe(2);
    expect(res1[0].lines[2].bars).toBeUndefined(); // skipped interlude

    const res2 = applyBarsToLines(mockSections, ['L2'], 4, 4);
    expect(res2[0].lines[1].bars).toBeUndefined(); // cleared override

    const res3 = applyBarsToLines(mockSections, ['L1'], 100, 4);
    expect(res3[0].lines[0].bars).toBe(32); // clamped

    const res4 = applyBarsToLines(mockSections, ['unknown'], 8, 4);
    expect(res4).toBe(mockSections); // unchanged reference
  });
});
