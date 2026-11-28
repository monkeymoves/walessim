/**
 * The order of a game and of a turn (docs/design/v2-board.md sections 3 and 12). This file only
 * orders calls; each step lives in the module that owns it.
 *
 * endTurn, for turn t (two years):
 * 1. builds finish (status working at the end of their ready turn), rail quality follows;
 * 2. held effects of projects, pairs and laws move to their targets (held.ts);
 * 3. the warned events land (events.ts, package 3), before spread so a job loss travels home now;
 * 4. spread S1, S2, S3 along links (spread.ts);
 * 5. the promise is judged in its year, moods and Backing move, an election in election years
 *    (people.ts, package 3);
 * 6. coins for the next turn (budget.ts);
 * 7. the report, the turn and year move on, the frame, and the forecast for the next turn.
 *
 * Every state handed out is a fresh copy: the caller's state is never changed.
 */
import { hashSeed } from "../../engine/rng";
import { applyBuild, applyLaw, applyUpgrade, settleVisit } from "./actions";
import { openingCoins, settleCoins } from "./budget";
import { makeCtx } from "./ctx";
import { BoardActionError } from "./errors";
import { drawFuture, forecastNext, landEvents, respond } from "./events";
import { reportLines } from "./explain";
import { makeFrame } from "./frame";
import { applyHeld, applyLinkQuality } from "./held";
import { gradeVisit, holdElection, judgePromise, seedPeople, updatePeople } from "./people";
import { blockers } from "./projects";
import { seedCouncils } from "./seed";
import { runSpread } from "./spread";
import type { Action, BoardModel, BoardState, Phase, StartId, TurnReport } from "./types";

const phaseOf = (model: BoardModel, s: BoardState): Phase =>
  s.turn >= model.game.turns ? "ended" : s.pending.some((p) => p.kind === "respond") ? "respond" : "build";

export function newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState {
  const startDef = model.starts.find((s) => s.id === start);
  if (!startDef) throw new BoardActionError([{ kind: "not_offered" }], `No start called ${start}`);
  const seed = hashSeed(gameNumber);
  const state: BoardState = {
    version: 1, modelHash: model.meta.hash, gameNumber, seed, start, future: drawFuture(model, seed),
    turn: 0, year: model.game.first_year, phase: "build", steps: [], councils: seedCouncils(model), linkQuality: {},
    projects: [], coins: 0, freeProject: startDef.free_project, laws: [], lawChangesLeft: 1,
    election: { records: [], weakUntil: null, strongUntil: null }, promise: { byYear: startDef.promise.by_year, kept: null },
    forecast: [], pending: [], events: [], severityUsed: 0, visitsThisTurn: 0, history: [], ledger: [],
  };
  applyLinkQuality(model, state);
  const ctx = makeCtx(model, state, 0);
  seedPeople(ctx);
  openingCoins(ctx);
  state.history.push(makeFrame(model, state, 0, []));
  forecastNext(ctx);
  state.phase = phaseOf(model, state);
  return state;
}

/** Apply one action. Throws `BoardActionError` with the same blockers `options` shows if it is not allowed. */
export function act(model: BoardModel, state: BoardState, action: Action): BoardState {
  const b = blockers(model, state, action);
  if (b.length > 0) throw new BoardActionError(b);
  const draft = structuredClone(state);
  const ctx = makeCtx(model, draft);
  switch (action.kind) {
    case "build": applyBuild(ctx, action); break;
    case "upgrade": applyUpgrade(ctx, action); break;
    case "law": applyLaw(ctx, action); break;
    case "respond": respond(ctx, action.event, action.response); break;
    case "visit": {
      const pending = draft.pending.find((p) => p.kind === "visit" && p.place === action.place);
      if (pending && pending.kind === "visit") settleVisit(ctx, action, gradeVisit(ctx, action, pending));
      break;
    }
  }
  draft.steps.push(structuredClone(action));
  draft.phase = phaseOf(model, draft);
  return draft;
}

/** Two years pass. Returns the new state and the report of the turn that ended. */
export function endTurn(model: BoardModel, state: BoardState): { state: BoardState; report: TurnReport } {
  if (state.phase === "ended") throw new BoardActionError([{ kind: "phase", phase: "ended" }], "The game is over");
  const draft = structuredClone(state);
  const t = draft.turn;
  const fromYear = draft.year;
  const ctx = makeCtx(model, draft, t);

  // A visit offered by a build is for this turn only.
  draft.pending = draft.pending.filter((p) => !(p.kind === "visit" && "project" in p.offeredBy));
  const finished: string[] = [];
  for (const p of draft.projects) {
    if (p.readyTurn !== t) continue;
    if (p.status === "building") p.status = "working";
    finished.push(p.id);
  }
  applyLinkQuality(model, draft);
  applyHeld(ctx);
  const landed = landEvents(ctx);
  runSpread(ctx);
  judgePromise(ctx);
  updatePeople(ctx);
  const election = holdElection(ctx);
  const coins = settleCoins(ctx);
  const lines = reportLines(model, draft, t, model.game.report_lines_max);

  draft.turn = t + 1;
  draft.year = fromYear + model.game.turn_years;
  draft.visitsThisTurn = 0;
  draft.steps.push({ kind: "end_turn" });
  draft.history.push(makeFrame(model, draft, t + 1, ctx.flows));
  const ended = draft.turn >= model.game.turns;
  if (ended) draft.forecast = [];
  else forecastNext(makeCtx(model, draft, t + 1));
  draft.phase = phaseOf(model, draft);

  const report: TurnReport = {
    turn: t, fromYear, toYear: draft.year, lines, finished, flows: draft.history[draft.history.length - 1]!.flows,
    events: landed.records, ...(election ? { election } : {}), coins, pending: structuredClone(draft.pending), ended,
  };
  return { state: draft, report };
}
