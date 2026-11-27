/**
 * Which cards can help keep a promise (cold playtests 5 and 6). A promise is kept when its goal's bar
 * does not fall this turn, so only a card that does something this turn can help: one in the hand
 * that works straight away, or one already on its way that lands this turn. A slow card's ticket
 * lists every goal it will ever reach, but none of that arrives before the promise is judged. The
 * engine offers a promise only on a goal one of these can help (cold playtest 6, item 1).
 */
import type { Card, StrandId } from "../model/schema";
import type { GameState } from "./api";

export interface PromiseHelpers {
  /** In the hand and working straight away. */
  hand: string[];
  /** Played earlier and starting to work this turn (not in the hand). */
  landing: string[];
}

export function promiseHelpersOf(state: Pick<GameState, "hand" | "post" | "term">, cardOf: (id: string) => Card | undefined, goal: StrandId): PromiseHelpers {
  const helps = (id: string) => (cardOf(id)?.helps ?? []).includes(goal);
  const hand = state.hand.filter((id) => {
    const c = cardOf(id);
    return !!c && (c.arrival?.first ?? c.delay) <= 0 && helps(id);
  });
  const landing = state.post
    .filter((p) => (p.firstTerm ?? p.arrivesTerm) <= state.term && p.arrivesTerm >= state.term && helps(p.card))
    .map((p) => p.card)
    .filter((id) => !hand.includes(id));
  return { hand: [...new Set(hand)], landing: [...new Set(landing)] };
}

/** Some card can help this goal this turn. */
export function promiseHelpable(state: Pick<GameState, "hand" | "post" | "term">, cardOf: (id: string) => Card | undefined, goal: StrandId): boolean {
  const h = promiseHelpersOf(state, cardOf, goal);
  return h.hand.length + h.landing.length > 0;
}
