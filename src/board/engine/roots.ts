/**
 * Roots and fresh starts: rules R1 and R3 (docs/design/v2-board.md sections 16.3.2 and 16.4), and
 * need (R4) re-exported from need.ts. Owner: package 8.
 *
 * R1: each working project has a `roots` factor that starts at 1 and multiplies its measure and
 * young adult effects (held.ts). Each step it grows by `(1 + rate) ^ years_per_step`, at most
 * `max_factor`. The rate is `grow_joined_per_year` when the project has company, else
 * `grow_alone_per_year`, plus or minus R2 `roots_bonus` where its council is rising or slipping
 * (never below 0). Growth stops while a project is run down.
 *
 * A project has company ("joined") when another working project of its branch stands here or one
 * link away, a "together" pair is live for it, a finished keystone of its branch carries the
 * `branch_joined` special, or it had a fresh start (R3) less than `joined_years` ago.
 *
 * R3: the first project placed in a council that is slipping (since its slip began), or in one of
 * the `lowest_count` lowest councils (if nothing was ever placed there), costs `discount` less
 * (never below `min_cost`). The discount is written to the ledger as coins with rule R3 and the
 * project as its cause, which is how a fresh start is remembered (no state field of its own).
 *
 * Without the R1 or R3 card nothing here changes the board, and it behaves as in phase 1.
 */
import { neighbours, siteCouncils } from "./conditions";
import { round4, type StepCtx } from "./ctx";
import { pairApplies } from "./held";
import { momentumRootsBonus, slipStartStep } from "./momentum";
import { optParam } from "./rules";
import { lowestCouncils } from "./score";
import { stepsOf } from "./time";
import type { BoardModel, BoardState, CouncilCode, ProjectDef, ProjectState, Site } from "./types";
import { RULE_IDS } from "./types";

export { needFactor, needOn, seedScore } from "./need";

const R1 = RULE_IDS.roots;
const R3 = RULE_IDS.freshStart;

/** True when the model carries the R1 card. */
export const rootsOn = (model: BoardModel): boolean => model.rules.some((r) => r.id === R1);
/** True when the model carries the R3 card. */
export const freshStartOn = (model: BoardModel): boolean => model.rules.some((r) => r.id === R3);

const r1 = (model: BoardModel, name: string, fallback: number): number => optParam(model, R1, name) ?? fallback;
const r3 = (model: BoardModel, name: string, fallback: number): number => optParam(model, R3, name) ?? fallback;

const defOf = (model: BoardModel, p: ProjectState): ProjectDef | undefined => model.projects.find((d) => d.id === p.project);
const sameSite = (a: Site, b: Site): boolean => (a.council ?? null) === (b.council ?? null) && (a.link ?? null) === (b.link ?? null);

/** Projects (ProjectState ids) whose fresh start still counts as company at `step`. */
export function freshlyJoined(model: BoardModel, state: BoardState, step: number): Set<string> {
  const out = new Set<string>();
  if (!freshStartOn(model)) return out;
  const window = stepsOf(model, r3(model, "joined_years", 8));
  const fresh = state.ledger.filter((c) => c.rule === R3 && c.quantity === "coins" && c.cause.kind === "project");
  for (const p of state.projects) {
    if (step - p.startedStep >= window) continue;
    if (fresh.some((c) => c.cause.kind === "project" && c.cause.project === p.project && sameSite(c.cause.site, p.site))) out.add(p.id);
  }
  return out;
}

/** Does this project have company now, leaving the fresh start aside? */
export function hasCompany(model: BoardModel, state: BoardState, p: ProjectState): boolean {
  const def = defOf(model, p);
  if (!def) return false;
  const here = siteCouncils(model, p);
  const reach = new Set<CouncilCode>(here);
  for (const c of here) neighbours(model, c).forEach((n) => reach.add(n));
  for (const q of state.projects) {
    if (q.status !== "working") continue;
    const qd = defOf(model, q);
    if (!qd || qd.branch !== def.branch) continue;
    if (qd.effects.some((e) => e.kind === "special" && e.special === "branch_joined")) return true;
    if (q.id !== p.id && siteCouncils(model, q).some((c) => reach.has(c))) return true;
  }
  return model.pairs.some((pair) => pair.kind === "together" && pair.project === p.project && pairApplies(model, state, pair, p));
}

/** The R1 growth rate a year for a working project now (company, and R2 momentum where it stands). */
export function rootsRate(model: BoardModel, state: BoardState, p: ProjectState, joined: boolean): number {
  const base = joined ? r1(model, "grow_joined_per_year", 0.08) : r1(model, "grow_alone_per_year", 0.03);
  const here = siteCouncils(model, p);
  const bonus = here.length
    ? here.reduce((a, c) => a + momentumRootsBonus(model, state.councils[c]?.momentum ?? "steady"), 0) / here.length
    : 0;
  return Math.max(0, base + bonus);
}

/**
 * Rule R1, once a step, before held effects move: set `joined` and grow `roots` on each working
 * project. Building and run down projects do not grow.
 */
export function growRoots(ctx: StepCtx): void {
  const { model, state, step } = ctx;
  if (!rootsOn(model)) return;
  const max = r1(model, "max_factor", 5);
  const fresh = freshlyJoined(model, state, step);
  const joined = new Map(state.projects.map((p) => [p.id, p.status === "working" && (fresh.has(p.id) || hasCompany(model, state, p))]));
  for (const p of state.projects) {
    p.joined = joined.get(p.id) ?? false;
    if (p.status !== "working") continue;
    const rate = rootsRate(model, state, p, p.joined);
    p.roots = round4(Math.min(max, Math.max(1, p.roots * (1 + rate) ** model.game.years_per_step)));
  }
}

/**
 * Rule R3: would the first project placed in this council now get the fresh start? It is slipping
 * and nothing was placed here since the slip began, or it is one of the lowest councils and
 * nothing was ever placed here.
 */
export function freshStartHere(model: BoardModel, state: BoardState, council: CouncilCode): boolean {
  if (!freshStartOn(model) || !state.councils[council]) return false;
  const placed = state.projects.filter((p) => siteCouncils(model, p).includes(council));
  const slip = slipStartStep(state, council);
  if (slip !== null && !placed.some((p) => p.startedStep >= slip)) return true;
  if (placed.length > 0) return false;
  return lowestCouncils(model, state.councils, r3(model, "lowest_count", 3)).includes(council);
}

/** Coins off a build at this site from a fresh start (R3): `discount`, never below `min_cost`. 0 when none. */
export function freshStartDiscount(model: BoardModel, state: BoardState, cost: number, site: Site): number {
  if (!freshStartOn(model) || cost <= 0) return 0;
  if (!siteCouncils(model, { site }).some((c) => freshStartHere(model, state, c))) return 0;
  return Math.max(0, Math.min(r3(model, "discount", 1), cost - r3(model, "min_cost", 1)));
}
