/**
 * The lever on a council (playtest 10 must-fix 4: "backing sat at 4.9 whatever I built"): what
 * holds its Backing (people expect more each term, rule P1) and the builds a player can make there
 * to move it (rule P7: a new project that lifts what the council asks for). The council panel and
 * the build menu read it through `councilView(...).lever`.
 */
import { answerPoints, answersOf, answerYears } from "./asked";
import { expectedGain } from "./people-moods";
import { options, projectDef } from "./projects";
import type { BoardModel, BoardState, CouncilCode, CouncilLever, LeverBuild } from "./types";

/** Answering builds shown at most. */
const SHOWN = 3;

export function councilLever(model: BoardModel, state: BoardState, code: CouncilCode): CouncilLever {
  const builds: LeverBuild[] = [];
  if (answerPoints(model) > 0) {
    for (const o of options(model, state, code)) {
      if (o.action.kind !== "build" || o.readyYear === undefined) continue;
      // Only builds blocked by nothing but coins: one the player could make with enough coins.
      if (!o.blockers.every((b) => b.kind === "coins")) continue;
      const def = projectDef(model, o.action.project);
      const answer = def ? answersOf(model, state, def, o.action.site).find((a) => a.council === code) : undefined;
      if (!answer) continue;
      builds.push({ project: o.action.project, measure: answer.measure, cost: o.cost, readyYear: o.readyYear, allowed: o.allowed, short: Math.max(0, Math.ceil(o.cost - state.coins)) });
    }
  }
  builds.sort((a, b) => a.cost - b.cost || a.readyYear - b.readyYear || a.project.localeCompare(b.project));
  return { expects: Math.round(expectedGain(model, state) * 100) / 100, points: answerPoints(model), years: answerYears(model), builds: builds.slice(0, SHOWN) };
}
