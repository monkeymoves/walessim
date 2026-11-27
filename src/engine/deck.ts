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

/**
 * Deal a hand. `recent` are the hands of recent terms: a hand that would share four or more cards with
 * one of them swaps cards for others further down the deck (playtest 2: term 6 dealt term 2's hand).
 */
export function deal(ctx: Ctx, deck: string[], held: string | null, size: number, active: string[], recent: string[][] = [], mustHave?: (id: string) => boolean): { hand: string[]; deck: string[] } {
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
  // avoid a recent hand: while some recent hand shares four or more cards, swap one of the shared
  // cards (newest first) for a card further down the deck that is not in that hand, keeping the constraints
  for (let guard = 0; guard < 10; guard++) {
    const clash = recent.find((r) => hand.filter((c) => r.includes(c)).length >= 4);
    if (!clash) break;
    let swapped = false;
    for (let h = hand.length - 1; h >= (held ? 1 : 0) && !swapped; h--) {
      if (!clash.includes(hand[h]!)) continue;
      for (let k = 0; k < rest.length && !swapped; k++) {
        if (clash.includes(rest[k]!)) continue;
        const trial = [...hand];
        trial[h] = rest[k]!;
        if (handProblems(ctx, trial, active).length > handProblems(ctx, hand, active).length) continue;
        if (recent.some((r) => trial.filter((c) => r.includes(c)).length >= 4 && r !== clash && hand.filter((c) => r.includes(c)).length < 4)) continue;
        const out = hand[h]!;
        hand[h] = rest[k]!;
        rest[k] = out;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  // a card the hand must hold (the last term: one that lands in time): swap in the first from the deck
  if (mustHave && !hand.some(mustHave)) {
    const k = rest.findIndex(mustHave);
    if (k >= 0) {
      const h = hand.length - 1 >= (held ? 1 : 0) ? hand.length - 1 : 0;
      const out = hand[h]!;
      hand[h] = rest[k]!;
      rest[k] = out;
    }
  }
  return { hand, deck: rest };
}
