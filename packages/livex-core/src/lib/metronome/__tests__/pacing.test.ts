import { advanceLineClock } from '../pacing';

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
