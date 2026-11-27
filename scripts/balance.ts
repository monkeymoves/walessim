/**
 * Balance check (balance decision 14, game-design 11.2 as restated): play every bot over many seeds
 * and judge each game by the engine's result, the change since 2026 in net strand pips (the lower of
 * Lived over terms 2 to 6 and Left). Prints every target with ok or MISS.
 *
 *   npx tsx scripts/balance.ts [--seeds 200] [--runs 30] [--ceiling 5000] [--bots thoughtful,average]
 *
 * Uncertainty runs are fewer than in play (default 30) for speed; medians are stable.
 */
import { compileFromDisk } from "./model-files";
import { ALL_BOTS, playBot, randomBot, type Bot } from "../src/engine/bots";
import type { GameState } from "../src/engine/api";

const arg = (name: string, d: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const SEEDS = Number(arg("seeds", "200"));
const RUNS = Number(arg("runs", "30"));
const CEILING = Number(arg("ceiling", "0"));
const ONLY = arg("bots", "");

const r = compileFromDisk();
if (!r.model) {
  console.error(r.errors.join("\n"));
  process.exit(1);
}
const m = r.model;
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]! : NaN;
};
const f = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(1);
const bandName = (v: number) => m.game.judged_change.bands.filter((b) => v >= b.min).pop()!.name.en;

/** Targets of decision 14, medians over the seeds, in net strand pips since 2026. */
const TARGETS: Record<string, [number, number]> = { caretaker: [-3.5, -1.5], careless: [-10, -4], average: [-1, 1], thoughtful: [1.5, 3.5] };
const WHOLE = ["growth-only", "green-only", "borrower", "prevention-only"];
const WHOLE_GAP = 1.5;
const HABIT_ALLOW = 0.3;

/** What the report needs from a game (full states are too large to keep thousands of). */
interface Summary {
  result: number;
  lived: number;
  left: number;
  which: "lived" | "left";
  lost: number;
  wells: number;
  neglect: number;
  shocks: number;
  prepared: number;
  plays: Record<string, number>;
}
const summarise = (g: GameState): Summary => {
  const e = g.result!;
  const plays: Record<string, number> = {};
  for (const h of g.history) for (const c of h.plays.cards) plays[c.card] = (plays[c.card] ?? 0) + 1;
  return {
    result: e.result.value,
    lived: e.lived.value,
    left: e.left.value,
    which: e.result.which,
    lost: g.ledger.lostTerms.length,
    wells: g.ledger.grades.filter((x) => x.grade === "well" || x.grade === "very_well").length,
    neglect: g.history.reduce((a, h) => a + h.events.filter((x) => x.kind === "neglect").length, 0),
    shocks: g.history.filter((h) => h.shock).length,
    prepared: g.history.filter((h) => h.shock?.prepared).length,
    plays,
  };
};

const bots = ALL_BOTS.filter((b) => !ONLY || ONLY.split(",").includes(b.id));
const games = new Map<string, Summary[]>();
const t0 = Date.now();
const lines: string[] = [];
const say = (s: string) => {
  console.log(s);
  lines.push(s);
};
say(`seeds ${SEEDS}, runs ${RUNS}. Unit: net strand pips changed since 2026 (lower of Lived, terms 2 to 6, and Left)\n`);
say("bot                  median    p10    p90  lived   left  lived-lower  lost-terms  wells  neglect  prepared  band               target");
for (const bot of bots) {
  const gs: Summary[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) gs.push(summarise(playBot(m, bot, seed, { runs: RUNS, previewRuns: 5 })));
  games.set(bot.id, gs);
  const res = gs.map((g) => g.result);
  const med = q(res, 0.5);
  const t = TARGETS[bot.id];
  const shocks = gs.reduce((a, g) => a + g.shocks, 0);
  const prep = shocks ? gs.reduce((a, g) => a + g.prepared, 0) / shocks : 0;
  say(
    `${bot.id.padEnd(20)} ${f(med).padStart(6)} ${f(q(res, 0.1)).padStart(6)} ${f(q(res, 0.9)).padStart(6)} ${f(q(gs.map((g) => g.lived), 0.5)).padStart(6)} ${f(q(gs.map((g) => g.left), 0.5)).padStart(6)}  ${((gs.filter((g) => g.which === "lived").length / gs.length) * 100).toFixed(0).padStart(6)}%     ${(gs.reduce((a, g) => a + g.lost, 0) / SEEDS).toFixed(2).padStart(6)}   ${(gs.reduce((a, g) => a + g.wells, 0) / SEEDS).toFixed(1).padStart(4)}   ${(gs.reduce((a, g) => a + g.neglect, 0) / SEEDS).toFixed(1).padStart(5)}    ${(prep * 100).toFixed(0).padStart(4)}%   ${bandName(med).padEnd(18)} ${t ? `${f(t[0])} to ${f(t[1])} ${med >= t[0] && med <= t[1] ? "ok" : "MISS"}` : ""}`,
  );
}

