/**
 * Measures of docs/design/v2-board.md section 16.6 that need games of their own, beside the bot
 * runs: nothing slides by itself, early choices compound, laws cost, and the clock is exact. Each
 * plays through the real engine and returns plain numbers for bots-marks.ts.
 */
import { advance, newBoard, replay, tick } from "./clock";
import { answerAll } from "./bots-common";
import { playGame, realEngine, skilled, startFor } from "./bots";
import type { Bot } from "./bots-strategies";
import { BoardActionError } from "./errors";
import { boardScore, scores } from "./score";
import { stepOfYear } from "./time";
import type { MeasureBoard } from "./score";
import type { Action, BoardModel, BoardState, CouncilCode, LoggedAction, MeasureId, ProjectDef, ProjectId, Site } from "./types";
import { MEASURE_IDS } from "./types";

/** A bot that does nothing at all. */
export const idle: Bot = { id: "idle", careful: false, next: () => null };

/** Nothing slides by itself: the result less 2026 for a game with no actions and no events. */
export function idleDrift(model: BoardModel, game: number): number {
  const quiet: BoardModel = { ...model, events: [] };
  const s = scores(quiet, playGame(quiet, idle, game, startFor(model, game)));
  return s.result - s.start;
}

/** Run the clock to `step`, answering events cheaply when the clock is held. `light` skips the ledger. */
function runTo(model: BoardModel, s: BoardState, step: number, light = true): BoardState {
  let out = s;
  while (out.step < step && out.phase !== "ended") {
    out = answerAll(realEngine, model, out);
    if (out.phase !== "play") break;
    out = advance(model, out, { maxSteps: step - out.step, light }).state;
  }
  return out;
}

const tryAct = (model: BoardModel, s: BoardState, a: Action): BoardState => {
  try {
    return realEngine.act(model, s, a);
  } catch (e) {
    if (e instanceof BoardActionError) return s;
    throw e;
  }
};

/**
 * Replay a log, putting one extra build in at step `at` and paying for it (the "given free" of
 * 16.6: its cost is added to the coins just before it is built). Actions that are no longer
 * allowed are skipped. Returns the 2050 board.
 */
export function replayWithGift(model: BoardModel, game: number, log: readonly LoggedAction[], at: number, gift: Action, light = true): BoardState {
  let s = newBoard(model, game, startFor(model, game));
  let given = false;
  const give = () => {
    if (given) return;
    given = true;
    const o = realEngine.options(model, s).find((x) => JSON.stringify(x.action) === JSON.stringify(gift));
    if (o && o.blockers.every((b) => b.kind === "coins")) s = tryAct(model, { ...s, coins: s.coins + o.cost }, gift);
  };
  for (const entry of log) {
    if (!given && entry.at >= at) {
      s = runTo(model, s, at, light);
      give();
    }
    s = runTo(model, s, entry.at, light);
    if (s.phase === "ended") break;
    s = tryAct(model, s, entry.action);
  }
  if (!given) {
    s = runTo(model, s, at, light);
    give();
  }
  return runTo(model, s, model.game.steps, light);
}

const sameSite = (a: Site, b: Site): boolean => (a.council ?? null) === (b.council ?? null) && (a.link ?? null) === (b.link ?? null);

/**
 * What one project did to the board by now: the board score less the same board with that
 * project's own ledger records taken out (its effects, roots, need and what it spread). Unlike the
 * difference between two whole games, this is not swamped by the games drifting apart.
 */
export function giftEffect(model: BoardModel, state: BoardState, project: ProjectId, site: Site): number {
  const without: MeasureBoard = {};
  for (const code of model.game.councils) {
    const c = state.councils[code];
    if (c) without[code] = { measures: { ...c.measures } };
  }
  for (const c of state.ledger) {
    if (c.council === null || c.cause.kind !== "project" || c.cause.project !== project || !sameSite(c.cause.site, site)) continue;
    const m = c.quantity as MeasureId;
    if (MEASURE_IDS.includes(m) && without[c.council]) without[c.council]!.measures[m] -= c.delta;
  }
  return boardScore(model, state.councils) - boardScore(model, without);
}

