/**
 * The balance table of docs/design/v2-board.md section 13.2: pure measures over finished bot
 * runs. scripts/board-balance.ts plays the games and prints the table; bots.test.ts checks the
 * measures on small made-up runs.
 */
import { keystonesStanding } from "./end-conditions";
import { pickEnding } from "./endings";
import { scores } from "./score";
import type { BoardModel, BoardState, MeasureId } from "./types";
import { MEASURE_IDS } from "./types";

/** One finished game by one bot. */
export interface RunResult {
  bot: string;
  game: number;
  start: string;
  future: string;
  ending: string;
  /** The result out of 100 (the lower of the two scores). */
  result: number;
  keystones: number;
  /** End board: per council (game order) six measures, young adult share and Backing, each 0 to 1. */
  vector: number[];
  /** Council measures, 0 to 10, per council in game order, MEASURE_IDS order. */
  measures: number[][];
}

/** Summarise a finished state for the table. */
export function runResult(model: BoardModel, bot: string, game: number, state: BoardState): RunResult {
  const measures = model.game.councils.map((c) => MEASURE_IDS.map((m: MeasureId) => state.councils[c]!.measures[m]));
  const vector = model.game.councils.flatMap((c, i) => [...measures[i]!.map((v) => v / 10), state.councils[c]!.young / 100, state.councils[c]!.backing / 10]);
  return {
    bot, game, start: state.start, future: state.future, ending: pickEnding(model, state).id,
    result: scores(model, state).result, keystones: keystonesStanding(model, state).length, vector, measures,
  };
}

export const distance = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) / Math.max(1, a.length);
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** The p-th percentile (0 to 100) by linear interpolation. */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i);
  return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo);
}
export const median = (xs: number[]): number => percentile(xs, 50);

export interface Row {
  claim: string;
  measure: string;
  value: string;
  mark: string;
  pass: boolean | null;
}

const fmt = (v: number, d = 2): string => (Number.isFinite(v) ? v.toFixed(d) : "n/a");
const byBot = (runs: RunResult[], bot: string) => runs.filter((r) => r.bot === bot).sort((a, b) => a.game - b.game);
const sameGame = (a: RunResult[], b: RunResult[]) => a.flatMap((x) => {
  const y = b.find((r) => r.game === x.game);
  return y ? [[x, y] as const] : [];
});

/** Extra measures that need their own games: place matters, compounding, the random search, severity. */
export interface Extras {
  shuffledMedian?: number;
  compoundRatio?: number;
  searchKeystones?: { runs: number; four: number; three: number };
  severity?: { min: number; max: number; lo: number; hi: number };
}

