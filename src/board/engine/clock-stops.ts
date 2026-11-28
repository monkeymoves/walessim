/**
 * The stops one clock step raises (docs/design/v2-board.md section 16.2.5). The engine reports
 * every stop; whether a stop is hard comes from `game.stops`, and the UI decides from the
 * player's settings whether to pause on a soft one. The engine never reads the settings.
 *
 * A stop's sentence is the key `board.stop.<kind>` with slots `council`, `project`, `event`,
 * `place`, `year` as they apply. A tipping stop names its direction: `board.stop.tipping.rising`,
 * `.slipping`, or `.region` when the region turns (rule R2, with `ref: "region"`).
 */
import type { StepFacts } from "./ctx";
import { holds, siteCouncil } from "./conditions";
import { regionTurned, risingCount } from "./momentum";
import { optParam } from "./rules";
import { stepsOf } from "./time";
import type { BoardModel, BoardState, CouncilCode, Momentum, Say, SayVar, Stop, StopKind } from "./types";
import { RULE_IDS } from "./types";

/** What the stops compare: the board just before the step. */
export interface Before {
  opened: Set<string>;
  momentum: Record<CouncilCode, Momentum>;
  pending: Set<string>;
  forecast: Set<string>;
  coins: number;
  regionTurned: boolean;
}

/** Tiers (`<branch>:<tier>`) and legacy projects (`legacy:<project>`) open now. Gates are board wide. */
export function openedNow(model: BoardModel, state: BoardState): Set<string> {
  const out = new Set<string>();
  const at = model.game.councils[0];
  if (!at) return out;
  for (const b of model.branches) {
    for (const t of b.tiers) {
      if (t.tier > 1 && t.opens.every((c) => holds(model, state, at, c))) out.add(`${b.id}:${t.tier}`);
    }
  }
  for (const p of model.projects) {
    if (p.legacy_of && holds(model, state, at, { kind: "keystone", project: p.legacy_of })) out.add(`legacy:${p.id}`);
  }
  return out;
}

const pendingKey = (p: BoardState["pending"][number]): string =>
  p.kind === "respond" ? `respond:${p.event}` : p.kind === "visit" ? `visit:${p.place}` : `deal:${p.since}`;
const forecastKey = (f: BoardState["forecast"][number]): string => `${f.event}@${f.step}`;

export function before(model: BoardModel, state: BoardState): Before {
  return {
    opened: openedNow(model, state),
    momentum: Object.fromEntries(Object.entries(state.councils).map(([k, c]) => [k, c.momentum])),
    pending: new Set(state.pending.map(pendingKey)),
    forecast: new Set(state.forecast.map(forecastKey)),
    coins: state.coins,
    regionTurned: regionTurned(model, state),
  };
}

const nameOf = (model: BoardModel, code: CouncilCode): SayVar => model.councils.find((c) => c.code === code)?.name ?? code;

/** Every stop of one step, hard ones first, then in the order of 16.2.5. */
export function stopsOf(model: BoardModel, was: Before, state: BoardState, facts: StepFacts): Stop[] {
  const out: Stop[] = [];
  const add = (kind: StopKind, vars: Record<string, SayVar> = {}, council?: CouncilCode, ref?: string, key = `board.stop.${kind}`) => {
    const say: Say = { key, vars: { year: state.year, ...vars, ...(council ? { council: nameOf(model, council) } : {}) } };
    out.push({ kind, hard: !!model.game.stops?.[kind]?.hard, ...(council ? { council } : {}), ...(ref ? { ref } : {}), say });
  };
  const projectName = (id: string): SayVar => model.projects.find((d) => d.id === id)?.name ?? id;

  for (const p of state.pending) {
    if (was.pending.has(pendingKey(p))) continue;
    if (p.kind === "respond") add("respond", { event: model.events.find((e) => e.id === p.event)?.name ?? p.event }, p.councils[0], p.event);
  }
  if (facts.election) add("election", { result: facts.election.result });
  if (state.phase === "ended") add("ended");
  for (const f of state.forecast) {
    if (was.forecast.has(forecastKey(f))) continue;
    add("warning", { event: model.events.find((e) => e.id === f.event)?.name ?? f.event }, f.councils[0], f.event);
  }
  for (const id of facts.finished) {
    const p = state.projects.find((x) => x.id === id);
    if (p && model.projects.find((d) => d.id === p.project)?.keystone) add("keystone", { project: projectName(p.project) }, siteCouncil(model, p), p.project);
  }
  for (const key of facts.opened) add("tier_open", {}, undefined, key);
  for (const p of state.pending) {
    if (was.pending.has(pendingKey(p)) || p.kind !== "visit") continue;
    add("visit", { place: model.places.find((x) => x.id === p.place)?.name ?? p.place }, p.council, p.place);
  }
  for (const t of facts.tipped) if (t.to !== "steady") add("tipping", {}, t.council, undefined, `board.stop.tipping.${t.to}`);
  if (!was.regionTurned && regionTurned(model, state)) add("tipping", { n: risingCount(model, state) }, undefined, "region", "board.stop.tipping.region");
  if (facts.chapter) add("chapter", {}, undefined, facts.chapter.chapter);
  const dueIn = stepsOf(model, 1);
  for (const d of state.deals) if (d.kept === null && d.dueStep - dueIn === state.step) add("deal_due", {}, d.council);
  const purse = optParam(model, RULE_IDS.coins, "purse_max");
  if (purse !== undefined && was.coins < purse && state.coins >= purse) add("purse_full", { n: purse });
  for (const id of facts.finished) {
    const p = state.projects.find((x) => x.id === id);
    if (p && !model.projects.find((d) => d.id === p.project)?.keystone) add("finished", { project: projectName(p.project) }, siteCouncil(model, p), p.project);
  }
  if (facts.closedYears.length > 0) add("year", { year: facts.closedYears[facts.closedYears.length - 1]! });
  return out.sort((a, b) => Number(b.hard) - Number(a.hard));
}

/** Councils whose momentum changed since `was`. */
export function tippedSince(was: Before, state: BoardState): StepFacts["tipped"] {
  return Object.entries(state.councils)
    .filter(([code, c]) => (was.momentum[code] ?? "steady") !== c.momentum)
    .map(([council, c]) => ({ council, from: was.momentum[council] ?? "steady", to: c.momentum }));
}

/** Keys opened since `was`. */
export function openedSince(model: BoardModel, was: Before, state: BoardState): string[] {
  return [...openedNow(model, state)].filter((k) => !was.opened.has(k)).sort();
}
