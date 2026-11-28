/**
 * The bot gate (docs/design/v2-board.md sections 13.2 and 16.6, the four marks playtest 9 added:
 * careless loses, skill still wins, coins have a use, laws cost, and the two playtest 10 added: a
 * lever exists, no wipe-out): plays the thirteen strategy bots
 * over many game numbers, across every start and future, plus the measures that need games of
 * their own, and prints the 16.6 table. Writes it to docs/design/board-balance-log.md unless
 * --no-write. Games run in parallel child processes (one per core less one, at most 11).
 *
 *   npx tsx scripts/board-balance.ts                 200 game numbers on public/board-model.json
 *   npx tsx scripts/board-balance.ts --quick         20 game numbers, 200 random search runs
 *   npx tsx scripts/board-balance.ts --fixture       the three council fixture
 *   options: --games N  --search N  --workers N (1 runs in this process)  --no-write  --out <path>
 *
 * Exit code 0 whether marks pass or fail: the table is the result. Balance is tuned in
 * model/board/ only, never in code.
 */
import { fork, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashSeed } from "../src/engine/rng";
import { acceptBoardModel } from "../src/board/model/load";
import { boardFixture } from "../src/board/engine/fixture";
import { allBots, playGame, random, realEngine, skilled, startFor } from "../src/board/engine/bots";
import { spreader } from "../src/board/engine/bots-strategies";
import { botSummary, coinWatch, earlyWatch, median, runResult, type RunResult } from "../src/board/engine/bots-balance";
import { balanceTable, tableMarkdown } from "../src/board/engine/bots-marks";
import { clockExact, compoundRatio, idleDrift, lawCost } from "../src/board/engine/bots-probes";
import { leverWatch } from "../src/board/engine/bots-levers";
import { keystonesStanding } from "../src/board/engine/end-conditions";
import { drawFuture, scheduledSeverity } from "../src/board/engine/events";
import { param } from "../src/board/engine/rules";
import type { BoardModel } from "../src/board/engine/types";
import { RULE_IDS } from "../src/board/engine/types";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const num = (name: string, dflt: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const quick = flag("quick");
const GAMES = num("games", quick ? 20 : 200);
const SEARCH = num("search", quick ? 200 : 5000);
/** Games for the measures with their own games (idle drift, early choices compound), and for Skilled at random sites. */
const PROBE_GAMES = Math.min(GAMES, quick ? 6 : 20);
const SHUFFLE_GAMES = Math.min(GAMES, quick ? 20 : 60);
const SEARCH_CHUNK = 50;
const ROOT = resolve(import.meta.dirname, "..");
const OUT = (() => {
  const i = args.indexOf("--out");
  return i >= 0 && args[i + 1] ? resolve(args[i + 1]!) : resolve(ROOT, "docs/design/board-balance-log.md");
})();

function loadModel(): { model: BoardModel; label: string } {
  const path = resolve(ROOT, "public/board-model.json");
  if (flag("fixture") || !existsSync(path)) return { model: boardFixture(), label: "the three council fixture" };
  return { model: acceptBoardModel(JSON.parse(readFileSync(path, "utf8"))), label: "public/board-model.json" };
}

type Job =
  | { kind: "bots"; game: number }
  | { kind: "shuffled"; game: number }
  | { kind: "spreader"; game: number }
  | { kind: "levers"; game: number }
  | { kind: "search"; from: number; to: number }
  | { kind: "probe"; game: number };
type Out =
  | { kind: "bots"; runs: RunResult[] }
  | { kind: "shuffled"; result: number }
  | { kind: "spreader"; result: number }
  | { kind: "levers"; cases: number; lifted: number }
  | { kind: "search"; runs: number; four: number; three: number }
  | { kind: "probe"; drift: number; ratio: number | null; law: { most: number; least: number } };

/** One job, in whichever process runs it. */
function runJob(model: BoardModel, job: Job): Out {
  if (job.kind === "bots") {
    const start = startFor(model, job.game);
    return { kind: "bots", runs: allBots(model).map((bot) => {
      const watch = earlyWatch(model);
      const coins = coinWatch();
      const state = playGame(model, bot, job.game, start, realEngine, watch.observe, coins.observe);
      return runResult(model, bot.id, job.game, state, watch.early(), coins.coins());
    }) };
  }
  if (job.kind === "shuffled") {
    const start = startFor(model, job.game);
    return { kind: "shuffled", result: runResult(model, "skilled-shuffled", job.game, playGame(model, skilled({ shuffleSites: true }), job.game, start)).result };
  }
  if (job.kind === "spreader") {
    return { kind: "spreader", result: runResult(model, "spreader", job.game, playGame(model, spreader(), job.game, startFor(model, job.game))).result };
  }
  if (job.kind === "levers") {
    const watch = leverWatch(model);
    playGame(model, skilled(), job.game, startFor(model, job.game), realEngine, watch.observe);
    return { kind: "levers", ...watch.count() };
  }
  if (job.kind === "search") {
    const out = { kind: "search" as const, runs: 0, four: 0, three: 0 };
    for (let g = job.from; g < job.to; g++) {
      const k = keystonesStanding(model, playGame(model, random, 100000 + g, startFor(model, g))).length;
      out.runs++;
      if (k >= 4) out.four++;
      if (k === 3) out.three++;
    }
    return out;
  }
  return { kind: "probe", drift: idleDrift(model, job.game), ratio: compoundRatio(model, job.game), law: lawCost(model, job.game) };
}

function jobs(): Job[] {
  const out: Job[] = [];
  for (let g = 1; g <= PROBE_GAMES; g++) out.push({ kind: "probe", game: g });
  for (let g = 1; g <= GAMES; g++) out.push({ kind: "bots", game: g });
  for (let g = 1; g <= SHUFFLE_GAMES; g++) out.push({ kind: "shuffled", game: g });
  for (let g = 1; g <= SHUFFLE_GAMES; g++) out.push({ kind: "spreader", game: g });
  for (let g = 1; g <= SHUFFLE_GAMES; g++) out.push({ kind: "levers", game: g });
  for (let g = 1; g <= SEARCH; g += SEARCH_CHUNK) out.push({ kind: "search", from: g, to: Math.min(SEARCH + 1, g + SEARCH_CHUNK) });
  return out;
}

/** Run the jobs across child processes (this same script with BOARD_BALANCE_WORKER set). */
async function runAll(model: BoardModel, all: Job[]): Promise<Out[]> {
  const workers = Math.max(1, Math.min(num("workers", Math.min(11, availableParallelism() - 1)), all.length));
  if (workers === 1) return all.map((j) => runJob(model, j));
  const results: Out[] = new Array(all.length);
  let next = 0;
  const script = fileURLToPath(import.meta.url);
  await Promise.all(Array.from({ length: workers }, () => new Promise<void>((done, fail) => {
    const child: ChildProcess = fork(script, args, { env: { ...process.env, BOARD_BALANCE_WORKER: "1" } });
    let current = -1;
    const send = () => {
      if (next >= all.length) {
        child.kill();
        done();
        return;
      }
      current = next++;
      child.send(all[current]!);
    };
    child.on("message", (m) => {
      results[current] = m as Out;
      send();
    });
    child.on("error", fail);
    child.on("exit", (code) => {
      if (current >= 0 && results[current] === undefined && next <= all.length) fail(new Error(`A balance worker stopped (code ${code}) on job ${current}`));
    });
    send();
  })));
  return results;
}

function worker(): void {
  const { model } = loadModel();
  process.on("message", (job) => process.send!(runJob(model, job as Job)));
}

async function main(): Promise<void> {
  const { model, label } = loadModel();
  const t0 = Date.now();
  const outs = await runAll(model, jobs());
  const runs = outs.flatMap((o) => (o.kind === "bots" ? o.runs : []));
  const shuffled = outs.flatMap((o) => (o.kind === "shuffled" ? [o.result] : []));
  const spread = outs.flatMap((o) => (o.kind === "spreader" ? [o.result] : []));
  const search = { runs: 0, four: 0, three: 0 };
  for (const o of outs) if (o.kind === "search") { search.runs += o.runs; search.four += o.four; search.three += o.three; }
  const probes = outs.flatMap((o) => (o.kind === "probe" ? [o] : []));
  const levers = { cases: 0, lifted: 0 };
  for (const o of outs) if (o.kind === "levers") { levers.cases += o.cases; levers.lifted += o.lifted; }
  const ratios = probes.flatMap((p) => (p.ratio === null ? [] : [p.ratio]));
  const sev = Array.from({ length: GAMES }, (_, i) => scheduledSeverity(model, hashSeed(i + 1), drawFuture(model, hashSeed(i + 1))));
  const clock = clockExact(model, 1);
  const seconds = (Date.now() - t0) / 1000;
  const rows = balanceTable(runs, {
    idleDrift: Math.max(...probes.map((p) => Math.abs(p.drift))),
    shuffledMedian: median(shuffled),
    spreaderMedian: median(spread),
    compoundRatio: ratios.length ? median(ratios) : NaN,
    lawCost: probes.length ? { most: median(probes.map((p) => p.law.most)), least: median(probes.map((p) => p.law.least)) } : undefined,
    searchKeystones: search,
    severity: { min: Math.min(...sev), max: Math.max(...sev), lo: param(model, RULE_IDS.severity, "min"), hi: param(model, RULE_IDS.severity, "max") },
    endingsTotal: model.endings.length,
    chaptersTotal: model.chapters.length,
    clock,
    levers,
    seconds: { taken: seconds, quick: GAMES <= 20 && SEARCH <= 300 },
  });
  const summary = botSummary(runs).map((b) => `| ${b.bot} | ${b.median.toFixed(1)} | ${b.p10.toFixed(1)} to ${b.p90.toFixed(1)} | ${b.keystones.toFixed(2)} | ${Object.entries(b.endings).sort((a, c) => c[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(", ")} |`);
  const passed = rows.filter((r) => r.pass).length;
  const text = [
    `# Board balance log`,
    ``,
    `Model: ${label} (hash ${model.meta.hash}${model.meta.fixture ? ", fixture: illustrative numbers" : ""}). ${GAMES} game numbers, every start in turn, futures drawn from the game number. ${SEARCH} random search runs, ${PROBE_GAMES} games for the idle, compounding and law measures, ${SHUFFLE_GAMES} each for Skilled at random sites, for Spreader and for the lever measure. Took ${seconds.toFixed(0)} seconds.`,
    ``,
    `Every size in the game is a game rule; these are measures of the bots, not of Wales.`,
    ``,
    `## Section 16.6 pass marks: ${passed} of ${rows.length} met`,
    ``,
    tableMarkdown(rows),
    ``,
    `## Bots`,
    ``,
    `| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |`,
    `|---|---|---|---|---|`,
    ...summary,
    ``,
  ].join("\n");
  console.log(text);
  if (!flag("no-write")) writeFileSync(OUT, text);
}

if (process.env.BOARD_BALANCE_WORKER) worker();
else void main();