/** The 13.2 table from the runs of the nine bots (branch bots named `branch-<id>`). */
export function balanceTable(runs: RunResult[], extras: Extras = {}): Row[] {
  const rows: Row[] = [];
  const bots = [...new Set(runs.map((r) => r.bot))];
  const branchBots = bots.filter((b) => b.startsWith("branch-"));
  const medianOf = (b: string) => median(byBot(runs, b).map((r) => r.result));

  // Strategies build different Waleses.
  const between: number[] = [];
  let most = { d: -1, a: "", b: "" };
  for (let i = 0; i < branchBots.length; i++) {
    for (let j = i + 1; j < branchBots.length; j++) {
      const ds = sameGame(byBot(runs, branchBots[i]!), byBot(runs, branchBots[j]!)).map(([x, y]) => distance(x.vector, y.vector));
      between.push(...ds);
      if (mean(ds) > most.d) most = { d: mean(ds), a: branchBots[i]!, b: branchBots[j]! };
    }
  }
  const within = branchBots.flatMap((b) => {
    const rs = byBot(runs, b);
    return rs.slice(1).map((r, i) => distance(r.vector, rs[i]!.vector));
  });
  const ratio = mean(between) / mean(within);
  rows.push({ claim: "Strategies build different Waleses", measure: "branch bots: distance between / within", value: fmt(ratio), mark: ">= 2.0", pass: ratio >= 2 });

  // The difference is on the map.
  const shares = sameGame(byBot(runs, most.a), byBot(runs, most.b)).map(([x, y]) => {
    const cells = x.measures.flatMap((row, c) => row.map((v, m) => Math.abs(v - y.measures[c]![m]!)));
    return cells.filter((d) => d >= 2).length / Math.max(1, cells.length);
  });
  const onMap = mean(shares);
  rows.push({ claim: "The difference is on the map", measure: `measures 2+ apart, ${most.a} v ${most.b}`, value: fmt(onMap), mark: ">= 0.25", pass: onMap >= 0.25 });

  // Many endings are real.
  const endings = [...new Set(runs.map((r) => r.ending))];
  const real = endings.filter((e) => bots.some((b) => {
    const rs = byBot(runs, b);
    return rs.filter((r) => r.ending === e).length >= 0.1 * rs.length;
  }));
  rows.push({ claim: "Many endings are real", measure: "endings in a tenth of some bot's runs", value: `${real.length} (${real.join(", ")})`, mark: ">= 6 of 8", pass: real.length >= 6 });

  // No ending swallows the rest.
  const pool = runs.filter((r) => branchBots.includes(r.bot) || r.bot === "skilled");
  const top = endings.map((e) => ({ e, share: pool.filter((r) => r.ending === e).length / Math.max(1, pool.length) })).sort((a, b) => b.share - a.share)[0];
  rows.push({ claim: "No ending swallows the rest", measure: "largest ending share, branch bots and Skilled", value: top ? `${fmt(top.share)} (${top.e})` : "n/a", mark: "<= 0.40", pass: top ? top.share <= 0.4 : null });

  // No dominant strategy.
  const branchMedians = branchBots.map((b) => ({ b, m: medianOf(b) })).sort((a, b) => b.m - a.m);
  const dominance = branchMedians.length > 1 ? branchMedians[0]!.m - branchMedians[1]!.m : NaN;
  rows.push({ claim: "No dominant strategy", measure: `best branch median less second (${branchMedians[0]?.b ?? ""})`, value: fmt(dominance, 1), mark: "<= 6", pass: dominance <= 6 });

  // Each branch has its day.
  const setups = [...new Set(runs.map((r) => `${r.start}|${r.future}`))];
  const days = new Set(setups.map((k) => branchBots.map((b) => ({ b, m: median(byBot(runs, b).filter((r) => `${r.start}|${r.future}` === k).map((r) => r.result)) }))
    .filter((x) => Number.isFinite(x.m)).sort((a, c) => c.m - a.m)[0]?.b).filter((x): x is string => !!x));
  rows.push({ claim: "Each branch has its day", measure: "branches top in some start and future", value: `${days.size} of ${branchBots.length}`, mark: "all four", pass: days.size === branchBots.length && branchBots.length >= 4 });

  // Skill beats autopilot, thought beats reaction.
  const beats = (a: string, b: string) => {
    const pairs = sameGame(byBot(runs, a), byBot(runs, b));
    return { share: pairs.filter(([x, y]) => x.result > y.result).length / Math.max(1, pairs.length), gap: median(pairs.map(([x, y]) => x.result - y.result)) };
  };
  const sa = beats("skilled", "autopilot");
  rows.push({ claim: "Skill beats autopilot", measure: "Skilled beats Autopilot, same game; median gap", value: `${fmt(sa.share)}; ${fmt(sa.gap, 1)}`, mark: ">= 0.95; >= 15", pass: sa.share >= 0.95 && sa.gap >= 15 });
  const sr = beats("skilled", "reactive");
  rows.push({ claim: "Thought beats reaction", measure: "Skilled beats Reactive, same game", value: fmt(sr.share), mark: ">= 0.85", pass: sr.share >= 0.85 });

  // Luck does not decide.
  const spreads = bots.map((b) => ({ b, s: percentile(byBot(runs, b).map((r) => r.result), 90) - percentile(byBot(runs, b).map((r) => r.result), 10) }));
  const worst = [...spreads].sort((a, b) => b.s - a.s)[0];
  rows.push({ claim: "Luck does not decide", measure: `widest 10th to 90th spread (${worst?.b ?? ""})`, value: fmt(worst?.s ?? NaN, 1), mark: `<= 12 and < ${fmt(sa.gap, 1)}`, pass: !!worst && worst.s <= 12 && worst.s < sa.gap });

  // Place matters.
  if (extras.shuffledMedian !== undefined) {
    const fall = medianOf("skilled") - extras.shuffledMedian;
    rows.push({ claim: "Place matters", measure: "Skilled median less Skilled at random sites", value: fmt(fall, 1), mark: ">= 8", pass: fall >= 8 });
  }
  if (extras.compoundRatio !== undefined) {
    rows.push({ claim: "Early choices compound", measure: "effect by 2050, built in turn 1 over turn 7 (median)", value: fmt(extras.compoundRatio), mark: ">= 2", pass: extras.compoundRatio >= 2 });
  }
  if (extras.searchKeystones) {
    const k = extras.searchKeystones;
    const three = k.three / Math.max(1, k.runs);
    rows.push({ claim: "You cannot have it all", measure: `${k.runs} random runs: four keystones; three`, value: `${k.four}; ${fmt(three, 3)}`, mark: "0; < 0.05", pass: k.four === 0 && three < 0.05 });
  }

  // Cardiff first does not win.
  const cf = medianOf("cardiff-first");
  const cfRuns = byBot(runs, "cardiff-first");
  const cfEnd = cfRuns.filter((r) => r.ending === "two-countries" || r.ending === "city-bedrooms").length / Math.max(1, cfRuns.length);
  rows.push({ claim: "Cardiff first does not win", measure: "Skilled median less Cardiff first; share in Two countries or City and bedrooms", value: `${fmt(medianOf("skilled") - cf, 1)}; ${fmt(cfEnd)}`, mark: ">= 10; > 0.5", pass: medianOf("skilled") - cf >= 10 && cfEnd > 0.5 });

  if (extras.severity) {
    const s = extras.severity;
    rows.push({ claim: "The fairness rule holds", measure: "outside severity per game number, lowest to highest", value: `${s.min} to ${s.max}`, mark: `${s.lo} to ${s.hi}`, pass: s.min >= s.lo && s.max <= s.hi });
  }
  return rows;
}

/** Each bot's median result, spread and ending counts, for the log. */
export function botSummary(runs: RunResult[]): { bot: string; median: number; p10: number; p90: number; endings: Record<string, number>; keystones: number }[] {
  return [...new Set(runs.map((r) => r.bot))].map((bot) => {
    const rs = byBot(runs, bot);
    const endings: Record<string, number> = {};
    for (const r of rs) endings[r.ending] = (endings[r.ending] ?? 0) + 1;
    return { bot, median: median(rs.map((r) => r.result)), p10: percentile(rs.map((r) => r.result), 10), p90: percentile(rs.map((r) => r.result), 90), endings, keystones: mean(rs.map((r) => r.keystones)) };
  });
}

/** The table as Markdown. */
export function tableMarkdown(rows: Row[]): string {
  const mark = (p: boolean | null) => (p === null ? "n/a" : p ? "pass" : "FAIL");
  return ["| Claim | Measure | Value | Pass mark | Result |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.claim} | ${r.measure} | ${r.value} | ${r.mark} | ${mark(r.pass)} |`)].join("\n");
}
