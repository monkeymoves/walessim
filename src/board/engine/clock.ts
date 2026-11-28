/**
 * The clock (docs/design/v2-board.md section 16.2, ADR 0007): a new game, actions at any step,
 * one step (`tick`), many steps (`advance`) and `replay` of a log. Replaces phase 1's turn.ts.
 * The order inside a step is in clock-step.ts.
 *
 * Every state handed out is a fresh copy: the caller's state is never changed. `advance` clones
 * once and steps in place. Speed and pauses live in the UI and never reach the state, so the
 * same actions at the same steps give the same game at any speed.
 */
import { hashSeed } from "../../engine/rng";
import { applyBuild, applyLaw, applyUpgrade, settleVisit } from "./actions";
import { openingCoins } from "./budget";
import { phaseOf, runStep } from "./clock-step";
import { makeCtx } from "./ctx";
import { takeDeal } from "./deals";
import { BoardActionError, BoardRunError } from "./errors";
import { drawFuture, forecastNext, respond } from "./events";
import { makeFrame } from "./frame";
import { applyLinkQuality } from "./held";
import { gradeVisit, seedPeople } from "./people";
import { blockers } from "./projects";
import { seedCouncils } from "./seed";
import type { Action, BoardModel, BoardState, LoggedAction, StartId, Stop, StopKind, StepReport } from "./types";

export { phaseOf, stepsPerYear } from "./clock-step";

/** A new game at step 0, May 2026: the real board, the start, the future drawn from the game number. */
export function newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState {
  const startDef = model.starts.find((s) => s.id === start);
  if (!startDef) throw new BoardActionError([{ kind: "not_offered" }], `No start called ${start}`);
  const seed = hashSeed(gameNumber);
  const state: BoardState = {
    version: 2, modelHash: model.meta.hash, gameNumber, seed, start, future: drawFuture(model, seed),
    step: 0, year: model.game.first_year, phase: "play", log: [], councils: seedCouncils(model), linkQuality: {},
    projects: [], coins: 0, freeProject: startDef.free_project, laws: [], lawChangesLeft: 1,
    election: { records: [], hungUntil: null, strongUntil: null }, promise: { byYear: startDef.promise.by_year, kept: null },
    forecast: [], pending: [], events: [], severityUsed: 0, openVisitSince: null, history: [], ledger: [],
    story: { chapters: [], moments: [] }, deals: [],
  };
  applyLinkQuality(model, state);
  const ctx = makeCtx(model, state, 0);
  seedPeople(ctx);
  openingCoins(ctx);
  state.history.push(makeFrame(model, state, 0));
  forecastNext(ctx);
  state.phase = phaseOf(model, state);
  return state;
}

/** Apply an allowed action to a draft in place and log it at the current step. */
function applyAction(model: BoardModel, draft: BoardState, action: Action): void {
  const ctx = makeCtx(model, draft);
  switch (action.kind) {
    case "build": applyBuild(ctx, action); break;
    case "upgrade": applyUpgrade(ctx, action); break;
    case "law": applyLaw(ctx, action); break;
    case "respond": respond(ctx, action.event, action.response); break;
    case "deal": takeDeal(ctx, action); break;
    case "visit": {
      const pending = draft.pending.find((p) => p.kind === "visit" && p.place === action.place);
      if (pending && pending.kind === "visit") settleVisit(ctx, action, gradeVisit(ctx, action, pending));
      break;
    }
  }
  draft.log.push({ at: draft.step, action: structuredClone(action) });
  draft.phase = phaseOf(model, draft);
}

/** Apply one action at the current step. Throws `BoardActionError` with the same blockers `options` shows if it is not allowed. */
export function act(model: BoardModel, state: BoardState, action: Action): BoardState {
  const b = blockers(model, state, action);
  if (b.length > 0) throw new BoardActionError(b);
  const draft = structuredClone(state);
  applyAction(model, draft, action);
  return draft;
}

function canRun(state: BoardState): void {
  if (state.phase === "ended") throw new BoardActionError([{ kind: "phase", phase: "ended" }], "The game is over");
  if (state.phase === "respond") throw new BoardActionError([{ kind: "phase", phase: "respond" }], "An event is waiting for an answer");
}

/** One step. Throws `BoardActionError` while an event waits for an answer or the game is over. */
export function tick(model: BoardModel, state: BoardState): { state: BoardState; report: StepReport } {
  canRun(state);
  const draft = structuredClone(state);
  const report = runStep(model, draft, false);
  return { state: draft, report };
}

export interface AdvanceOptions {
  /** At most this many steps. */
  maxSteps: number;
  /** Also stop on these soft stops (hard stops always stop). */
  stopOn?: StopKind[];
  /** Skip the year and term report lines, for bots looking ahead. The state is the same either way. */
  light?: boolean;
}

/**
 * Steps until a hard stop, a stop named in `stopOn`, or `maxSteps`. Used by step by step mode
 * ("Run to the next moment"), bots, tests and replay. Throws like `tick` if it cannot run now.
 * `stopped` is the stop that ended the run, or null when `maxSteps` ran out.
 */
export function advance(model: BoardModel, state: BoardState, opts: AdvanceOptions): { state: BoardState; reports: StepReport[]; stopped: Stop | null } {
  canRun(state);
  const draft = structuredClone(state);
  const reports: StepReport[] = [];
  const wanted = new Set(opts.stopOn ?? []);
  for (let i = 0; i < opts.maxSteps; i++) {
    const report = runStep(model, draft, !!opts.light);
    reports.push(report);
    const stop = report.stops.find((x) => x.hard || wanted.has(x.kind));
    if (stop) return { state: draft, reports, stopped: stop };
    if (draft.phase !== "play") break;
  }
  return { state: draft, reports, stopped: null };
}

/**
 * Replay a log from a game number and start, then run on to `stepReached` (default: the last
 * logged step). The run code, saves and the determinism test all go through here. Throws
 * `BoardRunError` when the log cannot be replayed (an action not allowed, or the clock held).
 */
export function replay(model: BoardModel, gameNumber: number | string, start: StartId, log: readonly LoggedAction[], stepReached?: number): BoardState {
  const draft = newBoard(model, gameNumber, start);
  const runTo = (step: number) => {
    while (draft.step < step) {
      if (draft.phase !== "play") throw new BoardRunError(`The log cannot run past step ${draft.step}: the clock is held (${draft.phase})`);
      runStep(model, draft, true);
    }
  };
  for (const entry of log) {
    if (entry.at < draft.step) throw new BoardRunError("The log goes back in time");
    runTo(entry.at);
    const b = blockers(model, draft, entry.action);
    if (b.length > 0) throw new BoardRunError(`The log has an action that is not allowed at step ${entry.at}: ${b.map((x) => x.kind).join(", ")}`);
    applyAction(model, draft, entry.action);
  }
  runTo(Math.min(stepReached ?? draft.step, model.game.steps));
  return draft;
}
