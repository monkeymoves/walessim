/**
 * People: groups, moods, Backing and elections (docs/design/v2-board.md section 6).
 *
 * Hooks for the clock (clock-step.ts), each working on the step context's draft:
 * - `seedPeople` once in `newBoard`, after the councils are seeded.
 * - `judgePromise` when a year closes (safe to call then: it judges once, in the promise year).
 * - `updatePeople` when a year closes, after effects, events and spread, with the years closed.
 * - `holdElection` on an election step, after `updatePeople`. Returns the record.
 * - `gradeVisit` (re-exported from places.ts) for a place visit in `act`.
 * Read only helper for projects.ts: `fasterBuild`.
 */
import type { StepCtx } from "./ctx";
import { allEndHold } from "./end-conditions";
import { backingFrom, moveMoods, shiftMoods } from "./people-moods";
import { optParam, param } from "./rules";
import { stepAfter, stepOfYear, yearOfStep } from "./time";
import type {
  BoardModel, BoardState, CouncilCode, ElectionRecord, ElectionResult, ElectionView, Say,
} from "./types";
import { RULE_IDS } from "./types";

export { backingFrom, groupWeight, shiftMoods, syncMoods } from "./people-moods";
export { gradeVisit } from "./places";

/** Backing at the start (rule P2), nudged by what you were elected on. Every group starts at its council's Backing. */
export function seedPeople(ctx: StepCtx): void {
  const { model, state: draft } = ctx;
  const start = model.starts.find((s) => s.id === draft.start);
  const base = param(model, RULE_IDS.backingStart, "start");
  const nudge = param(model, RULE_IDS.backingStart, "start_nudge");
  for (const code of model.game.councils) {
    const c = draft.councils[code];
    if (!c) continue;
    c.moods = Object.fromEntries(model.groups.map((g) => [g.id, { mood: base }]));
    c.backing = Math.round(backingFrom(model, code, c.moods, base) * 1e4) / 1e4;
    c.lastReachedStep = null;
    const def = model.councils.find((x) => x.code === code);
    const points = (start?.backing ?? [])
      .filter((b) => (b.council ? b.council === code : b.flag ? def?.flags.includes(b.flag) : false))
      .reduce((a, b) => a + b.points, 0);
    if (points !== 0) shiftMoods(ctx, code, points * nudge, undefined, RULE_IDS.backingStart, { kind: "start", start: draft.start });
  }
}

/** Judge the start's promise once the clock reaches its year (`arriving` is the step the clock moves to). */
export function judgePromise(ctx: StepCtx, arriving: number): void {
  const { model, state: draft } = ctx;
  if (draft.promise.kept !== null || yearOfStep(model, arriving) < draft.promise.byYear) return;
  const start = model.starts.find((s) => s.id === draft.start);
  draft.promise = { ...draft.promise, kept: start ? allEndHold(model, draft, start.promise.kept_when) : false };
}

/** When a year closes: moods move and Backing follows (rules P1 and P3), over `years` (1 at a quarter year step). */
export function updatePeople(ctx: StepCtx, years: number): void {
  moveMoods(ctx, years);
}

/** Real 2026 population share of each council in play, 0 to 1. */
export function peopleShares(model: BoardModel): Record<CouncilCode, number> {
  const pops = model.game.councils.map((code) => [code, model.councils.find((c) => c.code === code)?.real.pop ?? 0] as const);
  const total = pops.reduce((a, [, p]) => a + p, 0);
  return Object.fromEntries(pops.map(([code, p]) => [code, total > 0 ? p / total : 0]));
}

interface Count { backers: CouncilCode[]; peopleShare: number; result: ElectionResult }

/** Who backs you now (rule P4) and what that would mean. */
export function countBacking(model: BoardModel, state: BoardState): Count {
  const backsAt = param(model, RULE_IDS.election, "backs_at");
  const shares = peopleShares(model);
  const backers = model.game.councils.filter((c) => (state.councils[c]?.backing ?? 0) >= backsAt);
  const peopleShare = backers.reduce((a, c) => a + (shares[c] ?? 0), 0);
  const result: ElectionResult = peopleShare >= param(model, RULE_IDS.election, "strong_share")
    ? "strong_win"
    : peopleShare > param(model, RULE_IDS.election, "win_share") ? "win" : "lost";
  return { backers, peopleShare, result };
}

