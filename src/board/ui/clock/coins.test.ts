// The coin line never contradicts the board: no stale "left if you build it", the purse is warned
// before it fills, and a full purse is said (playtest 8, must fix 3 and 16).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptBoardModel } from "../../model";
import { act, newBoard, options, RULE_IDS, stepOfYear, tick, why, yearOfStep } from "../../engine/api";
import { coinNote, incomeChange, incomeParts, wholeCoins, type CoinState, type IncomePart } from "./coins";

const base: CoinState = { coins: 6, purse: 16, perYear: 3.8, buildOpen: false, preview: null };

describe("the coin line", () => {
  it("says what is left after a build only while the menu is open on a project that can be built", () => {
    const preview = { allowed: true, coinsAfter: 2 };
    expect(coinNote({ ...base, buildOpen: true, preview })).toEqual({ kind: "after", n: 2 });
    // the menu was closed, or the project pointed at is built already: no stale "0 left"
    expect(coinNote({ ...base, buildOpen: false, preview: { allowed: true, coinsAfter: 0 } }).kind).toBe("income");
    expect(coinNote({ ...base, buildOpen: true, preview: { allowed: false, coinsAfter: 0 } }).kind).toBe("income");
  });

  it("warns before the purse fills: when a year's income would fill it", () => {
    expect(coinNote({ ...base, coins: 12 }).kind).toBe("income");
    expect(coinNote({ ...base, coins: 12.2 })).toEqual({ kind: "soon", purse: 16 });
    expect(coinNote({ ...base, coins: 15.9 }).kind).toBe("soon");
    expect(coinNote({ ...base, coins: 16 })).toEqual({ kind: "full", purse: 16 });
  });

  it("never warns of a full purse while coins are below it, and never calls a full purse merely close", () => {
    for (let coins = 0; coins <= 16; coins += 0.25) {
      for (const perYear of [null, -1, 0, 1, 3.8, 8]) {
        const n = coinNote({ ...base, coins, perYear });
        if (n.kind === "full") expect(coins).toBeGreaterThanOrEqual(16 - 1e-6);
        if (n.kind === "soon") {
          expect(coins).toBeLessThan(16);
          expect(coins + (perYear ?? 0)).toBeGreaterThanOrEqual(16 - 1e-6);
        }
      }
    }
  });

  it("has no purse words when the model has no purse", () => {
    expect(coinNote({ ...base, purse: 0, coins: 40 }).kind).toBe("income");
  });

  it("counts whole coins the way the counter does", () => {
    expect(wholeCoins(5.99999999)).toBe(6);
    expect(wholeCoins(1.8132)).toBe(1);
  });
});

const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");

// the real model: it has a purse (B1 purse_max), so no phase 1 carry over is folded into the budget
describe.skipIf(!existsSync(realPath))("the income line gives its reason (cold playtest 9, should fix 8)", () => {
  const model = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  const rules = { coins: RULE_IDS.coins, careBill: RULE_IDS.careBill, momentum: RULE_IDS.momentum, weak: "B3" };

  it("names the part that moved most, by a quarter coin or more", () => {
    const before: IncomePart[] = [{ kind: "budget", perYear: 4 }];
    const now: IncomePart[] = [{ kind: "budget", perYear: 4 }, { kind: "running", project: "p", perYear: -2.9 }];
    expect(incomeChange(now, before)).toEqual({ part: now[1], change: -2.9 });
    expect(incomeChange(before, before)).toBeNull();
    expect(incomeChange([{ kind: "budget", perYear: 4.1 }], before)).toBeNull();
    // a part that has gone is named too
    expect(incomeChange(before, now)?.part.kind).toBe("running");
  });

  it("over whole games, a closed year's parts add up to that year's income, whenever the purse did not cut it", () => {
    let checked = 0;
    for (const game of [1, 2]) {
      let s = newBoard(model, game, model.starts[game % model.starts.length]!.id);
      const coins: Record<number, { net: number; lost: number }> = {};
      for (let guard = 0; guard < model.game.steps * 3 && s.phase !== "ended"; guard++) {
        for (const kind of ["respond", "visit", "deal"] as const) {
          const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
          if (o) s = act(model, s, o.action);
        }
        const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
        if (b && guard % 2 === 0) s = act(model, s, b.action);
        if (s.phase !== "play") continue;
        const r = tick(model, s);
        s = r.state;
        const c = r.report.coins;
        coins[r.report.step] = { net: c.income - c.running - c.charges, lost: c.lost ?? 0 };
      }
      // every closed year but the first (which holds the opening coins)
      for (let y = model.game.first_year + 1; y < yearOfStep(model, s.step); y++) {
        const steps = Array.from({ length: stepOfYear(model, y + 1) - stepOfYear(model, y) }, (_, i) => stepOfYear(model, y) + i);
        if (steps.some((k) => !coins[k] || coins[k]!.lost > 0)) continue;
        const parts = incomeParts(why(model, s, { measure: "coins", fromStep: steps[0]!, toStep: steps[steps.length - 1]! }), 1, rules);
        expect(parts.reduce((a, p) => a + p.perYear, 0)).toBeCloseTo(steps.reduce((a, k) => a + coins[k]!.net, 0), 3);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  }, 60_000);
});
