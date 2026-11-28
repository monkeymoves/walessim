/**
 * A small seeded player for engine tests (not one of the balance bots in bots.ts). When a year
 * closes, and at every hard stop, it answers any event with its first affordable response, takes
 * a visit if offered, then builds or upgrades up to `perYear` times, choosing among allowed
 * options with the seeded generator. Then it runs the clock on to the next year or stop.
 */
import { mulberry32 } from "../../engine/rng";
import { advance, act, newBoard } from "./clock";
import { stepsPerYear } from "./clock-step";
import { options } from "./projects";
import type { ActionOption, BoardModel, BoardState, StartId, StepReport } from "./types";

export interface PlayResult {
  state: BoardState;
  reports: StepReport[];
}

/** Prefer higher tiers and upgrades, so a game climbs the tree; ties broken by the seed. */
function choose(opts: ActionOption[], r: () => number): ActionOption | undefined {
  if (opts.length === 0) return undefined;
  const scored = opts.map((o) => ({ o, s: (o.tier ?? 0) * 2 + (o.action.kind === "upgrade" ? 1 : 0) + r() * 3 }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.o;
}

export function playGame(model: BoardModel, gameNumber: number | string, start: StartId, perYear = 2): PlayResult {
  const r = mulberry32(typeof gameNumber === "number" ? gameNumber + 1 : gameNumber.length + 7);
  let state = newBoard(model, gameNumber, start);
  const reports: StepReport[] = [];
  while (state.phase !== "ended") {
    for (let i = 0; i < 4 && state.phase === "respond"; i++) {
      const o = options(model, state).find((x) => x.allowed && x.action.kind === "respond");
      if (o) state = act(model, state, o.action);
    }
    const v = options(model, state).find((x) => x.allowed && x.action.kind === "visit");
    if (v) state = act(model, state, v.action);
    for (let i = 0; i < perYear; i++) {
      const o = choose(options(model, state).filter((x) => x.allowed && (x.action.kind === "build" || x.action.kind === "upgrade")), r);
      if (!o) break;
      state = act(model, state, o.action);
    }
    if (state.phase !== "play") break;
    const out = advance(model, state, { maxSteps: stepsPerYear(model) });
    state = out.state;
    reports.push(...out.reports);
  }
  return { state, reports };
}
