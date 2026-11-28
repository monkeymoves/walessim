/**
 * Shared pieces for the strategy bots (bots.ts): the engine they play through, how they answer
 * events and visits, and a plain value for a build (what it lifts, where the need is greatest).
 * Bots read only the model, the state and `options`, exactly as a player at the screen does.
 */
import { uniform } from "../../engine/rng";
import { siteCouncils } from "./conditions";
import { visitGrade } from "./places";
import { popWeights, lowestCouncils } from "./score";
import { param } from "./rules";
import type {
  Action, ActionOption, BoardModel, BoardState, CouncilCode, Grade, StartId, TurnReport,
} from "./types";
import { GRADES, RULE_IDS } from "./types";

/** The engine calls a bot needs. The real one is in bots.ts; tests can pass a fake. */
export interface BoardEngine {
  newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState;
  options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[];
  act(model: BoardModel, state: BoardState, action: Action): BoardState;
  endTurn(model: BoardModel, state: BoardState): { state: BoardState; report: TurnReport };
}

/** What a bot sees when it chooses its next action. `tried` holds actions the engine refused this turn. */
export interface BotView {
  model: BoardModel;
  state: BoardState;
  engine: BoardEngine;
  /** A seed for this bot's own draws, from the game number. */
  seed: number;
  tried: Set<string>;
}

export const actionKey = (a: Action): string => JSON.stringify(a);

/** Builds and upgrades that are allowed now and not yet refused this turn. */
export function buildOptions(v: BotView, council?: CouncilCode): ActionOption[] {
  return v.engine.options(v.model, v.state, council).filter((o) =>
    o.allowed && (o.action.kind === "build" || o.action.kind === "upgrade") && !v.tried.has(actionKey(o.action)));
}

/** The councils an option's site touches. */
export function optionCouncils(model: BoardModel, o: ActionOption): CouncilCode[] {
  const a = o.action;
  if (a.kind !== "build" && a.kind !== "upgrade") return [];
  return siteCouncils(model, { site: a.site });
}

/** A seeded draw in [0, 1) for this bot, turn and purpose. */
export const draw = (v: BotView, ...keys: (string | number)[]): number => uniform(v.seed, v.state.turn, ...keys);

/** How much a council needs a measure, 0 to 1 (10 is no need). */
const need = (state: BoardState, code: CouncilCode, m: keyof BoardState["councils"][string]["measures"]): number =>
  Math.max(0, 10 - (state.councils[code]?.measures[m] ?? 10)) / 10;

/**
 * A plain value for an option: the measure points its project lifts at level 1, times the need
 * where they land, weighted by people, with the score's fairness share going to the lowest councils.
 * `fair` false drops the fairness weighting (a bot that does not care who is behind).
 */
export function optionValue(model: BoardModel, state: BoardState, o: ActionOption, fair = true): number {
  const def = model.projects.find((p) => p.id === o.project);
  if (!def) return 0;
  const weights = popWeights(model);
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const share = fair ? param(model, RULE_IDS.score, "fairness_share") : 0;
  const lowest = new Set(lowestCouncils(model, state.councils, param(model, RULE_IDS.score, "lowest_count")));
  const sites = optionCouncils(model, o);
  let value = 0;
  for (const e of def.effects) {
    if (e.kind !== "measure" || e.points <= 0) continue;
    const at = e.where === "everywhere" ? model.game.councils
      : e.where === "flagged" ? model.game.councils.filter((c) => model.councils.find((d) => d.code === c)?.flags.includes(e.flag!))
        : sites;
    for (const c of at) {
      const w = (1 - share) * ((weights[c] ?? 0) / total) * model.game.councils.length + (lowest.has(c) ? share * model.game.councils.length / Math.max(1, lowest.size) : 0);
      value += e.points * (0.5 + need(state, c, e.measure)) * w;
    }
  }
  return value;
}

/** The best response a bot can afford: handled well first when `careful`, else the cheapest. */
export function pickResponse(model: BoardModel, state: BoardState, event: string, careful: boolean): string | null {
  const def = model.events.find((e) => e.id === event);
  if (!def || def.responses.length === 0) return null;
  const affordable = def.responses.filter((r) => r.cost <= state.coins);
  if (affordable.length === 0) return null;
  const sorted = [...affordable].sort((a, b) => (careful ? Number(b.handled_well) - Number(a.handled_well) : 0) || a.cost - b.cost);
  return sorted[0]!.id;
}

/** The picks for a pending visit: the option or tips that grade best (or the first, when not careful). */
export function pickVisit(model: BoardModel, state: BoardState, placeId: string, careful: boolean): string[] {
  const place = model.places.find((p) => p.id === placeId);
  if (!place) return [];
  if (place.template === "T3") {
    const opts = place.options ?? [];
    if (!careful) return opts[0] ? [opts[0].id] : [];
    const rank = (g: Grade) => GRADES.indexOf(g);
    const best = [...opts].sort((a, b) => rank(visitGrade(model, state, place, [b.id])) - rank(visitGrade(model, state, place, [a.id])))[0];
    return best ? [best.id] : [];
  }
  const tips = (place.board?.tips ?? []).map((t) => ({ id: t.id, weight: t.risk * t.buildingsBelow + (t.deprived ? 1 : 0) }));
  const n = place.board?.threads ?? 0;
  return tips.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0, careful ? n : Math.min(1, n)).map((t) => t.id);
}
