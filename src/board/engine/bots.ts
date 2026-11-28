/**
 * The strategy bots of docs/design/v2-board.md section 13.2, and a runner that plays one to 2050.
 * Bots play through the same engine calls as the UI (`newBoard`, `options`, `act`, `endTurn`), so a
 * bot's game is an ordinary run: its steps replay to the same state.
 *
 * Each turn a bot answers any landed event, plays any place visit, then builds until its chooser
 * returns null, and ends the turn. An action the engine refuses is skipped for the rest of that turn.
 */
import { hashSeed } from "../../engine/rng";
import { BoardActionError } from "./errors";
import { endTurn as realEndTurn, newBoard as realNewBoard, act as realAct } from "./turn";
import { options as realOptions } from "./projects";
import type { BoardEngine, BotView } from "./bots-common";
import { actionKey, pickResponse, pickVisit } from "./bots-common";
import type { Bot } from "./bots-strategies";
import { autopilot, branchBot, cardiffFirst, random, reactive, secondBranch, skilled } from "./bots-strategies";
import type { Action, BoardModel, BoardState, StartId } from "./types";

export type { Bot } from "./bots-strategies";
export type { BoardEngine } from "./bots-common";

/** The real engine (package 2's turn.ts and projects.ts). */
export const realEngine: BoardEngine = { newBoard: realNewBoard, options: realOptions, act: realAct, endTurn: realEndTurn };

/** The nine bots: Autopilot, Random, Reactive, one per branch (four), Cardiff first and Skilled. */
export function allBots(model: BoardModel): Bot[] {
  const branches = model.branches.slice(0, 4).map((b) => branchBot(b.id, secondBranch(model, b.id)));
  return [autopilot, random, reactive, ...branches, cardiffFirst, skilled()];
}

export { autopilot, branchBot, cardiffFirst, random, reactive, skilled };

/** A safety stop: no bot takes more than this many actions in one turn. */
const MAX_ACTIONS = 12;

function tryAct(v: BotView, action: Action): boolean {
  try {
    v.state = v.engine.act(v.model, v.state, action);
    return true;
  } catch (e) {
    if (!(e instanceof BoardActionError)) throw e;
    v.tried.add(actionKey(action));
    return false;
  }
}

/** Play one turn's actions for a bot (not the end of the turn). */
export function playTurn(v: BotView, bot: Bot): void {
  v.tried = new Set();
  for (const p of [...v.state.pending]) {
    if (p.kind === "respond") {
      const response = pickResponse(v.model, v.state, p.event, bot.careful);
      if (response) tryAct(v, { kind: "respond", event: p.event, response });
    } else if (bot.careful && v.state.visitsThisTurn < v.model.game.visits_per_turn) {
      tryAct(v, { kind: "visit", place: p.place, picks: pickVisit(v.model, v.state, p.place, true) });
    }
  }
  for (let i = 0; i < MAX_ACTIONS; i++) {
    const o = bot.next(v);
    if (!o) break;
    tryAct(v, o.action);
  }
}

/** Play a whole game: the bot's choices every turn, to 2050. */
export function playGame(model: BoardModel, bot: Bot, gameNumber: number | string, start: StartId, engine: BoardEngine = realEngine): BoardState {
  const v: BotView = { model, engine, state: engine.newBoard(model, gameNumber, start), seed: hashSeed(`${bot.id}:${gameNumber}`), tried: new Set() };
  for (let t = 0; t < model.game.turns && v.state.phase !== "ended"; t++) {
    playTurn(v, bot);
    v.state = engine.endTurn(model, v.state).state;
  }
  return v.state;
}

/** The start for a game number in a balance run: every start in turn, so all are played equally. */
export function startFor(model: BoardModel, gameNumber: number): StartId {
  return model.starts[gameNumber % model.starts.length]!.id;
}
