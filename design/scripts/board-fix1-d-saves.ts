// Run codes for package D's screenshots (playtest 8 fixes, round 1): the Skilled bot's board just
// before the 2030 election (does the headline move early?), and a board one season before an
// event warning and before an event lands (the new sentence forms).
// Usage: npx tsx design/scripts/board-fix1-d-saves.ts > saves.json (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashSeed } from "../../src/engine/rng";
import { acceptBoardModel } from "../../src/board/model/load";
import { playTurn, realEngine, skilled, startFor, stepsToDecision, BOT_STOPS } from "../../src/board/engine/bots";
import { answerAll, type BotView } from "../../src/board/engine/bots-common";
import { encodeRun, tick } from "../../src/board/engine/api";
import { scores } from "../../src/board/engine/score";
import type { BoardState } from "../../src/board/engine/types";

const model = acceptBoardModel(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));
const out: Record<string, string> = {};
const notes: Record<string, string> = {};
const game = 2;
const bot = skilled();
const v: BotView = { model, engine: realEngine, state: realEngine.newBoard(model, game, startFor(model, game)), seed: hashSeed(`${bot.id}:${game}`), tried: new Set() };
while (v.state.step < 15 && v.state.phase !== "ended") {
  playTurn(v, bot);
  v.state = answerAll(realEngine, model, v.state);
  v.state = realEngine.advance(model, v.state, { maxSteps: Math.min(stepsToDecision(model, v.state.step), 15 - v.state.step), stopOn: BOT_STOPS }).state;
}
const sc = scores(model, v.state);
out.early = encodeRun(v.state);
notes.early = `game ${game}, step ${v.state.step}, headline ${sc.result.toFixed(1)} from ${sc.start.toFixed(1)}`;

// One season before a warning stop and before an event lands, in the same game run on idly.
let s: BoardState = realEngine.newBoard(model, 7, startFor(model, 7));
for (let i = 0; i < 90 && s.phase !== "ended" && !(out.warn && out.respond); i++) {
  s = answerAll(realEngine, model, s);
  const { state, report } = tick(model, s);
  if (!out.warn && report.stops.some((x) => x.kind === "warning")) out.warn = encodeRun(s);
  if (!out.respond && report.stops.some((x) => x.kind === "respond")) out.respond = encodeRun(s);
  s = state;
}
console.log(JSON.stringify({ ...out, notes }));
