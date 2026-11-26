/**
 * The deck and the hand (game-design 2.1). Twenty cards shuffled by seed; each term the hand is
 * topped up from the top of the deck. Constraints: at least four strands helped, at least one card
 * costing 1, at least one card that is a listed response to an active trend. A failed constraint is
 * repaired by swapping in the first card further down the deck that fixes it.
 */
import { shuffle } from "./rng";
import type { Ctx } from "./scores";

export function initialDeck(ctx: Ctx, seed: number): string[] {
  return shuffle(
    ctx.model.cards.map((c) => c.id),
    seed ^ 0x5eed,
  );
}

/** The deal constraints a hand fails (empty when fine). */
export function handProblems(ctx: Ctx, hand: string[], active: string[]): string[] {
  const out: string[] = [];
  const strands = new Set(hand.flatMap((id) => ctx.cards.get(id)!.helps ?? []));
  if (strands.size < 4) out.push("strands");
  if (!hand.some((id) => ctx.cards.get(id)!.cost === 1)) out.push("cheap");
  if (active.length && !hand.some((id) => (ctx.cards.get(id)!.responds_to ?? []).some((t) => active.includes(t)))) out.push("response");
  return out;
}

export function deal(ctx: Ctx, deck: string[], held: string | null, size: number, active: string[]): { hand: string[]; deck: string[] } {
  const rest = [...deck];
  const hand: string[] = held ? [held] : [];
  while (hand.length < size && rest.length) hand.push(rest.shift()!);
  for (let pass = 0; pass < 3; pass++) {
    const problems = handProblems(ctx, hand, active);
    if (!problems.length) break;
    for (const p of problems) {
      if (!handProblems(ctx, hand, active).includes(p)) continue;
      let fixed = false;
      for (let k = 0; k < rest.length && !fixed; k++) {
        for (let h = hand.length - 1; h >= (held ? 1 : 0) && !fixed; h--) {
          const trial = [...hand];
          trial[h] = rest[k]!;
          const before = handProblems(ctx, hand, active);
          const after = handProblems(ctx, trial, active);
          if (!after.includes(p) && after.every((x) => before.includes(x))) {
            const out = hand[h]!;
            hand[h] = rest[k]!;
            rest[k] = out;
            fixed = true;
          }
        }
      }
    }
  }
  return { hand, deck: rest };
}
