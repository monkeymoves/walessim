/**
 * Which councils would tip the next election, and how far each is from backing you (playtest 10,
 * the games critic's one change: "tell me at each election exactly which council to win and
 * why"). Pure: model and state in, councils out. Rule P4 decides: a council backs you at
 * `backs_at`; you win when your councils hold more than `win_share` of the people, and win well at
 * `strong_share` or more. Shares are the real 2026 population shares the engine counts with.
 *
 * The one live count of who backs you (`backersNow`) is here too, so the election card, the laws
 * sheet and the top strip all count the same way from the same state (playtest 10, must-fix 2
 * and 6: "9 of 10 now, 9 after" on an election step; 7 on the card beside 8 in the strip).
 */
import type { BoardModel, BoardState, CouncilCode, ElectionResult } from "../engine/api";
import { stepOfYear } from "../engine/api";
import { election } from "./engine";
import { ruleParamOf } from "./rules";

export interface TargetCouncil {
  code: CouncilCode;
  /** Backing now, out of 10. */
  backing: number;
  /** Points from the line: how far below `backs_at` (to win it), or above it (to hold it). Never negative. */
  gap: number;
  /** Its share of the region's people, 0 to 1 (real, 2026). */
  share: number;
}

export interface ElectionTargets {
  /** The election these targets are for: the next one after this step. */
  year: number;
  /** If it were held now. */
  result: ElectionResult;
  backers: number;
  councilCount: number;
  peopleShare: number;
  /** The fewest points of backing to win: the councils to bring round, closest first. [] when you would win now; null when no set of councils is enough. */
  win: TargetCouncil[] | null;
  /** The same for a strong win (two law changes, faster builds). [] when you would win well now. */
  well: TargetCouncil[] | null;
  /** Councils that back you now and would cost you this result if they slipped under the line, closest to it first. */
  hold: TargetCouncil[];
}

/** Rule P4's three sizes. */
export const p4 = (model: BoardModel) => ({
  backsAt: ruleParamOf(model, "P4", "backs_at", 5),
  winShare: ruleParamOf(model, "P4", "win_share", 0.5),
  strongShare: ruleParamOf(model, "P4", "strong_share", 0.667),
});

/** Each council in play with its people share (real 2026, as the engine counts the election). */
function sharesOf(model: BoardModel, state: BoardState): Record<CouncilCode, number> {
  return Object.fromEntries(election(model, state).councils.map((c) => [c.code, c.peopleShare]));
}

const resultOf = (model: BoardModel, share: number): ElectionResult => {
  const r = p4(model);
  return share >= r.strongShare ? "strong_win" : share > r.winShare ? "win" : "lost";
};

/** Who backs you now, from live backing, the way the election counts it (rule P4). */
export function backersNow(model: BoardModel, state: BoardState): { backers: CouncilCode[]; peopleShare: number; result: ElectionResult } {
  const { backsAt } = p4(model);
  const shares = sharesOf(model, state);
  const backers = model.game.councils.filter((c) => (state.councils[c]?.backing ?? 0) >= backsAt);
  const peopleShare = backers.reduce((a, c) => a + (shares[c] ?? 0), 0);
  return { backers, peopleShare, result: resultOf(model, peopleShare) };
}

/** The next election year after this step, or null after the last. */
export function nextElectionYear(model: BoardModel, state: BoardState): number | null {
  return model.game.election_years.find((y) => stepOfYear(model, y) > state.step) ?? null;
}

const MAX_EXACT = 16;

/**
 * The set of councils from `pool` whose shares added to `have` pass `need` (strictly above when
 * `strict`), with the least backing to find in all (ties: fewer councils, then more people).
 * Exact over every subset for a region of up to 16 councils; greedy by gap beyond.
 */
function cheapest(pool: TargetCouncil[], have: number, need: number, strict: boolean): TargetCouncil[] | null {
  const passes = (s: number) => (strict ? s > need + 1e-9 : s >= need - 1e-9);
  if (passes(have)) return [];
  if (!passes(have + pool.reduce((a, c) => a + c.share, 0))) return null;
  if (pool.length > MAX_EXACT) {
    const out: TargetCouncil[] = [];
    let s = have;
    for (const c of [...pool].sort((a, b) => a.gap - b.gap || b.share - a.share)) {
      if (passes(s)) break;
      out.push(c);
      s += c.share;
    }
    return out;
  }
  let best: { set: TargetCouncil[]; cost: number; share: number } | null = null;
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    const set = pool.filter((_, i) => mask & (1 << i));
    const share = have + set.reduce((a, c) => a + c.share, 0);
    if (!passes(share)) continue;
    const cost = set.reduce((a, c) => a + c.gap, 0);
    if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && (set.length < best.set.length || (set.length === best.set.length && share > best.share)))) {
      best = { set, cost, share };
    }
  }
  return best ? [...best.set].sort((a, b) => a.gap - b.gap || b.share - a.share) : null;
}

/** The councils that would tip the next election, and how far each is from backing you. Null after the last election. */
export function electionTargets(model: BoardModel, state: BoardState): ElectionTargets | null {
  const year = nextElectionYear(model, state);
  if (year === null) return null;
  const r = p4(model);
  const shares = sharesOf(model, state);
  const now = backersNow(model, state);
  const row = (code: CouncilCode): TargetCouncil => {
    const backing = state.councils[code]?.backing ?? 0;
    return { code, backing, gap: Math.max(0, Math.abs(backing - r.backsAt)), share: shares[code] ?? 0 };
  };
  const out = model.game.councils.filter((c) => !now.backers.includes(c)).map(row);
  const win = cheapest(out, now.peopleShare, r.winShare, true);
  const well = cheapest(out, now.peopleShare, r.strongShare, false);
  // a backer whose loss alone would drop you a result
  const hold = now.result === "lost" ? [] : now.backers.map(row)
    .filter((c) => resultOf(model, now.peopleShare - c.share) !== now.result)
    .sort((a, b) => a.gap - b.gap || b.share - a.share);
  return { year, result: now.result, backers: now.backers.length, councilCount: model.game.councils.length, peopleShare: now.peopleShare, win, well, hold };
}

/**
 * The election card's two counts from one state (playtest 10, must-fix 6: the 2034 card said 7
 * while the top strip said 8): the count held, and who backs you now by the same rule. They differ
 * only when something moved backing after the count (an answer, a law), and then the card says so.
 */
export function electionCounts(model: BoardModel, state: BoardState, view: { backers: number }): { held: number; now: number; differs: boolean } {
  const now = backersNow(model, state).backers.length;
  return { held: view.backers, now, differs: now !== view.backers };
}
