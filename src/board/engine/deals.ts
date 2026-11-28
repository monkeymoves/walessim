/**
 * Deals after a lost election: rule P6, which replaces B3 (docs/design/v2-board.md section 16.4).
 * Owner: package 9.
 *
 * A lost election takes no coins and no council refuses builds. You "govern with others": a
 * `deal` pending offers P6 `choices` deals, each a council that backs you least and a weak measure
 * there that nothing standing there lifts yet, so no deal is ever met on the day it is offered.
 * Councils already in a deal come last, and a council whose deal you broke comes after them
 * (playtest 10 should-fix 8: one council was offered four times). Taking one makes it due
 * `deal_years` later.
 *
 * The rule, in the words the deal says (playtest 10 must-fix 1: a deal judged broken after the
 * player built what it asked): it is kept when ANY project that lifts that measure is working in
 * that council by the date, whenever it was started. `buildCountsForDeal` says whether a given
 * build would count, and why not; the screens call it. It is judged each time a year closes:
 * kept, Backing rises `kept_here` there and `kept_near` one link away. If the due date passes
 * first, it is broken: Backing falls `broken_here` in that council only, and that anger fades
 * evenly to nothing over `broken_years` (standing.ts). The project that keeps it costs
 * `deal_discount` less (`dealDiscount`, for the cost in projects.ts).
 *
 * Without a P6 card nothing here happens, and the board behaves as in phase 1.
 */
import { neighbours, siteCouncils } from "./conditions";
import type { StepCtx } from "./ctx";
import { shiftMoods } from "./people-moods";
import { settleStanding } from "./standing";
import { optParam } from "./rules";
import { stepAfter, stepsOf } from "./time";
import type { Action, Blocker, BoardModel, BoardState, CouncilCode, Deal, ElectionRecord, MeasureId, ProjectId } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

type DealAction = Extract<Action, { kind: "deal" }>;

/** A P6 param, or undefined when the model has no P6 card. */
const p6 = (model: BoardModel, name: string): number | undefined => optParam(model, RULE_IDS.hungTerm, name);

/** Is rule P6 in this model? */
export const hasDeals = (model: BoardModel): boolean => model.rules.some((r) => r.id === RULE_IDS.hungTerm);

/** Does this project lift this measure (here, flagged or everywhere)? */
function lifts(model: BoardModel, project: ProjectId, measure: MeasureId): boolean {
  const def = model.projects.find((d) => d.id === project);
  return !!def?.effects.some((e) => e.kind === "measure" && e.measure === measure && e.points > 0);
}

/** Projects standing in a council (working or being built) that lift this measure. */
const standingFor = (model: BoardModel, state: BoardState, code: CouncilCode, measure: MeasureId) =>
  state.projects.filter((p) => (p.status === "working" || p.status === "building") && siteCouncils(model, p).includes(code) && lifts(model, p.project, measure));

/** A council's measures, weakest first (ties by the order of MEASURE_IDS). */
function weakestFirst(state: BoardState, code: CouncilCode): MeasureId[] {
  const c = state.councils[code];
  if (!c) return [...MEASURE_IDS];
  return [...MEASURE_IDS].sort((a, b) => c.measures[a] - c.measures[b]);
}

/** A council's weakest measure now (ties by the order of MEASURE_IDS). */
export function weakestMeasure(state: BoardState, code: CouncilCode): MeasureId {
  return weakestFirst(state, code)[0]!;
}

/**
 * The measure a deal with this council asks for: its weakest measure that no project standing
 * there (working or being built) lifts yet, so the deal is never met on the day it is offered.
 * Null when something already lifts every measure there.
 */
export function dealMeasure(model: BoardModel, state: BoardState, code: CouncilCode): MeasureId | null {
  return weakestFirst(state, code).find((m) => standingFor(model, state, code, m).length === 0) ?? null;
}

/** 0 for a council never in a deal, 1 for one in a deal open or kept, 2 for one whose deal you broke. */
function dealHistory(state: BoardState, code: CouncilCode): number {
  const mine = state.deals.filter((d) => d.council === code);
  return mine.some((d) => d.kept === false) ? 2 : mine.length > 0 ? 1 : 0;
}

/**
 * The deals a lost election offers: councils that back you least, each with a measure nothing there
 * lifts yet (`dealMeasure`). Councils never in a deal come first, then those in one, then those
 * whose deal you broke (ties by Backing, then code).
 */
export function dealChoices(model: BoardModel, state: BoardState): { council: CouncilCode; measure: MeasureId }[] {
  const n = Math.max(1, Math.round(p6(model, "choices") ?? 2));
  return model.game.councils
    .filter((c) => state.councils[c])
    .sort((a, b) => dealHistory(state, a) - dealHistory(state, b) || state.councils[a]!.backing - state.councils[b]!.backing || a.localeCompare(b))
    .flatMap((council) => {
      const measure = dealMeasure(model, state, council);
      return measure ? [{ council, measure }] : [];
    })
    .slice(0, n);
}

/**
 * After an election is held. With P6 and a lost election: push a `deal` pending with the choices.
 * An offer left untaken lapses at the next election.
 */
