/**
 * The caretaker's plays (game-design 4.4): the two cheapest non-borrowing cards in the dealt hand,
 * at national scope or in the most populous eligible region, holding 2 pips of contingency.
 * Also used as the caretaker bot and for the "Wales under a caretaker" ghost.
 */
import type { RegionId } from "../model/schema";
import { REGION_IDS } from "../model/schema";
import type { CardPlay, GameState, Plays } from "./api";
import type { Ctx } from "./scores";
import { cardCost } from "./game";

function regionsByPopulation(ctx: Ctx): RegionId[] {
  const pop = (r: RegionId) => ctx.regionLas[r].reduce((a, i) => a + ctx.pop[i]!, 0);
  return [...REGION_IDS].sort((a, b) => pop(b) - pop(a));
}

export function caretakerPlays(ctx: Ctx, state: GameState): Plays {
  const keep = ctx.model.game.caretaker.contingency;
  const order = regionsByPopulation(ctx);
  const playFor = (id: string): CardPlay => {
    const card = ctx.cards.get(id)!;
    const legal = card.regions ?? [...REGION_IDS];
    if (card.scope === "national" || card.scope === "national_or_region") return { card: id };
    if (card.scope === "two_regions") return { card: id, regions: order.slice(0, 2) };
    return { card: id, region: order.find((r) => legal.includes(r))! };
  };
  const candidates = state.hand
    .map((id) => ({ id, play: playFor(id), cost: cardCost(ctx.model, state, playFor(id)) }))
    .sort((a, b) => a.cost - b.cost || state.hand.indexOf(a.id) - state.hand.indexOf(b.id));
  const chosen: CardPlay[] = [];
  let budget = state.budget.available - keep;
  for (const c of candidates) {
    if (chosen.length >= Math.min(2, state.cardLimit || 2)) break;
    if (c.cost <= budget) {
      chosen.push(c.play);
      budget -= c.cost;
    }
  }
  return { cards: chosen, standing: null };
}
