import { describe, expect, it } from "vitest";
import { bandScore, bandValue, displayPips, makeContext, walesValue, strandScores } from "./scores";
import { testModel } from "./test-model";

describe("reference bands", () => {
  it("scores 0 at the floor and 10 at the goal, clamped", () => {
    const b = { floor: 60, goal: 80 };
    expect(bandScore(b, 60)).toBe(0);
    expect(bandScore(b, 80)).toBe(10);
    expect(bandScore(b, 70)).toBe(5);
    expect(bandScore(b, 90)).toBe(10);
  });
  it("inverts when lower is better (floor above goal)", () => {
    const b = { floor: 12, goal: 5 };
    expect(bandScore(b, 12)).toBe(0);
    expect(bandScore(b, 5)).toBe(10);
    expect(bandValue(b, bandScore(b, 8.5))).toBeCloseTo(8.5);
  });
  it("supports invert: true with floor below goal", () => {
    expect(bandScore({ floor: 0, goal: 10, invert: true }, 2)).toBe(8);
  });
});

describe("pips with hysteresis", () => {
  it("only changes when the score passes the half point by the margin", () => {
    expect(displayPips(4, 4.55, 0.1)).toBe(4);
    expect(displayPips(4, 4.61, 0.1)).toBe(5);
    expect(displayPips(5, 4.45, 0.1)).toBe(5);
    expect(displayPips(5, 4.39, 0.1)).toBe(4);
    expect(displayPips(3, 7.2, 0.1)).toBe(7);
  });
});

describe("the model context", () => {
  const m = testModel();
  const ctx = makeContext(m);
  it("indexes 22 authorities and marks exactly five worst-off", () => {
    expect(ctx.las.length).toBe(22);
    expect(ctx.flagLas.worst5.length).toBe(5);
  });
  it("starts every score between 0 and 10", () => {
    for (const row of ctx.base) for (const v of row) expect(v >= 0 && v <= 10).toBe(true);
  });
  it("weights the Wales value by population, except unweighted components", () => {
    const c = ctx.comp.get("deprivation")!;
    const row = ctx.base[c]!;
    expect(walesValue(ctx, c, ctx.base)).toBeCloseTo(row.reduce((a, b) => a + b, 0) / 22);
  });
  it("2026 strand flow scores land between 3 and 6 (design acceptance check, section 3.2)", () => {
    const s = strandScores(ctx, ctx.base);
    const report = ctx.strands.map((st, i) => `${st.id} ${s.flow[i]!.toFixed(2)}`).join(", ");
    for (const f of s.flow) {
      expect(f, report).toBeGreaterThanOrEqual(3);
      expect(f, report).toBeLessThanOrEqual(6);
    }
  });
});
