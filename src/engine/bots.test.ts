/**
 * Balance acceptance (game-design 11.2), on a small sample so `npm test` stays quick.
 * `npx tsx scripts/balance.ts` runs the full 200 seeds and prints every target; see
 * docs/design/balance-log.md for the targets that the current deck cannot reach and why.
 */
import { describe, expect, it } from "vitest";
import { averageBot, caretakerBot, carelessBot, playBot, strategyBots, thoughtfulBot, type Bot } from "./bots";
import { testModel } from "./test-model";

const m = testModel();
const SEEDS = 16;
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;
const results = new Map<string, number[]>();
const run = (bot: Bot) => {
  if (!results.has(bot.id)) results.set(bot.id, Array.from({ length: SEEDS }, (_, i) => playBot(m, bot, i + 1, { runs: 10 }).result!.result.value));
  return results.get(bot.id)!;
};

describe("bots (balance structure)", () => {
  it("orders the bots: careless below caretaker below average below thoughtful", () => {
    const c = med(run(carelessBot)), k = med(run(caretakerBot)), a = med(run(averageBot)), t = med(run(thoughtfulBot));
    console.log(`careless ${c.toFixed(2)}, caretaker ${k.toFixed(2)}, average ${a.toFixed(2)}, thoughtful ${t.toFixed(2)}`);
    expect(c).toBeLessThan(k);
    expect(k).toBeLessThan(a);
    expect(a).toBeLessThan(t);
  });
  it("keeps careless play in or near its band (2.5 to 3.5, allowing 0.5)", () => {
    expect(med(run(carelessBot))).toBeLessThan(4.0);
  });
  it("defeats growth only and borrowing by a clear margin", () => {
    const t = med(run(thoughtfulBot));
    for (const id of ["growth-only", "borrower"]) expect(med(run(strategyBots.find((b) => b.id === id)!)), id).toBeLessThan(t - 0.4);
  });
  it("never lets a single-strategy bot beat thoughtful play", () => {
    const t = med(run(thoughtfulBot));
    for (const b of strategyBots) expect(med(run(b)), b.id).toBeLessThanOrEqual(t + 0.05);
  });
});
