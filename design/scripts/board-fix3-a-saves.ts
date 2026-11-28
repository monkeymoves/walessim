// Run codes for package A's screenshots (playtest 10 fixes, round 3: the end screen and the story).
// Finished games: Skilled, a careless gambler whose town found new work and one whose town did not,
// a game whose chapters tell a river flood, and the careless game with the most deals judged.
// Prints JSON {name: code} and notes.
// Usage: MODEL=copy.json npx tsx design/scripts/board-fix3-a-saves.ts > saves.json (drop npm notice lines)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptBoardModel } from "../../src/board/model/load";
import { allBots, playGame, skilled, startFor } from "../../src/board/engine/bots";
import { act, advance, encodeRun, ending, newBoard } from "../../src/board/engine/api";
import type { BoardModel, BoardState } from "../../src/board/engine/types";

// MODEL: a copy of public/board-model.json to make the codes from (the screenshot script serves the same copy)
const model = acceptBoardModel(JSON.parse(readFileSync(process.env.MODEL ?? resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));

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
  notes[name] = `${e.id}; letter ${e.letter.letter}; deals ${s.deals.filter((d) => d.kept !== null).length}; ${s.story.chapters.map((c) => c.chapter).join(", ")}`;
};
note("skilled", playGame(model, skilled(), 2, startFor(model, 2)));

const valleys = model.game.councils.filter((c) => model.councils.find((d) => d.code === c)?.flags.includes("valley"));
const work = (s: BoardState, code: string) => s.councils[code]!.measures.work - s.history[0]!.councils[code]!.measures.work;
let back = false, fell = false;
for (let n = 41; n < 200 && !(back && fell); n += 2) {
  const s = careless(model, n, valleys[n % valleys.length]);
  const e = ending(model, s);
  if (e.id !== "gamble") continue;
  if (work(s, e.letter.from) >= 0 && !back) { note("gamble-back", s); back = true; }
  if (work(s, e.letter.from) < 0 && !fell) { note("gamble-fell", s); fell = true; }
}

// a game whose chapters tell a river flood
const bots = allBots(model);
outer: for (let n = 4100; n < 4400; n += 7) {
  for (const bot of bots) {
    const s = playGame(model, bot, n, startFor(model, n));
    const rivered = s.story.chapters.some((c) => /\{river\}/.test(model.chapters.find((d) => d.id === c.chapter)?.name.en ?? ""));
    if (rivered) { note("river", s); break outer; }
  }
}

// the game with the most deals judged, of careless games and the weaker bots
const judged = (s: BoardState) => s.deals.filter((d) => d.kept !== null).length;
let best: BoardState | null = null;
const consider = (s: BoardState) => { if (!best || judged(s) > judged(best)) best = s; };
for (const n of [31, 34, 37, 43, 52, 61]) consider(careless(model, n));
for (const bot of bots.filter((b) => ["random", "scatter", "spender", "reactive"].includes(b.id))) {
  for (let n = 5200; n < 5600; n += 37) consider(playGame(model, bot, n, startFor(model, n)));
}
if (best) note("deals", best);
console.log(JSON.stringify({ ...out, notes }));
