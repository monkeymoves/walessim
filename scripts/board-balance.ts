/**
 * The bot gate (docs/design/v2-board.md sections 13.2 and 14.3): plays the nine strategy bots over
 * many game numbers, across every start and future, and prints the 13.2 table. Writes the table to
 * docs/design/board-balance-log.md unless --no-write.
 *
 *   npx tsx scripts/board-balance.ts                 200 game numbers on public/board-model.json
 *   npx tsx scripts/board-balance.ts --fixture       the three council fixture
 *   npx tsx scripts/board-balance.ts --quick         20 game numbers, 300 random search runs
 *   options: --games N  --search N  --no-write  --out <path>
 *
 * Exit code 0 whether marks pass or fail: the table is the result. Balance is tuned in
 * model/board/ only, never in code.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashSeed } from "../src/engine/rng";
import { acceptBoardModel } from "../src/board/model/load";
import { boardFixture } from "../src/board/engine/fixture";
import { allBots, playGame, random, realEngine, skilled, startFor, type Bot } from "../src/board/engine/bots";
import { balanceTable, botSummary, median, runResult, tableMarkdown, type RunResult } from "../src/board/engine/bots-balance";
import { keystonesStanding } from "../src/board/engine/end-conditions";
import { drawFuture, scheduledSeverity } from "../src/board/engine/events";
import { param } from "../src/board/engine/rules";
import { boardScore } from "../src/board/engine/score";
import type { BoardModel, BoardState } from "../src/board/engine/types";
import { RULE_IDS } from "../src/board/engine/types";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const num = (name: string, dflt: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const quick = flag("quick");
const GAMES = num("games", quick ? 20 : 200);
const SEARCH = num("search", quick ? 300 : 5000);
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

/** A bot that builds nothing: the baseline for the compounding test. */
const idle: Bot = { id: "idle", careful: false, next: () => null };

/** Effect by 2050 of one tier 1 project built in turn 1 against turn 7 (13.2 "early choices compound"). */
function compoundRatio(model: BoardModel, games: number): number {
  const ratios: number[] = [];
  const tier1 = model.projects.filter((p) => p.tier === 1 && p.site === "council");
  for (let g = 1; g <= games; g++) {
    const start = startFor(model, g);
    const base = boardScore(model, playGame(model, idle, g, start).councils);
    for (const p of tier1) {
      const once = (buildTurn: number, site?: string): { score: number; site?: string } => {
        let s: BoardState = realEngine.newBoard(model, g, start);
        let placed = site;
        for (let t = 0; t < model.game.turns; t++) {
          if (t === buildTurn) {
            const o = realEngine.options(model, s).find((x) => x.allowed && x.action.kind === "build" && x.project === p.id && (!placed || x.action.site.council === placed));
            if (o && o.action.kind === "build") {
              s = realEngine.act(model, s, o.action);
              placed = o.action.site.council;
            }
          }
          s = realEngine.endTurn(model, s).state;
        }
        return { score: boardScore(model, s.councils) - base, site: placed };
      };
      const early = once(0);
      if (!early.site) continue;
      const late = once(6, early.site);
      if (late.score > 1e-6) ratios.push(early.score / late.score);
    }
  }
  return median(ratios);
}

function main(): void {
  const { model, label } = loadModel();
  const t0 = Date.now();
  const runs: RunResult[] = [];
  const bots = allBots(model);
  for (let g = 1; g <= GAMES; g++) {
    const start = startFor(model, g);
    for (const bot of bots) runs.push(runResult(model, bot.id, g, playGame(model, bot, g, start)));
  }
  const shuffled = Array.from({ length: GAMES }, (_, i) => runResult(model, "skilled-shuffled", i + 1, playGame(model, skilled({ shuffleSites: true }), i + 1, startFor(model, i + 1))).result);
  const search = { runs: SEARCH, four: 0, three: 0 };
  for (let g = 1; g <= SEARCH; g++) {
    const k = keystonesStanding(model, playGame(model, random, 100000 + g, startFor(model, g))).length;
    if (k >= 4) search.four++;
    if (k === 3) search.three++;
  }
  const sev = Array.from({ length: GAMES }, (_, i) => scheduledSeverity(model, hashSeed(i + 1), drawFuture(model, hashSeed(i + 1))));
  const rows = balanceTable(runs, {
    shuffledMedian: median(shuffled),
    compoundRatio: compoundRatio(model, Math.min(GAMES, 6)),
    searchKeystones: search,
    severity: { min: Math.min(...sev), max: Math.max(...sev), lo: param(model, RULE_IDS.severity, "min"), hi: param(model, RULE_IDS.severity, "max") },
  });
  const summary = botSummary(runs).map((b) => `| ${b.bot} | ${b.median.toFixed(1)} | ${b.p10.toFixed(1)} to ${b.p90.toFixed(1)} | ${b.keystones.toFixed(2)} | ${Object.entries(b.endings).sort((a, c) => c[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(", ")} |`);
  const passed = rows.filter((r) => r.pass).length;
  const text = [
    `# Board balance log`,
    ``,
    `Model: ${label} (hash ${model.meta.hash}${model.meta.fixture ? ", fixture: illustrative numbers" : ""}). ${GAMES} game numbers, every start in turn, futures drawn from the game number. ${SEARCH} random search runs. Took ${((Date.now() - t0) / 1000).toFixed(0)} seconds.`,
    ``,
    `## Section 13.2 pass marks: ${passed} of ${rows.length} met`,
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

main();