/** Years from one election to the next (four). */
function termYears(model: BoardModel): number {
  const ys = model.game.election_years;
  return ys.length > 1 ? ys[1]! - ys[0]! : 4;
}

/**
 * Hold the election on arriving at election step `step`. A loss means you govern with others for
 * the term (no law changes; phase 1's weak hand B3 while a model carries it; with P6 a deal is
 * offered by the clock through deals.ts `offerDeals`); a strong
 * win gives one extra law change and faster builds where you were backed. The term runs to the
 * last step before the next election.
 */
export function holdElection(ctx: StepCtx, step: number): ElectionRecord {
  const { model, state: draft } = ctx;
  const year = yearOfStep(model, step);
  const { backers, peopleShare, result } = countBacking(model, draft);
  const record: ElectionRecord = { year, step, result, backers, peopleShare };
  const until = stepAfter(model, step, termYears(model)) - 1;
  draft.election = {
    records: [...draft.election.records, record],
    hungUntil: result === "lost" ? until : null,
    strongUntil: result === "strong_win" ? until : null,
  };
  draft.lawChangesLeft = result === "lost" ? 0 : result === "strong_win" ? 2 : 1;
  return record;
}

function viewOf(model: BoardModel, state: BoardState, r: { year: number; backers: CouncilCode[]; peopleShare: number; result: ElectionResult }, held: boolean): ElectionView {
  const backsAt = param(model, RULE_IDS.election, "backs_at");
  const shares = peopleShares(model);
  const councils = model.game.councils.map((code) => {
    const backing = state.councils[code]?.backing ?? 0;
    return { code, backing, backs: held ? r.backers.includes(code) : backing >= backsAt, peopleShare: shares[code] ?? 0 };
  });
  const says: Say[] = [
    { key: "board.election.count", vars: { backers: r.backers.length, councils: councils.length, people: Math.round(r.peopleShare * 100) } },
    { key: `board.election.${r.result}${held ? "" : ".projected"}` },
  ];
  const lostCoins = optParam(model, "B3", "lost_coins_per_year");
  if (r.result === "lost" && lostCoins !== undefined) says.push({ key: "board.election.weak_hand", vars: { coins: lostCoins } });
  const dealYears = optParam(model, RULE_IDS.hungTerm, "deal_years");
  if (r.result === "lost" && dealYears !== undefined) says.push({ key: "board.election.hung", vars: { years: dealYears } });
  return {
    year: r.year, held, councils, backers: r.backers.length, councilCount: councils.length,
    peopleShare: r.peopleShare, result: r.result, says,
    nextYear: model.game.election_years.find((y) => y > r.year) ?? null,
  };
}

/**
 * API: the election just held (on this step), or the projection if one were held now, for the
 * next election year.
 */
export function election(model: BoardModel, state: BoardState): ElectionView {
  const last = state.election.records[state.election.records.length - 1];
  if (last && last.step === state.step) return viewOf(model, state, last, true);
  const next = model.game.election_years.find((y) => stepOfYear(model, y) > state.step) ?? model.game.end_year;
  return viewOf(model, state, { year: next, ...countBacking(model, state) }, false);
}

/** Years taken off a build after a strong win where the council backed you (phase 1's one turn: two years). */
const FASTER_YEARS = 2;

/** Years taken off a build here after a strong win where the council backed you (0 or 2). */
export function fasterBuild(_model: BoardModel, state: BoardState, council: CouncilCode): number {
  const strong = state.election.strongUntil !== null && state.step <= state.election.strongUntil;
  const last = state.election.records[state.election.records.length - 1];
  return strong && !!last && last.backers.includes(council) ? FASTER_YEARS : 0;
}
