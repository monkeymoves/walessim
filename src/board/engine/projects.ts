/**
 * Legal actions, costs, build time, levels and tier gates (docs/design/v2-board.md section 5).
 * `blockers` is the single judge of whether an action may be taken now: `options` lists it for
 * the UI and bots, `act` refuses with the same list. Preview is in preview.ts.
 */
import { holds, neighbours, siteCouncils } from "./conditions";
import { respondBlockers } from "./events";
import { fasterBuild, refusesBuild } from "./people";
import { param } from "./rules";
import type {
  Action, ActionOption, Blocker, BoardModel, BoardState, Condition, CouncilCode, LinkDef, ProjectDef, ProjectState, RuleId,
  Site, Tier,
} from "./types";
import { RULE_IDS } from "./types";

export { preview } from "./preview";

/** `${project}@${council or link}`: one of each project per site. */
export const projectStateId = (project: string, site: Site): string => `${project}@${site.council ?? site.link}`;

export const projectDef = (model: BoardModel, id: string): ProjectDef | undefined => model.projects.find((p) => p.id === id);

/** Rail links a link project can sit on: both ends in play. */
export function buildableLinks(model: BoardModel): LinkDef[] {
  const play = new Set(model.game.councils);
  return model.links.filter((l) => l.kind === "rail" && play.has(l.from) && play.has(l.to));
}

/** The councils a site touches (one council, or both ends of a rail link). */
export const siteOf = (model: BoardModel, site: Site): CouncilCode[] => siteCouncils(model, { site });

/** The `requires` card that opens a tier of a branch. */
export function tierRule(model: BoardModel, branch: string, tier: Tier): RuleId {
  return model.branches.find((b) => b.id === branch)?.tiers[tier - 1]?.rule ?? `need:${branch}:${tier}`;
}

/** Conditions of a tier gate that do not hold now, judged at `code` (gates are board wide). */
function gateBlockers(model: BoardModel, state: BoardState, branch: string, tier: Tier, code: CouncilCode): Blocker[] {
  if (tier === 1) return [];
  const t = model.branches.find((b) => b.id === branch)?.tiers[tier - 1];
  const rule = tierRule(model, branch, tier);
  return (t?.opens ?? []).filter((c) => !holds(model, state, code, c)).map((condition) => ({ kind: "needs", condition, rule }));
}

/** A project's own needs that fail at any of its site's councils. */
function needBlockers(model: BoardModel, state: BoardState, def: ProjectDef, councils: CouncilCode[]): Blocker[] {
  const rule = def.rule ?? `project:${def.id}`;
  const failing: Condition[] = def.needs.filter((c) => councils.some((code) => !holds(model, state, code, c)));
  return failing.map((condition) => ({ kind: "needs", condition, rule }));
}

/** Turns to build here: the project's build time, one less after a strong win where the council backed you. */
export function buildTurns(model: BoardModel, state: BoardState, def: ProjectDef, site: Site): number {
  const faster = Math.max(...siteOf(model, site).map((c) => fasterBuild(model, state, c)), 0);
  return Math.max(0, def.build_turns - faster);
}

/** The turn at whose end a build started now starts working. */
export const readyTurnOf = (state: BoardState, turns: number): number => state.turn + Math.max(1, turns) - 1;
const yearAfter = (model: BoardModel, turn: number): number => model.game.first_year + (turn + 1) * model.game.turn_years;

/** Coins an action costs now. */
export function costOf(model: BoardModel, state: BoardState, action: Action): number {
  if (action.kind === "build") {
    const def = projectDef(model, action.project);
    return !def || state.freeProject === action.project ? 0 : def.cost;
  }
  if (action.kind === "upgrade") {
    const p = state.projects.find((x) => x.id === projectStateId(action.project, action.site));
    const costs = projectDef(model, action.project)?.upgrade_costs;
    return p && costs ? costs[p.level - 1] ?? 0 : 0;
  }
  if (action.kind === "respond") return model.events.find((e) => e.id === action.event)?.responses.find((r) => r.id === action.response)?.cost ?? 0;
  return 0;
}

function siteValid(model: BoardModel, def: ProjectDef, site: Site): boolean {
  if (def.site === "council") return site.council !== undefined && model.game.councils.includes(site.council);
  return site.link !== undefined && buildableLinks(model).some((l) => l.id === site.link);
}

function buildBlockers(model: BoardModel, state: BoardState, def: ProjectDef, site: Site): Blocker[] {
  const out: Blocker[] = [];
  const councils = siteOf(model, site);
  if (state.projects.some((p) => p.id === projectStateId(def.id, site))) out.push({ kind: "already_here" });
  const cost = state.freeProject === def.id ? 0 : def.cost;
  if (cost > state.coins) out.push({ kind: "coins", need: cost, have: state.coins });
  out.push(...gateBlockers(model, state, def.branch, def.tier, councils[0]!));
  out.push(...needBlockers(model, state, def, councils));
  for (const c of councils) if (refusesBuild(model, state, c, cost)) out.push({ kind: "refused", council: c, minCost: param(model, RULE_IDS.election, "refuse_cost") });
  const bt = buildTurns(model, state, def, site);
  if (def.keystone && state.year > model.game.keystone_last_start_year) out.push({ kind: "too_late", lastYear: model.game.keystone_last_start_year });
  else if (readyTurnOf(state, bt) >= model.game.turns) out.push({ kind: "too_late", lastYear: model.game.end_year - Math.max(1, bt) * model.game.turn_years });
  return out;
}

