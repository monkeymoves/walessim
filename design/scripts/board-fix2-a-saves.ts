// Run codes for package A's screenshots (playtest 9 fixes, round 2: the end screen and the story).
// Three finished games: Skilled (two keystones), a careless gambler (one big employer, nothing
// else) and an idle game that builds nothing. Prints JSON {name: code} and notes.
// Usage: npx tsx design/scripts/board-fix2-a-saves.ts > saves.json (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptBoardModel } from "../../src/board/model/load";
import { playGame, skilled, startFor } from "../../src/board/engine/bots";
import { act, advance, encodeRun, ending, newBoard } from "../../src/board/engine/api";
import type { BoardModel, BoardState } from "../../src/board/engine/types";

const model = acceptBoardModel(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));

function careless(m: BoardModel, n: number, gamble?: string): BoardState {
  let s = newBoard(m, n, m.starts[n % m.starts.length]!.id);
  for (let guard = 0; guard < 2000 && s.phase !== "ended"; guard++) {
    if (gamble && s.phase !== "respond" && !s.projects.some((p) => p.project === "big-employer")) {
      try { s = act(m, s, { kind: "build", project: "big-employer", site: { council: gamble } }); } catch { /* not yet */ }
    }
    if (s.phase === "respond") {
      for (const p of s.pending) {
        if (p.kind !== "respond") continue;
        const def = m.events.find((d) => d.id === p.event)!;
        s = act(m, s, { kind: "respond", event: p.event, response: (def.responses.find((r) => r.cost === 0) ?? def.responses[0]!).id });
      }
      continue;
    }
    s = advance(m, s, { maxSteps: 4 }).state;
  }
  return s;
}

const out: Record<string, string> = {};
const notes: Record<string, string> = {};
const note = (name: string, s: BoardState) => {
  out[name] = encodeRun(s);
  const e = ending(model, s);
  notes[name] = `${e.id}; not built ${e.notBuilt.id}; ${s.story.chapters.map((c) => c.chapter).join(", ")}`;
};
note("skilled", playGame(model, skilled(), 2, startFor(model, 2)));
const valleys = model.game.councils.filter((c) => model.councils.find((d) => d.code === c)?.flags.includes("valley"));
for (const n of [41, 43, 47, 53, 59, 61]) {
  const s = careless(model, n, valleys[n % valleys.length]);
  if (ending(model, s).id === "gamble") { note("gamble", s); break; }
}
note("idle", careless(model, 31));
console.log(JSON.stringify({ ...out, notes }));
