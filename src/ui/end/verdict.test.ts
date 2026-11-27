// Cold playtest 5, items 1 and 4: the end screen's score line, its one sentence on why, the autopilot
// line and the timeline's hardest turn all come from the same rounded numbers.
import { describe, expect, it } from "vitest";
import { compileFromDisk } from "../../../scripts/model-files";
import { ALL_BOTS, playBot } from "../../engine/bots";
import { headline, type EndResult } from "../../engine/api";
import { autopilotScore, direction, hardestTurn, resultRange, sideScore, verdictScore, whyKind } from "./verdict";

const m = compileFromDisk().model!;
const games = ALL_BOTS.slice(0, 6).flatMap((bot, i) => [31, 32].map((seed) => playBot(m, bot, seed + i * 10, { runs: 8, previewRuns: 2, caretakerGhost: true })));

/** A made-up result with just the fields the verdict reads. */
function fake(lived: number, left: number, startLived = 5.0, startLeft = 4.6): EndResult {
  const which = lived <= left ? "lived" : "left";
  const n = 7;
  const score = (v: number) => ({ value: v, p10: v - 1, p90: v + 1, band: { band: 3, name: { en: "x", cy: "x" } } });
  return {
    lived: score(lived), left: score(left), result: { ...score(Math.min(lived, left)), which },
    livedLevel: startLived + lived / n, leftLevel: startLeft + left / n, start: { lived: startLived, left: startLeft },
    worstTerm: 3, worstFell: true, caretakerGhost: { lived: -1, left: -2, result: -2 },
  } as unknown as EndResult;
}

describe("the end screen's numbers agree", () => {
  it("shows the end score as the start plus the change it judged", () => {
    for (const g of games) {
      const r = g.result!;
      const v = verdictScore(r);
      expect(v.end - v.start).toBe(v.change);
      // the shown end is the engine's level to within rounding
      const level = (v.side === "lived" ? r.livedLevel : r.leftLevel) * 10;
      expect(Math.abs(v.end - level)).toBeLessThanOrEqual(1);
      // the band never contradicts the change: no "worse" band with a rise shown, no "better" with a fall
      const band = r.result.band.band;
      if (band <= 2) expect(v.change).toBeLessThan(0);
      if (band >= 4) expect(v.change).toBeGreaterThan(0);
      if (band === 3) expect(Math.abs(v.change)).toBeLessThanOrEqual(1);
    }
  });

  it("matches the top bar's last Left for 2050 to the end screen's Left for 2050", () => {
    for (const g of games) {
      const h = headline(m, g);
      expect(Math.round(h.left2050)).toBe(Math.round(g.result!.leftLevel * 10));
      expect(Math.abs(sideScore(g.result!, "left").end - h.left2050)).toBeLessThanOrEqual(1);
    }
  });

  it("only says both scores rose when both shown scores rose (46 to 46 is not a rise)", () => {
    // Left for 2050 moved 0.2 points: it shows 46 to 46 and must not be called a rise
    const r = fake(1.5, 0.14);
    expect(sideScore(r, "left").start).toBe(sideScore(r, "left").end);
    expect(direction(r, "left")).toBe("level");
    expect(whyKind(r, 0)).toBe("mixed");
    for (const g of games) {
      const r2 = g.result!;
      const k = whyKind(r2, 0);
      const L = direction(r2, "lived"), F = direction(r2, "left");
      if (k === "up") expect([L, F]).toEqual(["up", "up"]);
      if (k === "both") expect([L, F]).toEqual(["down", "down"]);
      if (k === "left") expect(F === "down" && L !== "down").toBe(true);
      if (k === "lived") expect(L === "down" && F === "up").toBe(true);
    }
  });

  it("gives autopilot on the same scale, so 'ahead by d' is the shown end minus autopilot's", () => {
    for (const g of games) {
      const a = autopilotScore(g.result!);
      if (!a) continue;
      expect(a.d).toBe(verdictScore(g.result!).end - a.at);
    }
  });

  it("says the luck range in the same points as the score line", () => {
    const r = fake(-1.4, -2.1);
    const x = resultRange(r)!;
    expect(x.lo).toBeLessThan(0);
    expect(x.lo).toBeLessThanOrEqual(verdictScore(r).change);
    expect(x.hi).toBeGreaterThanOrEqual(verdictScore(r).change);
  });

  it("names the turn that ended in the lowest year, the same turn the timeline marks", () => {
    // worstTerm indexes years (0 = 2026): the lowest point in 2046 was made by the 2042 to 2046 turn
    expect(hardestTurn(5)).toBe(4);
    expect(hardestTurn(1)).toBe(0);
    for (const g of games) {
      const r = g.result!;
      expect(hardestTurn(r.worstTerm)).toBeLessThan(m.game.years.length);
      expect(m.game.years[hardestTurn(r.worstTerm)]! + 4).toBe(m.game.years[0]! + 4 * r.worstTerm);
    }
  });
});