export function offerDeals(ctx: StepCtx, record: ElectionRecord): void {
  const { model, state } = ctx;
  if (!hasDeals(model)) return;
  state.pending = state.pending.filter((p) => p.kind !== "deal");
  if (record.result !== "lost") return;
  state.pending.push({ kind: "deal", choices: dealChoices(model, state), since: record.step });
}

/**
 * The last step a project can start working in and still keep this deal: the step at whose end the
 * deal is judged for the last time (the first year close at or after its due step).
 */
export function dealLastStep(model: BoardModel, d: Deal): number {
  const perYear = Math.max(1, stepsOf(model, 1));
  // A year closes at the end of each step s where s + 1 is a multiple of the steps in a year.
  const arriving = Math.ceil(d.dueStep / perYear) * perYear;
  return Math.max(d.madeStep, arriving - 1);
}

/** Any project that lifts the deal's measure, working in its council now (started before or after the deal). */
export function dealKeptBy(model: BoardModel, state: BoardState, d: Deal): string | null {
  const p = state.projects.find((x) => x.status === "working" && siteCouncils(model, x).includes(d.council) && lifts(model, x.project, d.measure));
  return p?.id ?? null;
}

/**
 * Would a build count for this deal? "counts" when it lifts the deal's measure, stands in the deal's
 * council and starts working by the deal's last step; otherwise why not. For the build card, the
 * deal note and the projects already under way (pass their `readyStep`).
 */
export type DealCount = "counts" | "other_council" | "other_measure" | "too_late" | "closed";
export function buildCountsForDeal(model: BoardModel, d: Deal, project: ProjectId, councils: readonly CouncilCode[], readyStep: number): DealCount {
  if (d.kept !== null) return "closed";
  if (!councils.includes(d.council)) return "other_council";
  if (!lifts(model, project, d.measure)) return "other_measure";
  return readyStep <= dealLastStep(model, d) ? "counts" : "too_late";
}

/** Projects standing in the deal's council that lift its measure, each with whether it opens in time. */
export function dealProgress(model: BoardModel, state: BoardState, d: Deal): { id: string; project: ProjectId; readyStep: number; inTime: boolean }[] {
  const last = dealLastStep(model, d);
  return standingFor(model, state, d.council, d.measure).map((p) => ({ id: p.id, project: p.project, readyStep: p.readyStep, inTime: p.readyStep <= last }));
}

/** Each time a year closes: judge open deals (kept as soon as a project keeps them, broken once due), move Backing, and settle standing parts. */
export function judgeDeals(ctx: StepCtx): void {
  const { model, state } = ctx;
  if (!hasDeals(model)) return;
  const arriving = ctx.step + 1;
  for (const d of state.deals) {
    if (d.kept !== null) continue;
    const cause = { kind: "deal", council: d.council } as const;
    if (dealKeptBy(model, state, d)) {
      d.kept = true;
      shiftMoods(ctx, d.council, p6(model, "kept_here") ?? 0, undefined, RULE_IDS.hungTerm, cause);
      for (const near of neighbours(model, d.council)) {
        if (state.councils[near]) shiftMoods(ctx, near, p6(model, "kept_near") ?? 0, undefined, RULE_IDS.hungTerm, cause);
      }
    } else if (arriving >= d.dueStep) {
      d.kept = false;
      d.brokenStep = arriving;
    }
  }
  // A broken deal's cost, and the yearly fade of earlier ones (standing.ts).
  settleStanding(ctx, arriving);
}

/**
 * The open deal a project would serve if built here: it lifts the deal's measure in the deal's
 * council, and (given its `readyStep`) it opens in time to count.
 */
export function dealServed(model: BoardModel, state: BoardState, councils: readonly CouncilCode[], project: ProjectId, readyStep?: number): Deal | undefined {
  return state.deals.find((d) => d.kept === null && buildCountsForDeal(model, d, project, councils, readyStep ?? d.madeStep) === "counts");
}

/** Coins off a build for an open deal it serves (P6 `deal_discount`). 0 without P6 or such a deal. */
export function dealDiscount(model: BoardModel, state: BoardState, councils: readonly CouncilCode[], project: ProjectId, readyStep?: number): number {
  const off = p6(model, "deal_discount") ?? 0;
  return off > 0 && dealServed(model, state, councils, project, readyStep) ? off : 0;
}

/** Why a deal cannot be taken now. Empty when it is one of the choices on offer. */
export function dealBlockers(_model: BoardModel, state: BoardState, a: DealAction): Blocker[] {
  const offered = state.pending.some((p) => p.kind === "deal" && p.choices.some((c) => c.council === a.council && c.measure === a.measure));
  return offered ? [] : [{ kind: "not_offered" }];
}

/** Years a deal runs when P6 does not say (the P6 `deal_years` starting value). */
const DEAL_YEARS = 4;

/** Take a deal: it is made now and due `deal_years` later; the offer closes. */
export function takeDeal(ctx: StepCtx, a: DealAction): void {
  const { model, state } = ctx;
  const years = p6(model, "deal_years") ?? DEAL_YEARS;
  state.deals.push({ council: a.council, measure: a.measure, madeStep: state.step, dueStep: stepAfter(model, state.step, years), kept: null });
  state.pending = state.pending.filter((p) => p.kind !== "deal");
}
