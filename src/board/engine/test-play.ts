/**
 * A small seeded player for engine tests (not one of the balance bots in bots.ts). Each turn it
 * answers any event with its first affordable response, takes a visit if offered, then builds or
 * upgrades up to `perTurn` times, choosing among allowed options with the seeded generator.
 */
import { mulberry32 } from "../../engine/rng";
import { options } from "./projects";
import { act, endTurn, newBoard } from "./turn";
import type { ActionOption, BoardModel, BoardState, StartId, TurnReport } from "./types";

export interface PlayResult {
  state: BoardState;
  reports: TurnReport[];
}

/** Prefer higher tiers and upgrades, so a game climbs the tree; ties broken by the seed. */
function choose(opts: ActionOption[], r: () => number): ActionOption | undefined {
  if (opts.length === 0) return undefined;
  const scored = opts.map((o) => ({ o, s: (o.tier ?? 0) * 2 + (o.action.kind === "upgrade" ? 1 : 0) + r() * 3 }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.o;
}

export function playGame(model: BoardModel, gameNumber: number | string, start: StartId, perTurn = 3): PlayResult {
  const r = mulberry32(typeof gameNumber === "number" ? gameNumber + 1 : gameNumber.length + 7);
  let state = newBoard(model, gameNumber, start);
  const reports: TurnReport[] = [];
  while (state.phase !== "ended") {
    for (const kind of ["respond", "visit"] as const) {
      const o = options(model, state).find((x) => x.allowed && x.action.kind === kind);
      if (o) state = act(model, state, o.action);
    }
    for (let i = 0; i < perTurn; i++) {
      const o = choose(options(model, state).filter((x) => x.allowed && (x.action.kind === "build" || x.action.kind === "upgrade")), r);
      if (!o) break;
      state = act(model, state, o.action);
    }
    const out = endTurn(model, state);
    state = out.state;
    reports.push(out.report);
  }
  return { state, reports };
}
