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
import { dealKeptBy } from "./deals";
import { advance as realAdvance, type AdvanceOptions } from "./clock";
import { runStep } from "./clock-step";
import type {
  Action, ActionOption, BoardModel, BoardState, CouncilCode, Grade, MeasureId, StartId, Stop, StepReport,
} from "./types";
import { GRADES, RULE_IDS } from "./types";

/** The engine calls a bot needs. The real one is in bots.ts; tests can pass a fake. */
export interface BoardEngine {
  newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState;
  options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[];
  act(model: BoardModel, state: BoardState, action: Action): BoardState;
  advance(model: BoardModel, state: BoardState, opts: AdvanceOptions): { state: BoardState; reports: StepReport[]; stopped: Stop | null };
}

/** What a bot sees when it chooses its next action. `tried` holds actions the engine refused at this decision. */
export interface BotView {
  model: BoardModel;
  state: BoardState;
  engine: BoardEngine;
  /** A seed for this bot's own draws, from the game number. */
  seed: number;
  tried: Set<string>;
  /** The branches a Skilled style bot holds to, once chosen (bots-strategies.ts `focusBranches`). */
  focus?: string[];
}

export const actionKey = (a: Action): string => JSON.stringify(a);

/** `options` for the bot's state, asked once per state and council (a state is never changed in place). */
const optionCache = new WeakMap<BoardState, Map<string, ActionOption[]>>();
export function optionsOf(v: BotView, council?: CouncilCode): ActionOption[] {
  let byCouncil = optionCache.get(v.state);
  if (!byCouncil) optionCache.set(v.state, (byCouncil = new Map()));
  let got = byCouncil.get(council ?? "");
  if (!got) byCouncil.set(council ?? "", (got = v.engine.options(v.model, v.state, council)));
  return got;
}

/** A value for each option, worked out once, to sort by. */
export function valuesOf(model: BoardModel, state: BoardState, opts: ActionOption[], fair = true): Map<ActionOption, number> {
  return new Map(opts.map((o) => [o, optionValue(model, state, o, fair)]));
}

/** Builds and upgrades that are allowed now and not yet refused at this decision. */
export function buildOptions(v: BotView, council?: CouncilCode): ActionOption[] {
  return optionsOf(v, council).filter((o) =>
    o.allowed && (o.action.kind === "build" || o.action.kind === "upgrade") && !v.tried.has(actionKey(o.action)));
}

/** The councils an option's site touches. */
export function optionCouncils(model: BoardModel, o: ActionOption): CouncilCode[] {
  const a = o.action;
  if (a.kind !== "build" && a.kind !== "upgrade") return [];
  return siteCouncils(model, { site: a.site });
}

/** A seeded draw in [0, 1) for this bot, step and purpose. */
export const draw = (v: BotView, ...keys: (string | number)[]): number => uniform(v.seed, v.state.step, ...keys);

/** The cheapest response to every waiting event, so the clock can run on (used when looking ahead). */
export function answerAll(engine: BoardEngine, model: BoardModel, state: BoardState): BoardState {
  let s = state;
  for (const p of s.pending) {
    if (p.kind !== "respond") continue;
    const response = pickResponse(model, s, p.event, false);
    if (response) s = engine.act(model, s, { kind: "respond", event: p.event, response });
  }
  return s;
}

/** Run the clock on `steps` steps (or to the end), answering events cheaply on the way. For looking ahead. */
export function runAhead(engine: BoardEngine, model: BoardModel, state: BoardState, steps: number, owned = false): BoardState {
  // The real engine's `advance` clones the state first. A state the caller owns (fresh from `act`)
  // can step in place instead, the same steps in the same order, which halves a look ahead's cost.
  if (owned && engine.advance === realAdvance) return runAheadInPlace(engine, model, state, steps);
  let s = state;
  let left = steps;
  while (left > 0 && s.phase !== "ended") {
    s = answerAll(engine, model, s);
    if (s.phase !== "play") break;
    const out = engine.advance(model, s, { maxSteps: left, light: true });
    left -= out.reports.length;
    s = out.state;
  }
  return s;
}

/** `runAhead` on a state nobody else holds: light steps in place, answering events as they land. */
function runAheadInPlace(engine: BoardEngine, model: BoardModel, state: BoardState, steps: number): BoardState {
  let s = state;
  for (let left = steps; left > 0 && s.phase !== "ended"; left--) {
    if (s.phase !== "play") s = answerAll(engine, model, s);
    if (s.phase !== "play") break;
    runStep(model, s, true);
  }
  return s;
}

/** How much a council needs a measure, 0 to 1 (10 is no need). */
const need = (state: BoardState, code: CouncilCode, m: keyof BoardState["councils"][string]["measures"]): number =>
  Math.max(0, 10 - (state.councils[code]?.measures[m] ?? 10)) / 10;

/**
 * A plain value for an option: the measure points its project lifts at level 1 (no more than the
 * room the measure has left below 10), times the need where they land, weighted by people, with the score's fairness share going to the lowest councils.
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
      // A measure cannot rise past 10, so a lift is worth only the room it has left there.
      const room = Math.max(0, 10 - (state.councils[c]?.measures[e.measure] ?? 10));
      value += Math.min(e.points, room) * (0.5 + need(state, c, e.measure)) * w;
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

/** Does a project lift this measure? */
const lifts = (model: BoardModel, project: string | undefined, measure: string): boolean =>
  !!model.projects.find((p) => p.id === project)?.effects.some((e) => e.kind === "measure" && e.measure === measure && e.points > 0);
const liftsMeasure = (model: BoardModel, o: ActionOption, measure: string): boolean => lifts(model, o.project, measure);

/**
 * The deal a bot takes from a `deal` pending (rule P6): when careful, the one it can keep most
 * cheaply now (an allowed build there that lifts the measure); otherwise, and when none can be
 * kept yet, the first on offer.
 */
export function pickDeal(v: BotView, careful: boolean): { council: CouncilCode; measure: MeasureId } | null {
  const offer = v.state.pending.find((p) => p.kind === "deal");
  if (!offer || offer.kind !== "deal" || offer.choices.length === 0) return null;
  if (!careful) return offer.choices[0]!;
  const cheapest = (c: { council: CouncilCode; measure: MeasureId }) =>
    Math.min(Infinity, ...buildOptions(v, c.council).filter((o) => o.action.kind === "build" && liftsMeasure(v.model, o, c.measure)).map((o) => o.cost));
  return [...offer.choices].sort((a, b) => cheapest(a) - cheapest(b))[0]!;
}

/** A careful bot keeps an open deal: the cheapest allowed build in its council that lifts its measure, or null. */
export function keepDealOption(v: BotView): ActionOption | null {
  for (const d of v.state.deals) {
    if (d.kept !== null || dealKeptBy(v.model, v.state, d)) continue;
    const underWay = (p: BoardState["projects"][number]) => p.status === "building" && p.startedStep >= d.madeStep
      && siteCouncils(v.model, p).includes(d.council) && lifts(v.model, p.project, d.measure);
    if (v.state.projects.some(underWay)) continue;
    const o = buildOptions(v, d.council).filter((x) => x.action.kind === "build" && liftsMeasure(v.model, x, d.measure)).sort((a, b) => a.cost - b.cost)[0];
    if (o) return o;
  }
  return null;
}
