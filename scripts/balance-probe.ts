/**
 * Balance probe (design lead, see docs/design/balance-decision.md). Plays every bot and judges each
 * game by the decided result: net strand pips changed since 2026, the lower of Lived and Left,
 * with Lived taken over the terms the player shaped. It computes this from the engine's published
 * end result, so it works before and after the engine adopts the formula (after: it reads the engine's
 * own judged values). scripts/balance.ts now carries these targets.
 *
 *   npx tsx scripts/balance-probe.ts [--seeds 200] [--runs 30] [--bots a,b] [--ceiling 0] [--paths]
 */
import { compileFromDisk } from "./model-files";
import { ALL_BOTS, playBot, randomBot, type Bot } from "../src/engine/bots";
import { newGame, type GameState } from "../src/engine/api";

const arg = (name: string, d: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const SEEDS = Number(arg("seeds", "200"));
const RUNS = Number(arg("runs", "30"));
const CEILING = Number(arg("ceiling", "0"));
const ONLY = arg("bots", "");
const PATHS = process.argv.includes("--paths");
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
const f = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);

/** The decision: first shaped term (0-based index into the term list), weights, band edges in net pips. */
const FIRST = 1;
const MEAN_W = 0.75, MIN_W = 0.25;
const DIP = !process.argv.includes("--worst-term");
const DIP_W = 0.25;
const BANDS: [number, string][] = [[-Infinity, "Diminished"], [-4, "Held, just"], [-1, "Handed on"], [1, "Handed on better"], [4, "A gift"]];
const band = (v: number) => BANDS.filter((b) => v >= b[0]).pop()![1];

export interface Judged { lived: number; left: number; result: number; which: "lived" | "left"; wt: number[]; start: { lived: number; left: number }; strandLived: number[]; strandLeft: number[] }
export function judge(g: GameState): Judged {
  const e = g.result!;
  // the engine now publishes the judged change itself (result v2); use it when present
  if (typeof (e as { livedLevel?: number }).livedLevel === "number") {
    return { lived: e.lived.value, left: e.left.value, result: e.result.value, which: e.result.which, wt: e.wellbeingByTerm, start: e.start, strandLived: e.perStrand.map((p) => p.lived), strandLeft: e.perStrand.map((p) => p.left) };
  }
  const n = Object.keys(e.weights).length;
  const wt = e.wellbeingByTerm.slice(FIRST);
  const mean = wt.reduce((a, b) => a + b, 0) / wt.length;
  // "dip": the mean of the shaped terms, less a share of the deepest fall below the 2026 start
  const livedLevel = DIP ? mean - DIP_W * Math.max(0, e.start.lived - Math.min(...wt)) : MEAN_W * mean + MIN_W * Math.min(...wt);
  const lived = n * (livedLevel - e.start.lived);
  const left = n * (e.left.value - e.start.left);
  return { lived, left, result: Math.min(lived, left), which: lived <= left ? "lived" : "left", wt: e.wellbeingByTerm, start: e.start, strandLived: e.perStrand.map((p) => p.lived), strandLeft: e.perStrand.map((p) => p.left) };
}

const TARGETS: Record<string, [number, number]> = { caretaker: [-3.5, -1.5], careless: [-10, -4], average: [-1, 1], thoughtful: [1.5, 3.5] };
const HABIT_GAP = 1.5;

