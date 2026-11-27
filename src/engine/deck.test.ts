import { describe, expect, it } from "vitest";
import { deal, handProblems, initialDeck } from "./deck";
import { makeContext } from "./scores";
import { testModel } from "./test-model";

const ctx = makeContext(testModel());

describe("dealing a hand", () => {
  it("shuffles all twenty cards by seed", () => {
    const d = initialDeck(ctx, 3);
    expect(d.length).toBe(20);
    expect(initialDeck(ctx, 3)).toEqual(d);
    expect(initialDeck(ctx, 4)).not.toEqual(d);
  });
  it("meets the deal constraints for many seeds and trends", () => {
    const trends = ctx.model.curveballs.map((c) => c.id);
    for (let seed = 1; seed <= 300; seed++) {
      const active = [trends[seed % trends.length]!];
      const { hand, deck } = deal(ctx, initialDeck(ctx, seed), null, 5, active);
      expect(hand.length).toBe(5);
      expect(new Set([...hand, ...deck]).size).toBe(20);
      expect(handProblems(ctx, hand, active)).toEqual([]);
    }
  });
  it("keeps a held-over card in the hand", () => {
    const deck = initialDeck(ctx, 8);
    const held = deck[10]!;
    const { hand } = deal(ctx, deck.filter((c) => c !== held), held, 5, ["wet-decade"]);
    expect(hand).toContain(held);
  });
  it("deals four in the first term", () => {
    expect(deal(ctx, initialDeck(ctx, 2), null, 4, ["wet-decade"]).hand.length).toBe(4);
  });
});

describe("dealing after playtest 2", () => {
  it("never re-deals four or more cards of a hand from the last four terms", async () => {
    const E = await import("./api");
    const { playBot, thoughtfulBot, carelessBot } = await import("./bots");
    for (const bot of [thoughtfulBot, carelessBot])
      for (let seed = 1; seed <= 8; seed++) {
        const g = playBot(testModel(), bot, seed, { runs: 4 });
        const hands = (g.sim as { hands?: string[][] }).hands ?? [];
        expect(hands.length).toBe(6);
        for (let t = 1; t < hands.length; t++)
          for (let k = Math.max(0, t - 4); k < t; k++) {
            const overlap = hands[t]!.filter((c) => hands[k]!.includes(c)).length;
            expect(overlap, `${bot.id} seed ${seed}: term ${t + 1} repeats ${overlap} of term ${k + 1}`).toBeLessThan(4);
          }
        void E;
      }
  });
  it("still meets the deal constraints when avoiding recent hands", () => {
    const deck = initialDeck(ctx, 4);
    const first = deal(ctx, deck, null, 5, ["wet-decade"]);
    const again = deal(ctx, [...first.hand, ...first.deck], null, 5, ["wet-decade"], [first.hand]);
    expect(again.hand.filter((c) => first.hand.includes(c)).length).toBeLessThan(4);
    expect(handProblems(ctx, again.hand, ["wet-decade"])).toEqual([]);
  });
});
