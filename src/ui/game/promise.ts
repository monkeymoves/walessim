// Which cards can help keep a promise (cold playtest 5: "Warm homes" listed as helping Work and pay).
// A promise is kept when its goal's bar does not fall this turn, so only a card that does something
// this turn can help: one in the hand that works straight away, or one already on its way that lands
// this turn. A slow card's ticket lists every goal it will ever reach, including the jobs from its
// building work, but none of that arrives before the promise is judged.
import type { GameState } from "../../engine/api";
import type { Card, StrandId } from "../../model/schema";

export function promiseHelpers(state: Pick<GameState, "hand" | "post" | "term">, cardOf: (id: string) => Card | undefined, goal: StrandId): string[] {
  const helps = (id: string) => (cardOf(id)?.helps ?? []).includes(goal);
  const now = state.hand.filter((id) => {
    const c = cardOf(id);
    return !!c && (c.arrival?.first ?? c.delay) <= 0 && helps(id);
  });
  const landing = state.post.filter((p) => (p.firstTerm ?? p.arrivesTerm) <= state.term && p.arrivesTerm >= state.term && helps(p.card)).map((p) => p.card);
  return [...new Set([...now, ...landing])];
}
