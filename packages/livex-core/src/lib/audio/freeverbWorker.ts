/**
 * freeverbWorker.ts — Freeverb IR computation offloaded to a Web Worker
 *
 * Receives: { sampleRate: number }
 * Returns:  { dataL: Float32Array, dataR: Float32Array }  (transferred, zero-copy)
 *
 * Self-contained — no external imports.  All constants are copied from getIR()
 * in drumAudio.ts.  When those constants change, update both files.
 */

self.onmessage = (e: MessageEvent<{ sampleRate: number }>) => {
  const sr = e.data.sampleRate;

  // ── Freeverb constants (Jezar at Dreampoint, public domain) ──────────────────
  const FIXED_GAIN = 0.015;
  const STEREO_SPREAD = 23;
  const ROOM_SIZE = 0.75;
  const DAMPING = 0.32;

  const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617] as const;
  const AP_TUNING = [556, 441, 341, 225] as const;

  const scaleFactor = sr / 44100;
  const combLen = COMB_TUNING.map((n) => Math.round(n * scaleFactor));
  const apLen = AP_TUNING.map((n) => Math.round(n * scaleFactor));

  const feedback = ROOM_SIZE * 0.28 + 0.7;
  const damp1 = DAMPING * 0.4;
  const damp2 = 1 - damp1;

  // ── Filter state ─────────────────────────────────────────────────────────────
  type CombState = { buf: Float32Array; idx: number; lpStore: number };
  type APState = { buf: Float32Array; idx: number };

  const mkComb = (n: number): CombState => ({ buf: new Float32Array(n), idx: 0, lpStore: 0 });
  const mkAP = (n: number): APState => ({ buf: new Float32Array(n), idx: 0 });

  const combsL = combLen.map((n) => mkComb(n));
  const combsR = combLen.map((n) => mkComb(n + STEREO_SPREAD));
  const apsL = apLen.map((n) => mkAP(n));
  const apsR = apLen.map((n) => mkAP(n + STEREO_SPREAD));

  // ── Comb filter ───────────────────────────────────────────────────────────────
  const processComb = (c: CombState, inp: number): number => {
    const out = c.buf[c.idx];
    c.lpStore = out * damp2 + c.lpStore * damp1;
    c.buf[c.idx] = inp + c.lpStore * feedback;
    c.idx = (c.idx + 1) % c.buf.length;
    return out;
  };

  // ── All-pass filter ───────────────────────────────────────────────────────────
  const processAP = (ap: APState, inp: number): number => {
    const bufOut = ap.buf[ap.idx];
    const out = -inp + bufOut;
    ap.buf[ap.idx] = inp + bufOut * 0.5;
    ap.idx = (ap.idx + 1) % ap.buf.length;
    return out;
  };

  // ── Generate the impulse response ─────────────────────────────────────────────
  const irLen = Math.floor(sr * 2.2);
  const dataL = new Float32Array(irLen);
  const dataR = new Float32Array(irLen);

  const predelayLen = Math.floor(sr * 0.014);

  for (let n = 0; n < irLen; n++) {
    const input = n === predelayLen ? FIXED_GAIN : 0;

    let outL = 0,
      outR = 0;
    for (const c of combsL) outL += processComb(c, input);
    for (const c of combsR) outR += processComb(c, input);

    for (const ap of apsL) outL = processAP(ap, outL);
    for (const ap of apsR) outR = processAP(ap, outR);

    dataL[n] = outL;
    dataR[n] = outR;
  }

  // Normalise peak to –6 dBFS
  let peak = 0;
  for (let i = 0; i < irLen; i++) peak = Math.max(peak, Math.abs(dataL[i]), Math.abs(dataR[i]));
  const norm = peak > 0 ? 0.5 / peak : 1;
  for (let i = 0; i < irLen; i++) {
    dataL[i] *= norm;
    dataR[i] *= norm;
  }

  // Transfer buffers zero-copy to the main thread
  (self as unknown as Worker).postMessage(
    { dataL, dataR },
    [dataL.buffer, dataR.buffer]
  );
};
