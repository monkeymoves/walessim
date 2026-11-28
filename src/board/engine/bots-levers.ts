/**
 * "A lever exists" (playtest 10 must-fix 4: "backing sat at 4.9 whatever I built"): in a Skilled
 * game, at each election, every council that does not back you is tried with each single build or
 * upgrade there that a year's coins would pay for. The case is lifted when one of them brings that
 * council to `backs_at` (5) at a year's close within `LEVER_YEARS`, with nothing else built.
 * The balance script plays the games; bots-marks.ts turns the counts into the table row.
 */
import { act as realAct } from "./clock";
import { answerAll, optionCouncils, runAhead } from "./bots-common";
import { realEngine } from "./bots";
import { income } from "./budget";
import { options } from "./projects";
import { param } from "./rules";
import { stepsOf } from "./time";
import type { ActionOption, BoardModel, BoardState, CouncilCode } from "./types";
import { RULE_IDS } from "./types";

/** Years a single build has to lift a council to backing you. */
export const LEVER_YEARS = 4;

export interface LeverCount {
  /** Councils under `backs_at` at an election, over the games watched. */
  cases: number;
  /** Of those, the ones a single affordable build there lifted to `backs_at` within `LEVER_YEARS`. */
  lifted: number;
}

/** Builds and upgrades touching `code` that are blocked by nothing but coins, and cost at most `budget`. */
function leversThere(model: BoardModel, all: ActionOption[], code: CouncilCode, budget: number): ActionOption[] {
  return all.filter((o) => (o.action.kind === "build" || o.action.kind === "upgrade")
    && o.cost <= budget && o.blockers.every((b) => b.kind === "coins")
    && optionCouncils(model, o).includes(code));
}

/** Does `code` reach `backsAt` at some year's close within `years`, from `state` with nothing else done? */
function reaches(model: BoardModel, state: BoardState, code: CouncilCode, backsAt: number, years: number): boolean {
  const perYear = Math.max(1, stepsOf(model, 1));
  let s = state;
  for (let y = 0; y < years && s.phase !== "ended"; y++) {
    s = runAhead(realEngine, model, s, perYear, true);
    if ((s.councils[code]?.backing ?? 0) >= backsAt) return true;
  }
  return false;
}

/** The lever cases at one state (an election just held): councils under 5, and how many one build lifts. */
export function leverCases(model: BoardModel, state: BoardState, years = LEVER_YEARS): LeverCount {
  const backsAt = param(model, RULE_IDS.election, "backs_at");
  const below = model.game.councils.filter((c) => (state.councils[c]?.backing ?? 10) < backsAt);
  if (below.length === 0) return { cases: 0, lifted: 0 };
  const base = answerAll(realEngine, model, state);
  const budget = base.coins + income(model, base);
  const all = options(model, base);
  let lifted = 0;
  for (const code of below) {
    const tries = leversThere(model, all, code, budget);
    const ok = tries.some((o) => {
      try {
        const after = realAct(model, { ...base, coins: Math.max(base.coins, o.cost) }, o.action);
        return reaches(model, after, code, backsAt, years);
      } catch {
        return false;
      }
    });
    if (ok) lifted++;
  }
  return { cases: below.length, lifted };
}

/** Watches a game at each election: pass `observe` to `playGame`, then read `count()`. */
export function leverWatch(model: BoardModel): { observe: (s: BoardState) => void; count: () => LeverCount } {
  const total: LeverCount = { cases: 0, lifted: 0 };
  const seen = new Set<number>();
  return {
    observe: (s) => {
      const last = s.election.records[s.election.records.length - 1];
      if (!last || last.step !== s.step || seen.has(s.step)) return;
      seen.add(s.step);
      const c = leverCases(model, s);
      total.cases += c.cases;
      total.lifted += c.lifted;
    },
    count: () => ({ ...total }),
  };
}
