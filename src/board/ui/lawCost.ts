/**
 * What a law change would do to backing, council by council, before you make it (playtest 9,
 * must-fix 2: "3 of 10 councils back you" a moment after three laws, with "some people will mind"
 * the only warning). Worked out by the engine itself: the change is applied to a copy of the board
 * and each council's backing compared, so the sheet can never say other than what passing it does.
 *
 * The counts are of live backing (`backersNow`), never `election()`: on an election step that
 * returns the count just held, before and after alike, which is exactly when a win offers a law
 * (playtest 10, must-fix 2: "9 of 10 now, 9 after" as six councils were about to drop).
 */
import { act } from "../engine/api";
import type { BoardModel, BoardState, CouncilCode, ElectionResult } from "../engine/api";
import { backersNow } from "./electionTargets";
import { councilView } from "./engine";

export interface LawCost {
  /** Backing change in each council that moves by at least 0.05, largest fall first. */
  changes: { council: CouncilCode; delta: number }[];
  backersNow: number;
  backersAfter: number;
  /** Councils that back you now and would not after, and the reverse. */
  lost: CouncilCode[];
  won: CouncilCode[];
  /** The next election if held now, and after the change. */
  resultNow: ElectionResult;
  resultAfter: ElectionResult;
}

export function lawCost(model: BoardModel, state: BoardState, law: string, pass: boolean): LawCost | null {
  try {
    // judged as if a change were left, so the cost shows even when this term's change is used
    const after = act(model, { ...state, lawChangesLeft: Math.max(1, state.lawChangesLeft) }, { kind: "law", law, pass });
    const changes = model.game.councils
      .map((council) => ({ council, delta: councilView(model, after, council).backing - councilView(model, state, council).backing }))
      .filter((c) => Math.abs(c.delta) >= 0.05)
      .sort((a, b) => a.delta - b.delta);
    const now = backersNow(model, state), then = backersNow(model, after);
    return {
      changes,
      backersNow: now.backers.length,
      backersAfter: then.backers.length,
      lost: now.backers.filter((c) => !then.backers.includes(c)),
      won: then.backers.filter((c) => !now.backers.includes(c)),
      resultNow: now.result,
      resultAfter: then.result,
    };
  } catch {
    return null;
  }
}