/** A gift that has room to work: the tier 1 project of the branch with the most lift on measures below `ROOM_BELOW` there in 2050. */
const ROOM_BELOW = 8;
function pickGift(model: BoardModel, base: BoardState, branch: string, council: CouncilCode): ProjectDef | undefined {
  const room = (d: ProjectDef) => d.effects.reduce((a, e) => a + (e.kind === "measure" && (!e.where || e.where === "here") && e.points > 0
    && base.councils[council]!.measures[e.measure] < ROOM_BELOW ? e.points : 0), 0);
  return model.projects
    .filter((d) => d.branch === branch && d.tier === 1 && d.site === "council" && !base.projects.some((p) => p.project === d.id && p.site.council === council))
    .map((d) => ({ d, r: room(d) }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r)[0]?.d;
}

/**
 * Early choices compound (16.6): in Skilled's game, a tier 1 project of a branch Skilled builds,
 * given free where Skilled has a project of that branch (so it is joined), in 2027 and in 2039.
 * The gift is one with room to work there (`pickGift`), and its effect on the 2050 board is its
 * own share of that board (`giftEffect`). Returns the early effect over the late one, or null when
 * the game has no such project or the late gift does nothing.
 */
export function compoundRatio(model: BoardModel, game: number): number | null {
  const base = playGame(model, skilled(), game, startFor(model, game));
  for (const own of base.projects) {
    const def = model.projects.find((d) => d.id === own.project);
    const council = own.site.council;
    if (!def || council === undefined) continue;
    const gift = pickGift(model, base, def.branch, council);
    if (!gift) continue;
    const site = { council };
    const action: Action = { kind: "build", project: gift.id, site };
    const effect = (year: number) => giftEffect(model, replayWithGift(model, game, base.log, stepOfYear(model, year), action, false), gift.id, site);
    const early = effect(2027);
    const late = effect(2039);
    return late > 1e-6 ? early / late : null;
  }
  return null;
}

/** Years after a law is passed at which its cost is read (playtest 9 must-fix 2: a cost that fades is no choice). */
export const LAW_COST_YEARS = 4;

/**
 * Laws cost (playtest 9 must-fix 2): Skilled's board in May 2027, each law passed or not, then the
 * clock run on `LAW_COST_YEARS` with nothing else done. For each law, the largest change it made to
 * any council's Backing. Returns the largest and the smallest of those over the laws.
 */
export function lawCost(model: BoardModel, game: number): { most: number; least: number } {
  const start = startFor(model, game);
  const played = playGame(model, skilled(), game, start);
  const at = stepOfYear(model, model.game.first_year + 1);
  const base = runTo(model, replay(model, game, start, played.log.filter((e) => e.at < at)), at);
  const later = (s: BoardState) => runTo(model, s, Math.min(model.game.steps, at + LAW_COST_YEARS * Math.round(1 / model.game.years_per_step)));
  const without = later(base);
  const costs = model.laws.map((law) => {
    const passed = tryAct(model, base, { kind: "law", law: law.id, pass: true });
    if (passed === base) return 0;
    const withLaw = later(passed);
    return Math.max(0, ...model.game.councils.map((c) => Math.abs((withLaw.councils[c]?.backing ?? 0) - (without.councils[c]?.backing ?? 0))));
  });
  return { most: Math.max(0, ...costs), least: costs.length ? Math.min(...costs) : 0 };
}

/** The clock is exact (16.6): a bot's log replays byte equal, and ticking every step equals advancing. */
export function clockExact(model: BoardModel, game: number): { replay: boolean; tickAdvance: boolean } {
  const start = startFor(model, game);
  const played = playGame(model, skilled(), game, start);
  const replayed = replay(model, game, start, played.log, played.step);
  let a = newBoard(model, game, start);
  let b = newBoard(model, game, start);
  while (a.phase !== "ended") {
    a = answerAll(realEngine, model, a);
    if (a.phase !== "play") break;
    a = tick(model, a).state;
  }
  while (b.phase !== "ended") {
    b = answerAll(realEngine, model, b);
    if (b.phase !== "play") break;
    b = advance(model, b, { maxSteps: model.game.steps }).state;
  }
  return { replay: JSON.stringify(replayed) === JSON.stringify(played), tickAdvance: JSON.stringify(a) === JSON.stringify(b) };
}
