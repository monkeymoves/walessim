/**
 * The run-up to an election (cold playtest 10, the games critic's one change: "tell me at each
 * election exactly which council to win and why"). In the last year before each election the
 * clock raises a card that names the councils that would tip the result and how far each is from
 * backing you. What it names comes from package C's pure function (../electionTargets.ts
 * `electionTargets`, drawn by ../TargetsCard.tsx), the same the term report and the council panel
 * read, so the three never disagree. This file says only when: tested in runup.test.ts.
 */
import type { BoardModel, BoardState, CouncilCode } from "../../engine/api";
import { stepOfYear, stepsOf } from "../../engine/api";
import { electionTargets } from "../electionTargets";

/** The step of the next election held after `step`, or null after the last. */
export function nextElectionStep(model: BoardModel, step: number): number | null {
  const steps = model.game.election_years.map((y) => stepOfYear(model, y)).filter((s) => s > step);
  return steps.length ? Math.min(...steps) : null;
}

/** True on the first step of the last year before an election: when the run-up card is raised. */
export function opensRunUp(model: BoardModel, step: number): boolean {
  const next = nextElectionStep(model, step);
  return next !== null && next - step === stepsOf(model, 1);
}

/** The council the card's Look opens: the first to bring round, or else the first to keep. */
export function runUpCouncil(model: BoardModel, state: BoardState): CouncilCode | null {
  const tg = electionTargets(model, state);
  return tg?.win?.[0]?.code ?? tg?.hold[0]?.code ?? null;
}
