// Run codes for package D's fix round 3 shots (cold playtest 10): a careless game stopped mid term
// with an open deal, a council under the line and coins to spend, so the build card shows what a
// council asks for (rule P7) and whether a build keeps the deal (deals.ts `buildCountsForDeal`).
// Usage: npx tsx design/scripts/board-fix3-d-saves.ts (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptBoardModel } from "../../src/board/model/load";
import { act, advance, encodeRun, newBoard, options, stepsOf } from "../../src/board/engine/api";
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
    const open = s.deals.find((d) => d.kept === null);
    const under = model.game.councils.filter((c) => s.councils[c]!.backing < 5);
    if (!out.deal && open && under.includes(open.council) && s.coins >= 5 && s.phase === "play") {
      out.deal = encodeRun(s);
      notes.deal = `${n} ${s.year} deal ${open.council} ${open.measure}; under ${under.length}`;
    }
  }
  if (out.deal) break;
}
console.log(JSON.stringify({ ...out, notes }));
