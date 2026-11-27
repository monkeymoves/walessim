/**
 * Which council areas a card play reaches (plain-wales 5, E5): from the card's scope, the chosen
 * region or regions, and the `where` filters on its main effects, read against
 * `model/authorities.yaml`. Not engine work: the engine decides how much, this only says where.
 */
import type { Authority, Card, CompiledModel, Effect, LaFlag, RegionId, Where } from "./schema";

/** A play as the map needs it: the card and where it was aimed. Same shape as the engine's `CardPlay`. */
export interface ReachPlay {
  card: string;
  region?: RegionId;
  regions?: RegionId[];
}

const matches = (a: Authority, w: Where | undefined): boolean => {
  if (!w) return true;
  if (w.regions?.length && !w.regions.includes(a.region)) return false;
  if (w.las?.length && !w.las.includes(a.code)) return false;
  if (w.flags?.length && !w.flags.some((f) => a.flags.includes(f))) return false;
  if (w.not_flags?.length && w.not_flags.some((f) => a.flags.includes(f))) return false;
  return true;
};

/** The main effects that land somewhere on the map (not budget, Trust or cost changes, not side effects). */
function mainEffects(card: Card): Effect[] {
  return card.effects.filter((e) => !e.side && e.target !== "budget" && e.target !== "trust" && e.target !== "card_cost");
}

/** The regions a play is aimed at, or null for all of Wales (the same reading as the engine's). */
export function playRegions(card: Card, play: ReachPlay): RegionId[] | null {
  if (card.scope === "national") return null;
  if (play.regions?.length) return [...play.regions];
  if (play.region) return [play.region];
  return null;
}

/**
 * The ONS codes of the council areas a play reaches, in `model.authorities` order. An area is
 * reached when it is in the play's scope and at least one main effect's `where` lets it in
 * (an effect with `in_scope: false` reaches past the scope). Unknown cards reach nothing.
 */
export function cardReach(model: CompiledModel, play: ReachPlay): string[] {
  const card = model.cards.find((c) => c.id === play.card);
  if (!card) return [];
  const regions = playRegions(card, play);
  const inScope = (a: Authority) => !regions || regions.includes(a.region);
  const effects = mainEffects(card);
  return model.authorities
    .filter((a) => (effects.length ? effects.some((e) => (e.where?.in_scope === false || inScope(a)) && matches(a, e.where)) : inScope(a)))
    .map((a) => a.code);
}

/**
 * The place types a card is aimed at, when every main effect that names a place type agrees
 * ("Make coal tips safe works in the coal valleys"). Empty when the card works everywhere it goes.
 */
export function reachFlags(card: Card): LaFlag[] {
  const effects = mainEffects(card);
  const flagged = effects.filter((e) => e.where?.flags?.length);
  if (!flagged.length || flagged.length < effects.length) return [];
  const out = new Set<LaFlag>();
  for (const e of flagged) for (const f of e.where!.flags!) out.add(f);
  return [...out];
}
