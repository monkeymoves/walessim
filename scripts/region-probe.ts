/**
 * Region probe (design lead, balance decision 15). Estimates what the result would be if the
 * cohesive strand counted each of the four regions a quarter instead of counting heads, before the
 * engine has that aggregate. It replays bot games through the public API, reads cohesive
 * components per authority at the end of each term, and recomputes that one strand both ways.
 * An estimate: cards still in the post in 2050 are left out of the cohesive stock on both sides.
 *
 *   npx tsx scripts/region-probe.ts [--seeds 200] [--runs 30] [--bots a,b]
 */
import { compileFromDisk } from "./model-files";
import { ALL_BOTS, type Bot } from "../src/engine/bots";
import * as E from "../src/engine/api";

const arg = (name: string, d: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const SEEDS = Number(arg("seeds", "200"));
const RUNS = Number(arg("runs", "30"));
const ONLY = arg("bots", "caretaker,average,thoughtful,thoughtful-no-rotate,south-east-only");
const m = compileFromDisk().model!;
const strand = m.strands.find((s) => s.id === "cohesive")!;
const las = m.authorities;
const popTotal = las.reduce((a, x) => a + x.population, 0);
const regions = [...new Set(las.map((a) => a.region))];
const popMean = (xs: number[]) => xs.reduce((a, v, i) => a + v * las[i]!.population, 0) / popTotal;
const regionMean = (xs: number[]) =>
  regions.reduce((a, r) => {
    const idx = las.flatMap((x, i) => (x.region === r ? [i] : []));
    const p = idx.reduce((s, i) => s + las[i]!.population, 0);
    return a + idx.reduce((s, i) => s + xs[i]! * las[i]!.population, 0) / p;
  }, 0) / regions.length;
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]!;
};
const f = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(1);
const dip = m.game.judged_change?.dip_weight ?? 0.25;

function strandScore(s: E.GameState, ids: string[], agg: (xs: number[]) => number): number {
  return ids.reduce((a, id) => a + agg(E.componentView(m, s, id).scores), 0) / ids.length;
}

function play(bot: Bot, seed: number) {
  let s = E.newGame(m, seed, { caretakerGhost: false, runs: RUNS, previewRuns: 5 });
  const flow0 = { pop: strandScore(s, strand.flow, popMean), reg: strandScore(s, strand.flow, regionMean) };
  const stock0 = { pop: strandScore(s, strand.stock, popMean), reg: strandScore(s, strand.stock, regionMean) };
  const flows: { pop: number; reg: number }[] = [];
  let guard = 0;
  while (s.step !== "ended" && guard++ < 100) {
    switch (s.step) {
      case "opening": s = E.dispatch(m, s, { type: "open" }); break;
      case "pledge": s = E.dispatch(m, s, { type: "pledge", strand: bot.pledge(m, s) }); break;
      case "plan": {
        let plays = bot.plan(m, s);
        if (E.validatePlays(m, s, plays).length) plays = { cards: [] };
        s = E.dispatch(m, s, { type: "commit", plays });
        break;
      }
      case "visit": s = E.dispatch(m, s, { type: "visit", choice: bot.visit(m, s) }); break;
      case "passing": s = E.dispatch(m, s, { type: "respond", response: bot.respond(m, s) }); break;
      case "caretaker": s = E.dispatch(m, s, { type: "caretaker", shadowPledge: [...s.strands].sort((a, b) => b.flow - a.flow)[0]!.strand }); break;
      case "changed":
        flows.push({ pop: strandScore(s, strand.flow, popMean), reg: strandScore(s, strand.flow, regionMean) });
        s = E.dispatch(m, s, { type: "continue" });
        break;
      case "election": s = E.dispatch(m, s, { type: "next" }); break;
    }
  }
  const lived = (k: "pop" | "reg") => {
    const c = flows.slice(1).map((x) => x[k]);
    return c.reduce((a, b) => a + b, 0) / c.length - dip * Math.max(0, flow0[k] - Math.min(...c)) - flow0[k];
  };
  const left = (k: "pop" | "reg") => strandScore(s, strand.stock, k === "pop" ? popMean : regionMean) - stock0[k];
  const e = s.result!;
  // one strand of seven at weight one seventh, times seven: the strand's own change in pips
  const dLived = lived("reg") - lived("pop");
  const dLeft = left("reg") - left("pop");
  return { now: e.result.value, est: Math.min(e.lived.value + dLived, e.left.value + dLeft), dLived, dLeft, start: { flow0, stock0 } };
}

console.log(`seeds ${SEEDS}, runs ${RUNS}. Net strand pips since 2026. "now": the engine's result; "regions": cohesive counted by region (estimate)\n`);
console.log("bot                     now   regions   change in cohesive Lived   change in cohesive Left");
const meds = new Map<string, number[]>();
for (const bot of ALL_BOTS.filter((b) => ONLY.split(",").includes(b.id))) {
  const rows = Array.from({ length: SEEDS }, (_, i) => play(bot, i + 1));
  meds.set(bot.id, rows.map((r) => r.est));
  console.log(`${bot.id.padEnd(22)} ${f(q(rows.map((r) => r.now), 0.5)).padStart(5)}   ${f(q(rows.map((r) => r.est), 0.5)).padStart(5)}        ${f(q(rows.map((r) => r.dLived), 0.5)).padStart(5)}                      ${f(q(rows.map((r) => r.dLeft), 0.5)).padStart(5)}`);
  if (bot.id === "caretaker") console.log(`  2026 cohesive flow: by heads ${rows[0]!.start.flow0.pop.toFixed(2)}, by regions ${rows[0]!.start.flow0.reg.toFixed(2)}; stock: by heads ${rows[0]!.start.stock0.pop.toFixed(2)}, by regions ${rows[0]!.start.stock0.reg.toFixed(2)}`);
}