if (PATHS) {
  const g0 = newGame(m, 1, { runs: 5, previewRuns: 1, caretakerGhost: false });
  console.log(`2026 by strand, flow: ${g0.strands.map((x) => f2(x.flow)).join(" ")}   stock: ${g0.strands.map((x) => f2(x.stock)).join(" ")}`);
}
console.log(`seeds ${SEEDS}, runs ${RUNS}. Unit: net strand pips changed since 2026 (7 x weighted change), Lived over terms ${FIRST + 1} to 6\n`);
console.log("bot                median  p10    p90    lived  left   lived-lower  lost-terms  wells  band               target");
const meds = new Map<string, number>();
const perSeed = new Map<string, number[]>();
const livedLower = new Map<string, number>();
for (const bot of ALL_BOTS.filter((b) => !ONLY || ONLY.split(",").includes(b.id))) {
  const js: Judged[] = [];
  let lost = 0, wells = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = playBot(m, bot, seed, { runs: RUNS, previewRuns: 5 });
    js.push(judge(g));
    lost += g.ledger.lostTerms.length;
    wells += g.ledger.grades.filter((x) => x.grade === "well" || x.grade === "very_well").length;
  }
  const res = js.map((j) => j.result);
  const med = q(res, 0.5);
  meds.set(bot.id, med);
  perSeed.set(bot.id, res);
  livedLower.set(bot.id, js.filter((j) => j.which === "lived").length / js.length);
  const t = TARGETS[bot.id];
  const ok = t ? (med >= t[0] && med <= t[1] ? "ok" : "MISS") : "";
  console.log(
    `${bot.id.padEnd(18)} ${f(med).padStart(5)}  ${f(q(res, 0.1)).padStart(5)}  ${f(q(res, 0.9)).padStart(5)}  ${f(q(js.map((j) => j.lived), 0.5)).padStart(5)}  ${f(q(js.map((j) => j.left), 0.5)).padStart(5)}   ${((js.filter((j) => j.which === "lived").length / js.length) * 100).toFixed(0).padStart(4)}%        ${(lost / SEEDS).toFixed(2)}        ${(wells / SEEDS).toFixed(1)}    ${band(med).padEnd(18)} ${t ? `${t[0]} to ${t[1]} ${ok}` : ""}`,
  );
  if (PATHS) console.log(`    by strand, lived: ${js[0]!.strandLived.map((_, k) => f2(q(js.map((j) => j.strandLived[k]!), 0.5))).join(" ")}   left: ${js[0]!.strandLeft.map((_, k) => f2(q(js.map((j) => j.strandLeft[k]!), 0.5))).join(" ")}`);
  if (PATHS) console.log(`    start ${f2(js[0]!.start.lived)}/${f2(js[0]!.start.left)}  W by term: ${[0, 1, 2, 3, 4, 5].map((t) => f2(q(js.map((j) => j.wt[t]!), 0.5))).join(" ")}`);
}
const th = meds.get("thoughtful"), ct = perSeed.get("caretaker"), ths = perSeed.get("thoughtful");
if (th !== undefined) {
  const thJ = livedLower.get("thoughtful");
  if (thJ !== undefined) console.log(`\nLived is the lower in ${(thJ * 100).toFixed(0)}% of thoughtful games (target 50 to 80); Left is the lower in ${(100 - (livedLower.get("average") ?? 0) * 100).toFixed(0)}% of average games (target at least 60)`);
  if (ct && ths) {
    const d = ths.map((v, i) => v - ct[i]!);
    console.log(`\nthoughtful minus caretaker on the same seed: median ${f(q(d, 0.5))}, p10 ${f(q(d, 0.1))} (target: median at least +4, p10 at least +2)`);
  }
  const WHOLE = ["growth-only", "green-only", "borrower", "prevention-only"];
  console.log(`whole-game strategies must be at least ${HABIT_GAP} net pips below thoughtful (${f(th - HABIT_GAP)}):`);
  for (const id of WHOLE) if (meds.has(id)) console.log(`  ${id.padEnd(18)} ${f(meds.get(id)!).padStart(5)}  ${meds.get(id)! <= th - HABIT_GAP ? "ok" : "MISS"}`);
  console.log(`one-habit bots must not beat thoughtful (${f(th)}, allowing 0.3); the cost of the habit is shown at the median and in bad games (p10):`);
  const thP10 = q(ths ?? [], 0.1);
  for (const [id, med] of meds) if (!TARGETS[id] && !WHOLE.includes(id) && id !== "flow-greedy") console.log(`  ${id.padEnd(18)} ${f(med).padStart(5)}  cost ${f(th - med)} median, ${f(thP10 - q(perSeed.get(id)!, 0.1))} p10  ${med <= th + 0.3 ? "ok" : "MISS"}`);
}
if (CEILING > 0) {
  const all: number[] = [];
  for (let k = 0; k < CEILING; k++) all.push(judge(playBot(m, randomBot(k), (k % SEEDS) + 1, { runs: 5, previewRuns: 1 })).result);
  console.log(`\nceiling: best of ${CEILING} random-search games ${f(Math.max(...all))} (target at most +6), share reaching A gift ${((all.filter((v) => v >= 4).length / all.length) * 100).toFixed(1)}%`);
}
