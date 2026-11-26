/**
 * Balance check (game-design 11.2): run every bot over many seeds and print the result
 * distributions against the targets.
 *
 *   npx tsx scripts/balance.ts [--seeds 200] [--runs 30] [--ceiling 5000] [--bots thoughtful,average]
 *
 * Runs use fewer uncertainty runs than play (default 30) for speed; the median result is stable.
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
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]!;
};
const f = (x: number) => x.toFixed(2);

const TARGETS: Record<string, [number, number]> = {
  caretaker: [3.3, 3.9],
  careless: [2.5, 3.5],
  average: [4.2, 5.0],
  thoughtful: [5.8, 6.8],
};

export interface BotStats {
  id: string;
  results: number[];
  lived: number[];
  left: number[];
  livedLower: number;
  caretakerTerms: number;
  wells: number;
  games: Summary[];
}

/** What the report needs from a game (full states are too large to keep thousands of). */
interface Summary {
  result: number;
  cards: string[];
}
const summarise = (g: GameState): Summary => ({ result: g.result!.result.value, cards: [...new Set(g.history.flatMap((h) => h.plays.cards.map((c) => c.card)))] });

function runBot(bot: Bot): BotStats {
  const res: NonNullable<GameState["result"]>[] = [];
  const games: Summary[] = [];
  let lost = 0, wells = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = playBot(m, bot, seed, { runs: RUNS, previewRuns: 5 });
    res.push(g.result!);
    games.push(summarise(g));
    lost += g.ledger.lostTerms.length;
    wells += g.ledger.grades.filter((x) => x.grade === "well").length;
  }
  return {
    id: bot.id,
    results: res.map((x) => x.result.value),
    lived: res.map((x) => x.lived.value),
    left: res.map((x) => x.left.value),
    livedLower: res.filter((x) => x.result.which === "lived").length / res.length,
    caretakerTerms: lost / SEEDS,
    wells: wells / SEEDS,
    games,
  };
}

const bots = ALL_BOTS.filter((b) => !ONLY || ONLY.split(",").includes(b.id));
const stats: BotStats[] = [];
const t0 = Date.now();
console.log(`seeds ${SEEDS}, runs ${RUNS}\n`);
console.log("bot                median   p10    p90    lived  left   lived-lower  caretaker/game  wells/game  target");
for (const bot of bots) {
  const s = runBot(bot);
  stats.push(s);
  const t = TARGETS[bot.id];
  const med = q(s.results, 0.5);
  const ok = t ? (med >= t[0] && med <= t[1] ? "ok" : "MISS") : "";
  console.log(
    `${bot.id.padEnd(18)} ${f(med)}   ${f(q(s.results, 0.1))}   ${f(q(s.results, 0.9))}   ${f(q(s.lived, 0.5))}   ${f(q(s.left, 0.5))}   ${(s.livedLower * 100).toFixed(0).padStart(5)}%       ${s.caretakerTerms.toFixed(2)}            ${s.wells.toFixed(2)}        ${t ? `${t[0]} to ${t[1]} ${ok}` : ""}`,
  );
}
const th = stats.find((s) => s.id === "thoughtful");
const av = stats.find((s) => s.id === "average");
if (th && av) {
  const thMed = q(th.results, 0.5);
  const avTop = q(av.results, 0.9);
  console.log(`\nsingle-strategy bots must be at least 0.7 below thoughtful (${f(thMed - 0.7)}) and not above average's top (p90 ${f(avTop)}):`);
  for (const s of stats.filter((x) => !TARGETS[x.id])) {
    const med = q(s.results, 0.5);
    console.log(`  ${s.id.padEnd(18)} ${f(med)} ${med <= thMed - 0.7 && med <= avTop ? "ok" : "MISS"}`);
  }
  console.log(`\nLived is the lower in ${(th.livedLower * 100).toFixed(0)}% of thoughtful games (target 35 to 65)`);
}

// the ceiling: best of many random-search games; card use in their top decile
const randomGames: Summary[] = [];
if (CEILING > 0) {
  for (let k = 0; k < CEILING; k++) randomGames.push(summarise(playBot(m, randomBot(k), (k % SEEDS) + 1, { runs: 5, previewRuns: 1 })));
  const best = Math.max(...randomGames.map((g) => g.result));
  console.log(`\nceiling: best of ${CEILING} random-search games ${f(best)} (target at most 8.0) ${best <= 8 ? "ok" : "MISS"}`);
}
const pool = randomGames.length ? randomGames : stats.flatMap((s) => s.games);
const sorted = [...pool].sort((a, b) => b.result - a.result);
const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 10)));
const counts = new Map<string, number>();
for (const g of top) for (const id of g.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
console.log(`\ncard use in the top decile of ${randomGames.length ? "random-search" : "bot"} games (${top.length}): every card at least 10%, none above 70%`);
for (const c of m.cards) {
  const share = (counts.get(c.id) ?? 0) / top.length;
  console.log(`  ${c.id.padEnd(28)} ${(share * 100).toFixed(0).padStart(3)}% ${share > 0.7 || share < 0.1 ? "MISS" : ""}`);
}
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)} s`);
