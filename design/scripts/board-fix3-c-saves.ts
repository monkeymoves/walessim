// Run codes for package C's fix round 3 shots (cold playtest 10): careless games stopped where the
// panels have most to say. Prints JSON {name: code, notes}.
// - deal: mid term with an open deal and councils under the line;
// - preWin: the season before an election you would win (the card asks for its law change);
// - preLoss: the season before an election you would lose (a deal to pick, councils to bring round).
// Usage: npx tsx design/scripts/board-fix3-c-saves.ts (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptBoardModel } from "../../src/board/model/load";
import { act, advance, encodeRun, isElectionStep, newBoard, options, stepsOf } from "../../src/board/engine/api";
import type { BoardModel, BoardState } from "../../src/board/engine/types";

const model = acceptBoardModel(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));

/** Builds the cheapest thing every `every` years, takes the first answer and any deal. Yields each state. */
function* careless(m: BoardModel, n: number, every: number): Generator<BoardState> {
  let s = newBoard(m, n, m.starts[n % m.starts.length]!.id);
  for (let step = 0; step < 400 && s.phase !== "ended"; step++) {
    for (const kind of ["respond", "deal"] as const) {
      const o = options(m, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(m, s, o.action);
    }
    if (s.step % stepsOf(m, every) === 0) {
      const b = options(m, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
      if (b) s = act(m, s, b.action);
    }
    yield s;
    if (s.phase === "respond") continue;
    s = advance(m, s, { maxSteps: 1 }).state;
  }
}

const out: Record<string, string> = {};
const notes: Record<string, string> = {};
for (const n of [2029, 4759, 77, 31, 5, 11, 12, 13]) {
  for (const s of careless(model, n, 3)) {
    const under = model.game.councils.filter((c) => s.councils[c]!.backing < 5).length;
    const pre = isElectionStep(model, s.step + 1) && s.phase === "play";
    if (!out.deal && s.deals.some((d) => d.kept === null) && under >= 3 && s.year >= 2035) { out.deal = encodeRun(s); notes.deal = `${n} ${s.year} under ${under}`; }
    if (!pre) continue;
    // the result the next season's election will give
    const held = advance(model, s, { maxSteps: 1 }).state.election.records.at(-1)?.result;
    if (!out.preWin && held === "win" && s.year >= 2033) { out.preWin = encodeRun(s); notes.preWin = `${n} ${s.year}`; }
    if (!out.preLoss && held === "lost") { out.preLoss = encodeRun(s); notes.preLoss = `${n} ${s.year}`; }
  }
  if (out.deal && out.preWin && out.preLoss) break;
}
console.log(JSON.stringify({ ...out, notes }));
