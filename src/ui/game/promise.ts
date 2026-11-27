// Which cards can help keep a promise. The rule lives in the engine (src/engine/promise.ts), which
// offers a promise only on a goal one of these cards can help; the pledge panel lists the two kinds
// apart, so a card already played is never named as if it were in the hand (cold playtest 6, item 1).
import { promiseHelpersOf, type GameState, type PromiseHelpers } from "../../engine/api";
import type { Card, StrandId } from "../../model/schema";

export type { PromiseHelpers };

/** In the hand and working now, then on its way and landing now: every card that can help. */
export function promiseHelpers(state: Pick<GameState, "hand" | "post" | "term">, cardOf: (id: string) => Card | undefined, goal: StrandId): string[] {
  const h = promiseHelpersOf(state, cardOf, goal);
  return [...h.hand, ...h.landing];
}

export { promiseHelpersOf };
