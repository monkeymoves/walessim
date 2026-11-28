/**
 * Test helpers: a model with rule cards switched on or changed, so the phase 2 cards (R1 to R4,
 * P6, E2, the P1 and P3 changes) can be tried on the three council fixture, which does not carry
 * them. `withCards` takes the real cards read from model/board/rules/*.yaml by the test; `withCard`
 * makes one from params. Pure, so the engine's import rules hold. Not used by the game.
 */
import type { BoardModel, BoardRule, RuleId } from "./types";

const unit = { en: "game rule", cy: "rheol gêm", cy_review: true };

/** The model with card `id` holding these params (added when missing, merged when present). */
export function withCard(model: BoardModel, id: RuleId, params: Record<string, number>): BoardModel {
  const made = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, { default: v, min: Math.min(0, v), max: Math.max(10, v), unit, adjustable: false }]));
  const found = model.rules.find((r) => r.id === id);
  const card: BoardRule = found
    ? { ...found, params: { ...found.params, ...made } }
    : { id, theme: "people", name: unit, note: unit, kind: "threshold", params: made, sources: [], confidence: "low", evidence: "placeholder", game_rule: true };
  return { ...model, rules: [...model.rules.filter((r) => r.id !== id), card] };
}

/** The model (changed in place) with these cards added, or put in place of its own. Throws if a card is missing. */
export function withCards(model: BoardModel, cards: readonly BoardRule[], ids: readonly RuleId[]): BoardModel {
  for (const id of ids) {
    const card = cards.find((r) => r.id === id);
    if (!card) throw new Error(`No card ${id} on disk`);
    model.rules = [...model.rules.filter((r) => r.id !== id), structuredClone(card)];
  }
  return model;
}

/** Set one param of a card in a model (for tests that need an edge case). */
export function setParam(model: BoardModel, id: RuleId, name: string, value: number): void {
  const p = model.rules.find((r) => r.id === id)?.params[name];
  if (!p) throw new Error(`No param ${id}.${name}`);
  p.default = value;
}

/** The P6 card with its starting values (model/board/rules/people.yaml). */
export const P6_START = { choices: 2, deal_years: 4, deal_discount: 1, kept_here: 1.5, kept_near: 0.5, broken_here: 1.5, broken_years: 4 };
/** The E2 card with its starting values. */
export const E2_START = { severity_at_least: 2, years: 2, time_share: 0.5 };

/**
 * The starting sizes of 16.3 and 16.4 for params the balance rounds have since tuned
 * (docs/design/board-balance-log.md). Tests of a rule's working pin these, so they describe the
 * rule, not the current tuning, and keep passing when the numbers on disk move.
 */
export const DESIGN_START: Record<string, Record<string, number>> = {
  R1: { grow_alone_per_year: 0.03, grow_joined_per_year: 0.08, max_factor: 5 },
  R2: { rise_at: 0.3, slip_at: -0.3, coins_per_year: 0.5 },
  R3: { discount: 1, joined_years: 8 },
  R4: { base: 1.3, per_point: 0.08, min_factor: 0.5, max_factor: 1.1 },
  B1: { base_per_year: 3, purse_max: 12 },
};

/** The model (changed in place) with the starting sizes of `DESIGN_START` on the cards it carries. */
export function pinStart(model: BoardModel): BoardModel {
  for (const [id, params] of Object.entries(DESIGN_START)) {
    const card = model.rules.find((r) => r.id === id);
    if (!card) continue;
    for (const [name, value] of Object.entries(params)) if (card.params[name]) card.params[name]!.default = value;
  }
  return model;
}