function upgradeBlockers(model: BoardModel, state: BoardState, def: ProjectDef, p: ProjectState | undefined): Blocker[] {
  if (!p || p.status !== "working") return [{ kind: "not_offered" }];
  if (!def.upgrade_costs || p.level >= 3) return [{ kind: "max_level" }];
  const out: Blocker[] = [];
  const cost = def.upgrade_costs[p.level - 1] ?? 0;
  if (cost > state.coins) out.push({ kind: "coins", need: cost, have: state.coins });
  const councils = siteCouncils(model, p);
  out.push(...gateBlockers(model, state, def.branch, (p.level + 1) as Tier, councils[0]!));
  for (const c of councils) if (refusesBuild(model, state, c, cost)) out.push({ kind: "refused", council: c, minCost: param(model, RULE_IDS.election, "refuse_cost") });
  return out;
}

/** Why an action cannot be taken now. Empty when it can. */
export function blockers(model: BoardModel, state: BoardState, action: Action): Blocker[] {
  if (state.phase === "ended") return [{ kind: "phase", phase: state.phase }];
  switch (action.kind) {
    case "build": {
      const def = projectDef(model, action.project);
      return def && siteValid(model, def, action.site) ? buildBlockers(model, state, def, action.site) : [{ kind: "not_offered" }];
    }
    case "upgrade": {
      const def = projectDef(model, action.project);
      return def ? upgradeBlockers(model, state, def, state.projects.find((p) => p.id === projectStateId(action.project, action.site))) : [{ kind: "not_offered" }];
    }
    case "law": {
      if (!model.laws.some((l) => l.id === action.law) || state.laws.includes(action.law) === action.pass) return [{ kind: "not_offered" }];
      return state.lawChangesLeft > 0 ? [] : [{ kind: "law_changes_used" }];
    }
    case "respond": return respondBlockers(model, state, action.event, action.response);
    case "visit": {
      if (!state.pending.some((p) => p.kind === "visit" && p.place === action.place)) return [{ kind: "not_offered" }];
      return state.visitsThisTurn >= model.game.visits_per_turn ? [{ kind: "visit_used" }] : [];
    }
  }
}

function option(model: BoardModel, state: BoardState, action: Action): ActionOption {
  const b = blockers(model, state, action);
  const out: ActionOption = { action, allowed: b.length === 0, blockers: b, cost: costOf(model, state, action) };
  if (action.kind === "build" || action.kind === "upgrade") {
    const def = projectDef(model, action.project)!;
    const bt = action.kind === "build" ? buildTurns(model, state, def, action.site) : 0;
    Object.assign(out, { project: def.id, branch: def.branch, tier: def.tier, buildTurns: bt, readyYear: yearAfter(model, readyTurnOf(state, bt)) });
  }
  return out;
}

/** Everything that can be done now (in one council, or anywhere), allowed or not, and why not. */
export function options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[] {
  const councils = council ? [council] : [...model.game.councils];
  const links = buildableLinks(model).filter((l) => councils.includes(l.from) || councils.includes(l.to));
  const out: ActionOption[] = [];
  const buildOrUpgrade = (def: ProjectDef, site: Site) => {
    const standing = state.projects.some((p) => p.id === projectStateId(def.id, site));
    out.push(option(model, state, { kind: standing ? "upgrade" : "build", project: def.id, site }));
  };
  for (const def of model.projects) {
    if (def.site === "council") councils.forEach((c) => buildOrUpgrade(def, { council: c }));
    else links.forEach((l) => buildOrUpgrade(def, { link: l.id }));
  }
  if (!council) for (const law of model.laws) out.push(option(model, state, { kind: "law", law: law.id, pass: !state.laws.includes(law.id) }));
  for (const p of state.pending) {
    if (council && !(p.kind === "respond" ? p.councils.includes(council) : p.council === council)) continue;
    if (p.kind === "respond") {
      for (const r of model.events.find((e) => e.id === p.event)?.responses ?? []) out.push(option(model, state, { kind: "respond", event: p.event, response: r.id }));
    } else {
      const place = model.places.find((x) => x.id === p.place);
      const picks = place?.template === "T3" ? (place.options ?? []).map((o) => [o.id]) : [[]];
      for (const pick of picks) out.push(option(model, state, { kind: "visit", place: p.place, picks: pick }));
    }
  }
  return out;
}

/** Councils that count as reached when something is built at a site: the site and one link away. */
export function reachedBy(model: BoardModel, site: Site): CouncilCode[] {
  const out = new Set<CouncilCode>();
  for (const c of siteOf(model, site)) {
    out.add(c);
    neighbours(model, c).forEach((n) => out.add(n));
  }
  return [...out].sort();
}
