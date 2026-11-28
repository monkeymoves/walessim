/**
 * Finished bot runs, summarised for the balance table of docs/design/v2-board.md sections 13.2 and
 * 16.6, and the plain statistics the table uses. bots-marks.ts turns runs into the table;
 * scripts/board-balance.ts plays the games; bots.test.ts checks the measures on made-up runs.
 * Everything here is plain data, so runs can cross a process boundary as JSON.
 */
import { flagged, keystonesStanding } from "./end-conditions";
import { pickEnding } from "./endings";
import { frameAtYear } from "./frame";
import { councilMean, lowestCouncils, scores } from "./score";
import type { BoardModel, BoardState, CouncilCode, Frame, MeasureId } from "./types";
import { stepOfYear } from "./time";
import { MEASURE_IDS } from "./types";

/** One finished game by one bot. */
export interface RunResult {
  bot: string;
  game: number;
  start: string;
  future: string;
  ending: string;
  /** The result out of 100: Left for 2050 (16.3.6). */
  result: number;
  /** Life in your years, out of 100. */
  life: number;
  /** The 2026 board's score, out of 100. */
  startScore: number;
  /** Working keystones in 2050, and their branches. */
  keystones: string[];
  keystoneBranches: string[];
  /** Projects standing (working or building) in 2050. */
  projects: number;
  /** End board: per council (game order) six measures, young adult share and Backing, each 0 to 1. */
  vector: number[];
  /** The same in May 2034 (paths part over time). */
  vector2034: number[];
  /** Council measures, 0 to 10, per council in game order, MEASURE_IDS order. */
  measures: number[][];
  /** Mean young adult share (in 100) of the valley councils in 2050. */
  valleyYoung: number;
  /** Lowest and highest young adult share of any council in any yearly frame, as a share of its 2026 value. */
  youngRatio: { min: number; max: number };
  /** Momentum changes over the game (yearly frames, all councils). */
  tips: number;
  /** Councils that were ever on the rise. */
  risen: CouncilCode[];
  electionsLost: number;
  /** After the first lost election, was the next one won? null with no loss or no election after it. */
  recovered: boolean | null;
  /** The council lowest in 2026: how far its mean moved by 2050, and whether it was ever on the rise. */
  lowestChange: number;
  lowestRose: boolean;
  /** The six chapter ids, in order. */
  chapters: string[];
  /** The result at the first election less the 2026 board's score (things move early). */
  early?: number;
}

function vectorOf(model: BoardModel, councils: Record<CouncilCode, { measures: Record<MeasureId, number>; young: number; backing: number }>): number[] {
  return model.game.councils.flatMap((c) => {
    const x = councils[c];
    return x ? [...MEASURE_IDS.map((m) => x.measures[m] / 10), x.young / 100, x.backing / 10] : [];
  });
}

/**
 * Watches a game for the headline at the first election: pass `observe` to `playGame`, then read
 * `early()` (the result there less the 2026 board's score; undefined if the game never got there).
 */
export function earlyWatch(model: BoardModel): { observe: (s: BoardState) => void; early: () => number | undefined } {
  const at = stepOfYear(model, model.game.election_years[0] ?? model.game.end_year);
  let early: number | undefined;
  return {
    observe: (s) => {
      if (early !== undefined || s.step < at) return;
      const sc = scores(model, s);
      early = sc.result - sc.start;
    },
    early: () => early,
  };
}

/** Summarise a finished state for the table. */
export function runResult(model: BoardModel, bot: string, game: number, state: BoardState, early?: number): RunResult {
  const sc = scores(model, state);
  const first = state.history[0];
  const frames: Frame[] = [...state.history];
  const keystones = keystonesStanding(model, state);
  const ratios = frames.flatMap((f) => model.game.councils.map((c) => {
    const was = first?.councils[c]?.young ?? 0;
    return was > 0 ? (f.councils[c]?.young ?? was) / was : 1;
  }));
  let tips = 0;
  for (let i = 1; i < frames.length; i++) {
    for (const c of model.game.councils) if (frames[i]!.councils[c]?.momentum !== frames[i - 1]!.councils[c]?.momentum) tips++;
  }
  const risen = model.game.councils.filter((c) => frames.some((f) => f.councils[c]?.momentum === "rising"));
  const records = state.election.records;
  const lostAt = records.findIndex((r) => r.result === "lost");
  const lowest = first ? lowestCouncils(model, first.councils, 1)[0] : undefined;
  const valleys = flagged(model, "valley").filter((c) => state.councils[c]);
  return {
    bot, game, start: state.start, future: state.future, ending: pickEnding(model, state).id,
    result: sc.result, life: sc.life, startScore: sc.start,
    keystones, keystoneBranches: keystones.map((k) => model.projects.find((d) => d.id === k)?.branch ?? ""),
    projects: state.projects.length,
    vector: vectorOf(model, state.councils),
    vector2034: vectorOf(model, frameAtYear(state, 2034)?.councils ?? state.councils),
    measures: model.game.councils.map((c) => MEASURE_IDS.map((m) => state.councils[c]!.measures[m])),
    valleyYoung: valleys.length ? valleys.reduce((a, c) => a + state.councils[c]!.young, 0) / valleys.length : NaN,
    youngRatio: { min: Math.min(...ratios), max: Math.max(...ratios) },
    tips, risen,
    electionsLost: records.filter((r) => r.result === "lost").length,
    recovered: lostAt >= 0 && records[lostAt + 1] ? records[lostAt + 1]!.result !== "lost" : null,
    lowestChange: lowest && first ? councilMean(state.councils[lowest]!) - councilMean(first.councils[lowest]!) : NaN,
    lowestRose: !!lowest && risen.includes(lowest),
    chapters: state.story.chapters.map((c) => c.chapter),
    ...(early !== undefined ? { early } : {}),
  };
}

export const distance = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) / Math.max(1, a.length);
export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** The p-th percentile (0 to 100) by linear interpolation. */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i);
  return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo);
}
export const median = (xs: number[]): number => percentile(xs, 50);

export const byBot = (runs: RunResult[], bot: string): RunResult[] => runs.filter((r) => r.bot === bot).sort((a, b) => a.game - b.game);

/** Pairs of runs of two bots on the same game number. */
export const sameGame = (a: RunResult[], b: RunResult[]): (readonly [RunResult, RunResult])[] => a.flatMap((x) => {
  const y = b.find((r) => r.game === x.game);
  return y ? [[x, y] as const] : [];
});

/** Each bot's median result, spread and ending counts, for the log. */
export function botSummary(runs: RunResult[]): { bot: string; median: number; p10: number; p90: number; endings: Record<string, number>; keystones: number }[] {
  return [...new Set(runs.map((r) => r.bot))].map((bot) => {
    const rs = byBot(runs, bot);
    const endings: Record<string, number> = {};
    for (const r of rs) endings[r.ending] = (endings[r.ending] ?? 0) + 1;
    return { bot, median: median(rs.map((r) => r.result)), p10: percentile(rs.map((r) => r.result), 10), p90: percentile(rs.map((r) => r.result), 90), endings, keystones: mean(rs.map((r) => r.keystones.length)) };
  });
}
