/**
 * Balance acceptance in net strand pips since 2026 (balance decision 14), on a small sample so
 * `npm test` stays quick. `npx tsx scripts/balance.ts` runs 200 seeds and prints every target;
 * docs/design/balance-log.md records where they stand.
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
const byId = (id: string) => strategyBots.find((b) => b.id === id)!;
const WHOLE_GAME = ["growth-only", "green-only", "borrower", "prevention-only"];

describe("bots, judged in net strand pips since 2026", () => {
  it("orders the bots: careless, caretaker, average, thoughtful", () => {
    const c = med(run(carelessBot)), k = med(run(caretakerBot)), a = med(run(averageBot)), t = med(run(thoughtfulBot));
    console.log(`careless ${c.toFixed(1)}, caretaker ${k.toFixed(1)}, average ${a.toFixed(1)}, thoughtful ${t.toFixed(1)}`);
    expect(c).toBeLessThan(k);
    expect(k).toBeLessThan(a);
    expect(a).toBeLessThan(t);
  });
  it("puts careless play below -3 net pips", () => {
    expect(med(run(carelessBot))).toBeLessThan(-3);
  });
  it("puts growth only and borrowing at least 1.5 net pips below thoughtful play", () => {
    const t = med(run(thoughtfulBot));
    for (const id of ["growth-only", "borrower"]) expect(med(run(byId(id))), id).toBeLessThanOrEqual(t - 1.5);
  });
  it("lets no whole-game strategy beat thoughtful play", () => {
    const t = med(run(thoughtfulBot));
    for (const id of WHOLE_GAME) expect(med(run(byId(id))), id).toBeLessThanOrEqual(t);
  });
});
