// The needs-you outline's motion (v3-wales.md section 2): once a second between full and 40 in
// 100, never to nothing, for 5 seconds, then steady; steady from the start under reduced motion or
// with "Flashing outline" off.
import { describe, expect, it } from "vitest";
import { NEEDS_PULSE, ringMoves, ringStrength } from "./pulse";

const samples = (moves: boolean, toMs = 12_000) => Array.from({ length: toMs / 10 + 1 }, (_, i) => ({ ms: i * 10, v: ringStrength(i * 10, moves) }));

describe("the outline's motion", () => {
  it("pulses between full and 40 in 100, never to nothing", () => {
    const vs = samples(true).map((x) => x.v);
    expect(Math.max(...vs)).toBe(1);
    expect(Math.min(...vs)).toBeCloseTo(NEEDS_PULSE.low, 3);
    expect(Math.min(...vs)).toBeGreaterThan(0);
    expect(NEEDS_PULSE.low).toBe(0.4);
  });

  it("pulses once a second, far under three flashes a second, five times in all", () => {
    const s = samples(true);
    // a pulse is a low point: lower than the samples either side
    const lows = s.filter((x, i) => i > 0 && i < s.length - 1 && x.v < s[i - 1]!.v && x.v <= s[i + 1]!.v);
    expect(lows.map((x) => x.ms)).toEqual([500, 1500, 2500, 3500, 4500]);
    expect(1000 / NEEDS_PULSE.periodMs).toBeLessThan(3);
  });

  it("is steady at full strength from 5 seconds on", () => {
    for (const x of samples(true)) if (x.ms >= 5000) expect(x.v).toBe(1);
    expect(NEEDS_PULSE.periodMs * NEEDS_PULSE.pulses).toBe(5000);
  });

  it("starts at full strength, so it is seen at once", () => {
    expect(ringStrength(0, true)).toBe(1);
  });

  it("is steady from the start under reduced motion or with the setting off", () => {
    expect(ringMoves(true, true)).toBe(false);
    expect(ringMoves(false, false)).toBe(false);
    expect(ringMoves(true, false)).toBe(false);
    expect(ringMoves(false, true)).toBe(true);
    for (const x of samples(false)) expect(x.v).toBe(1);
  });
});
