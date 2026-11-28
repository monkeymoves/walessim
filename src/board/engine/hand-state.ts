/**
 * Test helper: a 2026 board state made by hand from a model, without turn.ts, so the people,
 * events, score and ending tests do not depend on the turn order. Real seeds come from seed.ts.
 * Not used by the game.
 */
import { hashSeed } from "../../engine/rng";
import { makeCtx, type TurnCtx } from "./ctx";
import { makeFrame } from "./frame";
import { seedCouncils } from "./seed";
import type { BoardModel, BoardState, FutureId, ProjectState, StartId } from "./types";

export function handState(model: BoardModel, opts: { start?: StartId; future?: FutureId; gameNumber?: number } = {}): BoardState {
  const gameNumber = opts.gameNumber ?? 7;
  const state: BoardState = {
    version: 1, modelHash: model.meta.hash, gameNumber, seed: hashSeed(gameNumber),
    start: opts.start ?? model.starts[0]!.id, future: opts.future ?? model.futures[0]!.id,
    turn: 0, year: model.game.first_year, phase: "build", steps: [], councils: seedCouncils(model),
    linkQuality: Object.fromEntries(model.links.filter((l) => l.kind === "rail").map((l) => [l.id, l.quality ?? 1])),
    projects: [], coins: 6, freeProject: null, laws: [], lawChangesLeft: 1,
    election: { records: [], weakUntil: null, strongUntil: null },
    promise: { byYear: 2034, kept: null }, forecast: [], pending: [], events: [], severityUsed: 0,
    visitsThisTurn: 0, history: [], ledger: [],
  };
  state.history = [makeFrame(model, state, 0, [])];
  return state;
}

/** A context on a state, as turn.ts makes one. */
export const ctxOf = (model: BoardModel, state: BoardState): TurnCtx => makeCtx(model, state);

/** Move the hand state on one turn: snapshot the board as the frame at the end of this turn. */
export function nextTurn(model: BoardModel, state: BoardState): void {
  state.history.push(makeFrame(model, state, state.turn + 1, []));
  state.turn += 1;
  state.year += model.game.turn_years;
}

/** A working project at a council (or on a link), as if built in `turn`. */
export function standing(project: string, site: ProjectState["site"], turn = 0, status: ProjectState["status"] = "working"): ProjectState {
  const where = site.council ?? site.link;
  return { id: `${project}@${where}`, project, site, level: 1, status, startedTurn: turn, readyTurn: turn };
}
