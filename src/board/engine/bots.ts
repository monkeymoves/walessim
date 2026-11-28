/**
 * The strategy bots of docs/design/v2-board.md sections 13.2 and 16.6, and a runner that plays one
 * to 2050. Bots play through the same engine calls as the UI (`newBoard`, `options`, `act`,
 * `advance`), so a bot's game is an ordinary run: its log replays to the same state.
 *
 * A bot decides at the start, when a year closes (in the last step of each year, with the year's
 * coins in hand), and at stops: every hard stop (an event to answer, an election and its deal)
 * and a place visit. At each decision it answers any landed event, plays any place visit, takes
 * any deal on offer, keeps an open deal when careful, then builds until its chooser returns null,
 * and runs the clock on. An action the engine refuses is skipped for the rest of that decision.
 */
import { hashSeed } from "../../engine/rng";
import { BoardActionError } from "./errors";
import { advance as realAdvance, newBoard as realNewBoard, act as realAct, stepsPerYear } from "./clock";
import { options as realOptions } from "./projects";
import type { BoardEngine, BotView } from "./bots-common";
import { actionKey, answerAll, keepDealOption, pickDeal, pickResponse, pickVisit } from "./bots-common";
import type { Bot } from "./bots-strategies";
import { autopilot, branchBot, cardiffFirst, random, reactive, rescue, scatter, secondBranch, skilled, sleeper } from "./bots-strategies";
import type { Action, BoardModel, BoardState, StartId, StopKind } from "./types";

export type { Bot } from "./bots-strategies";
export type { BoardEngine } from "./bots-common";

/** The real engine (clock.ts and projects.ts). */
export const realEngine: BoardEngine = { newBoard: realNewBoard, options: realOptions, act: realAct, advance: realAdvance };

/**
 * The twelve bots: Autopilot, Random, Reactive, one per branch (four), Cardiff first, Skilled,
 * Sleeper, Rescue and Scatter.
 */
export function allBots(model: BoardModel): Bot[] {
  const branches = model.branches.slice(0, 4).map((b) => branchBot(b.id, secondBranch(model, b.id)));
  return [autopilot, random, reactive, ...branches, cardiffFirst, skilled(), sleeper(), rescue(), scatter()];
}

export { autopilot, branchBot, cardiffFirst, random, reactive, rescue, scatter, skilled, sleeper };

/** A safety stop: no bot takes more than this many actions at one decision. */
const MAX_ACTIONS = 12;

/** Soft stops a bot also acts at (hard stops always stop the clock). */
export const BOT_STOPS: StopKind[] = ["visit"];

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

/** Is the bot still asleep (Sleeper before it wakes)? */
const asleep = (v: BotView, bot: Bot): boolean => bot.awakeYear !== undefined && v.state.year < bot.awakeYear;

/** Play one decision's actions for a bot (the clock does not move). */
export function playTurn(v: BotView, bot: Bot): void {
  v.tried = new Set();
  const careful = bot.careful && !asleep(v, bot);
  for (const p of [...v.state.pending]) {
    if (p.kind === "respond") {
      const response = pickResponse(v.model, v.state, p.event, careful);
      if (response) tryAct(v, { kind: "respond", event: p.event, response });
    } else if (p.kind === "visit" && careful) {
      tryAct(v, { kind: "visit", place: p.place, picks: pickVisit(v.model, v.state, p.place, true) });
    }
  }
  if (asleep(v, bot)) return;
  const deal = pickDeal(v, careful);
  if (deal) tryAct(v, { kind: "deal", ...deal });
  for (let i = 0; i < MAX_ACTIONS; i++) {
    const o = (careful ? keepDealOption(v) : null) ?? bot.next(v);
    if (!o) break;
    tryAct(v, o.action);
  }
}

/** Steps from `step` to the next decision: the last step of a year (at least one step on). */
export function stepsToDecision(model: BoardModel, step: number): number {
  const perYear = stepsPerYear(model);
  const left = perYear - 1 - (step % perYear);
  return left > 0 ? left : perYear;
}

/** Play a whole game: the bot's choices at the start, when each year closes, and at stops, to 2050. */
export function playGame(model: BoardModel, bot: Bot, gameNumber: number | string, start: StartId, engine: BoardEngine = realEngine): BoardState {
  const v: BotView = { model, engine, state: engine.newBoard(model, gameNumber, start), seed: hashSeed(`${bot.id}:${gameNumber}`), tried: new Set() };
  for (let guard = 0; guard < model.game.steps * 4 && v.state.phase !== "ended"; guard++) {
    playTurn(v, bot);
    v.state = answerAll(engine, model, v.state);
    if (v.state.phase !== "play") break;
    v.state = engine.advance(model, v.state, { maxSteps: stepsToDecision(model, v.state.step), stopOn: BOT_STOPS }).state;
  }
  return v.state;
}

/** The start for a game number in a balance run: every start in turn, so all are played equally. */
export function startFor(model: BoardModel, gameNumber: number): StartId {
  return model.starts[gameNumber % model.starts.length]!.id;
}
