// The coin line never contradicts the board: no stale "left if you build it", the purse is warned
// before it fills, and a full purse is said (playtest 8, must fix 3 and 16).
import { describe, expect, it } from "vitest";
import { coinNote, wholeCoins, type CoinState } from "./coins";

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
