/**
 * Events on the board: choosing the council an event lands on, warning it a turn ahead, how big
 * it is when it lands, and the responses (docs/design/v2-board.md section 7.1).
 */
import { uniform } from "../../engine/rng";
import { allHold, countProjects, holds, siteCouncils } from "./conditions";
import type { TurnCtx } from "./ctx";
import { applyOnce } from "./effects";
import { param } from "./rules";
import { ruleParam } from "./rule-defaults";
import type {
  BoardModel, BoardState, Condition, CouncilCode, EventDef, EventRecord, Flow, ForecastedEvent,
} from "./types";
import { RULE_IDS } from "./types";

/** Councils downstream of `code`, one hop along river links. */
export function downstream(model: BoardModel, code: CouncilCode): CouncilCode[] {
  const inPlay = new Set(model.game.councils);
  return [...new Set(model.links.filter((l) => l.kind === "river" && l.from === code && inPlay.has(l.to)).map((l) => l.to))].sort();
}

/** Councils upstream of `code`, one hop along river links. */
export function upstream(model: BoardModel, code: CouncilCode): CouncilCode[] {
  const inPlay = new Set(model.game.councils);
  return [...new Set(model.links.filter((l) => l.kind === "river" && l.to === code && inPlay.has(l.from)).map((l) => l.from))].sort();
}

/** Councils where the trigger holds. Outside events skip track tests: the schedule drew them from the track. */
export function candidates(model: BoardModel, state: BoardState, e: EventDef): CouncilCode[] {
  const skip = e.origin === "outside" ? (c: Condition) => c.kind === "track" : undefined;
  return model.game.councils.filter((code) => state.councils[code] && allHold(model, state, code, e.trigger, skip));
}

/** Candidates ordered by the event's target rule, best first; ties broken by the seeded draw. */
export function rankTargets(model: BoardModel, state: BoardState, e: EventDef, cands: CouncilCode[]): CouncilCode[] {
  const t = e.target;
  const value = (code: CouncilCode): number => {
    const c = state.councils[code]!;
    if (t.pick === "highest_risk") return c.risks[t.risk];
    if (t.pick === "lowest_measure") return -c.measures[t.measure];
    if (t.pick === "highest_measure") return c.measures[t.measure];
    return 0;
  };
  const draw = (code: CouncilCode) => uniform(state.seed, "target", state.turn, e.id, code);
  return [...cands].sort((a, b) => value(b) - value(a) || draw(b) - draw(a));
}

/**
 * Plan an event for the end of the current turn: its councils (target first, then those most at
 * risk) and its base severity. Null when no council fits a grown event.
 */
export function planEvent(model: BoardModel, state: BoardState, e: EventDef): ForecastedEvent | null {
  let cands = candidates(model, state, e);
  if (cands.length === 0) {
    if (e.origin === "grown") return null;
    cands = model.game.councils.filter((c) => state.councils[c]);
  }
  const ranked = rankTargets(model, state, e, cands);
  let councils: CouncilCode[];
  if (e.target.pick === "all") councils = ranked;
  else if (e.travels === "downstream") councils = [ranked[0]!, ...downstream(model, ranked[0]!)];
  else councils = ranked.slice(0, 1);
  return { event: e.id, turn: state.turn, councils, severity: e.severity };
}

/** Which councils an event hits when it lands: all its councils (single target events list one). */
export const hitCouncils = (f: ForecastedEvent): CouncilCode[] => f.councils;

/** The first `size` rule that holds here, else 1. */
function sizeFactor(model: BoardModel, state: BoardState, e: EventDef, code: CouncilCode): number {
  return e.size.find((s) => allHold(model, state, code, s.when))?.factor ?? 1;
}

/**
 * Standing projects that cut this event at this council (fairness rule 3): its `prepared_by`
 * projects working here, or upstream for an event that travels down a river.
 */
export function preparedHere(model: BoardModel, state: BoardState, e: EventDef, code: CouncilCode): string[] {
  if (e.good) return [];
  const reach = new Set([code, ...(e.travels === "downstream" ? upstream(model, code) : [])]);
  return state.projects
    .filter((p) => p.status === "working" && e.prepared_by.includes(p.project) && siteCouncils(model, p).some((s) => reach.has(s)))
    .map((p) => p.id)
    .sort();
}

/** Rivers given room on this river: a working `storm_step_down` project at any council the storm reaches. */
function stormStepped(model: BoardModel, state: BoardState, councils: CouncilCode[]): boolean {
  return state.projects.some((p) => {
    if (p.status !== "working") return false;
    const def = model.projects.find((d) => d.id === p.project);
    return !!def?.effects.some((x) => x.kind === "special" && x.special === "storm_step_down") && siteCouncils(model, p).some((s) => councils.includes(s));
  });
}

/** How strongly an event hits one council, 0 and up: its size, preparation, and S4 for storms passing downstream. */
export function hitFactor(model: BoardModel, state: BoardState, e: EventDef, f: ForecastedEvent, code: CouncilCode): number {
  let factor = sizeFactor(model, state, e, code);
  if (e.good) return factor;
  factor *= Math.pow(ruleParam(model, RULE_IDS.severity, "prepared_cut"), preparedHere(model, state, e, code).length);
  if (e.travels === "downstream") {
    if (stormStepped(model, state, f.councils)) factor *= ruleParam(model, RULE_IDS.severity, "storm_step");
    if (code !== f.councils[0]) {
      const flood = countProjects(model, state, f.councils[0]!, { kind: "project", tag: "flood", where: "here" });
      factor *= Math.max(0, 1 - param(model, RULE_IDS.waterRunsDownhill, "storm_weaken") * flood);
    }
  }
  return factor;
}

/** Land one forecasted event: effects scaled at each council, the record, and any flows down the river. */
export function landOne(ctx: TurnCtx, f: ForecastedEvent): { record: EventRecord; flows: Flow[] } {
  const { model, state: draft } = ctx;
  const e = model.events.find((d) => d.id === f.event)!;
  // Sizes are judged on the board before any of it lands, so the order of councils does not matter.
  const factors = Object.fromEntries(f.councils.map((c) => [c, hitFactor(model, draft, e, f, c)]));
  for (const code of f.councils) {
    if (factors[code]! > 0) applyOnce(ctx, e.effects, { councils: [code] }, { kind: "event", event: e.id }, { factor: factors[code]!, rule: RULE_IDS.severity });
  }
  const flows: Flow[] = [];
  if (e.travels === "downstream") {
    const top = f.councils[0]!;
    for (const to of f.councils.slice(1)) {
      const link = model.links.find((l) => l.kind === "river" && l.from === top && l.to === to);
      if (link) flows.push({ link: link.id, from: top, to, quantity: "risk_flood", amount: factors[to] ?? 0, rule: RULE_IDS.waterRunsDownhill });
    }
  }
  const severity = Math.round(f.severity * (factors[f.councils[0]!] ?? 1) * 1e4) / 1e4;
  return { record: { event: e.id, turn: draft.turn, councils: [...f.councils], severity }, flows };
}

/** Is the event's trigger holding anywhere now (for tests and hints)? */
export function triggered(model: BoardModel, state: BoardState, e: EventDef): boolean {
  return model.game.councils.some((code) => e.trigger.every((c) => holds(model, state, code, c)));
}
