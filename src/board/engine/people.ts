/**
 * People: groups, moods, Backing and elections (docs/design/v2-board.md section 6).
 *
 * Hooks for turn.ts (package 2, through hooks.ts), each working on the turn context's draft:
 * - `seedPeople` once in `newBoard`, after the councils are seeded.
 * - `judgePromise` at the end of the turn that reaches the promise year (safe to call every turn).
 * - `updatePeople` at the end of every turn, after effects, events and spread, before the turn
 *   and year move on.
 * - `holdElection` after `updatePeople`, before the turn moves on (safe to call every turn: it
 *   does nothing unless the turn ends in an election year). Returns the view, or null.
 * - `gradeVisit` (re-exported from places.ts) for a place visit in `act`.
 * Read only helpers for projects.ts: `refusesBuild`, `fasterBuild`.
 */
import type { TurnCtx } from "./ctx";
import { allEndHold } from "./end-conditions";
import { backingFrom, moveMoods, shiftMoods } from "./people-moods";
import { param } from "./rules";
import type {
  BoardModel, BoardState, CouncilCode, ElectionRecord, ElectionResult, ElectionView, Say,
} from "./types";
import { RULE_IDS } from "./types";

export { backingFrom, groupWeight, shiftMoods, syncMoods } from "./people-moods";
export { gradeVisit } from "./places";

/** Backing at the start (rule P2), nudged by what you were elected on. Every group starts at its council's Backing. */
export function seedPeople(ctx: TurnCtx): void {
  const { model, state: draft } = ctx;
  const start = model.starts.find((s) => s.id === draft.start);
  const base = param(model, RULE_IDS.backingStart, "start");
  const nudge = param(model, RULE_IDS.backingStart, "start_nudge");
  for (const code of model.game.councils) {
    const c = draft.councils[code];
    if (!c) continue;
    c.moods = Object.fromEntries(model.groups.map((g) => [g.id, { mood: base }]));
    c.backing = Math.round(backingFrom(model, code, c.moods, base) * 1e4) / 1e4;
    c.lastReachedTurn = null;
    const def = model.councils.find((x) => x.code === code);
    const points = (start?.backing ?? [])
      .filter((b) => (b.council ? b.council === code : b.flag ? def?.flags.includes(b.flag) : false))
      .reduce((a, b) => a + b.points, 0);
    if (points !== 0) shiftMoods(ctx, code, points * nudge, undefined, RULE_IDS.backingStart, { kind: "start", start: draft.start });
  }
}

/** The year the current turn ends. */
const endYear = (model: BoardModel, state: BoardState): number => state.year + model.game.turn_years;

/** Judge the start's promise in the turn that reaches its year. Does nothing in other turns. */
export function judgePromise(ctx: TurnCtx): void {
  const { model, state: draft } = ctx;
  if (draft.promise.kept !== null || endYear(model, draft) < draft.promise.byYear) return;
  const start = model.starts.find((s) => s.id === draft.start);
  draft.promise = { ...draft.promise, kept: start ? allEndHold(model, draft, start.promise.kept_when) : false };
}

/** End of turn: moods move and Backing follows (rules P1 and P3). */
export function updatePeople(ctx: TurnCtx): void {
  moveMoods(ctx);
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

/** Turns from one election to the next (four years: two turns). */
function termTurns(model: BoardModel): number {
  const ys = model.game.election_years;
  const gap = ys.length > 1 ? ys[1]! - ys[0]! : 4;
  return Math.max(1, Math.round(gap / model.game.turn_years));
}

/**
 * Hold the election if the current turn ends in an election year. A loss gives the weak hand for
 * the next term (fewer coins, no law changes, big builds refused where you were not backed); a
 * strong win gives one extra law change and faster builds where you were backed.
 */
export function holdElection(ctx: TurnCtx): ElectionView | null {
  const { model, state: draft } = ctx;
  const year = endYear(model, draft);
  if (!model.game.election_years.includes(year)) return null;
  const { backers, peopleShare, result } = countBacking(model, draft);
  const record: ElectionRecord = { year, turn: draft.turn, result, backers, peopleShare };
  const until = draft.turn + termTurns(model);
  draft.election = {
    records: [...draft.election.records, record],
    weakUntil: result === "lost" ? until : null,
    strongUntil: result === "strong_win" ? until : null,
  };
  draft.lawChangesLeft = result === "lost" ? 0 : result === "strong_win" ? 2 : 1;
  return viewOf(model, draft, record, true);
}

function viewOf(model: BoardModel, state: BoardState, r: { year: number; backers: CouncilCode[]; peopleShare: number; result: ElectionResult }, held: boolean): ElectionView {
  const backsAt = param(model, RULE_IDS.election, "backs_at");
  const shares = peopleShares(model);
  const councils = model.game.councils.map((code) => {
    const backing = state.councils[code]?.backing ?? 0;
    return { code, backing, backs: held ? r.backers.includes(code) : backing >= backsAt, peopleShare: shares[code] ?? 0 };
  });
  const says: Say[] = [
    { key: "election.count", vars: { backers: r.backers.length, councils: councils.length, people: Math.round(r.peopleShare * 100) } },
    { key: `election.${r.result}${held ? "" : ".projected"}` },
  ];
  if (r.result === "lost") says.push({ key: "election.weak_hand", vars: { coins: param(model, RULE_IDS.weakHand, "lost_coins"), cost: param(model, RULE_IDS.election, "refuse_cost") } });
  return {
    year: r.year, held, councils, backers: r.backers.length, councilCount: councils.length,
    peopleShare: r.peopleShare, result: r.result, says,
    nextYear: model.game.election_years.find((y) => y > r.year) ?? null,
  };
}

/**
 * API: the election just held (at the end of the last turn), or the projection if one were held
 * now, for the next election year.
 */
export function election(model: BoardModel, state: BoardState): ElectionView {
  const last = state.election.records[state.election.records.length - 1];
  if (last && last.turn === state.turn - 1) return viewOf(model, state, last, true);
  const next = model.game.election_years.find((y) => y >= endYear(model, state)) ?? model.game.end_year;
  return viewOf(model, state, { year: next, ...countBacking(model, state) }, false);
}

/** Lost the last election: a council that did not back you refuses builds this dear or more (rule P4 `refuse_cost`). */
export function refusesBuild(model: BoardModel, state: BoardState, council: CouncilCode, cost: number): boolean {
  const weak = state.election.weakUntil !== null && state.turn <= state.election.weakUntil;
  const last = state.election.records[state.election.records.length - 1];
  return weak && !!last && !last.backers.includes(council) && cost >= param(model, RULE_IDS.election, "refuse_cost");
}

/** Turns taken off a build here after a strong win where the council backed you (0 or 1). */
export function fasterBuild(model: BoardModel, state: BoardState, council: CouncilCode): number {
  const strong = state.election.strongUntil !== null && state.turn <= state.election.strongUntil;
  const last = state.election.records[state.election.records.length - 1];
  return strong && !!last && last.backers.includes(council) ? 1 : 0;
}
