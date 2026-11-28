// Run codes for the Welsh pass (playtest 9, must-fix 10): a skilled game caught late, in 2046 and
// in the last year before May 2050, so the script can open the board at the years where the page
// overflowed in Welsh. Prints JSON {name: code}.
// Usage: npx tsx design/scripts/board-fix2-cy-saves.ts > saves.json (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptBoardModel } from "../../src/board/model/load";
import { playGame, realEngine, skilled, startFor } from "../../src/board/engine/bots";
import { encodeRun } from "../../src/board/engine/api";
import type { BoardState } from "../../src/board/engine/types";

const model = acceptBoardModel(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));
const want: Record<string, number> = { late2046: 80, last2049: model.game.steps - 3 };
const got: Record<string, string> = {};
playGame(model, skilled(), 2, startFor(model, 2), realEngine, (s: BoardState) => {
  for (const [name, step] of Object.entries(want)) if (!got[name] && s.step >= step && s.phase === "play") got[name] = encodeRun(s);
});
console.log(JSON.stringify(got));
