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
