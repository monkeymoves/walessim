/**
 * Special mechanics (`EffectSpecial`, types-content.ts): which ones stand on the board now. Each is
 * named by one keystone or legacy project (docs/design/v2-board.md sections 5.3 and 16.3.5) and is
 * switched on by a working project that carries it. The code that acts on each one lives with the
 * rule it changes; this module only answers "does it stand, and where".
 */
import { siteCouncils } from "./conditions";
import type { BoardModel, BoardState, CouncilCode, EffectSpecial, ProjectDef } from "./types";

/** Does this project carry the special? */
export const carries = (def: ProjectDef | undefined, special: EffectSpecial): boolean =>
  !!def?.effects.some((e) => e.kind === "special" && e.special === special);

/** Working projects that carry the special. */
function standing(model: BoardModel, state: BoardState, special: EffectSpecial) {
  return state.projects.filter((p) => p.status === "working" && carries(model.projects.find((d) => d.id === p.project), special));
}

/** Does a working project with this special stand anywhere on the board? */
export const specialStands = (model: BoardModel, state: BoardState, special: EffectSpecial): boolean =>
  standing(model, state, special).length > 0;

/** Councils where a working project with this special stands (both ends for a link project). */
export function specialCouncils(model: BoardModel, state: BoardState, special: EffectSpecial): Set<CouncilCode> {
  return new Set(standing(model, state, special).flatMap((p) => siteCouncils(model, p)));
}
