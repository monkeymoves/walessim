import { describe, expect, it } from "vitest";
import { buildSchedule } from "./schedule";
import { makeContext } from "./scores";
import { testModel } from "./test-model";

const ctx = makeContext(testModel());

describe("curveball schedule", () => {
  it("is fixed by the seed", () => {
    expect(buildSchedule(ctx, 123, false)).toEqual(buildSchedule(ctx, 123, false));
  });
  it("reveals a trend in term 1 and never shocks in term 1", () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = buildSchedule(ctx, seed, false);
      expect(s[0]!.newTrend).not.toBeNull();
      expect(s[0]!.shock).toBeNull();
    }
  });
  it("only shocks from a trend already on the table, at most one a term", () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = buildSchedule(ctx, seed, false);
      const seen = new Set<string>();
      s.forEach((t) => {
        if (t.newTrend) seen.add(t.newTrend);
        if (t.shock) expect(seen.has(t.shock)).toBe(true);
      });
    }
  });
  it("gives a typical game four or five trends and two or three shocks (medians over seeds)", () => {
    const trends: number[] = [], shocks: number[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      const s = buildSchedule(ctx, seed, false);
      trends.push(s.filter((t) => t.newTrend).length);
      shocks.push(s.filter((t) => t.shock).length);
    }
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;
    expect(med(trends)).toBeGreaterThanOrEqual(4);
    expect(med(trends)).toBeLessThanOrEqual(5);
    expect(med(shocks)).toBeGreaterThanOrEqual(1);
    expect(med(shocks)).toBeLessThanOrEqual(3);
  });
  it("follows the curated first-game order", () => {
    const s = buildSchedule(ctx, 5, true);
    expect(s[0]!.newTrend).toBe("wet-decade");
    expect(s[1]!.newTrend).toBe("price-of-a-home");
    expect(s[3]!.shock).toBe("downturn");
    expect(s.slice(0, 3).some((t) => t.newTrend === "downturn")).toBe(true);
  });
});
