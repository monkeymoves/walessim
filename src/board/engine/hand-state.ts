/**
 * Test helper: a 2026 board state made by hand from a model, without the clock, so the people,
 * events, score and ending tests do not depend on the order of a step. Real seeds come from
 * seed.ts. Not used by the game.
 */
import { hashSeed } from "../../engine/rng";
import { makeCtx, type StepCtx } from "./ctx";
import { makeFrame } from "./frame";
import { seedCouncils } from "./seed";
import { closesYear, stepsOf, yearOfStep } from "./time";
import type { BoardModel, BoardState, FutureId, ProjectState, StartId } from "./types";

export function handState(model: BoardModel, opts: { start?: StartId; future?: FutureId; gameNumber?: number } = {}): BoardState {
  const gameNumber = opts.gameNumber ?? 7;
  const state: BoardState = {
    version: 2, modelHash: model.meta.hash, gameNumber, seed: hashSeed(gameNumber),
    start: opts.start ?? model.starts[0]!.id, future: opts.future ?? model.futures[0]!.id,
    step: 0, year: model.game.first_year, phase: "play", log: [], councils: seedCouncils(model),
    linkQuality: Object.fromEntries(model.links.filter((l) => l.kind === "rail").map((l) => [l.id, l.quality ?? 1])),
    projects: [], coins: 6, freeProject: null, laws: [], lawChangesLeft: 1,
    election: { records: [], hungUntil: null, strongUntil: null },
    promise: { byYear: 2034, kept: null }, forecast: [], pending: [], events: [], severityUsed: 0,
    openVisitSince: null, history: [], ledger: [], story: { chapters: [], moments: [] }, deals: [],
  };
  state.history = [makeFrame(model, state, 0)];
  return state;
}

/** A context on a state, as the clock makes one. */
export const ctxOf = (model: BoardModel, state: BoardState): StepCtx => makeCtx(model, state);

/** Move the hand state on one step, taking the yearly frame when a year closes. Nothing else happens. */
export function nextStep(model: BoardModel, state: BoardState): void {
  state.step += 1;
  state.year = yearOfStep(model, state.step);
  if (closesYear(model, state.step)) state.history.push(makeFrame(model, state, state.step));
}

/** Move the hand state on `years` years, step by step (phase 1's turn was two years). */
export function nextYears(model: BoardModel, state: BoardState, years: number): void {
  for (let i = 0; i < stepsOf(model, years); i++) nextStep(model, state);
}

/** A working project at a council (or on a link), as if built at `step`. */
export function standing(project: string, site: ProjectState["site"], step = 0, status: ProjectState["status"] = "working"): ProjectState {
  const where = site.council ?? site.link;
  return { id: `${project}@${where}`, project, site, level: 1, status, startedStep: step, readyStep: step, roots: 1, joined: false };
}
