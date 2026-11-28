/**
 * Deals after a lost election: rule P6, which replaces B3 (docs/design/v2-board.md section 16.4).
 * Owner: package 9.
 *
 * A lost election takes no coins and no council refuses builds. You "govern with others": a
 * `deal` pending offers P6 `choices` deals, each a council that backs you least and its weakest
 * measure. Taking one makes it due `deal_years` later. It is kept when a project that lifts that
 * measure, started after the deal, is working in that council (judged each time a year closes):
 * Backing rises `kept_here` there and `kept_near` one link away. If the due date passes first, it
 * is broken: Backing falls `broken` everywhere. The project that keeps it costs `deal_discount`
 * less (`dealDiscount`, for the cost in projects.ts).
 *
 * Without a P6 card nothing here happens, and the board behaves as in phase 1.
 */
import { neighbours, siteCouncils } from "./conditions";
import type { StepCtx } from "./ctx";
import { shiftMoods } from "./people-moods";
import { optParam } from "./rules";
import { stepAfter } from "./time";
import type { Action, Blocker, BoardModel, BoardState, CouncilCode, Deal, ElectionRecord, MeasureId, ProjectId } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

type DealAction = Extract<Action, { kind: "deal" }>;

/** A P6 param, or undefined when the model has no P6 card. */
const p6 = (model: BoardModel, name: string): number | undefined => optParam(model, RULE_IDS.hungTerm, name);

/** Is rule P6 in this model? */
export const hasDeals = (model: BoardModel): boolean => model.rules.some((r) => r.id === RULE_IDS.hungTerm);

/** A council's weakest measure now (ties by the order of MEASURE_IDS). */
export function weakestMeasure(state: BoardState, code: CouncilCode): MeasureId {
  const c = state.councils[code];
  let worst: MeasureId = MEASURE_IDS[0]!;
  if (!c) return worst;
  for (const m of MEASURE_IDS) if (c.measures[m] < c.measures[worst]) worst = m;
  return worst;
}

/** The deals a lost election offers: the councils that back you least (ties by code), each with its weakest measure. */
export function dealChoices(model: BoardModel, state: BoardState): { council: CouncilCode; measure: MeasureId }[] {
  const n = Math.max(1, Math.round(p6(model, "choices") ?? 2));
  return model.game.councils
    .filter((c) => state.councils[c])
    .sort((a, b) => state.councils[a]!.backing - state.councils[b]!.backing || a.localeCompare(b))
    .slice(0, n)
    .map((council) => ({ council, measure: weakestMeasure(state, council) }));
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

/** Does this project lift this measure where it stands (here, flagged or everywhere)? */
function lifts(model: BoardModel, project: ProjectId, measure: MeasureId): boolean {
  const def = model.projects.find((d) => d.id === project);
  return !!def?.effects.some((e) => e.kind === "measure" && e.measure === measure && e.points > 0);
}

/** A working project, started at or after the deal was made, that lifts its measure in its council. */
export function dealKeptBy(model: BoardModel, state: BoardState, d: Deal): string | null {
  const p = state.projects.find((x) => x.status === "working" && x.startedStep >= d.madeStep
    && siteCouncils(model, x).includes(d.council) && lifts(model, x.project, d.measure));
  return p?.id ?? null;
}

/** Each time a year closes: judge open deals (kept as soon as a project keeps them, broken once due) and move Backing. */
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
      for (const code of model.game.councils) shiftMoods(ctx, code, -(p6(model, "broken") ?? 0), undefined, RULE_IDS.hungTerm, cause);
    }
  }
}

/** The open deal a project would serve if built here: it lifts the deal's measure in the deal's council. */
export function dealServed(model: BoardModel, state: BoardState, councils: readonly CouncilCode[], project: ProjectId): Deal | undefined {
  return state.deals.find((d) => d.kept === null && councils.includes(d.council) && lifts(model, project, d.measure));
}

/** Coins off a build for an open deal it serves (P6 `deal_discount`). 0 without P6 or such a deal. */
export function dealDiscount(model: BoardModel, state: BoardState, councils: readonly CouncilCode[], project: ProjectId): number {
  const off = p6(model, "deal_discount") ?? 0;
  return off > 0 && dealServed(model, state, councils, project) ? off : 0;
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
