/**
 * What a law change would do to backing, council by council, before you make it (playtest 9,
 * must-fix 2: "3 of 10 councils back you" a moment after three laws, with "some people will mind"
 * the only warning). Worked out by the engine itself: the change is applied to a copy of the board
 * and each council's backing and the election count compared, so the sheet can never say other
 * than what passing it does.
 */
import { act } from "../engine/api";
import type { BoardModel, BoardState, CouncilCode } from "../engine/api";
import { councilView, election } from "./engine";

export interface LawCost {
  /** Backing change in each council that moves by at least 0.05, largest fall first. */
  changes: { council: CouncilCode; delta: number }[];
  backersNow: number;
  backersAfter: number;
}

export function lawCost(model: BoardModel, state: BoardState, law: string, pass: boolean): LawCost | null {
  try {
    // judged as if a change were left, so the cost shows even when this term's change is used
    const after = act(model, { ...state, lawChangesLeft: Math.max(1, state.lawChangesLeft) }, { kind: "law", law, pass });
    const changes = model.game.councils
      .map((council) => ({ council, delta: councilView(model, after, council).backing - councilView(model, state, council).backing }))
      .filter((c) => Math.abs(c.delta) >= 0.05)
      .sort((a, b) => a.delta - b.delta);
    return { changes, backersNow: election(model, state).backers, backersAfter: election(model, after).backers };
  } catch {
    return null;
  }
}
