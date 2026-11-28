/**
 * Legal actions, costs, build time, levels and tier gates (docs/design/v2-board.md section 5).
 * `blockers` is the single judge of whether an action may be taken now: `options` lists it for
 * the UI and bots, `act` refuses with the same list. Preview is in preview.ts.
 */
import { countProjects, holds, neighbours, siteCouncils } from "./conditions";
import { dealBlockers, dealDiscount } from "./deals";
import { rebuildShare, respondBlockers, responseCost } from "./events";
import { fasterBuild } from "./people";
import { freshStartDiscount, freshStartMaxTier } from "./roots";
import { keystoneLastStep, stepsOf, yearOfStep } from "./time";
import type {
  Action, ActionOption, Blocker, BoardModel, BoardState, Condition, CouncilCode, LinkDef, ProjectDef, ProjectState, RuleId,
  Site, Tier,
} from "./types";

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
  return (t?.opens ?? []).filter((c) => !holds(model, state, code, c)).map((condition) => ({
    kind: "needs", condition, rule,
    ...(condition.kind === "project" && !condition.not ? { have: countProjects(model, state, code, condition) } : {}),
  }));
}

/** A project's own needs that fail at any of its site's councils. */
function needBlockers(model: BoardModel, state: BoardState, def: ProjectDef, councils: CouncilCode[]): Blocker[] {
  const rule = def.rule ?? `project:${def.id}`;
  const failing: Condition[] = def.needs.filter((c) => councils.some((code) => !holds(model, state, code, c)));
  return failing.map((condition) => ({ kind: "needs", condition, rule }));
}

/**
 * Years to build here: the project's build time, less after a strong win where the council backed
 * you, then shortened after trouble landed here (rule E2; for a link, the end that gains least).
 */
export function buildYears(model: BoardModel, state: BoardState, def: ProjectDef, site: Site): number {
  const councils = siteOf(model, site);
  const faster = Math.max(...councils.map((c) => fasterBuild(model, state, c)), 0);
  const share = Math.max(...councils.map((c) => rebuildShare(model, state, c)), 0) || 1;
  return Math.max(0, def.build_years - faster) * share;
}

/** Steps to build here (0 opens at once). */
export const buildSteps = (model: BoardModel, state: BoardState, def: ProjectDef, site: Site): number => stepsOf(model, buildYears(model, state, def, site));

/** The step at whose end a build started now starts working. */
export const readyStepOf = (state: BoardState, steps: number): number => state.step + Math.max(1, steps) - 1;
/** The year a project ready at the end of `step` is first felt (the year of the step after). */
export const yearAfter = (model: BoardModel, step: number): number => yearOfStep(model, step + 1);

/**
 * Coins off a build: a fresh start (rule R3, roots.ts) and an open deal it serves (rule P6,
 * deals.ts). The deal never takes a build below 1 coin, as the fresh start does not.
 */
export function buildDiscounts(model: BoardModel, state: BoardState, def: ProjectDef, site: Site): { fresh: number; deal: number } {
  if (state.freeProject === def.id) return { fresh: 0, deal: 0 };
  // R3 `max_tier`: a fresh start takes nothing off a keystone (playtest 9 should-fix 10: "3 off the full price of 8").
  const fresh = def.tier <= freshStartMaxTier(model) ? freshStartDiscount(model, state, def.cost, site) : 0;
  const ready = readyStepOf(state, buildSteps(model, state, def, site));
  const deal = Math.max(0, Math.min(dealDiscount(model, state, siteOf(model, site), def.id, ready), def.cost - fresh - 1));
  return { fresh, deal };
}

/** Coins an action costs now: a build less its discounts. */
export function costOf(model: BoardModel, state: BoardState, action: Action): number {
  if (action.kind === "build") {
    const def = projectDef(model, action.project);
    if (!def || state.freeProject === action.project) return 0;
    const off = buildDiscounts(model, state, def, action.site);
    return def.cost - off.fresh - off.deal;
  }
  if (action.kind === "upgrade") {
    const p = state.projects.find((x) => x.id === projectStateId(action.project, action.site));
    const costs = projectDef(model, action.project)?.upgrade_costs;
    return p && costs ? costs[p.level - 1] ?? 0 : 0;
  }
  if (action.kind === "respond") return responseCost(model, state, action.event, action.response);
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
  else if (def.keystone && state.projects.some((p) => p.project === def.id)) out.push({ kind: "one_keystone" });
  const cost = costOf(model, state, { kind: "build", project: def.id, site });
  if (cost > state.coins) out.push({ kind: "coins", need: cost, have: state.coins });
  out.push(...gateBlockers(model, state, def.branch, def.tier, councils[0]!));
  out.push(...needBlockers(model, state, def, councils));
  const bs = buildSteps(model, state, def, site);
  if (def.keystone && state.step > keystoneLastStep(model)) out.push({ kind: "too_late", lastStep: keystoneLastStep(model) });
  else if (readyStepOf(state, bs) >= model.game.steps) out.push({ kind: "too_late", lastStep: model.game.steps - Math.max(1, bs) });
  return out;
}

function upgradeBlockers(model: BoardModel, state: BoardState, def: ProjectDef, p: ProjectState | undefined): Blocker[] {
  if (p?.status === "building") return [{ kind: "still_building", readyStep: p.readyStep }];
  if (!p || p.status !== "working") return [{ kind: "not_offered" }];
  if (!def.upgrade_costs || p.level >= 3) return [{ kind: "max_level" }];
  const out: Blocker[] = [];
  const cost = def.upgrade_costs[p.level - 1] ?? 0;
  if (cost > state.coins) out.push({ kind: "coins", need: cost, have: state.coins });
  const councils = siteCouncils(model, p);
  out.push(...gateBlockers(model, state, def.branch, (p.level + 1) as Tier, councils[0]!));
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
    // A visit on offer can always be made (playtest 8, must-fix 11: a second offer inside a year
    // was shown and then refused). Offers lapse after `game.visit_open_years` instead.
    case "visit": return state.pending.some((p) => p.kind === "visit" && p.place === action.place) ? [] : [{ kind: "not_offered" }];
    case "deal": return dealBlockers(model, state, action);
  }
}

function option(model: BoardModel, state: BoardState, action: Action): ActionOption {
  const b = blockers(model, state, action);
  const out: ActionOption = { action, allowed: b.length === 0, blockers: b, cost: costOf(model, state, action) };
  if (action.kind === "build" || action.kind === "upgrade") {
    const def = projectDef(model, action.project)!;
    const years = action.kind === "build" ? buildYears(model, state, def, action.site) : 0;
    const readyStep = readyStepOf(state, stepsOf(model, years));
    Object.assign(out, { project: def.id, branch: def.branch, tier: def.tier, buildYears: years, readyStep, readyYear: yearAfter(model, readyStep) });
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
    if (council && p.kind !== "deal" && !(p.kind === "respond" ? p.councils.includes(council) : p.council === council)) continue;
    if (p.kind === "respond") {
      for (const r of model.events.find((e) => e.id === p.event)?.responses ?? []) out.push(option(model, state, { kind: "respond", event: p.event, response: r.id }));
    } else if (p.kind === "deal") {
      if (council && !p.choices.some((c) => c.council === council)) continue;
      for (const c of p.choices) out.push(option(model, state, { kind: "deal", council: c.council, measure: c.measure }));
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
