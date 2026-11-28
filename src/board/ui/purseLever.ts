/**
 * The lever a full purse can pull (rule P7; playtest 10 should-fix 1, coins piling up, and
 * must-fix 4, backing stuck under 5 with no lever in sight): the full purse card names one build
 * that would move backing where you need it.
 */
import { t, tn } from "./lang";
import type { BoardModel, BoardState } from "../engine/api";
import { councilView } from "./engine";
import { backersNow } from "./electionTargets";
import { councilName, measureName, num, projectName } from "./words";

/**
 * Where a full purse would move backing (rule P7, playtest 10 should-fix 1 and must-fix 4): of the
 * councils that do not back you, the one closest to the line with a build it asks for that you can
 * make now. "" when there is none.
 */
export function purseLever(model: BoardModel, state: BoardState): string {
  const backing = new Set(backersNow(model, state).backers);
  const rows = model.game.councils
    .filter((c) => !backing.has(c) && state.councils[c])
    .sort((a, b) => state.councils[b]!.backing - state.councils[a]!.backing || a.localeCompare(b));
  for (const code of rows) {
    let v;
    try { v = councilView(model, state, code); } catch { continue; }
    const b = v.lever?.builds.find((x) => x.allowed);
    if (!b || !v.lever.points) continue;
    return t("boardui.stop.purse_full.lever", {
      council: councilName(model, code), measure: measureName(model, b.measure), project: projectName(model, b.project),
      cost: tn("boardui.respond.cost", b.cost), points: num(v.lever.points), years: num(v.lever.years), year: b.readyYear,
    });
  }
  return "";
}