const med = (id: string) => q((games.get(id) ?? []).map((g) => g.result), 0.5);
const th = games.get("thoughtful");
if (th) {
  const thMed = med("thoughtful");
  const share = (id: string, w: "lived" | "left") => {
    const gs = games.get(id) ?? [];
    return gs.length ? gs.filter((g) => g.which === w).length / gs.length : NaN;
  };
  say(`\nLived is the lower in ${(share("thoughtful", "lived") * 100).toFixed(0)}% of thoughtful games (target 50 to 80): ${share("thoughtful", "lived") >= 0.5 && share("thoughtful", "lived") <= 0.8 ? "ok" : "MISS"}`);
  if (games.has("average")) say(`Left is the lower in ${(share("average", "left") * 100).toFixed(0)}% of average games (target at least 60): ${share("average", "left") >= 0.6 ? "ok" : "MISS"}`);
  const ct = games.get("caretaker");
  if (ct) {
    const d = th.map((g, i) => g.result - ct[i]!.result);
    say(`thoughtful minus caretaker on the same seed: median ${f(q(d, 0.5))}, p10 ${f(q(d, 0.1))} (target median at least +4, p10 at least +2): ${q(d, 0.5) >= 4 && q(d, 0.1) >= 2 ? "ok" : "MISS"}`);
  }
  say(`whole-game strategies must be at least ${WHOLE_GAP} below thoughtful (${f(thMed - WHOLE_GAP)}):`);
  for (const id of WHOLE) if (games.has(id)) say(`  ${id.padEnd(20)} ${f(med(id)).padStart(6)}  ${med(id) <= thMed - WHOLE_GAP ? "ok" : "MISS"}`);
  say(`one-habit bots must not beat thoughtful by more than ${HABIT_ALLOW}; the cost of the habit at the median and in bad games (p10):`);
  const thP10 = q(th.map((g) => g.result), 0.1);
  for (const [id, gs] of games) {
    if (TARGETS[id] || WHOLE.includes(id) || id.startsWith("flow") || id.startsWith("thoughtful")) continue;
    say(`  ${id.padEnd(20)} ${f(med(id)).padStart(6)}  cost ${f(thMed - med(id))} median, ${f(thP10 - q(gs.map((g) => g.result), 0.1))} p10  ${med(id) <= thMed + HABIT_ALLOW ? "ok" : "MISS"}`);
  }
}

// the ceiling, and card use (plays per game) in its top decile
if (CEILING > 0) {
  const rs: Summary[] = [];
  for (let k = 0; k < CEILING; k++) rs.push(summarise(playBot(m, randomBot(k), (k % SEEDS) + 1, { runs: 5, previewRuns: 1 })));
  const best = Math.max(...rs.map((g) => g.result));
  const gift = rs.filter((g) => g.result >= 4).length / rs.length;
  say(`\nceiling: best of ${CEILING} random-search games ${f(best)} (target at most +6) ${best <= 6 ? "ok" : "MISS"}; share reaching A gift ${(gift * 100).toFixed(1)}% (target under 5) ${gift < 0.05 ? "ok" : "MISS"}`);
  const top = [...rs].sort((a, b) => b.result - a.result).slice(0, Math.max(1, Math.floor(rs.length / 10)));
  say(`card use in the top decile of random-search games (${top.length}), plays per game: none above 1.6, none below 0.2`);
  for (const c of m.cards) {
    const per = top.reduce((a, g) => a + (g.plays[c.id] ?? 0), 0) / top.length;
    say(`  ${c.id.padEnd(28)} ${per.toFixed(2)} ${per > 1.6 || per < 0.2 ? "MISS" : ""}`);
  }
}
say(`\n${((Date.now() - t0) / 1000).toFixed(0)} s`);
